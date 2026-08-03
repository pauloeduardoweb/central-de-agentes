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
  const publicBaseUrl = (process.env.CHAT_MEDIA_PUBLIC_BASE_URL || 'https://midia.geracaozpro.com').replace(/\/$/, '');
  const HOSTINGER_UPLOAD_API = process.env.HOSTINGER_MEDIA_API_URL || 'https://midia.geracaozpro.com/api/upload.php';
  const HOSTINGER_UPLOAD_SECRET = process.env.HOSTINGER_MEDIA_UPLOAD_SECRET;

  if (!HOSTINGER_UPLOAD_SECRET) {
    console.error('[STORAGE_CONFIG_ERROR] HOSTINGER_MEDIA_UPLOAD_SECRET não está configurada no ambiente.');
    return {
      success: false,
      error: 'STORAGE_CONFIG_ERROR: Servidor de armazenamento remoto de mídia não está configurado (segredo de upload ausente).',
    };
  }

  let pendingMediaId: number | null = null;
  try {
    const { profileId, base64, mime, mediaType = 'IMAGE', duration = null, width = null, height = null } = params;

    if (!base64) {
      return { success: false, error: 'Nenhum dado de mídia foi enviado.' };
    }

    const cleanBase64 = String(base64).replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    console.log('[AUDIO BACKEND BUFFER]', {
      receivedBase64Length: String(base64).length,
      cleanBase64Length: cleanBase64.length,
      bufferLength: buffer.length,
      mime,
      mediaType,
    });

    const isAudio = mediaType === 'AUDIO' || (mime && mime.startsWith('audio'));

    if (isAudio && buffer.length < 100) {
      return {
        success: false,
        error: 'AUDIO_EMPTY: O áudio capturado está vazio ou corrompido.',
      };
    }

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
    const storageProvider = 'HOSTINGER_MEDIA';

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

    // Hostinger Upload API execution
    try {
      const formData = new FormData();
      const blob = new Blob([buffer], { type: mimeType });
      formData.append('file', blob, fileName);
      formData.append('storage_key', storageKey);

      console.log('[AUDIO HOSTINGER SEND]', {
        fileName,
        storageKey,
        mimeType,
        bufferLength: buffer.length,
        blobSize: blob.size,
      });

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
      } else {
        console.error('[Hostinger Media Upload API Error]:', response.status, resData);
        if (pendingMediaId && isDatabaseConfigured()) {
          await db.query(`UPDATE chat_media SET upload_status = 'FAILED' WHERE id = ?`, [pendingMediaId]).catch(() => {});
        }
        return {
          success: false,
          error: `HOSTINGER_UPLOAD_FAILED: ${resData?.message || resData?.error || 'Falha no servidor Hostinger.'}`,
        };
      }
    } catch (err: any) {
      console.error('[Hostinger Media Upload Connection Error]:', err);
      if (pendingMediaId && isDatabaseConfigured()) {
        await db.query(`UPDATE chat_media SET upload_status = 'FAILED' WHERE id = ?`, [pendingMediaId]).catch(() => {});
      }
      return {
        success: false,
        error: `HOSTINGER_CONNECTION_ERROR: ${err?.message || 'Erro ao conectar com servidor de mídias.'}`,
      };
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

    console.log(`[CHAT MEDIA UPLOAD RESULT] mediaId=${mediaId}, type=${finalType}, uploadStatus=READY, url=${absolutePublicUrl}`);

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

    if (pendingMediaId && isDatabaseConfigured()) {
      await db.query(`UPDATE chat_media SET upload_status = 'FAILED' WHERE id = ?`, [pendingMediaId]).catch(() => {});
    }

    return {
      success: false,
      error: err?.message || 'Falha ao processar e salvar mídia.',
    };
  }
}
