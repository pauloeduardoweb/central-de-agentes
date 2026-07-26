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

function getAiClient(clientApiKey?: string): GoogleGenAI {
  const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({ apiKey });
}

// Registry em memória para tokens/códigos
const registeredDevices = new Set<string>();

// Middleware de verificação de aluno
const checkStudentAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const clientApiKey = req.headers['x-gemini-api-key'] as string;
  const studentCode = req.headers['x-student-code'] as string;
  const deviceFingerprint = req.headers['x-device-fingerprint'] as string;

  if (clientApiKey && clientApiKey.trim().length > 0) {
    return next();
  }

  if (deviceFingerprint && registeredDevices.has(deviceFingerprint)) {
    return next();
  }

  if (studentCode && isValidStudentCode(studentCode)) {
    if (deviceFingerprint) {
      registeredDevices.add(deviceFingerprint);
    }
    return next();
  }

  return res.status(401).json({
    error: 'Acesso negado. Forneça o seu Código de Acesso de Aluno ou sua própria chave da API Gemini.',
    requiresAuth: true
  });
};

// Endpoint de verificação de código
app.post('/api/verify-code', (req, res) => {
  const { code, fingerprint } = req.body;
  if (!code || !isValidStudentCode(code)) {
    return res.status(400).json({ valid: false, error: 'Código de aluno inválido ou expirado.' });
  }

  if (fingerprint) {
    registeredDevices.add(fingerprint);
  }

  return res.json({ valid: true, message: 'Código verificado com sucesso!' });
});

// Endpoint de verificação de status do fingerprint
app.get('/api/check-device', (req, res) => {
  const fingerprint = req.headers['x-device-fingerprint'] as string;
  if (fingerprint && registeredDevices.has(fingerprint)) {
    return res.json({ authorized: true });
  }
  return res.json({ authorized: false });
});

// Helper de fallback para modelos Gemini
async function generateContentWithFallback(ai: GoogleGenAI, params: { contents: any; config?: any }) {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite'];
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

// Rota de chat do Gemini
app.post('/api/chat', checkStudentAuth, async (req, res) => {
  try {
    const clientApiKey = req.headers['x-gemini-api-key'] as string;
    const ai = getAiClient(clientApiKey);
    const { message, history, systemInstruction, image } = req.body;

    const contents: any[] = [];

    if (history && Array.isArray(history)) {
      for (const msg of history) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text || msg.content }]
        });
      }
    }

    const currentParts: any[] = [];
    if (image) {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
      const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      currentParts.push({
        inlineData: {
          data: base64Data,
          mimeType
        }
      });
    }

    if (message) {
      currentParts.push({ text: message });
    }

    contents.push({
      role: 'user',
      parts: currentParts
    });

    const response = await generateContentWithFallback(ai, {
      contents,
      config: systemInstruction ? { systemInstruction } : undefined
    });

    return res.json({ text: response.text });
  } catch (error: any) {
    console.error('Erro no /api/chat:', error);
    if (error?.message === 'GEMINI_API_KEY_MISSING') {
      return res.status(401).json({ error: 'Chave de API do Gemini não configurada no servidor.' });
    }
    return res.status(500).json({ error: error?.message || 'Erro interno ao processar mensagem.' });
  }
});

// Tratamento global de erro Express para Serverless
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err?.message || 'Erro interno do servidor.' });
});

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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

export default app;
