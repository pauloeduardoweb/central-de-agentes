import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Video, FileText, Sparkles, Download, ExternalLink } from 'lucide-react';
import { resolveChatMediaUrl } from '../../utils/chatMediaUrl';

export interface GalleryItem {
  id: number;
  url: string;
  type: 'IMAGE' | 'GIF' | 'VIDEO' | 'FILE';
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
  const [filter, setFilter] = useState<'ALL' | 'IMAGE' | 'GIF' | 'FILE'>('ALL');
  const [fetchedItems, setFetchedItems] = useState<GalleryItem[]>([]);

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

  // Extract gallery items from local messages
  const extractedFromMessages: GalleryItem[] = (messages || [])
    .filter((m) => !m.deleted_at && (m.image_url || m.imageUrl || m.media?.public_url || ['IMAGE', 'GIF', 'STICKER'].includes(m.message_type || m.messageType)))
    .map((m) => {
      const url = m.media?.public_url || m.image_url || m.imageUrl || '';
      const msgType = m.message_type || m.messageType || 'IMAGE';
      let type: 'IMAGE' | 'GIF' | 'VIDEO' | 'FILE' = 'IMAGE';
      if (msgType === 'GIF' || (url && url.toLowerCase().includes('.gif'))) {
        type = 'GIF';
      } else if (msgType === 'AUDIO') {
        type = 'FILE';
      }
      return {
        id: m.id || Date.now(),
        url,
        type,
        caption: m.caption || m.content || null,
        authorNickname: m.author?.nickname || m.author_nickname || 'Aluno',
        createdAt: m.created_at || new Date().toISOString(),
      };
    })
    .filter((item) => Boolean(item.url));

  // Merge items cleanly by URL
  const allMap = new Map<string, GalleryItem>();
  [...fetchedItems, ...extractedFromMessages, ...propsItems].forEach((item) => {
    if (item.url && !allMap.has(item.url)) {
      allMap.set(item.url, item);
    }
  });

  const combinedItems = Array.from(allMap.values());

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

  const filteredItems = combinedItems.filter((item) => {
    if (filter === 'ALL') return true;
    if (filter === 'IMAGE') return item.type === 'IMAGE';
    if (filter === 'GIF') return item.type === 'GIF';
    if (filter === 'FILE') return item.type === 'FILE' || item.type === 'VIDEO';
    return true;
  });

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
                Mídias, fotos, GIFs e arquivos compartilhados no chat
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
            Tudo ({combinedItems.length})
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
            Fotos
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
            GIFs
          </button>
          <button
            onClick={() => setFilter('FILE')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filter === 'FILE'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'bg-[#1f2c34] text-slate-300 hover:bg-[#2a3942]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Arquivos
          </button>
        </div>

        {/* Grid Display */}
        <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs gap-2 py-12">
              <ImageIcon className="w-12 h-12 text-slate-700" />
              <span>Nenhuma mídia encontrada nesta categoria.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-2xl overflow-hidden border border-slate-700/60 bg-[#1f2c34] aspect-square flex flex-col justify-between shadow-md hover:border-emerald-500 transition-all"
                >
                  <img
                    src={resolveChatMediaUrl(item.url)}
                    alt={item.caption || 'Mídia'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
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
