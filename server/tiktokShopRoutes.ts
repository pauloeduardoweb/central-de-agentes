import express from 'express';
import {
  getTikTokShopAppKey,
  getTikTokShopAppSecret,
  getTikTokShopRedirectUri,
  validateTikTokShopState,
} from './tiktokShopService.js';

export const tiktokShopRouter = express.Router();

/**
 * GET /api/tiktok-shop/callback
 * Official Redirect URL for TikTok Shop Partner Center integration.
 * Public URL: https://app.geracaozpro.com/api/tiktok-shop/callback
 */
tiktokShopRouter.get('/callback', (req: express.Request, res: express.Response) => {
  const code = req.query.code ? String(req.query.code).trim() : null;
  const state = req.query.state ? String(req.query.state).trim() : null;
  const error = req.query.error || req.query.err_msg || req.query.error_description;

  // 1. Error handling
  if (error) {
    console.warn('[TikTok Shop Callback] Authorization error received:', error);
    if (req.headers.accept?.includes('application/json')) {
      return res.status(400).json({
        success: false,
        message: 'Autorização TikTok Shop não concluída.',
      });
    }
    return res.status(400).send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TikTok Shop - Erro de Autorização</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; }
          .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 2rem; max-width: 480px; width: 100%; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); text-align: center; }
          h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: #991b1b; }
          p { color: #64748b; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem; }
          .badge { display: inline-block; padding: 0.25rem 0.75rem; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">TikTok Shop Partner</div>
          <h1>Autorização TikTok Shop não concluída.</h1>
          <p>Não foi possível concluir o processo de autorização com a TikTok Shop. Você pode fechar esta janela e tentar novamente mais tarde.</p>
        </div>
      </body>
      </html>
    `);
  }

  // 2. Code present (Authorization Success)
  if (code) {
    console.log('[TikTok Shop Callback] code recebido: sim');
    if (state) {
      console.log('[TikTok Shop Callback] state recebido: sim');
      const isValidState = validateTikTokShopState(state);
      if (!isValidState) {
        console.warn('[TikTok Shop Callback] State recebido mas validação falhou');
      }
    }

    /*
     * PRÓXIMA ETAPA (FUTURO):
     * Quando App Key e App Secret forem cadastrados no Partner Center:
     * - Trocar `code` por `access_token` e `refresh_token` na API do TikTok Shop Partner.
     * - Salvar credenciais/tokens da loja no banco de dados.
     */

    if (req.headers.accept?.includes('application/json')) {
      return res.status(200).json({
        success: true,
        message: 'Autorização TikTok Shop recebida com sucesso.',
      });
    }

    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TikTok Shop - Autorização Recebida</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; }
          .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 2rem; max-width: 480px; width: 100%; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); text-align: center; }
          h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: #065f46; }
          p { color: #64748b; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem; }
          .badge { display: inline-block; padding: 0.25rem 0.75rem; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">TikTok Shop Partner</div>
          <h1>Autorização TikTok Shop recebida com sucesso.</h1>
          <p>Sua autorização foi recebida pelo sistema Geração Z Pro. Você pode fechar esta janela com segurança.</p>
        </div>
      </body>
      </html>
    `);
  }

  // 3. No parameters / Direct access (Health / publishing check)
  console.log('[TikTok Shop Callback] Teste de rota acessado sem parâmetros');
  if (req.headers.accept?.includes('application/json')) {
    return res.status(200).json({
      status: 'ok',
      message: 'TikTok Shop callback ativo.',
      redirectUri: getTikTokShopRedirectUri(),
    });
  }

  return res.status(200).send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>TikTok Shop Callback - Ativo</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; }
        .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 2rem; max-width: 520px; width: 100%; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); text-align: center; }
        h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: #0f172a; }
        p { color: #64748b; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1rem; }
        .badge { display: inline-block; padding: 0.25rem 0.75rem; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem; }
        .endpoint { background: #f1f5f9; padding: 0.5rem 0.75rem; border-radius: 6px; font-family: monospace; font-size: 0.85rem; color: #334155; word-break: break-all; margin-top: 0.5rem; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge">TikTok Shop Partner</div>
        <h1>TikTok Shop callback ativo.</h1>
        <p>A rota do callback do TikTok Shop Partner Center foi publicada e está funcionando normalmente nesta URL:</p>
        <div class="endpoint">https://app.geracaozpro.com/api/tiktok-shop/callback</div>
      </div>
    </body>
    </html>
  `);
});
