import { db, isDatabaseConfigured } from './database.js';
import { createNotification } from './notificationService.js';

export function calculateLevelFromXp(totalXp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
} {
  const safeXp = Math.max(0, totalXp || 0);

  // Progressive Level formula:
  // Lvl 1: 0, Lvl 2: 100, Lvl 3: 250, Lvl 4: 450, Lvl 5: 700...
  // Level threshold function: T(L) = 50 * (L - 1) * L
  let level = 1;
  while (50 * level * (level + 1) <= safeXp) {
    level++;
  }

  const currentLevelMinXp = 50 * (level - 1) * level;
  const nextLevelMinXp = 50 * level * (level + 1);
  const xpInLevel = safeXp - currentLevelMinXp;
  const xpRequiredForNext = nextLevelMinXp - currentLevelMinXp;

  const progressPercent = Math.min(
    100,
    Math.floor((xpInLevel / Math.max(1, xpRequiredForNext)) * 100)
  );

  return {
    level,
    currentLevelXp: safeXp,
    nextLevelXp: nextLevelMinXp,
    progressPercent,
  };
}

export const INITIAL_ACHIEVEMENTS = [
  {
    code: 'FIRST_MESSAGE',
    name: 'Primeiro Passo',
    description: 'Enviou a primeira mensagem na comunidade.',
    icon: '💬',
    xp_reward: 20,
    criteria_type: 'MESSAGE_COUNT',
    criteria_value: 1,
  },
  {
    code: 'MESSAGE_50',
    name: 'Comunicador Engajado',
    description: 'Enviou 50 mensagens no chat.',
    icon: '⚡',
    xp_reward: 50,
    criteria_type: 'MESSAGE_COUNT',
    criteria_value: 50,
  },
  {
    code: 'MESSAGE_100',
    name: 'Voz da Comunidade',
    description: 'Enviou 100 mensagens no chat.',
    icon: '🔥',
    xp_reward: 100,
    criteria_type: 'MESSAGE_COUNT',
    criteria_value: 100,
  },
  {
    code: 'MESSAGE_500',
    name: 'Lenda do Bate-papo',
    description: 'Enviou 500 mensagens no chat.',
    icon: '👑',
    xp_reward: 300,
    criteria_type: 'MESSAGE_COUNT',
    criteria_value: 500,
  },
  {
    code: 'REPLY_100',
    name: 'Mestre da Conversa',
    description: 'Enviou 100 respostas para outros alunos.',
    icon: '↩️',
    xp_reward: 150,
    criteria_type: 'REPLY_COUNT',
    criteria_value: 100,
  },
  {
    code: 'REACTION_100',
    name: 'Reativo',
    description: 'Enviou 100 reações no bate-papo.',
    icon: '❤️',
    xp_reward: 80,
    criteria_type: 'REACTION_COUNT',
    criteria_value: 100,
  },
  {
    code: 'STREAK_7',
    name: 'Foco Semanal',
    description: 'Manteve 7 dias de sequência diária.',
    icon: '📅',
    xp_reward: 70,
    criteria_type: 'CURRENT_STREAK',
    criteria_value: 7,
  },
  {
    code: 'STREAK_30',
    name: 'Imparável',
    description: 'Manteve 30 dias de sequência diária.',
    icon: '🏆',
    xp_reward: 250,
    criteria_type: 'CURRENT_STREAK',
    criteria_value: 30,
  },
  {
    code: 'ACTIVE_MEMBER',
    name: 'Membro Ativo',
    description: 'Alcançou o Nível 5 na comunidade.',
    icon: '⭐',
    xp_reward: 150,
    criteria_type: 'LEVEL',
    criteria_value: 5,
  },
  {
    code: 'LEVEL_10',
    name: 'Veterano',
    description: 'Alcançou o Nível 10 na comunidade.',
    icon: '🌟',
    xp_reward: 300,
    criteria_type: 'LEVEL',
    criteria_value: 10,
  },
  {
    code: 'LEVEL_25',
    name: 'Mestre Geração Z',
    description: 'Alcançou o Nível 25 na comunidade.',
    icon: '💎',
    xp_reward: 600,
    criteria_type: 'LEVEL',
    criteria_value: 25,
  },
  {
    code: 'LEVEL_50',
    name: 'Sábio Supremo',
    description: 'Alcançou o Nível 50 na comunidade.',
    icon: '👑',
    xp_reward: 1500,
    criteria_type: 'LEVEL',
    criteria_value: 50,
  },
  {
    code: 'TOP_10',
    name: 'Elite da Comunidade',
    description: 'Entrou no Top 10 do ranking geral.',
    icon: '🚀',
    xp_reward: 200,
    criteria_type: 'RANKING_TOP_10',
    criteria_value: 10,
  },
  {
    code: 'MENTOR_OFFICIAL',
    name: 'Mentor Oficial',
    description: 'Perfil de tutoria oficial da plataforma.',
    icon: '🎩',
    xp_reward: 0,
    criteria_type: 'SPECIAL_MENTOR',
    criteria_value: 1,
  },
];

export async function seedAchievements(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    for (const ach of INITIAL_ACHIEVEMENTS) {
      await db.query(
        `INSERT INTO chat_achievements (code, name, description, icon, xp_reward, criteria_type, criteria_value, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           description = VALUES(description),
           icon = VALUES(icon),
           xp_reward = VALUES(xp_reward)`,
        [ach.code, ach.name, ach.description, ach.icon, ach.xp_reward, ach.criteria_type, ach.criteria_value]
      ).catch(() => {});
    }
  } catch (e: any) {
    console.warn('[seedAchievements Error]:', e?.message || e);
  }
}

export async function awardXp(
  profileId: number,
  eventType: string,
  baseXp: number,
  deduplicationKey: string,
  refType?: string,
  refId?: number
): Promise<{ added: boolean; totalXp: number; level: number; levelUp: boolean }> {
  if (!isDatabaseConfigured() || !profileId) {
    return { added: false, totalXp: 0, level: 1, levelUp: false };
  }

  try {
    // Check daily cap for message/reply XP (max 100 XP per day from daily interactions)
    if (['MESSAGE_SENT', 'REPLY_SENT', 'REACTION_RECEIVED', 'POLL_VOTED'].includes(eventType)) {
      const todayStr = new Date().toISOString().split('T')[0];
      const [dailyRows]: any = await db.query(
        `SELECT SUM(xp_amount) AS dailyTotal
         FROM chat_xp_events
         WHERE profile_id = ?
           AND event_type IN ('MESSAGE_SENT', 'REPLY_SENT', 'REACTION_RECEIVED', 'POLL_VOTED')
           AND DATE(created_at) = ?`,
        [profileId, todayStr]
      );
      const dailySum = Number(dailyRows?.[0]?.dailyTotal || 0);
      if (dailySum >= 100) {
        // Daily cap reached
        return { added: false, totalXp: 0, level: 1, levelUp: false };
      }
    }

    // Insert XP event with deduplication key
    const [insertResult]: any = await db.query(
      `INSERT IGNORE INTO chat_xp_events (profile_id, event_type, reference_type, reference_id, xp_amount, deduplication_key)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [profileId, eventType, refType || null, refId || null, baseXp, deduplicationKey]
    ).catch(() => [{ affectedRows: 0 }]);

    if (!insertResult || insertResult.affectedRows === 0) {
      // Event already recorded
      return { added: false, totalXp: 0, level: 1, levelUp: false };
    }

    // Get current xp_total and level
    const [profRows]: any = await db.query(
      `SELECT xp_total, current_level, current_streak, last_participation_date FROM chat_profiles WHERE id = ?`,
      [profileId]
    );

    if (!profRows || profRows.length === 0) {
      return { added: false, totalXp: 0, level: 1, levelUp: false };
    }

    const currentXp = Number(profRows[0].xp_total || 0);
    const oldLevel = Number(profRows[0].current_level || 1);
    const newXp = currentXp + baseXp;

    const { level: newLevel } = calculateLevelFromXp(newXp);
    const levelUp = newLevel > oldLevel;

    // Daily streak logic
    const todayDate = new Date().toISOString().split('T')[0];
    const lastDate = profRows[0].last_participation_date
      ? new Date(profRows[0].last_participation_date).toISOString().split('T')[0]
      : null;

    let newStreak = Number(profRows[0].current_streak || 0);
    if (lastDate !== todayDate) {
      if (lastDate) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        if (lastDate === yesterdayStr) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }
    }

    await db.query(
      `UPDATE chat_profiles
       SET xp_total = ?,
           xp = ?,
           current_level = ?,
           current_streak = ?,
           longest_streak = GREATEST(longest_streak, ?),
           last_participation_date = ?,
           last_xp_event_at = NOW()
       WHERE id = ?`,
      [newXp, newXp, newLevel, newStreak, newStreak, todayDate, profileId]
    );

    // Trigger level up notification
    if (levelUp) {
      createNotification({
        profileId,
        notificationType: 'LEVEL_UP',
        title: 'Novo Nível Alcançado!',
        message: `Você chegou ao Nível ${newLevel}.`,
        deduplicationKey: `level:${profileId}:${newLevel}`,
      }).catch(() => {});
    }

    // Check if user is in Top 10
    const [rankRows]: any = await db.query(
      `SELECT COUNT(*) + 1 AS rankPosition FROM chat_profiles WHERE xp_total > ? AND chat_status = 'ACTIVE'`,
      [newXp]
    ).catch(() => []);
    const rankPos = Number(rankRows?.[0]?.rankPosition || 999);
    if (rankPos <= 10) {
      createNotification({
        profileId,
        notificationType: 'TOP_10_ENTERED',
        title: 'Você entrou para o Top 10 da comunidade!',
        message: `Parabéns! Você alcançou a posição #${rankPos} no ranking da comunidade.`,
        deduplicationKey: `top10:${profileId}:${rankPos}`,
      }).catch(() => {});
    }

    // Check achievement unlocks
    await checkAndAwardAchievements(profileId, newXp, newLevel, newStreak);

    return { added: true, totalXp: newXp, level: newLevel, levelUp };
  } catch (err: any) {
    console.error('[awardXp Error]:', err?.message || err);
    return { added: false, totalXp: 0, level: 1, levelUp: false };
  }
}

export async function checkAndAwardAchievements(
  profileId: number,
  xpTotal: number,
  level: number,
  streak: number
): Promise<void> {
  if (!isDatabaseConfigured() || !profileId) return;

  try {
    const [profRows]: any = await db.query(
      `SELECT message_count, reply_count FROM chat_profiles WHERE id = ?`,
      [profileId]
    );
    const msgCount = Number(profRows?.[0]?.message_count || 0);

    const [achList]: any = await db.query(
      `SELECT * FROM chat_achievements WHERE is_active = 1`
    );

    for (const ach of achList) {
      let isEligible = false;
      if (ach.criteria_type === 'MESSAGE_COUNT' && msgCount >= ach.criteria_value) {
        isEligible = true;
      } else if (ach.criteria_type === 'CURRENT_STREAK' && streak >= ach.criteria_value) {
        isEligible = true;
      } else if (ach.criteria_type === 'LEVEL' && level >= ach.criteria_value) {
        isEligible = true;
      }

      if (isEligible) {
        const [inserted]: any = await db.query(
          `INSERT IGNORE INTO chat_profile_achievements (profile_id, achievement_id) VALUES (?, ?)`,
          [profileId, ach.id]
        ).catch(() => [{ affectedRows: 0 }]);

        if (inserted && inserted.affectedRows > 0) {
          createNotification({
            profileId,
            notificationType: 'ACHIEVEMENT_UNLOCKED',
            title: 'Nova Conquista Desbloqueada!',
            message: `${ach.name}: ${ach.description || ''}`,
            relatedAchievementId: ach.id,
            deduplicationKey: `achievement:${profileId}:${ach.id}`,
          }).catch(() => {});

          if (ach.xp_reward > 0) {
            // Award XP bonus for achievement
            await awardXp(
              profileId,
              'ACHIEVEMENT_UNLOCKED',
              ach.xp_reward,
              `ach_${profileId}_${ach.id}`,
              'ACHIEVEMENT',
              ach.id
            );
          }
        }
      }
    }
  } catch (e: any) {
    console.warn('[checkAndAwardAchievements Error]:', e?.message || e);
  }
}

export async function recalculateUserStats(profileId: number): Promise<void> {
  if (!isDatabaseConfigured() || !profileId) return;

  try {
    const [msgCountRows]: any = await db.query(
      `SELECT
         COUNT(*) AS totalMsg,
         SUM(CASE WHEN reply_to_message_id IS NOT NULL THEN 1 ELSE 0 END) AS totalReplies,
         SUM(CASE WHEN message_type = 'IMAGE' THEN 1 ELSE 0 END) AS totalImages,
         SUM(CASE WHEN message_type = 'AUDIO' THEN 1 ELSE 0 END) AS totalAudios
       FROM chat_messages
       WHERE profile_id = ? AND deleted_at IS NULL`,
      [profileId]
    );

    const totalMsg = Number(msgCountRows?.[0]?.totalMsg || 0);
    const totalReplies = Number(msgCountRows?.[0]?.totalReplies || 0);
    const totalImages = Number(msgCountRows?.[0]?.totalImages || 0);
    const totalAudios = Number(msgCountRows?.[0]?.totalAudios || 0);

    const [givenReactRows]: any = await db.query(
      `SELECT COUNT(*) AS cnt FROM chat_reactions WHERE profile_id = ?`,
      [profileId]
    );

    const [recvReactRows]: any = await db.query(
      `SELECT COUNT(*) AS cnt
       FROM chat_reactions r
       JOIN chat_messages m ON r.message_id = m.id
       WHERE m.profile_id = ?`,
      [profileId]
    );

    const [pollVoteRows]: any = await db.query(
      `SELECT COUNT(*) AS cnt FROM chat_poll_votes WHERE profile_id = ?`,
      [profileId]
    );

    await db.query(
      `UPDATE chat_profiles
       SET message_count = ?,
           reply_count = ?,
           image_count = ?,
           audio_count = ?,
           reaction_given_count = ?,
           reaction_received_count = ?,
           poll_vote_count = ?
       WHERE id = ?`,
      [
        totalMsg,
        totalReplies,
        totalImages,
        totalAudios,
        Number(givenReactRows?.[0]?.cnt || 0),
        Number(recvReactRows?.[0]?.cnt || 0),
        Number(pollVoteRows?.[0]?.cnt || 0),
        profileId,
      ]
    );
  } catch (e: any) {
    console.warn('[recalculateUserStats Error]:', e?.message || e);
  }
}
