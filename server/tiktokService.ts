import crypto from 'crypto';
import { db, isDatabaseConfigured, ensureTikTokConnectionsTable, ensureTikTokOAuthStatesTable } from './database.js';

/**
 * Normalizes environment variable strings removing surrounding quotes, newlines, and whitespace.
 */
export function normalizeEnvVar(val: string | undefined, defaultValue: string = ''): string {
  if (!val) return defaultValue;
  let clean = String(val).trim();
  clean = clean.replace(/^["']|["']$/g, '').trim();
  clean = clean.replace(/[\r\n]+/g, '');
  return clean || defaultValue;
}

/**
 * Gets normalized TikTok Redirect URI without trailing slash.
 */
export function getTikTokRedirectUri(): string {
  const raw = process.env.TIKTOK_REDIRECT_URI;
  let uri = normalizeEnvVar(raw, 'https://app.geracaozpro.com/api/tiktok/oauth/callback');
  if (uri.endsWith('/') && uri.length > 8) {
    uri = uri.slice(0, -1);
  }
  return uri;
}

/**
 * Gets normalized TikTok Client Key.
 */
export function getTikTokClientKey(): string {
  return normalizeEnvVar(process.env.TIKTOK_CLIENT_KEY, '');
}

/**
 * Gets normalized TikTok Client Secret.
 */
export function getTikTokClientSecret(): string {
  return normalizeEnvVar(process.env.TIKTOK_CLIENT_SECRET, '');
}

export function getTikTokApiBaseUrl(): string {
  return 'https://open.tiktokapis.com';
}

const ALGORITHM = 'aes-256-gcm';

// Encryption key derivation - EXCLUSIVELY uses TIKTOK_TOKEN_ENCRYPTION_KEY
function getEncryptionKey(): Buffer | null {
  const secretKey = normalizeEnvVar(process.env.TIKTOK_TOKEN_ENCRYPTION_KEY, '');
  if (!secretKey) {
    console.error('[TikTok Security Alert]: Required environment variable TIKTOK_TOKEN_ENCRYPTION_KEY is not configured.');
    return null;
  }
  return crypto.createHash('sha256').update(secretKey).digest();
}

/**
 * Encrypt sensitive tokens before saving in database.
 * Returns null if encryption key is missing.
 */
export function encryptToken(plainText: string): string | null {
  if (!plainText) return '';
  const key = getEncryptionKey();
  if (!key) {
    return null;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt tokens retrieved from database.
 * Returns '' if encryption key is missing or decryption fails.
 */
export function decryptToken(encryptedData: string): string {
  if (!encryptedData) return '';
  const key = getEncryptionKey();
  if (!key) {
    return '';
  }
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) return '';
    const [ivHex, authTagHex, encryptedTextHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedTextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[TikTok Encryption Error]: Failed to decrypt token');
    return '';
  }
}

export interface OAuthStateSession {
  codigo: string;
  codeVerifier: string;
  createdAt: number;
}

const oauthStateMap = new Map<string, OAuthStateSession>();

// Periodic cleanup of expired states from memory fallback
setInterval(() => {
  const now = Date.now();
  for (const [state, session] of oauthStateMap.entries()) {
    if (now - session.createdAt > 10 * 60 * 1000) {
      oauthStateMap.delete(state);
    }
  }
}, 5 * 60 * 1000);

/**
 * Creates a CSRF state & PKCE pair for TikTok OAuth initiation.
 * Stores state session shared in MySQL (with memory fallback).
 */
export async function createOAuthSession(codigo: string): Promise<{
  state: string;
  codeVerifier: string;
  codeChallenge: string;
}> {
  const state = crypto.randomBytes(24).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  if (isDatabaseConfigured()) {
    try {
      await ensureTikTokOAuthStatesTable();
      await db.query(`DELETE FROM tiktok_oauth_states WHERE created_at < NOW() - INTERVAL 10 MINUTE`).catch(() => {});
      await db.query(
        `INSERT INTO tiktok_oauth_states (state, codigo, code_verifier, created_at) VALUES (?, ?, ?, NOW())`,
        [state, codigo, codeVerifier]
      );
    } catch (err) {
      console.error('[MySQL Save OAuth State Error]:', err);
      oauthStateMap.set(state, { codigo, codeVerifier, createdAt: Date.now() });
    }
  } else {
    oauthStateMap.set(state, {
      codigo,
      codeVerifier,
      createdAt: Date.now(),
    });
  }

  return { state, codeVerifier, codeChallenge };
}

/**
 * Validates and consumes the state token to prevent CSRF and state reuse.
 * Queries MySQL shared table (or memory fallback), enforcing 10-min TTL and single-use deletion.
 */
export async function validateAndConsumeOAuthState(state: string): Promise<OAuthStateSession | null> {
  if (!state) return null;

  if (isDatabaseConfigured()) {
    try {
      await ensureTikTokOAuthStatesTable();
      const [rows]: any = await db.query(
        `SELECT state, codigo, code_verifier AS codeVerifier, UNIX_TIMESTAMP(created_at) * 1000 AS createdAt
         FROM tiktok_oauth_states
         WHERE state = ? AND created_at >= NOW() - INTERVAL 10 MINUTE`,
        [state]
      );

      // Consume state immediately (single use)
      await db.query(`DELETE FROM tiktok_oauth_states WHERE state = ?`, [state]).catch(() => {});

      if (Array.isArray(rows) && rows.length > 0) {
        return {
          codigo: rows[0].codigo,
          codeVerifier: rows[0].codeVerifier,
          createdAt: Number(rows[0].createdAt),
        };
      }
    } catch (err) {
      console.error('[MySQL Validate OAuth State Error]:', err);
    }
  }

  // Memory fallback check
  const session = oauthStateMap.get(state);
  if (!session) return null;

  oauthStateMap.delete(state);
  if (Date.now() - session.createdAt > 10 * 60 * 1000) {
    return null;
  }

  return session;
}

// Fallback memory connections store if DB is offline
interface MemoryConnection {
  codigo: string;
  open_id: string;
  union_id?: string;
  display_name: string;
  username?: string;
  bio_description?: string;
  avatar_url: string;
  avatar_large_url?: string;
  avatar_url_100?: string;
  profile_deep_link?: string;
  profile_web_link?: string;
  is_verified?: boolean;
  access_token: string;
  refresh_token?: string;
  access_token_expires_at?: Date;
  refresh_token_expires_at?: Date;
  scopes: string;
  connected_at: Date;
  updated_at?: Date;
  revoked_at?: Date | null;
}

const memoryConnectionsMap = new Map<string, MemoryConnection>();

export interface TikTokProfileData {
  open_id?: string;
  union_id?: string;
  display_name?: string;
  username?: string;
  bio_description?: string;
  avatar_url?: string;
  avatar_large_url?: string;
  avatar_url_100?: string;
  profile_deep_link?: string;
  profile_web_link?: string;
  is_verified?: boolean;
}

/**
 * Fetches user profile from official TikTok Login Kit v2 endpoint.
 * Requests ONLY approved fields: basic info + profile info (NO stats).
 */
export async function fetchTikTokUserProfile(accessToken: string): Promise<TikTokProfileData | null> {
  if (!accessToken) return null;
  const apiBaseUrl = getTikTokApiBaseUrl();
  const fields = [
    'open_id',
    'union_id',
    'avatar_url',
    'avatar_url_100',
    'avatar_large_url',
    'display_name',
    'bio_description',
    'profile_deep_link',
    'profile_web_link',
    'is_verified',
    'username',
  ].join(',');

  try {
    const res = await fetch(`${apiBaseUrl}/v2/user/info/?fields=${fields}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      console.warn('[TikTok fetchUserProfile HTTP Error]:', res.status, res.statusText);
      return null;
    }

    const json = await res.json();
    const userData = json.data?.user || json.data || json.user;
    if (!userData) {
      console.warn('[TikTok fetchUserProfile]: No user data returned', json);
      return null;
    }

    return {
      open_id: userData.open_id,
      union_id: userData.union_id,
      display_name: userData.display_name,
      username: userData.username,
      bio_description: userData.bio_description,
      avatar_url: userData.avatar_url,
      avatar_large_url: userData.avatar_large_url,
      avatar_url_100: userData.avatar_url_100,
      profile_deep_link: userData.profile_deep_link,
      profile_web_link: userData.profile_web_link,
      is_verified: Boolean(userData.is_verified),
    };
  } catch (err) {
    console.error('[TikTok fetchUserProfile Exception]:', err);
    return null;
  }
}

/**
 * Saves or updates a TikTok connection for a student code.
 */
export async function saveTikTokConnection(data: {
  codigo: string;
  open_id: string;
  union_id?: string;
  display_name?: string;
  username?: string;
  bio_description?: string;
  avatar_url?: string;
  avatar_large_url?: string;
  avatar_url_100?: string;
  profile_deep_link?: string;
  profile_web_link?: string;
  is_verified?: boolean;
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  scope?: string;
}): Promise<boolean> {
  const encAccessToken = encryptToken(data.access_token);
  const encRefreshToken = data.refresh_token ? encryptToken(data.refresh_token) : null;

  if (!encAccessToken || (data.refresh_token && !encRefreshToken)) {
    console.error('[TikTok Security Error]: Cannot save connection because token encryption is unavailable (TIKTOK_TOKEN_ENCRYPTION_KEY missing).');
    return false;
  }

  const now = new Date();
  const accessExpiresAt = data.expires_in
    ? new Date(now.getTime() + data.expires_in * 1000)
    : null;
  const refreshExpiresAt = data.refresh_expires_in
    ? new Date(now.getTime() + data.refresh_expires_in * 1000)
    : null;

  const scopes = data.scope || 'user.info.basic,user.info.profile';

  if (isDatabaseConfigured()) {
    try {
      await ensureTikTokConnectionsTable();
      await db.query(
        `INSERT INTO tiktok_connections (
          codigo, open_id, union_id, display_name, username, bio_description,
          avatar_url, avatar_large_url, avatar_url_100, profile_deep_link, profile_web_link, is_verified,
          access_token, refresh_token, access_token_expires_at, refresh_token_expires_at,
          scopes, connected_at, revoked_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NULL)
        ON DUPLICATE KEY UPDATE
          open_id = VALUES(open_id),
          union_id = VALUES(union_id),
          display_name = VALUES(display_name),
          username = VALUES(username),
          bio_description = VALUES(bio_description),
          avatar_url = VALUES(avatar_url),
          avatar_large_url = VALUES(avatar_large_url),
          avatar_url_100 = VALUES(avatar_url_100),
          profile_deep_link = VALUES(profile_deep_link),
          profile_web_link = VALUES(profile_web_link),
          is_verified = VALUES(is_verified),
          access_token = VALUES(access_token),
          refresh_token = VALUES(refresh_token),
          access_token_expires_at = VALUES(access_token_expires_at),
          refresh_token_expires_at = VALUES(refresh_token_expires_at),
          scopes = VALUES(scopes),
          updated_at = NOW(),
          revoked_at = NULL`,
        [
          data.codigo,
          data.open_id,
          data.union_id || null,
          data.display_name || 'Conta TikTok',
          data.username || null,
          data.bio_description || null,
          data.avatar_url || null,
          data.avatar_large_url || null,
          data.avatar_url_100 || null,
          data.profile_deep_link || null,
          data.profile_web_link || null,
          data.is_verified ? 1 : 0,
          encAccessToken,
          encRefreshToken,
          accessExpiresAt,
          refreshExpiresAt,
          scopes,
        ]
      );
      return true;
    } catch (err) {
      console.error('[MySQL TikTok Connection Save Error]:', err);
    }
  }

  // Fallback to memory store if DB is offline/unavailable
  memoryConnectionsMap.set(data.codigo, {
    codigo: data.codigo,
    open_id: data.open_id,
    union_id: data.union_id,
    display_name: data.display_name || 'Conta TikTok',
    username: data.username,
    bio_description: data.bio_description,
    avatar_url: data.avatar_url || '',
    avatar_large_url: data.avatar_large_url,
    avatar_url_100: data.avatar_url_100,
    profile_deep_link: data.profile_deep_link,
    profile_web_link: data.profile_web_link,
    is_verified: Boolean(data.is_verified),
    access_token: encAccessToken,
    refresh_token: encRefreshToken || undefined,
    access_token_expires_at: accessExpiresAt || undefined,
    refresh_token_expires_at: refreshExpiresAt || undefined,
    scopes,
    connected_at: new Date(),
    updated_at: new Date(),
    revoked_at: null,
  });

  return true;
}

export interface SafeTikTokConnection {
  connected: boolean;
  display_name?: string;
  username?: string;
  bio_description?: string;
  avatar_url?: string;
  avatar_large_url?: string;
  profile_deep_link?: string;
  profile_web_link?: string;
  is_verified?: boolean;
  open_id_masked?: string;
  scopes?: string;
  connected_at?: string;
  updated_at?: string;
  environment?: 'production' | 'sandbox';
}

/**
 * Gets safe connection info for frontend display.
 * NEVER returns access_token or refresh_token.
 */
export async function getSafeTikTokConnection(codigo: string): Promise<SafeTikTokConnection> {
  if (!codigo) {
    return { connected: false };
  }

  if (isDatabaseConfigured()) {
    try {
      await ensureTikTokConnectionsTable();
      const [rows]: any = await db.query(
        `SELECT open_id, display_name, username, bio_description, avatar_url, avatar_large_url,
                profile_deep_link, profile_web_link, is_verified, scopes, connected_at, updated_at, revoked_at
         FROM tiktok_connections
         WHERE codigo = ? AND revoked_at IS NULL
         LIMIT 1`,
        [codigo]
      );

      if (Array.isArray(rows) && rows.length > 0) {
        const conn = rows[0];
        const openId = String(conn.open_id || '');
        const maskedOpenId = openId.length > 8
          ? `${openId.slice(0, 4)}...${openId.slice(-4)}`
          : openId;

        return {
          connected: true,
          display_name: conn.display_name || 'Conta TikTok',
          username: conn.username || undefined,
          bio_description: conn.bio_description || undefined,
          avatar_url: conn.avatar_url || '',
          avatar_large_url: conn.avatar_large_url || undefined,
          profile_deep_link: conn.profile_deep_link || undefined,
          profile_web_link: conn.profile_web_link || (conn.username ? `https://www.tiktok.com/@${conn.username}` : undefined),
          is_verified: Boolean(conn.is_verified),
          open_id_masked: maskedOpenId,
          scopes: conn.scopes || 'user.info.basic',
          connected_at: conn.connected_at ? new Date(conn.connected_at).toISOString() : undefined,
          updated_at: conn.updated_at ? new Date(conn.updated_at).toISOString() : undefined,
          environment: 'production',
        };
      }
    } catch (err) {
      console.error('[MySQL TikTok Connection Fetch Error]:', err);
    }
  }

  // Memory fallback check
  const memConn = memoryConnectionsMap.get(codigo);
  if (memConn && !memConn.revoked_at) {
    const openId = String(memConn.open_id || '');
    const maskedOpenId = openId.length > 8
      ? `${openId.slice(0, 4)}...${openId.slice(-4)}`
      : openId;

    return {
      connected: true,
      display_name: memConn.display_name || 'Conta TikTok',
      username: memConn.username,
      bio_description: memConn.bio_description,
      avatar_url: memConn.avatar_url || '',
      avatar_large_url: memConn.avatar_large_url,
      profile_deep_link: memConn.profile_deep_link,
      profile_web_link: memConn.profile_web_link || (memConn.username ? `https://www.tiktok.com/@${memConn.username}` : undefined),
      is_verified: Boolean(memConn.is_verified),
      open_id_masked: maskedOpenId,
      scopes: memConn.scopes || 'user.info.basic',
      connected_at: memConn.connected_at.toISOString(),
      updated_at: memConn.updated_at?.toISOString(),
      environment: 'production',
    };
  }

  return { connected: false };
}

/**
 * Refreshes TikTok access token using saved refresh token.
 * Stores new decrypted access token and updated expiry in MySQL.
 */
export async function refreshTikTokAccessToken(codigo: string): Promise<string | null> {
  if (!codigo) return null;

  let encRefreshToken: string | null = null;
  let currentOpenId = '';

  if (isDatabaseConfigured()) {
    try {
      await ensureTikTokConnectionsTable();
      const [rows]: any = await db.query(
        `SELECT open_id, refresh_token, revoked_at FROM tiktok_connections WHERE codigo = ? AND revoked_at IS NULL LIMIT 1`,
        [codigo]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        encRefreshToken = rows[0].refresh_token;
        currentOpenId = rows[0].open_id;
      }
    } catch (err) {
      console.error('[MySQL refreshTikTokAccessToken lookup error]:', err);
    }
  } else {
    const mem = memoryConnectionsMap.get(codigo);
    if (mem && !mem.revoked_at) {
      encRefreshToken = mem.refresh_token || null;
      currentOpenId = mem.open_id;
    }
  }

  if (!encRefreshToken) {
    console.warn('[TikTok Token Refresh]: No refresh token found for code:', codigo);
    return null;
  }

  const plainRefreshToken = decryptToken(encRefreshToken);
  if (!plainRefreshToken) {
    console.warn('[TikTok Token Refresh]: Failed to decrypt refresh token for code:', codigo);
    return null;
  }

  const clientKey = getTikTokClientKey();
  const clientSecret = getTikTokClientSecret();
  const apiBaseUrl = getTikTokApiBaseUrl();
  const tokenUrl = `${apiBaseUrl}/v2/oauth/token/`;

  try {
    const bodyParams = new URLSearchParams();
    bodyParams.append('client_key', clientKey);
    bodyParams.append('client_secret', clientSecret);
    bodyParams.append('grant_type', 'refresh_token');
    bodyParams.append('refresh_token', plainRefreshToken);

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      },
      body: bodyParams.toString(),
    });

    const rawText = await res.text();
    let json: any = {};
    try {
      json = JSON.parse(rawText);
    } catch {
      return null;
    }

    const payload = json.data || json;
    if (!res.ok || !payload.access_token) {
      console.warn('[TikTok Token Refresh Failed]: HTTP', res.status, json?.error?.message || json?.error || json?.message || 'Unknown error');
      return null;
    }

    const newAccessToken = payload.access_token;
    const newRefreshToken = payload.refresh_token || plainRefreshToken;
    const expiresIn = payload.expires_in;
    const refreshExpiresIn = payload.refresh_expires_in;
    const scope = payload.scope;

    const encNewAccess = encryptToken(newAccessToken);
    const encNewRefresh = encryptToken(newRefreshToken);

    if (!encNewAccess || !encNewRefresh) {
      console.error('[TikTok Token Refresh Error]: Encryption failed when updating tokens.');
      return null;
    }
    const now = new Date();
    const accessExpiresAt = expiresIn ? new Date(now.getTime() + expiresIn * 1000) : null;
    const refreshExpiresAt = refreshExpiresIn ? new Date(now.getTime() + refreshExpiresIn * 1000) : null;

    if (isDatabaseConfigured()) {
      await db.query(
        `UPDATE tiktok_connections
         SET access_token = ?,
             refresh_token = ?,
             access_token_expires_at = ?,
             refresh_token_expires_at = ?,
             scopes = COALESCE(?, scopes),
             updated_at = NOW()
         WHERE codigo = ?`,
        [encNewAccess, encNewRefresh, accessExpiresAt, refreshExpiresAt, scope || null, codigo]
      );
    }

    const mem = memoryConnectionsMap.get(codigo);
    if (mem) {
      mem.access_token = encNewAccess;
      mem.refresh_token = encNewRefresh;
      mem.access_token_expires_at = accessExpiresAt || undefined;
      mem.refresh_token_expires_at = refreshExpiresAt || undefined;
      if (scope) mem.scopes = scope;
      mem.updated_at = new Date();
    }

    return newAccessToken;
  } catch (err) {
    console.error('[TikTok Token Refresh Exception]:', err);
    return null;
  }
}

/**
 * Synchronizes/refreshes TikTok user profile with TikTok API v2 without requiring re-auth
 * if current token or refresh token is valid.
 */
export async function syncTikTokProfile(codigo: string): Promise<{ success: boolean; connection?: SafeTikTokConnection; error?: string }> {
  if (!codigo) return { success: false, error: 'MISSING_CODE' };

  let currentAccessToken: string | null = null;
  let accessExpiresAt: Date | null = null;

  if (isDatabaseConfigured()) {
    try {
      await ensureTikTokConnectionsTable();
      const [rows]: any = await db.query(
        `SELECT access_token, access_token_expires_at, revoked_at FROM tiktok_connections WHERE codigo = ? AND revoked_at IS NULL LIMIT 1`,
        [codigo]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        currentAccessToken = decryptToken(rows[0].access_token);
        if (rows[0].access_token_expires_at) {
          accessExpiresAt = new Date(rows[0].access_token_expires_at);
        }
      }
    } catch (err) {
      console.error('[MySQL syncTikTokProfile error]:', err);
    }
  } else {
    const mem = memoryConnectionsMap.get(codigo);
    if (mem && !mem.revoked_at) {
      currentAccessToken = decryptToken(mem.access_token);
      accessExpiresAt = mem.access_token_expires_at || null;
    }
  }

  if (!currentAccessToken) {
    return { success: false, error: 'NOT_CONNECTED' };
  }

  // Check if token is expired (or expires within 2 minutes)
  const isExpired = accessExpiresAt && accessExpiresAt.getTime() - Date.now() < 2 * 60 * 1000;
  if (isExpired) {
    const refreshedToken = await refreshTikTokAccessToken(codigo);
    if (refreshedToken) {
      currentAccessToken = refreshedToken;
    }
  }

  // Fetch updated profile
  let profile = await fetchTikTokUserProfile(currentAccessToken);
  if (!profile) {
    // If failed, try refreshing token once more and retry
    const refreshedToken = await refreshTikTokAccessToken(codigo);
    if (refreshedToken) {
      currentAccessToken = refreshedToken;
      profile = await fetchTikTokUserProfile(currentAccessToken);
    }
  }

  if (!profile) {
    return { success: false, error: 'PROFILE_FETCH_FAILED' };
  }

  // Update profile details in database
  if (isDatabaseConfigured()) {
    try {
      await db.query(
        `UPDATE tiktok_connections
         SET display_name = COALESCE(?, display_name),
             username = COALESCE(?, username),
             bio_description = COALESCE(?, bio_description),
             avatar_url = COALESCE(?, avatar_url),
             avatar_large_url = COALESCE(?, avatar_large_url),
             avatar_url_100 = COALESCE(?, avatar_url_100),
             profile_deep_link = COALESCE(?, profile_deep_link),
             profile_web_link = COALESCE(?, profile_web_link),
             is_verified = ?,
             updated_at = NOW()
         WHERE codigo = ?`,
        [
          profile.display_name || null,
          profile.username || null,
          profile.bio_description || null,
          profile.avatar_url || null,
          profile.avatar_large_url || null,
          profile.avatar_url_100 || null,
          profile.profile_deep_link || null,
          profile.profile_web_link || null,
          profile.is_verified ? 1 : 0,
          codigo,
        ]
      );
    } catch (err) {
      console.error('[MySQL syncTikTokProfile update error]:', err);
    }
  }

  const mem = memoryConnectionsMap.get(codigo);
  if (mem) {
    if (profile.display_name) mem.display_name = profile.display_name;
    if (profile.username) mem.username = profile.username;
    if (profile.bio_description) mem.bio_description = profile.bio_description;
    if (profile.avatar_url) mem.avatar_url = profile.avatar_url;
    if (profile.avatar_large_url) mem.avatar_large_url = profile.avatar_large_url;
    if (profile.avatar_url_100) mem.avatar_url_100 = profile.avatar_url_100;
    if (profile.profile_deep_link) mem.profile_deep_link = profile.profile_deep_link;
    if (profile.profile_web_link) mem.profile_web_link = profile.profile_web_link;
    mem.is_verified = Boolean(profile.is_verified);
    mem.updated_at = new Date();
  }

  const safeConn = await getSafeTikTokConnection(codigo);
  return { success: true, connection: safeConn };
}

/**
 * Revokes / disconnects TikTok connection for a user.
 * 1. Fetches encrypted access_token for the active connection.
 * 2. Decrypts token using TIKTOK_TOKEN_ENCRYPTION_KEY (via decryptToken).
 * 3. Calls official TikTok Login Kit v2 revocation endpoint (https://open.tiktokapis.com/v2/oauth/revoke/).
 * 4. Never logs tokens or sensitive secrets.
 * 5. Regardless of external API response, updates local revoked_at timestamp in MySQL and memory store.
 * 6. Preserves history/profile/records without deleting rows.
 */
export async function revokeTikTokConnection(codigo: string): Promise<boolean> {
  if (!codigo) return false;

  const maskedCode =
    codigo.length > 6 ? `${codigo.slice(0, 3)}...${codigo.slice(-3)}` : '***';

  let encAccessToken: string | null = null;

  // 1. Retrieve encrypted token from database or memory store
  if (isDatabaseConfigured()) {
    try {
      await ensureTikTokConnectionsTable();
      const [rows]: any = await db.query(
        `SELECT access_token, refresh_token FROM tiktok_connections WHERE codigo = ? AND revoked_at IS NULL LIMIT 1`,
        [codigo]
      );
      if (Array.isArray(rows) && rows.length > 0 && rows[0].access_token) {
        encAccessToken = rows[0].access_token;
      }
    } catch (err) {
      console.error('[MySQL TikTok Revoke Query Error]:', err);
    }
  } else {
    const mem = memoryConnectionsMap.get(codigo);
    if (mem && !mem.revoked_at && mem.access_token) {
      encAccessToken = mem.access_token;
    }
  }

  // 2. Decrypt token using TIKTOK_TOKEN_ENCRYPTION_KEY
  const plainAccessToken = encAccessToken ? decryptToken(encAccessToken) : '';

  // 3. Call official TikTok v2 revocation endpoint if token is present
  let revokeAttempted = false;
  let revokeSuccess = false;
  let httpStatus: number | null = null;

  if (plainAccessToken) {
    revokeAttempted = true;
    const clientKey = getTikTokClientKey();
    const clientSecret = getTikTokClientSecret();
    const apiBaseUrl = getTikTokApiBaseUrl();
    const revokeUrl = `${apiBaseUrl}/v2/oauth/revoke/`;

    try {
      const bodyParams = new URLSearchParams();
      bodyParams.append('client_key', clientKey);
      bodyParams.append('client_secret', clientSecret);
      bodyParams.append('token', plainAccessToken);

      const res = await fetch(revokeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache',
        },
        body: bodyParams.toString(),
      });

      httpStatus = res.status;
      if (res.ok) {
        revokeSuccess = true;
      }
    } catch (err) {
      revokeSuccess = false;
    }

    console.log('[TikTok Revoke Summary]:', {
      'TikTok revoke attempted': revokeAttempted,
      'TikTok revoke success': revokeSuccess,
      'HTTP status': httpStatus,
      'codigo mascarado': maskedCode,
    });
  }

  // 4. Always apply local revocation in MySQL and memory fallback to prevent new local use
  if (isDatabaseConfigured()) {
    try {
      await ensureTikTokConnectionsTable();
      await db.query(
        `UPDATE tiktok_connections
         SET revoked_at = NOW(),
             updated_at = NOW()
         WHERE codigo = ?`,
        [codigo]
      );
    } catch (err) {
      console.error('[MySQL TikTok Connection Revoke Error]:', err);
    }
  }

  const memConn = memoryConnectionsMap.get(codigo);
  if (memConn) {
    memConn.revoked_at = new Date();
    memConn.updated_at = new Date();
  }

  return true;
}
