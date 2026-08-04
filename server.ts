import express from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import {
  lookupKeyType,
  verifyLoadedKeysCount,
  normalizeAccessCode,
  maskCodeForLogs,
} from './server/authKeys.js';
import {
  db,
  isDatabaseConfigured,
  testDatabaseConnection,
  ensureSessionsTable,
  ensureProductsTable,
  ensureProgressTable,
  ensureProfilesTable,
  ensureChatTables,
} from './server/database.js';
import {
  getGlobalRankingHandler,
  getUserRankingStatsHandler,
  syncPlayerProgressHandler,
} from './server/rankingService.js';
import {
  getStudentProfileHandler,
  checkUsernameHandler,
  createStudentProfileHandler,
  updateUsernameHandler,
  getMentorStudentsHandler,
} from './server/studentProfileService.js';
import {
  presenceHeartbeatHandler,
  presenceLogoutHandler,
  getAdminMemberStatsHandler,
  getAdminOnlineUsersHandler,
  getAdminStatsHandler,
  getAdminMemberCountHandler,
  recordAgentInteraction,
  getKeyAccessStatus,
  adminDisconnectSessionHandler,
  adminDisconnectAllSessionsHandler,
  adminSuspendKeyHandler,
  adminReactivateKeyHandler,
  adminBanKeyHandler,
  adminUnlinkKeyHandler,
  adminGetAccessHistoryHandler,
  getAdminAccessKeysHandler,
  generateAccessKeysHandler,
  adminGetStudentHistoryHandler,
  adminGetActivityFeedHandler,
  recordSessionHistoryEvent,
  checkCodeKeyType,
  memorySessionsMap,
  getClientIp,
  parseUserAgent,
  PRESENCE_VERSION,
} from './server/presenceService.js';
import {
  getProfileBySessionCode,
  createChatProfile,
  updateChatProfile,
  getPublicProfile,
  getRooms,
  getRoomMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reportMessage,
  markRoomAsRead,
  getAdminReports,
  getAdminProfilesList,
  updateChatStatusByMentor,
  createOfficialNotice,
  getActiveNotice,
  setTypingStatus,
  getTypingUsers,
  pinMessage,
  getPinnedMessage,
  warnUserByMentor,
  getUnreadCountForProfile,
  toggleReaction,
  getUnreadMentionsCount,
  markMentionsAsRead,
  getCommunityMembersListForAutocomplete,
  createPoll,
  votePoll,
  getActivePoll,
  toggleFavoriteMessage,
  getUserFavoriteMessages,
  getOnlineMembersDrawerList,
  getCommunityRanking,
  getCommunityStats,
} from './server/chatService.js';
import { chatExtraRouter } from './server/chatExtraRoutes.js';
import { processAndUploadMedia } from './server/chatMediaService.js';

dotenv.config();

console.log('[SERVER BUILD VERSION]', PRESENCE_VERSION);

// Startup validation of keys count
const { masterCount, studentCount, totalCount } = verifyLoadedKeysCount();
console.log(`Chaves mestras carregadas: ${masterCount}`);
console.log(`Chaves de alunos carregadas: ${studentCount}`);
console.log(`Total de chaves carregadas: ${totalCount}`);

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

const PORT = 3000;

// Lazy initialization of Gemini client
function getGeminiClient(customApiKey?: string) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({ apiKey });
}

const apiRouter = express.Router();
apiRouter.use(chatExtraRouter);

// Health check endpoint
apiRouter.get(['/health', '/api/health'], (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// MySQL Database status route
apiRouter.get(['/database/status', '/api/database/status'], async (_req, res) => {
  try {
    const isConnected = await testDatabaseConnection();
    if (isConnected) {
      return res.json({
        databaseConnected: true,
        database: 'mysql',
        host: 'hostinger',
      });
    } else {
      return res.status(500).json({
        databaseConnected: false,
        error: 'DATABASE_CONNECTION_ERROR',
      });
    }
  } catch (err: any) {
    console.error('[Database Status Endpoint Error]:', err?.message || 'Error checking database status');
    return res.status(500).json({
      databaseConnected: false,
      error: 'DATABASE_CONNECTION_ERROR',
    });
  }
});

// Diagnostic Endpoint for keys and MySQL connection
apiRouter.get(['/auth/status', '/api/auth/status'], async (_req, res) => {
  try {
    const { masterCount, studentCount } = verifyLoadedKeysCount();
    let dbConnected = false;
    let masterKeysCount = masterCount;
    let studentKeysCount = studentCount;

    if (isDatabaseConfigured()) {
      try {
        const [masterRows]: any = await db.query('SELECT COUNT(*) AS count FROM chaves_mestras');
        const [studentRows]: any = await db.query('SELECT COUNT(*) AS count FROM codigos_acesso');

        dbConnected = true;
        if (Array.isArray(masterRows) && masterRows[0]) {
          masterKeysCount = Number(masterRows[0].count);
        }
        if (Array.isArray(studentRows) && studentRows[0]) {
          studentKeysCount = Number(studentRows[0].count);
        }
      } catch (err: any) {
        console.warn('[Auth Status MySQL Error]:', err?.message || err);
      }
    }

    res.json({
      backendOnline: true,
      presenceVersion: PRESENCE_VERSION,
      databaseConnected: dbConnected,
      masterKeysLoaded: masterKeysCount,
      studentKeysLoaded: studentKeysCount,
      totalKeysLoaded: masterKeysCount + studentKeysCount,
      environment: process.env.VERCEL ? 'production' : 'development',
    });
  } catch (err: any) {
    res.status(500).json({
      backendOnline: false,
      error: 'AUTH_CONFIGURATION_ERROR',
      message: 'O sistema de autenticação não foi carregado corretamente.',
    });
  }
});

// Production build version endpoint
apiRouter.get(['/version', '/api/version'], (_req, res) => {
  res.json({
    success: true,
    presenceVersion: PRESENCE_VERSION,
    buildTimestamp: new Date().toISOString(),
    commit: '2026-08-01-final-disconnect-v1',
  });
});

// Diagnostic Endpoint for session status by code (Rule 17)
apiRouter.get(
  ['/session/status/:codigo', '/api/session/status/:codigo'],
  async (req, res) => {
    try {
      const codeParam = req.params.codigo;
      const cleanCode = normalizeAccessCode(codeParam);

      if (!cleanCode) {
        return res.status(400).json({
          sessionExists: false,
          isOnline: false,
          status: 'offline',
          expiresAt: null,
        });
      }

      if (isDatabaseConfigured()) {
        await ensureSessionsTable();
        const [rows]: any = await db.query(
          `SELECT active_session_id, is_online, status, expires_at
           FROM sessoes
           WHERE codigo = ?
           LIMIT 1`,
          [cleanCode]
        );

        if (Array.isArray(rows) && rows.length > 0) {
          const r = rows[0];
          const sessionExists = Boolean(
            r.active_session_id &&
            r.expires_at &&
            new Date(r.expires_at).getTime() > Date.now()
          );

          return res.json({
            sessionExists,
            isOnline: Boolean(r.is_online),
            status: r.status === 'online' ? 'online' : 'offline',
            expiresAt: r.expires_at ? new Date(r.expires_at).toISOString() : null,
          });
        }
      }

      return res.json({
        sessionExists: false,
        isOnline: false,
        status: 'offline',
        expiresAt: null,
      });
    } catch (err: any) {
      return res.status(500).json({
        sessionExists: false,
        isOnline: false,
        status: 'offline',
        expiresAt: null,
        error: 'DATABASE_ERROR',
      });
    }
  }
);

// Centralized Unified Login Handler with MySQL Transactions (Rules 5-12, 19, 20)
async function handleLogin(req: express.Request, res: express.Response) {
  const receivedCode =
    req.body?.accessCode ??
    req.body?.studentAccessCode ??
    req.body?.accessKey ??
    req.body?.code ??
    req.headers['x-access-code'] ??
    req.headers['x-student-access-code'];

  const deviceId = (req.headers['x-client-device-id'] as string) || (req.body && req.body.deviceId);
  const existingSessionId = (req.headers['x-session-id'] as string) || (req.body && req.body.sessionId);

  if (!receivedCode || String(receivedCode).trim() === '') {
    return res.status(400).json({
      error: 'ACCESS_CODE_REQUIRED',
      message: 'Informe o código de acesso.',
    });
  }

  const cleanCode = normalizeAccessCode(receivedCode);
  const maskedCode = maskCodeForLogs(cleanCode);

  let keyType = 'INVALID';
  try {
    keyType = await checkCodeKeyType(cleanCode);
  } catch (err) {
    console.error('[Auth Login Key Check Error]:', err);
    return res.status(500).json({
      error: 'SESSION_DATABASE_ERROR',
      message: 'Não foi possível conectar ao servidor de autenticação. Tente novamente em alguns instantes.',
    });
  }

  // Rule 3: Master Keys can enter on multiple devices and MUST NOT be saved in sessoes table
  if (keyType === 'MASTER') {
    const masterSessionId = existingSessionId || 'MASTER-SESSION-' + crypto.randomUUID();
    console.log(`[AUTH LOG] type=MASTER masked=${maskedCode} sessionFound=false sessionValid=false recorded=false http=200`);
    return res.status(200).json({
      success: true,
      status: 'ok',
      isMaster: true,
      role: 'mentor',
      message: 'Acesso autorizado.',
      sessionId: masterSessionId,
      activeSessionId: masterSessionId,
      onlineDevices: '1/1',
    });
  }

  // Student Keys: strictly ONE active session (Rules 4-11, 19-20)
  if (keyType === 'STUDENT') {
    const keyStatusInfo = await getKeyAccessStatus(cleanCode);
    if (keyStatusInfo.accessStatus === 'SUSPENDED') {
      memorySessionsMap.delete(cleanCode);
      return res.status(423).json({
        error: 'KEY_SUSPENDED',
        accessStatus: 'SUSPENDED',
        title: 'Acesso temporariamente suspenso',
        message: 'Sua chave de acesso está temporariamente suspensa pelo Mentor. Entre em contato com o suporte caso tenha dúvidas.',
        reason: keyStatusInfo.reason || 'Suspensa pelo Mentor',
      });
    }
    if (keyStatusInfo.accessStatus === 'BANNED') {
      memorySessionsMap.delete(cleanCode);
      return res.status(403).json({
        error: 'KEY_BANNED',
        title: 'Acesso permanentemente bloqueado',
        message: 'Esta chave de acesso foi banida pelo Mentor e não pode mais ser utilizada. Caso acredite que isso ocorreu por engano, entre em contato com o suporte da Mentoria Geração Z Pro.',
        reason: keyStatusInfo.reason || 'Banida pelo Mentor',
      });
    }

    if (isDatabaseConfigured()) {
      let connection: any = null;
      let transactionStarted = false;
      try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;

        // Lock row during check
        const [rows]: any = await connection.query(
          `SELECT codigo, active_session_id, device_id, expires_at, is_online, status
           FROM sessoes
           WHERE codigo = ?
           FOR UPDATE`,
          [cleanCode]
        );

        const sessionFound = Array.isArray(rows) && rows.length > 0;
        let activeSessionValid = false;
        let activeSessionIdInDb: string | null = null;
        let deviceIdInDb: string | null = null;

        if (sessionFound) {
          const r = rows[0];
          activeSessionIdInDb = r.active_session_id || null;
          deviceIdInDb = r.device_id || null;
          if (r.active_session_id && r.expires_at) {
            const expiresAtTime = new Date(r.expires_at).getTime();
            if (expiresAtTime > Date.now()) {
              activeSessionValid = true;
            }
          }
        }

        // Same Device or Same Session check:
        const isSameDevice = Boolean(
          (deviceIdInDb && deviceId && deviceIdInDb === deviceId) ||
          (activeSessionIdInDb && existingSessionId && activeSessionIdInDb === existingSessionId)
        );

        // Active session exists and valid on another device -> 409 Conflict
        if (activeSessionValid && activeSessionIdInDb && !isSameDevice) {
          await connection.rollback();
          transactionStarted = false;

          console.log(`[AUTH LOG] type=STUDENT masked=${maskedCode} sessionFound=${sessionFound} sessionValid=true recorded=false http=409`);

          return res.status(409).json({
            error: 'SESSION_ALREADY_ACTIVE',
            message: 'Esta chave já está sendo utilizada em outro dispositivo. Clique em Sair no aparelho anterior ou solicite ao Mentor a desconexão da sessão.',
          });
        }

        // If session is no longer active in DB, and client is attempting auto-verification of an old disconnected session ID -> 401 Disconnected
        if (!activeSessionValid && existingSessionId && !req.body?.isNewLogin) {
          await connection.rollback();
          transactionStarted = false;
          memorySessionsMap.delete(cleanCode);

          console.log(`[AUTH LOG] type=STUDENT masked=${maskedCode} sessionFound=${sessionFound} sessionValid=false rejectedDisconnected=true http=401`);

          return res.status(401).json({
            error: 'ADMIN_DISCONNECTED',
            message: 'Sua sessão foi encerrada pelo Mentor. Efetue login novamente.',
          });
        }

        // Reuse activeSessionIdInDb if valid on same device, or generate fresh UUID for new login
        const sessionId = (activeSessionValid && activeSessionIdInDb)
          ? activeSessionIdInDb
          : crypto.randomUUID();

        const effectiveDeviceId = deviceId || deviceIdInDb || `device-${sessionId.slice(0, 8)}`;

        const clientIp = getClientIp(req);
        const rawUa = (req.headers['user-agent'] as string) || '';
        const { deviceType, operatingSystem, browserName } = parseUserAgent(rawUa);

        // Insert or Update with 30-day expiration
        await connection.query(
          `INSERT INTO sessoes (
             codigo,
             active_session_id,
             device_id,
             login_at,
             session_started_at,
             last_heartbeat_at,
             expires_at,
             is_online,
             status,
             ip_address,
             user_agent,
             device_type,
             browser_name,
             operating_system
           )
           VALUES (?, ?, ?, NOW(), NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY), 1, 'online', ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             active_session_id = VALUES(active_session_id),
             device_id = VALUES(device_id),
             login_at = NOW(),
             session_started_at = NOW(),
             last_heartbeat_at = NOW(),
             expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY),
             is_online = 1,
             status = 'online',
             logout_at = NULL,
             disconnected_at = NULL,
             disconnect_source = NULL,
             ip_address = COALESCE(NULLIF(VALUES(ip_address), ''), ip_address),
             user_agent = COALESCE(NULLIF(VALUES(user_agent), ''), user_agent),
             device_type = CASE WHEN VALUES(device_type) IS NOT NULL AND VALUES(device_type) != '' AND VALUES(device_type) != 'Desconhecido' THEN VALUES(device_type) ELSE device_type END,
             browser_name = CASE WHEN VALUES(browser_name) IS NOT NULL AND VALUES(browser_name) != '' AND VALUES(browser_name) != 'Desconhecido' THEN VALUES(browser_name) ELSE browser_name END,
             operating_system = CASE WHEN VALUES(operating_system) IS NOT NULL AND VALUES(operating_system) != '' AND VALUES(operating_system) != 'Desconhecido' THEN VALUES(operating_system) ELSE operating_system END`,
          [cleanCode, sessionId, effectiveDeviceId, clientIp, rawUa, deviceType, browserName, operatingSystem]
        );

        try {
          await connection.query(
            `UPDATE codigos_acesso SET usado = 1 WHERE codigo = ?`,
            [cleanCode]
          );
        } catch (uErr) {
          console.warn('[Mark Key Used Error]:', uErr);
        }

        // Commit transaction
        await connection.commit();
        transactionStarted = false;

        // Sync session to memorySessionsMap for fast heartbeat fallback
        const now = new Date();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        memorySessionsMap.set(cleanCode, {
          codigo: cleanCode,
          sessionId,
          deviceId: effectiveDeviceId,
          currentPage: (req.body?.currentPage && String(req.body.currentPage).trim() !== '') ? String(req.body.currentPage).trim() : 'TikTok 2K',
          ipAddress: getClientIp(req),
          userAgent: (req.headers['user-agent'] as string) || '',
          deviceType,
          browserName,
          operatingSystem,
          startedAt: now,
          lastHeartbeatAt: now,
          status: 'online',
          expiresAt,
        });

        // Record history event
        recordSessionHistoryEvent({
          codigo: cleanCode,
          sessionId,
          eventType: 'LOGIN',
          page: (req.body?.currentPage && String(req.body.currentPage).trim() !== '') ? String(req.body.currentPage).trim() : 'TikTok 2K',
          device: `${operatingSystem} • ${browserName}`,
          ip: clientIp,
          details: 'Aluno efetuou login no sistema',
        }).catch(() => {});

        console.log(`[AUTH LOG] type=STUDENT masked=${maskedCode} sessionFound=${sessionFound} sessionValid=${activeSessionValid} recorded=true http=200`);

        return res.status(200).json({
          success: true,
          status: 'ok',
          bound: true,
          isMaster: false,
          role: 'student',
          message: 'Acesso autorizado.',
          sessionId,
          onlineDevices: '1/1',
        });
      } catch (dbErr: any) {
        if (connection && transactionStarted) {
          try { await connection.rollback(); } catch (e) {}
          transactionStarted = false;
        }
        console.error('[PROFILE DB ERROR]', 'code:', dbErr?.code, 'errno:', dbErr?.errno, 'sqlState:', dbErr?.sqlState, 'message:', dbErr?.message || dbErr);
        return res.status(500).json({
          error: 'SESSION_DATABASE_ERROR',
          message: 'O banco de dados está temporariamente sobrecarregado. Aguarde alguns minutos e tente novamente.',
        });
      } finally {
        if (connection) {
          try { connection.release(); } catch (e) {}
        }
      }
    } else {
      // Fallback if MySQL is not configured
      const memSession = memorySessionsMap.get(cleanCode);
      const isMemValid = Boolean(memSession && memSession.expiresAt && memSession.expiresAt.getTime() > Date.now());
      const isMemSameDevice = Boolean(
        memSession && (
          (memSession.deviceId && deviceId && memSession.deviceId === deviceId) ||
          (memSession.sessionId && existingSessionId && memSession.sessionId === existingSessionId)
        )
      );

      if (isMemValid && !isMemSameDevice) {
        return res.status(409).json({
          error: 'SESSION_ALREADY_ACTIVE',
          message: 'Esta chave já está sendo utilizada em outro dispositivo. Clique em Sair no aparelho anterior ou solicite ao Mentor a desconexão da sessão.',
        });
      }

      if (!isMemValid && existingSessionId && !req.body?.isNewLogin) {
        memorySessionsMap.delete(cleanCode);
        return res.status(401).json({
          error: 'ADMIN_DISCONNECTED',
          message: 'Sua sessão foi encerrada pelo Mentor. Efetue login novamente.',
        });
      }

      const sessionId = (isMemValid && memSession?.sessionId) ? memSession.sessionId : crypto.randomUUID();
      const effectiveDeviceId = deviceId || memSession?.deviceId || `device-${sessionId.slice(0, 8)}`;
      const now = new Date();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const { deviceType, operatingSystem, browserName } = parseUserAgent(req.headers['user-agent'] || '');

      memorySessionsMap.set(cleanCode, {
        codigo: cleanCode,
        sessionId,
        deviceId: effectiveDeviceId,
        currentPage: (req.body?.currentPage && String(req.body.currentPage).trim() !== '') ? String(req.body.currentPage).trim() : 'TikTok 2K',
        ipAddress: getClientIp(req),
        userAgent: (req.headers['user-agent'] as string) || '',
        deviceType,
        browserName,
        operatingSystem,
        startedAt: memSession?.startedAt || now,
        lastHeartbeatAt: now,
        status: 'online',
        expiresAt,
      });

      return res.status(200).json({
        success: true,
        status: 'ok',
        bound: true,
        isMaster: false,
        role: 'student',
        message: 'Acesso autorizado.',
        sessionId,
        onlineDevices: '1/1',
      });
    }
  }

  // Invalid code
  console.log(`[AUTH LOG] type=INVALID masked=${maskedCode} sessionFound=false sessionValid=false recorded=false http=401`);
  return res.status(401).json({
    error: 'INVALID_ACCESS_CODE',
    message: 'Código de acesso inválido. Verifique o código informado e tente novamente.',
  });
}

// Login Routes
apiRouter.post(
  [
    '/auth/login',
    '/api/auth/login',
    '/verify-code',
    '/api/verify-code',
    '/session/verify',
    '/api/session/verify',
  ],
  handleLogin
);

// Logout Route (Rule 13)
apiRouter.post(
  [
    '/auth/logout',
    '/api/auth/logout',
    '/logout',
    '/api/logout',
    '/session/logout',
    '/api/session/logout',
    '/unbind',
    '/api/unbind',
  ],
  async (req, res) => {
    try {
      let studentCode =
        req.body?.accessCode ??
        req.body?.studentAccessCode ??
        req.body?.accessKey ??
        req.body?.code ??
        req.headers['x-access-code'] ??
        req.headers['x-student-access-code'];

      let sessionId = (req.headers['x-session-id'] as string) || (req.body && req.body.sessionId);

      if (req.body && typeof req.body === 'string') {
        try {
          const parsed = JSON.parse(req.body);
          studentCode = studentCode || parsed.accessCode || parsed.studentAccessCode;
          sessionId = sessionId || parsed.sessionId;
        } catch (e) {}
      }

      const cleanCode = normalizeAccessCode(studentCode);
      const keyType = await checkCodeKeyType(cleanCode);

      if (cleanCode) {
        memorySessionsMap.delete(cleanCode);
      }

      if (cleanCode && keyType === 'STUDENT' && isDatabaseConfigured()) {
        try {
          await ensureSessionsTable();
          if (sessionId) {
            await db.query(
              `UPDATE sessoes
               SET
                 active_session_id = NULL,
                 device_id = NULL,
                 is_online = 0,
                 status = 'offline',
                 logout_at = NOW()
               WHERE codigo = ?
               AND active_session_id = ?`,
              [cleanCode, sessionId]
            );
          } else {
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
        } catch (dbErr: any) {
          console.warn('[MySQL Logout Error]:', dbErr?.message || dbErr);
        }
      }

      return res.json({ status: 'unbound', message: 'Sessão encerrada com sucesso.' });
    } catch (err: any) {
      return res.status(500).json({
        error: 'SESSION_DATABASE_ERROR',
        message: 'O servidor de autenticação está temporariamente indisponível.',
      });
    }
  }
);

// Heartbeat & Presence Routes
apiRouter.post(
  [
    '/presence/heartbeat',
    '/api/presence/heartbeat',
    '/auth/heartbeat',
    '/api/auth/heartbeat',
    '/session/heartbeat',
    '/api/session/heartbeat',
  ],
  presenceHeartbeatHandler
);

apiRouter.post(
  [
    '/presence/logout',
    '/api/presence/logout',
  ],
  presenceLogoutHandler
);

// Middleware Helper to validate active session on AI requests
async function validateSessionAsync(req: express.Request, res: express.Response): Promise<boolean> {
  try {
    const studentCode =
      req.body?.accessCode ??
      req.body?.studentAccessCode ??
      req.body?.accessKey ??
      req.body?.code ??
      req.headers['x-access-code'] ??
      req.headers['x-student-access-code'];

    const sessionId = (req.headers['x-session-id'] as string) || (req.body && req.body.sessionId);

    const cleanCode = normalizeAccessCode(studentCode);
    const keyType = await checkCodeKeyType(cleanCode);

    if (keyType === 'INVALID') {
      res.status(401).json({
        error: 'INVALID_ACCESS_CODE',
        message: 'O código informado é inválido.',
      });
      return false;
    }

    if (keyType === 'MASTER') {
      return true;
    }

    const keyInfo = await getKeyAccessStatus(cleanCode);
    if (keyInfo.accessStatus === 'SUSPENDED') {
      memorySessionsMap.delete(cleanCode);
      res.status(423).json({
        error: 'KEY_SUSPENDED',
        accessStatus: 'SUSPENDED',
        title: 'Acesso temporariamente suspenso',
        message: 'Seu acesso está temporariamente suspenso. Entre em contato com o suporte.',
      });
      return false;
    }
    if (keyInfo.accessStatus === 'BANNED') {
      memorySessionsMap.delete(cleanCode);
      res.status(403).json({
        error: 'KEY_BANNED',
        message: 'Esta chave de acesso não está disponível. Entre em contato com o suporte.',
      });
      return false;
    }

    if (!sessionId) {
      res.status(401).json({
        error: 'SESSION_REQUIRED',
        message: 'Sessão não informada. Efetue login novamente.',
      });
      return false;
    }

    if (isDatabaseConfigured()) {
      try {
        await ensureSessionsTable();
        const [rows]: any = await db.query(
          `SELECT active_session_id, expires_at FROM sessoes WHERE codigo = ? LIMIT 1`,
          [cleanCode]
        );

        if (Array.isArray(rows) && rows.length > 0) {
          const r = rows[0];
          if (r.active_session_id === sessionId && r.expires_at && new Date(r.expires_at).getTime() > Date.now()) {
            return true;
          }
          if (r.active_session_id && r.active_session_id !== sessionId) {
            res.status(409).json({
              error: 'SESSION_ALREADY_ACTIVE',
              message: 'Esta chave já está sendo utilizada em outro dispositivo. Clique em Sair no aparelho anterior ou solicite ao Mentor a desconexão da sessão.',
            });
            return false;
          }
        }
      } catch (dbErr) {
        console.warn('[validateSessionAsync DB Warning - fallback to memory]:', dbErr);
      }
    }

    // Fallback to memorySessionsMap
    const memSession = memorySessionsMap.get(cleanCode);
    if (memSession && memSession.sessionId === sessionId) {
      if (!memSession.expiresAt || memSession.expiresAt.getTime() > Date.now()) {
        return true;
      }
    }

    res.status(401).json({
      error: 'SESSION_EXPIRED',
      message: 'Sessão expirada. Efetue login novamente.',
    });
    return false;
  } catch (err) {
    res.status(500).json({
      error: 'SESSION_DATABASE_ERROR',
      message: 'O servidor de autenticação está temporariamente indisponível.',
    });
    return false;
  }
}

// Helper to call Gemini with model fallback across supported public models
async function generateContentWithFallback(ai: GoogleGenAI, params: { contents: any; config?: any }) {
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-lite'];
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

// Helper to format Gemini error messages into clear, friendly Portuguese text
function handleGeminiError(err: any, res: express.Response) {
  const msg = typeof err === 'string' ? err : (err?.message || JSON.stringify(err || ''));
  if (msg.includes('GEMINI_API_KEY_MISSING')) {
    return res.status(400).json({
      error: 'Nenhuma Chave API do Gemini foi fornecida. Por favor, insira sua chave do Google AI Studio no botão "Inserir Chave API".',
    });
  }
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota exceeded')) {
    return res.status(429).json({
      error: 'Limite de requisições / cota da API do Gemini excedida. Por favor, aguarde alguns segundos ou insira sua própria Chave API no botão "Inserir Chave API".',
    });
  }
  if (msg.includes('API_KEY_INVALID') || msg.includes('401') || msg.includes('API key not valid')) {
    return res.status(401).json({
      error: 'A Chave API do Gemini é inválida. Por favor, verifique a chave inserida no botão "Inserir Chave API".',
    });
  }
  return res.status(500).json({
    error: `Erro no serviço de IA: ${msg || 'Erro desconhecido ao comunicar com a IA.'}`,
  });
}

// Chat endpoint for agent execution
apiRouter.post('/chat', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (!(await validateSessionAsync(req, res))) return;

  try {
    const { systemInstruction, messages, temperature = 0.7, customApiKey } = req.body;
    const headerApiKey = req.headers['x-gemini-api-key'] as string;
    const apiKeyToUse = (headerApiKey || customApiKey || '').trim();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Nenhuma mensagem enviada.' });
    }

    const ai = getGeminiClient(apiKeyToUse);

    const contents = messages.map((msg: { role: string; content?: string; image?: string }) => {
      const parts: any[] = [];

      if (msg.image) {
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

    const response = await generateContentWithFallback(ai, {
      contents: contents,
      config: {
        systemInstruction: systemInstruction || 'Você é um assistente de IA prestativo e amigável.',
        temperature: Number(temperature) || 0.7,
      },
    });

    const replyText = response.text || 'Desculpe, não consegui gerar uma resposta no momento.';

    // Record interaction for real stats
    const studentCode =
      req.body?.accessCode ??
      req.body?.studentAccessCode ??
      req.body?.accessKey ??
      req.body?.code ??
      req.headers['x-access-code'] ??
      req.headers['x-student-access-code'];
    const agId = req.body?.agentId || req.body?.agent?.id || 'agente-gpt';
    const agName = req.body?.agentName || req.body?.agent?.name || 'Agente GPT';
    const agCategory = req.body?.category || req.body?.agent?.category || 'TikTok Shop';

    recordAgentInteraction(
      String(studentCode || ''),
      String(agId),
      String(agName),
      String(agCategory),
      'AGENT_MESSAGE'
    );

    res.json({ reply: replyText });
  } catch (err: any) {
    console.error('Error in /api/chat:', err);
    return handleGeminiError(err, res);
  }
});

// Endpoint for recording agent interactions (open agent / message sent)
apiRouter.post('/presence/agent-event', async (req, res) => {
  try {
    const studentCode =
      req.body?.accessCode ??
      req.body?.studentAccessCode ??
      req.body?.accessKey ??
      req.body?.code ??
      req.headers['x-access-code'] ??
      req.headers['x-student-access-code'];
    const agId = req.body?.agentId || 'agente-pro';
    const agName = req.body?.agentName || 'Agente Pro';
    const agCategory = req.body?.agentCategory || req.body?.category || 'TikTok Shop';
    const actionType = req.body?.action === 'AGENT_OPEN' ? 'AGENT_OPEN' : 'AGENT_MESSAGE';

    await recordAgentInteraction(
      String(studentCode || ''),
      String(agId),
      String(agName),
      String(agCategory),
      actionType
    );

    res.json({ ok: true });
  } catch (err: any) {
    console.error('Error in /api/presence/agent-event:', err);
    res.status(500).json({ error: 'FAILED_TO_RECORD_AGENT_EVENT' });
  }
});

// AI Agent Generator endpoint
apiRouter.post('/generate-agent', async (req, res) => {
  if (!(await validateSessionAsync(req, res))) return;

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

    const response = await generateContentWithFallback(ai, {
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
    return handleGeminiError(err, res);
  }
});

// Multi-Agent Collaboration Endpoint
apiRouter.post('/multi-agent', async (req, res) => {
  if (!(await validateSessionAsync(req, res))) return;

  try {
    const { taskPrompt, agents, customApiKey } = req.body;
    const headerApiKey = req.headers['x-gemini-api-key'] as string;
    const apiKeyToUse = headerApiKey || customApiKey;

    if (!taskPrompt || !agents || !Array.isArray(agents) || agents.length < 2) {
      return res.status(400).json({ error: 'Selecione pelo menos 2 agentes e forneça uma tarefa.' });
    }

    const ai = getGeminiClient(apiKeyToUse);

    const conversationTrail: { agentName: string; content: string }[] = [];

    for (const agent of agents) {
      const historyContext = conversationTrail
        .map((step) => `[Contribuição anterior de ${step.agentName}]:\n${step.content}`)
        .join('\n\n');

      const fullPrompt = `TAREFA PRINCIPAL DO USUÁRIO:
${taskPrompt}

${historyContext ? `HISTÓRICO DE RESPOSTAS DOS OUTROS AGENTES:\n${historyContext}\n\nSua vez de contribuir com base nas respostas acima e na sua especialização.` : 'Sua vez de dar a primeira contribuição especializada para a tarefa acima.'}`;

      const response = await generateContentWithFallback(ai, {
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
    return handleGeminiError(err, res);
  }
});

// ==================================================
// PRODUCTS & MENTOR ADMIN BACKEND ROUTES
// ==================================================

// Fallback in-memory product store for development when DB is not configured
let memoryProducts = [
  { id: 1, nome: 'Bolsa Feminina Elegante', categoria: 'Moda e Acessórios', pasta: 'bolsa-feminina-elegante', imagem_principal: 'https://midia.geracaozpro.com/produtos/bolsa-feminina-elegante/1.jpg', ativo: 1, nivel: 'Facil', xp: 25, criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() },
  { id: 2, nome: 'Escova Secadora Multifuncional', categoria: 'Beleza e Cuidados', pasta: 'escova-secadora-multifuncional', imagem_principal: 'https://midia.geracaozpro.com/produtos/escova-secadora-multifuncional/1.jpg', ativo: 1, nivel: 'Facil', xp: 25, criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() },
  { id: 3, nome: 'Mini Processador Elétrico', categoria: 'Casa e Cozinha', pasta: 'mini-processador-eletrico', imagem_principal: 'https://midia.geracaozpro.com/produtos/mini-processador-eletrico/1.jpg', ativo: 1, nivel: 'Facil', xp: 25, criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() },
  { id: 4, nome: 'Smartwatch Ultra Series', categoria: 'Eletrônicos e Gadgets', pasta: 'smartwatch-ultra-series', imagem_principal: 'https://midia.geracaozpro.com/produtos/smartwatch-ultra-series/1.jpg', ativo: 1, nivel: 'Facil', xp: 25, criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() },
  { id: 5, nome: 'Luminária Sunset LED', categoria: 'Decoração e Casa', pasta: 'luminaria-sunset-led', imagem_principal: 'https://midia.geracaozpro.com/produtos/luminaria-sunset-led/1.jpg', ativo: 1, nivel: 'Facil', xp: 25, criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString() },
];

// Helper Middleware to protect Mentor Admin Routes (Rule 8 & Security)
async function requireMentorAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const code =
      req.headers['x-access-code'] ||
      req.headers['x-student-access-code'] ||
      req.headers['x-master-key'] ||
      req.headers['authorization']?.replace(/^Bearer\s+/i, '') ||
      req.body?.accessCode ||
      req.body?.accessKey ||
      req.query?.accessCode;

    const cleanCode = normalizeAccessCode(code);
    if (!cleanCode) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Acesso não autorizado. Chave de acesso não informada.',
      });
    }

    const keyType = await checkCodeKeyType(cleanCode);

    if (keyType === 'MASTER') {
      return next();
    }

    if (keyType === 'STUDENT') {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Acesso negado. Apenas mentores possuem permissão para acessar esta funcionalidade.',
      });
    }

    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Chave de acesso inválida.',
    });
  } catch (err) {
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro interno ao validar credenciais do mentor.',
    });
  }
}

// RANKING & STUDENT PROGRESS ROUTES
apiRouter.get(['/ranking', '/api/ranking'], getGlobalRankingHandler);
apiRouter.get(['/ranking/me', '/api/ranking/me', '/player/stats', '/api/player/stats'], getUserRankingStatsHandler);
apiRouter.post(['/player/progress', '/api/player/progress', '/ranking/round', '/api/ranking/round'], syncPlayerProgressHandler);

// STUDENT PROFILE ROUTES
apiRouter.get(['/student/profile', '/api/student/profile'], getStudentProfileHandler);
apiRouter.get(['/student/profile/check-username', '/api/student/profile/check-username'], checkUsernameHandler);
apiRouter.post(['/student/profile', '/api/student/profile'], createStudentProfileHandler);
apiRouter.patch(['/student/profile/username', '/api/student/profile/username'], updateUsernameHandler);

// MENTOR STUDENT MANAGEMENT ROUTE
apiRouter.get(['/mentor/students', '/api/mentor/students'], requireMentorAuth, getMentorStudentsHandler);

// PUBLIC ROUTE FOR ACADEMIA DE DESAFIOS: GET /api/products
apiRouter.get(['/products', '/api/products'], async (_req, res) => {
  try {
    if (isDatabaseConfigured()) {
      await ensureProductsTable();
      const [rows]: any = await db.query(
        `SELECT id, nome, categoria, imagem_principal AS imagem, nivel, xp
         FROM produtos
         WHERE ativo = 1
         ORDER BY id DESC`
      );

      if (Array.isArray(rows)) {
        const formatted = rows.map((r: any) => ({
          id: r.id,
          nome: r.nome,
          categoria: r.categoria,
          imagem: r.imagem_principal || r.imagem,
          nivel: r.nivel || 'Facil',
          xp: Number(r.xp) || 25,
        }));
        return res.json(formatted);
      }
    }

    // In-memory fallback if DB not configured
    const activeMemory = memoryProducts
      .filter((p) => Number(p.ativo) === 1)
      .map((p) => ({
        id: p.id,
        nome: p.nome,
        categoria: p.categoria,
        imagem: p.imagem_principal,
        nivel: p.nivel,
        xp: p.xp,
      }));

    return res.json(activeMemory);
  } catch (err: any) {
    console.error('[Get Active Products Error]:', err?.message || err);
    return res.status(500).json({
      error: 'DATABASE_ERROR',
      message: 'Não foi possível carregar a Biblioteca de Produtos.',
    });
  }
});

// ADMIN ROUTES (PROTECTED BY requireMentorAuth)

// Presence & Member Monitoring Stats
apiRouter.get(['/admin/member-stats', '/api/admin/member-stats'], requireMentorAuth, getAdminMemberStatsHandler);
apiRouter.get(['/admin/online-users', '/api/admin/online-users'], requireMentorAuth, getAdminOnlineUsersHandler);
apiRouter.get(['/admin/member-count', '/api/admin/member-count'], requireMentorAuth, getAdminMemberCountHandler);
apiRouter.get(['/admin/stats', '/api/admin/stats'], requireMentorAuth, getAdminStatsHandler);

// Administrative Session & Access Key Actions (Master Session Only)
apiRouter.post(['/admin/users/disconnect-all', '/api/admin/users/disconnect-all', '/users/disconnect-all'], requireMentorAuth, adminDisconnectAllSessionsHandler);
apiRouter.post(['/admin/users/:id/disconnect', '/api/admin/users/:id/disconnect', '/admin/users/disconnect', '/api/admin/users/disconnect'], requireMentorAuth, adminDisconnectSessionHandler);
apiRouter.post(['/admin/access-keys/:id/suspend', '/api/admin/access-keys/:id/suspend', '/admin/access-keys/suspend', '/api/admin/access-keys/suspend'], requireMentorAuth, adminSuspendKeyHandler);
apiRouter.post(['/admin/access-keys/:id/reactivate', '/api/admin/access-keys/:id/reactivate', '/admin/access-keys/reactivate', '/api/admin/access-keys/reactivate'], requireMentorAuth, adminReactivateKeyHandler);
apiRouter.post(['/admin/access-keys/:id/ban', '/api/admin/access-keys/:id/ban', '/admin/access-keys/ban', '/api/admin/access-keys/ban'], requireMentorAuth, adminBanKeyHandler);
apiRouter.post(['/admin/access-keys/:id/unlink', '/api/admin/access-keys/:id/unlink', '/admin/access-keys/unlink', '/api/admin/access-keys/unlink'], requireMentorAuth, adminUnlinkKeyHandler);
apiRouter.delete(['/admin/access-keys/:id/unlink', '/api/admin/access-keys/:id/unlink', '/admin/access-keys/unlink', '/api/admin/access-keys/unlink'], requireMentorAuth, adminUnlinkKeyHandler);
apiRouter.get(['/admin/access-keys/:id/history', '/api/admin/access-keys/:id/history', '/admin/access-keys/history', '/api/admin/access-keys/history'], requireMentorAuth, adminGetAccessHistoryHandler);
apiRouter.get(['/admin/access-keys', '/api/admin/access-keys'], requireMentorAuth, getAdminAccessKeysHandler);
apiRouter.post(['/admin/access-keys/generate', '/api/admin/access-keys/generate'], requireMentorAuth, generateAccessKeysHandler);
apiRouter.get(['/admin/student-history/:idOrCode', '/api/admin/student-history/:idOrCode', '/admin/student-history', '/api/admin/student-history'], requireMentorAuth, adminGetStudentHistoryHandler);
apiRouter.get(['/admin/activity-feed', '/api/admin/activity-feed'], requireMentorAuth, adminGetActivityFeedHandler);

// 1. GET /api/admin/products
apiRouter.get(['/admin/products', '/api/admin/products'], requireMentorAuth, async (_req, res) => {
  try {
    if (isDatabaseConfigured()) {
      await ensureProductsTable();
      const [rows]: any = await db.query(
        `SELECT id, nome, categoria, pasta, imagem_principal, ativo, nivel, xp, criado_em, atualizado_em
         FROM produtos
         ORDER BY id DESC`
      );
      if (Array.isArray(rows)) {
        return res.json(rows);
      }
    }

    return res.json(memoryProducts);
  } catch (err: any) {
    console.error('[Admin GET Products Error]:', err?.message || err);
    return res.status(500).json({ error: 'DATABASE_ERROR', message: 'Erro ao listar produtos para administração.' });
  }
});

// 2. POST /api/admin/products
apiRouter.post(['/admin/products', '/api/admin/products'], requireMentorAuth, async (req, res) => {
  try {
    const { nome, categoria, pasta, imagem_principal, imagem, ativo = 1, nivel = 'Facil', xp = 25 } = req.body;

    const imgUrl = imagem_principal || imagem;
    if (!nome || !categoria || !pasta || !imgUrl) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Preencha todos os campos obrigatórios: Nome, Categoria, Pasta e URL da Imagem.',
      });
    }

    const cleanFolder = String(pasta).trim().toLowerCase().replace(/\s+/g, '-');
    const isAtivo = ativo === true || ativo === 1 || ativo === '1' ? 1 : 0;
    const cleanXp = Number(xp) || 25;
    const cleanNivel = ['Facil', 'Medio', 'Dificil'].includes(nivel) ? nivel : 'Facil';

    if (isDatabaseConfigured()) {
      await ensureProductsTable();
      const [result]: any = await db.query(
        `INSERT INTO produtos (nome, categoria, pasta, imagem_principal, ativo, nivel, xp)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [String(nome).trim(), String(categoria).trim(), cleanFolder, String(imgUrl).trim(), isAtivo, cleanNivel, cleanXp]
      );

      const insertedId = result.insertId;
      return res.status(201).json({
        id: insertedId,
        nome: String(nome).trim(),
        categoria: String(categoria).trim(),
        pasta: cleanFolder,
        imagem_principal: String(imgUrl).trim(),
        ativo: isAtivo,
        nivel: cleanNivel,
        xp: cleanXp,
      });
    }

    // In-memory fallback
    const newId = memoryProducts.length > 0 ? Math.max(...memoryProducts.map((p) => p.id)) + 1 : 1;
    const newProd = {
      id: newId,
      nome: String(nome).trim(),
      categoria: String(categoria).trim(),
      pasta: cleanFolder,
      imagem_principal: String(imgUrl).trim(),
      ativo: isAtivo,
      nivel: cleanNivel,
      xp: cleanXp,
      criado_em: new Date().toISOString(),
      atualizado_em: new Date().toISOString(),
    };
    memoryProducts.unshift(newProd);
    return res.status(201).json(newProd);
  } catch (err: any) {
    console.error('[Admin POST Product Error]:', err?.message || err);
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'DUPLICATE_PASTA', message: 'Já existe um produto cadastrado com esta pasta.' });
    }
    return res.status(500).json({ error: 'DATABASE_ERROR', message: 'Erro ao cadastrar produto.' });
  }
});

// 3. PUT /api/admin/products/:id
apiRouter.put(['/admin/products/:id', '/api/admin/products/:id'], requireMentorAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'INVALID_ID', message: 'ID do produto inválido.' });

    const { nome, categoria, pasta, imagem_principal, imagem, ativo, nivel = 'Facil', xp = 25 } = req.body;
    const imgUrl = imagem_principal || imagem;

    if (!nome || !categoria || !pasta || !imgUrl) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Preencha todos os campos obrigatórios: Nome, Categoria, Pasta e URL da Imagem.',
      });
    }

    const cleanFolder = String(pasta).trim().toLowerCase().replace(/\s+/g, '-');
    const isAtivo = ativo === true || ativo === 1 || ativo === '1' ? 1 : 0;
    const cleanXp = Number(xp) || 25;
    const cleanNivel = ['Facil', 'Medio', 'Dificil'].includes(nivel) ? nivel : 'Facil';

    if (isDatabaseConfigured()) {
      await ensureProductsTable();
      await db.query(
        `UPDATE produtos
         SET nome = ?, categoria = ?, pasta = ?, imagem_principal = ?, ativo = ?, nivel = ?, xp = ?
         WHERE id = ?`,
        [String(nome).trim(), String(categoria).trim(), cleanFolder, String(imgUrl).trim(), isAtivo, cleanNivel, cleanXp, id]
      );

      return res.json({
        id,
        nome: String(nome).trim(),
        categoria: String(categoria).trim(),
        pasta: cleanFolder,
        imagem_principal: String(imgUrl).trim(),
        ativo: isAtivo,
        nivel: cleanNivel,
        xp: cleanXp,
      });
    }

    // In-memory update
    const idx = memoryProducts.findIndex((p) => p.id === id);
    if (idx !== -1) {
      memoryProducts[idx] = {
        ...memoryProducts[idx],
        nome: String(nome).trim(),
        categoria: String(categoria).trim(),
        pasta: cleanFolder,
        imagem_principal: String(imgUrl).trim(),
        ativo: isAtivo,
        nivel: cleanNivel,
        xp: cleanXp,
        atualizado_em: new Date().toISOString(),
      };
      return res.json(memoryProducts[idx]);
    }

    return res.status(404).json({ error: 'NOT_FOUND', message: 'Produto não encontrado.' });
  } catch (err: any) {
    console.error('[Admin PUT Product Error]:', err?.message || err);
    return res.status(500).json({ error: 'DATABASE_ERROR', message: 'Erro ao atualizar produto.' });
  }
});

// 4. PATCH /api/admin/products/:id/status
apiRouter.patch(['/admin/products/:id/status', '/api/admin/products/:id/status'], requireMentorAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'INVALID_ID', message: 'ID do produto inválido.' });

    const { ativo } = req.body;
    const isAtivo = ativo === true || ativo === 1 || ativo === '1' ? 1 : 0;

    if (isDatabaseConfigured()) {
      await ensureProductsTable();
      await db.query(`UPDATE produtos SET ativo = ? WHERE id = ?`, [isAtivo, id]);
      return res.json({ id, ativo: isAtivo, message: 'Status do produto atualizado.' });
    }

    const item = memoryProducts.find((p) => p.id === id);
    if (item) {
      item.ativo = isAtivo;
      return res.json({ id, ativo: isAtivo, message: 'Status do produto atualizado.' });
    }

    return res.status(404).json({ error: 'NOT_FOUND', message: 'Produto não encontrado.' });
  } catch (err: any) {
    console.error('[Admin PATCH Product Status Error]:', err?.message || err);
    return res.status(500).json({ error: 'DATABASE_ERROR', message: 'Erro ao alterar status do produto.' });
  }
});

// 5. DELETE /api/admin/products/:id
apiRouter.delete(['/admin/products/:id', '/api/admin/products/:id'], requireMentorAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'INVALID_ID', message: 'ID do produto inválido.' });

    if (isDatabaseConfigured()) {
      await ensureProductsTable();
      await db.query(`DELETE FROM produtos WHERE id = ?`, [id]);
      return res.json({ id, success: true, message: 'Produto excluído com sucesso.' });
    }

    memoryProducts = memoryProducts.filter((p) => p.id !== id);
    return res.json({ id, success: true, message: 'Produto excluído com sucesso.' });
  } catch (err: any) {
    console.error('[Admin DELETE Product Error]:', err?.message || err);
    return res.status(500).json({ error: 'DATABASE_ERROR', message: 'Erro ao excluir produto.' });
  }
});

// Helper for extracting credentials from Chat requests
function extractChatCredentials(req: express.Request) {
  const accessCode =
    req.headers['x-access-code'] ||
    req.headers['x-student-access-code'] ||
    req.body?.accessCode ||
    req.body?.code ||
    req.query?.accessCode;

  const sessionId =
    req.headers['x-session-id'] ||
    req.body?.sessionId ||
    req.query?.sessionId;

  return {
    accessCode: String(accessCode || '').trim(),
    sessionId: String(sessionId || '').trim(),
  };
}

// ==================================================
// CHAT API ROUTES
// ==================================================

// GET /api/chat/profile
apiRouter.get(['/chat/profile', '/api/chat/profile'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sessão não identificada.' });
    }
    const { profile, isMentor } = await getProfileBySessionCode(accessCode);
    return res.json({
      hasProfile: Boolean(profile),
      profile,
      isMentor,
    });
  } catch (err: any) {
    console.error('[GET /api/chat/profile Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao buscar perfil do chat.' });
  }
});

// POST /api/chat/profile
apiRouter.post(['/chat/profile', '/api/chat/profile'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        field: 'session',
        message: 'Sessão não identificada.',
      });
    }
    const result = await createChatProfile(accessCode, req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'VALIDATION_ERROR',
        field: result.field || 'general',
        message: result.message || result.error || 'Erro ao validar o perfil.',
      });
    }
    return res.status(201).json({ success: true, profile: result.profile });
  } catch (err: any) {
    console.error('[PROFILE DB ERROR]', 'code:', err?.code, 'errno:', err?.errno, 'sqlState:', err?.sqlState, 'message:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'O banco de dados está temporariamente sobrecarregado. Aguarde alguns minutos e tente novamente.',
    });
  }
});

// PUT /api/chat/profile
apiRouter.put(['/chat/profile', '/api/chat/profile'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        field: 'session',
        message: 'Sessão não identificada.',
      });
    }
    const result = await updateChatProfile(accessCode, req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'VALIDATION_ERROR',
        field: result.field || 'general',
        message: result.message || result.error || 'Erro ao atualizar o perfil.',
      });
    }
    return res.json({ success: true, profile: result.profile });
  } catch (err: any) {
    console.error('[PROFILE DB ERROR]', 'code:', err?.code, 'errno:', err?.errno, 'sqlState:', err?.sqlState, 'message:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'O banco de dados está temporariamente sobrecarregado. Aguarde alguns minutos e tente novamente.',
    });
  }
});

// GET /api/chat/profiles/:id/public
apiRouter.get(['/chat/profiles/:id/public', '/api/chat/profiles/:id/public'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    const targetId = Number(req.params.id);
    if (!targetId) {
      return res.status(400).json({ error: 'INVALID_ID', message: 'ID do perfil inválido.' });
    }
    const publicProfile = await getPublicProfile(targetId, accessCode);
    if (!publicProfile) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Perfil não encontrado.' });
    }
    return res.json({ profile: publicProfile });
  } catch (err: any) {
    console.error('[GET /api/chat/profiles/:id/public Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao buscar dados do perfil.' });
  }
});

// GET /api/chat/rooms
apiRouter.get(['/chat/rooms', '/api/chat/rooms'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sessão não identificada.' });
    }
    const { profile } = await getProfileBySessionCode(accessCode);
    if (!profile) {
      return res.status(400).json({ error: 'NO_PROFILE', message: 'Perfil do chat não cadastrado.' });
    }
    const rooms = await getRooms(profile.id);
    return res.json({ rooms });
  } catch (err: any) {
    console.error('[GET /api/chat/rooms Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao buscar salas do chat.' });
  }
});

// GET /api/chat/rooms/:roomId/messages
apiRouter.get(['/chat/rooms/:roomId/messages', '/api/chat/rooms/:roomId/messages'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sessão não identificada.' });
    }
    const { profile } = await getProfileBySessionCode(accessCode);
    if (!profile) {
      return res.status(400).json({ error: 'NO_PROFILE', message: 'Perfil do chat não cadastrado.' });
    }

    const roomId = Number(req.params.roomId);
    const beforeId = req.query.beforeId ? Number(req.query.beforeId) : undefined;
    const afterId = req.query.afterId ? Number(req.query.afterId) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    const messages = await getRoomMessages(roomId, profile.id, { beforeId, afterId, limit });
    const notice = await getActiveNotice(roomId);

    return res.json({ messages, notice });
  } catch (err: any) {
    console.error('[GET /api/chat/rooms/:roomId/messages Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao buscar mensagens.' });
  }
});

// POST /api/chat/rooms/:roomId/messages
apiRouter.post(['/chat/rooms/:roomId/messages', '/api/chat/rooms/:roomId/messages'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sessão não identificada.' });
    }
    const { profile } = await getProfileBySessionCode(accessCode);
    if (!profile) {
      return res.status(400).json({ error: 'NO_PROFILE', message: 'Perfil do chat não cadastrado.' });
    }

    const roomId = Number(req.params.roomId);
    const result = await sendMessage(roomId, profile, req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'SEND_FAILED', message: result.error });
    }
    return res.status(201).json({ success: true, message: result.message });
  } catch (err: any) {
    console.error('[POST /api/chat/rooms/:roomId/messages Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao enviar mensagem.' });
  }
});

// POST /api/chat/upload-image
apiRouter.post(['/chat/upload-image', '/api/chat/upload-image'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sessão não identificada.' });
    }
    const { profile } = await getProfileBySessionCode(accessCode);
    if (!profile) {
      return res.status(400).json({ error: 'NO_PROFILE', message: 'Perfil do chat não cadastrado.' });
    }
    if (profile.chat_status === 'SUSPENDED' || profile.chat_status === 'BANNED') {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Sua conta está sem permissão para enviar imagens.' });
    }

    const { base64, mime, width, height } = req.body || {};
    if (!base64 || typeof base64 !== 'string') {
      return res.status(400).json({ error: 'INVALID_FILE', message: 'Nenhuma imagem foi enviada.' });
    }

    const cleanBase64 = base64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    // Max raw size check: 8 MB
    if (buffer.length > 8 * 1024 * 1024) {
      return res.status(400).json({ error: 'FILE_TOO_LARGE', message: 'A imagem excede o tamanho máximo de 8 MB.' });
    }

    // Validate MIME type
    const allowedMimes: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };

    const targetMime = (mime || '').toLowerCase();
    if (!allowedMimes[targetMime]) {
      return res.status(400).json({ error: 'UNSUPPORTED_FORMAT', message: 'Apenas imagens JPG, PNG ou WEBP são permitidas.' });
    }

    // Header / Magic Bytes Validation
    let isValidMagic = false;
    if (buffer.length >= 4) {
      if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        // JPEG
        isValidMagic = true;
      } else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        // PNG
        isValidMagic = true;
      } else if (
        buffer.length >= 12 &&
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x51  // WEBP
      ) {
        // WEBP
        isValidMagic = true;
      }
    }

    if (!isValidMagic) {
      return res.status(400).json({ error: 'INVALID_IMAGE_HEADER', message: 'O arquivo enviado não possui um cabeçalho de imagem válido.' });
    }

    const uploadResult = await processAndUploadMedia({
      profileId: profile.id,
      base64: buffer.toString('base64'),
      mime: targetMime,
      mediaType: 'IMAGE',
      width: width || 800,
      height: height || 600,
    });

    if (!uploadResult.success || !uploadResult.media) {
      return res.status(400).json({ error: 'UPLOAD_FAILED', message: uploadResult.error || 'Erro no upload.' });
    }

    const imageUrl = uploadResult.media.url;

    return res.json({
      success: true,
      imageUrl,
      image: {
        url: imageUrl,
        width: width || 800,
        height: height || 600,
        size: buffer.length,
        mime: targetMime,
      },
      imageWidth: width || 800,
      imageHeight: height || 600,
      imageSize: buffer.length,
      imageMime: targetMime,
    });
  } catch (err: any) {
    console.error('[POST /api/chat/upload-image Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao processar e salvar a imagem.' });
  }
});

// POST /api/chat/upload-onboarding-photo
apiRouter.post(['/chat/upload-onboarding-photo', '/api/chat/upload-onboarding-photo'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) {
      return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Sessão expirada. Entre novamente.' });
    }

    let buffer: Buffer | null = null;
    let mime = 'image/jpeg';

    if (Buffer.isBuffer(req.body)) {
      buffer = req.body;
      const headerMime = req.headers['content-type'];
      if (headerMime && headerMime.startsWith('image/')) {
        mime = headerMime;
      }
    } else if (req.body && typeof req.body === 'object') {
      const { base64, mime: bodyMime } = req.body;
      if (base64 && typeof base64 === 'string') {
        const rawBase64 = String(base64).trim();
        const cleanBase64 = rawBase64.startsWith('data:')
          ? rawBase64.slice(rawBase64.indexOf(',') + 1)
          : rawBase64;
        buffer = Buffer.from(cleanBase64, 'base64');
        if (bodyMime) mime = bodyMime;
      }
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ success: false, error: 'INVALID_FILE', message: 'Nenhuma foto foi enviada.' });
    }

    if (buffer.length > 8 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'FILE_TOO_LARGE', message: 'A foto excede o tamanho máximo de 8 MB.' });
    }

    const uploadResult = await processAndUploadMedia({
      profileId: 0,
      base64: buffer.toString('base64'),
      mime,
      mediaType: 'AVATAR',
    });

    if (!uploadResult.success || !uploadResult.media) {
      return res.status(400).json({
        success: false,
        error: 'UPLOAD_FAILED',
        message: 'Não foi possível enviar a foto. Você pode concluir o cadastro sem ela.',
      });
    }

    const photoUrl = uploadResult.media.url;

    return res.json({
      success: true,
      photoUrl,
    });
  } catch (err: any) {
    console.error('[POST /api/chat/upload-onboarding-photo Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Não foi possível enviar a foto. Você pode concluir o cadastro sem ela.',
    });
  }
});

// POST /api/chat/upload-profile-photo & POST /api/chat/profile/photo
apiRouter.post(['/chat/upload-profile-photo', '/api/chat/upload-profile-photo', '/chat/profile/photo', '/api/chat/profile/photo'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sessão expirada. Entre novamente.' });
    }
    const { profile } = await getProfileBySessionCode(accessCode);
    if (profile && (profile.chat_status === 'SUSPENDED' || profile.chat_status === 'BANNED')) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Sua conta está sem permissão para atualizar foto.' });
    }

    let buffer: Buffer | null = null;
    let mime = 'image/jpeg';

    if (Buffer.isBuffer(req.body)) {
      buffer = req.body;
      const headerMime = req.headers['content-type'];
      if (headerMime && headerMime.startsWith('image/')) {
        mime = headerMime;
      }
    } else if (req.body && typeof req.body === 'object') {
      const { base64, mime: bodyMime } = req.body;
      if (base64 && typeof base64 === 'string') {
        const rawBase64 = String(base64).trim();
        const cleanBase64 = rawBase64.startsWith('data:')
          ? rawBase64.slice(rawBase64.indexOf(',') + 1)
          : rawBase64;
        buffer = Buffer.from(cleanBase64, 'base64');
        if (bodyMime) mime = bodyMime;
      }
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: 'INVALID_FILE', message: 'Nenhuma foto foi enviada.' });
    }

    if (buffer.length > 8 * 1024 * 1024) {
      return res.status(400).json({ error: 'FILE_TOO_LARGE', message: 'A foto excede o tamanho máximo de 8 MB.' });
    }

    const uploadResult = await processAndUploadMedia({
      profileId: profile ? profile.id : null,
      base64: buffer.toString('base64'),
      mime,
      mediaType: 'AVATAR',
    });

    if (!uploadResult.success || !uploadResult.media) {
      return res.status(400).json({
        error: 'UPLOAD_FAILED',
        message: 'Não foi possível enviar a foto. Você pode concluir o cadastro sem ela.',
      });
    }

    const photoUrl = uploadResult.media.url;

    // Update profile photo_url in DB/memory ONLY IF profile already exists (Edit Mode)
    if (profile) {
      await updateChatProfile(accessCode, { photo_url: photoUrl });
    }

    return res.json({
      success: true,
      photoUrl,
      image: {
        url: photoUrl,
        size: buffer.length,
        mime,
      },
    });
  } catch (err: any) {
    console.error('[POST /api/chat/upload-profile-photo Error]:', err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Não foi possível enviar a foto. Você pode concluir o cadastro sem ela.',
    });
  }
});

// POST /api/chat/upload-audio
apiRouter.post(['/chat/upload-audio', '/api/chat/upload-audio'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) {
      console.warn('[CHAT PERMISSION] /api/chat/upload-audio DENIED: No accessCode');
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sessão não identificada.' });
    }
    const { profile } = await getProfileBySessionCode(accessCode);
    if (!profile) {
      console.warn('[CHAT PERMISSION] /api/chat/upload-audio DENIED: Profile not found', { accessCode: maskCodeForLogs(accessCode) });
      return res.status(400).json({ error: 'NO_PROFILE', message: 'Perfil do chat não cadastrado.' });
    }
    if (profile.chat_status === 'SUSPENDED' || profile.chat_status === 'BANNED') {
      console.warn('[CHAT PERMISSION] /api/chat/upload-audio DENIED: Profile suspended/banned', { profileId: profile.id, status: profile.chat_status });
      return res.status(403).json({ error: 'CHAT_SUSPENDED', message: 'Sua conta do chat está suspensa ou banida.' });
    }

    let buffer: Buffer | null = null;
    let mimeType = 'audio/webm';
    let durationSec = 0;

    if (req.body && typeof req.body === 'object' && req.body.base64) {
      const match = req.body.base64.match(/^data:(audio\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        buffer = Buffer.from(match[2], 'base64');
      } else {
        buffer = Buffer.from(req.body.base64, 'base64');
      }
      if (req.body.mime) mimeType = req.body.mime;
      if (req.body.duration) durationSec = Number(req.body.duration) || 0;
    } else if (Buffer.isBuffer(req.body)) {
      buffer = req.body;
      mimeType = (req.headers['content-type'] as string) || 'audio/webm';
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: 'INVALID_FILE', message: 'Nenhum áudio recebido.' });
    }

    if (buffer.length > 15 * 1024 * 1024) {
      return res.status(400).json({ error: 'FILE_TOO_LARGE', message: 'O arquivo de áudio excede o limite de 15 MB.' });
    }

    const uploadResult = await processAndUploadMedia({
      profileId: profile.id,
      base64: buffer.toString('base64'),
      mime: mimeType,
      mediaType: 'AUDIO',
      duration: durationSec,
    });

    if (!uploadResult.success || !uploadResult.media) {
      return res.status(400).json({ error: 'UPLOAD_FAILED', message: uploadResult.error || 'Erro no upload do áudio.' });
    }

    const audioUrl = uploadResult.media.url;
    console.log('[CHAT AUDIO UPLOAD OK]', { audioUrl, size: buffer.length, mimeType, durationSec });

    return res.json({
      success: true,
      audioUrl,
      audio: {
        url: audioUrl,
        size: buffer.length,
        mime: mimeType,
        duration: durationSec,
      },
      duration: durationSec,
    });
  } catch (err: any) {
    console.error('[POST /api/chat/upload-audio Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao salvar áudio gravado.' });
  }
});

// PUT /api/chat/messages/:messageId
apiRouter.put(['/chat/messages/:messageId', '/api/chat/messages/:messageId'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sessão não identificada.' });
    }
    const { profile } = await getProfileBySessionCode(accessCode);
    if (!profile) {
      return res.status(400).json({ error: 'NO_PROFILE', message: 'Perfil do chat não cadastrado.' });
    }

    const messageId = Number(req.params.messageId);
    const { content } = req.body;
    const result = await editMessage(messageId, profile.id, content);
    if (!result.success) {
      return res.status(400).json({ error: 'EDIT_FAILED', message: result.error });
    }
    return res.json({ success: true, message: result.message });
  } catch (err: any) {
    console.error('[PUT /api/chat/messages/:messageId Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao editar mensagem.' });
  }
});

// DELETE /api/chat/messages/:messageId
apiRouter.delete(['/chat/messages/:messageId', '/api/chat/messages/:messageId'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sessão não identificada.' });
    }
    const { profile, isMentor } = await getProfileBySessionCode(accessCode);
    if (!profile) {
      return res.status(400).json({ error: 'NO_PROFILE', message: 'Perfil do chat não cadastrado.' });
    }

    const messageId = Number(req.params.messageId);
    const reason = req.body?.reason || req.query?.reason;
    const result = await deleteMessage(messageId, profile.id, isMentor, reason);
    if (!result.success) {
      return res.status(400).json({ error: 'DELETE_FAILED', message: result.error });
    }
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/chat/messages/:messageId Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao excluir mensagem.' });
  }
});

// POST /api/chat/messages/:messageId/report
apiRouter.post(['/chat/messages/:messageId/report', '/api/chat/messages/:messageId/report'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sessão não identificada.' });
    }
    const { profile } = await getProfileBySessionCode(accessCode);
    if (!profile) {
      return res.status(400).json({ error: 'NO_PROFILE', message: 'Perfil do chat não cadastrado.' });
    }

    const messageId = Number(req.params.messageId);
    const { reason, details } = req.body;
    const result = await reportMessage(messageId, profile.id, reason, details);
    if (!result.success) {
      return res.status(400).json({ error: 'REPORT_FAILED', message: result.error });
    }
    return res.json({ success: true, message: 'Denúncia enviada ao Mentor com sucesso.' });
  } catch (err: any) {
    console.error('[POST /api/chat/messages/:messageId/report Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao enviar denúncia.' });
  }
});

// POST /api/chat/rooms/:roomId/read
apiRouter.post(['/chat/rooms/:roomId/read', '/api/chat/rooms/:roomId/read'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sessão não identificada.' });
    }
    const { profile } = await getProfileBySessionCode(accessCode);
    if (!profile) {
      return res.status(400).json({ error: 'NO_PROFILE', message: 'Perfil do chat não cadastrado.' });
    }

    const roomId = Number(req.params.roomId);
    const result = await markRoomAsRead(roomId, profile.id);
    return res.json(result);
  } catch (err: any) {
    console.error('[POST /api/chat/rooms/:roomId/read Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao marcar mensagens como lidas.' });
  }
});

// POST /api/chat/typing
apiRouter.post(['/chat/typing', '/api/chat/typing'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { profile } = await getProfileBySessionCode(accessCode);
    if (!profile) return res.status(400).json({ error: 'NO_PROFILE' });

    const { roomId = 1, isTyping } = req.body;
    setTypingStatus(Number(roomId), profile.id, profile.nickname, Boolean(isTyping));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// GET /api/chat/rooms/:roomId/typing
apiRouter.get(['/chat/rooms/:roomId/typing', '/api/chat/rooms/:roomId/typing'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    const { profile } = accessCode ? await getProfileBySessionCode(accessCode) : { profile: null };
    const roomId = Number(req.params.roomId);
    const typingUsers = getTypingUsers(roomId, profile?.id);
    return res.json({ typingUsers });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// POST /api/chat/messages/:messageId/pin
apiRouter.post(['/chat/messages/:messageId/pin', '/api/chat/messages/:messageId/pin'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { isMentor } = await getProfileBySessionCode(accessCode);
    if (!isMentor) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Apenas o Mentor Bigode pode fixar mensagens.' });
    }

    const messageId = Number(req.params.messageId);
    const { isPinned } = req.body;
    const result = await pinMessage(messageId, Boolean(isPinned));
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// GET /api/chat/rooms/:roomId/pinned
apiRouter.get(['/chat/rooms/:roomId/pinned', '/api/chat/rooms/:roomId/pinned'], async (req, res) => {
  try {
    const roomId = Number(req.params.roomId);
    const pinnedMessage = await getPinnedMessage(roomId);
    return res.json({ pinnedMessage });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// GET /api/chat/unread-count
apiRouter.get(['/chat/unread-count', '/api/chat/unread-count'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) return res.json({ totalUnread: 0 });
    const { profile } = await getProfileBySessionCode(accessCode);
    if (!profile) return res.json({ totalUnread: 0 });

    const totalUnread = await getUnreadCountForProfile(profile.id);
    const mentionsUnread = await getUnreadMentionsCount(profile.id);
    return res.json({ totalUnread, mentionsUnread });
  } catch (err: any) {
    return res.json({ totalUnread: 0, mentionsUnread: 0 });
  }
});

// V1.2 COMUNIDADE VIVA ROUTES

// POST /api/chat/messages/:messageId/react
apiRouter.post(['/chat/messages/:messageId/react', '/api/chat/messages/:messageId/react'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { profile } = await getProfileBySessionCode(accessCode);
    if (!profile) return res.status(400).json({ error: 'NO_PROFILE' });

    const messageId = Number(req.params.messageId);
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: 'EMOJI_REQUIRED' });

    const result = await toggleReaction(messageId, profile.id, String(emoji));
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// GET /api/chat/members
apiRouter.get(['/chat/members', '/api/chat/members'], async (_req, res) => {
  try {
    const members = await getCommunityMembersListForAutocomplete();
    return res.json({ members });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// POST /api/chat/mentions/mark-read
apiRouter.post(['/chat/mentions/mark-read', '/api/chat/mentions/mark-read'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { profile } = await getProfileBySessionCode(accessCode);
    if (!profile) return res.status(400).json({ error: 'NO_PROFILE' });

    const result = await markMentionsAsRead(profile.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// GET & POST /api/chat/polls
apiRouter.get(['/chat/polls', '/api/chat/polls'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    const { profile } = accessCode ? await getProfileBySessionCode(accessCode) : { profile: null };
    const roomId = req.query.roomId ? Number(req.query.roomId) : 1;
    const poll = await getActivePoll(roomId, profile?.id || 0);
    return res.json({ poll });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

apiRouter.post(['/chat/polls', '/api/chat/polls'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { isMentor } = await getProfileBySessionCode(accessCode);
    if (!isMentor) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Apenas o Mentor pode criar enquetes.' });
    }

    const { roomId = 1, question, options } = req.body;
    const result = await createPoll(Number(roomId), question, options, accessCode);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// POST /api/chat/polls/:id/vote
apiRouter.post(['/chat/polls/:id/vote', '/api/chat/polls/:id/vote'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { profile } = await getProfileBySessionCode(accessCode);
    if (!profile) return res.status(400).json({ error: 'NO_PROFILE' });

    const pollId = Number(req.params.id);
    const { optionIndex } = req.body;
    if (optionIndex === undefined) return res.status(400).json({ error: 'OPTION_REQUIRED' });

    const result = await votePoll(pollId, profile.id, Number(optionIndex));
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// POST & GET /api/chat/favorites
apiRouter.post(['/chat/messages/:messageId/favorite', '/api/chat/messages/:messageId/favorite'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { profile } = await getProfileBySessionCode(accessCode);
    if (!profile) return res.status(400).json({ error: 'NO_PROFILE' });

    const messageId = Number(req.params.messageId);
    const result = await toggleFavoriteMessage(profile.id, messageId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

apiRouter.get(['/chat/favorites', '/api/chat/favorites'], async (req, res) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) return res.status(401).json({ error: 'UNAUTHORIZED' });
    const { profile } = await getProfileBySessionCode(accessCode);
    if (!profile) return res.status(400).json({ error: 'NO_PROFILE' });

    const favorites = await getUserFavoriteMessages(profile.id);
    return res.json({ favorites });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// GET /api/chat/online-members
apiRouter.get(['/chat/online-members', '/api/chat/online-members'], async (_req, res) => {
  try {
    const members = await getOnlineMembersDrawerList();
    return res.json({ members });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// GET /api/chat/ranking & /api/chat/stats
apiRouter.get(['/chat/ranking', '/api/chat/ranking'], async (_req, res) => {
  try {
    const ranking = await getCommunityRanking();
    return res.json({ ranking });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

apiRouter.get(['/chat/stats', '/api/chat/stats'], async (_req, res) => {
  try {
    const stats = await getCommunityStats();
    return res.json({ stats });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// ADMIN MENTOR CHAT MODERATION ROUTES
apiRouter.get(['/admin/chat/reports', '/api/admin/chat/reports'], requireMentorAuth, async (_req, res) => {
  try {
    const reports = await getAdminReports();
    return res.json({ reports });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao buscar denúncias.' });
  }
});

apiRouter.get(['/admin/chat/profiles', '/api/admin/chat/profiles'], requireMentorAuth, async (_req, res) => {
  try {
    const profiles = await getAdminProfilesList();
    return res.json({ profiles });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao listar perfis do chat.' });
  }
});

apiRouter.post(['/admin/chat/profiles/:profileId/suspend', '/api/admin/chat/profiles/:profileId/suspend'], requireMentorAuth, async (req, res) => {
  try {
    const profileId = Number(req.params.profileId);
    const { reason } = req.body;
    const result = await updateChatStatusByMentor(profileId, 'SUSPENDED', reason);
    if (!result.success) return res.status(400).json({ error: 'ACTION_FAILED', message: result.error });
    return res.json({ success: true, message: 'Usuário suspenso do chat.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao suspender usuário do chat.' });
  }
});

apiRouter.post(['/admin/chat/profiles/:profileId/ban', '/api/admin/chat/profiles/:profileId/ban'], requireMentorAuth, async (req, res) => {
  try {
    const profileId = Number(req.params.profileId);
    const { reason } = req.body;
    const result = await updateChatStatusByMentor(profileId, 'BANNED', reason);
    if (!result.success) return res.status(400).json({ error: 'ACTION_FAILED', message: result.error });
    return res.json({ success: true, message: 'Usuário banido do chat.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao banir usuário do chat.' });
  }
});

apiRouter.post(['/admin/chat/profiles/:profileId/reactivate', '/api/admin/chat/profiles/:profileId/reactivate'], requireMentorAuth, async (req, res) => {
  try {
    const profileId = Number(req.params.profileId);
    const { reason } = req.body;
    const result = await updateChatStatusByMentor(profileId, 'ACTIVE', reason);
    if (!result.success) return res.status(400).json({ error: 'ACTION_FAILED', message: result.error });
    return res.json({ success: true, message: 'Usuário reativado no chat.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao reativar usuário no chat.' });
  }
});

apiRouter.post(['/admin/chat/profiles/:profileId/warn', '/api/admin/chat/profiles/:profileId/warn'], requireMentorAuth, async (req, res) => {
  try {
    const profileId = Number(req.params.profileId);
    const { reason } = req.body;
    const result = await warnUserByMentor(profileId, reason || 'Advertência por conduta no bate-papo');
    if (!result.success) return res.status(400).json({ error: 'ACTION_FAILED', message: result.error });
    return res.json({ success: true, message: 'Advertência registrada.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao aplicar advertência.' });
  }
});

apiRouter.post(['/admin/chat/notices', '/api/admin/chat/notices'], requireMentorAuth, async (req, res) => {
  try {
    const { roomId = 1, content } = req.body;
    const result = await createOfficialNotice(Number(roomId), content);
    if (!result.success) return res.status(400).json({ error: 'ACTION_FAILED', message: result.error });
    return res.json({ success: true, message: 'Aviso oficial publicado.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro ao publicar aviso.' });
  }
});

// Mount router on both /api and / (for Vercel rewrites compatibility)
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Global Express error handler for serverless runtime safety
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err?.message || 'Erro interno do servidor.' });
});

// Setup Vite development or static production serving
async function startServer() {
  if (isDatabaseConfigured()) {
    try {
      await Promise.all([
        ensureChatTables(),
        ensureSessionsTable(),
        ensureProductsTable(),
        ensureProgressTable(),
        ensureProfilesTable(),
      ]);
      console.log('[MySQL] All database schemas verified');
    } catch (e: any) {
      console.warn('[MySQL Initialization Warning]:', e?.message || e);
    }
  }

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

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor local iniciado na porta ${PORT}`);
    });
  }
}

export default app;

if (process.env.VERCEL !== '1' && process.env.VERCEL !== 'true' && !process.env.VERCEL) {
  startServer();
}
