import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Sparkles, ExternalLink } from 'lucide-react';
import { resolveChatMediaUrl } from '../../utils/chatMediaUrl';

export interface GalleryItem {
  id: number;
  url: string;
  type: 'IMAGE' | 'GIF';
  caption?: string | null;
  authorNickname: string;
  createdAt: string;
}

interface CommunityGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items?: GalleryItem[];
  messages?: any[];
}

export const CommunityGalleryModal: React.FC<CommunityGalleryModalProps> = ({
  isOpen,
  onClose,
  items: propsItems = [],
  messages = [],
}) => {
  const [filter, setFilter] = useState<'ALL' | 'IMAGE' | 'GIF'>('ALL');
  const [fetchedItems, setFetchedItems] = useState<GalleryItem[]>([]);
  const [brokenUrls, setBrokenUrls] = useState<Set<string>>(new Set());

  // Auto fetch gallery media on open
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    fetch('/api/chat/media')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.items)) {
          setFetchedItems(data.items);
        }
      })
      .catch((err) => console.error('Error fetching gallery media:', err));

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Helper to validate visual URL
  const isValidVisualUrl = (url?: string | null): boolean => {
    if (!url || typeof url !== 'string') return false;
    const clean = url.trim();
    if (!clean) return false;
    // Must start with http, https, data:, or public relative path /
    if (!/^(https?:\/\/|\/|data:image\/)/i.test(clean)) return false;
    // Exclude audio extensions
    if (/\.(mp3|wav|ogg|m4a|aac|webm)(\?.*)?$/i.test(clean)) return false;
    return true;
  };

  // Helper to classify item as IMAGE or GIF
  const classifyMedia = (msg: any): { type: 'IMAGE' | 'GIF'; url: string } | null => {
    if (msg.deleted_at || msg.deletedAt) return null;
    const rawUrl = msg.media?.public_url || msg.image_url || msg.imageUrl || msg.url || '';
    if (!isValidVisualUrl(rawUrl)) return null;

    const msgType = String(msg.message_type || msg.messageType || msg.type || '').toUpperCase();
    if (msgType === 'AUDIO' || msgType === 'TEXT' || msgType === 'POLL' || msgType === 'NOTICE' || msgType === 'SYSTEM') {
      return null;
    }

    const lowerUrl = rawUrl.toLowerCase();
    if (msgType === 'GIF' || lowerUrl.includes('.gif') || lowerUrl.includes('giphy') || lowerUrl.includes('tenor')) {
      return { type: 'GIF', url: rawUrl };
    }

    if (msgType === 'IMAGE' || /\.(jpg|jpeg|png|webp|svg|bmp)(\?.*)?$/i.test(lowerUrl) || msgType === 'STICKER') {
      return { type: 'IMAGE', url: rawUrl };
    }

    // Default if valid visual URL and not audio
    return { type: 'IMAGE', url: rawUrl };
  };

  // Extract gallery items from local messages
  const extractedFromMessages: GalleryItem[] = [];
  (messages || []).forEach((m) => {
    const classified = classifyMedia(m);
    if (classified) {
      extractedFromMessages.push({
        id: m.id || Date.now(),
        url: classified.url,
        type: classified.type,
        caption: m.caption || m.content || null,
        authorNickname: m.author?.nickname || m.author_nickname || 'Aluno',
        createdAt: m.created_at || new Date().toISOString(),
      });
    }
  });

  // Merge items cleanly by URL, excluding broken URLs
  const allMap = new Map<string, GalleryItem>();
  [...fetchedItems, ...extractedFromMessages, ...propsItems].forEach((item) => {
    if (!item.url || brokenUrls.has(item.url)) return;
    const classified = classifyMedia(item);
    if (!classified) return;
    if (!allMap.has(item.url)) {
      allMap.set(item.url, {
        id: item.id || Date.now(),
        url: classified.url,
        type: classified.type,
        caption: item.caption || null,
        authorNickname: item.authorNickname || 'Aluno',
        createdAt: item.createdAt || new Date().toISOString(),
      });
    }
  });

  const validCombinedItems = Array.from(allMap.values()).filter((item) => !brokenUrls.has(item.url));

  const totalPhotos = validCombinedItems.filter((i) => i.type === 'IMAGE').length;
  const totalGifs = validCombinedItems.filter((i) => i.type === 'GIF').length;

  const filteredItems = validCombinedItems.filter((item) => {
    if (filter === 'ALL') return true;
    if (filter === 'IMAGE') return item.type === 'IMAGE';
    if (filter === 'GIF') return item.type === 'GIF';
    return true;
  });

  const handleImageError = (url: string) => {
    setBrokenUrls((prev) => {
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  };

  // Lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;
    if (typeof document !== 'undefined') {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0b141a] border border-emerald-500/30 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="bg-[#1f2c34] p-4 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
              🖼️
            </div>
            <div>
              <h3 className="text-white font-bold text-base">
                Galeria da Comunidade
              </h3>
              <p className="text-xs text-slate-400">
                Fotos e GIFs compartilhados no bate-papo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="p-3 bg-[#111b21] border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filter === 'ALL'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-[#1f2c34] text-slate-300 hover:bg-[#2a3942]'
            }`}
          >
            Tudo ({validCombinedItems.length})
          </button>
          <button
            onClick={() => setFilter('IMAGE')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filter === 'IMAGE'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-[#1f2c34] text-slate-300 hover:bg-[#2a3942]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Fotos ({totalPhotos})
          </button>
          <button
            onClick={() => setFilter('GIF')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filter === 'GIF'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-[#1f2c34] text-slate-300 hover:bg-[#2a3942]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            GIFs ({totalGifs})
          </button>
        </div>

        {/* Grid Display */}
        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-2 py-12">
              <ImageIcon className="w-12 h-12 text-slate-600" />
              <span>Nenhuma mídia encontrada nesta categoria.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredItems.map((item) => (
                <div
                  key={`${item.id}-${item.url}`}
                  className="group relative rounded-2xl overflow-hidden border border-slate-700/60 bg-[#1f2c34] aspect-square flex flex-col justify-between shadow-md hover:border-emerald-500 transition-all"
                >
                  <img
                    src={(() => {
                      const resolved = resolveChatMediaUrl(item.url);
                      console.log('[GIF GALERIA SRC]', { originalUrl: item.url, resolvedUrl: resolved });
                      fetch(resolved)
                        .then(async (response) => {
                          console.log('[GIF FETCH GALERIA]', {
                            url: resolved,
                            status: response.status,
                            contentType: response.headers.get('content-type'),
                            contentLength: response.headers.get('content-length'),
                            redirected: response.redirected,
                            finalUrl: response.url
                          });
                        })
                        .catch((error) => console.error('[GIF FETCH GALERIA ERROR]', error));
                      return resolved;
                    })()}
                    alt={item.caption || 'Mídia'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                    onLoad={(event) => {
                      console.log('[GIF GALERIA LOAD]', {
                        url: item.url,
                        src: event.currentTarget.src,
                        currentSrc: event.currentTarget.currentSrc,
                        naturalWidth: event.currentTarget.naturalWidth,
                        naturalHeight: event.currentTarget.naturalHeight,
                        complete: event.currentTarget.complete,
                      });
                    }}
                    onError={(event) => {
                      console.error('[GIF GALERIA ERROR]', {
                        url: item.url,
                        src: event.currentTarget.src,
                        currentSrc: event.currentTarget.currentSrc,
                        naturalWidth: event.currentTarget.naturalWidth,
                        naturalHeight: event.currentTarget.naturalHeight,
                        complete: event.currentTarget.complete,
                      });
                      handleImageError(item.url);
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-between text-white">
                    <span className="text-[10px] font-bold text-emerald-300 truncate">
                      {item.authorNickname}
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-300 truncate max-w-[120px]">
                        {item.caption || 'Mídia do Chat'}
                      </span>
                      <a
                        href={resolveChatMediaUrl(item.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                        title="Abrir imagem"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
