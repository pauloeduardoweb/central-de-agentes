import express from 'express';
import path from 'path';
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

// Memory registry for device-code bindings
interface CodeBinding {
  deviceId: string;
  registeredAt: number;
  lastActiveAt: number;
  ip?: string;
}

type DeviceBinding = CodeBinding;

const activeCodeBindings = new Map<string, DeviceBinding>();
const MASTER_CODES_LIST = ['mentor-bigode', 'bigode-mentor', 'bigode7144', '7144bigode'];

const apiRouter = express.Router();

// Health check endpoint
apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Persistent global store for student device lock
const KV_STORE_URL = 'https://keyvalue.xyz/gz_pro_v2_bindings_secure';

async function fetchRemoteBinding(cleanCode: string): Promise<CodeBinding | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${KV_STORE_URL}/${encodeURIComponent(cleanCode)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim().length > 0 && text.startsWith('{')) {
        const parsed = JSON.parse(text);
        if (parsed && parsed.deviceId) {
          activeCodeBindings.set(cleanCode, parsed);
          return parsed;
        }
      }
    }
    if (res.status === 404) {
      activeCodeBindings.delete(cleanCode);
      return null;
    }
  } catch (err) {
    console.warn('[KV Store] Fetch error or timeout:', err);
  }
  return activeCodeBindings.get(cleanCode) || null;
}

async function saveRemoteBinding(cleanCode: string, binding: CodeBinding | null): Promise<void> {
  if (binding) {
    activeCodeBindings.set(cleanCode, binding);
  } else {
    activeCodeBindings.delete(cleanCode);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    if (binding) {
      await fetch(`${KV_STORE_URL}/${encodeURIComponent(cleanCode)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(binding),
        signal: controller.signal,
      });
    } else {
      await fetch(`${KV_STORE_URL}/${encodeURIComponent(cleanCode)}`, {
        method: 'DELETE',
        signal: controller.signal,
      });
    }
    clearTimeout(timeout);
  } catch (err) {
    console.warn('[KV Store] Save error or timeout:', err);
  }
}

// Endpoint to unbind device when student disconnects
apiRouter.post('/unbind', async (req, res) => {
  const studentCode = (req.headers['x-student-access-code'] as string) || (req.body && req.body.studentAccessCode);
  const deviceId = (req.headers['x-client-device-id'] as string) || (req.body && req.body.deviceId);

  if (studentCode && deviceId) {
    const cleanCode = studentCode.trim().toLowerCase();
    const binding = await fetchRemoteBinding(cleanCode);
    if (binding && binding.deviceId === deviceId) {
      await saveRemoteBinding(cleanCode, null);
    }
  }
  res.json({ status: 'unbound' });
});

// Endpoint to verify student code and register 1-device lock
apiRouter.post('/verify-code', async (req, res) => {
  const studentCode = (req.headers['x-student-access-code'] as string) || (req.body && req.body.studentAccessCode);
  const deviceId = (req.headers['x-client-device-id'] as string) || (req.body && req.body.deviceId);
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';

  if (!isValidStudentCode(studentCode)) {
    return res.status(403).json({
      error: 'Acesso Negado: Código de Aluno inválido ou não reconhecido. Verifique o código da mentoria.',
    });
  }

  const cleanCode = studentCode.trim().toLowerCase();

  // Master Mentor codes are exempt from strict 1-device binding lock
  if (MASTER_CODES_LIST.includes(cleanCode)) {
    return res.json({ status: 'ok', isMaster: true, onlineDevices: '1/1' });
  }

  if (!deviceId) {
    return res.status(400).json({ error: 'Identificador de dispositivo ausente.' });
  }

  const now = Date.now();
  const existingBinding = await fetchRemoteBinding(cleanCode);

  if (!existingBinding) {
    const newBinding: CodeBinding = {
      deviceId,
      registeredAt: now,
      lastActiveAt: now,
      ip: String(clientIp),
    };
    await saveRemoteBinding(cleanCode, newBinding);
    return res.json({ status: 'ok', bound: true, onlineDevices: '1/1' });
  }

  if (existingBinding.deviceId === deviceId) {
    existingBinding.lastActiveAt = now;
    await saveRemoteBinding(cleanCode, existingBinding);
    return res.json({ status: 'ok', bound: true, onlineDevices: '1/1' });
  }

  // Active on another device
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;
  if (now - (existingBinding.lastActiveAt || 0) > TWELVE_HOURS) {
    const newBinding: CodeBinding = {
      deviceId,
      registeredAt: now,
      lastActiveAt: now,
      ip: String(clientIp),
    };
    await saveRemoteBinding(cleanCode, newBinding);
    return res.json({ status: 'ok', bound: true, onlineDevices: '1/1' });
  }

  return res.status(403).json({
    error: `Acesso Negado: O código (${studentCode.trim().toUpperCase()}) já está em uso em outro dispositivo (Computador/Celular). Limite: 1/1 Dispositivo ativado. Você deve clicar em 'Sair' no seu outro aparelho primeiro para liberar o acesso aqui.`,
  });
});

// Helper to validate student access code AND single-device binding lock
async function validateStudentAccessAsync(req: express.Request, res: express.Response): Promise<boolean> {
  const studentCode = (req.headers['x-student-access-code'] as string) || (req.body && req.body.studentAccessCode);
  const deviceId = (req.headers['x-client-device-id'] as string) || (req.body && req.body.deviceId);
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown';

  if (!isValidStudentCode(studentCode)) {
    res.status(403).json({
      error: 'Acesso Negado: Código de Aluno inválido ou não informado. Solicite seu código individual na mentoria.',
    });
    return false;
  }

  const cleanCode = studentCode.trim().toLowerCase();

  // Master Mentor codes are exempt from strict 1-device binding lock
  if (MASTER_CODES_LIST.includes(cleanCode)) {
    return true;
  }

  const now = Date.now();
  const existingBinding = await fetchRemoteBinding(cleanCode);

  if (!existingBinding) {
    if (deviceId) {
      const newBinding: CodeBinding = {
        deviceId,
        registeredAt: now,
        lastActiveAt: now,
        ip: String(clientIp),
      };
      await saveRemoteBinding(cleanCode, newBinding);
    }
    return true;
  }

  // Check if a different device is trying to use the same student code
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;
  if (deviceId && existingBinding.deviceId !== deviceId) {
    // If inactive for > 12 hours, allow re-binding
    if (now - (existingBinding.lastActiveAt || 0) > TWELVE_HOURS) {
      const newBinding: CodeBinding = {
        deviceId,
        registeredAt: now,
        lastActiveAt: now,
        ip: String(clientIp),
      };
      await saveRemoteBinding(cleanCode, newBinding);
      return true;
    }

    res.status(403).json({
      error: `Acesso Negado: O código (${studentCode.trim().toUpperCase()}) já está em uso em outro dispositivo. Limite: 1/1 Dispositivo ativado. Você deve clicar em 'Sair' no seu outro aparelho primeiro para liberar o acesso aqui.`,
    });
    return false;
  }

  if (deviceId) {
    existingBinding.lastActiveAt = now;
    await saveRemoteBinding(cleanCode, existingBinding);
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
  if (!(await validateStudentAccessAsync(req, res))) return;

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
  if (!(await validateStudentAccessAsync(req, res))) return;

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
  if (!(await validateStudentAccessAsync(req, res))) return;

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

