import React, { useState } from 'react';
import { Star, X, MessageSquare, Image as ImageIcon, Link as LinkIcon, FileText, Trash2 } from 'lucide-react';
import { getAvatarGradient, getNicknameInitials } from '../../utils/avatarUtils';
import { resolveChatMediaUrl } from '../../utils/chatMediaUrl';

export interface FavoriteMessageItem {
  id: number;
  content: string;
  message_type?: string;
  image_url?: string | null;
  created_at: string;
  author_nickname: string;
  author_photo: string | null;
}

interface FavoriteMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: FavoriteMessageItem[];
  onRemoveFavorite: (messageId: number) => void;
}

export const FavoriteMessagesModal: React.FC<FavoriteMessagesModalProps> = ({
  isOpen,
  onClose,
  favorites,
  onRemoveFavorite,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'TEXT' | 'PHOTOS' | 'LINKS' | 'FILES'>('ALL');

  if (!isOpen) return null;

  const filteredFavorites = favorites.filter((item) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'PHOTOS') return Boolean(item.image_url);
    if (activeTab === 'LINKS') return item.content && (item.content.includes('http://') || item.content.includes('https://'));
    if (activeTab === 'TEXT') return !item.image_url && !(item.content && (item.content.includes('http://') || item.content.includes('https://')));
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#111b21] border border-slate-800 rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-yellow-950/40 via-[#182229] to-[#111b21] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-300">
              <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Mensagens Favoritas</h2>
              <p className="text-xs text-slate-400">Mensagens e mídias salvas por você</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-2 bg-[#182229] border-b border-slate-800 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              activeTab === 'ALL' ? 'bg-yellow-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Todas ({favorites.length})
          </button>
          <button
            onClick={() => setActiveTab('TEXT')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'TEXT' ? 'bg-yellow-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Mensagens
          </button>
          <button
            onClick={() => setActiveTab('PHOTOS')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'PHOTOS' ? 'bg-yellow-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Fotos
          </button>
          <button
            onClick={() => setActiveTab('LINKS')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer ${
              activeTab === 'LINKS' ? 'bg-yellow-600 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            Links
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredFavorites.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Star className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p>Nenhuma mensagem salva nesta categoria.</p>
            </div>
          ) : (
            filteredFavorites.map((msg) => (
              <div
                key={msg.id}
                className="p-3.5 rounded-2xl bg-[#182229] border border-slate-800 hover:border-yellow-500/40 transition-all flex items-start justify-between gap-3 shadow-sm"
              >
                <div className="flex items-start space-x-3 min-w-0 flex-1">
                  {msg.author_photo ? (
                    <img
                      src={resolveChatMediaUrl(msg.author_photo)}
                      alt={msg.author_nickname}
                      className="w-8 h-8 rounded-full object-cover border border-emerald-500/30 shrink-0"
                    />
                  ) : (
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-gradient-to-tr ${getAvatarGradient(
                        msg.author_nickname
                      )} text-white shrink-0`}
                    >
                      {getNicknameInitials(msg.author_nickname)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400 text-xs">
                        {msg.author_nickname}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(msg.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    {msg.image_url && (
                      <img
                        src={resolveChatMediaUrl(msg.image_url)}
                        alt="Mídia salvação"
                        className="w-32 h-24 object-cover rounded-xl border border-slate-700 my-2"
                      />
                    )}

                    <p className="text-xs text-slate-200 mt-1 whitespace-pre-wrap break-words leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveFavorite(msg.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                  title="Remover dos favoritos"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
