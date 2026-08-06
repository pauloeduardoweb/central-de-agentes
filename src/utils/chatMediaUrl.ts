/**
 * Utility to resolve chat image and avatar URLs reliably.
 */
export function resolveChatMediaUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // Rule for /gifs/ paths: resolve to the media server domain
  if (trimmed.startsWith('/gifs/')) {
    return `https://midia.geracaozpro.com${trimmed}`;
  }
  if (trimmed.startsWith('gifs/')) {
    return `https://midia.geracaozpro.com/${trimmed}`;
  }

  // Reject hazardous protocols
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('file:') ||
    trimmed.startsWith('data:text/html')
  ) {
    return '';
  }

  // Support base64 image data URLs directly for preview
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('data:audio/')) {
    return trimmed;
  }

  // Absolute HTTP/HTTPS URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // Force HTTPS for midia.geracaozpro.com or any insecure http URL to prevent Mixed Content blocking in browsers
    if (trimmed.startsWith('http://')) {
      return trimmed.replace(/^http:\/\//i, 'https://');
    }
    return trimmed;
  }

  // If trimmed doesn't start with /, uploads/, media/, or have a media extension, reject non-path strings (e.g. emojis)
  if (
    !trimmed.startsWith('/') &&
    !trimmed.startsWith('uploads/') &&
    !trimmed.startsWith('media/') &&
    !/\.(png|jpe?g|gif|webp|svg|ico|mp3|wav|ogg|m4a)$/i.test(trimmed)
  ) {
    return '';
  }

  // Clean relative path starting with slash
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  if (cleanPath.startsWith('/uploads/') || cleanPath.startsWith('/media/')) {
    return `https://midia.geracaozpro.com${cleanPath}`;
  }

  return cleanPath;
}

/**
 * Safely resolves image/media URLs strictly following order of precedence and validation rules:
 * 1. msg.media?.public_url || msg.media?.url
 * 2. msg.image_url || msg.imageUrl
 * 3. msg.content ONLY for legacy messages of type IMAGE, GIF, or STICKER if valid URL/path.
 * Blocks unsafe protocols (data:, blob:, file:, javascript:) and plain text.
 * Never allows TEXT message types to use content as image src.
 */
export function getSafeImageUrl(msg: {
  message_type?: string | null;
  messageType?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  media_url?: string | null;
  public_url?: string | null;
  attachment?: string | null;
  media?: { public_url?: string | null; url?: string | null } | null;
  content?: string | null;
}): string {
  if (!msg) return '';

  const mediaUrl =
    msg.media?.public_url ||
    msg.media?.url ||
    msg.media_url ||
    msg.public_url ||
    msg.attachment;

  if (mediaUrl && typeof mediaUrl === 'string' && mediaUrl.trim()) {
    const resolved = resolveChatMediaUrl(mediaUrl);
    if (resolved) return resolved;
  }

  const directImgUrl = msg.image_url || msg.imageUrl;
  if (directImgUrl && typeof directImgUrl === 'string' && directImgUrl.trim()) {
    const resolved = resolveChatMediaUrl(directImgUrl);
    if (resolved) return resolved;
  }

  const type = msg.message_type || msg.messageType || '';
  const isMediaMsg = type === 'IMAGE' || type === 'GIF' || type === 'STICKER';

  if (isMediaMsg && msg.content && typeof msg.content === 'string') {
    const trimmed = msg.content.trim();
    if (
      trimmed.startsWith('javascript:') ||
      trimmed.startsWith('file:') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('blob:') ||
      trimmed === '[Imagem]' ||
      trimmed.startsWith('🎙️') ||
      trimmed.startsWith('Sticker:') ||
      (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/') && !trimmed.startsWith('uploads/'))
    ) {
      return '';
    }
    return resolveChatMediaUrl(trimmed);
  }

  return '';
}

