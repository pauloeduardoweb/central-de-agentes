import express from 'express';
import { db, isDatabaseConfigured, ensureProfilesTable, ensureProgressTable } from './database.js';
import { normalizeAccessCode, lookupKeyType, STUDENT_KEYS, MASTER_KEYS } from './authKeys.js';
import { maskStudentCode, calculateLevelFromXp } from './rankingService.js';
import { checkCodeKeyType } from './presenceService.js';

export const RESERVED_USERNAMES = new Set([
  'mentor',
  'mentorbigode',
  'admin',
  'administrador',
  'suporte',
  'geracaoz',
  'geracaozpro',
  'bigode',
  'system',
  'moderador',
]);

const PROFANITY_WORDS = [
  'caralho', 'porra', 'merda', 'puta', 'cacete', 'buceta', 'pinto',
  'viado', 'filhodaputa', 'arrombado', 'desgraca', 'desgraça', 'k2', 'hack'
];

export function validateUsernameRules(username: unknown): { valid: boolean; reason?: string } {
  if (typeof username !== 'string') {
    return { valid: false, reason: 'Nome de usuário deve ser um texto válido.' };
  }

  const trimmed = username.trim();
  if (trimmed !== username) {
    return { valid: false, reason: 'O nome de usuário não pode ter espaços.' };
  }

  if (username.length < 3 || username.length > 20) {
    return { valid: false, reason: 'O nome de usuário deve ter entre 3 e 20 caracteres.' };
  }

  // Strict regex for letters, numbers, and underscore ONLY (Rule 3)
  const validCharsRegex = /^[a-zA-Z0-9_]+$/;
  if (!validCharsRegex.test(username)) {
    return { valid: false, reason: 'Apenas letras, números e underline (_) são permitidos. Sem espaços ou símbolos.' };
  }

  const lower = username.toLowerCase();

  // Reserved exact terms check
  if (RESERVED_USERNAMES.has(lower)) {
    return { valid: false, reason: 'Este nome de usuário é reservado do sistema.' };
  }

  // Reserved root words check
  if (
    lower.includes('mentor') ||
    lower.includes('admin') ||
    lower.includes('suporte') ||
    lower.includes('geracaoz') ||
    lower.includes('bigode') ||
    lower.includes('moderador')
  ) {
    return { valid: false, reason: 'Nome de usuário contém termos reservados não permitidos.' };
  }

  // Profanity check
  for (const word of PROFANITY_WORDS) {
    if (lower.includes(word)) {
      return { valid: false, reason: 'Nome de usuário contém termos impróprios.' };
    }
  }

  return { valid: true };
}

// In-memory fallback profiles map if DB is offline
interface MemoryProfile {
  codigo: string;
  nome_usuario: string;
  nome_usuario_normalizado: string;
  avatar: string | null;
  criado_em: string;
  atualizado_em: string;
}

export const memoryProfilesMap = new Map<string, MemoryProfile>();

/**
 * Extracts and verifies student access code from request session headers.
 * NEVER trusts req.body.codigo!
 */
export async function getAuthenticatedStudentSession(req: express.Request): Promise<{
  code: string | null;
  isMaster: boolean;
  isValidStudent: boolean;
}> {
  const codeHeader =
    req.headers['x-access-code'] ||
    req.headers['x-student-access-code'] ||
    req.headers['x-master-key'] ||
    req.headers['authorization']?.toString().replace(/^Bearer\s+/i, '');

  const cleanCode = normalizeAccessCode(codeHeader);
  if (!cleanCode) {
    return { code: null, isMaster: false, isValidStudent: false };
  }

  const keyType = await checkCodeKeyType(cleanCode);
  if (keyType === 'MASTER') {
    return { code: cleanCode, isMaster: true, isValidStudent: false };
  }

  if (keyType === 'STUDENT') {
    return { code: cleanCode, isMaster: false, isValidStudent: true };
  }

  return { code: null, isMaster: false, isValidStudent: false };
}

/**
 * GET /api/student/profile
 * Returns profile for current authenticated student session.
 */
export async function getStudentProfileHandler(req: express.Request, res: express.Response) {
  try {
    const { code, isMaster, isValidStudent } = await getAuthenticatedStudentSession(req);

    if (!code || (!isValidStudent && !isMaster)) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Sessão inválida ou não informada.',
      });
    }

    if (isMaster) {
      return res.status(403).json({
        error: 'FORBIDDEN_MASTER_KEY',
        message: 'Chaves mestras de mentor não possuem perfil de aluno.',
        isMaster: true,
      });
    }

    if (isDatabaseConfigured()) {
      await ensureProfilesTable();

      const [rows]: any = await db.query(
        `SELECT codigo, nome_usuario, avatar, criado_em, atualizado_em
         FROM perfis_alunos
         WHERE codigo = ?
         LIMIT 1`,
        [code]
      );

      if (Array.isArray(rows) && rows.length > 0) {
        const p = rows[0];
        return res.json({
          profileCreated: true,
          username: p.nome_usuario,
          avatar: p.avatar || null,
          createdAt: p.criado_em,
          updatedAt: p.atualizado_em,
        });
      }
    } else {
      const p = memoryProfilesMap.get(code);
      if (p) {
        return res.json({
          profileCreated: true,
          username: p.nome_usuario,
          avatar: p.avatar,
          createdAt: p.criado_em,
          updatedAt: p.atualizado_em,
        });
      }
    }

    return res.json({
      profileCreated: false,
    });
  } catch (err: any) {
    console.error('[Get Student Profile Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao consultar perfil do aluno.',
    });
  }
}

/**
 * GET /api/student/profile/check-username?username=LojaDaAna
 * Checks if candidate username is valid and available.
 */
export async function checkUsernameHandler(req: express.Request, res: express.Response) {
  try {
    const username = (req.query?.username as string) || '';

    // Validate rules
    const ruleCheck = validateUsernameRules(username);
    if (!ruleCheck.valid) {
      return res.json({
        available: false,
        reason: ruleCheck.reason,
      });
    }

    const normalized = username.trim().toLowerCase();

    // Check database uniqueness
    if (isDatabaseConfigured()) {
      await ensureProfilesTable();

      const [rows]: any = await db.query(
        `SELECT codigo FROM perfis_alunos WHERE nome_usuario_normalizado = ? LIMIT 1`,
        [normalized]
      );

      if (Array.isArray(rows) && rows.length > 0) {
        return res.json({
          available: false,
          reason: 'Este nome de usuário já está em uso.',
        });
      }
    } else {
      const exists = Array.from(memoryProfilesMap.values()).some(
        (p) => p.nome_usuario_normalizado === normalized
      );
      if (exists) {
        return res.json({
          available: false,
          reason: 'Este nome de usuário já está em uso.',
        });
      }
    }

    return res.json({
      available: true,
      message: 'Nome de usuário disponível!',
    });
  } catch (err: any) {
    console.error('[Check Username Error]:', err?.message || err);
    return res.status(500).json({
      available: false,
      reason: 'Erro ao verificar disponibilidade do nome de usuário.',
    });
  }
}

/**
 * Helper to create or update student profile cleanly.
 */
export async function createOrUpdateStudentProfile(
  code: string,
  username: string,
  avatar?: string | null
): Promise<{ success: boolean; isNew?: boolean; avatar?: string | null; message?: string; error?: string }> {
  const normalized = String(username).trim().toLowerCase();

  if (isDatabaseConfigured()) {
    await ensureProfilesTable();
    await ensureProgressTable();

    // Check if student already has a profile
    const [existingRows]: any = await db.query(
      `SELECT codigo, nome_usuario, avatar, criado_em, atualizado_em FROM perfis_alunos WHERE codigo = ? LIMIT 1`,
      [code]
    );

    const hasProfile = Array.isArray(existingRows) && existingRows.length > 0;

    if (!hasProfile) {
      // 1. FIRST ACCESS CREATION FLOW:
      // Check username uniqueness
      const [duplicateName]: any = await db.query(
        `SELECT codigo FROM perfis_alunos WHERE nome_usuario_normalizado = ? LIMIT 1`,
        [normalized]
      );

      if (Array.isArray(duplicateName) && duplicateName.length > 0) {
        return {
          success: false,
          error: 'USERNAME_TAKEN',
          message: 'Este nome de usuário já está em uso por outro aluno.',
        };
      }

      const avatarVal = avatar !== undefined ? avatar : null;

      // Insert profile into perfis_alunos
      await db.query(
        `INSERT INTO perfis_alunos (codigo, nome_usuario, nome_usuario_normalizado, avatar, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [code, username.trim(), normalized, avatarVal]
      );

      // Initialize student progress record in progresso_alunos
      await db.query(
        `INSERT IGNORE INTO progresso_alunos
          (codigo, xp_total, nivel, desafios_jogados, desafios_corretos, sequencia_atual, maior_sequencia, ultimo_desafio_em)
         VALUES
          (?, 0, 1, 0, 0, 0, 0, NOW())`,
        [code]
      );

      return {
        success: true,
        isNew: true,
        avatar: avatarVal,
        message: 'Perfil de jogador criado com sucesso! Bem-vindo à Academia.',
      };
    } else {
      // 2. EXISTING PROFILE UPDATE FLOW:
      const p = existingRows[0];

      // Determine updated avatar value
      const finalAvatar = avatar !== undefined ? avatar : p.avatar;

      // If name is unchanged and avatar is unchanged, just return success
      if (p.nome_usuario === username.trim() && p.avatar === finalAvatar) {
        return {
          success: true,
          isNew: false,
          avatar: p.avatar,
          message: 'Perfil carregado com sucesso!',
        };
      }

      // Check 30 days cooldown if updated name previously (only enforce name change cooldown, not avatar change)
      if (p.nome_usuario !== username.trim()) {
        const createdAt = new Date(p.criado_em).getTime();
        const updatedAt = new Date(p.atualizado_em).getTime();

        if (Math.abs(updatedAt - createdAt) > 60000) {
          const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
          const timeSinceLastUpdate = Date.now() - updatedAt;
          if (timeSinceLastUpdate < thirtyDaysMs) {
            const daysRemaining = Math.ceil((thirtyDaysMs - timeSinceLastUpdate) / (24 * 60 * 60 * 1000));
            return {
              success: false,
              error: 'COOLDOWN_ACTIVE',
              message: `Você só pode alterar seu nome de usuário uma vez a cada 30 dias. Tente novamente em ${daysRemaining} dias.`,
            };
          }
        }

        // Check if new name is taken by another student
        const [dup]: any = await db.query(
          `SELECT codigo FROM perfis_alunos WHERE nome_usuario_normalizado = ? AND codigo != ? LIMIT 1`,
          [normalized, code]
        );

        if (Array.isArray(dup) && dup.length > 0) {
          return {
            success: false,
            error: 'USERNAME_TAKEN',
            message: 'Este nome de usuário já está em uso por outro aluno.',
          };
        }
      }

      // Update username and avatar
      await db.query(
        `UPDATE perfis_alunos
         SET nome_usuario = ?, nome_usuario_normalizado = ?, avatar = ?, atualizado_em = NOW()
         WHERE codigo = ?`,
        [username.trim(), normalized, finalAvatar, code]
      );

      return {
        success: true,
        isNew: false,
        avatar: finalAvatar,
        message: 'Perfil atualizado com sucesso!',
      };
    }
  } else {
    // In-Memory Fallback when DB is offline
    const now = new Date().toISOString();
    const existingMemory = memoryProfilesMap.get(code);
    const avatarVal = avatar !== undefined ? avatar : null;

    if (!existingMemory) {
      // Creation in memory
      const duplicate = Array.from(memoryProfilesMap.values()).some(
        (p) => p.nome_usuario_normalizado === normalized
      );
      if (duplicate) {
        return {
          success: false,
          error: 'USERNAME_TAKEN',
          message: 'Este nome de usuário já está em uso por outro aluno.',
        };
      }

      memoryProfilesMap.set(code, {
        codigo: code,
        nome_usuario: username.trim(),
        nome_usuario_normalizado: normalized,
        avatar: avatarVal,
        criado_em: now,
        atualizado_em: now,
      });

      return {
        success: true,
        isNew: true,
        avatar: avatarVal,
        message: 'Perfil de jogador criado com sucesso!',
      };
    } else {
      // Update in memory
      if (existingMemory.nome_usuario !== username.trim()) {
        const dup = Array.from(memoryProfilesMap.values()).some(
          (item) => item.nome_usuario_normalizado === normalized && item.codigo !== code
        );
        if (dup) {
          return {
            success: false,
            error: 'USERNAME_TAKEN',
            message: 'Este nome de usuário já está em uso por outro aluno.',
          };
        }
      }

      existingMemory.nome_usuario = username.trim();
      existingMemory.nome_usuario_normalizado = normalized;
      if (avatar !== undefined) {
        existingMemory.avatar = avatar;
      }
      existingMemory.atualizado_em = now;
      memoryProfilesMap.set(code, existingMemory);

      return {
        success: true,
        isNew: false,
        avatar: existingMemory.avatar,
        message: 'Perfil atualizado com sucesso!',
      };
    }
  }
}

/**
 * POST /api/student/profile
 * Creates or updates profile for authenticated student.
 */
export async function createStudentProfileHandler(req: express.Request, res: express.Response) {
  try {
    const { code, isMaster, isValidStudent } = await getAuthenticatedStudentSession(req);

    if (!code || (!isValidStudent && !isMaster)) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Sessão inválida ou não informada.',
      });
    }

    if (isMaster) {
      return res.status(403).json({
        error: 'FORBIDDEN_MASTER_KEY',
        message: 'Chaves mestras não participam do perfil de alunos.',
      });
    }

    const { username, avatar } = req.body || {};

    const ruleCheck = validateUsernameRules(username);
    if (!ruleCheck.valid) {
      return res.status(400).json({
        error: 'INVALID_USERNAME',
        message: ruleCheck.reason,
      });
    }

    const result = await createOrUpdateStudentProfile(code, username, avatar);
    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'CREATE_PROFILE_FAILED',
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      profileCreated: true,
      username: username.trim(),
      avatar: result.avatar || null,
      message: result.message,
    });
  } catch (err: any) {
    console.error('[Create Student Profile Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao processar perfil do aluno.',
    });
  }
}

/**
 * PATCH /api/student/profile/username
 * Updates student username (or creates profile if missing).
 */
export async function updateUsernameHandler(req: express.Request, res: express.Response) {
  try {
    const { code, isMaster, isValidStudent } = await getAuthenticatedStudentSession(req);

    if (!code || (!isValidStudent && !isMaster)) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Sessão inválida ou não informada.',
      });
    }

    if (isMaster) {
      return res.status(403).json({
        error: 'FORBIDDEN_MASTER_KEY',
        message: 'Chaves mestras não possuem perfil.',
      });
    }

    const { username, avatar } = req.body || {};

    const ruleCheck = validateUsernameRules(username);
    if (!ruleCheck.valid) {
      return res.status(400).json({
        error: 'INVALID_USERNAME',
        message: ruleCheck.reason,
      });
    }

    const result = await createOrUpdateStudentProfile(code, username, avatar);
    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'UPDATE_PROFILE_FAILED',
        message: result.message,
      });
    }

    return res.json({
      success: true,
      profileCreated: true,
      username: username.trim(),
      avatar: result.avatar || null,
      message: result.message,
    });
  } catch (err: any) {
    console.error('[Update Username Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao atualizar perfil do aluno.',
    });
  }
}

/**
 * PATCH /api/student/profile/avatar
 * Dedicated endpoint to update student profile picture.
 */
export async function updateAvatarHandler(req: express.Request, res: express.Response) {
  try {
    const { code, isMaster, isValidStudent } = await getAuthenticatedStudentSession(req);

    if (!code || (!isValidStudent && !isMaster)) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Sessão inválida ou não informada.',
      });
    }

    if (isMaster) {
      return res.status(403).json({
        error: 'FORBIDDEN_MASTER_KEY',
        message: 'Chaves mestras não possuem perfil.',
      });
    }

    const { avatar } = req.body || {};

    if (isDatabaseConfigured()) {
      await ensureProfilesTable();
      await db.query(
        `UPDATE perfis_alunos SET avatar = ?, atualizado_em = NOW() WHERE codigo = ?`,
        [avatar || null, code]
      );
    } else {
      const p = memoryProfilesMap.get(code);
      if (p) {
        p.avatar = avatar || null;
        p.atualizado_em = new Date().toISOString();
        memoryProfilesMap.set(code, p);
      }
    }

    return res.json({
      success: true,
      avatar: avatar || null,
      message: 'Foto de perfil atualizada com sucesso!',
    });
  } catch (err: any) {
    console.error('[Update Avatar Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao atualizar foto de perfil.',
    });
  }
}

/**
 * GET /api/mentor/students
 * Returns simple student view for mentors (username, masked code, XP, level, games played, profile status).
 */
export async function getMentorStudentsHandler(req: express.Request, res: express.Response) {
  try {
    const { isMaster } = await getAuthenticatedStudentSession(req);

    if (!isMaster) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Acesso negado. Apenas mentores possuem acesso a esta lista.',
      });
    }

    const search = String(req.query.search || req.query.searchTerm || req.query.q || '').trim().toLowerCase();

    let studentsInternal: any[] = [];

    if (isDatabaseConfigured()) {
      await ensureProfilesTable();

      const query = `
        SELECT
          ca.codigo,
          pf.nome_usuario,
          pf.avatar,
          pa.xp_total,
          pa.nivel,
          pa.desafios_jogados
        FROM codigos_acesso ca
        LEFT JOIN progresso_alunos pa ON ca.codigo = pa.codigo
        LEFT JOIN perfis_alunos pf ON ca.codigo = pf.codigo
        ORDER BY pa.xp_total DESC, ca.codigo ASC
      `;

      const [rows]: any = await db.query(query);

      if (Array.isArray(rows)) {
        studentsInternal = rows.map((r: any) => ({
          _fullCode: r.codigo,
          username: r.nome_usuario || 'Não criado',
          avatar: r.avatar || null,
          maskedCode: maskStudentCode(r.codigo),
          xp: Number(r.xp_total) || 0,
          nivel: Number(r.nivel) || 1,
          desafiosJogados: Number(r.desafios_jogados) || 0,
          profileCreated: Boolean(r.nome_usuario),
        }));
      }
    } else {
      // Memory fallback
      const studentMap = new Map<string, any>();
      for (const p of memoryProfilesMap.values()) {
        studentMap.set(p.codigo, {
          _fullCode: p.codigo,
          username: p.nome_usuario,
          avatar: p.avatar || null,
          maskedCode: maskStudentCode(p.codigo),
          xp: 0,
          nivel: 1,
          desafiosJogados: 0,
          profileCreated: true,
        });
      }
      for (const key of STUDENT_KEYS) {
        if (MASTER_KEYS.has(key) || lookupKeyType(key) === 'MASTER') continue;
        if (!studentMap.has(key)) {
          studentMap.set(key, {
            _fullCode: key,
            username: 'Não criado',
            avatar: null,
            maskedCode: maskStudentCode(key),
            xp: 0,
            nivel: 1,
            desafiosJogados: 0,
            profileCreated: false,
          });
        }
      }
      studentsInternal = Array.from(studentMap.values());
    }

    if (search) {
      studentsInternal = studentsInternal.filter((s) => {
        const codeMatch = s._fullCode && String(s._fullCode).toLowerCase().includes(search);
        const maskedCodeMatch = s.maskedCode && String(s.maskedCode).toLowerCase().includes(search);
        const usernameMatch = s.username && String(s.username).toLowerCase().includes(search);
        return codeMatch || maskedCodeMatch || usernameMatch;
      });
    }

    const sanitizedStudents = studentsInternal.map(({ _fullCode, codigo, ...safeStudent }) => safeStudent);

    return res.json({
      success: true,
      totalStudents: sanitizedStudents.length,
      students: sanitizedStudents,
    });
  } catch (err: any) {
    console.error('[Get Mentor Students Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao obter lista de alunos.',
    });
  }
}
