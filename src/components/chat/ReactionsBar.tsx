import React from 'react';
import { Star } from 'lucide-react';

export interface ReactionItem {
  emoji: string;
  count: number;
  userReacted: boolean;
  hasMentor?: boolean;
}

interface ReactionsBarProps {
  messageId: number;
  reactions?: ReactionItem[];
  isHighlight?: boolean;
  onReact: (messageId: number, emoji: string) => void;
}

export const ReactionsBar: React.FC<ReactionsBarProps> = ({
  messageId,
  reactions = [],
  isHighlight = false,
  onReact,
}) => {
  const activeReactions = reactions.filter((r) => r.count > 0);
  if (activeReactions.length === 0 && !isHighlight) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1 text-xs select-none">
      {/* Existing Reaction Badges */}
      {activeReactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => onReact(messageId, r.emoji)}
          className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-all border cursor-pointer ${
            r.userReacted
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-800 font-bold shadow-xs'
              : 'bg-[#182229]/10 border-slate-300 text-slate-700 hover:bg-slate-200'
          }`}
          title={r.hasMentor ? 'O Mentor reage com este emoji' : `${r.count} reação(ões)`}
        >
          <span>{r.emoji}</span>
          <span className="text-[10px] font-bold">{r.count}</span>
        </button>
      ))}

      {/* Community Highlight Pill */}
      {isHighlight && (
        <span className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs animate-pulse">
          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
          Destaque
        </span>
      )}
    </div>
  );
};
