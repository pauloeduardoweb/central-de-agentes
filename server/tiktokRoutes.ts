import express from 'express';
import {
  createOAuthSession,
  validateAndConsumeOAuthState,
  saveTikTokConnection,
  getSafeTikTokConnection,
  revokeTikTokConnection,
  getTikTokApiBaseUrl,
  getTikTokRedirectUri,
  getTikTokClientKey,
  getTikTokClientSecret,
} from './tiktokService.js';
import { extractChatCredentials } from './chatService.js';
import { lookupKeyType, normalizeAccessCode } from './authKeys.js';

export const tiktokRouter = express.Router();

/**
 * Helper to identify authenticated student session code.
 */
function getSessionUserCode(req: express.Request): string | null {
  const { accessCode } = extractChatCredentials(req);
  const cleanCode = normalizeAccessCode(accessCode);
  if (!cleanCode) return null;

  const keyType = lookupKeyType(cleanCode);
  if (keyType === 'STUDENT' || keyType === 'MASTER') {
    return cleanCode;
  }
  return null;
}

/**
 * GET /api/tiktok/oauth/start
 * Initiates TikTok OAuth 2.0 PKCE flow.
 * Requires user authentication via x-student-access-code header or code query param.
 */
tiktokRouter.get('/oauth/start', async (req: express.Request, res: express.Response) => {
  try {
    const userCode = getSessionUserCode(req) || normalizeAccessCode(req.query.code || req.query.accessCode);

    if (!userCode) {
      return res.status(401).redirect('/mentor/integracoes/tiktok?status=error&message=Autenticacao_Necessaria');
    }

    const { state, codeChallenge } = await createOAuthSession(userCode);

    const clientKey = getTikTokClientKey();
    const redirectUri = getTikTokRedirectUri();
    const scope = 'user.info.basic';

    const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
    authUrl.searchParams.set('client_key', clientKey);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    // Secondary HTTP cookie for extra CSRF safety
    res.cookie('tiktok_oauth_state', state, {
      httpOnly: true,
      secure: true,
      maxAge: 10 * 60 * 1000,
      sameSite: 'lax',
    });

    return res.redirect(authUrl.toString());
  } catch (err: any) {
    console.error('[TikTok OAuth Start Error]:', err);
    return res.redirect('/mentor/integracoes/tiktok?status=error&message=Erro_Ao_Iniciar_OAuth');
  }
});

/**
 * GET /api/tiktok/oauth/callback
 * Official TikTok OAuth 2.0 callback endpoint.
 * URL: https://app.geracaozpro.com/api/tiktok/oauth/callback
 */
tiktokRouter.get('/oauth/callback', async (req: express.Request, res: express.Response) => {
  let currentStage = '[CALLBACK 01] Callback iniciado';
  let lastHttpResponseInfo: any = null;
  let lastHttpResponseRawBody: string | null = null;

  console.log(currentStage);

  try {
    currentStage = '[CALLBACK 02] Query recebida';
    const { code, state, error, error_description } = req.query;
    console.log(currentStage, { code: code ? 'PRESENT' : 'MISSING', state: state ? String(state) : 'MISSING', error, error_description });

    if (error) {
      console.warn('[CALLBACK 02.1] Parametro error retornado pelo TikTok:', error, error_description);
      const errReason = String(error_description || error || 'Autorizacao_Negada');
      return res.redirect(`/mentor/integracoes/tiktok?status=error&message=${encodeURIComponent(errReason)}`);
    }

    if (!code || !state) {
      console.warn('[CALLBACK 02.2] Parametros obrigatorios ausentes:', { code: !!code, state: !!state });
      return res.redirect('/mentor/integracoes/tiktok?status=error&message=Parametros_Ausentes');
    }

    currentStage = '[CALLBACK 03] State validado';
    console.log('[CALLBACK 03] Validando CSRF state no banco/memoria...');
    const session = await validateAndConsumeOAuthState(String(state));
    if (!session) {
      console.warn('[CALLBACK 03.1] State invalido ou expirado:', state);
      return res.redirect('/mentor/integracoes/tiktok?status=error&message=State_Invalido_ou_Expirado');
    }
    console.log('[CALLBACK 03.2] State validado com sucesso. Usuario:', session.codigo);

    currentStage = '[CALLBACK 04] Iniciando troca de token';
    const clientKey = getTikTokClientKey();
    const clientSecret = getTikTokClientSecret();
    const redirectUri = getTikTokRedirectUri();
    const apiBaseUrl = getTikTokApiBaseUrl();
    const tokenUrl = `${apiBaseUrl}/v2/oauth/token/`;

    console.log(currentStage, {
      apiBaseUrl,
      tokenUrl,
      clientKeyPrefix: clientKey ? clientKey.substring(0, 4) + '***' : 'EMPTY',
      redirectUri,
      hasCodeVerifier: !!session.codeVerifier,
    });

    const bodyParams = new URLSearchParams();
    bodyParams.append('client_key', clientKey);
    bodyParams.append('client_secret', clientSecret);
    bodyParams.append('code', String(code));
    bodyParams.append('grant_type', 'authorization_code');
    bodyParams.append('redirect_uri', redirectUri);
    bodyParams.append('code_verifier', session.codeVerifier);

    console.log('[CALLBACK 04.1] Enviando POST para o endpoint de token do TikTok...');
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: bodyParams.toString(),
    });

    currentStage = '[CALLBACK 05] Resposta HTTP recebida';
    lastHttpResponseInfo = {
      status: tokenRes.status,
      statusText: tokenRes.statusText,
      headers: Object.fromEntries(tokenRes.headers.entries()),
    };
    console.log(currentStage, lastHttpResponseInfo);

    currentStage = '[CALLBACK 06] Corpo bruto da resposta';
    const rawText = await tokenRes.text();
    lastHttpResponseRawBody = rawText;
    console.log(currentStage, rawText);

    currentStage = '[CALLBACK 07] JSON convertido';
    let tokenJson: any = {};
    try {
      tokenJson = JSON.parse(rawText);
      console.log(currentStage, tokenJson);
    } catch (parseErr: any) {
      console.error('[CALLBACK 07.1] Erro ao fazer parse do JSON do token:', parseErr);
      return res.redirect('/mentor/integracoes/tiktok?status=error&message=Resposta_Invalida_TikTok');
    }

    // Support both direct object or tokenJson.data (TikTok API v2 response wrapper)
    const payload = tokenJson.data || tokenJson;

    if (!tokenRes.ok || (tokenJson.error?.code !== 'ok' && !payload.access_token)) {
      const errMsg =
        tokenJson.error?.message ||
        tokenJson.message ||
        tokenJson.error_description ||
        'Falha_Troca_Token';
      console.error('[CALLBACK 07.2] Erro na resposta da troca de token TikTok:', tokenJson);
      return res.redirect(`/mentor/integracoes/tiktok?status=error&message=${encodeURIComponent(errMsg)}`);
    }

    const accessToken = payload.access_token;
    const refreshToken = payload.refresh_token;
    const expiresIn = payload.expires_in;
    const refreshExpiresIn = payload.refresh_expires_in;
    const openId = payload.open_id;
    const scope = payload.scope || 'user.info.basic';

    console.log('[CALLBACK 07.3] Token de acesso obtido com sucesso. OpenID:', openId);

    // 2. Fetch basic profile info from TikTok User Info API v2 (Sandbox or Production)
    currentStage = '[CALLBACK 08] Iniciando User Info';
    console.log(currentStage);

    let displayName = 'Conta TikTok';
    let avatarUrl = '';
    let unionId = payload.union_id || '';

    if (accessToken) {
      try {
        const userInfoRes = await fetch(
          `${apiBaseUrl}/v2/user/info/?fields=open_id,union_id,avatar_url,display_name`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        console.log('[CALLBACK 08.1] UserInfo HTTP status:', userInfoRes.status);
        const userInfoJson = await userInfoRes.json();
        console.log('[CALLBACK 08.2] UserInfo JSON:', userInfoJson);

        const userData = userInfoJson.data?.user || userInfoJson.data || userInfoJson.user;
        if (userData) {
          if (userData.display_name) displayName = userData.display_name;
          if (userData.avatar_url) avatarUrl = userData.avatar_url;
          if (userData.union_id) unionId = userData.union_id;
        }
      } catch (userInfoErr) {
        console.warn('[CALLBACK 08.3] Aviso ao buscar dados do usuario TikTok:', userInfoErr);
      }
    }

    // 3. Save connection to database
    currentStage = '[CALLBACK 09] Salvando conexão';
    console.log(currentStage, 'para o codigo:', session.codigo);

    await saveTikTokConnection({
      codigo: session.codigo,
      open_id: openId || 'unknown_openid',
      union_id: unionId,
      display_name: displayName,
      avatar_url: avatarUrl,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      refresh_expires_in: refreshExpiresIn,
      scope,
    });

    currentStage = '[CALLBACK 10] Finalizado com sucesso';
    console.log(currentStage, 'Redirecionando para status=success');
    return res.redirect('/mentor/integracoes/tiktok?status=success');
  } catch (err: any) {
    console.error(`[CALLBACK ERROR] Erro fatal capturado na etapa [${currentStage}]:`);
    console.error('Mensagem:', err?.message || String(err));
    console.error('Stack completo:', err?.stack || 'Sem stack trace');
    console.error('Objeto do erro:', JSON.stringify(err, Object.getOwnPropertyNames(err || {})));
    console.error('Ultima Resposta HTTP registrada:', lastHttpResponseInfo);
    console.error('Corpo bruto retornado pelo TikTok:', lastHttpResponseRawBody);

    return res.redirect('/mentor/integracoes/tiktok?status=error&message=Erro_Interno_Callback');
  }
});

/**
 * GET /api/tiktok/connection
 * Retrieves connection status for the authenticated user.
 */
tiktokRouter.get('/connection', async (req: express.Request, res: express.Response) => {
  try {
    const userCode = getSessionUserCode(req);
    if (!userCode) {
      return res.status(401).json({ error: 'UNAUTHORIZED', connected: false });
    }

    const conn = await getSafeTikTokConnection(userCode);
    return res.json(conn);
  } catch (err: any) {
    console.error('[TikTok Connection Get Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', connected: false });
  }
});

/**
 * DELETE /api/tiktok/connection
 * Revokes TikTok connection for the authenticated user.
 */
tiktokRouter.delete('/connection', async (req: express.Request, res: express.Response) => {
  try {
    const userCode = getSessionUserCode(req);
    if (!userCode) {
      return res.status(401).json({ error: 'UNAUTHORIZED', success: false });
    }

    const success = await revokeTikTokConnection(userCode);
    return res.json({
      success,
      message: 'Conta TikTok desconectada com sucesso.',
    });
  } catch (err: any) {
    console.error('[TikTok Connection Delete Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', success: false });
  }
});
