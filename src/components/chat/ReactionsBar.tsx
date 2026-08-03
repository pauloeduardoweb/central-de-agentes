import React, { useState } from 'react';
import { Smile, Star } from 'lucide-react';

export interface ReactionItem {
  emoji: string;
  count: number;
  userReacted: boolean;
  hasMentor?: boolean;
}

interface ReactionsBarProps {
  messageId: number;
  reactions?: ReactionItem[];
  isFavorite?: boolean;
  isHighlight?: boolean;
  onReact: (messageId: number, emoji: string) => void;
  onToggleFavorite?: (messageId: number) => void;
}

const AVAILABLE_EMOJIS = ['👍', '❤️', '😂', '😮', '👏', '🔥'];

export const ReactionsBar: React.FC<ReactionsBarProps> = ({
  messageId,
  reactions = [],
  isFavorite = false,
  isHighlight = false,
  onReact,
  onToggleFavorite,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs select-none">
      {/* Existing Reaction Badges */}
      {reactions.map((r) => (
        <button
          key={r.emoji}
          onClick={() => onReact(messageId, r.emoji)}
          className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all border ${
            r.userReacted
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
              : 'bg-[#182229] border-slate-700/60 text-slate-300 hover:bg-slate-800'
          }`}
          title={r.hasMentor ? 'O Mentor reage com este emoji' : `${r.count} reação(ões)`}
        >
          <span>{r.emoji}</span>
          <span className="text-[10px] font-bold">{r.count}</span>
          {r.hasMentor && (
            <span className="text-[9px] bg-amber-500/30 text-amber-300 font-extrabold px-1 rounded ml-0.5">
              Mentor
            </span>
          )}
        </button>
      ))}

      {/* Community Highlight Pill (if >= 5 reactions) */}
      {isHighlight && (
        <span className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm animate-pulse">
          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
          Destaque da Comunidade
        </span>
      )}

      {/* React Trigger Button */}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="p-1 rounded-full text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors opacity-80 hover:opacity-100"
          title="Adicionar reação"
        >
          <Smile className="w-3.5 h-3.5" />
        </button>

        {/* Favorite Toggle Button */}
        {onToggleFavorite && (
          <button
            onClick={() => onToggleFavorite(messageId)}
            className={`p-1 rounded-full transition-colors ml-0.5 ${
              isFavorite
                ? 'text-amber-400 hover:text-amber-300'
                : 'text-slate-500 hover:text-amber-400'
            }`}
            title={isFavorite ? 'Remover das Favoritas' : 'Favoritar Mensagem'}
          >
            <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400' : ''}`} />
          </button>
        )}

        {/* Emoji Quick Picker Popover */}
        {showPicker && (
          <div
            className="absolute bottom-6 left-0 z-40 bg-[#111b21] border border-slate-700/80 rounded-2xl p-1.5 shadow-xl flex items-center space-x-1 animate-scale-in"
            onMouseLeave={() => setShowPicker(false)}
          >
            {AVAILABLE_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(messageId, emoji);
                  setShowPicker(false);
                }}
                className="p-1.5 text-base hover:scale-125 transition-transform active:scale-95"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
