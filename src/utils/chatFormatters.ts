export function formatLastMessagePreview(
  content: string | null | undefined,
  type: string | null | undefined,
  isDeleted?: boolean | number
): string {
  if (isDeleted) return 'Mensagem removida';
  if (!type && !content) return 'Nenhuma mensagem ainda';

  const upperType = String(type || '').toUpperCase();

  if (upperType === 'IMAGE') return '📷 Foto';
  if (upperType === 'AUDIO') return '🎤 Áudio';
  if (upperType === 'GIF') return 'GIF';
  if (upperType === 'STICKER') return 'Sticker';
  if (upperType === 'FILE') return 'Arquivo';

  if (!content || !content.trim()) return 'Nenhuma mensagem ainda';

  // Check if content string itself indicates type
  if (content === '[Imagem]' || content === '[Foto]') return '📷 Foto';
  if (content === '[Áudio]' || content === '[Audio]') return '🎤 Áudio';
  if (content === '[GIF]') return 'GIF';
  if (content === '[Sticker]') return 'Sticker';

  // Check if content is JSON or URL
  if (content.startsWith('{') && content.endsWith('}')) {
    try {
      const parsed = JSON.parse(content);
      if (parsed.text) return parsed.text;
      if (parsed.url) {
        if (parsed.type === 'audio') return '🎤 Áudio';
        if (parsed.type === 'image') return '📷 Foto';
        return 'Arquivo';
      }
    } catch {}
  }

  if (content.startsWith('http://') || content.startsWith('https://') || content.startsWith('/uploads/')) {
    if (content.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return '📷 Foto';
    if (content.match(/\.(mp3|wav|ogg|webm|m4a)$/i)) return '🎤 Áudio';
    return 'Arquivo';
  }

  return content;
}

export function formatLastMessageTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (targetDay.getTime() === today.getTime()) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  if (targetDay.getTime() === yesterday.getTime()) {
    return 'Ontem';
  }

  const diffMs = today.getTime() - targetDay.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays >= 1 && diffDays < 7) {
    const daysShort = ['Dom.', 'Seg.', 'Ter.', 'Qua.', 'Qui.', 'Sex.', 'Sáb.'];
    return daysShort[date.getDay()];
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}
