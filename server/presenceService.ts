import express from 'express';
import fs from 'fs';
import path from 'path';
import { db, isDatabaseConfigured, ensureSessionsTable, ensureProfilesTable, ensureAdminAccessTable, ensureCodigosAcessoTable } from './database.js';
import { normalizeAccessCode, lookupKeyType, STUDENT_KEYS, MASTER_KEYS } from './authKeys.js';
import { maskStudentCode } from './rankingService.js';

export function isMasterKey(rawCode: unknown): boolean {
  const norm = normalizeAccessCode(rawCode);
  if (!norm) return false;
  return MASTER_KEYS.has(norm) || lookupKeyType(norm) === 'MASTER';
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
  if (!ua) {
    return { deviceType: 'Desktop', operatingSystem: 'Windows', browserName: 'Chrome' };
  }

  let deviceType = 'Desktop';
  if (/mobile|iphone|ipod|android.*mobile/i.test(ua)) deviceType = 'Mobile';
  else if (/tablet|ipad|android(?!.*mobile)/i.test(ua)) deviceType = 'Tablet';

  let operatingSystem = 'Windows';
  if (/macintosh|mac os x/i.test(ua)) operatingSystem = 'macOS';
  else if (/android/i.test(ua)) operatingSystem = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) operatingSystem = 'iOS';
  else if (/linux/i.test(ua)) operatingSystem = 'Linux';

  let browserName = 'Chrome';
  if (/edg/i.test(ua)) browserName = 'Edge';
  else if (/firefox/i.test(ua)) browserName = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browserName = 'Safari';
  else if (/opera|opr/i.test(ua)) browserName = 'Opera';

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
  actionType: 'DISCONNECT' | 'SUSPEND' | 'REACTIVATE' | 'BAN';
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
  actionType: 'DISCONNECT' | 'SUSPEND' | 'REACTIVATE' | 'BAN',
  reason?: string,
  ipAddress?: string
): Promise<void> {
  const maskedKey = maskKeyForAdmin(targetKey);
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
    const currentPage = req.body?.currentPage || req.body?.page || 'Agentes GPT';
    const rawUa = req.headers['user-agent'] || req.body?.userAgent || '';

    const cleanCode = normalizeAccessCode(studentCode);
    if (!cleanCode) {
      return res.status(400).json({
        error: 'ACCESS_CODE_REQUIRED',
        message: 'Informe o código de acesso.',
      });
    }

    const keyType = await checkCodeKeyType(cleanCode);
    if (keyType === 'INVALID') {
      return res.status(401).json({
        error: 'INVALID_ACCESS_CODE',
        message: 'O código informado é inválido.',
      });
    }

    // Master keys are exempt from session table persistence (Rule 3)
    if (keyType === 'MASTER') {
      return res.json({ status: 'ok', online: true, isMaster: true, role: 'mentor' });
    }

    // Check key status first (Suspended / Banned)
    const keyInfo = await getKeyAccessStatus(cleanCode);
    if (keyInfo.accessStatus === 'SUSPENDED') {
      memorySessionsMap.delete(cleanCode);
      return res.status(423).json({
        error: 'KEY_SUSPENDED',
        accessStatus: 'SUSPENDED',
        title: 'Acesso temporariamente suspenso',
        message: 'Sua chave de acesso está temporariamente suspensa pelo Mentor. Entre em contato com o suporte caso tenha dúvidas.',
      });
    }
    if (keyInfo.accessStatus === 'BANNED') {
      memorySessionsMap.delete(cleanCode);
      return res.status(403).json({
        error: 'KEY_BANNED',
        title: 'Acesso permanentemente bloqueado',
        message: 'Esta chave de acesso foi banida pelo Mentor e não pode mais ser utilizada. Caso acredite que isso ocorreu por engano, entre em contato com o suporte da Mentoria Geração Z Pro.',
      });
    }

    if (!sessionId) {
      return res.status(401).json({
        error: 'SESSION_REQUIRED',
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
          `SELECT active_session_id, expires_at, access_status FROM sessoes WHERE codigo = ?`,
          [cleanCode]
        );

        if (Array.isArray(rows) && rows.length > 0) {
          const r = rows[0];
          if (r.access_status === 'SUSPENDED') {
            memorySessionsMap.delete(cleanCode);
            return res.status(423).json({
              error: 'KEY_SUSPENDED',
              accessStatus: 'SUSPENDED',
              title: 'Acesso temporariamente suspenso',
              message: 'Sua chave de acesso está temporariamente suspensa pelo Mentor. Entre em contato com o suporte caso tenha dúvidas.',
            });
          }
          if (r.access_status === 'BANNED') {
            memorySessionsMap.delete(cleanCode);
            return res.status(403).json({
              error: 'KEY_BANNED',
              title: 'Acesso permanentemente bloqueado',
              message: 'Esta chave de acesso foi banida pelo Mentor e não pode mais ser utilizada. Caso acredite que isso ocorreu por engano, entre em contato com o suporte da Mentoria Geração Z Pro.',
            });
          }
          if (!r.active_session_id || r.active_session_id !== sessionId) {
            memorySessionsMap.delete(cleanCode);
            return res.status(401).json({
              error: 'SESSION_EXPIRED',
              message: 'Sessão encerrada ou invalidada pelo administrador. Efetue login novamente.',
            });
          }
          if (r.expires_at && new Date(r.expires_at).getTime() <= Date.now()) {
            memorySessionsMap.delete(cleanCode);
            return res.status(401).json({
              error: 'SESSION_EXPIRED',
              message: 'Sessão expirada. Efetue login novamente.',
            });
          }
          sessionValidated = true;
        }

        if (sessionValidated) {
          await db.query(
            `UPDATE sessoes
             SET
               last_heartbeat_at = NOW(),
               expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY),
               is_online = 1,
               status = 'online',
               current_page = ?,
               ip_address = ?,
               user_agent = ?,
               device_type = ?,
               browser_name = ?,
               operating_system = ?
             WHERE codigo = ?
             AND active_session_id = ?`,
            [currentPage, clientIp, rawUa, deviceType, browserName, operatingSystem, cleanCode, sessionId]
          );
        }
      } catch (dbErr) {
        console.warn('[Heartbeat DB Warning - fallback to memory map]:', dbErr);
      }
    }

    if (!sessionValidated) {
      // Memory check for fallback
      const memSession = memorySessionsMap.get(cleanCode);
      if (!memSession || memSession.sessionId !== sessionId) {
        return res.status(401).json({
          error: 'SESSION_EXPIRED',
          message: 'Sessão encerrada ou invalidada pelo administrador. Efetue login novamente.',
        });
      }
      if (memSession.expiresAt && memSession.expiresAt.getTime() < Date.now()) {
        memorySessionsMap.delete(cleanCode);
        return res.status(401).json({
          error: 'SESSION_EXPIRED',
          message: 'Sessão expirada. Efetue login novamente.',
        });
      }
    }

    // Always update in-memory map for backup
    const now = new Date();
    const existing = memorySessionsMap.get(cleanCode);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    memorySessionsMap.set(cleanCode, {
      codigo: cleanCode,
      sessionId,
      deviceId: existing?.deviceId || `device-${sessionId.slice(0, 8)}`,
      currentPage,
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
           logout_at = NOW()
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

    let onlineNow = 0;
    let absentSessions = 0;
    let accessesToday = 0;
    const totalMembers = STUDENT_KEYS.size || 200;

    if (isDatabaseConfigured()) {
      await ensureSessionsTable();

      // 1. Online Now: last_heartbeat_at within last 90 seconds (1.5 min) and active status
      const [onlineRows]: any = await db.query(
        `SELECT COUNT(*) AS count
         FROM sessoes
         WHERE (access_status IS NULL OR access_status = 'ACTIVE')
         AND last_heartbeat_at >= DATE_SUB(NOW(), INTERVAL 90 SECOND)`
      );
      if (Array.isArray(onlineRows) && onlineRows[0]) {
        onlineNow = Number(onlineRows[0].count) || 0;
      }

      // 2. Absent: last_heartbeat_at between 90s and 300s (5 min)
      const [absentRows]: any = await db.query(
        `SELECT COUNT(*) AS count
         FROM sessoes
         WHERE (access_status IS NULL OR access_status = 'ACTIVE')
         AND last_heartbeat_at < DATE_SUB(NOW(), INTERVAL 90 SECOND)
         AND last_heartbeat_at >= DATE_SUB(NOW(), INTERVAL 300 SECOND)`
      );
      if (Array.isArray(absentRows) && absentRows[0]) {
        absentSessions = Number(absentRows[0].count) || 0;
      }

      // 3. Accesses Today: sessions started or active today
      const [todayRows]: any = await db.query(
        `SELECT COUNT(*) AS count
         FROM sessoes
         WHERE session_started_at >= CURDATE()
            OR login_at >= CURDATE()
            OR last_heartbeat_at >= CURDATE()`
      );
      if (Array.isArray(todayRows) && todayRows[0]) {
        accessesToday = Number(todayRows[0].count) || 0;
      }
    } else {
      // Memory statistics calculations
      const nowMs = Date.now();
      for (const s of memorySessionsMap.values()) {
        const memStatus = memoryKeyStatusMap.get(s.codigo)?.accessStatus || 'ACTIVE';
        if (memStatus !== 'ACTIVE') continue;

        const diffSec = (nowMs - s.lastHeartbeatAt.getTime()) / 1000;
        if (diffSec <= 90) {
          onlineNow++;
        } else if (diffSec <= 300) {
          absentSessions++;
        }
        if (s.startedAt.toDateString() === new Date().toDateString()) {
          accessesToday++;
        }
      }
    }

    // Update peak count if current online is higher
    if (onlineNow > dailyPeakCount) {
      dailyPeakCount = onlineNow;
    }

    return res.json({
      success: true,
      onlineNow,
      totalMembers,
      accessesToday: Math.max(accessesToday, onlineNow),
      peakSimultaneous: Math.max(dailyPeakCount, onlineNow),
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
    const usersMapByCode = new Map<string, any>();

    if (isDatabaseConfigured()) {
      await ensureCodigosAcessoTable();
      await ensureSessionsTable();
      await ensureProfilesTable();

      const query = `
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
          s.current_page,
          s.ip_address,
          s.user_agent,
          s.device_type,
          s.browser_name,
          s.operating_system,
          s.session_started_at,
          s.login_at,
          s.last_heartbeat_at,
          s.is_online,
          s.status,
          pf.nome_usuario,
          pf.avatar
        FROM codigos_acesso ca
        LEFT JOIN sessoes s ON ca.codigo = s.codigo
        LEFT JOIN perfis_alunos pf ON ca.codigo = pf.codigo
        ORDER BY s.last_heartbeat_at DESC
      `;

      const [rows]: any = await db.query(query);

      if (Array.isArray(rows)) {
        const nowMs = Date.now();

        for (const r of rows) {
          if (isMasterKey(r.codigo)) continue; // Never include master keys

          const lastHbMs = r.last_heartbeat_at ? new Date(r.last_heartbeat_at).getTime() : 0;
          const secondsSinceHb = lastHbMs > 0 ? (nowMs - lastHbMs) / 1000 : 9999;

          let calculatedPresence: 'Online' | 'Ausente' | 'Offline' = 'Offline';
          const accStat = (r.access_status || 'ACTIVE').toUpperCase();

          if (accStat === 'ACTIVE' && secondsSinceHb <= 90) {
            calculatedPresence = 'Online';
          } else if (accStat === 'ACTIVE' && secondsSinceHb <= 300) {
            calculatedPresence = 'Ausente';
          } else {
            calculatedPresence = 'Offline';
          }

          const entryDate = r.login_at || r.session_started_at ? new Date(r.login_at || r.session_started_at) : null;
          const { deviceType, operatingSystem, browserName } = parseUserAgent(r.user_agent);

          const devStr = r.device_type && r.browser_name
            ? `${r.operating_system || operatingSystem} • ${r.browser_name || browserName}`
            : `${operatingSystem} • ${browserName}`;

          usersMapByCode.set(r.codigo, {
            _fullCode: r.codigo,
            username: r.nome_usuario || `Aluno ${maskStudentCode(r.codigo)}`,
            avatar: r.avatar || null,
            maskedKey: maskKeyForAdmin(r.codigo),
            presenceStatus: calculatedPresence,
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
            currentPage: r.current_page || 'Agentes GPT',
            deviceType: r.device_type || deviceType,
            operatingSystem: r.operating_system || operatingSystem,
            browserName: r.browser_name || browserName,
            device: devStr,
            maskedIp: maskIpAddress(r.ip_address),
            loginAt: entryDate ? entryDate.toISOString() : new Date().toISOString(),
            lastActivity: r.last_heartbeat_at ? new Date(r.last_heartbeat_at).toISOString() : new Date().toISOString(),
            connectedTime: formatConnectedTime(entryDate),
          });
        }
      }
    }

    // Combine with memory sessions and default student keys
    const nowMs = Date.now();
    for (const key of STUDENT_KEYS) {
      if (isMasterKey(key)) continue;

      if (!usersMapByCode.has(key)) {
        const memSession = memorySessionsMap.get(key);
        const memKeyInfo = memoryKeyStatusMap.get(key);

        let presence: 'Online' | 'Ausente' | 'Offline' = 'Offline';
        if (memSession) {
          const sec = (nowMs - memSession.lastHeartbeatAt.getTime()) / 1000;
          if (sec <= 90) presence = 'Online';
          else if (sec <= 300) presence = 'Ausente';
        }

        const accStat = memKeyInfo?.accessStatus || 'ACTIVE';

        usersMapByCode.set(key, {
          _fullCode: key,
          username: `Aluno ${maskKeyForAdmin(key)}`,
          avatar: null,
          maskedKey: maskKeyForAdmin(key),
          presenceStatus: accStat === 'ACTIVE' ? presence : 'Offline',
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
          currentPage: memSession?.currentPage || 'Agentes GPT',
          deviceType: memSession?.deviceType || 'Desktop',
          operatingSystem: memSession?.operatingSystem || 'Windows',
          browserName: memSession?.browserName || 'Chrome',
          device: memSession ? `${memSession.operatingSystem} • ${memSession.browserName}` : 'Desconhecido',
          maskedIp: maskIpAddress(memSession?.ipAddress),
          loginAt: memSession ? memSession.startedAt.toISOString() : new Date().toISOString(),
          lastActivity: memSession ? memSession.lastHeartbeatAt.toISOString() : new Date().toISOString(),
          connectedTime: formatConnectedTime(memSession ? memSession.startedAt : null),
        });
      }
    }

    let usersList = Array.from(usersMapByCode.values());

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

    // Strip internal _fullCode and codigo fields to protect sensitive access keys
    const sanitizedUsers = usersList.map(({ _fullCode, codigo, ...safeUser }) => safeUser);

    return res.json({
      success: true,
      totalSessions: sanitizedUsers.length,
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

    const rawTarget = req.params.id || req.body?.targetCode || req.body?.accessCode || req.body?.codigo;

    if (isMasterKey(rawTarget)) {
      return res.status(403).json({
        error: 'MASTER_KEY_PROTECTED',
        message: 'Ações administrativas sobre chaves mestras são estritamente proibidas.',
      });
    }

    const targetCode = resolveStudentCode(rawTarget);

    if (!rawTarget || !targetCode) {
      return res.status(404).json({
        error: 'TARGET_KEY_NOT_FOUND',
        message: 'Chave de acesso alvo não encontrada ou inválida.',
      });
    }

    const clientIp = getClientIp(req);

    if (isDatabaseConfigured()) {
      await ensureSessionsTable();
      await ensureCodigosAcessoTable();

      // Invalidate session in sessoes table
      await db.query(
        `UPDATE sessoes
         SET
           active_session_id = NULL,
           is_online = 0,
           status = 'offline',
           logout_at = NOW()
         WHERE codigo = ?`,
        [targetCode]
      );

      // Record last admin action on permanent table
      await db.query(
        `UPDATE codigos_acesso
         SET
           last_admin_action = 'DISCONNECT',
           last_admin_action_at = NOW()
         WHERE codigo = ?`,
        [targetCode]
      );
    }

    // Clear memory session
    memorySessionsMap.delete(targetCode);

    // Audit action
    await recordAdminAuditAction(targetCode, 'DISCONNECT', 'Desconexão administrativa efetuada pelo Mentor', clientIp);

    return res.json({
      success: true,
      targetMaskedKey: maskKeyForAdmin(targetCode),
      message: 'Aluno desconectado com sucesso.',
    });
  } catch (err: any) {
    console.error('[Admin Disconnect Session Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao desconectar sessão do aluno.',
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

    const rawTarget = req.params.id || req.body?.targetCode || req.body?.accessCode || req.body?.codigo;
    const targetCode = resolveStudentCode(rawTarget);

    if (!rawTarget || !targetCode) {
      return res.status(404).json({
        error: 'TARGET_KEY_NOT_FOUND',
        message: 'Chave de acesso alvo não encontrada ou inválida.',
      });
    }

    // STRICT MASTER KEY PROTECTION
    if (isMasterKey(targetCode)) {
      return res.status(403).json({
        error: 'MASTER_KEY_PROTECTED',
        message: 'Ações administrativas sobre chaves mestras são estritamente proibidas.',
      });
    }

    const selectedReason = req.body?.reason || req.body?.suspensionReason || 'Suspeita de uso indevido';
    const customReason = req.body?.customReason || req.body?.otherReason || '';
    const finalReason = selectedReason === 'Outro' && customReason.trim().length > 0 ? customReason.trim() : selectedReason;

    if (!finalReason) {
      return res.status(400).json({
        error: 'REASON_REQUIRED',
        message: 'Informe o motivo da suspensão da chave.',
      });
    }

    const clientIp = getClientIp(req);
    const nowIso = new Date().toISOString();

    if (isDatabaseConfigured()) {
      await ensureCodigosAcessoTable();
      await ensureSessionsTable();

      // Update permanent status in codigos_acesso
      await db.query(
        `UPDATE codigos_acesso
         SET access_status = 'SUSPENDED',
             suspension_reason = ?,
             suspended_at = NOW(),
             suspended_by = 'SESSION_MASTER',
             last_admin_action = 'SUSPEND',
             last_admin_action_at = NOW()
         WHERE codigo = ?`,
        [finalReason, targetCode]
      );

      // Invalidate active session in sessoes
      await db.query(
        `UPDATE sessoes
         SET active_session_id = NULL,
             is_online = 0,
             status = 'offline',
             logout_at = NOW()
         WHERE codigo = ?`,
        [targetCode]
      );
    }

    // Memory status update
    memoryKeyStatusMap.set(targetCode, {
      accessStatus: 'SUSPENDED',
      suspensionReason: finalReason,
      suspendedAt: nowIso,
      suspendedBy: 'SESSION_MASTER',
      lastAdminAction: 'SUSPEND',
      lastAdminActionAt: nowIso,
    });
    saveKeyStatusStore();

    // Invalidate active session immediately
    memorySessionsMap.delete(targetCode);

    // Audit log
    await recordAdminAuditAction(targetCode, 'SUSPEND', finalReason, clientIp);

    return res.json({
      success: true,
      targetMaskedKey: maskKeyForAdmin(targetCode),
      accessStatus: 'SUSPENDED',
      message: 'Chave suspensa com sucesso.',
    });
  } catch (err: any) {
    console.error('[Admin Suspend Key Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao suspender chave de acesso.',
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

    const rawTarget = req.params.id || req.body?.targetCode || req.body?.accessCode || req.body?.codigo;
    const targetCode = resolveStudentCode(rawTarget);

    if (!rawTarget || !targetCode) {
      return res.status(404).json({
        error: 'TARGET_KEY_NOT_FOUND',
        message: 'Chave de acesso alvo não encontrada ou inválida.',
      });
    }

    // STRICT MASTER KEY PROTECTION
    if (isMasterKey(targetCode)) {
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
             reactivated_at = NOW(),
             reactivated_by = 'SESSION_MASTER',
             last_admin_action = 'REACTIVATE',
             last_admin_action_at = NOW()
         WHERE codigo = ?`,
        [targetCode]
      );
    }

    // Update memory status
    const existingMem = memoryKeyStatusMap.get(targetCode);
    memoryKeyStatusMap.set(targetCode, {
      ...existingMem,
      accessStatus: 'ACTIVE',
      reactivatedAt: nowIso,
      reactivatedBy: 'SESSION_MASTER',
      lastAdminAction: 'REACTIVATE',
      lastAdminActionAt: nowIso,
    });
    saveKeyStatusStore();

    // Audit log
    await recordAdminAuditAction(targetCode, 'REACTIVATE', 'Reativação efetuada pelo Mentor', clientIp);

    return res.json({
      success: true,
      targetMaskedKey: maskKeyForAdmin(targetCode),
      accessStatus: 'ACTIVE',
      message: 'Chave reativada com sucesso.',
    });
  } catch (err: any) {
    console.error('[Admin Reactivate Key Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao reativar chave de acesso.',
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

    const rawTarget = req.params.id || req.body?.targetCode || req.body?.accessCode || req.body?.codigo;
    const targetCode = resolveStudentCode(rawTarget);

    if (!rawTarget || !targetCode) {
      return res.status(404).json({
        error: 'TARGET_KEY_NOT_FOUND',
        message: 'Chave de acesso alvo não encontrada ou inválida.',
      });
    }

    // STRICT MASTER KEY PROTECTION
    if (isMasterKey(targetCode)) {
      return res.status(403).json({
        error: 'MASTER_KEY_PROTECTED',
        message: 'Ações administrativas sobre chaves mestras são estritamente proibidas.',
      });
    }

    const selectedReason = req.body?.reason || req.body?.bannedReason || 'Violação dos termos';
    const customReason = req.body?.customReason || req.body?.otherReason || '';
    const finalReason = selectedReason === 'Outro' && customReason.trim().length > 0 ? customReason.trim() : selectedReason;

    if (!finalReason) {
      return res.status(400).json({
        error: 'REASON_REQUIRED',
        message: 'Informe o motivo do banimento da chave.',
      });
    }

    const clientIp = getClientIp(req);
    const nowIso = new Date().toISOString();

    if (isDatabaseConfigured()) {
      await ensureCodigosAcessoTable();
      await ensureSessionsTable();

      // Update permanent status in codigos_acesso
      await db.query(
        `UPDATE codigos_acesso
         SET access_status = 'BANNED',
             banned_reason = ?,
             banned_at = NOW(),
             banned_by = 'SESSION_MASTER',
             last_admin_action = 'BAN',
             last_admin_action_at = NOW()
         WHERE codigo = ?`,
        [finalReason, targetCode]
      );

      // Invalidate session in sessoes
      await db.query(
        `UPDATE sessoes
         SET active_session_id = NULL,
             is_online = 0,
             status = 'offline',
             logout_at = NOW()
         WHERE codigo = ?`,
        [targetCode]
      );
    }

    // Update memory status
    memoryKeyStatusMap.set(targetCode, {
      accessStatus: 'BANNED',
      bannedReason: finalReason,
      bannedAt: nowIso,
      bannedBy: 'SESSION_MASTER',
      lastAdminAction: 'BAN',
      lastAdminActionAt: nowIso,
    });
    saveKeyStatusStore();

    // Invalidate session immediately
    memorySessionsMap.delete(targetCode);

    // Audit log
    await recordAdminAuditAction(targetCode, 'BAN', finalReason, clientIp);

    return res.json({
      success: true,
      targetMaskedKey: maskKeyForAdmin(targetCode),
      accessStatus: 'BANNED',
      message: 'Chave banida com sucesso.',
    });
  } catch (err: any) {
    console.error('[Admin Ban Key Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao banir chave de acesso.',
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

    const rawTarget = req.params.id || req.query?.targetCode || req.query?.accessCode;
    const targetCode = resolveStudentCode(rawTarget);

    if (!rawTarget || !targetCode) {
      return res.status(404).json({
        error: 'TARGET_KEY_NOT_FOUND',
        message: 'Chave de acesso alvo não encontrada.',
      });
    }

    let historyEntries: any[] = [];

    if (isDatabaseConfigured()) {
      await ensureAdminAccessTable();
      await ensureCodigosAcessoTable();

      // Get key id from codigos_acesso
      const [keyRows]: any = await db.query(
        `SELECT id FROM codigos_acesso WHERE codigo = ? LIMIT 1`,
        [targetCode]
      );
      const targetKeyId = Array.isArray(keyRows) && keyRows.length > 0 ? keyRows[0].id : null;

      const [rows]: any = await db.query(
        `SELECT id, target_masked_key, action_type, reason, admin_identifier, ip_address, created_at
         FROM admin_access_actions
         WHERE target_access_key_id = ?
         ORDER BY created_at DESC`,
        [targetKeyId]
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
      // Memory logs fallback
      historyEntries = memoryAuditLogs
        .filter((l) => l.targetMaskedKey === maskKeyForAdmin(targetCode))
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
      targetMaskedKey: maskKeyForAdmin(targetCode),
      history: historyEntries,
    });
  } catch (err: any) {
    console.error('[Admin Access History Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao obter histórico da chave.',
    });
  }
}
