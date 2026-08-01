import express from 'express';
import fs from 'fs';
import path from 'path';
import { db, isDatabaseConfigured, ensureSessionsTable, ensureProfilesTable, ensureAdminAccessTable, ensureCodigosAcessoTable, ensureAgentInteractionsTable, ensureProgressTable } from './database.js';
import { normalizeAccessCode, lookupKeyType, STUDENT_KEYS, MASTER_KEYS } from './authKeys.js';
import { maskStudentCode } from './rankingService.js';

export const PRESENCE_VERSION = '2026-08-01-final-disconnect-v1';

export function isMasterKey(rawCode: unknown): boolean {
  const norm = normalizeAccessCode(rawCode);
  if (!norm) return false;
  return MASTER_KEYS.has(norm) || lookupKeyType(norm) === 'MASTER';
}

export async function ensurePicoTable() {
  if (!isDatabaseConfigured()) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS pico_simultaneo_diario (
        data_dia DATE PRIMARY KEY,
        pico INT NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.warn('[ensurePicoTable Warning]:', err);
  }
}

export function resolveStudentCode(targetInput: unknown): string | null {
  const norm = normalizeAccessCode(targetInput);
  if (!norm) return null;

  if (STUDENT_KEYS.has(norm)) {
    return norm;
  }

  // Handle masked keys like GZ-****-SRGB
  for (const k of STUDENT_KEYS) {
    if (maskKeyForAdmin(k) === norm || (norm.includes('****') && k.endsWith(norm.split('****')[1]))) {
      return k;
    }
  }

  return null;
}

export function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const rawStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const firstIp = rawStr.split(',')[0]?.trim();
    if (firstIp && firstIp !== '::1' && firstIp !== '127.0.0.1') {
      return firstIp;
    }
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string' && realIp.trim().length > 0) {
    return realIp.trim();
  }

  const socketIp = req.socket?.remoteAddress;
  if (socketIp) {
    if (socketIp === '::1' || socketIp === '::ffff:127.0.0.1') return '127.0.0.1';
    return socketIp.replace(/^::ffff:/, '');
  }

  return '187.123.45.20';
}

export function maskIpAddress(ip: string | null | undefined): string {
  if (!ip) return '187.***.***.20';
  const clean = String(ip).trim();
  const parts = clean.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.***.***.${parts[3]}`;
  }
  if (clean.includes(':')) {
    const segs = clean.split(':');
    return `${segs[0]}:****:****:${segs[segs.length - 1]}`;
  }
  return '187.***.***.20';
}

export function maskKeyForAdmin(key: string | null | undefined): string {
  if (!key) return 'GZ-****-0000';
  const norm = normalizeAccessCode(key);
  if (norm.startsWith('GZ-')) {
    const parts = norm.split('-');
    if (parts.length === 3) {
      return `GZ-****-${parts[2]}`;
    }
  }
  if (norm.length > 8) {
    return `${norm.slice(0, 3)}-****-${norm.slice(-4)}`;
  }
  return `${norm.slice(0, 2)}****${norm.slice(-2)}`;
}

export function parseUserAgent(ua: string | undefined): {
  deviceType: string;
  operatingSystem: string;
  browserName: string;
} {
  if (!ua || typeof ua !== 'string' || ua.trim() === '') {
    return { deviceType: 'Desconhecido', operatingSystem: 'Desconhecido', browserName: 'Desconhecido' };
  }

  let deviceType = 'Desktop';
  if (/mobile|iphone|ipod|android.*mobile/i.test(ua)) deviceType = 'Mobile';
  else if (/tablet|ipad|android(?!.*mobile)/i.test(ua)) deviceType = 'Tablet';

  let operatingSystem = 'Desconhecido';
  if (/windows/i.test(ua)) operatingSystem = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) operatingSystem = 'macOS';
  else if (/android/i.test(ua)) operatingSystem = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) operatingSystem = 'iOS';
  else if (/linux/i.test(ua)) operatingSystem = 'Linux';

  let browserName = 'Desconhecido';
  if (/edg/i.test(ua)) browserName = 'Edge';
  else if (/firefox/i.test(ua)) browserName = 'Firefox';
  else if (/opera|opr/i.test(ua)) browserName = 'Opera';
  else if (/chrome|crios/i.test(ua)) browserName = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browserName = 'Safari';

  return { deviceType, operatingSystem, browserName };
}

export function formatConnectedTime(startDate: Date | null): string {
  if (!startDate || isNaN(startDate.getTime())) return 'Agora';
  const diffMs = Date.now() - startDate.getTime();
  if (diffMs < 60000) return 'Menos de 1m';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${remMinutes}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

// Key Access Status Info Interface
export interface KeyStatusInfo {
  keyId?: number;
  accessStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  reason?: string;
  suspensionReason?: string;
  suspendedAt?: string;
  suspendedBy?: string;
  bannedReason?: string;
  bannedAt?: string;
  bannedBy?: string;
  reactivatedAt?: string;
  reactivatedBy?: string;
  lastAdminAction?: string;
  lastAdminActionAt?: string;
}

// Memory key status fallback store
export const memoryKeyStatusMap = new Map<string, KeyStatusInfo>();

// Audit log entry interface
export interface AuditLogEntry {
  id: number;
  targetAccessKeyId?: number;
  targetMaskedKey: string;
  actionType: 'DISCONNECT' | 'SUSPEND' | 'REACTIVATE' | 'BAN' | 'DISCONNECT_ALL_SESSIONS';
  reason?: string;
  adminIdentifier: string;
  ipAddress: string;
  createdAt: string;
}

export const memoryAuditLogs: AuditLogEntry[] = [];
let auditIdCounter = 1;

const STORE_DIR = path.join(process.cwd(), '.data');
const KEY_STATUS_FILE = path.join(STORE_DIR, 'key_status_store.json');
const AUDIT_LOGS_FILE = path.join(STORE_DIR, 'audit_logs_store.json');

export function loadKeyStatusStore(): void {
  try {
    if (fs.existsSync(KEY_STATUS_FILE)) {
      const raw = fs.readFileSync(KEY_STATUS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (typeof data === 'object' && data !== null) {
        for (const [key, val] of Object.entries(data)) {
          if (val && typeof val === 'object') {
            memoryKeyStatusMap.set(key, val as KeyStatusInfo);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[KeyStatusStore] Failed to load key status from disk:', err);
  }

  try {
    if (fs.existsSync(AUDIT_LOGS_FILE)) {
      const raw = fs.readFileSync(AUDIT_LOGS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        memoryAuditLogs.length = 0;
        memoryAuditLogs.push(...data);
        if (memoryAuditLogs.length > 0) {
          const maxId = Math.max(...memoryAuditLogs.map(l => l.id || 0));
          auditIdCounter = maxId + 1;
        }
      }
    }
  } catch (err) {
    console.warn('[AuditLogsStore] Failed to load audit logs from disk:', err);
  }
}

export function saveKeyStatusStore(): void {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    const obj: Record<string, KeyStatusInfo> = {};
    for (const [k, v] of memoryKeyStatusMap.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(KEY_STATUS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[KeyStatusStore] Failed to save key status to disk:', err);
  }
}

export function saveAuditLogsStore(): void {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(memoryAuditLogs, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[AuditLogsStore] Failed to save audit logs to disk:', err);
  }
}

// Load persisted status immediately on module initialization
loadKeyStatusStore();

export async function recordAdminAuditAction(
  targetKey: string,
  actionType: 'DISCONNECT' | 'SUSPEND' | 'REACTIVATE' | 'BAN' | 'DISCONNECT_ALL_SESSIONS',
  reason?: string,
  ipAddress?: string
): Promise<void> {
  const maskedKey = targetKey === 'TODAS_AS_SESSOES' ? 'TODAS AS SESSÕES' : maskKeyForAdmin(targetKey);
  const adminId = 'SESSION_MASTER';
  const nowIso = new Date().toISOString();

  let targetKeyId: number | null = null;

  if (isDatabaseConfigured()) {
    try {
      await ensureCodigosAcessoTable();
      const [keyRows]: any = await db.query(
        `SELECT id FROM codigos_acesso WHERE codigo = ? LIMIT 1`,
        [targetKey]
      );
      if (Array.isArray(keyRows) && keyRows.length > 0) {
        targetKeyId = keyRows[0].id;
      }
    } catch (e) {
      console.warn('[Audit Action Find Key ID Error]:', e);
    }
  }

  // Always log to memory (storing keyId, maskedKey, NEVER raw key or master key)
  memoryAuditLogs.unshift({
    id: auditIdCounter++,
    targetAccessKeyId: targetKeyId || undefined,
    targetMaskedKey: maskedKey,
    actionType,
    reason: reason || undefined,
    adminIdentifier: adminId,
    ipAddress: ipAddress || '127.0.0.1',
    createdAt: nowIso,
  });
  saveAuditLogsStore();

  if (isDatabaseConfigured()) {
    try {
      await ensureAdminAccessTable();
      await db.query(
        `INSERT INTO admin_access_actions (target_access_key_id, target_masked_key, action_type, reason, admin_identifier, ip_address)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [targetKeyId, maskedKey, actionType, reason || null, adminId, ipAddress || '127.0.0.1']
      );
    } catch (err) {
      console.warn('[Audit Action DB Log Error]:', err);
    }
  }
}

/**
 * Get permanent key status helper from codigos_acesso
 */
export async function getKeyAccessStatus(studentCode: string): Promise<KeyStatusInfo> {
  const norm = normalizeAccessCode(studentCode);

  if (isDatabaseConfigured()) {
    try {
      await ensureCodigosAcessoTable();
      const [rows]: any = await db.query(
        `SELECT id, access_status, suspension_reason, suspended_at, suspended_by, banned_reason, banned_at, banned_by, reactivated_at, reactivated_by, last_admin_action, last_admin_action_at
         FROM codigos_acesso
         WHERE codigo = ?`,
        [norm]
      );

      if (Array.isArray(rows) && rows.length > 0 && rows[0].access_status) {
        const r = rows[0];
        const statusVal = String(r.access_status).toUpperCase();
        const finalStatus = (statusVal === 'SUSPENDED' || statusVal === 'BANNED') ? statusVal : 'ACTIVE';

        return {
          keyId: r.id,
          accessStatus: finalStatus as any,
          reason: r.suspension_reason || r.banned_reason || undefined,
          suspensionReason: r.suspension_reason || undefined,
          suspendedAt: r.suspended_at ? new Date(r.suspended_at).toISOString() : undefined,
          suspendedBy: r.suspended_by || undefined,
          bannedReason: r.banned_reason || undefined,
          bannedAt: r.banned_at ? new Date(r.banned_at).toISOString() : undefined,
          bannedBy: r.banned_by || undefined,
          reactivatedAt: r.reactivated_at ? new Date(r.reactivated_at).toISOString() : undefined,
          reactivatedBy: r.reactivated_by || undefined,
          lastAdminAction: r.last_admin_action || undefined,
          lastAdminActionAt: r.last_admin_action_at ? new Date(r.last_admin_action_at).toISOString() : undefined,
        };
      }
    } catch (err) {
      console.warn('[getKeyAccessStatus DB Error]:', err);
    }
  }

  // Memory fallback lookup
  const mem = memoryKeyStatusMap.get(norm);
  if (mem) return mem;

  return { accessStatus: 'ACTIVE' };
}

// Helper function to check key type (MySQL first, fallback to authKeys)
export async function checkCodeKeyType(cleanCode: string): Promise<'MASTER' | 'STUDENT' | 'INVALID'> {
  if (!cleanCode) return 'INVALID';
  const normalized = normalizeAccessCode(cleanCode);

  if (isDatabaseConfigured()) {
    try {
      // 1. Check chaves_mestras in Hostinger MySQL
      const [masterRows]: any = await db.query(
        'SELECT id FROM chaves_mestras WHERE UPPER(TRIM(codigo)) = ? AND ativo = 1 LIMIT 1',
        [normalized]
      );
      if (Array.isArray(masterRows) && masterRows.length > 0) {
        return 'MASTER';
      }

      // 2. Check codigos_acesso in Hostinger MySQL
      const [studentRows]: any = await db.query(
        'SELECT id, codigo, usado, usuario_id FROM codigos_acesso WHERE UPPER(TRIM(codigo)) = ? LIMIT 1',
        [normalized]
      );
      if (Array.isArray(studentRows) && studentRows.length > 0) {
        return 'STUDENT';
      }
    } catch (err: any) {
      console.warn('[MySQL Lookup Error]:', err?.message || err?.code || 'Query failed');
    }
  }

  // Fallback to in-memory authKeys list
  return lookupKeyType(normalized);
}

// In-memory sessions store fallback for presence tracking when DB is offline
export interface MemorySession {
  codigo: string;
  sessionId: string;
  deviceId: string;
  currentPage: string;
  ipAddress: string;
  userAgent: string;
  deviceType: string;
  browserName: string;
  operatingSystem: string;
  startedAt: Date;
  lastHeartbeatAt: Date;
  status: 'online' | 'ausente' | 'offline';
  expiresAt?: Date;
}

export const memorySessionsMap = new Map<string, MemorySession>();

// In-memory daily peak tracking
let dailyPeakCount = 0;
let lastPeakResetDate = new Date().toDateString();

function checkPeakReset() {
  const today = new Date().toDateString();
  if (today !== lastPeakResetDate) {
    dailyPeakCount = 0;
    lastPeakResetDate = today;
  }
}

/**
 * Helper to verify MASTER authorization on admin presence routes
 */
export async function verifyMasterAccess(req: express.Request): Promise<boolean> {
  const code =
    req.headers['x-access-code'] ||
    req.headers['x-student-access-code'] ||
    req.headers['x-master-key'] ||
    req.headers['authorization']?.replace(/^Bearer\s+/i, '') ||
    req.body?.accessCode ||
    req.body?.accessKey ||
    req.query?.accessCode;

  const cleanCode = normalizeAccessCode(code);
  if (!cleanCode) return false;

  const keyType = await checkCodeKeyType(cleanCode);
  return keyType === 'MASTER';
}

/**
 * POST /api/presence/heartbeat
 * Heartbeat update for authenticated session
 */
export async function presenceHeartbeatHandler(req: express.Request, res: express.Response) {
  try {
    const studentCode =
      req.body?.accessCode ??
      req.body?.studentAccessCode ??
      req.body?.accessKey ??
      req.body?.code ??
      req.headers['x-access-code'] ??
      req.headers['x-student-access-code'];

    const sessionId = (req.headers['x-session-id'] as string) || (req.body && req.body.sessionId);
    const currentPage = req.body?.currentPage ?? req.body?.page ?? '';
    const rawUa = req.headers['user-agent'] || req.body?.userAgent || '';

    const cleanCode = normalizeAccessCode(studentCode);
    if (!cleanCode) {
      return res.status(400).json({
        error: 'ACCESS_CODE_REQUIRED',
        presenceVersion: PRESENCE_VERSION,
        message: 'Informe o código de acesso.',
      });
    }

    console.log('[HEARTBEAT RECEBIDO]', {
      codigo: cleanCode,
      sessionId,
      currentPage,
    });

    const keyType = await checkCodeKeyType(cleanCode);
    if (keyType === 'INVALID') {
      return res.status(401).json({
        error: 'INVALID_ACCESS_CODE',
        presenceVersion: PRESENCE_VERSION,
        message: 'O código informado é inválido.',
      });
    }

    // Master keys are exempt from session table persistence (Rule 3)
    if (keyType === 'MASTER') {
      return res.json({ status: 'ok', online: true, isMaster: true, role: 'mentor', presenceVersion: PRESENCE_VERSION });
    }

    // Check key status first (Suspended / Banned)
    const keyInfo = await getKeyAccessStatus(cleanCode);
    if (keyInfo.accessStatus === 'SUSPENDED') {
      memorySessionsMap.delete(cleanCode);
      return res.status(423).json({
        error: 'KEY_SUSPENDED',
        accessStatus: 'SUSPENDED',
        presenceVersion: PRESENCE_VERSION,
        title: 'Acesso temporariamente suspenso',
        message: 'Sua chave de acesso está temporariamente suspensa pelo Mentor. Entre em contato com o suporte caso tenha dúvidas.',
      });
    }
    if (keyInfo.accessStatus === 'BANNED') {
      memorySessionsMap.delete(cleanCode);
      return res.status(403).json({
        error: 'KEY_BANNED',
        presenceVersion: PRESENCE_VERSION,
        title: 'Acesso permanentemente bloqueado',
        message: 'Esta chave de acesso foi banida pelo Mentor e não pode mais ser utilizada. Caso acredite que isso ocorreu por engano, entre em contato com o suporte da Mentoria Geração Z Pro.',
      });
    }

    if (!sessionId) {
      return res.status(401).json({
        error: 'SESSION_REQUIRED',
        presenceVersion: PRESENCE_VERSION,
        message: 'Sessão inválida. Efetue login novamente.',
      });
    }

    const clientIp = getClientIp(req);
    const { deviceType, operatingSystem, browserName } = parseUserAgent(rawUa);

    let sessionValidated = false;

    if (isDatabaseConfigured()) {
      try {
        await ensureSessionsTable();

        const [rows]: any = await db.query(
          `SELECT active_session_id, expires_at, access_status FROM sessoes WHERE codigo = ? ORDER BY (CASE WHEN active_session_id IS NOT NULL AND expires_at > NOW() THEN 1 ELSE 0 END) DESC, last_heartbeat_at DESC LIMIT 1`,
          [cleanCode]
        );

        if (Array.isArray(rows) && rows.length > 0) {
          const r = rows[0];
          if (r.access_status === 'SUSPENDED') {
            memorySessionsMap.delete(cleanCode);
            return res.status(423).json({
              error: 'KEY_SUSPENDED',
              accessStatus: 'SUSPENDED',
              presenceVersion: PRESENCE_VERSION,
              title: 'Acesso temporariamente suspenso',
              message: 'Sua chave de acesso está temporariamente suspensa pelo Mentor. Entre em contato com o suporte caso tenha dúvidas.',
            });
          }
          if (r.access_status === 'BANNED') {
            memorySessionsMap.delete(cleanCode);
            return res.status(403).json({
              error: 'KEY_BANNED',
              presenceVersion: PRESENCE_VERSION,
              title: 'Acesso permanentemente bloqueado',
              message: 'Esta chave de acesso foi banida pelo Mentor e não pode mais ser utilizada. Caso acredite que isso ocorreu por engano, entre em contato com o suporte da Mentoria Geração Z Pro.',
            });
          }
          if (!r.active_session_id) {
            memorySessionsMap.delete(cleanCode);
            return res.status(401).json({
              error: 'ADMIN_DISCONNECTED',
              presenceVersion: PRESENCE_VERSION,
              message: 'Sua sessão foi encerrada pelo Mentor.',
            });
          }
          if (r.active_session_id !== sessionId) {
            memorySessionsMap.delete(cleanCode);
            return res.status(401).json({
              error: 'SESSION_EXPIRED',
              presenceVersion: PRESENCE_VERSION,
              message: 'Esta chave de acesso foi conectada em outro dispositivo. Efetue login novamente.',
            });
          }
          if (r.expires_at && new Date(r.expires_at).getTime() <= Date.now()) {
            memorySessionsMap.delete(cleanCode);
            return res.status(401).json({
              error: 'SESSION_EXPIRED',
              presenceVersion: PRESENCE_VERSION,
              message: 'Sessão de 30 dias expirada. Efetue login novamente.',
            });
          }
          sessionValidated = true;
        } else {
          // If session row does not exist in DB, treat as disconnected/invalidated
          memorySessionsMap.delete(cleanCode);
          return res.status(401).json({
            error: 'ADMIN_DISCONNECTED',
            presenceVersion: PRESENCE_VERSION,
            message: 'Sua sessão foi encerrada pelo Mentor.',
          });
        }

        if (sessionValidated) {
          await db.query(
            `UPDATE sessoes
             SET
               last_heartbeat_at = NOW(),
               expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY),
               is_online = 1,
               status = 'online',
               current_page = COALESCE(NULLIF(?, ''), current_page),
               ip_address = COALESCE(NULLIF(?, ''), ip_address),
               user_agent = COALESCE(NULLIF(?, ''), user_agent),
               device_type = CASE WHEN ? IS NOT NULL AND ? != '' AND ? != 'Desconhecido' THEN ? ELSE device_type END,
               browser_name = CASE WHEN ? IS NOT NULL AND ? != '' AND ? != 'Desconhecido' THEN ? ELSE browser_name END,
               operating_system = CASE WHEN ? IS NOT NULL AND ? != '' AND ? != 'Desconhecido' THEN ? ELSE operating_system END
             WHERE codigo = ?
             AND active_session_id = ?`,
            [
              currentPage,
              clientIp,
              rawUa,
              deviceType, deviceType, deviceType, deviceType,
              browserName, browserName, browserName, browserName,
              operatingSystem, operatingSystem, operatingSystem, operatingSystem,
              cleanCode,
              sessionId
            ]
          );
        }
      } catch (dbErr: any) {
        console.error('[Heartbeat DB Warning]', {
          message: dbErr?.message,
          code: dbErr?.code,
          errno: dbErr?.errno,
          sqlMessage: dbErr?.sqlMessage,
          sqlState: dbErr?.sqlState,
          stack: dbErr?.stack,
        });

        // In production with database configured, return HTTP 500 error on DB error instead of memory fallback
        return res.status(500).json({
          success: false,
          error: 'SESSION_DATABASE_ERROR',
          presenceVersion: PRESENCE_VERSION,
          message: 'Erro ao processar heartbeat no banco de dados.',
        });
      }
    }

    if (!sessionValidated) {
      // Memory check for fallback
      const memSession = memorySessionsMap.get(cleanCode);
      if (memSession) {
        if (memSession.sessionId !== sessionId) {
          return res.status(401).json({
            error: 'SESSION_EXPIRED',
            message: 'Esta chave de acesso foi conectada em outro dispositivo. Efetue login novamente.',
          });
        }
        if (memSession.expiresAt && memSession.expiresAt.getTime() < Date.now()) {
          memorySessionsMap.delete(cleanCode);
          return res.status(401).json({
            error: 'SESSION_EXPIRED',
            message: 'Sessão de 30 dias expirada. Efetue login novamente.',
          });
        }
      }
    }

    // Always update in-memory map for backup
    const now = new Date();
    const existing = memorySessionsMap.get(cleanCode);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const finalPageToSave = (currentPage && String(currentPage).trim() !== '') ? String(currentPage).trim() : (existing?.currentPage || 'TikTok 2K');

    memorySessionsMap.set(cleanCode, {
      codigo: cleanCode,
      sessionId,
      deviceId: existing?.deviceId || `device-${sessionId.slice(0, 8)}`,
      currentPage: finalPageToSave,
      ipAddress: clientIp,
      userAgent: rawUa,
      deviceType,
      browserName,
      operatingSystem,
      startedAt: existing?.startedAt || now,
      lastHeartbeatAt: now,
      status: 'online',
      expiresAt,
    });

    return res.json({
      status: 'ok',
      online: true,
      presenceVersion: PRESENCE_VERSION,
      lastHeartbeatAt: now.toISOString(),
    });
  } catch (err: any) {
    console.error('[Presence Heartbeat Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SESSION_DATABASE_ERROR',
      message: 'Erro no servidor de presença.',
    });
  }
}

/**
 * POST /api/presence/logout
 * Marks session as logged out / offline
 */
export async function presenceLogoutHandler(req: express.Request, res: express.Response) {
  try {
    const studentCode =
      req.body?.accessCode ??
      req.body?.studentAccessCode ??
      req.body?.accessKey ??
      req.body?.code ??
      req.headers['x-access-code'] ??
      req.headers['x-student-access-code'];

    const cleanCode = normalizeAccessCode(studentCode);

    if (cleanCode && isDatabaseConfigured()) {
      await ensureSessionsTable();
      await db.query(
        `UPDATE sessoes
         SET
           active_session_id = NULL,
           device_id = NULL,
           is_online = 0,
           status = 'offline',
           logout_at = NOW(),
           disconnected_at = NOW(),
           disconnect_source = 'STUDENT_LOGOUT'
         WHERE codigo = ?`,
        [cleanCode]
      );
    }

    if (cleanCode) {
      memorySessionsMap.delete(cleanCode);
    }

    return res.json({ status: 'unbound', message: 'Sessão encerrada com sucesso.' });
  } catch (err: any) {
    console.error('[Presence Logout Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SESSION_DATABASE_ERROR',
      message: 'Erro ao encerrar sessão.',
    });
  }
}

export interface MemoryAgentInteraction {
  codigo: string;
  agentId: string;
  agentName: string;
  category: string;
  createdAt: Date;
}

export const memoryAgentInteractions: MemoryAgentInteraction[] = [];

export async function recordAgentInteraction(
  studentCode: string | undefined,
  agentId: string,
  agentName: string,
  category?: string
) {
  const norm = normalizeAccessCode(studentCode) || 'ANONYMOUS';
  const cleanCategory = category || 'Geral';
  const now = new Date();

  memoryAgentInteractions.unshift({
    codigo: norm,
    agentId,
    agentName,
    category: cleanCategory,
    createdAt: now,
  });

  if (isDatabaseConfigured()) {
    try {
      await ensureAgentInteractionsTable();
      await db.query(
        `INSERT INTO interacoes_agentes (codigo, agent_id, agent_name, category, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [norm, agentId, agentName, cleanCategory]
      );
    } catch (err) {
      console.warn('[recordAgentInteraction DB Warning]:', err);
    }
  }
}

/**
 * Central Authority for Presence Calculation
 */
export async function getCentralPresenceData() {
  const usersMapByCode = new Map<string, any>();
  const nowMs = Date.now();
  let totalLicensesCount = 0;

  if (isDatabaseConfigured()) {
    try {
      await ensureCodigosAcessoTable();
      await ensureSessionsTable();
      await ensureProfilesTable();

      // Total count of licenses registered in Hostinger MySQL
      const [countRows]: any = await db.query(`SELECT COUNT(*) AS total FROM codigos_acesso`);
      if (Array.isArray(countRows) && countRows.length > 0) {
        totalLicensesCount = Number(countRows[0].total) || 0;
      }

      // ONLY QUERY USERS WHO HAVE RECORDED SESSIONS IN sessoes TABLE
      const query = `
        SELECT
          s.codigo,
          s.active_session_id,
          s.expires_at,
          s.current_page,
          s.ip_address,
          s.user_agent,
          s.device_type,
          s.browser_name,
          s.operating_system,
          s.session_started_at,
          s.login_at,
          s.logout_at,
          s.disconnected_at,
          s.disconnect_source,
          s.last_heartbeat_at,
          s.is_online,
          s.status,
          s.id AS session_id,
          ca.id AS key_id,
          ca.access_status,
          ca.suspension_reason,
          ca.suspended_at,
          ca.suspended_by,
          ca.banned_reason,
          ca.banned_at,
          ca.banned_by,
          ca.reactivated_at,
          ca.reactivated_by,
          ca.last_admin_action,
          ca.last_admin_action_at,
          pf.nome_usuario,
          pf.avatar
        FROM sessoes s
        LEFT JOIN codigos_acesso ca ON s.codigo = ca.codigo
        LEFT JOIN perfis_alunos pf ON s.codigo = pf.codigo
        ORDER BY
          (CASE WHEN s.active_session_id IS NOT NULL AND s.expires_at > NOW() THEN 1 ELSE 0 END) DESC,
          s.last_heartbeat_at DESC,
          s.id DESC
      `;

      const [rows]: any = await db.query(query);

      if (Array.isArray(rows)) {
        for (const r of rows) {
          if (!r.codigo || isMasterKey(r.codigo)) continue; // Master keys are NEVER counted as students

          const normCode = normalizeAccessCode(r.codigo);
          if (!normCode || usersMapByCode.has(normCode)) continue; // Keep only canonical (first) row per code!

          const memSession = memorySessionsMap.get(normCode);
          let lastHbMs = r.last_heartbeat_at ? new Date(r.last_heartbeat_at).getTime() : 0;
          if (memSession && memSession.lastHeartbeatAt) {
            const memHbMs = memSession.lastHeartbeatAt.getTime();
            if (memHbMs > lastHbMs) {
              lastHbMs = memHbMs;
            }
          }

          const secondsSinceHb = lastHbMs > 0 ? (nowMs - lastHbMs) / 1000 : 999999;
          const accStat = (r.access_status || 'ACTIVE').toUpperCase();

          let calculatedPresence: 'Online' | 'Ausente' | 'Offline' = 'Offline';
          if (accStat === 'ACTIVE') {
            if (secondsSinceHb <= 90) {
              calculatedPresence = 'Online';
            } else if (secondsSinceHb <= 3600) {
              calculatedPresence = 'Ausente';
            } else {
              calculatedPresence = 'Offline';
            }
          }

          const entryDate = r.login_at || r.session_started_at
            ? new Date(r.login_at || r.session_started_at)
            : (memSession ? memSession.startedAt : null);

          const { deviceType, operatingSystem, browserName } = parseUserAgent(r.user_agent || memSession?.userAgent);

          const finalOs = (r.operating_system && r.operating_system !== 'Desconhecido')
            ? r.operating_system
            : (memSession?.operatingSystem || operatingSystem);

          const finalBrowser = (r.browser_name && r.browser_name !== 'Desconhecido')
            ? r.browser_name
            : (memSession?.browserName || browserName);

          const devStr = `${finalOs} • ${finalBrowser}`;

          const isExpiresAtFuture = r.expires_at
            ? new Date(r.expires_at).getTime() > Date.now()
            : (memSession?.expiresAt ? memSession.expiresAt.getTime() > Date.now() : false);

          const hasActiveSession = Boolean((r.active_session_id || memSession?.sessionId) && isExpiresAtFuture);

          let keyIdNum = r.key_id ? Number(r.key_id) : null;
          if (!keyIdNum && isDatabaseConfigured()) {
            try {
              await db.query(`INSERT IGNORE INTO codigos_acesso (codigo) VALUES (?)`, [normCode]);
              const [kRows]: any = await db.query(`SELECT id FROM codigos_acesso WHERE codigo = ? LIMIT 1`, [normCode]);
              if (Array.isArray(kRows) && kRows.length > 0) {
                keyIdNum = Number(kRows[0].id);
              }
            } catch (e) {}
          }
          const sessIdNum = r.session_id ? Number(r.session_id) : null;

          usersMapByCode.set(normCode, {
            accessKeyId: keyIdNum || null,
            sessionRecordId: sessIdNum || null,
            id: keyIdNum || sessIdNum || null,
            _fullCode: normCode,
            username: r.nome_usuario || `Aluno ${maskStudentCode(normCode)}`,
            avatar: r.avatar || null,
            maskedKey: maskKeyForAdmin(normCode),
            status: calculatedPresence,
            presenceStatus: calculatedPresence,
            hasActiveSession,
            accessStatus: accStat as 'ACTIVE' | 'SUSPENDED' | 'BANNED',
            suspensionReason: r.suspension_reason || null,
            suspendedAt: r.suspended_at ? new Date(r.suspended_at).toISOString() : null,
            suspendedBy: r.suspended_by || null,
            bannedReason: r.banned_reason || null,
            bannedAt: r.banned_at ? new Date(r.banned_at).toISOString() : null,
            bannedBy: r.banned_by || null,
            reactivatedAt: r.reactivated_at ? new Date(r.reactivated_at).toISOString() : null,
            reactivatedBy: r.reactivated_by || null,
            lastAdminAction: r.last_admin_action || null,
            lastAdminActionAt: r.last_admin_action_at ? new Date(r.last_admin_action_at).toISOString() : null,
            currentPage: r.current_page || memSession?.currentPage || 'TikTok 2K',
            deviceType: r.device_type || memSession?.deviceType || deviceType,
            operatingSystem: r.operating_system || memSession?.operatingSystem || operatingSystem,
            browserName: r.browser_name || memSession?.browserName || browserName,
            device: devStr,
            maskedIp: maskIpAddress(r.ip_address || memSession?.ipAddress),
            loginAt: entryDate ? entryDate.toISOString() : new Date().toISOString(),
            lastActivity: lastHbMs > 0 ? new Date(lastHbMs).toISOString() : new Date().toISOString(),
            connectedTime: formatConnectedTime(entryDate),
            disconnectSource: (!hasActiveSession && r.disconnected_at && r.disconnect_source && ['MENTOR_SINGLE', 'MENTOR_ALL', 'STUDENT_LOGOUT'].includes(r.disconnect_source)) ? r.disconnect_source : null,
            disconnectedAt: (!hasActiveSession && r.disconnected_at && r.disconnect_source && ['MENTOR_SINGLE', 'MENTOR_ALL', 'STUDENT_LOGOUT'].includes(r.disconnect_source)) ? new Date(r.disconnected_at).toISOString() : null,
          });
        }
      }

      // Also query suspended and banned keys from codigos_acesso so they appear in Suspensos/Banidos tabs
      const [blockedRows]: any = await db.query(`
        SELECT
          ca.id AS key_id,
          ca.codigo,
          ca.access_status,
          ca.suspension_reason,
          ca.suspended_at,
          ca.suspended_by,
          ca.banned_reason,
          ca.banned_at,
          ca.banned_by,
          ca.reactivated_at,
          ca.reactivated_by,
          ca.last_admin_action,
          ca.last_admin_action_at,
          s.id AS session_id,
          s.current_page,
          s.ip_address,
          s.user_agent,
          s.device_type,
          s.browser_name,
          s.operating_system,
          s.last_heartbeat_at,
          pf.nome_usuario,
          pf.avatar
        FROM codigos_acesso ca
        LEFT JOIN sessoes s ON ca.codigo = s.codigo
        LEFT JOIN perfis_alunos pf ON ca.codigo = pf.codigo
        WHERE ca.access_status IN ('SUSPENDED', 'BANNED')
      `);

      if (Array.isArray(blockedRows)) {
        for (const r of blockedRows) {
          if (!r.codigo || isMasterKey(r.codigo)) continue;
          const normCode = normalizeAccessCode(r.codigo);
          if (usersMapByCode.has(normCode)) {
            const existing = usersMapByCode.get(normCode);
            existing.accessStatus = (r.access_status || 'ACTIVE').toUpperCase();
            existing.suspensionReason = r.suspension_reason || existing.suspensionReason;
            existing.suspendedAt = r.suspended_at ? new Date(r.suspended_at).toISOString() : existing.suspendedAt;
            existing.suspendedBy = r.suspended_by || existing.suspendedBy;
            existing.bannedReason = r.banned_reason || existing.bannedReason;
            existing.bannedAt = r.banned_at ? new Date(r.banned_at).toISOString() : existing.bannedAt;
            existing.bannedBy = r.banned_by || existing.bannedBy;
          } else {
            const accStat = (r.access_status || 'ACTIVE').toUpperCase();
            const { deviceType, operatingSystem, browserName } = parseUserAgent(r.user_agent);
            const devStr = r.device_type && r.browser_name
              ? `${r.operating_system || operatingSystem} • ${r.browser_name || browserName}`
              : `${operatingSystem} • ${browserName}`;

            usersMapByCode.set(normCode, {
              accessKeyId: r.key_id ? Number(r.key_id) : null,
              sessionRecordId: r.session_id ? Number(r.session_id) : null,
              id: r.key_id || r.session_id || null,
              _fullCode: normCode,
              username: r.nome_usuario || `Aluno ${maskStudentCode(normCode)}`,
              avatar: r.avatar || null,
              maskedKey: maskKeyForAdmin(normCode),
              status: 'Offline',
              presenceStatus: 'Offline',
              hasActiveSession: false,
              accessStatus: accStat as 'ACTIVE' | 'SUSPENDED' | 'BANNED',
              suspensionReason: r.suspension_reason || null,
              suspendedAt: r.suspended_at ? new Date(r.suspended_at).toISOString() : null,
              suspendedBy: r.suspended_by || null,
              bannedReason: r.banned_reason || null,
              bannedAt: r.banned_at ? new Date(r.banned_at).toISOString() : null,
              bannedBy: r.banned_by || null,
              reactivatedAt: r.reactivated_at ? new Date(r.reactivated_at).toISOString() : null,
              reactivatedBy: r.reactivated_by || null,
              lastAdminAction: r.last_admin_action || null,
              lastAdminActionAt: r.last_admin_action_at ? new Date(r.last_admin_action_at).toISOString() : null,
              currentPage: r.current_page || 'Desconectado',
              deviceType: r.device_type || deviceType,
              operatingSystem: r.operating_system || operatingSystem,
              browserName: r.browser_name || browserName,
              device: devStr,
              maskedIp: maskIpAddress(r.ip_address),
              loginAt: new Date().toISOString(),
              lastActivity: r.last_heartbeat_at ? new Date(r.last_heartbeat_at).toISOString() : new Date().toISOString(),
              connectedTime: '-',
            });
          }
        }
      }
    } catch (err) {
      console.warn('[getCentralPresenceData DB Warning]:', err);
    }
  }

  // Fallback ONLY for keys present in memorySessionsMap (active or past memory sessions)
  if (!isDatabaseConfigured() || memorySessionsMap.size > 0) {
    for (const [rawKey, memSession] of memorySessionsMap.entries()) {
      const key = normalizeAccessCode(rawKey);
      if (!key || isMasterKey(key)) continue;

      if (!usersMapByCode.has(key)) {
        const memKeyInfo = memoryKeyStatusMap.get(key);

        let presence: 'Online' | 'Ausente' | 'Offline' = 'Offline';
        const sec = (nowMs - memSession.lastHeartbeatAt.getTime()) / 1000;
        if (sec <= 90) presence = 'Online';
        else if (sec <= 3600) presence = 'Ausente';

        const accStat = memKeyInfo?.accessStatus || 'ACTIVE';

        usersMapByCode.set(key, {
          _fullCode: key,
          username: `Aluno ${maskKeyForAdmin(key)}`,
          avatar: null,
          maskedKey: maskKeyForAdmin(key),
          status: accStat === 'ACTIVE' ? presence : 'Offline',
          presenceStatus: accStat === 'ACTIVE' ? presence : 'Offline',
          hasActiveSession: true,
          accessStatus: accStat,
          suspensionReason: memKeyInfo?.suspensionReason || null,
          suspendedAt: memKeyInfo?.suspendedAt || null,
          suspendedBy: memKeyInfo?.suspendedBy || null,
          bannedReason: memKeyInfo?.bannedReason || null,
          bannedAt: memKeyInfo?.bannedAt || null,
          bannedBy: memKeyInfo?.bannedBy || null,
          reactivatedAt: memKeyInfo?.reactivatedAt || null,
          reactivatedBy: memKeyInfo?.reactivatedBy || null,
          lastAdminAction: memKeyInfo?.lastAdminAction || null,
          lastAdminActionAt: memKeyInfo?.lastAdminActionAt || null,
          currentPage: memSession.currentPage || 'TikTok 2K',
          deviceType: memSession.deviceType || 'Desktop',
          operatingSystem: memSession.operatingSystem || 'Windows',
          browserName: memSession.browserName || 'Chrome',
          device: `${memSession.operatingSystem} • ${memSession.browserName}`,
          maskedIp: maskIpAddress(memSession.ipAddress),
          loginAt: memSession.startedAt.toISOString(),
          lastActivity: memSession.lastHeartbeatAt.toISOString(),
          connectedTime: formatConnectedTime(memSession.startedAt),
        });
      }
    }
  }

  if (totalLicensesCount === 0) {
    totalLicensesCount = Math.max(STUDENT_KEYS.size, usersMapByCode.size);
  }

  const allUsers = Array.from(usersMapByCode.values());
  const activeUsers = allUsers.filter(u => u.accessStatus === 'ACTIVE');

  const onlineNow = activeUsers.filter(u => u.status === 'Online').length;
  const absentSessions = activeUsers.filter(u => u.status === 'Ausente').length;
  const offlineSessions = activeUsers.filter(u => u.status === 'Offline').length;
  const totalMembers = activeUsers.length;

  const todayStr = new Date().toDateString();
  const accessesToday = activeUsers.filter(u => {
    if (u.status === 'Online' || u.status === 'Ausente') return true;
    if (u.loginAt && new Date(u.loginAt).toDateString() === todayStr) return true;
    return false;
  }).length;

  return {
    users: allUsers,
    stats: {
      onlineNow,
      absentSessions,
      offlineSessions,
      totalMembers,
      totalLicenses: totalLicensesCount,
      accessesToday,
      mentorOnline: true,
    },
  };
}

/**
 * Helper to resolve a target session record securely by numeric sessionRecordId or unmasked code
 */
async function findSessionById(
  rawParam: any,
  bodyObj?: any
): Promise<{
  sessionRecordId: number | null;
  codigo: string | null;
  isOnline: boolean;
}> {
  const candidate = bodyObj?.sessionRecordId || bodyObj?.id || rawParam;

  if (isDatabaseConfigured()) {
    await ensureSessionsTable();

    // 1. If candidate is a numeric ID
    const numId = Number(candidate);
    if (!isNaN(numId) && numId > 0 && String(candidate).trim() !== '') {
      const [rows]: any = await db.query(
        `SELECT id, codigo, is_online FROM sessoes WHERE id = ? LIMIT 1`,
        [numId]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        return {
          sessionRecordId: rows[0].id,
          codigo: rows[0].codigo,
          isOnline: Boolean(rows[0].is_online),
        };
      }
    }

    // 2. Fallback: if candidate is unmasked string code (no asterisks)
    const rawStr = String(bodyObj?.targetCode || bodyObj?.codigo || rawParam || '').trim();
    if (rawStr && !rawStr.includes('*')) {
      const norm = normalizeAccessCode(rawStr);
      const [rows]: any = await db.query(
        `SELECT id, codigo, is_online FROM sessoes WHERE codigo = ? LIMIT 1`,
        [norm]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        return {
          sessionRecordId: rows[0].id,
          codigo: rows[0].codigo,
          isOnline: Boolean(rows[0].is_online),
        };
      }
    }
  }

  // 3. Fallback memory check for unmasked code
  const rawStr = String(bodyObj?.targetCode || bodyObj?.codigo || rawParam || '').trim();
  if (rawStr && !rawStr.includes('*')) {
    const norm = normalizeAccessCode(rawStr);
    if (STUDENT_KEYS.has(norm)) {
      const memSession = memorySessionsMap.get(norm);
      return {
        sessionRecordId: memSession ? 1 : null,
        codigo: norm,
        isOnline: Boolean(memSession),
      };
    }
  }

  return { sessionRecordId: null, codigo: null, isOnline: false };
}

/**
 * Helper to resolve a target access key securely by numeric accessKeyId or unmasked code
 */
async function findAccessKeyById(
  rawParam: any,
  bodyObj?: any
): Promise<{
  accessKeyId: number | null;
  codigo: string | null;
  accessStatus: string | null;
}> {
  const candidate = bodyObj?.accessKeyId || bodyObj?.id || rawParam;

  if (isDatabaseConfigured()) {
    await ensureCodigosAcessoTable();

    // 1. If candidate is a numeric ID
    const numId = Number(candidate);
    if (!isNaN(numId) && numId > 0 && String(candidate).trim() !== '') {
      const [rows]: any = await db.query(
        `SELECT id, codigo, access_status FROM codigos_acesso WHERE id = ? LIMIT 1`,
        [numId]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        return {
          accessKeyId: rows[0].id,
          codigo: rows[0].codigo,
          accessStatus: rows[0].access_status,
        };
      }
    }

    // 2. Fallback: if candidate is unmasked string code (no asterisks)
    const rawStr = String(bodyObj?.targetCode || bodyObj?.codigo || rawParam || '').trim();
    if (rawStr && !rawStr.includes('*')) {
      const norm = normalizeAccessCode(rawStr);
      const [rows]: any = await db.query(
        `SELECT id, codigo, access_status FROM codigos_acesso WHERE codigo = ? LIMIT 1`,
        [norm]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        return {
          accessKeyId: rows[0].id,
          codigo: rows[0].codigo,
          accessStatus: rows[0].access_status,
        };
      }
    }
  }

  // 3. Fallback memory check for unmasked code
  const rawStr = String(bodyObj?.targetCode || bodyObj?.codigo || rawParam || '').trim();
  if (rawStr && !rawStr.includes('*')) {
    const norm = normalizeAccessCode(rawStr);
    if (STUDENT_KEYS.has(norm)) {
      const memKeyInfo = memoryKeyStatusMap.get(norm);
      return {
        accessKeyId: Math.abs(norm.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)),
        codigo: norm,
        accessStatus: memKeyInfo?.accessStatus || 'ACTIVE',
      };
    }
  }

  return { accessKeyId: null, codigo: null, accessStatus: null };
}

/**
 * GET /api/admin/member-stats
 * Returns administrative totals for Painel do Mentor
 */
export async function getAdminMemberStatsHandler(req: express.Request, res: express.Response) {
  try {
    const isMaster = await verifyMasterAccess(req);
    if (!isMaster) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Acesso negado. Apenas o Mentor possui permissão para consultar estatísticas administrativas.',
      });
    }

    checkPeakReset();

    const central = await getCentralPresenceData();
    const { onlineNow, absentSessions, totalMembers, accessesToday } = central.stats;

    let peakSimultaneous = onlineNow;

    if (isDatabaseConfigured()) {
      try {
        await ensurePicoTable();
        const [picoRows]: any = await db.query(
          `SELECT pico FROM pico_simultaneo_diario WHERE data_dia = CURDATE() LIMIT 1`
        );
        if (Array.isArray(picoRows) && picoRows.length > 0) {
          const storedPeak = Number(picoRows[0].pico) || 0;
          peakSimultaneous = Math.max(storedPeak, onlineNow);
          if (onlineNow > storedPeak) {
            await db.query(`UPDATE pico_simultaneo_diario SET pico = ? WHERE data_dia = CURDATE()`, [onlineNow]);
          }
        } else {
          await db.query(
            `INSERT INTO pico_simultaneo_diario (data_dia, pico) VALUES (CURDATE(), ?)
             ON DUPLICATE KEY UPDATE pico = GREATEST(pico, VALUES(pico))`,
            [onlineNow]
          );
          peakSimultaneous = onlineNow;
        }
      } catch (picoErr) {
        if (onlineNow > dailyPeakCount) dailyPeakCount = onlineNow;
        peakSimultaneous = Math.max(dailyPeakCount, onlineNow);
      }
    } else {
      if (onlineNow > dailyPeakCount) dailyPeakCount = onlineNow;
      peakSimultaneous = Math.max(dailyPeakCount, onlineNow);
    }

    return res.json({
      success: true,
      onlineNow,
      totalMembers,
      accessesToday,
      peakSimultaneous,
      absentSessions,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Admin Member Stats Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao obter dados estatísticos dos membros.',
    });
  }
}

/**
 * GET /api/admin/online-users
 * Returns online and student user sessions list for Mentor table
 */
export async function getAdminOnlineUsersHandler(req: express.Request, res: express.Response) {
  try {
    const isMaster = await verifyMasterAccess(req);
    if (!isMaster) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Acesso negado. Apenas o Mentor possui permissão para visualizar o monitoramento de usuários.',
      });
    }

    const search = String(req.query.search || req.query.searchTerm || req.query.q || '').trim().toLowerCase();
    const central = await getCentralPresenceData();
    let usersList = central.users;

    if (search) {
      usersList = usersList.filter((u) => {
        const codeMatch = u._fullCode && String(u._fullCode).toLowerCase().includes(search);
        const maskedKeyMatch = u.maskedKey && String(u.maskedKey).toLowerCase().includes(search);
        const usernameMatch = u.username && String(u.username).toLowerCase().includes(search);
        const pageMatch = u.currentPage && String(u.currentPage).toLowerCase().includes(search);
        const deviceMatch = u.device && String(u.device).toLowerCase().includes(search);
        const ipMatch = u.maskedIp && String(u.maskedIp).toLowerCase().includes(search);

        return codeMatch || maskedKeyMatch || usernameMatch || pageMatch || deviceMatch || ipMatch;
      });
    }

    const activeSessionsCount = usersList.filter(u => u.hasActiveSession).length;
    const sanitizedUsers = usersList.map(({ _fullCode, codigo, ...safeUser }) => safeUser);

    return res.json({
      success: true,
      presenceVersion: PRESENCE_VERSION,
      totalSessions: sanitizedUsers.length,
      activeSessionsCount,
      users: sanitizedUsers,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Admin Online Users Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao obter lista de usuários online.',
    });
  }
}

/**
 * GET /api/admin/stats
 * Returns REAL calculated platform statistics (interactions, agents, challenges, devices)
 */
export async function getAdminStatsHandler(req: express.Request, res: express.Response) {
  try {
    const isMaster = await verifyMasterAccess(req);
    if (!isMaster) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Acesso negado. Apenas o Mentor possui permissão para consultar estatísticas.',
      });
    }

    let totalInteractions = 0;
    let mostUsedAgent: string | null = null;
    let challengeCompletionRate = '0%';
    let peakHour: string | null = null;
    let categories: Array<{ name: string; count: number; percentage: number; color: string }> = [];
    let devices: Array<{ name: string; count: number; percentage: number }> = [];
    let browsers: Array<{ name: string; count: number; percentage: number }> = [];

    if (isDatabaseConfigured()) {
      try {
        await ensureAgentInteractionsTable();
        await ensureProgressTable();
        await ensureSessionsTable();

        // 1. Total Interactions & Most Used Agent & Categories
        const [intCountRows]: any = await db.query(`SELECT COUNT(*) AS count FROM interacoes_agentes`);
        if (Array.isArray(intCountRows) && intCountRows[0]) {
          totalInteractions = Number(intCountRows[0].count) || 0;
        }

        if (totalInteractions > 0) {
          const [agentRows]: any = await db.query(
            `SELECT agent_name, COUNT(*) AS count
             FROM interacoes_agentes
             GROUP BY agent_id, agent_name
             ORDER BY count DESC
             LIMIT 1`
          );
          if (Array.isArray(agentRows) && agentRows.length > 0 && agentRows[0].agent_name) {
            mostUsedAgent = String(agentRows[0].agent_name);
          }

          const [catRows]: any = await db.query(
            `SELECT category, COUNT(*) AS count
             FROM interacoes_agentes
             GROUP BY category
             ORDER BY count DESC`
          );

          if (Array.isArray(catRows) && catRows.length > 0) {
            const colors = ['cyan', 'amber', 'emerald', 'indigo', 'rose', 'fuchsia'];
            categories = catRows.map((c: any, idx: number) => {
              const count = Number(c.count) || 0;
              const percentage = totalInteractions > 0 ? Math.round((count / totalInteractions) * 100) : 0;
              return {
                name: c.category || 'Outros',
                count,
                percentage,
                color: colors[idx % colors.length],
              };
            });
          }

          const [peakRows]: any = await db.query(
            `SELECT HOUR(created_at) AS hr, COUNT(*) AS count
             FROM interacoes_agentes
             GROUP BY hr
             ORDER BY count DESC
             LIMIT 1`
          );
          if (Array.isArray(peakRows) && peakRows.length > 0) {
            const hr = Number(peakRows[0].hr);
            const nextHr = (hr + 1) % 24;
            const pad = (n: number) => String(n).padStart(2, '0');
            peakHour = `${pad(hr)}:00h - ${pad(nextHr)}:00h`;
          }
        }

        // 2. Challenge Completion Rate
        const [progRows]: any = await db.query(
          `SELECT SUM(desafios_jogados) AS played, SUM(desafios_corretos) AS correct FROM progresso_alunos`
        );
        if (Array.isArray(progRows) && progRows[0]) {
          const played = Number(progRows[0].played) || 0;
          const correct = Number(progRows[0].correct) || 0;
          if (played > 0) {
            const rate = Math.min(100, Math.round((correct / played) * 100 * 10) / 10);
            challengeCompletionRate = `${rate}%`;
          }
        }

        // 3. Devices & Browsers telemetry
        const [devRows]: any = await db.query(
          `SELECT device_type, COUNT(*) AS count FROM sessoes WHERE device_type IS NOT NULL AND TRIM(device_type) != '' GROUP BY device_type ORDER BY count DESC`
        );
        if (Array.isArray(devRows) && devRows.length > 0) {
          const totalDevs = devRows.reduce((acc: number, r: any) => acc + (Number(r.count) || 0), 0);
          if (totalDevs > 0) {
            devices = devRows.map((r: any) => ({
              name: r.device_type,
              count: Number(r.count) || 0,
              percentage: Math.round(((Number(r.count) || 0) / totalDevs) * 100),
            }));
          }
        }

        const [browRows]: any = await db.query(
          `SELECT browser_name, COUNT(*) AS count FROM sessoes WHERE browser_name IS NOT NULL AND TRIM(browser_name) != '' GROUP BY browser_name ORDER BY count DESC`
        );
        if (Array.isArray(browRows) && browRows.length > 0) {
          const totalBrows = browRows.reduce((acc: number, r: any) => acc + (Number(r.count) || 0), 0);
          if (totalBrows > 0) {
            browsers = browRows.map((r: any) => ({
              name: r.browser_name,
              count: Number(r.count) || 0,
              percentage: Math.round(((Number(r.count) || 0) / totalBrows) * 100),
            }));
          }
        }
      } catch (dbErr) {
        console.warn('[getAdminStatsHandler DB Error]:', dbErr);
      }
    }

    // Memory fallbacks if DB returned 0 or wasn't configured
    if (totalInteractions === 0 && memoryAgentInteractions.length > 0) {
      totalInteractions = memoryAgentInteractions.length;

      const countsByAgent = new Map<string, { name: string; count: number }>();
      const countsByCat = new Map<string, number>();
      const countsByHour = new Map<number, number>();

      for (const item of memoryAgentInteractions) {
        const agEntry = countsByAgent.get(item.agentId) || { name: item.agentName, count: 0 };
        agEntry.count++;
        countsByAgent.set(item.agentId, agEntry);

        countsByCat.set(item.category, (countsByCat.get(item.category) || 0) + 1);

        const hr = item.createdAt.getHours();
        countsByHour.set(hr, (countsByHour.get(hr) || 0) + 1);
      }

      let topAgent = '';
      let topAgentCount = 0;
      for (const v of countsByAgent.values()) {
        if (v.count > topAgentCount) {
          topAgentCount = v.count;
          topAgent = v.name;
        }
      }
      if (topAgent) mostUsedAgent = topAgent;

      const colors = ['cyan', 'amber', 'emerald', 'indigo', 'rose', 'fuchsia'];
      let idx = 0;
      categories = [];
      for (const [cat, cnt] of countsByCat.entries()) {
        categories.push({
          name: cat,
          count: cnt,
          percentage: Math.round((cnt / totalInteractions) * 100),
          color: colors[idx % colors.length],
        });
        idx++;
      }

      let topHr = -1;
      let topHrCount = 0;
      for (const [h, cnt] of countsByHour.entries()) {
        if (cnt > topHrCount) {
          topHrCount = cnt;
          topHr = h;
        }
      }
      if (topHr >= 0) {
        const pad = (n: number) => String(n).padStart(2, '0');
        peakHour = `${pad(topHr)}:00h - ${pad((topHr + 1) % 24)}:00h`;
      }
    }

    return res.json({
      success: true,
      totalInteractions,
      mostUsedAgent: mostUsedAgent || null,
      challengeCompletionRate,
      peakHour,
      categories,
      devices,
      browsers,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Admin Stats Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao obter estatísticas globais.',
    });
  }
}

/**
 * GET /api/admin/member-count
 * Returns total count of valid registered student codes
 */
export async function getAdminMemberCountHandler(req: express.Request, res: express.Response) {
  try {
    const isMaster = await verifyMasterAccess(req);
    if (!isMaster) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Acesso negado. Apenas o Mentor possui permissão.',
      });
    }

    const totalMembers = STUDENT_KEYS.size || 200;
    return res.json({
      success: true,
      totalMembers,
    });
  } catch (err: any) {
    console.error('[Admin Member Count Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao contar membros.',
    });
  }
}

// =========================================================
// ADMINISTRATIVE ACTION HANDLERS (PROTECTED BY MASTER SESSION)
// =========================================================

/**
 * POST /api/admin/users/:id/disconnect
 * Disconnect active student session immediately
 */
export async function adminDisconnectSessionHandler(req: express.Request, res: express.Response) {
  try {
    const isMaster = await verifyMasterAccess(req);
    if (!isMaster) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Acesso negado. Apenas o Mentor Bigode (Sessão MASTER) pode desconectar sessões.',
      });
    }

    const rawIdParam = req.params.id || req.body?.sessionRecordId || req.body?.id;
    const sessionRecordId = Number(rawIdParam);

    if (isDatabaseConfigured()) {
      await ensureSessionsTable();
      await ensureCodigosAcessoTable();

      let targetRow: any = null;

      if (!isNaN(sessionRecordId) && sessionRecordId > 0) {
        const [rows]: any = await db.query(
          `SELECT id, codigo, active_session_id, expires_at, logout_at FROM sessoes WHERE id = ? LIMIT 1`,
          [sessionRecordId]
        );
        if (Array.isArray(rows) && rows.length > 0) {
          targetRow = rows[0];
        }
      }

      if (!targetRow) {
        const rawCode = String(req.body?.targetCode || req.body?.codigo || req.params.id || '').trim();
        if (rawCode && !rawCode.includes('*')) {
          const normCode = normalizeAccessCode(rawCode);
          const [rows]: any = await db.query(
            `SELECT id, codigo, active_session_id, expires_at, logout_at FROM sessoes WHERE codigo = ? LIMIT 1`,
            [normCode]
          );
          if (Array.isArray(rows) && rows.length > 0) {
            targetRow = rows[0];
          }
        }
      }

      if (!targetRow) {
        return res.status(404).json({
          success: false,
          error: 'SESSION_NOT_FOUND',
          message: 'Sessão não encontrada.',
        });
      }

      if (!targetRow.active_session_id) {
        // Check if there is an active session row for the same codigo
        const [activeRows]: any = await db.query(
          `SELECT id, codigo, active_session_id, expires_at, logout_at FROM sessoes WHERE codigo = ? AND active_session_id IS NOT NULL ORDER BY last_heartbeat_at DESC LIMIT 1`,
          [targetRow.codigo]
        );
        if (Array.isArray(activeRows) && activeRows.length > 0) {
          targetRow = activeRows[0];
        } else {
          return res.status(409).json({
            success: false,
            error: 'SESSION_NOT_ACTIVE',
            message: 'Esta sessão já está encerrada.',
          });
        }
      }

      if (isMasterKey(targetRow.codigo)) {
        return res.status(403).json({
          error: 'MASTER_KEY_PROTECTED',
          message: 'Ações administrativas sobre chaves mestras são estritamente proibidas.',
        });
      }

      console.log('[DISCONNECT TARGET]', {
        sessionRecordId: targetRow.id,
        codigo: targetRow.codigo,
        activeSessionIdBefore: targetRow.active_session_id,
      });

      const clientIp = getClientIp(req);

      const [updateRes]: any = await db.query(
        `UPDATE sessoes
         SET
           active_session_id = NULL,
           device_id = NULL,
           is_online = 0,
           status = 'offline',
           logout_at = NOW(),
           disconnected_at = NOW(),
           disconnect_source = 'MENTOR_SINGLE',
           updated_at = NOW()
         WHERE codigo = ?
           AND active_session_id IS NOT NULL`,
        [targetRow.codigo]
      );

      const affectedRows = updateRes && typeof updateRes.affectedRows === 'number' ? updateRes.affectedRows : 0;

      if (affectedRows < 1) {
        return res.status(409).json({
          success: false,
          error: 'SESSION_NOT_ACTIVE',
          message: 'Esta sessão já está encerrada.',
        });
      }

      await db.query(
        `UPDATE codigos_acesso
         SET
           last_admin_action = 'DISCONNECT',
           last_admin_action_at = NOW()
         WHERE codigo = ?`,
        [targetRow.codigo]
      );

      memorySessionsMap.delete(targetRow.codigo);

      // Verify DB disconnect result
      const [checkRows]: any = await db.query(
        `SELECT id, codigo, active_session_id, disconnect_source, disconnected_at, logout_at FROM sessoes WHERE id = ? LIMIT 1`,
        [targetRow.id]
      );
      const rowAfter = (Array.isArray(checkRows) && checkRows.length > 0) ? checkRows[0] : null;
      const activeSessionIdAfter = rowAfter?.active_session_id ?? null;
      const disconnectSourceAfter = rowAfter?.disconnect_source ?? null;
      const disconnectedAtAfter = rowAfter?.disconnected_at ? new Date(rowAfter.disconnected_at).toISOString() : null;

      console.log('[DISCONNECT RESULT]', {
        affectedRows,
        activeSessionIdAfter,
        disconnectSourceAfter,
        disconnectedAtAfter,
      });

      if (activeSessionIdAfter !== null || disconnectSourceAfter !== 'MENTOR_SINGLE' || !disconnectedAtAfter) {
        return res.status(500).json({
          success: false,
          presenceVersion: PRESENCE_VERSION,
          error: 'DISCONNECT_FAILED',
          message: 'Falha ao validar o encerramento da sessão no banco de dados.',
          activeSessionIdAfter,
          disconnectSourceAfter,
          disconnectedAtAfter,
        });
      }

      // Record audit log safely without allowing audit errors to rollback disconnection
      try {
        await recordAdminAuditAction(targetRow.codigo, 'DISCONNECT', 'Desconexão administrativa efetuada pelo Mentor', clientIp);
      } catch (auditErr) {
        console.warn('[Audit Log Record Warning - Disconnect Succeeded]:', auditErr);
      }

      return res.json({
        success: true,
        presenceVersion: PRESENCE_VERSION,
        disconnectedCount: 1,
        affectedRows,
        sessionRecordId: targetRow.id,
        activeSessionIdAfter: null,
        disconnectSource: 'MENTOR_SINGLE',
        message: '1 sessão desconectada com sucesso.',
      });
    }

    // In-memory fallback if DB not configured
    const rawCode = String(req.body?.targetCode || req.body?.codigo || req.params.id || '').trim();
    const normCode = normalizeAccessCode(rawCode);
    if (normCode && memorySessionsMap.has(normCode)) {
      memorySessionsMap.delete(normCode);
      return res.json({
        success: true,
        presenceVersion: PRESENCE_VERSION,
        disconnectedCount: 1,
        affectedRows: 1,
        sessionRecordId: sessionRecordId || 1,
        activeSessionIdAfter: null,
        disconnectSource: 'MENTOR_SINGLE',
        message: '1 sessão desconectada com sucesso.',
      });
    }

    return res.status(404).json({
      success: false,
      presenceVersion: PRESENCE_VERSION,
      error: 'SESSION_NOT_FOUND',
      message: 'Sessão não encontrada.',
    });
  } catch (err: any) {
    console.error('[Admin Disconnect Session Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      presenceVersion: PRESENCE_VERSION,
      message: 'Não foi possível concluir a ação. Tente novamente.',
    });
  }
}

/**
 * POST /api/admin/users/disconnect-all
 * Disconnect ALL active student sessions immediately
 */
export async function adminDisconnectAllSessionsHandler(req: express.Request, res: express.Response) {
  try {
    const isMaster = await verifyMasterAccess(req);
    if (!isMaster) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Acesso negado. Apenas o Mentor (Sessão MASTER) pode desconectar todas as sessões.',
      });
    }

    const clientIp = getClientIp(req);
    const nowIso = new Date().toISOString();
    let affectedCount = 0;

    if (isDatabaseConfigured()) {
      await ensureSessionsTable();

      const [updateRes]: any = await db.query(
        `UPDATE sessoes
         SET
           active_session_id = NULL,
           device_id = NULL,
           is_online = 0,
           status = 'offline',
           logout_at = NOW(),
           disconnected_at = NOW(),
           disconnect_source = 'MENTOR_ALL',
           updated_at = NOW()
         WHERE active_session_id IS NOT NULL
           AND expires_at IS NOT NULL
           AND expires_at > NOW()`
      );

      if (updateRes && typeof updateRes.affectedRows === 'number') {
        affectedCount = updateRes.affectedRows;
      }

      memorySessionsMap.clear();
    } else {
      affectedCount = memorySessionsMap.size;
      memorySessionsMap.clear();
    }

    if (affectedCount > 0) {
      // Audit console log
      console.log(`[ADMIN] Todas as sessões encerradas | Quantidade: ${affectedCount} | Data/Hora: ${nowIso}`);

      // Audit action in admin_access_actions
      await recordAdminAuditAction(
        'TODAS_AS_SESSOES',
        'DISCONNECT_ALL_SESSIONS',
        `Todas as sessões encerradas (${affectedCount} ${affectedCount === 1 ? 'sessão' : 'sessões'})`,
        clientIp
      );
    }

    const messageText = affectedCount === 0
      ? 'Nenhuma sessão ativa encontrada.'
      : `${affectedCount} ${affectedCount === 1 ? 'sessão desconectada' : 'sessões desconectadas'} com sucesso.`;

    return res.json({
      success: true,
      presenceVersion: PRESENCE_VERSION,
      disconnectedCount: affectedCount,
      affectedRows: affectedCount,
      activeSessionIdAfter: null,
      disconnectSource: 'MENTOR_ALL',
      count: affectedCount,
      message: messageText,
    });
  } catch (err: any) {
    console.error('[Admin Disconnect All Sessions Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      presenceVersion: PRESENCE_VERSION,
      message: 'Não foi possível encerrar todas as sessões. Tente novamente.',
    });
  }
}

/**
 * POST /api/admin/access-keys/:id/suspend
 * Temporarily suspend a student access key
 */
export async function adminSuspendKeyHandler(req: express.Request, res: express.Response) {
  try {
    const isMaster = await verifyMasterAccess(req);
    if (!isMaster) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Acesso negado. Apenas o Mentor Bigode (Sessão MASTER) pode suspender chaves.',
      });
    }

    const keyInfo = await findAccessKeyById(req.params.id, req.body);

    if (!keyInfo.codigo || !keyInfo.accessKeyId) {
      return res.status(404).json({
        error: 'ACCESS_KEY_NOT_FOUND',
        message: 'Chave de acesso não encontrada.',
      });
    }

    if (isMasterKey(keyInfo.codigo)) {
      return res.status(403).json({
        error: 'MASTER_KEY_PROTECTED',
        message: 'Ações administrativas sobre chaves mestras são estritamente proibidas.',
      });
    }

    const selectedReason = req.body?.reason || req.body?.suspensionReason || 'Suspeita de uso indevido';
    const customReason = req.body?.customReason || req.body?.otherReason || '';
    const finalReason = selectedReason === 'Outro' && customReason.trim().length > 0 ? customReason.trim() : selectedReason;

    const clientIp = getClientIp(req);
    const nowIso = new Date().toISOString();

    if (isDatabaseConfigured()) {
      await ensureCodigosAcessoTable();
      await ensureSessionsTable();

      // UPDATE codigos_acesso BY ID
      await db.query(
        `UPDATE codigos_acesso
         SET access_status = 'SUSPENDED',
             suspension_reason = ?,
             suspended_at = NOW(),
             suspended_by = 'SESSION_MASTER',
             last_admin_action = 'SUSPEND',
             last_admin_action_at = NOW()
         WHERE id = ?`,
        [finalReason, keyInfo.accessKeyId]
      );

      // Disconnect corresponding session
      await db.query(
        `UPDATE sessoes
         SET active_session_id = NULL,
             device_id = NULL,
             is_online = 0,
             status = 'offline',
             logout_at = NOW()
         WHERE codigo = ?`,
        [keyInfo.codigo]
      );
    }

    // Memory status update
    memoryKeyStatusMap.set(keyInfo.codigo, {
      accessStatus: 'SUSPENDED',
      suspensionReason: finalReason,
      suspendedAt: nowIso,
      suspendedBy: 'SESSION_MASTER',
      lastAdminAction: 'SUSPEND',
      lastAdminActionAt: nowIso,
    });
    saveKeyStatusStore();
    memorySessionsMap.delete(keyInfo.codigo);

    // Audit log
    await recordAdminAuditAction(keyInfo.codigo, 'SUSPEND', finalReason, clientIp);

    return res.json({
      success: true,
      targetMaskedKey: maskKeyForAdmin(keyInfo.codigo),
      accessStatus: 'SUSPENDED',
      message: 'Chave suspensa com sucesso.',
    });
  } catch (err: any) {
    console.error('[Admin Suspend Key Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Não foi possível concluir a ação. Tente novamente.',
    });
  }
}

/**
 * POST /api/admin/access-keys/:id/reactivate
 * Reactivate a suspended student key
 */
export async function adminReactivateKeyHandler(req: express.Request, res: express.Response) {
  try {
    const isMaster = await verifyMasterAccess(req);
    if (!isMaster) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Acesso negado. Apenas o Mentor Bigode (Sessão MASTER) pode reativar chaves.',
      });
    }

    const keyInfo = await findAccessKeyById(req.params.id, req.body);

    if (!keyInfo.codigo || !keyInfo.accessKeyId) {
      return res.status(404).json({
        error: 'ACCESS_KEY_NOT_FOUND',
        message: 'Chave de acesso não encontrada.',
      });
    }

    if (isMasterKey(keyInfo.codigo)) {
      return res.status(403).json({
        error: 'MASTER_KEY_PROTECTED',
        message: 'Ações administrativas sobre chaves mestras são estritamente proibidas.',
      });
    }

    const clientIp = getClientIp(req);
    const nowIso = new Date().toISOString();

    if (isDatabaseConfigured()) {
      await ensureCodigosAcessoTable();
      await db.query(
        `UPDATE codigos_acesso
         SET access_status = 'ACTIVE',
             suspension_reason = NULL,
             suspended_at = NULL,
             suspended_by = NULL,
             banned_reason = NULL,
             banned_at = NULL,
             banned_by = NULL,
             reactivated_at = NOW(),
             reactivated_by = 'SESSION_MASTER',
             last_admin_action = 'REACTIVATE',
             last_admin_action_at = NOW()
         WHERE id = ?`,
        [keyInfo.accessKeyId]
      );
    }

    const existingMem = memoryKeyStatusMap.get(keyInfo.codigo);
    memoryKeyStatusMap.set(keyInfo.codigo, {
      ...existingMem,
      accessStatus: 'ACTIVE',
      reactivatedAt: nowIso,
      reactivatedBy: 'SESSION_MASTER',
      lastAdminAction: 'REACTIVATE',
      lastAdminActionAt: nowIso,
    });
    saveKeyStatusStore();

    await recordAdminAuditAction(keyInfo.codigo, 'REACTIVATE', 'Reativação efetuada pelo Mentor', clientIp);

    return res.json({
      success: true,
      targetMaskedKey: maskKeyForAdmin(keyInfo.codigo),
      accessStatus: 'ACTIVE',
      message: 'Chave reativada com sucesso.',
    });
  } catch (err: any) {
    console.error('[Admin Reactivate Key Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Não foi possível concluir a ação. Tente novamente.',
    });
  }
}

/**
 * POST /api/admin/access-keys/:id/ban
 * Permanently ban a student access key
 */
export async function adminBanKeyHandler(req: express.Request, res: express.Response) {
  try {
    const isMaster = await verifyMasterAccess(req);
    if (!isMaster) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Acesso negado. Apenas o Mentor Bigode (Sessão MASTER) pode banir chaves.',
      });
    }

    const keyInfo = await findAccessKeyById(req.params.id, req.body);

    if (!keyInfo.codigo || !keyInfo.accessKeyId) {
      return res.status(404).json({
        error: 'ACCESS_KEY_NOT_FOUND',
        message: 'Chave de acesso não encontrada.',
      });
    }

    if (isMasterKey(keyInfo.codigo)) {
      return res.status(403).json({
        error: 'MASTER_KEY_PROTECTED',
        message: 'Ações administrativas sobre chaves mestras são estritamente proibidas.',
      });
    }

    const selectedReason = req.body?.reason || req.body?.bannedReason || 'Violação dos termos';
    const customReason = req.body?.customReason || req.body?.otherReason || '';
    const finalReason = selectedReason === 'Outro' && customReason.trim().length > 0 ? customReason.trim() : selectedReason;

    const clientIp = getClientIp(req);
    const nowIso = new Date().toISOString();

    if (isDatabaseConfigured()) {
      await ensureCodigosAcessoTable();
      await ensureSessionsTable();

      // UPDATE codigos_acesso BY ID
      await db.query(
        `UPDATE codigos_acesso
         SET access_status = 'BANNED',
             banned_reason = ?,
             banned_at = NOW(),
             banned_by = 'SESSION_MASTER',
             last_admin_action = 'BAN',
             last_admin_action_at = NOW()
         WHERE id = ?`,
        [finalReason, keyInfo.accessKeyId]
      );

      // Disconnect corresponding session
      await db.query(
        `UPDATE sessoes
         SET active_session_id = NULL,
             device_id = NULL,
             is_online = 0,
             status = 'offline',
             logout_at = NOW()
         WHERE codigo = ?`,
        [keyInfo.codigo]
      );
    }

    memoryKeyStatusMap.set(keyInfo.codigo, {
      accessStatus: 'BANNED',
      bannedReason: finalReason,
      bannedAt: nowIso,
      bannedBy: 'SESSION_MASTER',
      lastAdminAction: 'BAN',
      lastAdminActionAt: nowIso,
    });
    saveKeyStatusStore();
    memorySessionsMap.delete(keyInfo.codigo);

    await recordAdminAuditAction(keyInfo.codigo, 'BAN', finalReason, clientIp);

    return res.json({
      success: true,
      targetMaskedKey: maskKeyForAdmin(keyInfo.codigo),
      accessStatus: 'BANNED',
      message: 'Chave banida com sucesso.',
    });
  } catch (err: any) {
    console.error('[Admin Ban Key Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Não foi possível concluir a ação. Tente novamente.',
    });
  }
}

/**
 * GET /api/admin/access-keys/:id/history
 * Returns administrative history for a key
 */
export async function adminGetAccessHistoryHandler(req: express.Request, res: express.Response) {
  try {
    const isMaster = await verifyMasterAccess(req);
    if (!isMaster) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Acesso negado. Apenas o Mentor Bigode (Sessão MASTER) pode consultar histórico.',
      });
    }

    const keyInfo = await findAccessKeyById(req.params.id, req.query);

    if (!keyInfo.codigo) {
      return res.status(404).json({
        error: 'ACCESS_KEY_NOT_FOUND',
        message: 'Chave de acesso não encontrada.',
      });
    }

    let historyEntries: any[] = [];

    if (isDatabaseConfigured()) {
      await ensureAdminAccessTable();

      const [rows]: any = await db.query(
        `SELECT id, target_masked_key, action_type, reason, admin_identifier, ip_address, created_at
         FROM admin_access_actions
         WHERE target_access_key_id = ? OR target_masked_key = ?
         ORDER BY created_at DESC`,
        [keyInfo.accessKeyId, maskKeyForAdmin(keyInfo.codigo)]
      );

      if (Array.isArray(rows)) {
        historyEntries = rows.map((r: any) => ({
          id: r.id,
          targetMaskedKey: r.target_masked_key,
          actionType: r.action_type,
          reason: r.reason,
          adminIdentifier: r.admin_identifier || 'SESSION_MASTER',
          ipAddress: maskIpAddress(r.ip_address),
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
        }));
      }
    } else {
      historyEntries = memoryAuditLogs
        .filter((l) => l.targetMaskedKey === maskKeyForAdmin(keyInfo.codigo))
        .map((l) => ({
          id: l.id,
          targetMaskedKey: l.targetMaskedKey,
          actionType: l.actionType,
          reason: l.reason,
          adminIdentifier: l.adminIdentifier,
          ipAddress: maskIpAddress(l.ipAddress),
          createdAt: l.createdAt,
        }));
    }

    return res.json({
      success: true,
      targetMaskedKey: maskKeyForAdmin(keyInfo.codigo),
      history: historyEntries,
    });
  } catch (err: any) {
    console.error('[Admin Access History Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Não foi possível concluir a ação. Tente novamente.',
    });
  }
}

/**
 * GET /api/admin/access-keys
 * Returns list of all access keys from MySQL codigos_acesso along with license stats
 */
export async function getAdminAccessKeysHandler(req: express.Request, res: express.Response) {
  try {
    const isMaster = await verifyMasterAccess(req);
    if (!isMaster) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Acesso negado. Apenas o Mentor pode acessar os códigos de acesso.',
      });
    }

    const nowMs = Date.now();
    let keysList: any[] = [];

    if (isDatabaseConfigured()) {
      await ensureCodigosAcessoTable();
      await ensureSessionsTable();
      await ensureProfilesTable();

      const query = `
        SELECT 
          ca.id AS accessKeyId,
          ca.codigo,
          ca.usado,
          ca.usuario_id,
          ca.access_status,
          ca.criado_em AS criado_em,
          s.id AS sessionRecordId,
          s.codigo AS session_codigo,
          s.last_heartbeat_at,
          s.is_online,
          pf.nome_usuario
        FROM codigos_acesso ca
        LEFT JOIN sessoes s ON ca.codigo = s.codigo
        LEFT JOIN perfis_alunos pf ON ca.codigo = pf.codigo
        ORDER BY ca.id DESC
      `;

      const [rows]: any = await db.query(query);

      if (Array.isArray(rows)) {
        keysList = rows.map((r: any) => {
          const norm = normalizeAccessCode(r.codigo);
          const isUsed = Boolean(r.usado || r.usuario_id || r.session_codigo);
          const hasSession = Boolean(r.session_codigo);
          const isOnline = Boolean(
            r.session_codigo &&
            r.last_heartbeat_at &&
            (nowMs - new Date(r.last_heartbeat_at).getTime()) <= 90000
          );

          return {
            accessKeyId: r.accessKeyId,
            sessionRecordId: r.sessionRecordId || null,
            id: r.accessKeyId,
            codigo: r.codigo,
            maskedCode: maskKeyForAdmin(norm),
            maskedKey: maskKeyForAdmin(norm),
            accessStatus: (r.access_status || 'ACTIVE').toUpperCase(),
            status: (r.access_status || 'ACTIVE').toUpperCase(),
            usado: isUsed,
            hasSession,
            isOnline,
            createdAt: r.criado_em ? new Date(r.criado_em).toISOString() : new Date().toISOString(),
            expiresAt: 'Vitalício',
            username: r.nome_usuario || (isUsed ? `Aluno ${maskStudentCode(norm)}` : 'Não utilizado'),
          };
        });
      }
    } else {
      // Memory keys fallback
      for (const rawKey of STUDENT_KEYS) {
        const norm = normalizeAccessCode(rawKey);
        const memSession = memorySessionsMap.get(norm);
        const memKeyInfo = memoryKeyStatusMap.get(norm);
        const isUsed = Boolean(memSession);
        const isOnline = Boolean(
          memSession && (nowMs - memSession.lastHeartbeatAt.getTime()) <= 90000
        );

        const idVal = Math.abs(norm.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
        keysList.push({
          accessKeyId: idVal,
          sessionRecordId: memSession ? 1 : null,
          id: idVal,
          codigo: norm,
          maskedCode: maskKeyForAdmin(norm),
          maskedKey: maskKeyForAdmin(norm),
          accessStatus: memKeyInfo?.accessStatus || 'ACTIVE',
          status: memKeyInfo?.accessStatus || 'ACTIVE',
          usado: isUsed,
          hasSession: Boolean(memSession),
          isOnline,
          createdAt: new Date().toISOString(),
          expiresAt: 'Vitalício',
          username: isUsed ? `Aluno ${maskStudentCode(norm)}` : 'Não utilizado',
        });
      }
    }

    const total = keysList.length;
    const active = keysList.filter((k) => k.accessStatus === 'ACTIVE').length;
    const suspended = keysList.filter((k) => k.accessStatus === 'SUSPENDED').length;
    const banned = keysList.filter((k) => k.accessStatus === 'BANNED').length;
    const neverUsed = keysList.filter((k) => !k.usado).length;
    const used = keysList.filter((k) => k.usado).length;

    return res.json({
      success: true,
      keys: keysList,
      stats: {
        total,
        active,
        suspended,
        banned,
        neverUsed,
        used,
        totalLicenses: total,
        activeKeys: active,
        suspendedKeys: suspended,
        bannedKeys: banned,
        alreadyUsed: used,
      },
    });
  } catch (err: any) {
    console.error('[Admin Access Keys Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Não foi possível concluir a ação. Tente novamente.',
    });
  }
}

/**
 * POST /api/admin/access-keys/generate
 * Generates new access keys and persists them directly into MySQL codigos_acesso
 */
export async function generateAccessKeysHandler(req: express.Request, res: express.Response) {
  try {
    const isMaster = await verifyMasterAccess(req);
    if (!isMaster) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Acesso negado. Apenas o Mentor pode gerar novos códigos de acesso.',
      });
    }

    const quantity = Math.max(1, Math.min(50, Number(req.body?.quantity || req.body?.count || 1)));
    const customPrefix = String(req.body?.prefix || 'GZPRO').trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'GZPRO';

    const createdKeys: any[] = [];

    if (isDatabaseConfigured()) {
      await ensureCodigosAcessoTable();

      for (let i = 0; i < quantity; i++) {
        let generatedCode = '';
        let exists = true;
        let attempts = 0;

        while (exists && attempts < 20) {
          attempts++;
          const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
          const randomDigits = Math.floor(1000 + Math.random() * 9000);
          generatedCode = `${customPrefix}-${randomSuffix}-${randomDigits}`;

          const [existingRows]: any = await db.query(
            `SELECT id FROM codigos_acesso WHERE codigo = ? LIMIT 1`,
            [generatedCode]
          );
          exists = Array.isArray(existingRows) && existingRows.length > 0;
        }

        if (exists) {
          throw new Error('Falha ao gerar código de acesso único.');
        }

        // PHYSICAL PERSISTENCE IN MYSQL codigos_acesso
        const [insertRes]: any = await db.query(
          `INSERT INTO codigos_acesso (
             codigo,
             usado,
             usuario_id,
             access_status,
             criado_em
           )
           VALUES (?, 0, NULL, 'ACTIVE', NOW())`,
          [generatedCode]
        );

        // Add to memory set so auth system immediately recognizes it
        STUDENT_KEYS.add(generatedCode);

        createdKeys.push({
          id: insertRes?.insertId || Date.now() + i,
          codigo: generatedCode,
          maskedKey: maskKeyForAdmin(generatedCode),
          accessStatus: 'ACTIVE',
          usado: false,
          createdAt: new Date().toISOString(),
          expiresAt: 'Vitalício',
          username: 'Não utilizado',
          isOnline: false,
        });
      }
    } else {
      for (let i = 0; i < quantity; i++) {
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const randomDigits = Math.floor(1000 + Math.random() * 9000);
        const generatedCode = `${customPrefix}-${randomSuffix}-${randomDigits}`;

        STUDENT_KEYS.add(generatedCode);

        createdKeys.push({
          id: Date.now() + i,
          codigo: generatedCode,
          maskedKey: maskKeyForAdmin(generatedCode),
          accessStatus: 'ACTIVE',
          usado: false,
          createdAt: new Date().toISOString(),
          expiresAt: 'Vitalício',
          username: 'Não utilizado',
          isOnline: false,
        });
      }
    }

    return res.json({
      success: true,
      count: createdKeys.length,
      keys: createdKeys,
      message: `${createdKeys.length} novas licenças de acesso geradas e persistidas no banco de dados com sucesso.`,
    });
  } catch (err: any) {
    console.error('[Generate Access Keys Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: err?.message || 'Erro ao gerar novos códigos de acesso.',
    });
  }
}
