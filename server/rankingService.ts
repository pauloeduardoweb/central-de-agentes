import express from 'express';
import { db, isDatabaseConfigured, ensureProgressTable, ensureProfilesTable } from './database.js';
import { normalizeAccessCode, MASTER_KEYS } from './authKeys.js';
import { memoryProfilesMap } from './studentProfileService.js';

export function maskStudentCode(code: string): string {
  if (!code) return '***';
  const clean = normalizeAccessCode(code);
  if (clean.length <= 6) {
    return clean.slice(0, 2) + '••' + clean.slice(-2);
  }
  const parts = clean.split('-');
  if (parts.length >= 3) {
    const middle = parts[1];
    const maskedMiddle = middle.length > 2 ? middle.slice(0, 2) + '••' : '••';
    return `${parts[0]}-${maskedMiddle}-${parts[parts.length - 1]}`;
  }
  return clean.slice(0, 5) + '••' + clean.slice(-4);
}

export function calculateLevelFromXp(totalXp: number): number {
  let level = 1;
  let currentStart = 0;
  let levelCost = 200;

  while (totalXp >= currentStart + levelCost) {
    currentStart += levelCost;
    level++;
    levelCost = 200 + (level - 1) * 150;
  }
  return level;
}

const EXCLUDED_MASTER_KEYS = Array.from(MASTER_KEYS);

// In-memory fallback if DB is not configured
interface MemoryProgressRecord {
  codigo: string;
  xp_total: number;
  nivel: number;
  desafios_jogados: number;
  desafios_corretos: number;
  sequencia_atual: number;
  maior_sequencia: number;
  ultimo_desafio_em: string;
}

const memoryProgressMap = new Map<string, MemoryProgressRecord>();

/**
 * GET /api/ranking
 * Returns real ranking of active students ordered by total XP with usernames.
 * NEVER exposes access keys or masked codes in the ranking list.
 */
export async function getGlobalRankingHandler(req: express.Request, res: express.Response) {
  try {
    const userCodeHeader = req.headers['x-access-code'] || req.headers['x-student-access-code'];
    const currentUserCode = normalizeAccessCode(userCodeHeader);

    let rankingData: any[] = [];

    if (isDatabaseConfigured()) {
      await ensureProgressTable();
      await ensureProfilesTable();

      const placeholders = EXCLUDED_MASTER_KEYS.map(() => '?').join(',');
      const query = `
        SELECT
          p.codigo,
          p.xp_total,
          p.nivel,
          p.desafios_jogados,
          p.desafios_corretos,
          p.sequencia_atual,
          p.maior_sequencia,
          p.ultimo_desafio_em,
          pf.nome_usuario,
          pf.avatar
        FROM progresso_alunos p
        LEFT JOIN perfis_alunos pf ON p.codigo = pf.codigo
        WHERE p.xp_total > 0
          AND p.codigo NOT IN (${placeholders})
        ORDER BY p.xp_total DESC, p.desafios_corretos DESC, p.ultimo_desafio_em ASC
      `;

      const [rows]: any = await db.query(query, EXCLUDED_MASTER_KEYS);

      if (Array.isArray(rows)) {
        rankingData = rows.map((r: any, index: number) => {
          const code = normalizeAccessCode(r.codigo);
          const isUser = currentUserCode ? code === currentUserCode : false;
          const totalPlayed = Number(r.desafios_jogados) || 0;
          const totalWon = Number(r.desafios_corretos) || 0;
          const accuracy = totalPlayed > 0 ? Math.round((totalWon / totalPlayed) * 100) : 0;
          const username = r.nome_usuario ? String(r.nome_usuario) : 'Jogador sem perfil';
          const avatar = r.avatar || null;

          return {
            rank: index + 1,
            username,
            avatar,
            name: username + (isUser ? ' (Você)' : ''),
            xp: Number(r.xp_total) || 0,
            xpFormatted: `${(Number(r.xp_total) || 0).toLocaleString('pt-BR')} XP`,
            nivel: Number(r.nivel) || 1,
            desafiosJogados: totalPlayed,
            desafiosCorretos: totalWon,
            taxaAcerto: accuracy,
            sequenciaAtual: Number(r.sequencia_atual) || 0,
            maiorSequencia: Number(r.maior_sequencia) || 0,
            isUser,
          };
        });
      }
    } else {
      // In-memory fallback
      const validRecords = Array.from(memoryProgressMap.values())
        .filter((r) => r.xp_total > 0 && !MASTER_KEYS.has(r.codigo))
        .sort((a, b) => b.xp_total - a.xp_total || b.desafios_corretos - a.desafios_corretos);

      rankingData = validRecords.map((r, index) => {
        const isUser = currentUserCode ? r.codigo === currentUserCode : false;
        const totalPlayed = r.desafios_jogados || 0;
        const totalWon = r.desafios_corretos || 0;
        const accuracy = totalPlayed > 0 ? Math.round((totalWon / totalPlayed) * 100) : 0;
        const profile = memoryProfilesMap.get(r.codigo);
        const username = profile ? profile.nome_usuario : 'Jogador sem perfil';
        const avatar = profile ? profile.avatar : null;

        return {
          rank: index + 1,
          username,
          avatar,
          name: username + (isUser ? ' (Você)' : ''),
          xp: r.xp_total,
          xpFormatted: `${r.xp_total.toLocaleString('pt-BR')} XP`,
          nivel: r.nivel,
          desafiosJogados: totalPlayed,
          desafiosCorretos: totalWon,
          taxaAcerto: accuracy,
          sequenciaAtual: r.sequencia_atual,
          maiorSequencia: r.maior_sequencia,
          isUser,
        };
      });
    }

    return res.json({
      success: true,
      totalParticipants: rankingData.length,
      ranking: rankingData,
    });
  } catch (err: any) {
    console.error('[Get Global Ranking Error]:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: 'DATABASE_ERROR',
      message: 'Não foi possível carregar o ranking no momento.',
      ranking: [],
    });
  }
}


/**
 * GET /api/ranking/me
 * Returns real position and stats for current authenticated user.
 */
export async function getUserRankingStatsHandler(req: express.Request, res: express.Response) {
  try {
    const userCodeHeader =
      req.headers['x-access-code'] ||
      req.headers['x-student-access-code'] ||
      req.query?.accessCode;

    const cleanCode = normalizeAccessCode(userCodeHeader);

    if (!cleanCode) {
      return res.status(400).json({
        error: 'ACCESS_CODE_REQUIRED',
        message: 'Código do aluno não informado.',
      });
    }

    // Check if master key
    if (MASTER_KEYS.has(cleanCode)) {
      return res.json({
        isMasterKey: true,
        rank: null,
        rankText: 'Chave Mestra (Mentor)',
        totalXp: 0,
        nivel: 1,
        desafiosJogados: 0,
        desafiosCorretos: 0,
        taxaAcerto: 0,
        sequenciaAtual: 0,
        maiorSequencia: 0,
        unlockedAchievements: [],
      });
    }

    let userRecord: any = null;
    let totalParticipants = 0;
    let rankPosition: number | null = null;

    if (isDatabaseConfigured()) {
      await ensureProgressTable();

      // 1. Fetch user record
      const [rows]: any = await db.query(
        `SELECT codigo, xp_total, nivel, desafios_jogados, desafios_corretos, sequencia_atual, maior_sequencia
         FROM progresso_alunos
         WHERE codigo = ?
         LIMIT 1`,
        [cleanCode]
      );

      if (Array.isArray(rows) && rows.length > 0) {
        userRecord = rows[0];
      }

      // 2. Fetch total active participants
      const placeholders = EXCLUDED_MASTER_KEYS.map(() => '?').join(',');
      const [countRows]: any = await db.query(
        `SELECT COUNT(*) AS total
         FROM progresso_alunos
         WHERE xp_total > 0 AND codigo NOT IN (${placeholders})`,
        EXCLUDED_MASTER_KEYS
      );

      if (Array.isArray(countRows) && countRows[0]) {
        totalParticipants = Number(countRows[0].total);
      }

      // 3. If user has XP > 0, calculate rank position
      if (userRecord && Number(userRecord.xp_total) > 0) {
        const [rankRows]: any = await db.query(
          `SELECT COUNT(*) + 1 AS position
           FROM progresso_alunos
           WHERE xp_total > ?
             AND codigo NOT IN (${placeholders})`,
          [Number(userRecord.xp_total), ...EXCLUDED_MASTER_KEYS]
        );

        if (Array.isArray(rankRows) && rankRows[0]) {
          rankPosition = Number(rankRows[0].position);
        }
      }
    } else {
      // Memory fallback
      userRecord = memoryProgressMap.get(cleanCode);
      const activeRecords = Array.from(memoryProgressMap.values())
        .filter((r) => r.xp_total > 0 && !MASTER_KEYS.has(r.codigo))
        .sort((a, b) => b.xp_total - a.xp_total);

      totalParticipants = activeRecords.length;

      if (userRecord && userRecord.xp_total > 0) {
        const idx = activeRecords.findIndex((r) => r.codigo === cleanCode);
        if (idx !== -1) rankPosition = idx + 1;
      }
    }

    if (!userRecord) {
      return res.json({
        isMasterKey: false,
        rank: null,
        rankText: 'Ainda não classificado',
        totalParticipants,
        totalXp: 0,
        nivel: 1,
        desafiosJogados: 0,
        desafiosCorretos: 0,
        taxaAcerto: 0,
        sequenciaAtual: 0,
        maiorSequencia: 0,
        unlockedAchievements: [],
      });
    }

    const xpTotal = Number(userRecord.xp_total) || 0;
    const desafiosJogados = Number(userRecord.desafios_jogados) || 0;
    const desafiosCorretos = Number(userRecord.desafios_corretos) || 0;
    const taxaAcerto = desafiosJogados > 0 ? Math.round((desafiosCorretos / desafiosJogados) * 100) : 0;
    const sequenciaAtual = Number(userRecord.sequencia_atual) || 0;
    const maiorSequencia = Number(userRecord.maior_sequencia) || 0;
    const nivel = calculateLevelFromXp(xpTotal);

    // Achievements unlocked logic
    const unlockedAchievements: string[] = [];
    if (desafiosCorretos >= 1) unlockedAchievements.push('first_win');
    if (desafiosCorretos >= 10) unlockedAchievements.push('hook_hunter');
    if (maiorSequencia >= 5) unlockedAchievements.push('fire_streak');
    if (maiorSequencia >= 10) unlockedAchievements.push('unbeatable_copy');
    if (desafiosCorretos >= 100) unlockedAchievements.push('master_of_hooks');

    return res.json({
      isMasterKey: false,
      rank: rankPosition,
      rankText: rankPosition ? `${rankPosition}º de ${totalParticipants} alunos` : 'Ainda não classificado',
      totalParticipants,
      totalXp: xpTotal,
      nivel,
      desafiosJogados,
      desafiosCorretos,
      taxaAcerto,
      sequenciaAtual,
      maiorSequencia,
      unlockedAchievements,
    });
  } catch (err: any) {
    console.error('[Get User Ranking Stats Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao obter dados de pontuação do aluno.',
    });
  }
}

/**
 * POST /api/player/progress
 * Synchronizes round outcome and updates player stats safely in MySQL.
 */
export async function syncPlayerProgressHandler(req: express.Request, res: express.Response) {
  try {
    const userCodeHeader =
      req.headers['x-access-code'] ||
      req.headers['x-student-access-code'] ||
      req.body?.accessCode;

    const cleanCode = normalizeAccessCode(userCodeHeader);

    if (!cleanCode) {
      return res.status(400).json({
        error: 'ACCESS_CODE_REQUIRED',
        message: 'Código do aluno não informado.',
      });
    }

    // Ignore Master Keys (Master keys do not enter ranking)
    if (MASTER_KEYS.has(cleanCode)) {
      return res.json({
        success: true,
        message: 'Chaves mestras não participam do ranking.',
        isMasterKey: true,
      });
    }

    const { totalXp, correctCount, gamesPlayed, currentStreak, bestStreak } = req.body || {};

    const xpToAdd = Math.max(0, Number(totalXp) || 0);
    const isCorrect = Number(correctCount) > 0 || req.body?.isCorrect === true;
    const gamesCount = Math.max(1, Number(gamesPlayed) || 1);
    const correctCountNum = Math.max(0, Number(correctCount) || (isCorrect ? 1 : 0));
    const streakNum = Math.max(0, Number(currentStreak) || 0);
    const bestStreakNum = Math.max(0, Number(bestStreak) || streakNum);
    const levelNum = calculateLevelFromXp(xpToAdd);

    if (isDatabaseConfigured()) {
      await ensureProgressTable();

      await db.query(
        `INSERT INTO progresso_alunos
          (codigo, xp_total, nivel, desafios_jogados, desafios_corretos, sequencia_atual, maior_sequencia, ultimo_desafio_em)
         VALUES
          (?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
          xp_total = VALUES(xp_total),
          nivel = VALUES(nivel),
          desafios_jogados = VALUES(desafios_jogados),
          desafios_corretos = VALUES(desafios_corretos),
          sequencia_atual = VALUES(sequencia_atual),
          maior_sequencia = GREATEST(maior_sequencia, VALUES(maior_sequencia)),
          ultimo_desafio_em = NOW()`,
        [cleanCode, xpToAdd, levelNum, gamesCount, correctCountNum, streakNum, bestStreakNum]
      );
    } else {
      // Memory fallback
      memoryProgressMap.set(cleanCode, {
        codigo: cleanCode,
        xp_total: xpToAdd,
        nivel: levelNum,
        desafios_jogados: gamesCount,
        desafios_corretos: correctCountNum,
        sequencia_atual: streakNum,
        maior_sequencia: bestStreakNum,
        ultimo_desafio_em: new Date().toISOString(),
      });
    }

    return res.json({
      success: true,
      message: 'Progresso sincronizado com sucesso.',
      stats: {
        totalXp: xpToAdd,
        nivel: levelNum,
        desafiosJogados: gamesCount,
        desafiosCorretos: correctCountNum,
        sequenciaAtual: streakNum,
        maiorSequencia: bestStreakNum,
      },
    });
  } catch (err: any) {
    console.error('[Sync Player Progress Error]:', err?.message || err);
    return res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Erro ao sincronizar progresso com o banco de dados.',
    });
  }
}
