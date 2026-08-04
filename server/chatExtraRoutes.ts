import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { db, isDatabaseConfigured } from './database.js';
import { extractChatCredentials, getProfileBySessionCode, memoryMessagesList } from './chatService.js';
import { awardXp, calculateLevelFromXp } from './chatXpService.js';
import { processAndUploadMedia } from './chatMediaService.js';
import { isMasterKey, normalizeAccessCode } from './authKeys.js';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  createNotificationForActiveProfiles,
} from './notificationService.js';

export const chatExtraRouter = Router();

// GET /api/chat/profile/stats
chatExtraRouter.get('/chat/profile/stats', async (req: Request, res: Response) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) {
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sessão não identificada.' });
    }
    const { profile, isMentor } = await getProfileBySessionCode(accessCode);
    if (!profile) {
      return res.status(400).json({ error: 'NO_PROFILE', message: 'Perfil não encontrado.' });
    }

    if (!isDatabaseConfigured()) {
      const levelInfo = calculateLevelFromXp(profile.xp || 0);
      return res.json({
        stats: {
          xpTotal: profile.xp || 0,
          currentLevel: levelInfo.level,
          currentLevelXp: levelInfo.currentLevelXp,
          nextLevelXp: levelInfo.nextLevelXp,
          levelProgressPercent: levelInfo.progressPercent,
          messageCount: 0,
          replyCount: 0,
          reactionGivenCount: 0,
          reactionReceivedCount: 0,
          imageCount: 0,
          audioCount: 0,
          pollVoteCount: 0,
          currentStreak: 0,
          longestStreak: 0,
          profileRank: 1,
          isMentor,
        },
      });
    }

    const [rows]: any = await db.query(
      `SELECT xp_total, current_level, message_count, reply_count,
              reaction_given_count, reaction_received_count, image_count, audio_count,
              poll_vote_count, current_streak, longest_streak
       FROM chat_profiles
       WHERE id = ? LIMIT 1`,
      [profile.id]
    );

    const data = rows?.[0] || {};
    const xpTotal = Number(data.xp_total || profile.xp || 0);
    const levelInfo = calculateLevelFromXp(xpTotal);

    // Calculate rank
    const [rankRows]: any = await db.query(
      `SELECT COUNT(*) + 1 AS rankPosition FROM chat_profiles WHERE xp_total > ? AND chat_status = 'ACTIVE'`,
      [xpTotal]
    );

    const rankPosition = Number(rankRows?.[0]?.rankPosition || 1);

    return res.json({
      stats: {
        xpTotal,
        currentLevel: levelInfo.level,
        currentLevelXp: levelInfo.currentLevelXp,
        nextLevelXp: levelInfo.nextLevelXp,
        levelProgressPercent: levelInfo.progressPercent,
        messageCount: Number(data.message_count || 0),
        replyCount: Number(data.reply_count || 0),
        reactionGivenCount: Number(data.reaction_given_count || 0),
        reactionReceivedCount: Number(data.reaction_received_count || 0),
        imageCount: Number(data.image_count || 0),
        audioCount: Number(data.audio_count || 0),
        pollVoteCount: Number(data.poll_vote_count || 0),
        currentStreak: Number(data.current_streak || 0),
        longestStreak: Number(data.longest_streak || 0),
        profileRank: rankPosition,
        isMentor,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/chat/profile/stats Error]:', err?.message || err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// GET /api/chat/profile/achievements
chatExtraRouter.get('/chat/profile/achievements', async (req: Request, res: Response) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    const { profile } = await getProfileBySessionCode(accessCode);
    if (!profile) {
      return res.status(400).json({ error: 'NO_PROFILE' });
    }

    if (!isDatabaseConfigured()) {
      return res.json({ achievements: [] });
    }

    const [rows]: any = await db.query(
      `SELECT a.*,
              (CASE WHEN pa.id IS NOT NULL THEN 1 ELSE 0 END) AS unlocked,
              pa.unlocked_at
       FROM chat_achievements a
       LEFT JOIN chat_profile_achievements pa ON pa.achievement_id = a.id AND pa.profile_id = ?
       WHERE a.is_active = 1
       ORDER BY a.id ASC`,
      [profile.id]
    );

    return res.json({
      achievements: (rows || []).map((r: any) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        description: r.description,
        icon: r.icon,
        xpReward: r.xp_reward,
        unlocked: Boolean(r.unlocked),
        unlockedAt: r.unlocked_at || null,
      })),
    });
  } catch (err: any) {
    console.error('[GET /api/chat/profile/achievements Error]:', err?.message || err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

const memoryAnnouncementsList: Array<{
  id: number;
  title: string;
  content: string;
  type: string;
  badge: string | null;
  isPinned: boolean;
  createdBy: string;
  createdAt: string;
}> = [];
let memoryAnnouncementIdCounter = 1;

// GET /api/chat/announcements
chatExtraRouter.get('/chat/announcements', async (_req: Request, res: Response) => {
  try {
    if (!isDatabaseConfigured()) {
      return res.json({ announcements: memoryAnnouncementsList });
    }

    const [rows]: any = await db.query(
      `SELECT * FROM chat_announcements
       WHERE (starts_at IS NULL OR starts_at <= NOW())
         AND (ends_at IS NULL OR ends_at >= NOW())
       ORDER BY is_pinned DESC, id DESC`
    );

    return res.json({
      announcements: (rows || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        content: r.content,
        type: r.announcement_type,
        badge: r.badge,
        isPinned: Boolean(r.is_pinned),
        createdBy: r.created_by,
        createdAt: r.created_at,
      })),
    });
  } catch (err: any) {
    console.error('[GET /api/chat/announcements Error]:', err?.message || err);
    return res.status(500).json({ error: 'SERVER_ERROR', announcements: memoryAnnouncementsList });
  }
});

// POST /api/admin/chat/announcements (Mentor create announcement)
chatExtraRouter.post('/admin/chat/announcements', async (req: Request, res: Response) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode || !isMasterKey(accessCode)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Apenas o Mentor pode criar comunicados oficiais.' });
    }

    const { title, content, type = 'NOTICE', badge = null, isPinned = false } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'TITLE_AND_CONTENT_REQUIRED' });
    }

    if (isDatabaseConfigured()) {
      const [resIns]: any = await db.query(
        `INSERT INTO chat_announcements (title, content, announcement_type, badge, is_pinned, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, 'Mentor Bigode', NOW())`,
        [title.trim(), content.trim(), type, badge, isPinned ? 1 : 0]
      );

      createNotificationForActiveProfiles({
        notificationType: 'ANNOUNCEMENT_PUBLISHED',
        title: 'O Mentor publicou um novo comunicado.',
        message: title.trim(),
        deduplicationKeyPrefix: `announcement:${resIns.insertId}`,
      }).catch(() => {});

      return res.json({ success: true, announcementId: resIns.insertId });
    }

    const newId = memoryAnnouncementIdCounter++;
    const newAnn = {
      id: newId,
      title: title.trim(),
      content: content.trim(),
      type,
      badge: badge || '📢 AVISO OFICIAL',
      isPinned: Boolean(isPinned),
      createdBy: 'Mentor Bigode',
      createdAt: new Date().toISOString(),
    };
    memoryAnnouncementsList.unshift(newAnn);

    createNotificationForActiveProfiles({
      notificationType: 'ANNOUNCEMENT_PUBLISHED',
      title: 'O Mentor publicou um novo comunicado.',
      message: title.trim(),
      deduplicationKeyPrefix: `announcement:${newId}`,
    }).catch(() => {});

    return res.json({ success: true, announcementId: newId });
  } catch (err: any) {
    console.error('[POST /api/admin/chat/announcements Error]:', err?.message || err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// DELETE /api/admin/chat/announcements/:id
chatExtraRouter.delete('/admin/chat/announcements/:id', async (req: Request, res: Response) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode || !isMasterKey(accessCode)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const annId = Number(req.params.id);
    if (isDatabaseConfigured()) {
      await db.query(`DELETE FROM chat_announcements WHERE id = ?`, [annId]);
    }
    const idx = memoryAnnouncementsList.findIndex((a) => a.id === annId);
    if (idx !== -1) {
      memoryAnnouncementsList.splice(idx, 1);
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// GET /api/chat/notifications
chatExtraRouter.get('/chat/notifications', async (req: Request, res: Response) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    const { profile } = await getProfileBySessionCode(accessCode);
    if (!profile) {
      return res.status(400).json({ error: 'NO_PROFILE' });
    }

    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    const filter = req.query.filter === 'UNREAD' ? 'UNREAD' : 'ALL';

    const result = await getUserNotifications(profile.id, limit, offset, filter);

    return res.json({
      success: true,
      notifications: result.notifications,
      unreadCount: result.unreadCount,
      hasMore: result.hasMore,
    });
  } catch (err: any) {
    console.error('[GET /api/chat/notifications Error]:', err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// GET /api/chat/notifications/unread-count
chatExtraRouter.get('/chat/notifications/unread-count', async (req: Request, res: Response) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    const { profile } = await getProfileBySessionCode(accessCode);
    if (!profile) {
      return res.status(400).json({ error: 'NO_PROFILE' });
    }

    const unreadCount = await getUnreadNotificationCount(profile.id);
    return res.json({ success: true, unreadCount });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// POST /api/chat/notifications/:id/read
chatExtraRouter.post('/chat/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    const { profile } = await getProfileBySessionCode(accessCode);
    if (!profile) {
      return res.status(400).json({ error: 'NO_PROFILE' });
    }

    const notifId = Number(req.params.id);
    await markNotificationRead(notifId, profile.id);
    const unreadCount = await getUnreadNotificationCount(profile.id);

    return res.json({ success: true, unreadCount });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// POST /api/chat/notifications/read-all
chatExtraRouter.post('/chat/notifications/read-all', async (req: Request, res: Response) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) {
      return res.status(401).json({ error: 'UNAUTHORIZED' });
    }
    const { profile } = await getProfileBySessionCode(accessCode);
    if (!profile) {
      return res.status(400).json({ error: 'NO_PROFILE' });
    }

    await markAllNotificationsRead(profile.id);
    return res.json({ success: true, unreadCount: 0 });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// GET /api/chat/messages/:id/readers
chatExtraRouter.get('/chat/messages/:id/readers', async (req: Request, res: Response) => {
  try {
    const messageId = Number(req.params.id);
    if (!isDatabaseConfigured()) {
      return res.json({ readers: [] });
    }

    const [rows]: any = await db.query(
      `SELECT r.read_at, p.nickname, p.photo_url, p.codigo
       FROM chat_message_reads r
       JOIN chat_profiles p ON p.id = r.profile_id
       WHERE r.message_id = ?
       ORDER BY r.read_at DESC`,
      [messageId]
    );

    return res.json({
      readers: (rows || []).map((r: any) => ({
        nickname: isMasterKey(r.codigo) ? 'Mentor Bigode' : r.nickname,
        photo_url: r.photo_url,
        readAt: r.read_at,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// Unified POST /api/chat/upload and /api/chat/upload-audio endpoints
const handleMediaUpload = async (req: Request, res: Response) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode) {
      return res.status(401).json({ error: 'INVALID_SESSION', message: 'Sessão não identificada.' });
    }
    const { profile } = await getProfileBySessionCode(accessCode);
    if (!profile) {
      return res.status(400).json({ error: 'INVALID_SESSION', message: 'Perfil não cadastrado.' });
    }

    if (profile.chat_status === 'SUSPENDED') {
      return res.status(403).json({ error: 'CHAT_SUSPENDED', message: 'Sua conta está suspensa do bate-papo.' });
    }
    if (profile.chat_status === 'BANNED') {
      return res.status(403).json({ error: 'CHAT_BANNED', message: 'Sua conta foi banida do bate-papo.' });
    }

    const isAudioRoute = req.path.includes('upload-audio');
    const {
      base64,
      mime,
      mediaType = isAudioRoute ? 'AUDIO' : 'IMAGE',
      duration = 0,
      width = null,
      height = null,
    } = req.body || {};

    if (!base64) {
      return res.status(400).json({ error: 'NO_DATA', message: 'Nenhum dado de mídia foi enviado.' });
    }

    const uploadResult = await processAndUploadMedia({
      profileId: profile.id,
      base64,
      mime,
      mediaType: isAudioRoute ? 'AUDIO' : mediaType,
      duration,
      width,
      height,
    });

    if (!uploadResult.success) {
      return res.status(400).json({
        error: 'AUDIO_UPLOAD_FAILED',
        message: uploadResult.error || 'Falha no upload de mídia.',
      });
    }

    const mediaUrl = uploadResult.media?.url || '';
    return res.json({
      ...uploadResult,
      audioUrl: mediaUrl,
      imageUrl: mediaUrl,
    });
  } catch (err: any) {
    console.error('[POST /api/chat/upload Error]:', err?.message || err);
    return res.status(500).json({ error: 'SERVER_ERROR', message: 'Erro interno ao processar o arquivo.' });
  }
};

chatExtraRouter.post('/chat/upload', handleMediaUpload);
chatExtraRouter.post('/chat/upload-audio', handleMediaUpload);
chatExtraRouter.post('/chat/upload-image', handleMediaUpload);
chatExtraRouter.post('/chat/upload-profile-photo', handleMediaUpload);

// GET /api/chat/media (Community Gallery media listing)
chatExtraRouter.get('/chat/media', async (_req: Request, res: Response) => {
  try {
    if (isDatabaseConfigured()) {
      const [rows]: any = await db.query(`
        SELECT 
          m.id,
          m.message_type,
          m.content,
          m.image_url,
          m.caption,
          m.created_at,
          p.nickname AS author_nickname,
          p.codigo,
          cm.public_url AS media_public_url,
          cm.media_type
        FROM chat_messages m
        JOIN chat_profiles p ON p.id = m.profile_id
        LEFT JOIN chat_media cm ON cm.message_id = m.id OR (m.image_url IS NOT NULL AND cm.public_url = m.image_url)
        WHERE m.deleted_at IS NULL
          AND (m.image_url IS NOT NULL OR m.message_type IN ('IMAGE', 'GIF', 'STICKER') OR cm.public_url IS NOT NULL)
        ORDER BY m.id DESC
      `);

      const items = (rows || []).map((r: any) => {
        const url = r.media_public_url || r.image_url || '';
        let type: 'IMAGE' | 'GIF' | 'FILE' = 'IMAGE';
        if (r.media_type === 'GIF' || r.message_type === 'GIF' || (url && url.toLowerCase().includes('.gif'))) {
          type = 'GIF';
        } else if (r.message_type === 'AUDIO' || r.media_type === 'AUDIO') {
          type = 'FILE';
        }
        return {
          id: r.id,
          url,
          type,
          caption: r.caption || r.content || null,
          authorNickname: isMasterKey(r.codigo) ? 'Mentor Bigode' : (r.author_nickname || 'Aluno'),
          createdAt: r.created_at,
        };
      }).filter((item: any) => Boolean(item.url));

      return res.json({ success: true, items });
    }

    // Fallback to memory
    const items = memoryMessagesList
      .filter((m) => !m.deleted_at && (m.image_url || m.media?.public_url || ['IMAGE', 'GIF', 'STICKER'].includes(m.message_type)))
      .map((m) => {
        const url = m.media?.public_url || m.image_url || '';
        let type: 'IMAGE' | 'GIF' | 'FILE' = 'IMAGE';
        if (m.message_type === 'GIF' || (url && url.toLowerCase().includes('.gif'))) {
          type = 'GIF';
        } else if (m.message_type === 'AUDIO') {
          type = 'FILE';
        }
        return {
          id: m.id,
          url,
          type,
          caption: m.caption || m.content || null,
          authorNickname: m.author?.nickname || (m as any).nickname || 'Aluno',
          createdAt: m.created_at,
        };
      })
      .filter((item) => Boolean(item.url));

    return res.json({ success: true, items });
  } catch (err: any) {
    console.error('[GET /api/chat/media Error]:', err?.message || err);
    return res.status(500).json({ error: 'SERVER_ERROR', items: [] });
  }
});

// POST /api/admin/chat/profiles/:id/xp (Mentor manually adjusts user XP)
chatExtraRouter.post('/admin/chat/profiles/:id/xp', async (req: Request, res: Response) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode || !isMasterKey(accessCode)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Apenas o Mentor pode conceder bônus de XP.' });
    }

    const profileId = Number(req.params.id);
    const { xpAmount = 50, reason = 'Bônus do Mentor' } = req.body;

    const result = await awardXp(
      profileId,
      'MENTOR_BONUS',
      Number(xpAmount),
      `bonus_${profileId}_${Date.now()}`,
      'MENTOR_BONUS',
      null
    );

    return res.json({ success: true, ...result, reason });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});

// GET /api/admin/chat/profiles/:id/xp-history
chatExtraRouter.get('/admin/chat/profiles/:id/xp-history', async (req: Request, res: Response) => {
  try {
    const { accessCode } = extractChatCredentials(req);
    if (!accessCode || !isMasterKey(accessCode)) {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const profileId = Number(req.params.id);
    if (!isDatabaseConfigured()) {
      return res.json({ history: [] });
    }

    const [rows]: any = await db.query(
      `SELECT * FROM chat_xp_events WHERE profile_id = ? ORDER BY id DESC LIMIT 100`,
      [profileId]
    );

    return res.json({ history: rows || [] });
  } catch (err: any) {
    return res.status(500).json({ error: 'SERVER_ERROR' });
  }
});
