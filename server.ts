import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { isValidStudentCode } from './src/data/studentCodes';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = 3000;

// Lazy initialization of Gemini client
function getGeminiClient(customApiKey?: string) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Memory registry for device-code bindings
interface DeviceBinding {
  deviceId: string;
  registeredAt: number;
  lastActiveAt: number;
  ip?: string;
}

const activeCodeBindings = new Map<string, DeviceBinding>();
const MASTER_CODES_LIST = ['mentor-bigode', 'bigode-mentor', 'bigode7144', '7144bigode'];

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint to unbind device when student disconnects
app.post('/api/unbind', (req, res) => {
  const studentCode = (req.headers['x-student-access-code'] as string) || (req.body && req.body.studentAccessCode);
  const deviceId = (req.headers['x-client-device-id'] as string) || (req.body && req.body.deviceId);

  if (studentCode && deviceId) {
    const cleanCode = studentCode.trim().toLowerCase();
    const binding = activeCodeBindings.get(cleanCode);
    if (binding && binding.deviceId === deviceId) {
      activeCodeBindings.delete(cleanCode);
    }
  }
  res.json({ status: 'unbound' });
});

// Helper to validate student access code AND single-device binding lock
function validateStudentAccess(req: express.Request, res: express.Response): boolean {
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
  const existingBinding = activeCodeBindings.get(cleanCode);

  if (!existingBinding) {
    if (deviceId) {
      activeCodeBindings.set(cleanCode, {
        deviceId,
        registeredAt: now,
        lastActiveAt: now,
        ip: String(clientIp),
      });
    }
    return true;
  }

  // Check if a different device is trying to use the same student code
  const TWELVE_HOURS = 12 * 60 * 60 * 1000;
  if (deviceId && existingBinding.deviceId !== deviceId) {
    // If inactive for > 12 hours, allow re-binding
    if (now - existingBinding.lastActiveAt > TWELVE_HOURS) {
      activeCodeBindings.set(cleanCode, {
        deviceId,
        registeredAt: now,
        lastActiveAt: now,
        ip: String(clientIp),
      });
      return true;
    }

    res.status(403).json({
      error: `Acesso Negado: O código de acesso (${studentCode.trim().toUpperCase()}) já está vinculado e em uso em outro dispositivo. Não é permitido compartilhar sua chave de acesso.`,
    });
    return false;
  }

  if (deviceId) {
    existingBinding.lastActiveAt = now;
  }
  return true;
}

// Chat endpoint for agent execution
app.post('/api/chat', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (!validateStudentAccess(req, res)) return;

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

    // Use gemini-3.6-flash model
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
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
    const msg = err.message || '';
    if (msg.includes('GEMINI_API_KEY_MISSING')) {
      return res.status(400).json({
        error: 'Nenhuma Chave API do Gemini foi fornecida. Por favor, insira sua chave do Google AI Studio.',
      });
    }
    return res.status(500).json({
      error: `Erro do Gemini: ${msg || 'Erro desconhecido ao comunicar com a IA.'}`,
    });
  }
});

// AI Agent Generator endpoint
app.post('/api/generate-agent', async (req, res) => {
  if (!validateStudentAccess(req, res)) return;
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
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
    res.status(500).json({ error: err.message || 'Erro ao gerar agente com IA.' });
  }
});

// Multi-Agent Collaboration Endpoint
app.post('/api/multi-agent', async (req, res) => {
  if (!validateStudentAccess(req, res)) return;
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

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
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
    res.status(500).json({ error: err.message || 'Erro no modo multi-agente.' });
  }
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

if (process.env.VERCEL !== '1') {
  startServer();
}

