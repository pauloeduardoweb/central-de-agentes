import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { db, isDatabaseConfigured } from './database.js';

export interface UploadMediaParams {
  profileId: number;
  base64: string;
  mime?: string;
  mediaType?: 'IMAGE' | 'AUDIO' | 'AVATAR' | 'STICKER' | 'GIF';
  duration?: number;
  width?: number;
  height?: number;
}

export interface MediaUploadResult {
  success: boolean;
  media?: {
    id: number;
    type: 'IMAGE' | 'AUDIO' | 'AVATAR' | 'STICKER' | 'GIF';
    url: string;
    mime: string;
    size: number;
    width: number | null;
    height: number | null;
    duration: number | null;
  };
  error?: string;
}

export async function processAndUploadMedia(params: UploadMediaParams): Promise<MediaUploadResult> {
  const publicBaseUrl = (process.env.CHAT_MEDIA_PUBLIC_BASE_URL || process.env.PUBLIC_URL || 'https://app.geracaozpro.com').replace(/\/$/, '');
  const HOSTINGER_UPLOAD_API = process.env.HOSTINGER_MEDIA_API_URL || 'https://midia.geracaozpro.com/api/upload.php';
  const HOSTINGER_UPLOAD_SECRET = process.env.HOSTINGER_MEDIA_UPLOAD_SECRET || 'GZPRO_MEDIA_SECRET_2026';

  let pendingMediaId: number | null = null;
  try {
    const { profileId, base64, mime, mediaType = 'IMAGE', duration = null, width = null, height = null } = params;

    if (!base64) {
      return { success: false, error: 'Nenhum dado de mídia foi enviado.' };
    }

    const cleanBase64 = String(base64).replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const isAudio = mediaType === 'AUDIO' || (mime && mime.startsWith('audio'));
    const isAvatar = mediaType === 'AVATAR';
    const finalType: 'IMAGE' | 'AUDIO' | 'AVATAR' | 'STICKER' | 'GIF' = isAudio ? 'AUDIO' : isAvatar ? 'AVATAR' : (mediaType === 'STICKER' ? 'STICKER' : (mediaType === 'GIF' || (mime && mime.includes('gif')) ? 'GIF' : 'IMAGE'));

    // Strict Size Limits: Avatar: 3MB, Image: 8MB, Audio: 15MB
    const maxSizeBytes = isAvatar ? 3 * 1024 * 1024 : isAudio ? 15 * 1024 * 1024 : 8 * 1024 * 1024;
    if (buffer.length > maxSizeBytes) {
      const maxMb = maxSizeBytes / (1024 * 1024);
      return { success: false, error: `FILE_TOO_LARGE: Tamanho excede o limite permitido de ${maxMb}MB.` };
    }

    const ext = isAudio ? 'webm' : 'webp';
    const mimeType = mime || (isAudio ? 'audio/webm' : 'image/webp');

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const subFolder = isAudio ? 'audio' : isAvatar ? 'profiles' : 'messages';
    const fileName = `${subFolder}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const storageKey = `uploads/chat/${subFolder}/${year}/${month}/${fileName}`;

    // Validate storageKey against path traversal and restricted folders
    if (storageKey.includes('..') || storageKey.includes('\\') || !storageKey.startsWith('uploads/chat/')) {
      return { success: false, error: 'INVALID_STORAGE_KEY: Caminho de armazenamento inválido.' };
    }

    let absolutePublicUrl = '';
    let storageProvider = 'HOSTINGER_MEDIA';

    // Record PENDING record in MySQL first
    if (isDatabaseConfigured()) {
      const [insPending]: any = await db.query(
        `INSERT INTO chat_media (profile_id, media_type, storage_provider, storage_key, public_url, mime_type, file_size, width, height, duration_seconds, upload_status)
         VALUES (?, ?, 'HOSTINGER_MEDIA', ?, '', ?, ?, ?, ?, ?, 'PENDING')`,
        [profileId, finalType, storageKey, mimeType, buffer.length, width, height, duration]
      ).catch(() => [{ insertId: null }]);

      if (insPending && insPending.insertId) {
        pendingMediaId = insPending.insertId;
      }
    }

    // Attempt Hostinger Upload API
    if (HOSTINGER_UPLOAD_API && HOSTINGER_UPLOAD_SECRET) {
      try {
        const formData = new FormData();
        const blob = new Blob([buffer], { type: mimeType });
        formData.append('file', blob, fileName);
        formData.append('storage_key', storageKey);

        const response = await fetch(HOSTINGER_UPLOAD_API, {
          method: 'POST',
          headers: {
            'x-media-upload-secret': HOSTINGER_UPLOAD_SECRET,
          },
          body: formData,
        });

        const resData: any = await response.json();
        if (response.ok && resData?.success && resData?.url) {
          absolutePublicUrl = resData.url;
        }
      } catch (err) {
        console.warn('[Hostinger Media Upload API Warning]:', err);
      }
    }

    // Absolute fallback URL construction when remote API is unreachable or in dev preview
    if (!absolutePublicUrl) {
      const relativeDir = path.join('uploads', 'chat', subFolder, String(year), month);
      const absoluteDir = path.join(process.cwd(), 'public', relativeDir);
      fs.mkdirSync(absoluteDir, { recursive: true });

      const fullPath = path.join(absoluteDir, fileName);
      fs.writeFileSync(fullPath, buffer);

      absolutePublicUrl = `${publicBaseUrl}/uploads/chat/${subFolder}/${year}/${month}/${fileName}`;
      storageProvider = 'HOSTINGER_MEDIA';
    }

    // Ensure absolute HTTPS URL starting with https://
    if (!absolutePublicUrl.startsWith('http://') && !absolutePublicUrl.startsWith('https://')) {
      absolutePublicUrl = `${publicBaseUrl}${absolutePublicUrl.startsWith('/') ? '' : '/'}${absolutePublicUrl}`;
    }

    // Update MySQL record status to READY
    let mediaId = pendingMediaId || Date.now();
    if (isDatabaseConfigured()) {
      if (pendingMediaId) {
        await db.query(
          `UPDATE chat_media SET public_url = ?, upload_status = 'READY' WHERE id = ?`,
          [absolutePublicUrl, pendingMediaId]
        ).catch(() => {});
      } else {
        const [insReady]: any = await db.query(
          `INSERT INTO chat_media (profile_id, media_type, storage_provider, storage_key, public_url, mime_type, file_size, width, height, duration_seconds, upload_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'READY')`,
          [profileId, finalType, storageProvider, storageKey, absolutePublicUrl, mimeType, buffer.length, width, height, duration]
        ).catch(() => [{ insertId: Date.now() }]);

        if (insReady && insReady.insertId) {
          mediaId = insReady.insertId;
        }
      }
    }

    console.log(`[CHAT MEDIA UPLOAD RESULT] mediaId=${mediaId}, type=${finalType}, uploadStatus=READY, hasMediaUrl=${Boolean(absolutePublicUrl)}`);

    return {
      success: true,
      media: {
        id: mediaId,
        type: finalType,
        url: absolutePublicUrl,
        mime: mimeType,
        size: buffer.length,
        width,
        height,
        duration,
      },
    };
  } catch (err: any) {
    console.error('[processAndUploadMedia Error]:', err?.message || err);
    console.log(`[CHAT MEDIA UPLOAD RESULT] mediaId=${pendingMediaId || 0}, type=${params.mediaType || 'UNKNOWN'}, uploadStatus=FAILED`);

    // Mark PENDING as FAILED if error occurred
    if (pendingMediaId && isDatabaseConfigured()) {
      await db.query(`UPDATE chat_media SET upload_status = 'FAILED' WHERE id = ?`, [pendingMediaId]).catch(() => {});
    }

    return {
      success: false,
      error: err?.message || 'Falha ao processar e salvar mídia.',
    };
  }
}
