import { db, isDatabaseConfigured } from './database.js';

export interface NotificationItem {
  id: number;
  profile_id: number;
  notification_type: string;
  title: string;
  message: string | null;
  content: string | null;
  related_message_id: number | null;
  related_profile_id: number | null;
  related_room_id: number | null;
  related_poll_id: number | null;
  related_achievement_id: number | null;
  deduplication_key: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  actor?: {
    id: number;
    nickname: string;
    photo_url: string | null;
  } | null;
}

export interface CreateNotificationInput {
  profileId: number;
  notificationType:
    | 'REPLY_RECEIVED'
    | 'REACTION_RECEIVED'
    | 'MENTION_RECEIVED'
    | 'LEVEL_UP'
    | 'ACHIEVEMENT_UNLOCKED'
    | 'ANNOUNCEMENT_PUBLISHED'
    | 'POLL_CREATED'
    | 'TOP_10_ENTERED'
    | 'MENTOR_WARNING';
  title: string;
  message?: string | null;
  relatedMessageId?: number | null;
  relatedProfileId?: number | null;
  relatedRoomId?: number | null;
  relatedPollId?: number | null;
  relatedAchievementId?: number | null;
  deduplicationKey?: string | null;
}

// In-memory notifications store fallback
export const memoryNotificationsList: NotificationItem[] = [];
let memoryNotifIdCounter = 1;

export async function createNotification(input: CreateNotificationInput): Promise<boolean> {
  const {
    profileId,
    notificationType,
    title,
    message = null,
    relatedMessageId = null,
    relatedProfileId = null,
    relatedRoomId = null,
    relatedPollId = null,
    relatedAchievementId = null,
    deduplicationKey = null,
  } = input;

  if (!profileId) return false;

  if (isDatabaseConfigured()) {
    try {
      const [res]: any = await db.query(
        `INSERT IGNORE INTO chat_notifications
         (profile_id, notification_type, title, content, related_message_id, related_profile_id, related_room_id, related_poll_id, related_achievement_id, deduplication_key, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
        [
          profileId,
          notificationType,
          title,
          message,
          relatedMessageId,
          relatedProfileId,
          relatedRoomId,
          relatedPollId,
          relatedAchievementId,
          deduplicationKey,
        ]
      ).catch(() => [{ affectedRows: 0 }]);

      return Boolean(res && res.affectedRows > 0);
    } catch (err) {
      console.error('[createNotification Error]:', err);
      return false;
    }
  }

  // Memory fallback with deduplication check
  if (deduplicationKey && memoryNotificationsList.some((n) => n.deduplication_key === deduplicationKey)) {
    return false;
  }

  memoryNotificationsList.unshift({
    id: memoryNotifIdCounter++,
    profile_id: profileId,
    notification_type: notificationType,
    title,
    message,
    content: message,
    related_message_id: relatedMessageId,
    related_profile_id: relatedProfileId,
    related_room_id: relatedRoomId,
    related_poll_id: relatedPollId,
    related_achievement_id: relatedAchievementId,
    deduplication_key: deduplicationKey,
    is_read: false,
    read_at: null,
    created_at: new Date().toISOString(),
  });

  return true;
}

export async function createNotificationForActiveProfiles(
  input: Omit<CreateNotificationInput, 'profileId'> & { deduplicationKeyPrefix: string },
  excludeProfileId?: number
): Promise<number> {
  if (isDatabaseConfigured()) {
    try {
      const [pRows]: any = await db.query(
        `SELECT id FROM chat_profiles WHERE chat_status = 'ACTIVE'`
      );

      if (!Array.isArray(pRows)) return 0;

      let count = 0;
      for (const p of pRows) {
        if (excludeProfileId && p.id === excludeProfileId) continue;
        const dedupKey = `${input.deduplicationKeyPrefix}:${p.id}`;
        const created = await createNotification({
          ...input,
          profileId: p.id,
          deduplicationKey: dedupKey,
        });
        if (created) count++;
      }
      return count;
    } catch (err) {
      console.error('[createNotificationForActiveProfiles Error]:', err);
      return 0;
    }
  }

  // Memory fallback
  return 0;
}

export async function getUserNotifications(
  profileId: number,
  limit: number = 25,
  offset: number = 0,
  filter: 'ALL' | 'UNREAD' = 'ALL'
): Promise<{ notifications: NotificationItem[]; unreadCount: number; hasMore: boolean }> {
  if (isDatabaseConfigured()) {
    try {
      const whereClause = filter === 'UNREAD'
        ? 'WHERE n.profile_id = ? AND n.is_read = 0'
        : 'WHERE n.profile_id = ?';

      const [rows]: any = await db.query(
        `SELECT n.*,
                p.id AS actor_id,
                p.nickname AS actor_nickname,
                p.photo_url AS actor_photo_url
         FROM chat_notifications n
         LEFT JOIN chat_profiles p ON p.id = n.related_profile_id
         ${whereClause}
         ORDER BY n.id DESC
         LIMIT ? OFFSET ?`,
        [profileId, limit + 1, offset]
      );

      const [unreadRows]: any = await db.query(
        `SELECT COUNT(*) AS total FROM chat_notifications WHERE profile_id = ? AND is_read = 0`,
        [profileId]
      );

      const unreadCount = Number(unreadRows?.[0]?.total || 0);
      const items = Array.isArray(rows) ? rows : [];
      const hasMore = items.length > limit;
      const sliced = hasMore ? items.slice(0, limit) : items;

      const formatted = sliced.map((r: any) => ({
        id: r.id,
        profile_id: r.profile_id,
        notification_type: r.notification_type,
        title: r.title,
        message: r.content || r.message || '',
        content: r.content || r.message || '',
        related_message_id: r.related_message_id || null,
        related_profile_id: r.related_profile_id || null,
        related_room_id: r.related_room_id || null,
        related_poll_id: r.related_poll_id || null,
        related_achievement_id: r.related_achievement_id || null,
        deduplication_key: r.deduplication_key || null,
        is_read: Boolean(r.is_read),
        read_at: r.read_at || null,
        created_at: r.created_at,
        actor: r.actor_id ? {
          id: r.actor_id,
          nickname: r.actor_nickname,
          photo_url: r.actor_photo_url,
        } : null,
      }));

      return { notifications: formatted, unreadCount, hasMore };
    } catch (err) {
      console.error('[getUserNotifications Error]:', err);
    }
  }

  // Memory fallback
  const userNotifs = memoryNotificationsList.filter((n) => {
    if (n.profile_id !== profileId) return false;
    if (filter === 'UNREAD') return !n.is_read;
    return true;
  });

  const unreadCount = memoryNotificationsList.filter((n) => n.profile_id === profileId && !n.is_read).length;
  const sliced = userNotifs.slice(offset, offset + limit);

  return {
    notifications: sliced,
    unreadCount,
    hasMore: userNotifs.length > offset + limit,
  };
}

export async function getUnreadNotificationCount(profileId: number): Promise<number> {
  if (isDatabaseConfigured()) {
    try {
      const [rows]: any = await db.query(
        `SELECT COUNT(*) AS total FROM chat_notifications WHERE profile_id = ? AND is_read = 0`,
        [profileId]
      );
      return Number(rows?.[0]?.total || 0);
    } catch (err) {
      console.error('[getUnreadNotificationCount Error]:', err);
    }
  }

  return memoryNotificationsList.filter((n) => n.profile_id === profileId && !n.is_read).length;
}

export async function markNotificationRead(id: number, profileId: number): Promise<boolean> {
  if (isDatabaseConfigured()) {
    try {
      await db.query(
        `UPDATE chat_notifications SET is_read = 1, read_at = NOW() WHERE id = ? AND profile_id = ?`,
        [id, profileId]
      );
      return true;
    } catch (err) {
      console.error('[markNotificationRead Error]:', err);
      return false;
    }
  }

  const found = memoryNotificationsList.find((n) => n.id === id && n.profile_id === profileId);
  if (found) {
    found.is_read = true;
    found.read_at = new Date().toISOString();
  }
  return true;
}

export async function markAllNotificationsRead(profileId: number): Promise<boolean> {
  if (isDatabaseConfigured()) {
    try {
      await db.query(
        `UPDATE chat_notifications SET is_read = 1, read_at = NOW() WHERE profile_id = ? AND is_read = 0`,
        [profileId]
      );
      return true;
    } catch (err) {
      console.error('[markAllNotificationsRead Error]:', err);
      return false;
    }
  }

  memoryNotificationsList.forEach((n) => {
    if (n.profile_id === profileId && !n.is_read) {
      n.is_read = true;
      n.read_at = new Date().toISOString();
    }
  });
  return true;
}
