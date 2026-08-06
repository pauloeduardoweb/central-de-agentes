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
  console.log('[TikTok Callback] Step 1: Callback route hit. Query params:', req.query);
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.warn('[TikTok Callback] Error param present:', error, error_description);
      const errReason = String(error_description || error || 'Autorizacao_Negada');
      return res.redirect(`/mentor/integracoes/tiktok?status=error&message=${encodeURIComponent(errReason)}`);
    }

    if (!code || !state) {
      console.warn('[TikTok Callback] Missing code or state:', { code: !!code, state: !!state });
      return res.redirect('/mentor/integracoes/tiktok?status=error&message=Parametros_Ausentes');
    }

    // Validate CSRF state and consume PKCE session
    console.log('[TikTok Callback] Step 2: Validating CSRF state token:', state);
    const session = await validateAndConsumeOAuthState(String(state));
    if (!session) {
      console.warn('[TikTok Callback] Invalid or expired state session for state:', state);
      return res.redirect('/mentor/integracoes/tiktok?status=error&message=State_Invalido_ou_Expirado');
    }
    console.log('[TikTok Callback] Session validated for user code:', session.codigo);

    const clientKey = getTikTokClientKey();
    const clientSecret = getTikTokClientSecret();
    const redirectUri = getTikTokRedirectUri();
    const apiBaseUrl = getTikTokApiBaseUrl();
    const tokenUrl = `${apiBaseUrl}/v2/oauth/token/`;

    console.log('[TikTok Callback] Step 3: Preparing token exchange request:', {
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

    console.log('[TikTok Callback] Step 4: Sending POST request to TikTok token endpoint...');
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: bodyParams.toString(),
    });

    console.log('[TikTok Callback] Step 5: Token endpoint response received. Status:', tokenRes.status, tokenRes.statusText);
    const rawText = await tokenRes.text();
    console.log('[TikTok Callback] Raw token response body:', rawText);

    let tokenJson: any = {};
    try {
      tokenJson = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('[TikTok Callback] Failed to parse JSON from token response:', parseErr);
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
      console.error('[TikTok Token Exchange Error]:', tokenJson);
      return res.redirect(`/mentor/integracoes/tiktok?status=error&message=${encodeURIComponent(errMsg)}`);
    }

    const accessToken = payload.access_token;
    const refreshToken = payload.refresh_token;
    const expiresIn = payload.expires_in;
    const refreshExpiresIn = payload.refresh_expires_in;
    const openId = payload.open_id;
    const scope = payload.scope || 'user.info.basic';

    console.log('[TikTok Callback] Step 6: Access token obtained successfully. OpenID:', openId);

    // 2. Fetch basic profile info from TikTok User Info API v2 (Sandbox or Production)
    let displayName = 'Conta TikTok';
    let avatarUrl = '';
    let unionId = payload.union_id || '';

    if (accessToken) {
      console.log('[TikTok Callback] Step 7: Fetching user profile info from UserInfo API...');
      try {
        const userInfoRes = await fetch(
          `${apiBaseUrl}/v2/user/info/?fields=open_id,union_id,avatar_url,display_name`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        console.log('[TikTok Callback] UserInfo HTTP status:', userInfoRes.status);
        const userInfoJson = await userInfoRes.json();
        console.log('[TikTok Callback] UserInfo response json:', userInfoJson);

        const userData = userInfoJson.data?.user || userInfoJson.data || userInfoJson.user;
        if (userData) {
          if (userData.display_name) displayName = userData.display_name;
          if (userData.avatar_url) avatarUrl = userData.avatar_url;
          if (userData.union_id) unionId = userData.union_id;
        }
      } catch (err) {
        console.warn('[TikTok UserInfo Fetch Warning]:', err);
      }
    }

    // 3. Save connection to database
    console.log('[TikTok Callback] Step 8: Saving TikTok connection to database for user:', session.codigo);
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

    console.log('[TikTok Callback] Step 9: Connection saved successfully. Redirecting to success.');
    return res.redirect('/mentor/integracoes/tiktok?status=success');
  } catch (err: any) {
    console.error('[TikTok OAuth Callback Fatal Error]:', err?.stack || err);
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
