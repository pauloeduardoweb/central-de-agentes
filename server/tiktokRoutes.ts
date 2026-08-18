import express from 'express';
import {
  createOAuthSession,
  validateAndConsumeOAuthState,
  saveTikTokConnection,
  getSafeTikTokConnection,
  revokeTikTokConnection,
  fetchTikTokUserProfile,
  syncTikTokProfile,
  getTikTokApiBaseUrl,
  getTikTokRedirectUri,
  getTikTokClientKey,
  getTikTokClientSecret,
  OAuthStateSession,
} from './tiktokService.js';
import { normalizeAccessCode } from './authKeys.js';
import { checkCodeKeyType, getKeyAccessStatus, memorySessionsMap } from './presenceService.js';
import { db, isDatabaseConfigured, ensureSessionsTable } from './database.js';

export const tiktokRouter = express.Router();

/**
 * Helper to parse cookies from incoming HTTP request.
 */
function parseCookies(req: express.Request): Record<string, string> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return {};
  const list: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      const name = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      try {
        list[name] = decodeURIComponent(val);
      } catch {
        list[name] = val;
      }
    }
  });
  return list;
}

/**
 * Resolves user code EXCLUSIVELY from authenticated backend session ID (header/cookie).
 * Disallows access code headers (x-access-code, x-student-access-code, x-master-key),
 * cookies (tiktok_auth_code, user_access_code), or query/body parameters from acting as identity fallback.
 * If no valid active session is found: returns null (resulting in 401).
 */
async function getSessionUserCode(req: express.Request): Promise<string | null> {
  const cookies = parseCookies(req);

  // Check active session ID exclusively from headers or session cookie
  const sessionId =
    (req.headers['x-session-id'] as string) ||
    (req.headers['x-student-session-id'] as string) ||
    cookies['tiktok_auth_session'] ||
    cookies['user_session_id'] ||
    cookies['session_id'];

  if (!sessionId) {
    return null;
  }

  // 1. Check in MySQL sessoes table if configured
  if (isDatabaseConfigured()) {
    try {
      await ensureSessionsTable();
      const [rows]: any = await db.query(
        `SELECT codigo, expires_at, disconnect_source FROM sessoes WHERE active_session_id = ? LIMIT 1`,
        [sessionId]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        const row = rows[0];
        const isNotDisconnected = !row.disconnect_source || row.disconnect_source === 'NONE';
        const isNotExpired = !row.expires_at || new Date(row.expires_at).getTime() > Date.now();
        if (isNotDisconnected && isNotExpired && row.codigo) {
          const cleanCode = normalizeAccessCode(row.codigo);
          const keyStatus = await getKeyAccessStatus(cleanCode);
          if (keyStatus.accessStatus !== 'SUSPENDED' && keyStatus.accessStatus !== 'BANNED') {
            return cleanCode;
          }
        }
      }
    } catch (err) {
      console.warn('[getSessionUserCode DB Warning]:', err);
    }
  }

  // 2. Check memory sessions fallback
  for (const [code, mem] of memorySessionsMap.entries()) {
    if (mem.sessionId === sessionId) {
      const cleanCode = normalizeAccessCode(code);
      const keyStatus = await getKeyAccessStatus(cleanCode);
      if (keyStatus.accessStatus !== 'SUSPENDED' && keyStatus.accessStatus !== 'BANNED') {
        return cleanCode;
      }
    }
  }

  return null;
}

/**
 * POST /api/tiktok/oauth/prepare
 * Authenticated preparation endpoint for TikTok OAuth 2.0 PKCE flow.
 * Validates session ID from x-session-id header / cookie, generates PKCE & state session,
 * persists the correct returnPath (Mentor vs Student), and returns the official TikTok authorize URL.
 */
tiktokRouter.post('/oauth/prepare', async (req: express.Request, res: express.Response) => {
  try {
    const userCode = await getSessionUserCode(req);

    if (!userCode) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Autenticação necessária. Faça login para conectar sua conta TikTok.',
      });
    }

    const keyType = await checkCodeKeyType(userCode);
    const returnPath = keyType === 'MASTER' ? '/mentor/integracoes/tiktok' : '/integracoes/tiktok';

    const { state, codeChallenge } = await createOAuthSession(userCode, returnPath);

    const clientKey = getTikTokClientKey();
    const redirectUri = getTikTokRedirectUri();
    const scope = 'user.info.basic,user.info.profile';

    if (!clientKey) {
      console.error('[TikTok OAuth Prepare Error]: TIKTOK_CLIENT_KEY is missing');
      return res.status(500).json({
        success: false,
        error: 'CONFIGURATION_ERROR',
        message: 'Configuração da chave TikTok não encontrada no servidor.',
      });
    }

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

    return res.json({
      success: true,
      authUrl: authUrl.toString(),
      returnPath,
    });
  } catch (err: any) {
    console.error('[TikTok OAuth Prepare Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Erro interno ao preparar autorização do TikTok.',
    });
  }
});

/**
 * GET /api/tiktok/oauth/start
 * Initiates TikTok OAuth 2.0 PKCE flow with approved production scopes: user.info.basic,user.info.profile.
 * Requires validated user authentication via MySQL verified student or master session.
 */
tiktokRouter.get('/oauth/start', async (req: express.Request, res: express.Response) => {
  try {
    const userCode = await getSessionUserCode(req);

    if (!userCode) {
      const referer = req.headers['referer'] || '';
      const isMentor = referer.includes('/mentor');
      const fallbackReturn = isMentor ? '/mentor/integracoes/tiktok' : '/integracoes/tiktok';
      return res.status(401).redirect(`${fallbackReturn}?status=error&message=Autenticacao_Necessaria`);
    }

    const keyType = await checkCodeKeyType(userCode);
    const returnPath = keyType === 'MASTER' ? '/mentor/integracoes/tiktok' : '/integracoes/tiktok';

    const { state, codeChallenge } = await createOAuthSession(userCode, returnPath);

    const clientKey = getTikTokClientKey();
    const redirectUri = getTikTokRedirectUri();
    const scope = 'user.info.basic,user.info.profile';

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
    return res.redirect('/integracoes/tiktok?status=error&message=Erro_Ao_Iniciar_OAuth');
  }
});

/**
 * GET /api/tiktok/oauth/callback
 * Official TikTok OAuth 2.0 callback endpoint.
 * URL: https://app.geracaozpro.com/api/tiktok/oauth/callback
 */
tiktokRouter.get('/oauth/callback', async (req: express.Request, res: express.Response) => {
  let currentStage = '[CALLBACK 01] Callback iniciado';
  let lastHttpStatus: number | null = null;
  let lastHttpStatusText: string | null = null;
  let returnPath = '/integracoes/tiktok';

  try {
    currentStage = '[CALLBACK 02] Query recebida';
    const { code, state, error, error_description } = req.query;
    console.log(currentStage, {
      codePresent: Boolean(code),
      statePresent: Boolean(state),
      hasError: Boolean(error),
    });

    // If state is present, validate and consume state to retrieve the authentic session & returnPath
    let session: OAuthStateSession | null = null;
    if (state) {
      session = await validateAndConsumeOAuthState(String(state));
      if (session?.returnPath) {
        returnPath = session.returnPath;
      }
    }

    if (error) {
      console.warn('[CALLBACK 02.1] Parametro error retornado pelo TikTok:', error, error_description);
      const errStr = String(error).toLowerCase();
      const descStr = String(error_description || '').toLowerCase();

      const isCanceled =
        errStr.includes('cancel') ||
        errStr.includes('access_denied') ||
        errStr.includes('user_cancelled') ||
        errStr.includes('denied') ||
        descStr.includes('cancel') ||
        descStr.includes('denied') ||
        descStr.includes('recus') ||
        descStr.includes('user_cancelled');

      if (isCanceled) {
        console.log('[CALLBACK 02.2] Cancelamento/recusa de autorizacao detectado.');
        return res.redirect(`${returnPath}?status=canceled&message=Conexao_Cancelada`);
      }

      const errReason = String(error_description || error || 'Autorizacao_Negada');
      return res.redirect(`${returnPath}?status=error&message=${encodeURIComponent(errReason)}`);
    }

    if (!code || !state) {
      console.warn('[CALLBACK 02.2] Parametros obrigatorios ausentes:', { codePresent: Boolean(code), statePresent: Boolean(state) });
      return res.redirect(`${returnPath}?status=error&message=Parametros_Ausentes`);
    }

    currentStage = '[CALLBACK 03] State validado';
    console.log('[CALLBACK 03] Validando CSRF state no banco/memoria...');
    if (!session) {
      console.warn('[CALLBACK 03.1] State invalido ou expirado');
      return res.redirect(`${returnPath}?status=error&message=State_Invalido_ou_Expirado`);
    }
    console.log('[CALLBACK 03.2] State validado com sucesso.');

    currentStage = '[CALLBACK 04] Iniciando troca de token';
    const clientKey = getTikTokClientKey();
    const clientSecret = getTikTokClientSecret();
    const redirectUri = getTikTokRedirectUri();
    const apiBaseUrl = getTikTokApiBaseUrl();
    const tokenUrl = `${apiBaseUrl}/v2/oauth/token/`;

    console.log(currentStage, {
      apiBaseUrl,
      redirectUri,
      hasCodeVerifier: Boolean(session.codeVerifier),
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
    lastHttpStatus = tokenRes.status;
    lastHttpStatusText = tokenRes.statusText;
    console.log(currentStage, {
      status: tokenRes.status,
      statusText: tokenRes.statusText,
    });

    currentStage = '[CALLBACK 06] Processando resposta';
    const rawText = await tokenRes.text();

    currentStage = '[CALLBACK 07] JSON convertido';
    let tokenJson: any = {};
    try {
      tokenJson = JSON.parse(rawText);
    } catch (parseErr: any) {
      console.error('[CALLBACK 07.1] Erro ao fazer parse do JSON do token');
      return res.redirect(`${returnPath}?status=error&message=Resposta_Invalida_TikTok`);
    }

    // Support both direct object or tokenJson.data (TikTok API v2 response wrapper)
    const payload = tokenJson.data || tokenJson;

    if (!tokenRes.ok || (tokenJson.error?.code !== 'ok' && !payload.access_token)) {
      const errMsg =
        tokenJson.error?.message ||
        tokenJson.message ||
        tokenJson.error_description ||
        'Falha_Troca_Token';
      console.error('[CALLBACK 07.2] Erro na resposta da troca de token TikTok:', {
        errorCode: tokenJson.error?.code || tokenJson.error,
        errorMessage: errMsg,
      });
      return res.redirect(`${returnPath}?status=error&message=${encodeURIComponent(errMsg)}`);
    }

    const accessToken = payload.access_token;
    const refreshToken = payload.refresh_token;
    const expiresIn = payload.expires_in;
    const refreshExpiresIn = payload.refresh_expires_in;
    const openId = payload.open_id;
    const scope = payload.scope || 'user.info.basic,user.info.profile';

    const maskedOpenId =
      openId && String(openId).length > 8
        ? `${String(openId).slice(0, 4)}...${String(openId).slice(-4)}`
        : openId || 'MISSING';

    console.log('[CALLBACK 07.3] Token de acesso processado com sucesso:', {
      stage: currentStage,
      status: tokenRes.status,
      statusText: tokenRes.statusText,
      accessTokenPresent: Boolean(accessToken),
      refreshTokenPresent: Boolean(refreshToken),
      expiresIn,
      refreshExpiresIn,
      scope,
      openIdMasked: maskedOpenId,
    });

    // 2. Fetch profile info from TikTok User Info API v2 (Approved scopes: basic + profile)
    currentStage = '[CALLBACK 08] Iniciando User Info';
    console.log(currentStage);

    let displayName = 'Conta TikTok';
    let username: string | undefined = undefined;
    let bioDescription: string | undefined = undefined;
    let avatarUrl = '';
    let avatarLargeUrl: string | undefined = undefined;
    let avatarUrl100: string | undefined = undefined;
    let profileDeepLink: string | undefined = undefined;
    let profileWebLink: string | undefined = undefined;
    let isVerified = false;
    let unionId = payload.union_id || '';

    if (accessToken) {
      try {
        const profile = await fetchTikTokUserProfile(accessToken);
        if (profile) {
          if (profile.display_name) displayName = profile.display_name;
          if (profile.username) username = profile.username;
          if (profile.bio_description) bioDescription = profile.bio_description;
          if (profile.avatar_url) avatarUrl = profile.avatar_url;
          if (profile.avatar_large_url) avatarLargeUrl = profile.avatar_large_url;
          if (profile.avatar_url_100) avatarUrl100 = profile.avatar_url_100;
          if (profile.profile_deep_link) profileDeepLink = profile.profile_deep_link;
          if (profile.profile_web_link) profileWebLink = profile.profile_web_link;
          if (profile.is_verified) isVerified = profile.is_verified;
          if (profile.union_id) unionId = profile.union_id;
        }
      } catch (userInfoErr) {
        console.warn('[CALLBACK 08.3] Aviso ao buscar dados do usuario TikTok');
      }
    }

    // 3. Save connection to database
    currentStage = '[CALLBACK 09] Salvando conexão';
    console.log(currentStage);

    const saved = await saveTikTokConnection({
      codigo: session.codigo,
      open_id: openId || 'unknown_openid',
      union_id: unionId,
      display_name: displayName,
      username,
      bio_description: bioDescription,
      avatar_url: avatarUrl,
      avatar_large_url: avatarLargeUrl,
      avatar_url_100: avatarUrl100,
      profile_deep_link: profileDeepLink,
      profile_web_link: profileWebLink,
      is_verified: isVerified,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
      refresh_expires_in: refreshExpiresIn,
      scope,
    });

    if (!saved) {
      console.error('[CALLBACK 09.1] Falha ao salvar conexao no banco de dados.');
      return res.redirect(`${returnPath}?status=error&message=Erro_Ao_Salvar_Conexao`);
    }

    currentStage = '[CALLBACK 10] Finalizado com sucesso';
    console.log(currentStage, 'Redirecionando para status=success na rota', returnPath);
    return res.redirect(`${returnPath}?status=success`);
  } catch (err: any) {
    console.error(`[CALLBACK ERROR] Erro capturado na etapa [${currentStage}]:`);
    console.error('Mensagem:', err?.message || 'Erro desconhecido');
    console.error('Ultimo HTTP Status:', { status: lastHttpStatus, statusText: lastHttpStatusText });

    return res.redirect(`${returnPath}?status=error&message=Erro_Interno_Callback`);
  }
});

/**
 * GET /api/tiktok/connection
 * Retrieves safe connection status for the authenticated user.
 */
tiktokRouter.get('/connection', async (req: express.Request, res: express.Response) => {
  try {
    const userCode = await getSessionUserCode(req);
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
 * POST /api/tiktok/refresh-profile
 * Synchronizes/refreshes user profile with TikTok API v2 using current active token or refresh token.
 */
tiktokRouter.post(['/refresh-profile', '/sync'], async (req: express.Request, res: express.Response) => {
  try {
    const userCode = await getSessionUserCode(req);
    if (!userCode) {
      return res.status(401).json({ error: 'UNAUTHORIZED', success: false });
    }

    const result = await syncTikTokProfile(userCode);
    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'SYNC_FAILED',
        success: false,
        message: 'Não foi possível sincronizar o perfil com o TikTok. Tente novamente ou atualize a autorização.',
      });
    }

    return res.json({
      success: true,
      message: 'Dados do perfil do TikTok sincronizados com sucesso!',
      connection: result.connection,
    });
  } catch (err: any) {
    console.error('[TikTok Profile Refresh Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', success: false });
  }
});

/**
 * DELETE /api/tiktok/connection
 * Revokes TikTok connection for the authenticated user.
 */
tiktokRouter.delete('/connection', async (req: express.Request, res: express.Response) => {
  try {
    const userCode = await getSessionUserCode(req);
    if (!userCode) {
      return res.status(401).json({ error: 'UNAUTHORIZED', success: false });
    }

    const success = await revokeTikTokConnection(userCode);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'TIKTOK_DISCONNECT_FAILED',
        message: 'Não foi possível desconectar a conta TikTok. Tente novamente.',
      });
    }

    return res.json({
      success: true,
      message: 'Conta TikTok desconectada com sucesso.',
    });
  } catch (err: any) {
    console.error('[TikTok Connection Delete Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', success: false });
  }
});
