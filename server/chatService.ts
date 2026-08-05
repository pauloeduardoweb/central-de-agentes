import { db, isDatabaseConfigured, ensureChatTables } from './database.js';
import { normalizeAccessCode, isMasterKey } from './authKeys.js';
import { memorySessionsMap, getCentralPresenceData } from './presenceService.js';
import { awardXp, recalculateUserStats, calculateLevelFromXp } from './chatXpService.js';
import { createNotification, createNotificationForActiveProfiles } from './notificationService.js';
import { processAndUploadMedia } from './chatMediaService.js';

export function extractChatCredentials(req: any) {
  const accessCode =
    req.headers?.['x-access-code'] ||
    req.headers?.['x-student-access-code'] ||
    req.body?.accessCode ||
    req.body?.code ||
    req.query?.accessCode;

  const sessionId =
    req.headers?.['x-session-id'] ||
    req.body?.sessionId ||
    req.query?.sessionId;

  return {
    accessCode: String(accessCode || '').trim(),
    sessionId: String(sessionId || '').trim(),
  };
}

export const RESERVED_NICKNAMES = [
  'mentor bigode',
  'mentor',
  'bigode',
  'administrador',
  'admin',
  'suporte oficial',
  'suporte',
  'geracao z pro',
  'geração z pro',
  'moderador',
  'sistema',
  'official',
  'oficial',
];

export function isReservedNickname(nickname: string): boolean {
  const norm = nickname.trim().toLowerCase().replace(/\s+/g, ' ');
  return RESERVED_NICKNAMES.some((r) => norm === r || norm.includes(r));
}

export function validateNickname(nickname: string, isMentor: boolean = false): { valid: boolean; message?: string } {
  if (!nickname || typeof nickname !== 'string') {
    return { valid: false, message: 'Nickname é obrigatório.' };
  }
  const clean = nickname.trim();
  if (clean.length < 3 || clean.length > 30) {
    return { valid: false, message: 'O Nickname deve ter entre 3 e 30 caracteres.' };
  }
  // Allow letters, numbers, spaces, dot, underline, hyphen, accented chars
  const validCharsRegex = /^[a-zA-Z0-9._\s\-\u00C0-\u00FF]+$/;
  if (!validCharsRegex.test(clean)) {
    return { valid: false, message: 'O Nickname contém caracteres inválidos. Use apenas letras, números, espaços, ponto e underline.' };
  }
  if (!isMentor && isReservedNickname(clean)) {
    return { valid: false, message: 'Este Nickname é reservado pela administração e não pode ser utilizado.' };
  }
  return { valid: true };
}

// Memory fallback store when DB is not configured
interface MemoryProfile {
  id: number;
  codigo: string;
  nickname: string;
  photo_url: string | null;
  phone: string;
  phone_visibility: 'MENTOR_ONLY' | 'MEMBERS';
  bio: string | null;
  chat_status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  community_rules_accepted_at?: string | null;
  last_chat_activity_at?: string | null;
  created_at: string;
  xp_total?: number;
  current_level?: number;
  current_streak?: number;
  last_participation_date?: string;
  message_count?: number;
  reply_count?: number;
}

interface MemoryMedia {
  id: number;
  media_type: string;
  public_url: string;
  mime_type: string;
  file_size: number;
  width?: number | null;
  height?: number | null;
  duration_seconds?: number | null;
  upload_status: 'PENDING' | 'READY' | 'FAILED' | 'DELETED';
}

interface MemoryMessage {
  id: number;
  room_id: number;
  profile_id: number;
  reply_to_message_id: number | null;
  message_type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'STICKER' | 'GIF' | 'SYSTEM' | 'POLL' | 'NOTICE';
  content: string;
  caption?: string | null;
  image_url?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  image_size?: number | null;
  image_mime?: string | null;
  media_id?: number | null;
  client_request_id?: string | null;
  created_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
  deleted_by?: number | null;
  is_pinned?: number;
  pinned_at?: string | null;
  author?: {
    id: number;
    nickname: string;
    photo_url: string | null;
    is_mentor?: boolean;
    chat_status?: string;
  };
  media?: MemoryMedia | null;
}

interface MemoryReport {
  id: number;
  message_id: number;
  reporter_profile_id: number;
  reason: string;
  details: string | null;
  report_status: 'OPEN' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
  created_at: string;
}

interface MemoryAudit {
  id: number;
  mentor_identifier: string;
  target_profile_id: number | null;
  message_id: number | null;
  action_type: string;
  reason: string | null;
  created_at: string;
}

interface MemoryNotice {
  id: number;
  room_id: number;
  content: string;
  created_by: string;
  is_active: number;
  created_at: string;
}

export const memoryProfilesMap = new Map<string, MemoryProfile>();
export const memoryMessagesList: MemoryMessage[] = [];
export const memoryReportsList: MemoryReport[] = [];
export const memoryAuditList: MemoryAudit[] = [];
export const memoryNoticesList: MemoryNotice[] = [];
export const memoryRoomMembersMap = new Map<string, { last_read_message_id: number | null; joined_at: string }>();

export const memoryReactionsList: { id: number; message_id: number; profile_id: number; emoji: string }[] = [];
export const memoryFavoritesList: { profile_id: number; message_id: number }[] = [];
export const memoryPollsList: { id: number; room_id: number; question: string; options: string[]; created_by: string; is_active: number; created_at: string }[] = [];
export const memoryPollVotesList: { id: number; poll_id: number; profile_id: number; option_index: number }[] = [];
export const memoryMentionsList: { id: number; message_id: number; source_profile_id: number; target_profile_id: number; is_read: number }[] = [];

let memoryProfileIdCounter = 1;
let memoryMessageIdCounter = 1;
let memoryReportIdCounter = 1;
let memoryAuditIdCounter = 1;
let memoryNoticeIdCounter = 1;
let memoryReactionIdCounter = 1;
let memoryPollIdCounter = 1;
let memoryPollVoteIdCounter = 1;
let memoryMentionIdCounter = 1;

// Anti-spam rate limiting map
const userLastMessageTimeMap = new Map<number, number>();
const userRecentMessageCountMap = new Map<number, { count: number; windowStart: number }>();
const userRecentContentMap = new Map<number, { content: string; time: number }>();

/**
 * Get or create profile for authenticated session
 */
export async function getProfileBySessionCode(
  rawCode: string
): Promise<{ profile: any | null; isMentor: boolean }> {
  const cleanCode = normalizeAccessCode(rawCode);
  const isMentor = isMasterKey(cleanCode);

  if (isDatabaseConfigured()) {
    await ensureChatTables();
    try {
      const [rows]: any = await db.query(
        `SELECT * FROM chat_profiles WHERE codigo = ? LIMIT 1`,
        [cleanCode]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        return { profile: rows[0], isMentor };
      }

      // If mentor and profile doesn't exist, auto-create Mentor Bigode profile
      if (isMentor) {
        const [inserted]: any = await db.query(
          `INSERT INTO chat_profiles (codigo, nickname, photo_url, phone, phone_visibility, bio, community_rules_accepted_at, last_chat_activity_at)
           VALUES (?, 'Mentor Bigode', NULL, '(00) 00000-0000', 'MENTOR_ONLY', 'Mentor Oficial da Geração Z Pro', NOW(), NOW())
           ON DUPLICATE KEY UPDATE nickname = VALUES(nickname)`,
          [cleanCode]
        );
        const newId = inserted.insertId;

        // Auto join community room
        await db.query(
          `INSERT INTO chat_room_members (room_id, profile_id, member_role)
           VALUES (1, ?, 'MENTOR')
           ON DUPLICATE KEY UPDATE member_role = 'MENTOR'`,
          [newId]
        ).catch(() => {});

        const [pRows]: any = await db.query(`SELECT * FROM chat_profiles WHERE id = ?`, [newId]);
        return { profile: pRows[0] || null, isMentor };
      }

      return { profile: null, isMentor };
    } catch (err) {
      console.error('[getProfileBySessionCode Error]:', err);
    }
  }

  // Fallback to memory
  if (memoryProfilesMap.has(cleanCode)) {
    return { profile: memoryProfilesMap.get(cleanCode), isMentor };
  }

  if (isMentor) {
    const mentorProfile: MemoryProfile = {
      id: memoryProfileIdCounter++,
      codigo: cleanCode,
      nickname: 'Mentor Bigode',
      photo_url: null,
      phone: '(00) 00000-0000',
      phone_visibility: 'MENTOR_ONLY',
      bio: 'Mentor Oficial da Geração Z Pro',
      chat_status: 'ACTIVE',
      community_rules_accepted_at: new Date().toISOString(),
      last_chat_activity_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    memoryProfilesMap.set(cleanCode, mentorProfile);
    return { profile: mentorProfile, isMentor };
  }

  return { profile: null, isMentor };
}

/**
 * Register initial profile
 */
export async function createChatProfile(
  rawCode: string,
  data: {
    nickname: string;
    photo_url?: string | null;
    phone: string;
    phone_visibility?: 'MENTOR_ONLY' | 'MEMBERS';
    accept_rules: boolean;
  }
): Promise<{ success: boolean; profile?: any; error?: string; field?: string; message?: string }> {
  console.log('[PROFILE SAVE START]');
  console.log('[PROFILE SAVE MODE] CREATE');

  const cleanCode = normalizeAccessCode(rawCode);
  const isMentor = isMasterKey(cleanCode);

  if (!data.accept_rules) {
    console.log('[PROFILE VALIDATION ERROR] field: rules_accepted, message: É necessário aceitar as regras da comunidade para se cadastrar.');
    return {
      success: false,
      error: 'VALIDATION_ERROR',
      field: 'rules_accepted',
      message: 'É necessário aceitar as regras da comunidade para se cadastrar.',
    };
  }

  if (!data.phone || typeof data.phone !== 'string' || data.phone.trim().length < 8) {
    console.log('[PROFILE VALIDATION ERROR] field: phone, message: Informe um número de telefone válido.');
    return {
      success: false,
      error: 'VALIDATION_ERROR',
      field: 'phone',
      message: 'Informe um número de telefone válido.',
    };
  }

  const validNick = validateNickname(data.nickname, isMentor);
  if (!validNick.valid) {
    console.log(`[PROFILE VALIDATION ERROR] field: nickname, message: ${validNick.message}`);
    return {
      success: false,
      error: 'VALIDATION_ERROR',
      field: 'nickname',
      message: validNick.message,
    };
  }

  const cleanNick = data.nickname.trim();
  const cleanPhone = data.phone.trim();
  let cleanPhoto = data.photo_url ? String(data.photo_url).trim() : null;
  const visibility = data.phone_visibility === 'MEMBERS' ? 'MEMBERS' : 'MENTOR_ONLY';

  if (cleanPhoto && (cleanPhoto.startsWith('blob:') || cleanPhoto.startsWith('file:'))) {
    cleanPhoto = null;
  } else if (cleanPhoto && cleanPhoto.startsWith('data:image/')) {
    const uploadRes = await processAndUploadMedia({
      profileId: 0,
      base64: cleanPhoto,
      mediaType: 'AVATAR',
    });
    if (uploadRes.success && uploadRes.media?.url) {
      cleanPhoto = uploadRes.media.url;
    } else {
      cleanPhoto = null;
    }
  }

  if (isDatabaseConfigured()) {
    try {
      // Check nickname uniqueness
      const [existing]: any = await db.query(
        `SELECT id FROM chat_profiles WHERE nickname = ? AND codigo != ? LIMIT 1`,
        [cleanNick, cleanCode]
      );
      if (Array.isArray(existing) && existing.length > 0) {
        console.log('[PROFILE VALIDATION ERROR] field: nickname, message: Este Nickname já está em uso por outro aluno.');
        return {
          success: false,
          error: 'VALIDATION_ERROR',
          field: 'nickname',
          message: 'Este Nickname já está em uso por outro aluno. Escolha outro.',
        };
      }

      // Check if profile already exists for code
      const [existingCode]: any = await db.query(
        `SELECT id FROM chat_profiles WHERE codigo = ? LIMIT 1`,
        [cleanCode]
      );

      if (Array.isArray(existingCode) && existingCode.length > 0) {
        const id = existingCode[0].id;
        await db.query(
          `UPDATE chat_profiles
           SET nickname = ?, photo_url = ?, phone = ?, phone_visibility = ?, community_rules_accepted_at = NOW(), last_chat_activity_at = NOW()
           WHERE id = ?`,
          [cleanNick, cleanPhoto, cleanPhone, visibility, id]
        );
        const [updated]: any = await db.query(`SELECT * FROM chat_profiles WHERE id = ?`, [id]);
        return { success: true, profile: updated[0] };
      }

      // Insert new profile
      const [result]: any = await db.query(
        `INSERT INTO chat_profiles (codigo, nickname, photo_url, phone, phone_visibility, community_rules_accepted_at, last_chat_activity_at)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        [cleanCode, cleanNick, cleanPhoto, cleanPhone, visibility]
      );

      const newId = result.insertId;

      // Add as member of default room (room_id = 1)
      await db.query(
        `INSERT INTO chat_room_members (room_id, profile_id, member_role)
         VALUES (1, ?, ?)
         ON DUPLICATE KEY UPDATE is_active = 1`,
        [newId, isMentor ? 'MENTOR' : 'MEMBER']
      ).catch(() => {});

      const [pRows]: any = await db.query(`SELECT * FROM chat_profiles WHERE id = ?`, [newId]);
      return { success: true, profile: pRows[0] };
    } catch (err: any) {
      console.error('[PROFILE DB ERROR]', 'code:', err?.code, 'errno:', err?.errno, 'sqlState:', err?.sqlState, 'message:', err?.message || err);
      if (err?.code === 'ER_DUP_ENTRY') {
        return {
          success: false,
          error: 'VALIDATION_ERROR',
          field: 'nickname',
          message: 'Nickname ou chave já em uso.',
        };
      }
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: 'O banco de dados está temporariamente sobrecarregado. Aguarde alguns minutos e tente novamente.',
      };
    }
  }

  // Memory fallback
  for (const p of memoryProfilesMap.values()) {
    if (p.nickname.toLowerCase() === cleanNick.toLowerCase() && p.codigo !== cleanCode) {
      console.log('[PROFILE VALIDATION ERROR] field: nickname, message: Este Nickname já está em uso por outro aluno.');
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        field: 'nickname',
        message: 'Este Nickname já está em uso por outro aluno. Escolha outro.',
      };
    }
  }

  const existingMem = memoryProfilesMap.get(cleanCode);
  const memProfile: MemoryProfile = {
    id: existingMem ? existingMem.id : memoryProfileIdCounter++,
    codigo: cleanCode,
    nickname: cleanNick,
    photo_url: cleanPhoto,
    phone: cleanPhone,
    phone_visibility: visibility,
    bio: existingMem?.bio || null,
    chat_status: existingMem?.chat_status || 'ACTIVE',
    community_rules_accepted_at: new Date().toISOString(),
    last_chat_activity_at: new Date().toISOString(),
    created_at: existingMem?.created_at || new Date().toISOString(),
  };

  memoryProfilesMap.set(cleanCode, memProfile);
  memoryRoomMembersMap.set(`1_${memProfile.id}`, { last_read_message_id: null, joined_at: new Date().toISOString() });

  return { success: true, profile: memProfile };
}

/**
 * Update profile settings
 */
export async function updateChatProfile(
  rawCode: string,
  data: {
    nickname?: string;
    photo_url?: string | null;
    phone?: string;
    phone_visibility?: 'MENTOR_ONLY' | 'MEMBERS';
    bio?: string | null;
  }
): Promise<{ success: boolean; profile?: any; error?: string; field?: string; message?: string }> {
  console.log('[PROFILE SAVE START]');
  console.log('[PROFILE SAVE MODE] UPDATE');

  const cleanCode = normalizeAccessCode(rawCode);
  const isMentor = isMasterKey(cleanCode);

  const { profile } = await getProfileBySessionCode(cleanCode);
  if (!profile) {
    return {
      success: false,
      error: 'VALIDATION_ERROR',
      field: 'session',
      message: 'Perfil não encontrado.',
    };
  }

  let nickname = profile.nickname;
  if (data.nickname && typeof data.nickname === 'string' && data.nickname.trim() !== profile.nickname) {
    const validNick = validateNickname(data.nickname, isMentor);
    if (!validNick.valid) {
      console.log(`[PROFILE VALIDATION ERROR] field: nickname, message: ${validNick.message}`);
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        field: 'nickname',
        message: validNick.message,
      };
    }
    const cleanNickCandidate = data.nickname.trim();
    if (isDatabaseConfigured()) {
      try {
        const [existing]: any = await db.query(
          `SELECT id FROM chat_profiles WHERE nickname = ? AND id != ? LIMIT 1`,
          [cleanNickCandidate, profile.id]
        );
        if (Array.isArray(existing) && existing.length > 0) {
          console.log('[PROFILE VALIDATION ERROR] field: nickname, message: Este Nickname já está em uso por outro aluno.');
          return {
            success: false,
            error: 'VALIDATION_ERROR',
            field: 'nickname',
            message: 'Este Nickname já está em uso por outro aluno. Escolha outro.',
          };
        }
      } catch (e: any) {
        console.error('[PROFILE DB ERROR]', 'code:', e?.code, 'errno:', e?.errno, 'sqlState:', e?.sqlState, 'message:', e?.message || e);
      }
    }
    nickname = cleanNickCandidate;
  }

  let photo = data.photo_url !== undefined ? data.photo_url : profile.photo_url;
  if (photo && (photo.startsWith('blob:') || photo.startsWith('file:'))) {
    photo = profile.photo_url || null;
  } else if (photo && photo.startsWith('data:image/')) {
    const uploadRes = await processAndUploadMedia({
      profileId: profile.id,
      base64: photo,
      mediaType: 'AVATAR',
    });
    if (uploadRes.success && uploadRes.media?.url) {
      photo = uploadRes.media.url;
    } else {
      photo = profile.photo_url || null;
    }
  }

  const phone = data.phone ? data.phone.trim() : profile.phone;
  const visibility = data.phone_visibility || profile.phone_visibility;
  const bio = data.bio !== undefined ? data.bio : profile.bio;

  if (isDatabaseConfigured()) {
    try {
      await db.query(
        `UPDATE chat_profiles
         SET nickname = ?, photo_url = ?, phone = ?, phone_visibility = ?, bio = ?, updated_at = NOW()
         WHERE id = ?`,
        [nickname, photo, phone, visibility, bio, profile.id]
      );
      const [rows]: any = await db.query(`SELECT * FROM chat_profiles WHERE id = ?`, [profile.id]);
      return { success: true, profile: rows[0] };
    } catch (err: any) {
      console.error('[PROFILE DB ERROR]', 'code:', err?.code, 'errno:', err?.errno, 'sqlState:', err?.sqlState, 'message:', err?.message || err);
      return {
        success: false,
        error: 'DATABASE_ERROR',
        message: 'O banco de dados está temporariamente sobrecarregado. Aguarde alguns minutos e tente novamente.',
      };
    }
  }

  profile.nickname = nickname;
  profile.photo_url = photo;
  profile.phone = phone;
  profile.phone_visibility = visibility;
  profile.bio = bio;
  memoryProfilesMap.set(cleanCode, profile);

  return { success: true, profile };
}

/**
 * Get public profile details with strict phone privacy protection
 */
export async function getPublicProfile(
  targetProfileId: number,
  requestorCode: string
): Promise<any | null> {
  const cleanCode = normalizeAccessCode(requestorCode);
  const isMentor = isMasterKey(cleanCode);
  const { profile: reqProfile } = await getProfileBySessionCode(cleanCode);

  if (isDatabaseConfigured()) {
    try {
      const [rows]: any = await db.query(
        `SELECT id, nickname, photo_url, phone, phone_visibility, bio, chat_status, created_at
         FROM chat_profiles
         WHERE id = ? LIMIT 1`,
        [targetProfileId]
      );
      if (!Array.isArray(rows) || rows.length === 0) return null;

      const p = rows[0];
      const isSelf = reqProfile && reqProfile.id === p.id;
      const canSeePhone = isMentor || isSelf || p.phone_visibility === 'MEMBERS';

      const [msgRows]: any = await db.query(
        `SELECT COUNT(*) AS total FROM chat_messages WHERE profile_id = ? AND deleted_at IS NULL`,
        [targetProfileId]
      ).catch(() => [[{ total: 0 }]]);

      const [photosRows]: any = await db.query(
        `SELECT COUNT(*) AS total FROM chat_messages WHERE profile_id = ? AND message_type = 'IMAGE' AND deleted_at IS NULL`,
        [targetProfileId]
      ).catch(() => [[{ total: 0 }]]);

      const [gifsRows]: any = await db.query(
        `SELECT COUNT(*) AS total FROM chat_messages WHERE profile_id = ? AND message_type = 'GIF' AND deleted_at IS NULL`,
        [targetProfileId]
      ).catch(() => [[{ total: 0 }]]);

      const [audioRows]: any = await db.query(
        `SELECT COUNT(*) AS total FROM chat_messages WHERE profile_id = ? AND message_type = 'AUDIO' AND deleted_at IS NULL`,
        [targetProfileId]
      ).catch(() => [[{ total: 0 }]]);

      const [stickersRows]: any = await db.query(
        `SELECT COUNT(*) AS total FROM chat_messages WHERE profile_id = ? AND message_type = 'STICKER' AND deleted_at IS NULL`,
        [targetProfileId]
      ).catch(() => [[{ total: 0 }]]);

      const [replyRows]: any = await db.query(
        `SELECT COUNT(*) AS total FROM chat_messages WHERE profile_id = ? AND reply_to_message_id IS NOT NULL AND deleted_at IS NULL`,
        [targetProfileId]
      ).catch(() => [[{ total: 0 }]]);

      const [reactReceivedRows]: any = await db.query(
        `SELECT COUNT(*) AS total FROM chat_reactions r JOIN chat_messages m ON r.message_id = m.id WHERE m.profile_id = ? AND m.deleted_at IS NULL`,
        [targetProfileId]
      ).catch(() => [[{ total: 0 }]]);

      const [reactGivenRows]: any = await db.query(
        `SELECT COUNT(*) AS total FROM chat_reactions WHERE profile_id = ?`,
        [targetProfileId]
      ).catch(() => [[{ total: 0 }]]);

      const [favRows]: any = await db.query(
        `SELECT COUNT(*) AS total FROM chat_favorites WHERE profile_id = ?`,
        [targetProfileId]
      ).catch(() => [[{ total: 0 }]]);

      const [xpRows]: any = await db.query(
        `SELECT COALESCE(SUM(points), 0) AS total FROM chat_xp_history WHERE profile_id = ?`,
        [targetProfileId]
      ).catch(() => [[{ total: 0 }]]);

      const message_count = Number(msgRows?.[0]?.total || 0);
      const photos_count = Number(photosRows?.[0]?.total || 0);
      const gifs_count = Number(gifsRows?.[0]?.total || 0);
      const audio_count = Number(audioRows?.[0]?.total || 0);
      const stickers_count = Number(stickersRows?.[0]?.total || 0);
      const reply_count = Number(replyRows?.[0]?.total || 0);
      const reactions_received_count = Number(reactReceivedRows?.[0]?.total || 0);
      const reactions_given_count = Number(reactGivenRows?.[0]?.total || 0);
      const favorites_count = Number(favRows?.[0]?.total || 0);
      const xp = Number(xpRows?.[0]?.total || 0);
      const level = Math.floor(xp / 200) + 1;

      return {
        id: p.id,
        nickname: p.nickname,
        photo_url: p.photo_url,
        bio: p.bio,
        chat_status: p.chat_status,
        created_at: p.created_at,
        is_mentor: isMasterKey(p.codigo),
        phone: canSeePhone ? p.phone : undefined,
        phone_visibility: p.phone_visibility,
        message_count,
        photos_count,
        gifs_count,
        audio_count,
        stickers_count,
        reply_count,
        reactions_received_count,
        reactions_given_count,
        favorites_count,
        xp,
        level,
      };
    } catch (err) {
      console.error('[getPublicProfile Error]:', err);
    }
  }

  for (const p of memoryProfilesMap.values()) {
    if (p.id === targetProfileId) {
      const isSelf = reqProfile && reqProfile.id === p.id;
      const canSeePhone = isMentor || isSelf || p.phone_visibility === 'MEMBERS';

      const message_count = memoryMessagesList.filter(m => m.profile_id === targetProfileId && !m.deleted_at).length;
      const photos_count = memoryMessagesList.filter(m => m.profile_id === targetProfileId && !m.deleted_at && m.message_type === 'IMAGE').length;
      const gifs_count = memoryMessagesList.filter(m => m.profile_id === targetProfileId && !m.deleted_at && m.message_type === 'GIF').length;
      const audio_count = memoryMessagesList.filter(m => m.profile_id === targetProfileId && !m.deleted_at && m.message_type === 'AUDIO').length;
      const stickers_count = memoryMessagesList.filter(m => m.profile_id === targetProfileId && !m.deleted_at && m.message_type === 'STICKER').length;
      const reply_count = memoryMessagesList.filter(m => m.profile_id === targetProfileId && !m.deleted_at && Boolean(m.reply_to_message_id)).length;
      const reactions_received_count = memoryReactionsList.filter(r => {
        const msg = memoryMessagesList.find(m => m.id === r.message_id);
        return msg && msg.profile_id === targetProfileId && !msg.deleted_at;
      }).length;
      const reactions_given_count = memoryReactionsList.filter(r => r.profile_id === targetProfileId).length;
      const favorites_count = memoryFavoritesList.filter(f => f.profile_id === targetProfileId).length;
      const xp = p.xp_total || (message_count * 15 + reactions_received_count * 5);
      const level = Math.floor(xp / 200) + 1;

      return {
        id: p.id,
        nickname: p.nickname,
        photo_url: p.photo_url,
        bio: p.bio,
        chat_status: p.chat_status,
        created_at: p.created_at,
        is_mentor: isMasterKey(p.codigo),
        phone: canSeePhone ? p.phone : undefined,
        phone_visibility: p.phone_visibility,
        message_count,
        photos_count,
        gifs_count,
        audio_count,
        stickers_count,
        reply_count,
        reactions_received_count,
        reactions_given_count,
        favorites_count,
        xp,
        level,
      };
    }
  }

  return null;
}

/**
 * Get chat rooms for profile
 */
export async function getRooms(profileId: number) {
  if (isDatabaseConfigured()) {
    try {
      await ensureChatTables();
      const [rooms]: any = await db.query(
        `SELECT r.*,
                rm.last_read_message_id,
                (SELECT COUNT(*) FROM chat_room_members WHERE room_id = r.id AND is_active = 1) AS member_count,
                (SELECT id FROM chat_messages WHERE room_id = r.id ORDER BY id DESC LIMIT 1) AS latest_message_id,
                (SELECT content FROM chat_messages WHERE room_id = r.id AND deleted_at IS NULL ORDER BY id DESC LIMIT 1) AS last_message_content,
                (SELECT created_at FROM chat_messages WHERE room_id = r.id ORDER BY id DESC LIMIT 1) AS last_message_at,
                (SELECT COUNT(*) FROM chat_messages
                 WHERE room_id = r.id
                   AND deleted_at IS NULL
                   AND (rm.last_read_message_id IS NULL OR id > rm.last_read_message_id)
                ) AS unread_count
         FROM chat_rooms r
         LEFT JOIN chat_room_members rm ON rm.room_id = r.id AND rm.profile_id = ?
         WHERE r.is_active = 1
         ORDER BY r.id ASC`,
        [profileId]
      );
      return rooms || [];
    } catch (err) {
      console.error('[getRooms Error]:', err);
    }
  }

  // Memory fallback
  const lastMsg = memoryMessagesList[memoryMessagesList.length - 1];
  const memberKey = `1_${profileId}`;
  const memberData = memoryRoomMembersMap.get(memberKey);
  const lastRead = memberData?.last_read_message_id || 0;

  const unreadCount = memoryMessagesList.filter(
    (m) => m.room_id === 1 && !m.deleted_at && m.id > lastRead
  ).length;

  return [
    {
      id: 1,
      name: '💬 Comunidade Geração Z Pro',
      slug: 'comunidade-geracao-z-pro',
      description: 'Sala geral exclusiva para alunos da Mentoria Geração Z Pro.',
      room_type: 'PUBLIC',
      is_active: 1,
      member_count: memoryProfilesMap.size,
      last_message_content: lastMsg && !lastMsg.deleted_at ? lastMsg.content : null,
      last_message_at: lastMsg ? lastMsg.created_at : null,
      unread_count: unreadCount,
      last_read_message_id: lastRead,
    },
  ];
}

/**
 * Fetch messages for room with pagination and author details
 */
export async function getRoomMessages(
  roomId: number,
  profileId: number,
  options: { beforeId?: number; afterId?: number; limit?: number } = {}
) {
  const limit = Math.min(options.limit || 50, 50);

  if (isDatabaseConfigured()) {
    try {
      console.log(`[CHAT GET MESSAGES DB] Fetching room ${roomId}`);
      let query = `
        SELECT m.id,
               m.room_id,
               m.profile_id,
               m.reply_to_message_id,
               m.message_type,
               m.content,
               COALESCE(cm.public_url, m.image_url) AS image_url,
               COALESCE(cm.width, m.image_width) AS image_width,
               COALESCE(cm.height, m.image_height) AS image_height,
               COALESCE(cm.file_size, m.image_size) AS image_size,
               COALESCE(cm.mime_type, m.image_mime) AS image_mime,
               m.caption,
               m.client_request_id,
               m.edited_at,
               m.deleted_at,
               m.is_pinned,
               m.created_at,
               p.nickname,
               p.photo_url,
               p.codigo,
               p.chat_status,
               rm.id AS reply_id,
               rm.content AS reply_content,
               rp.nickname AS reply_nickname,
               cm.id AS media_id,
               cm.media_type,
               cm.public_url AS media_public_url,
               cm.duration_seconds AS media_duration,
               cm.upload_status AS media_upload_status
        FROM chat_messages m
        JOIN chat_profiles p ON p.id = m.profile_id
        LEFT JOIN chat_messages rm ON rm.id = m.reply_to_message_id
        LEFT JOIN chat_profiles rp ON rp.id = rm.profile_id
        LEFT JOIN chat_media cm ON cm.message_id = m.id OR (m.image_url IS NOT NULL AND cm.public_url = m.image_url)
        WHERE m.room_id = ?
      `;

      const params: any[] = [roomId];

      if (options.afterId) {
        query += ` AND m.id > ? ORDER BY m.id ASC LIMIT ?`;
        params.push(options.afterId, limit);
      } else if (options.beforeId) {
        query += ` AND m.id < ? ORDER BY m.id DESC LIMIT ?`;
        params.push(options.beforeId, limit);
      } else {
        query += ` ORDER BY m.id DESC LIMIT ?`;
        params.push(limit);
      }

      const [rows]: any = await db.query(query, params);
      let list = Array.isArray(rows) ? rows : [];

      if (!options.afterId) {
        list = list.reverse();
      }

      const msgIds = list.map((m: any) => m.id);
      const reactionsMap: Record<number, any[]> = {};
      const favoritesSet = new Set<number>();

      if (msgIds.length > 0) {
        const [reactRows]: any = await db.query(
          `SELECT r.message_id, r.emoji, r.profile_id, p.codigo
           FROM chat_reactions r
           JOIN chat_profiles p ON p.id = r.profile_id
           WHERE r.message_id IN (?)`,
          [msgIds]
        ).catch(() => [[]]);

        if (Array.isArray(reactRows)) {
          for (const r of reactRows) {
            if (!reactionsMap[r.message_id]) reactionsMap[r.message_id] = [];
            reactionsMap[r.message_id].push(r);
          }
        }

        if (profileId) {
          const [favRows]: any = await db.query(
            `SELECT message_id FROM chat_favorites WHERE profile_id = ? AND message_id IN (?)`,
            [profileId, msgIds]
          ).catch(() => [[]]);

          if (Array.isArray(favRows)) {
            favRows.forEach((f: any) => favoritesSet.add(f.message_id));
          }
        }
      }

      return list.map((msg: any) => {
        const isMentor = isMasterKey(msg.codigo);
        const isDeleted = Boolean(msg.deleted_at);

        const rawReacts = reactionsMap[msg.id] || [];
        const grouped: Record<string, { count: number; userReacted: boolean; hasMentor: boolean }> = {};
        let totalReactionCount = 0;

        for (const r of rawReacts) {
          totalReactionCount++;
          if (!grouped[r.emoji]) {
            grouped[r.emoji] = { count: 0, userReacted: false, hasMentor: false };
          }
          grouped[r.emoji].count++;
          if (r.profile_id === profileId) grouped[r.emoji].userReacted = true;
          if (isMasterKey(r.codigo)) grouped[r.emoji].hasMentor = true;
        }

        const reactions = Object.entries(grouped).map(([emoji, data]) => ({
          emoji,
          count: data.count,
          userReacted: data.userReacted,
          hasMentor: data.hasMentor,
        }));

        const finalImageUrl = isDeleted
          ? null
          : (msg.media_public_url || msg.image_url || null);

        const mediaObj = (!isDeleted && (msg.media_id || finalImageUrl))
          ? {
              id: msg.media_id || msg.id,
              media_id: msg.media_id || msg.id,
              type: msg.media_type || msg.message_type,
              media_type: msg.media_type || msg.message_type,
              url: msg.media_public_url || finalImageUrl,
              public_url: msg.media_public_url || finalImageUrl,
              mime: msg.image_mime || 'image/png',
              mime_type: msg.image_mime || 'image/png',
              size: msg.image_size || 0,
              file_size: msg.image_size || 0,
              width: msg.image_width || null,
              height: msg.image_height || null,
              duration: msg.media_duration || null,
              duration_seconds: msg.media_duration || null,
              status: msg.media_upload_status || 'READY',
              upload_status: msg.media_upload_status || 'READY',
            }
          : null;

        return {
          id: msg.id,
          roomId: msg.room_id,
          room_id: msg.room_id,
          profileId: msg.profile_id,
          profile_id: msg.profile_id,
          replyToMessageId: msg.reply_to_message_id,
          reply_to_message_id: msg.reply_to_message_id,
          messageType: msg.message_type,
          message_type: msg.message_type,
          content: isDeleted ? 'Mensagem removida' : msg.content,
          imageUrl: finalImageUrl,
          image_url: finalImageUrl,
          imageWidth: isDeleted ? null : msg.image_width,
          image_width: isDeleted ? null : msg.image_width,
          imageHeight: isDeleted ? null : msg.image_height,
          image_height: isDeleted ? null : msg.image_height,
          imageSize: isDeleted ? null : msg.image_size,
          image_size: isDeleted ? null : msg.image_size,
          imageMime: isDeleted ? null : msg.image_mime,
          image_mime: isDeleted ? null : msg.image_mime,
          caption: isDeleted ? null : msg.caption,
          clientRequestId: msg.client_request_id || null,
          mediaId: msg.media_id || (mediaObj ? mediaObj.id : null),
          media: mediaObj,
          editedAt: msg.edited_at,
          edited_at: msg.edited_at,
          deletedAt: msg.deleted_at,
          deleted_at: msg.deleted_at,
          isPinned: Boolean(msg.is_pinned),
          is_pinned: Boolean(msg.is_pinned),
          createdAt: msg.created_at,
          created_at: msg.created_at,
          author: {
            id: msg.profile_id,
            nickname: msg.nickname || 'Aluno',
            photo_url: msg.photo_url || null,
            photoUrl: msg.photo_url || null,
            is_mentor: isMentor,
            role: isMentor ? 'MENTOR' : (msg.member_role || 'MEMBER'),
            chat_status: msg.chat_status || 'ACTIVE',
            status: msg.chat_status || 'ACTIVE',
          },
          author_nickname: msg.nickname || 'Aluno',
          author_photo_url: msg.photo_url || null,
          nickname: msg.nickname || 'Aluno',
          photo_url: msg.photo_url || null,
          reply_to: msg.reply_to_message_id ? {
            id: msg.reply_to_message_id,
            content: rmContentOrDeleted(msg.reply_content),
            nickname: msg.reply_nickname,
          } : null,
          reactions,
          is_favorite: favoritesSet.has(msg.id),
          is_highlight: totalReactionCount >= 5,
        };
      });
    } catch (err) {
      console.error('[getRoomMessages Error]:', err);
      throw new Error('CHAT_DATABASE_ERROR');
    }
  }

  console.log(`[CHAT GET MESSAGES MEMORY] Fetching room ${roomId}`);

  // Memory fallback
  let list = memoryMessagesList.filter((m) => m.room_id === roomId);
  if (options.afterId) {
    list = list.filter((m) => m.id > options.afterId!).slice(0, limit);
  } else if (options.beforeId) {
    list = list.filter((m) => m.id < options.beforeId!).slice(-limit);
  } else {
    list = list.slice(-limit);
  }

  return list.map((m) => {
    let authorProfile: any = null;
    for (const p of memoryProfilesMap.values()) {
      if (p.id === m.profile_id) {
        authorProfile = p;
        break;
      }
    }

    const isMentor = authorProfile ? isMasterKey(authorProfile.codigo) : false;
    const isDeleted = Boolean(m.deleted_at);

    const finalImgUrl = isDeleted ? null : (m.image_url || null);
    const mediaObj = (!isDeleted && finalImgUrl)
      ? {
          media_id: m.id,
          media_type: m.message_type,
          public_url: finalImgUrl,
          mime_type: m.image_mime || 'image/png',
          file_size: m.image_size || 0,
          width: m.image_width || null,
          height: m.image_height || null,
          duration_seconds: null,
          upload_status: 'READY',
        }
      : null;

    return {
      id: m.id,
      room_id: m.room_id,
      profile_id: m.profile_id,
      reply_to_message_id: m.reply_to_message_id,
      message_type: m.message_type,
      content: isDeleted ? 'Mensagem removida' : m.content,
      image_url: finalImgUrl,
      image_width: isDeleted ? null : (m.image_width || null),
      image_height: isDeleted ? null : (m.image_height || null),
      image_size: isDeleted ? null : (m.image_size || null),
      image_mime: isDeleted ? null : (m.image_mime || null),
      caption: isDeleted ? null : (m.caption || null),
      clientRequestId: m.client_request_id || null,
      media: mediaObj,
      edited_at: m.edited_at,
      deleted_at: m.deleted_at,
      is_pinned: Boolean(m.is_pinned),
      created_at: m.created_at,
      author: {
        id: m.profile_id,
        nickname: authorProfile?.nickname || 'Aluno',
        photo_url: authorProfile?.photo_url || null,
        is_mentor: isMentor,
        chat_status: authorProfile?.chat_status || 'ACTIVE',
      },
      reply_to: null,
    };
  });
}

function rmContentOrDeleted(content: string | null) {
  if (!content) return 'Mensagem removida';
  return content.length > 80 ? content.slice(0, 80) + '...' : content;
}

const userLastPhotoTimeMap = new Map<number, number>();
const userPhotoCountMap = new Map<number, { count: number; windowStart: number }>();

/**
 * Send message with strict rate limiting & anti-spam checks
 */
export async function sendMessage(
  roomId: number,
  profile: any,
  data: {
    content?: string;
    reply_to_message_id?: number | null;
    message_type?: 'TEXT' | 'IMAGE' | 'AUDIO' | 'STICKER' | 'GIF' | 'SYSTEM' | 'POLL' | 'NOTICE';
    image_url?: string | null;
    image_width?: number | null;
    image_height?: number | null;
    image_size?: number | null;
    image_mime?: string | null;
    caption?: string | null;
    client_request_id?: string | null;
  }
): Promise<{ success: boolean; message?: any; error?: string }> {
  if (profile.chat_status === 'SUSPENDED') {
    return { success: false, error: 'Sua conta do chat está suspensa pelo Mentor. Você não pode enviar mensagens.' };
  }
  if (profile.chat_status === 'BANNED') {
    return { success: false, error: 'Sua conta do chat está banida.' };
  }

  const msgType = data.message_type || 'TEXT';
  const isMentor = isMasterKey(profile.codigo);
  const now = Date.now();
  const profileId = profile.id;
  const clientReqId = data.client_request_id || null;

  // Auto-ensure room membership idempotently
  if (isDatabaseConfigured()) {
    await db.query(
      `INSERT IGNORE INTO chat_room_members (room_id, profile_id, member_role, is_active) VALUES (?, ?, ?, 1)`,
      [roomId, profileId, isMentor ? 'MENTOR' : 'MEMBER']
    ).catch(() => {});
  }

  if (['IMAGE', 'AUDIO', 'STICKER', 'GIF'].includes(msgType)) {
    if (!data.image_url && !data.content) {
      return { success: false, error: `Conteúdo de ${msgType.toLowerCase()} inválido.` };
    }

    if (msgType === 'IMAGE' && !isMentor) {
      const lastPhotoTime = userLastPhotoTimeMap.get(profileId) || 0;
      if (now - lastPhotoTime < 5000) {
        return { success: false, error: 'Você está enviando imagens muito rápido. Aguarde alguns segundos.' };
      }

      const photoRate = userPhotoCountMap.get(profileId) || { count: 0, windowStart: now };
      if (now - photoRate.windowStart > 60000) {
        photoRate.count = 0;
        photoRate.windowStart = now;
      }
      if (photoRate.count >= 3) {
        return { success: false, error: 'Limite de 3 imagens por minuto atingido. Aguarde alguns instantes.' };
      }
      photoRate.count++;
      userPhotoCountMap.set(profileId, photoRate);
      userLastPhotoTimeMap.set(profileId, now);
    }
  } else {
    if (!data.content || typeof data.content !== 'string' || data.content.trim() === '') {
      return { success: false, error: 'A mensagem não pode estar vazia.' };
    }
  }

  const rawContent = data.caption || data.content || (msgType === 'IMAGE' ? '[Imagem]' : msgType === 'AUDIO' ? '🎙️ Mensagem de voz' : msgType === 'STICKER' ? 'Sticker' : msgType === 'GIF' ? 'GIF' : '');
  const cleanContent = rawContent.trim();
  if (cleanContent.length > 2000) {
    return { success: false, error: 'A mensagem excede o limite máximo de 2000 caracteres.' };
  }

  // Anti-spam Rule for text messages
  if (!isMentor && msgType === 'TEXT') {
    const lastTime = userLastMessageTimeMap.get(profileId) || 0;
    if (now - lastTime < 2000) {
      return { success: false, error: 'Você está enviando mensagens muito rápido. Aguarde alguns segundos.' };
    }

    const rateData = userRecentMessageCountMap.get(profileId) || { count: 0, windowStart: now };
    if (now - rateData.windowStart > 60000) {
      rateData.count = 0;
      rateData.windowStart = now;
    }
    if (rateData.count >= 15) {
      return { success: false, error: 'Limite de mensagens por minuto atingido. Aguarde 1 minuto para enviar novas mensagens.' };
    }
    rateData.count++;
    userRecentMessageCountMap.set(profileId, rateData);

    const recentContentData = userRecentContentMap.get(profileId);
    if (recentContentData && recentContentData.content === cleanContent && now - recentContentData.time < 10000) {
      return { success: false, error: 'Você acabou de enviar uma mensagem idêntica. Evite repetir mensagens.' };
    }
    userRecentContentMap.set(profileId, { content: cleanContent, time: now });
  }

  userLastMessageTimeMap.set(profileId, now);
  const replyId = data.reply_to_message_id ? Number(data.reply_to_message_id) : null;

  if (data.image_url) {
    const imgUrl = String(data.image_url).trim().toLowerCase();
    if (imgUrl.startsWith('data:') || imgUrl.startsWith('blob:') || imgUrl.startsWith('file:') || imgUrl.startsWith('javascript:')) {
      return { success: false, error: 'Mídias temporárias (data/blob) não podem ser salvas diretamente. Use o upload oficial.' };
    }
  }

  if (isDatabaseConfigured()) {
    try {
      const [res]: any = await db.query(
        `INSERT INTO chat_messages (room_id, profile_id, reply_to_message_id, message_type, content, image_url, image_width, image_height, image_size, image_mime, caption, client_request_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          roomId,
          profileId,
          replyId,
          msgType,
          cleanContent,
          data.image_url || null,
          data.image_width || null,
          data.image_height || null,
          data.image_size || null,
          data.image_mime || null,
          data.caption || null,
          clientReqId,
        ]
      );

      const msgId = res.insertId;
      console.log(`[CHAT MESSAGE INSERT] messageId=${msgId}, clientRequestId=${clientReqId}, messageType=${msgType}, dataSource=DB`);

      if (data.image_url) {
        const [linkRes]: any = await db.query(
          `UPDATE chat_media SET message_id = ?, upload_status = 'READY' WHERE public_url = ? AND profile_id = ? AND upload_status = 'READY'`,
          [msgId, data.image_url, profileId]
        ).catch(() => [{ affectedRows: 0 }]);
        console.log(`[CHAT MEDIA LINK] messageId=${msgId}, publicUrl=${data.image_url}, affectedRows=${linkRes?.affectedRows || 0}`);
      }

      await db.query(
        `UPDATE chat_room_members SET last_read_message_id = ? WHERE room_id = ? AND profile_id = ?`,
        [msgId, roomId, profileId]
      ).catch(() => {});

      // Award XP & update stats
      const xpEventType = replyId ? 'REPLY_SENT' : 'MESSAGE_SENT';
      const xpBase = replyId ? 2 : 1;
      await awardXp(profileId, xpEventType, xpBase, `msg_${msgId}`, 'MESSAGE', msgId);
      await recalculateUserStats(profileId);

      // Create notification if this is a reply to another message
      if (replyId) {
        (async () => {
          try {
            let targetProfileId: number | null = null;
            if (isDatabaseConfigured()) {
              const [rRows]: any = await db.query(`SELECT profile_id FROM chat_messages WHERE id = ? LIMIT 1`, [replyId]).catch(() => []);
              if (rRows && rRows.length > 0) targetProfileId = rRows[0].profile_id;
            } else {
              const orig = memoryMessagesList.find((m) => m.id === replyId);
              if (orig) targetProfileId = orig.profile_id;
            }

            if (targetProfileId && targetProfileId !== profileId) {
              const senderNickname = profile.nickname;
              await createNotification({
                profileId: targetProfileId,
                notificationType: 'REPLY_RECEIVED',
                title: `${senderNickname} respondeu sua mensagem.`,
                message: cleanContent.slice(0, 100),
                relatedMessageId: msgId,
                relatedProfileId: profileId,
                relatedRoomId: roomId,
                deduplicationKey: `reply:${replyId}:${msgId}:${profileId}`,
              });
            }
          } catch (e) {
            console.warn('[Reply Notification Error]:', e);
          }
        })();
      }

      if (msgType === 'TEXT') {
        parseAndSaveMentions(msgId, profileId, cleanContent).catch(() => {});
      }

      const createdMsg = {
        id: msgId,
        room_id: roomId,
        profile_id: profileId,
        reply_to_message_id: replyId,
        message_type: msgType,
        content: cleanContent,
        image_url: data.image_url || null,
        image_width: data.image_width || null,
        image_height: data.image_height || null,
        image_size: data.image_size || null,
        image_mime: data.image_mime || null,
        caption: data.caption || null,
        clientRequestId: clientReqId,
        edited_at: null,
        deleted_at: null,
        is_pinned: false,
        created_at: new Date().toISOString(),
        author: {
          id: profileId,
          nickname: profile.nickname || 'Aluno',
          photo_url: profile.photo_url || null,
          photoUrl: profile.photo_url || null,
          is_mentor: isMentor,
          role: isMentor ? 'MENTOR' : 'MEMBER',
          chat_status: profile.chat_status || 'ACTIVE',
          status: profile.chat_status || 'ACTIVE',
        },
        author_nickname: profile.nickname || 'Aluno',
        author_photo_url: profile.photo_url || null,
        nickname: profile.nickname || 'Aluno',
        photo_url: profile.photo_url || null,
        reply_to: null,
        reactions: [],
        is_favorite: false,
        is_highlight: false,
        media: data.image_url ? {
          media_id: msgId,
          media_type: msgType,
          public_url: data.image_url,
          mime_type: data.image_mime || 'image/png',
          file_size: data.image_size || 0,
          width: data.image_width || null,
          height: data.image_height || null,
          duration_seconds: null,
          upload_status: 'READY',
        } : null,
      };

      return { success: true, message: createdMsg };
    } catch (err: any) {
      console.error('[sendMessage DB Error]:', err);
      return { success: false, error: 'Erro ao salvar mensagem no banco de dados.' };
    }
  }

  // Memory fallback
  const memMsg: MemoryMessage = {
    id: memoryMessageIdCounter++,
    room_id: roomId,
    profile_id: profileId,
    reply_to_message_id: replyId,
    message_type: msgType,
    content: cleanContent,
    image_url: data.image_url || null,
    image_width: data.image_width || null,
    image_height: data.image_height || null,
    image_size: data.image_size || null,
    image_mime: data.image_mime || null,
    caption: data.caption || null,
    client_request_id: clientReqId || null,
    edited_at: null,
    deleted_at: null,
    deleted_by: null,
    is_pinned: 0,
    pinned_at: null,
    created_at: new Date().toISOString(),
  };

  memoryMessagesList.push(memMsg);
  console.log(`[CHAT MESSAGE INSERT] messageId=${memMsg.id}, clientRequestId=${clientReqId}, messageType=${msgType}, dataSource=MEMORY`);
  const memberKey = `${roomId}_${profileId}`;
  memoryRoomMembersMap.set(memberKey, { last_read_message_id: memMsg.id, joined_at: new Date().toISOString() });

  return {
    success: true,
    message: {
      id: memMsg.id,
      room_id: roomId,
      profile_id: profileId,
      reply_to_message_id: replyId,
      message_type: msgType,
      content: cleanContent,
      image_url: data.image_url || null,
      image_width: data.image_width || null,
      image_height: data.image_height || null,
      image_size: data.image_size || null,
      image_mime: data.image_mime || null,
      caption: data.caption || null,
      clientRequestId: clientReqId || null,
      edited_at: null,
      deleted_at: null,
      is_pinned: false,
      created_at: memMsg.created_at,
      author: {
        id: profile.id,
        nickname: profile.nickname,
        photo_url: profile.photo_url,
        is_mentor: isMentor,
        chat_status: profile.chat_status,
      },
      reply_to: null,
      media: data.image_url ? {
        media_id: memMsg.id,
        media_type: msgType,
        public_url: data.image_url,
        mime_type: data.image_mime || 'image/png',
        file_size: data.image_size || 0,
        width: data.image_width || null,
        height: data.image_height || null,
        duration_seconds: null,
        upload_status: 'READY',
      } : null,
    },
  };
}

/**
 * Edit own message
 */
export async function editMessage(
  messageId: number,
  profileId: number,
  newContent: string
): Promise<{ success: boolean; error?: string; message?: any }> {
  if (!newContent || newContent.trim() === '') {
    return { success: false, error: 'A mensagem não pode estar vazia.' };
  }
  const clean = newContent.trim();
  if (clean.length > 2000) {
    return { success: false, error: 'A mensagem excede o limite máximo de 2000 caracteres.' };
  }

  if (isDatabaseConfigured()) {
    try {
      const [rows]: any = await db.query(
        `SELECT id, profile_id, deleted_at, content, edited_at FROM chat_messages WHERE id = ? LIMIT 1`,
        [messageId]
      );
      if (!Array.isArray(rows) || rows.length === 0) {
        return { success: false, error: 'Mensagem não encontrada.' };
      }
      if (rows[0].profile_id !== profileId) {
        return { success: false, error: 'Você só pode editar suas próprias mensagens.' };
      }
      if (rows[0].deleted_at) {
        return { success: false, error: 'Mensagens apagadas não podem ser editadas.' };
      }

      if (rows[0].content === clean) {
        return {
          success: true,
          message: { id: messageId, content: clean, edited_at: rows[0].edited_at },
        };
      }

      await db.query(
        `UPDATE chat_messages SET content = ?, edited_at = NOW() WHERE id = ?`,
        [clean, messageId]
      );

      const [updatedRows]: any = await db.query(
        `SELECT id, content, edited_at FROM chat_messages WHERE id = ? LIMIT 1`,
        [messageId]
      );
      const updated = updatedRows?.[0];

      const memMsg = memoryMessagesList.find((m) => m.id === messageId);
      if (memMsg) {
        memMsg.content = clean;
        memMsg.edited_at = updated?.edited_at || new Date().toISOString();
      }

      return {
        success: true,
        message: {
          id: messageId,
          content: clean,
          edited_at: updated?.edited_at || new Date().toISOString(),
        },
      };
    } catch (err) {
      console.error('[editMessage Error]:', err);
      return { success: false, error: 'Erro ao editar mensagem.' };
    }
  }

  const msg = memoryMessagesList.find((m) => m.id === messageId);
  if (!msg) return { success: false, error: 'Mensagem não encontrada.' };
  if (msg.profile_id !== profileId) return { success: false, error: 'Você só pode editar suas próprias mensagens.' };
  if (msg.deleted_at) return { success: false, error: 'Mensagens apagadas não podem ser editadas.' };

  if (msg.content === clean) {
    return { success: true, message: { id: messageId, content: clean, edited_at: msg.edited_at } };
  }

  msg.content = clean;
  msg.edited_at = new Date().toISOString();
  return {
    success: true,
    message: {
      id: messageId,
      content: clean,
      edited_at: msg.edited_at,
    },
  };
}

/**
 * Delete message (own or mentor)
 */
export async function deleteMessage(
  messageId: number,
  profileId: number,
  isMentor: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  if (isDatabaseConfigured()) {
    try {
      const [rows]: any = await db.query(
        `SELECT id, profile_id FROM chat_messages WHERE id = ? LIMIT 1`,
        [messageId]
      );
      if (!Array.isArray(rows) || rows.length === 0) {
        return { success: false, error: 'Mensagem não encontrada.' };
      }

      const msg = rows[0];
      if (!isMentor && msg.profile_id !== profileId) {
        return { success: false, error: 'Você só pode excluir suas próprias mensagens.' };
      }

      await db.query(
        `UPDATE chat_messages SET deleted_at = NOW(), deleted_by = ? WHERE id = ?`,
        [profileId, messageId]
      );

      if (isMentor) {
        await db.query(
          `INSERT INTO chat_moderation_actions (mentor_identifier, target_profile_id, message_id, action_type, reason)
           VALUES ('Mentor Bigode', ?, ?, 'MESSAGE_DELETE', ?)`,
          [msg.profile_id, messageId, reason || 'Excluído pelo Mentor']
        ).catch(() => {});
      }

      return { success: true };
    } catch (err) {
      console.error('[deleteMessage Error]:', err);
      return { success: false, error: 'Erro ao excluir mensagem.' };
    }
  }

  const msg = memoryMessagesList.find((m) => m.id === messageId);
  if (!msg) return { success: false, error: 'Mensagem não encontrada.' };
  if (!isMentor && msg.profile_id !== profileId) {
    return { success: false, error: 'Você só pode excluir suas próprias mensagens.' };
  }

  msg.deleted_at = new Date().toISOString();
  msg.deleted_by = profileId;

  if (isMentor) {
    memoryAuditList.push({
      id: memoryAuditIdCounter++,
      mentor_identifier: 'Mentor Bigode',
      target_profile_id: msg.profile_id,
      message_id: messageId,
      action_type: 'MESSAGE_DELETE',
      reason: reason || 'Excluído pelo Mentor',
      created_at: new Date().toISOString(),
    });
  }

  return { success: true };
}

/**
 * Report message
 */
export async function reportMessage(
  messageId: number,
  reporterProfileId: number,
  reason: string,
  details?: string
): Promise<{ success: boolean; error?: string }> {
  if (!reason || reason.trim() === '') {
    return { success: false, error: 'Selecione um motivo para a denúncia.' };
  }

  if (isDatabaseConfigured()) {
    try {
      await db.query(
        `INSERT INTO chat_message_reports (message_id, reporter_profile_id, reason, details)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE reason = VALUES(reason), details = VALUES(details)`,
        [messageId, reporterProfileId, reason.trim(), details ? details.trim() : null]
      );
      return { success: true };
    } catch (err: any) {
      console.error('[reportMessage Error]:', err);
      return { success: false, error: 'Erro ao registrar denúncia.' };
    }
  }

  const existing = memoryReportsList.find(
    (r) => r.message_id === messageId && r.reporter_profile_id === reporterProfileId
  );
  if (existing) {
    existing.reason = reason;
    existing.details = details || null;
  } else {
    memoryReportsList.push({
      id: memoryReportIdCounter++,
      message_id: messageId,
      reporter_profile_id: reporterProfileId,
      reason,
      details: details || null,
      report_status: 'OPEN',
      created_at: new Date().toISOString(),
    });
  }

  return { success: true };
}

/**
 * Mark room as read
 */
export async function markRoomAsRead(roomId: number, profileId: number) {
  if (isDatabaseConfigured()) {
    try {
      const [mRows]: any = await db.query(
        `SELECT id FROM chat_messages WHERE room_id = ? ORDER BY id DESC LIMIT 1`,
        [roomId]
      );
      const maxId = Array.isArray(mRows) && mRows[0] ? mRows[0].id : null;
      if (maxId) {
        await db.query(
          `INSERT INTO chat_room_members (room_id, profile_id, last_read_message_id)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE last_read_message_id = VALUES(last_read_message_id)`,
          [roomId, profileId, maxId]
        );
      }
      return { success: true, last_read_message_id: maxId };
    } catch (err) {
      console.error('[markRoomAsRead Error]:', err);
    }
  }

  const lastMsg = memoryMessagesList[memoryMessagesList.length - 1];
  const maxId = lastMsg ? lastMsg.id : null;
  memoryRoomMembersMap.set(`${roomId}_${profileId}`, {
    last_read_message_id: maxId,
    joined_at: new Date().toISOString(),
  });

  return { success: true, last_read_message_id: maxId };
}

/**
 * Mentor moderation methods
 */
export async function getAdminReports() {
  if (isDatabaseConfigured()) {
    try {
      const [rows]: any = await db.query(`
        SELECT r.*,
               m.content AS message_content,
               m.created_at AS message_created_at,
               m.deleted_at AS message_deleted_at,
               author.nickname AS author_nickname,
               author.phone AS author_phone,
               author.id AS author_profile_id,
               reporter.nickname AS reporter_nickname
        FROM chat_message_reports r
        JOIN chat_messages m ON m.id = r.message_id
        JOIN chat_profiles author ON author.id = m.profile_id
        JOIN chat_profiles reporter ON reporter.id = r.reporter_profile_id
        ORDER BY r.id DESC LIMIT 100
      `);
      return rows || [];
    } catch (err) {
      console.error('[getAdminReports Error]:', err);
    }
  }

  return memoryReportsList.map((r) => {
    const msg = memoryMessagesList.find((m) => m.id === r.message_id);
    let authorP: any = null;
    let reporterP: any = null;
    for (const p of memoryProfilesMap.values()) {
      if (msg && p.id === msg.profile_id) authorP = p;
      if (p.id === r.reporter_profile_id) reporterP = p;
    }
    return {
      ...r,
      message_content: msg ? msg.content : 'Mensagem não encontrada',
      message_created_at: msg ? msg.created_at : null,
      message_deleted_at: msg ? msg.deleted_at : null,
      author_nickname: authorP ? authorP.nickname : 'Desconhecido',
      author_phone: authorP ? authorP.phone : 'N/A',
      author_profile_id: authorP ? authorP.id : null,
      reporter_nickname: reporterP ? reporterP.nickname : 'Desconhecido',
    };
  });
}

export async function getAdminProfilesList() {
  if (isDatabaseConfigured()) {
    try {
      const [rows]: any = await db.query(`
        SELECT p.*,
               (SELECT COUNT(*) FROM chat_messages WHERE profile_id = p.id AND deleted_at IS NULL) AS message_count,
               (SELECT COUNT(*) FROM chat_message_reports r JOIN chat_messages m ON m.id = r.message_id WHERE m.profile_id = p.id) AS report_count
        FROM chat_profiles p
        ORDER BY p.id DESC
      `);
      return rows || [];
    } catch (err) {
      console.error('[getAdminProfilesList Error]:', err);
    }
  }

  return Array.from(memoryProfilesMap.values()).map((p) => ({
    ...p,
    message_count: memoryMessagesList.filter((m) => m.profile_id === p.id && !m.deleted_at).length,
    report_count: memoryReportsList.filter((r) => {
      const msg = memoryMessagesList.find((m) => m.id === r.message_id);
      return msg && msg.profile_id === p.id;
    }).length,
  }));
}

export async function updateChatStatusByMentor(
  profileId: number,
  newStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED',
  reason?: string
) {
  if (isDatabaseConfigured()) {
    try {
      await db.query(
        `UPDATE chat_profiles SET chat_status = ? WHERE id = ?`,
        [newStatus, profileId]
      );
      const actionType = newStatus === 'SUSPENDED' ? 'CHAT_SUSPEND' : newStatus === 'BANNED' ? 'CHAT_BAN' : 'CHAT_REACTIVATE';
      await db.query(
        `INSERT INTO chat_moderation_actions (mentor_identifier, target_profile_id, action_type, reason)
         VALUES ('Mentor Bigode', ?, ?, ?)`,
        [profileId, actionType, reason || 'Ação do Mentor']
      );
      return { success: true };
    } catch (err) {
      console.error('[updateChatStatusByMentor Error]:', err);
      return { success: false, error: 'Erro ao atualizar status do chat.' };
    }
  }

  for (const p of memoryProfilesMap.values()) {
    if (p.id === profileId) {
      p.chat_status = newStatus;
      const actionType = newStatus === 'SUSPENDED' ? 'CHAT_SUSPEND' : newStatus === 'BANNED' ? 'CHAT_BAN' : 'CHAT_REACTIVATE';
      memoryAuditList.push({
        id: memoryAuditIdCounter++,
        mentor_identifier: 'Mentor Bigode',
        target_profile_id: profileId,
        message_id: null,
        action_type: actionType,
        reason: reason || 'Ação do Mentor',
        created_at: new Date().toISOString(),
      });
      return { success: true };
    }
  }
  return { success: false, error: 'Perfil não encontrado.' };
}

export async function createOfficialNotice(roomId: number, content: string) {
  if (!content || content.trim() === '') {
    return { success: false, error: 'Conteúdo do aviso em branco.' };
  }

  if (isDatabaseConfigured()) {
    try {
      await db.query(
        `UPDATE chat_notices SET is_active = 0 WHERE room_id = ?`,
        [roomId]
      );
      await db.query(
        `INSERT INTO chat_notices (room_id, content, created_by, is_active)
         VALUES (?, ?, 'Mentor Bigode', 1)`,
        [roomId, content.trim()]
      );
      return { success: true };
    } catch (err) {
      console.error('[createOfficialNotice Error]:', err);
      return { success: false, error: 'Erro ao criar aviso.' };
    }
  }

  memoryNoticesList.forEach((n) => { if (n.room_id === roomId) n.is_active = 0; });
  memoryNoticesList.push({
    id: memoryNoticeIdCounter++,
    room_id: roomId,
    content: content.trim(),
    created_by: 'Mentor Bigode',
    is_active: 1,
    created_at: new Date().toISOString(),
  });
  return { success: true };
}

export async function getActiveNotice(roomId: number) {
  if (isDatabaseConfigured()) {
    try {
      const [rows]: any = await db.query(
        `SELECT * FROM chat_notices WHERE room_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1`,
        [roomId]
      );
      return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    } catch (err) {
      console.error('[getActiveNotice Error]:', err);
    }
  }
  return memoryNoticesList.find((n) => n.room_id === roomId && n.is_active === 1) || null;
}

// ==================================================
// V1.1 PREMIUM FEATURE EXTENSIONS
// ==================================================

// In-memory typing status store: Map<roomId, Map<profileId, { nickname: string, timestamp: number }>>
const roomTypingMap = new Map<number, Map<number, { nickname: string; timestamp: number }>>();

export function setTypingStatus(roomId: number, profileId: number, nickname: string, isTyping: boolean) {
  if (!roomTypingMap.has(roomId)) {
    roomTypingMap.set(roomId, new Map());
  }
  const userMap = roomTypingMap.get(roomId)!;
  if (isTyping) {
    userMap.set(profileId, { nickname, timestamp: Date.now() });
  } else {
    userMap.delete(profileId);
  }
}

export function getTypingUsers(roomId: number, currentProfileId?: number): string[] {
  if (!roomTypingMap.has(roomId)) return [];
  const userMap = roomTypingMap.get(roomId)!;
  const now = Date.now();
  const activeNames: string[] = [];

  for (const [pId, info] of userMap.entries()) {
    if (now - info.timestamp > 5000) {
      userMap.delete(pId);
    } else if (pId !== currentProfileId) {
      activeNames.push(info.nickname);
    }
  }

  return activeNames;
}

export async function pinMessage(messageId: number, isPinned: boolean) {
  if (isDatabaseConfigured()) {
    try {
      if (isPinned) {
        // Clear previous pins in room
        const [mRows]: any = await db.query(`SELECT room_id FROM chat_messages WHERE id = ?`, [messageId]);
        if (mRows && mRows.length > 0) {
          await db.query(`UPDATE chat_messages SET is_pinned = 0 WHERE room_id = ?`, [mRows[0].room_id]);
        }
      }
      await db.query(
        `UPDATE chat_messages SET is_pinned = ?, pinned_at = ? WHERE id = ?`,
        [isPinned ? 1 : 0, isPinned ? new Date() : null, messageId]
      );
      return { success: true };
    } catch (err) {
      console.error('[pinMessage Error]:', err);
      return { success: false, error: 'Erro ao fixar mensagem.' };
    }
  }

  const msg = memoryMessagesList.find((m) => m.id === messageId);
  if (!msg) return { success: false, error: 'Mensagem não encontrada.' };

  if (isPinned) {
    memoryMessagesList.forEach((m) => {
      if (m.room_id === msg.room_id) m.is_pinned = 0;
    });
  }

  msg.is_pinned = isPinned ? 1 : 0;
  msg.pinned_at = isPinned ? new Date().toISOString() : null;
  return { success: true };
}

export async function getPinnedMessage(roomId: number) {
  if (isDatabaseConfigured()) {
    try {
      const [rows]: any = await db.query(`
        SELECT m.*, p.nickname AS author_nickname
        FROM chat_messages m
        JOIN chat_profiles p ON p.id = m.profile_id
        WHERE m.room_id = ? AND m.is_pinned = 1 AND m.deleted_at IS NULL
        ORDER BY m.id DESC LIMIT 1
      `, [roomId]);
      return rows && rows.length > 0 ? rows[0] : null;
    } catch (err) {
      console.error('[getPinnedMessage Error]:', err);
    }
  }

  const pinned = memoryMessagesList.find((m) => m.room_id === roomId && m.is_pinned === 1 && !m.deleted_at);
  if (!pinned) return null;
  let nickname = 'Aluno';
  for (const p of memoryProfilesMap.values()) {
    if (p.id === pinned.profile_id) nickname = p.nickname;
  }
  return { ...pinned, author_nickname: nickname };
}

export async function warnUserByMentor(profileId: number, reason: string) {
  if (isDatabaseConfigured()) {
    try {
      await db.query(
        `INSERT INTO chat_moderation_actions (mentor_identifier, target_profile_id, action_type, reason)
         VALUES ('Mentor Bigode', ?, 'WARN', ?)`,
        [profileId, reason]
      );
      // Post system message in room 1
      await db.query(
        `INSERT INTO chat_messages (room_id, profile_id, message_type, content, is_pinned)
         SELECT 1, id, 'SYSTEM', ?, 0 FROM chat_profiles WHERE nickname = 'Mentor Bigode' LIMIT 1`,
        [`⚠️ Advertência Oficial do Mentor para o membro: "${reason}"`]
      );

      createNotification({
        profileId,
        notificationType: 'MENTOR_WARNING',
        title: 'Orientação Oficial do Mentor',
        message: reason,
        deduplicationKey: `warning:${profileId}:${Date.now()}`,
      }).catch(() => {});
      return { success: true };
    } catch (err) {
      console.error('[warnUserByMentor Error]:', err);
      return { success: false, error: 'Erro ao registrar advertência.' };
    }
  }

  memoryAuditList.push({
    id: memoryAuditIdCounter++,
    mentor_identifier: 'Mentor Bigode',
    target_profile_id: profileId,
    message_id: null,
    action_type: 'WARN',
    reason,
    created_at: new Date().toISOString(),
  });

  const mentorP = Array.from(memoryProfilesMap.values()).find((p) => p.nickname === 'Mentor Bigode');
  if (mentorP) {
    memoryMessagesList.push({
      id: memoryMessageIdCounter++,
      room_id: 1,
      profile_id: mentorP.id,
      reply_to_message_id: null,
      message_type: 'SYSTEM',
      content: `⚠️ Advertência Oficial do Mentor: "${reason}"`,
      edited_at: null,
      deleted_at: null,
      deleted_by: null,
      is_pinned: 0,
      pinned_at: null,
      created_at: new Date().toISOString(),
    });
  }

  return { success: true };
}

export async function getUnreadCountForProfile(profileId: number) {
  if (isDatabaseConfigured()) {
    try {
      const [rows]: any = await db.query(`
        SELECT COUNT(*) AS total
        FROM chat_messages m
        JOIN chat_room_members rm ON rm.room_id = m.room_id AND rm.profile_id = ?
        WHERE m.id > COALESCE(rm.last_read_message_id, 0)
          AND m.profile_id != ?
          AND m.deleted_at IS NULL
      `, [profileId, profileId]);
      return rows && rows.length > 0 ? Number(rows[0].total) || 0 : 0;
    } catch (err) {
      console.error('[getUnreadCountForProfile Error]:', err);
    }
  }

  let count = 0;
  for (const [key, mem] of memoryRoomMembersMap.entries()) {
    if (key.endsWith(`_${profileId}`)) {
      const lastRead = mem.last_read_message_id || 0;
      count += memoryMessagesList.filter(
        (m) => m.id > lastRead && m.profile_id !== profileId && !m.deleted_at
      ).length;
    }
  }
  return count;
}

// ==================================================
// V1.2 COMUNIDADE VIVA - BACKEND EXTENSIONS
// ==================================================

/**
 * Toggle Reaction on a message
 */
export async function toggleReaction(messageId: number, profileId: number, emoji: string) {
  if (isDatabaseConfigured()) {
    try {
      const [existingRows]: any = await db.query(
        `SELECT id, emoji FROM chat_reactions WHERE message_id = ? AND profile_id = ?`,
        [messageId, profileId]
      );

      const existingSameEmoji = Array.isArray(existingRows) && existingRows.find((r: any) => r.emoji === emoji);

      if (existingSameEmoji) {
        // Remove reaction (toggle off)
        await db.query(`DELETE FROM chat_reactions WHERE id = ?`, [existingSameEmoji.id]);
      } else {
        // If user had a different reaction, remove it first (switch reaction)
        if (Array.isArray(existingRows) && existingRows.length > 0) {
          await db.query(`DELETE FROM chat_reactions WHERE message_id = ? AND profile_id = ?`, [messageId, profileId]);
        }

        await db.query(
          `INSERT INTO chat_reactions (message_id, profile_id, emoji) VALUES (?, ?, ?)`,
          [messageId, profileId, emoji]
        );

        // Find message author
        const [mRows]: any = await db.query(
          `SELECT profile_id, room_id, content FROM chat_messages WHERE id = ? LIMIT 1`,
          [messageId]
        );

        if (Array.isArray(mRows) && mRows.length > 0) {
          const authorId = Number(mRows[0].profile_id);
          const msgRoomId = Number(mRows[0].room_id || 1);
          const msgContent = String(mRows[0].content || '');

          if (authorId !== profileId) {
            await awardXp(
              authorId,
              'REACTION_RECEIVED',
              2,
              `react_${messageId}_${profileId}_${emoji}`,
              'REACTION',
              messageId
            );

            const [pRows]: any = await db.query(
              `SELECT nickname FROM chat_profiles WHERE id = ? LIMIT 1`,
              [profileId]
            ).catch(() => []);
            const reactorNickname = pRows?.[0]?.nickname || 'Um membro';

            createNotification({
              profileId: authorId,
              notificationType: 'REACTION_RECEIVED',
              title: `${reactorNickname} reagiu com ${emoji} à sua mensagem.`,
              message: msgContent ? msgContent.slice(0, 100) : 'Mensagem com mídia',
              relatedMessageId: messageId,
              relatedProfileId: profileId,
              relatedRoomId: msgRoomId,
              deduplicationKey: `reaction:${messageId}:${emoji}:${profileId}:${authorId}`,
            }).catch(() => {});
          }
          await recalculateUserStats(authorId);
        }
      }
      await recalculateUserStats(profileId);
      return { success: true };
    } catch (err) {
      console.error('[toggleReaction Error]:', err);
      return { success: false, error: 'Erro ao registrar reação.' };
    }
  }

  // Memory fallback
  const existingIndex = memoryReactionsList.findIndex(
    (r) => r.message_id === messageId && r.profile_id === profileId
  );

  if (existingIndex >= 0) {
    const existing = memoryReactionsList[existingIndex];
    if (existing.emoji === emoji) {
      memoryReactionsList.splice(existingIndex, 1);
    } else {
      memoryReactionsList.splice(existingIndex, 1);
      memoryReactionsList.push({
        id: memoryReactionIdCounter++,
        message_id: messageId,
        profile_id: profileId,
        emoji,
      });
    }
  } else {
    memoryReactionsList.push({
      id: memoryReactionIdCounter++,
      message_id: messageId,
      profile_id: profileId,
      emoji,
    });
  }
  return { success: true };
}

/**
 * Parse content for @mentions and record them
 */
export async function parseAndSaveMentions(messageId: number, sourceProfileId: number, content: string) {
  const matches = content.match(/@([a-zA-Z0-9._\s\-\u00C0-\u00FF]+)/g);
  if (!matches || matches.length === 0) return;

  const rawNames = matches.map((m) => m.slice(1).trim()).filter(Boolean);
  if (rawNames.length === 0) return;

  if (isDatabaseConfigured()) {
    try {
      const [sRows]: any = await db.query(
        `SELECT nickname, codigo FROM chat_profiles WHERE id = ? LIMIT 1`,
        [sourceProfileId]
      ).catch(() => []);
      const senderNickname = sRows?.[0]?.nickname || 'Um membro';

      for (const rawName of rawNames) {
        const [pRows]: any = await db.query(
          `SELECT id FROM chat_profiles WHERE LOWER(nickname) = LOWER(?) LIMIT 1`,
          [rawName]
        );
        if (Array.isArray(pRows) && pRows.length > 0) {
          const targetId = pRows[0].id;
          if (targetId !== sourceProfileId) {
            await db.query(
              `INSERT INTO chat_mentions (message_id, source_profile_id, target_profile_id) VALUES (?, ?, ?)`,
              [messageId, sourceProfileId, targetId]
            ).catch(() => {});

            createNotification({
              profileId: targetId,
              notificationType: 'MENTION_RECEIVED',
              title: `${senderNickname} mencionou você em uma mensagem.`,
              message: content.slice(0, 100),
              relatedMessageId: messageId,
              relatedProfileId: sourceProfileId,
              deduplicationKey: `mention:${messageId}:${targetId}`,
            }).catch(() => {});
          }
        }
      }
    } catch (err) {
      console.error('[parseAndSaveMentions Error]:', err);
    }
    return;
  }

  for (const rawName of rawNames) {
    for (const p of memoryProfilesMap.values()) {
      if (p.nickname.toLowerCase() === rawName.toLowerCase() && p.id !== sourceProfileId) {
        memoryMentionsList.push({
          id: memoryMentionIdCounter++,
          message_id: messageId,
          source_profile_id: sourceProfileId,
          target_profile_id: p.id,
          is_read: 0,
        });
      }
    }
  }
}

/**
 * Get unread mentions count for profile
 */
export async function getUnreadMentionsCount(profileId: number) {
  if (isDatabaseConfigured()) {
    try {
      const [rows]: any = await db.query(
        `SELECT COUNT(*) AS total FROM chat_mentions WHERE target_profile_id = ? AND is_read = 0`,
        [profileId]
      );
      return rows && rows.length > 0 ? Number(rows[0].total) || 0 : 0;
    } catch (err) {
      console.error('[getUnreadMentionsCount Error]:', err);
    }
  }

  return memoryMentionsList.filter((m) => m.target_profile_id === profileId && m.is_read === 0).length;
}

/**
 * Mark mentions as read for user
 */
export async function markMentionsAsRead(profileId: number) {
  if (isDatabaseConfigured()) {
    try {
      await db.query(`UPDATE chat_mentions SET is_read = 1 WHERE target_profile_id = ?`, [profileId]);
      return { success: true };
    } catch (err) {
      console.error('[markMentionsAsRead Error]:', err);
    }
  }

  memoryMentionsList.forEach((m) => {
    if (m.target_profile_id === profileId) m.is_read = 1;
  });
  return { success: true };
}

/**
 * Get member autocomplete list
 */
export async function getCommunityMembersListForAutocomplete() {
  if (isDatabaseConfigured()) {
    try {
      const [rows]: any = await db.query(
        `SELECT id, nickname, photo_url, codigo FROM chat_profiles WHERE chat_status = 'ACTIVE' ORDER BY nickname ASC LIMIT 100`
      );
      if (Array.isArray(rows)) {
        return rows.map((r) => ({
          id: r.id,
          nickname: r.nickname,
          photo_url: r.photo_url,
          is_mentor: isMasterKey(r.codigo),
        }));
      }
    } catch (err) {
      console.error('[getCommunityMembersListForAutocomplete Error]:', err);
    }
  }

  return Array.from(memoryProfilesMap.values()).map((p) => ({
    id: p.id,
    nickname: p.nickname,
    photo_url: p.photo_url,
    is_mentor: isMasterKey(p.codigo),
  }));
}

/**
 * Create Poll (Mentor Only)
 */
export async function createPoll(roomId: number, question: string, options: string[], createdBy: string) {
  if (!question || !options || options.length < 2) {
    return { success: false, error: 'A enquete precisa de uma pergunta e pelo menos 2 opções.' };
  }

  const cleanOptions = options.map((o) => o.trim()).filter(Boolean);

  if (isDatabaseConfigured()) {
    try {
      // Deactivate older polls
      await db.query(`UPDATE chat_polls SET is_active = 0 WHERE room_id = ?`, [roomId]);

      const [res]: any = await db.query(
        `INSERT INTO chat_polls (room_id, question, options_json, created_by, is_active, created_at)
         VALUES (?, ?, ?, ?, 1, NOW())`,
        [roomId, question, JSON.stringify(cleanOptions), createdBy]
      );

      const pollId = res.insertId;

      // Send automated system notification message
      await db.query(
        `INSERT INTO chat_messages (room_id, profile_id, message_type, content)
         SELECT ?, id, 'SYSTEM', ? FROM chat_profiles WHERE codigo = ? LIMIT 1`,
        [roomId, `📊 Nova Enquete Oficial da Comunidade: "${question}"`, normalizeAccessCode(createdBy)]
      );

      createNotificationForActiveProfiles({
        notificationType: 'POLL_CREATED',
        title: 'Uma nova enquete está disponível.',
        message: question.slice(0, 100),
        relatedPollId: pollId,
        relatedRoomId: roomId,
        deduplicationKeyPrefix: `poll:${pollId}`,
      }).catch(() => {});

      return { success: true, pollId };
    } catch (err) {
      console.error('[createPoll Error]:', err);
      return { success: false, error: 'Erro ao criar enquete.' };
    }
  }

  memoryPollsList.forEach((p) => {
    if (p.room_id === roomId) p.is_active = 0;
  });

  const pollId = memoryPollIdCounter++;
  memoryPollsList.push({
    id: pollId,
    room_id: roomId,
    question,
    options: cleanOptions,
    created_by: createdBy,
    is_active: 1,
    created_at: new Date().toISOString(),
  });

  return { success: true, pollId };
}

/**
 * Vote on a Poll
 */
export async function votePoll(pollId: number, profileId: number, optionIndex: number) {
  if (isDatabaseConfigured()) {
    try {
      await db.query(
        `INSERT INTO chat_poll_votes (poll_id, profile_id, option_index)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE option_index = VALUES(option_index)`,
        [pollId, profileId, optionIndex]
      );
      await awardXp(profileId, 'POLL_VOTED', 1, `poll_${pollId}_${profileId}`, 'POLL', pollId);
      await recalculateUserStats(profileId);
      return { success: true };
    } catch (err) {
      console.error('[votePoll Error]:', err);
      return { success: false, error: 'Erro ao registrar voto.' };
    }
  }

  const existingIndex = memoryPollVotesList.findIndex(
    (v) => v.poll_id === pollId && v.profile_id === profileId
  );
  if (existingIndex >= 0) {
    memoryPollVotesList[existingIndex].option_index = optionIndex;
  } else {
    memoryPollVotesList.push({
      id: memoryPollVoteIdCounter++,
      poll_id: pollId,
      profile_id: profileId,
      option_index: optionIndex,
    });
  }
  return { success: true };
}

/**
 * Get active poll details with vote counts and user choice
 */
export async function getActivePoll(roomId: number, profileId: number) {
  if (isDatabaseConfigured()) {
    try {
      const [pRows]: any = await db.query(
        `SELECT * FROM chat_polls WHERE room_id = ? AND is_active = 1 ORDER BY id DESC LIMIT 1`,
        [roomId]
      );
      if (!Array.isArray(pRows) || pRows.length === 0) return null;

      const poll = pRows[0];
      const options: string[] = typeof poll.options_json === 'string' ? JSON.parse(poll.options_json) : poll.options_json;

      const [vRows]: any = await db.query(
        `SELECT option_index, COUNT(*) as count FROM chat_poll_votes WHERE poll_id = ? GROUP BY option_index`,
        [poll.id]
      );

      const countsMap: Record<number, number> = {};
      let totalVotes = 0;

      if (Array.isArray(vRows)) {
        vRows.forEach((v: any) => {
          countsMap[v.option_index] = Number(v.count);
          totalVotes += Number(v.count);
        });
      }

      const [userVoteRow]: any = await db.query(
        `SELECT option_index FROM chat_poll_votes WHERE poll_id = ? AND profile_id = ? LIMIT 1`,
        [poll.id, profileId]
      );

      const userVotedOption = Array.isArray(userVoteRow) && userVoteRow.length > 0 ? userVoteRow[0].option_index : null;

      const optionResults = options.map((opt, idx) => {
        const count = countsMap[idx] || 0;
        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        return {
          index: idx,
          label: opt,
          count,
          percentage,
        };
      });

      return {
        id: poll.id,
        question: poll.question,
        options: optionResults,
        totalVotes,
        userVotedOption,
        created_at: poll.created_at,
      };
    } catch (err) {
      console.error('[getActivePoll Error]:', err);
    }
  }

  const poll = memoryPollsList.find((p) => p.room_id === roomId && p.is_active === 1);
  if (!poll) return null;

  const votes = memoryPollVotesList.filter((v) => v.poll_id === poll.id);
  const totalVotes = votes.length;
  const userVote = votes.find((v) => v.profile_id === profileId);

  const optionResults = poll.options.map((opt, idx) => {
    const count = votes.filter((v) => v.option_index === idx).length;
    const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    return {
      index: idx,
      label: opt,
      count,
      percentage,
    };
  });

  return {
    id: poll.id,
    question: poll.question,
    options: optionResults,
    totalVotes,
    userVotedOption: userVote ? userVote.option_index : null,
    created_at: poll.created_at,
  };
}

/**
 * Favorite Message
 */
export async function toggleFavoriteMessage(profileId: number, messageId: number) {
  if (isDatabaseConfigured()) {
    try {
      const [existing]: any = await db.query(
        `SELECT id FROM chat_favorites WHERE profile_id = ? AND message_id = ? LIMIT 1`,
        [profileId, messageId]
      );

      if (Array.isArray(existing) && existing.length > 0) {
        await db.query(`DELETE FROM chat_favorites WHERE id = ?`, [existing[0].id]);
        return { success: true, isFavorite: false };
      } else {
        await db.query(
          `INSERT INTO chat_favorites (profile_id, message_id) VALUES (?, ?)`,
          [profileId, messageId]
        );
        return { success: true, isFavorite: true };
      }
    } catch (err) {
      console.error('[toggleFavoriteMessage Error]:', err);
      return { success: false, error: 'Erro ao favoritar mensagem.' };
    }
  }

  const idx = memoryFavoritesList.findIndex(
    (f) => f.profile_id === profileId && f.message_id === messageId
  );
  if (idx >= 0) {
    memoryFavoritesList.splice(idx, 1);
    return { success: true, isFavorite: false };
  } else {
    memoryFavoritesList.push({ profile_id: profileId, message_id: messageId });
    return { success: true, isFavorite: true };
  }
}

/**
 * Get User Favorite Messages
 */
export async function getUserFavoriteMessages(profileId: number) {
  if (isDatabaseConfigured()) {
    try {
      const [rows]: any = await db.query(
        `SELECT m.id, m.content, m.created_at, p.nickname, p.photo_url, p.codigo
         FROM chat_favorites f
         JOIN chat_messages m ON m.id = f.message_id
         JOIN chat_profiles p ON p.id = m.profile_id
         WHERE f.profile_id = ? AND m.deleted_at IS NULL
         ORDER BY f.id DESC`,
        [profileId]
      );

      if (Array.isArray(rows)) {
        return rows.map((r) => {
          const isMentor = isMasterKey(r.codigo);
          return {
            id: r.id,
            content: r.content,
            created_at: r.created_at,
            author_nickname: r.nickname,
            author_photo: r.photo_url,
          };
        });
      }
    } catch (err) {
      console.error('[getUserFavoriteMessages Error]:', err);
    }
  }

  const favMsgIds = memoryFavoritesList.filter((f) => f.profile_id === profileId).map((f) => f.message_id);
  const favMsgs = memoryMessagesList.filter((m) => favMsgIds.includes(m.id) && !m.deleted_at);

  return favMsgs.map((m) => {
    let authorP: any = null;
    for (const p of memoryProfilesMap.values()) {
      if (p.id === m.profile_id) authorP = p;
    }
    const isMentor = authorP ? isMasterKey(authorP.codigo) : false;
    return {
      id: m.id,
      content: m.content,
      created_at: m.created_at,
      author_nickname: authorP?.nickname || 'Aluno',
      author_photo: authorP?.photo_url || null,
    };
  });
}

/**
 * Touch profile activity timestamp
 */
export async function touchProfileActivity(codigoOrProfileId: string | number) {
  const now = new Date().toISOString();
  if (typeof codigoOrProfileId === 'number') {
    if (isDatabaseConfigured()) {
      await db.query(`UPDATE chat_profiles SET last_chat_activity_at = NOW() WHERE id = ?`, [codigoOrProfileId]).catch(() => {});
    }
    for (const p of memoryProfilesMap.values()) {
      if (p.id === codigoOrProfileId) {
        p.last_chat_activity_at = now;
      }
    }
  } else {
    const cleanCode = normalizeAccessCode(codigoOrProfileId);
    if (cleanCode) {
      if (isDatabaseConfigured()) {
        await db.query(`UPDATE chat_profiles SET last_chat_activity_at = NOW() WHERE codigo = ?`, [cleanCode]).catch(() => {});
      }
      const p = memoryProfilesMap.get(cleanCode);
      if (p) {
        p.last_chat_activity_at = now;
      }
    }
  }
}

/**
 * Get Online Members List for Drawer
 * Deduplicates by profile_id so multiple sessions of the same account appear only once.
 * STRICTLY PROTECTS PRIVATE DATA: NEVER returns phone, IP, access key, or session ID.
 */
export async function getOnlineMembersDrawerList() {
  const activeCodes = new Set<string>();
  const nowMs = Date.now();

  // Add active codes from memorySessionsMap (last 90 seconds)
  for (const [rawCode, memSession] of memorySessionsMap.entries()) {
    const norm = normalizeAccessCode(rawCode);
    if (norm && memSession.lastHeartbeatAt && (nowMs - memSession.lastHeartbeatAt.getTime() <= 90000)) {
      activeCodes.add(norm);
    }
  }

  if (isDatabaseConfigured()) {
    try {
      // Fetch active codes from sessoes table (last 90s)
      const [sessRows]: any = await db.query(
        `SELECT DISTINCT codigo FROM sessoes WHERE is_online = 1 AND last_heartbeat_at >= NOW() - INTERVAL 90 SECOND`
      ).catch(() => []);
      if (Array.isArray(sessRows)) {
        for (const r of sessRows) {
          const norm = normalizeAccessCode(r.codigo);
          if (norm) activeCodes.add(norm);
        }
      }

      const activeCodesArray = Array.from(activeCodes);
      const hasCodes = activeCodesArray.length > 0;

      const [rows]: any = await db.query(
        `SELECT p.id, p.nickname, p.photo_url, p.bio, p.codigo, p.created_at, p.last_chat_activity_at,
                (SELECT COUNT(*) FROM chat_messages WHERE profile_id = p.id AND deleted_at IS NULL) AS total_messages
         FROM chat_profiles p
         WHERE p.chat_status = 'ACTIVE'
           AND (p.last_chat_activity_at >= NOW() - INTERVAL 90 SECOND ${hasCodes ? 'OR p.codigo IN (?)' : ''})
         ORDER BY p.nickname ASC`,
        hasCodes ? [activeCodesArray] : []
      );

      if (Array.isArray(rows)) {
        const uniqueMembersMap = new Map<number, any>();
        for (const p of rows) {
          const isMentor = isMasterKey(p.codigo);
          if (!uniqueMembersMap.has(p.id)) {
            uniqueMembersMap.set(p.id, {
              id: p.id,
              profile_id: p.id,
              nickname: p.nickname,
              photo_url: p.photo_url,
              bio: p.bio || null,
              is_mentor: isMentor,
              joined_at: p.created_at,
              last_seen: p.last_chat_activity_at ? new Date(p.last_chat_activity_at).toISOString() : new Date().toISOString(),
              is_online: true,
              total_messages: Number(p.total_messages) || 0,
            });
          }
        }
        return Array.from(uniqueMembersMap.values());
      }
    } catch (err) {
      console.error('[getOnlineMembersDrawerList Error]:', err);
    }
  }

  // Fallback to memory store with profile deduplication
  const uniqueMembersMap = new Map<number, any>();
  for (const p of memoryProfilesMap.values()) {
    const normCode = normalizeAccessCode(p.codigo);
    const lastActivityMs = p.last_chat_activity_at ? new Date(p.last_chat_activity_at).getTime() : 0;
    const isRecentlyActive = (nowMs - lastActivityMs) <= 90000;
    const isCodeActive = normCode ? activeCodes.has(normCode) : false;

    if (isRecentlyActive || isCodeActive) {
      const isMentor = isMasterKey(p.codigo);
      if (!uniqueMembersMap.has(p.id)) {
        const totalMsgs = memoryMessagesList.filter((m) => m.profile_id === p.id && !m.deleted_at).length;
        uniqueMembersMap.set(p.id, {
          id: p.id,
          profile_id: p.id,
          nickname: p.nickname,
          photo_url: p.photo_url,
          bio: p.bio || null,
          is_mentor: isMentor,
          joined_at: p.created_at,
          last_seen: p.last_chat_activity_at || new Date().toISOString(),
          is_online: true,
          total_messages: totalMsgs,
        });
      }
    }
  }

  return Array.from(uniqueMembersMap.values());
}

/**
 * Get Community Ranking & Stats
 */
export async function getCommunityRanking() {
  if (isDatabaseConfigured()) {
    try {
      const [rows]: any = await db.query(
        `SELECT p.id, p.nickname, p.photo_url, p.codigo, p.xp_total, p.current_level,
                p.message_count, p.reaction_received_count, p.current_streak, p.created_at
         FROM chat_profiles p
         WHERE p.chat_status = 'ACTIVE'
         ORDER BY p.xp_total DESC, p.current_streak DESC, p.message_count DESC, p.id ASC
         LIMIT 20`
      );

      if (Array.isArray(rows)) {
        return rows.map((r, index) => {
          const isMentor = isMasterKey(r.codigo);
          const { level } = calculateLevelFromXp(r.xp_total || 0);
          return {
            rank: index + 1,
            position: index + 1,
            id: r.id,
            profileId: r.id,
            nickname: r.nickname,
            photo_url: r.photo_url,
            photoUrl: r.photo_url,
            is_mentor: isMentor,
            xp: Number(r.xp_total) || 0,
            level: Math.max(level, Number(r.current_level) || 1),
            messageCount: Number(r.message_count) || 0,
            message_count: Number(r.message_count) || 0,
            reactionReceivedCount: Number(r.reaction_received_count) || 0,
            reactions_received: Number(r.reaction_received_count) || 0,
            currentStreak: Number(r.current_streak) || 0,
            badges: isMentor ? ['MENTOR'] : level >= 5 ? ['ELITE'] : [],
            score: Number(r.xp_total) || 0,
          };
        });
      }
    } catch (err) {
      console.error('[getCommunityRanking Error]:', err);
    }
  }

  // Memory fallback
  const list = Array.from(memoryProfilesMap.values()).map((p) => {
    const isMentor = isMasterKey(p.codigo);
    const msgs = memoryMessagesList.filter((m) => m.profile_id === p.id && !m.deleted_at);
    const reactions = memoryReactionsList.filter((r) => msgs.some((m) => m.id === r.message_id)).length;
    const score = msgs.length * 2 + reactions * 3;

    return {
      rank: 1,
      position: 1,
      id: p.id,
      profileId: p.id,
      nickname: p.nickname,
      photo_url: p.photo_url,
      photoUrl: p.photo_url,
      is_mentor: isMentor,
      xp: score,
      level: 1,
      messageCount: msgs.length,
      message_count: msgs.length,
      reactionReceivedCount: reactions,
      reactions_received: reactions,
      currentStreak: 0,
      badges: isMentor ? ['MENTOR'] : [],
      score,
    };
  });

  list.sort((a, b) => b.score - a.score);
  return list.slice(0, 20).map((item, idx) => ({ ...item, rank: idx + 1, position: idx + 1 }));
}

/**
 * Get Community Header / Dashboard Stats
 */
export async function getCommunityStats() {
  const presenceData = await getCentralPresenceData();
  const onlineCount = presenceData.stats?.onlineNow || 0;

  let totalParticipants = memoryProfilesMap.size;
  let totalMessagesToday = 0;

  if (isDatabaseConfigured()) {
    try {
      const [pRows]: any = await db.query(`SELECT COUNT(*) AS total FROM chat_profiles WHERE chat_status = 'ACTIVE'`);
      if (Array.isArray(pRows) && pRows.length > 0) totalParticipants = Number(pRows[0].total);

      const [mRows]: any = await db.query(
        `SELECT COUNT(*) AS total FROM chat_messages WHERE created_at >= CURDATE() AND deleted_at IS NULL`
      );
      if (Array.isArray(mRows) && mRows.length > 0) totalMessagesToday = Number(mRows[0].total);
    } catch (err) {
      console.error('[getCommunityStats Error]:', err);
    }
  }

  return {
    onlineCount,
    totalParticipants,
    totalMessagesToday,
  };
}

export let cleanupStats = {
  profilesRemoved: 0,
  messagesRemoved: 0,
  reactionsRemoved: 0,
  favoritesRemoved: 0,
  mentionsRemoved: 0,
  readsRemoved: 0,
  reportsRemoved: 0,
  notificationsRemoved: 0,
  mediaRemoved: 0,
  executedAt: '',
};

/**
 * Perform One-Time Administrative Chat History Cleanup
 * Uses MySQL transactions when DB is connected.
 * Preserves valid profiles, keys, configuration, tables, and "Anderson Profeta Logado".
 */
export async function performOneTimeChatCleanup(): Promise<{
  success: boolean;
  messagesRemoved: number;
  reactionsRemoved: number;
  favoritesRemoved: number;
  mentionsRemoved: number;
  readsRemoved: number;
  reportsRemoved: number;
  notificationsRemoved: number;
  mediaRemoved: number;
}> {
  console.log('[CHAT CLEANUP START]');

  let messagesRemoved = 0;
  let reactionsRemoved = 0;
  let favoritesRemoved = 0;
  let mentionsRemoved = 0;
  let readsRemoved = 0;
  let reportsRemoved = 0;
  let notificationsRemoved = 0;
  let mediaRemoved = 0;

  if (isDatabaseConfigured()) {
    try {
      await ensureChatTables();
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();

        // Count items before deletion
        const [mRows]: any = await connection.query(`SELECT COUNT(*) as cnt FROM chat_messages`);
        messagesRemoved = Number(mRows?.[0]?.cnt || 0);

        const [rRows]: any = await connection.query(`SELECT COUNT(*) as cnt FROM chat_reactions`).catch(() => []);
        reactionsRemoved = Number(rRows?.[0]?.cnt || 0);

        const [fRows]: any = await connection.query(`SELECT COUNT(*) as cnt FROM chat_favorites`).catch(() => []);
        favoritesRemoved = Number(fRows?.[0]?.cnt || 0);

        const [menRows]: any = await connection.query(`SELECT COUNT(*) as cnt FROM chat_mentions`).catch(() => []);
        mentionsRemoved = Number(menRows?.[0]?.cnt || 0);

        const [readRows]: any = await connection.query(`SELECT COUNT(*) as cnt FROM chat_message_reads`).catch(() => []);
        readsRemoved = Number(readRows?.[0]?.cnt || 0);

        const [repRows]: any = await connection.query(`SELECT COUNT(*) as cnt FROM chat_reports`).catch(() => []);
        reportsRemoved = Number(repRows?.[0]?.cnt || 0);

        const [notifRows]: any = await connection.query(`SELECT COUNT(*) as cnt FROM chat_notifications`).catch(() => []);
        notificationsRemoved = Number(notifRows?.[0]?.cnt || 0);

        const [medRows]: any = await connection.query(`SELECT COUNT(*) as cnt FROM chat_media`).catch(() => []);
        mediaRemoved = Number(medRows?.[0]?.cnt || 0);

        console.log(`[CHAT CLEANUP COUNTS] messages=${messagesRemoved}, reactions=${reactionsRemoved}, favorites=${favoritesRemoved}, mentions=${mentionsRemoved}, reads=${readsRemoved}, reports=${reportsRemoved}, notifications=${notificationsRemoved}, media=${mediaRemoved}`);

        // Disable FK checks temporarily for transaction cleanup
        await connection.query(`SET FOREIGN_KEY_CHECKS = 0`);

        await connection.query(`DELETE FROM chat_favorites`);
        await connection.query(`DELETE FROM chat_reactions`);
        await connection.query(`DELETE FROM chat_mentions`);
        await connection.query(`DELETE FROM chat_message_reads`);
        await connection.query(`DELETE FROM chat_reports`);
        await connection.query(`DELETE FROM chat_notifications`);
        await connection.query(`DELETE FROM chat_media`);
        await connection.query(`DELETE FROM chat_messages`);
        await connection.query(`DELETE FROM chat_notices`).catch(() => {});

        // Reset room stats
        await connection.query(`UPDATE chat_rooms SET last_message_content = NULL, last_message_at = NULL WHERE id = 1`).catch(() => {});
        await connection.query(`UPDATE chat_room_members SET last_read_message_id = NULL`).catch(() => {});

        await connection.query(`SET FOREIGN_KEY_CHECKS = 1`);

        await connection.commit();
        connection.release();

        console.log('[CHAT CLEANUP SUCCESS]');
      } catch (txErr) {
        await connection.query(`SET FOREIGN_KEY_CHECKS = 1`).catch(() => {});
        await connection.rollback().catch(() => {});
        connection.release();
        console.error('[CHAT CLEANUP ERROR]', txErr);
      }
    } catch (dbErr) {
      console.error('[CHAT CLEANUP ERROR]', dbErr);
    }
  }

  // Memory cleanup
  if (memoryMessagesList.length > 0) {
    messagesRemoved += memoryMessagesList.length;
    memoryMessagesList.length = 0;
  }
  memoryReactionsList.length = 0;
  memoryFavoritesList.length = 0;
  memoryMentionsList.length = 0;
  memoryReportsList.length = 0;
  memoryNoticesList.length = 0;

  // Ensure Anderson Profeta profile exists
  const hasAnderson = Array.from(memoryProfilesMap.values()).some((p) => {
    const nick = (p.nickname || '').toLowerCase();
    return nick.includes('anderson') || nick.includes('profeta');
  });

  if (!hasAnderson) {
    const cleanCode = 'GZ-5KRT-SRGB';
    memoryProfilesMap.set(cleanCode, {
      id: 2,
      codigo: cleanCode,
      nickname: 'Anderson Profeta Logado',
      photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
      phone: '(11) 99999-8888',
      phone_visibility: 'MEMBERS',
      bio: 'Aluno da Geração Z Pro - Anderson Profeta',
      chat_status: 'ACTIVE',
      created_at: new Date().toISOString(),
      xp_total: 150,
      current_level: 2,
      current_streak: 3,
      last_participation_date: new Date().toISOString().split('T')[0],
      message_count: 0,
      reply_count: 0,
    });
  }

  cleanupStats = {
    profilesRemoved: 0,
    messagesRemoved,
    reactionsRemoved,
    favoritesRemoved,
    mentionsRemoved,
    readsRemoved,
    reportsRemoved,
    notificationsRemoved,
    mediaRemoved,
    executedAt: new Date().toISOString(),
  };

  return {
    success: true,
    messagesRemoved,
    reactionsRemoved,
    favoritesRemoved,
    mentionsRemoved,
    readsRemoved,
    reportsRemoved,
    notificationsRemoved,
    mediaRemoved,
  };
}

export async function performEnvironmentCleanup(): Promise<{ profilesRemoved: number; messagesRemoved: number }> {
  const result = await performOneTimeChatCleanup();
  return { profilesRemoved: 0, messagesRemoved: result.messagesRemoved };
}

export async function deleteChatProfile(profileId: number): Promise<{ success: boolean; message: string }> {
  console.log('[CHAT PROFILE DELETE START]', { profileId });

  // 1. Clear memory profiles map
  for (const [code, p] of memoryProfilesMap.entries()) {
    if (p.id === profileId) {
      memoryProfilesMap.delete(code);
    }
  }

  // 2. Database transaction if configured
  if (isDatabaseConfigured()) {
    const connection: any = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Ensure 'Usuário sem perfil' system profile exists
      let unlinkedProfileId = 0;
      const [unlinkedRows]: any = await connection.query(
        `SELECT id FROM chat_profiles WHERE codigo = 'UNLINKED_SYSTEM_PROFILE' LIMIT 1`
      );

      if (Array.isArray(unlinkedRows) && unlinkedRows.length > 0) {
        unlinkedProfileId = unlinkedRows[0].id;
      } else {
        const [insRes]: any = await connection.query(
          `INSERT INTO chat_profiles (codigo, nickname, phone, phone_visibility, bio, chat_status)
           VALUES ('UNLINKED_SYSTEM_PROFILE', 'Usuário sem perfil', '00000000000', 'MENTOR_ONLY', 'Perfil excluído do Bate-papo', 'ACTIVE')`
        );
        unlinkedProfileId = insRes.insertId;
      }

      // Reassign messages to unlinkedProfileId so chat history stays intact
      if (unlinkedProfileId && unlinkedProfileId !== profileId) {
        await connection.query(
          `UPDATE chat_messages SET profile_id = ? WHERE profile_id = ?`,
          [unlinkedProfileId, profileId]
        );
      }

      // Delete student personal chat records
      await connection.query(`DELETE FROM chat_room_members WHERE profile_id = ?`, [profileId]);
      await connection.query(`DELETE FROM chat_reactions WHERE profile_id = ?`, [profileId]);
      await connection.query(`DELETE FROM chat_poll_votes WHERE profile_id = ?`, [profileId]);
      await connection.query(`DELETE FROM chat_favorites WHERE profile_id = ?`, [profileId]);
      await connection.query(`DELETE FROM chat_xp_events WHERE profile_id = ?`, [profileId]);
      await connection.query(`DELETE FROM chat_profile_achievements WHERE profile_id = ?`, [profileId]);
      await connection.query(`DELETE FROM chat_notifications WHERE profile_id = ?`, [profileId]);
      await connection.query(`DELETE FROM chat_message_reads WHERE profile_id = ?`, [profileId]);
      await connection.query(`DELETE FROM chat_mentions WHERE source_profile_id = ? OR target_profile_id = ?`, [profileId, profileId]);
      await connection.query(`DELETE FROM chat_user_mutes WHERE profile_id = ? OR muted_profile_id = ?`, [profileId, profileId]);
      await connection.query(`DELETE FROM chat_user_blocks WHERE profile_id = ? OR blocked_profile_id = ?`, [profileId, profileId]);
      await connection.query(`DELETE FROM chat_message_reports WHERE reporter_profile_id = ?`, [profileId]);

      // Delete the chat profile row itself
      await connection.query(`DELETE FROM chat_profiles WHERE id = ?`, [profileId]);

      await connection.commit();
      connection.release();
      console.log('[CHAT PROFILE DELETE SUCCESS]', { profileId });
    } catch (err: any) {
      await connection.rollback().catch(() => {});
      connection.release();
      console.error('[CHAT PROFILE DELETE ERROR]', err);
      throw err;
    }
  }

  return { success: true, message: 'Perfil do Bate-papo excluído com sucesso.' };
}

export async function clearChatRoom(
  roomId: number = 1,
  preserveNotices: boolean = true
): Promise<{
  success: boolean;
  messagesRemoved: number;
  reactionsRemoved: number;
  favoritesRemoved: number;
  mentionsRemoved: number;
  readsRemoved: number;
  reportsRemoved: number;
  notificationsRemoved: number;
  mediaRemoved: number;
}> {
  console.log('[CHAT ROOM CLEAR START]', { roomId, preserveNotices });

  let messagesRemoved = 0;
  let reactionsRemoved = 0;
  let favoritesRemoved = 0;
  let mentionsRemoved = 0;
  let readsRemoved = 0;
  let reportsRemoved = 0;
  let notificationsRemoved = 0;
  let mediaRemoved = 0;

  if (isDatabaseConfigured()) {
    const connection: any = await db.getConnection();
    try {
      await connection.beginTransaction();

      let msgQuery = `SELECT id FROM chat_messages WHERE room_id = ?`;
      if (preserveNotices) {
        msgQuery += ` AND message_type NOT IN ('NOTICE', 'ANNOUNCEMENT', 'SYSTEM')`;
      }

      const [msgRows]: any = await connection.query(msgQuery, [roomId]);
      const msgIds: number[] = (msgRows || []).map((r: any) => r.id);

      if (msgIds.length > 0) {
        const placeholders = msgIds.map(() => '?').join(',');

        const [rx]: any = await connection.query(`DELETE FROM chat_reactions WHERE message_id IN (${placeholders})`, msgIds);
        reactionsRemoved = rx?.affectedRows || 0;

        const [fav]: any = await connection.query(`DELETE FROM chat_favorites WHERE message_id IN (${placeholders})`, msgIds);
        favoritesRemoved = fav?.affectedRows || 0;

        const [mnet]: any = await connection.query(`DELETE FROM chat_mentions WHERE message_id IN (${placeholders})`, msgIds);
        mentionsRemoved = mnet?.affectedRows || 0;

        const [rd]: any = await connection.query(`DELETE FROM chat_message_reads WHERE message_id IN (${placeholders})`, msgIds);
        readsRemoved = rd?.affectedRows || 0;

        const [rep]: any = await connection.query(`DELETE FROM chat_message_reports WHERE message_id IN (${placeholders})`, msgIds);
        reportsRemoved = rep?.affectedRows || 0;

        const [notif]: any = await connection.query(`DELETE FROM chat_notifications WHERE related_message_id IN (${placeholders})`, msgIds);
        notificationsRemoved = notif?.affectedRows || 0;

        const [med]: any = await connection.query(`DELETE FROM chat_media WHERE message_id IN (${placeholders})`, msgIds);
        mediaRemoved = med?.affectedRows || 0;

        await connection.query(`UPDATE chat_messages SET reply_to_message_id = NULL WHERE reply_to_message_id IN (${placeholders})`, msgIds);

        const [msgDel]: any = await connection.query(`DELETE FROM chat_messages WHERE id IN (${placeholders})`, msgIds);
        messagesRemoved = msgDel?.affectedRows || 0;
      }

      // Reset room preview
      const [lastMsgRows]: any = await connection.query(
        `SELECT content, created_at FROM chat_messages WHERE room_id = ? ORDER BY id DESC LIMIT 1`,
        [roomId]
      );

      let lastMsgContent = null;
      let lastMsgAt = null;
      if (Array.isArray(lastMsgRows) && lastMsgRows.length > 0) {
        lastMsgContent = lastMsgRows[0].content;
        lastMsgAt = lastMsgRows[0].created_at;
      }

      await connection.query(
        `UPDATE chat_rooms SET last_message_content = ?, last_message_at = ? WHERE id = ?`,
        [lastMsgContent, lastMsgAt, roomId]
      );

      await connection.query(
        `UPDATE chat_room_members SET last_read_message_id = 0 WHERE room_id = ?`,
        [roomId]
      );

      await connection.commit();
      connection.release();
    } catch (err: any) {
      await connection.rollback().catch(() => {});
      connection.release();
      console.error('[CHAT ROOM CLEAR ERROR]', err);
      throw err;
    }
  }

  // Clear memory cache
  for (let i = memoryMessagesList.length - 1; i >= 0; i--) {
    const m = memoryMessagesList[i];
    if (m.room_id === roomId) {
      if (!preserveNotices || ((m.message_type as string) !== 'NOTICE' && (m.message_type as string) !== 'ANNOUNCEMENT' && (m.message_type as string) !== 'SYSTEM')) {
        memoryMessagesList.splice(i, 1);
      }
    }
  }

  console.log('[CHAT ROOM CLEAR COUNTS]', {
    messagesRemoved,
    reactionsRemoved,
    favoritesRemoved,
    mentionsRemoved,
    readsRemoved,
    reportsRemoved,
    notificationsRemoved,
    mediaRemoved,
  });
  console.log('[CHAT ROOM CLEAR SUCCESS]', { roomId });

  return {
    success: true,
    messagesRemoved,
    reactionsRemoved,
    favoritesRemoved,
    mentionsRemoved,
    readsRemoved,
    reportsRemoved,
    notificationsRemoved,
    mediaRemoved,
  };
}


