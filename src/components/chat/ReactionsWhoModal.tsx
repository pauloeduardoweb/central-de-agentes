import React from 'react';
import { X, Heart, ThumbsUp, Flame, Laugh, Sparkles } from 'lucide-react';
import { resolveChatMediaUrl } from '../../utils/chatMediaUrl';
import { getAvatarGradient, getNicknameInitials } from '../../utils/avatarUtils';

interface ReactionUser {
  profile_id: number;
  nickname: string;
  photo_url?: string | null;
  emoji: string;
  is_mentor?: boolean;
}

interface ReactionsWhoModalProps {
  isOpen: boolean;
  onClose: () => void;
  reactionsUsers?: ReactionUser[];
}

export const ReactionsWhoModal: React.FC<ReactionsWhoModalProps> = ({
  isOpen,
  onClose,
  reactionsUsers = [],
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0b141a] border border-emerald-500/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="bg-[#1f2c34] p-3.5 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">❤️</span>
            <h3 className="text-white font-bold text-sm">
              Reações ({reactionsUsers.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Users List */}
        <div className="p-3 overflow-y-auto space-y-2 text-slate-200 divide-y divide-slate-800/60 custom-scrollbar">
          {reactionsUsers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Nenhuma reação registrada.
            </div>
          ) : (
            reactionsUsers.map((u, i) => (
              <div key={i} className="pt-2 first:pt-0 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {u.photo_url ? (
                    <img
                      src={resolveChatMediaUrl(u.photo_url)}
                      alt={u.nickname}
                      className="w-8 h-8 rounded-full object-cover border border-emerald-500/40"
                    />
                  ) : (
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getAvatarGradient(u.nickname)} flex items-center justify-center font-bold text-xs text-white`}>
                      {getNicknameInitials(u.nickname)}
                    </div>
                  )}

                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      {u.nickname}
                      {u.is_mentor && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 py-0.2 rounded font-bold">
                          👑 Mentor
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <span className="text-lg bg-[#1f2c34] px-2 py-0.5 rounded-xl border border-slate-700">
                  {u.emoji}
                </span>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
