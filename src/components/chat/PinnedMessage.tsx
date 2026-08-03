import React, { useState } from 'react';
import { Pin, X, ChevronRight } from 'lucide-react';

export interface PinnedItem {
  id: number;
  content: string;
  author_nickname?: string;
  category?: string;
}

interface PinnedMessageProps {
  pinnedMessages?: PinnedItem[] | PinnedItem | null;
  isMentor?: boolean;
  onUnpin?: (id: number) => void;
  onClickMessage?: (id: number) => void;
}

export const PinnedMessage: React.FC<PinnedMessageProps> = ({
  pinnedMessages,
  isMentor,
  onUnpin,
  onClickMessage,
}) => {
  if (!pinnedMessages) return null;

  const list: PinnedItem[] = Array.isArray(pinnedMessages)
    ? pinnedMessages
    : [pinnedMessages];

  if (list.length === 0) return null;

  return (
    <div className="bg-[#111b21] border-b border-amber-500/30 px-3 py-1.5 backdrop-blur-md shadow-md">
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar text-xs">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold shrink-0 border border-amber-500/30">
          <Pin className="w-3.5 h-3.5 fill-amber-400" />
          <span>Fixadas ({list.length})</span>
        </div>

        {list.map((item, idx) => (
          <div
            key={item.id || idx}
            onClick={() => onClickMessage && onClickMessage(item.id)}
            className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#1f2c34] hover:bg-[#2a3942] border border-amber-500/20 hover:border-amber-500/50 text-slate-200 shrink-0 cursor-pointer transition-all max-w-xs group"
          >
            <span className="font-bold text-amber-400 text-[11px] shrink-0">
              📌 {item.category || `Aviso ${idx + 1}`}:
            </span>
            <span className="truncate text-slate-300 text-xs">
              {item.content}
            </span>

            {isMentor && onUnpin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnpin(item.id);
                }}
                className="p-0.5 rounded hover:bg-slate-700/80 text-slate-400 hover:text-rose-400 transition-colors shrink-0 ml-1 cursor-pointer"
                title="Desafixar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
