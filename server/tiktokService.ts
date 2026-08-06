import crypto from 'crypto';
import { db, isDatabaseConfigured, ensureTikTokConnectionsTable } from './database.js';

const ALGORITHM = 'aes-256-gcm';

// Encryption key derivation
function getEncryptionKey(): Buffer {
  const secretKey =
    process.env.TIKTOK_TOKEN_ENCRYPTION_KEY ||
    process.env.DB_PASSWORD ||
    'gzpro_tiktok_secure_encryption_key_2026';
  return crypto.createHash('sha256').update(secretKey).digest();
}

/**
 * Encrypt sensitive tokens before saving in database.
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt tokens retrieved from database.
 */
export function decryptToken(encryptedData: string): string {
  if (!encryptedData) return '';
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) return encryptedData;
    const [ivHex, authTagHex, encryptedTextHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedTextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[TikTok Encryption Error]: Failed to decrypt token', err);
    return '';
  }
}

// In-memory OAuth State & PKCE Cache (Expires after 10 minutes)
interface OAuthStateSession {
  codigo: string;
  codeVerifier: string;
  createdAt: number;
}

const oauthStateMap = new Map<string, OAuthStateSession>();

// Periodic cleanup of expired states
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
 */
export function createOAuthSession(codigo: string): {
  state: string;
  codeVerifier: string;
  codeChallenge: string;
} {
  const state = crypto.randomBytes(24).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  oauthStateMap.set(state, {
    codigo,
    codeVerifier,
    createdAt: Date.now(),
  });

  return { state, codeVerifier, codeChallenge };
}

/**
 * Validates and consumes the state token to prevent CSRF and state reuse.
 */
export function validateAndConsumeOAuthState(state: string): OAuthStateSession | null {
  if (!state) return null;
  const session = oauthStateMap.get(state);
  if (!session) return null;

  // Max 10 minutes lifespan
  if (Date.now() - session.createdAt > 10 * 60 * 1000) {
    oauthStateMap.delete(state);
    return null;
  }

  // Delete state after single use
  oauthStateMap.delete(state);
  return session;
}

// Fallback memory connections store if DB is offline
interface MemoryConnection {
  codigo: string;
  open_id: string;
  union_id?: string;
  display_name: string;
  avatar_url: string;
  access_token: string;
  refresh_token?: string;
  access_token_expires_at?: Date;
  refresh_token_expires_at?: Date;
  scopes: string;
  connected_at: Date;
  revoked_at?: Date | null;
}

const memoryConnectionsMap = new Map<string, MemoryConnection>();

/**
 * Saves or updates a TikTok connection for a student code.
 */
export async function saveTikTokConnection(data: {
  codigo: string;
  open_id: string;
  union_id?: string;
  display_name?: string;
  avatar_url?: string;
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_expires_in?: number;
  scope?: string;
}): Promise<boolean> {
  const encAccessToken = encryptToken(data.access_token);
  const encRefreshToken = data.refresh_token ? encryptToken(data.refresh_token) : null;

  const now = new Date();
  const accessExpiresAt = data.expires_in
    ? new Date(now.getTime() + data.expires_in * 1000)
    : null;
  const refreshExpiresAt = data.refresh_expires_in
    ? new Date(now.getTime() + data.refresh_expires_in * 1000)
    : null;

  const scopes = data.scope || 'user.info.basic';

  if (isDatabaseConfigured()) {
    try {
      await ensureTikTokConnectionsTable();
      await db.query(
        `INSERT INTO tiktok_connections (
          codigo, open_id, union_id, display_name, avatar_url,
          access_token, refresh_token, access_token_expires_at, refresh_token_expires_at,
          scopes, connected_at, revoked_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NULL)
        ON DUPLICATE KEY UPDATE
          open_id = VALUES(open_id),
          union_id = VALUES(union_id),
          display_name = VALUES(display_name),
          avatar_url = VALUES(avatar_url),
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
          data.avatar_url || null,
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
    avatar_url: data.avatar_url || '',
    access_token: encAccessToken,
    refresh_token: encRefreshToken || undefined,
    access_token_expires_at: accessExpiresAt || undefined,
    refresh_token_expires_at: refreshExpiresAt || undefined,
    scopes,
    connected_at: new Date(),
    revoked_at: null,
  });

  return true;
}

/**
 * Gets safe connection info for frontend display.
 * NEVER returns access_token or refresh_token.
 */
export async function getSafeTikTokConnection(codigo: string): Promise<{
  connected: boolean;
  display_name?: string;
  avatar_url?: string;
  open_id_masked?: string;
  scopes?: string;
  connected_at?: string;
}> {
  if (!codigo) {
    return { connected: false };
  }

  if (isDatabaseConfigured()) {
    try {
      await ensureTikTokConnectionsTable();
      const [rows]: any = await db.query(
        `SELECT open_id, display_name, avatar_url, scopes, connected_at, revoked_at
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
          avatar_url: conn.avatar_url || '',
          open_id_masked: maskedOpenId,
          scopes: conn.scopes || 'user.info.basic',
          connected_at: conn.connected_at ? new Date(conn.connected_at).toISOString() : undefined,
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
      avatar_url: memConn.avatar_url || '',
      open_id_masked: maskedOpenId,
      scopes: memConn.scopes || 'user.info.basic',
      connected_at: memConn.connected_at.toISOString(),
    };
  }

  return { connected: false };
}

/**
 * Revokes / disconnects TikTok connection for a user.
 */
export async function revokeTikTokConnection(codigo: string): Promise<boolean> {
  if (!codigo) return false;

  if (isDatabaseConfigured()) {
    try {
      await ensureTikTokConnectionsTable();
      await db.query(
        `UPDATE tiktok_connections
         SET revoked_at = NOW()
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
  }

  return true;
}
