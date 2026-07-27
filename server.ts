import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { isValidStudentCode } from './src/data/studentCodes';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const PORT = 3000;

// Lazy initialization of Gemini client
function getGeminiClient(customApiKey?: string) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({ apiKey });
}

// Session Record Interface according to specification
export interface CodeSessionRecord {
  code: string;
  active: boolean;
  activeSessionId: string | null;
  deviceId: string | null;
  sessionStartedAt: string | null;
  lastHeartbeatAt: string | null;
  expiresAt: string | null;
  isOnline: boolean;
  status: 'online' | 'offline';
}

const activeSessionStore = new Map<string, CodeSessionRecord>();
const MASTER_CODES_LIST = [
  'mentor-bigode',
  'bigode-mentor',
  'bigode7144',
  '7144bigode',
  'admin-mestre',
  'mestre-admin',
  'gz-master',
  'master-gz',
  'mentor_bigode',
];

export function isMasterMentorCode(code?: string): boolean {
  if (!code) return false;
  const clean = code.trim().toLowerCase();
  if (MASTER_CODES_LIST.includes(clean)) return true;
  if (clean.startsWith('mentor-') || clean.startsWith('mentor_') || clean.startsWith('admin-') || clean.startsWith('mestre-')) return true;
  return false;
}

const apiRouter = express.Router();

// Health check endpoint
apiRouter.get(['/health', '/api/health'], (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Persistent global store for student single-session database lock
const RESTFUL_MASTER_URL = 'https://api.restful-api.dev/objects/ff8081819f7e10ae019fa3a6f97f3351';

async function fetchSessionRecord(cleanCode: string): Promise<CodeSessionRecord | null> {
  if (isMasterMentorCode(cleanCode)) {
    const nowIso = new Date().toISOString();
    return {
      code: cleanCode.toUpperCase(),
      active: true,
      activeSessionId: 'MASTER-SESSION-ID',
      deviceId: 'MASTER-DEVICE-ID',
      sessionStartedAt: nowIso,
      lastHeartbeatAt: nowIso,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      isOnline: true,
      status: 'online',
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(RESTFUL_MASTER_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const json = await res.json();
      const sessionsMap: Record<string, CodeSessionRecord> = json.data || {};
      const record = sessionsMap[cleanCode] || null;
      if (record) {
        activeSessionStore.set(cleanCode, record);
        return record;
      } else {
        activeSessionStore.delete(cleanCode);
        return null;
      }
    }
  } catch (err) {
    console.warn('[Session Store] Fetch error or timeout:', err);
  }
  return activeSessionStore.get(cleanCode) || null;
}

async function saveSessionRecord(cleanCode: string, record: CodeSessionRecord | null): Promise<void> {
  if (isMasterMentorCode(cleanCode)) return;

  if (record) {
    activeSessionStore.set(cleanCode, record);
  } else {
    activeSessionStore.delete(cleanCode);
  }

  try {
    const controller1 = new AbortController();
    const timeout1 = setTimeout(() => controller1.abort(), 2500);
    const getRes = await fetch(RESTFUL_MASTER_URL, { signal: controller1.signal });
    clearTimeout(timeout1);

    let sessionsMap: Record<string, CodeSessionRecord> = {};
    if (getRes.ok) {
      const json = await getRes.json();
      sessionsMap = json.data || {};
    }

    if (record) {
      sessionsMap[cleanCode] = record;
    } else {
      delete sessionsMap[cleanCode];
    }

    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 2500);
    await fetch(RESTFUL_MASTER_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'GZ_PRO_MASTER_BINDINGS_V1',
        data: sessionsMap,
      }),
      signal: controller2.signal,
    });
    clearTimeout(timeout2);
  } catch (err) {
    console.warn('[Session Store] Save error or timeout:', err);
  }
}

// Logout & Unbind Route
apiRouter.post(
  ['/logout', '/api/logout', '/session/logout', '/api/session/logout', '/unbind', '/api/unbind'],
  async (req, res) => {
    let studentCode = (req.headers['x-student-access-code'] as string) || (req.body && req.body.studentAccessCode);
    let sessionId = (req.headers['x-session-id'] as string) || (req.body && req.body.sessionId);

    if (req.body && typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body);
        studentCode = studentCode || parsed.studentAccessCode;
        sessionId = sessionId || parsed.sessionId;
      } catch (e) {}
    }

    if (studentCode) {
      const cleanCode = studentCode.trim().toLowerCase();
      if (!isMasterMentorCode(cleanCode)) {
        const currentRecord = await fetchSessionRecord(cleanCode);
        if (currentRecord && (!sessionId || currentRecord.activeSessionId === sessionId)) {
          currentRecord.activeSessionId = null;
          currentRecord.deviceId = null;
          currentRecord.isOnline = false;
          currentRecord.status = 'offline';
          currentRecord.lastHeartbeatAt = null;
          currentRecord.expiresAt = null;

          await saveSessionRecord(cleanCode, currentRecord);
        }
      }
    }

    return res.json({ status: 'unbound', message: 'Sessão encerrada com sucesso.' });
  }
);

// Heartbeat Endpoint (Every 30s)
apiRouter.post(['/session/heartbeat', '/api/session/heartbeat'], async (req, res) => {
  const studentCode = (req.headers['x-student-access-code'] as string) || (req.body && req.body.studentAccessCode);
  const sessionId = (req.headers['x-session-id'] as string) || (req.body && req.body.sessionId);

  if (!studentCode) {
    return res.status(400).json({ error: 'Código de acesso ausente.' });
  }

  const cleanCode = studentCode.trim().toLowerCase();

  if (isMasterMentorCode(cleanCode)) {
    return res.json({ status: 'ok', online: true, isMaster: true });
  }

  if (!sessionId) {
    return res.status(401).json({ error: 'Sessão inválida ou não informada.' });
  }

  const currentRecord = await fetchSessionRecord(cleanCode);

  if (!currentRecord || !currentRecord.activeSessionId || currentRecord.activeSessionId !== sessionId) {
    return res.status(401).json({
      error: 'Sessão inválida ou substituída em outro dispositivo. Acesso revogado.',
      status: 'offline',
    });
  }

  const now = Date.now();
  currentRecord.lastHeartbeatAt = new Date(now).toISOString();
  currentRecord.expiresAt = new Date(now + 120000).toISOString();
  currentRecord.isOnline = true;
  currentRecord.status = 'online';

  await saveSessionRecord(cleanCode, currentRecord);

  return res.json({
    status: 'ok',
    online: true,
    lastHeartbeatAt: currentRecord.lastHeartbeatAt,
    expiresAt: currentRecord.expiresAt,
  });
});

// Endpoint to verify student code and register single session lock
apiRouter.post(['/verify-code', '/api/verify-code', '/session/verify', '/api/session/verify', '/'], async (req, res) => {
  const studentCode = (req.headers['x-student-access-code'] as string) || (req.body && req.body.studentAccessCode);
  const deviceId = (req.headers['x-client-device-id'] as string) || (req.body && req.body.deviceId);
  const existingSessionId = (req.headers['x-session-id'] as string) || (req.body && req.body.sessionId);

  if (!isValidStudentCode(studentCode)) {
    return res.status(403).json({
      error: 'Acesso Negado: Código de Aluno inválido ou não reconhecido. Verifique o código da mentoria.',
    });
  }

  const cleanCode = studentCode.trim().toLowerCase();

  // Master Mentor codes are exempt from strict 1-session lock
  if (isMasterMentorCode(cleanCode)) {
    const masterSessionId = existingSessionId || 'MASTER-SESSION-' + crypto.randomUUID();
    return res.json({
      status: 'ok',
      isMaster: true,
      sessionId: masterSessionId,
      activeSessionId: masterSessionId,
      onlineDevices: '1/1',
    });
  }

  const now = Date.now();
  const currentRecord = await fetchSessionRecord(cleanCode);

  // Check if session is currently active on another device/session
  if (currentRecord && currentRecord.activeSessionId) {
    const lastHeartbeatTime = currentRecord.lastHeartbeatAt ? new Date(currentRecord.lastHeartbeatAt).getTime() : 0;
    const isWithinHeartbeatWindow = now - lastHeartbeatTime <= 120000; // 2 minutes (120 seconds)

    // Check if another device/session has an active heartbeat & isOnline
    if (
      currentRecord.isOnline &&
      isWithinHeartbeatWindow &&
      currentRecord.activeSessionId !== existingSessionId
    ) {
      // Rule 4: HTTP 409 Conflict with exact message
      return res.status(409).json({
        error: 'Esta chave já está sendo utilizada em outro dispositivo. Para entrar aqui, primeiro encerre a sessão anterior.',
        activeSessionId: currentRecord.activeSessionId,
        lastHeartbeatAt: currentRecord.lastHeartbeatAt,
      });
    }
  }

  // Create new active session with crypto.randomUUID() as required by Rule 1
  const newSessionId = crypto.randomUUID();
  const effectiveDeviceId = deviceId || `device-${newSessionId.slice(0, 8)}`;
  const nowIso = new Date(now).toISOString();
  const expiresIso = new Date(now + 120000).toISOString();

  const sessionRecord: CodeSessionRecord = {
    code: studentCode.trim().toUpperCase(),
    active: true,
    activeSessionId: newSessionId,
    deviceId: effectiveDeviceId,
    sessionStartedAt: nowIso,
    lastHeartbeatAt: nowIso,
    expiresAt: expiresIso,
    isOnline: true,
    status: 'online',
  };

  await saveSessionRecord(cleanCode, sessionRecord);

  return res.json({
    status: 'ok',
    bound: true,
    sessionId: newSessionId,
    sessionRecord,
    onlineDevices: '1/1',
  });
});

// Middleware Helper to validate student access code AND single session active lock
async function validateSessionAsync(req: express.Request, res: express.Response): Promise<boolean> {
  const studentCode = (req.headers['x-student-access-code'] as string) || (req.body && req.body.studentAccessCode);
  const sessionId = (req.headers['x-session-id'] as string) || (req.body && req.body.sessionId);

  if (!isValidStudentCode(studentCode)) {
    res.status(403).json({
      error: 'Acesso Negado: Código de Aluno inválido ou não informado. Solicite seu código individual na mentoria.',
    });
    return false;
  }

  const cleanCode = studentCode.trim().toLowerCase();

  // Master Mentor codes bypass strict session lock
  if (isMasterMentorCode(cleanCode)) {
    return true;
  }

  if (!sessionId) {
    res.status(401).json({
      error: 'Acesso Não Autorizado: Sessão (sessionId) não identificada. Efetue login novamente.',
    });
    return false;
  }

  const currentRecord = await fetchSessionRecord(cleanCode);

  if (!currentRecord || !currentRecord.activeSessionId || currentRecord.activeSessionId !== sessionId) {
    res.status(401).json({
      error: 'Esta chave já está sendo utilizada em outro dispositivo. Sua sessão foi encerrada.',
    });
    return false;
  }

  const now = Date.now();
  const lastHeartbeatTime = currentRecord.lastHeartbeatAt ? new Date(currentRecord.lastHeartbeatAt).getTime() : 0;

  if (now - lastHeartbeatTime > 120000) {
    res.status(401).json({
      error: 'Sessão Expirada por inatividade (> 2 minutos sem envio de heartbeat). Efetue login novamente.',
    });
    return false;
  }

  return true;
}

// Helper to call Gemini with model fallback across supported public models
async function generateContentWithFallback(ai: GoogleGenAI, params: { contents: any; config?: any }) {
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite'];
  let lastErr: any = null;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      if (response) return response;
    } catch (err: any) {
      lastErr = err;
      console.warn(`[Gemini API] Modelo ${model} falhou:`, err?.message || err);
    }
  }
  throw lastErr || new Error('Falha ao comunicar com os modelos do Gemini.');
}

// Helper to format Gemini error messages into clear, friendly Portuguese text
function handleGeminiError(err: any, res: express.Response) {
  const msg = typeof err === 'string' ? err : (err?.message || JSON.stringify(err || ''));
  if (msg.includes('GEMINI_API_KEY_MISSING')) {
    return res.status(400).json({
      error: 'Nenhuma Chave API do Gemini foi fornecida. Por favor, insira sua chave do Google AI Studio no botão "Inserir Chave API".',
    });
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota exceeded')) {
    return res.status(429).json({
      error: 'Limite de requisições / cota da API do Gemini excedida. Por favor, aguarde alguns segundos ou insira sua própria Chave API no botão "Inserir Chave API".',
    });
  }
  if (msg.includes('API_KEY_INVALID') || msg.includes('401') || msg.includes('API key not valid')) {
    return res.status(401).json({
      error: 'A Chave API do Gemini é inválida. Por favor, verifique a chave inserida no botão "Inserir Chave API".',
    });
  }
  return res.status(500).json({
    error: `Erro no serviço de IA: ${msg || 'Erro desconhecido ao comunicar com a IA.'}`,
  });
}

// Chat endpoint for agent execution
apiRouter.post('/chat', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (!(await validateSessionAsync(req, res))) return;

  try {
    const { systemInstruction, messages, temperature = 0.7, customApiKey } = req.body;
    const headerApiKey = req.headers['x-gemini-api-key'] as string;
    const apiKeyToUse = (headerApiKey || customApiKey || '').trim();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Nenhuma mensagem enviada.' });
    }

    const ai = getGeminiClient(apiKeyToUse);

    // Format chat contents for Gemini
    const contents = messages.map((msg: { role: string; content?: string; image?: string }) => {
      const parts: any[] = [];

      if (msg.image) {
        // Handle data URL e.g. "data:image/jpeg;base64,..."
        const match = msg.image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2],
            },
          });
        }
      }

      if (msg.content && msg.content.trim().length > 0) {
        parts.push({ text: msg.content });
      } else if (!msg.image) {
        parts.push({ text: ' ' });
      }

      return {
        role: msg.role === 'user' ? 'user' : 'model',
        parts,
      };
    });

    const response = await generateContentWithFallback(ai, {
      contents: contents,
      config: {
        systemInstruction: systemInstruction || 'Você é um assistente de IA prestativo e amigável.',
        temperature: Number(temperature) || 0.7,
      },
    });

    const replyText = response.text || 'Desculpe, não consegui gerar uma resposta no momento.';
    res.json({ reply: replyText });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    return handleGeminiError(err, res);
  }
});

// AI Agent Generator endpoint
apiRouter.post('/generate-agent', async (req, res) => {
  if (!(await validateSessionAsync(req, res))) return;

  try {
    const { prompt, customApiKey } = req.body;
    const headerApiKey = req.headers['x-gemini-api-key'] as string;
    const apiKeyToUse = headerApiKey || customApiKey;

    if (!prompt) {
      return res.status(400).json({ error: 'Forneça uma descrição do agente desejado.' });
    }

    const ai = getGeminiClient(apiKeyToUse);

    const systemPrompt = `Você é um especialista em engenharia de prompts e design de Custom GPTs do ChatGPT.
Dado o pedido do usuário, crie uma configuração completa e de alta qualidade para um novo Agente do ChatGPT em Português.

Retorne obrigatoriamente um objeto JSON estruturado com os seguintes campos:
- name: Nome chamativo do agente (ex: "Especialista Python & FastAPI")
- tagline: Frase curta de impacto (uma linha)
- description: Descrição clara do propósito e habilidades do agente
- category: Uma das seguintes categorias exatas: "Programação", "Escrita e Conteúdo", "Negócios e Marketing", "Produtividade", "Educação e Aprendizado", "Design e Criatividade", "Finanças e Análise", "Saúde e Estilo de Vida", "Outros"
- iconName: Nome do ícone da biblioteca Lucide React (ex: "Code2", "PenTool", "Briefcase", "Sparkles", "LineChart", "Palette", "GraduationCap", "HeartPulse", "Bot")
- colorTheme: Uma classe de cor de destaque em Tailwind (ex: "emerald", "indigo", "violet", "amber", "rose", "cyan", "sky", "fuchsia")
- systemInstruction: As instruções detalhadas do sistema (prompt principal/diretrizes do GPT). Inclua comportamento, tom de voz, formato de saída e restrições.
- conversationStarters: Array de 4 perguntas/comandos iniciais que o usuário pode clicar para iniciar o papo.
- capabilities: Objeto com booleanos { codeInterpreter: boolean, webSearch: boolean, imageGeneration: boolean, jsonOutput: boolean }
- temperature: Número entre 0.1 e 1.0 (nível de criatividade adequado para o papel)`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            tagline: { type: Type.STRING },
            description: { type: Type.STRING },
            category: { type: Type.STRING },
            iconName: { type: Type.STRING },
            colorTheme: { type: Type.STRING },
            systemInstruction: { type: Type.STRING },
            conversationStarters: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            capabilities: {
              type: Type.OBJECT,
              properties: {
                codeInterpreter: { type: Type.BOOLEAN },
                webSearch: { type: Type.BOOLEAN },
                imageGeneration: { type: Type.BOOLEAN },
                jsonOutput: { type: Type.BOOLEAN },
              },
              required: ['codeInterpreter', 'webSearch', 'imageGeneration', 'jsonOutput'],
            },
            temperature: { type: Type.NUMBER },
          },
          required: [
            'name',
            'tagline',
            'description',
            'category',
            'iconName',
            'colorTheme',
            'systemInstruction',
            'conversationStarters',
            'capabilities',
            'temperature',
          ],
        },
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error('Falha ao gerar o agente.');
    }

    const agentConfig = JSON.parse(jsonText);
    res.json({ agent: agentConfig });
  } catch (err: any) {
    console.error('Error in /api/generate-agent:', err);
    return handleGeminiError(err, res);
  }
});

// Multi-Agent Collaboration Endpoint
apiRouter.post('/multi-agent', async (req, res) => {
  if (!(await validateSessionAsync(req, res))) return;

  try {
    const { taskPrompt, agents, customApiKey } = req.body;
    const headerApiKey = req.headers['x-gemini-api-key'] as string;
    const apiKeyToUse = headerApiKey || customApiKey;

    if (!taskPrompt || !agents || !Array.isArray(agents) || agents.length < 2) {
      return res.status(400).json({ error: 'Selecione pelo menos 2 agentes e forneça uma tarefa.' });
    }

    const ai = getGeminiClient(apiKeyToUse);

    // Generate response from each agent sequentially with awareness of previous outputs
    const conversationTrail: { agentName: string; content: string }[] = [];

    for (const agent of agents) {
      const historyContext = conversationTrail
        .map((step) => `[Contribuição anterior de ${step.agentName}]:\n${step.content}`)
        .join('\n\n');

      const fullPrompt = `TAREFA PRINCIPAL DO USUÁRIO:
${taskPrompt}

${historyContext ? `HISTÓRICO DE RESPOSTAS DOS OUTROS AGENTES:\n${historyContext}\n\nSua vez de contribuir com base nas respostas acima e na sua especialização.` : 'Sua vez de dar a primeira contribuição especializada para a tarefa acima.'}`;

      const response = await generateContentWithFallback(ai, {
        contents: fullPrompt,
        config: {
          systemInstruction: agent.systemInstruction || `Você é o agente ${agent.name}.`,
          temperature: 0.7,
        },
      });

      const reply = response.text || 'Contribuição concluída.';
      conversationTrail.push({
        agentName: agent.name,
        content: reply,
      });
    }

    res.json({ steps: conversationTrail });
  } catch (err: any) {
    console.error('Error in /api/multi-agent:', err);
    return handleGeminiError(err, res);
  }
});

// Mount router on both /api and / (for Vercel rewrites compatibility)
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Global Express error handler for serverless runtime safety
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err?.message || 'Erro interno do servidor.' });
});

// Setup Vite development or static production serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

export default app;

if (process.env.VERCEL !== '1' && process.env.VERCEL !== 'true' && !process.env.VERCEL) {
  startServer();
}

