import React from 'react';
import { createPortal } from 'react-dom';
import { Award, Crown, MessageSquare, Heart, Sparkles, X, Flame } from 'lucide-react';
import { getAvatarGradient, getNicknameInitials } from '../../utils/avatarUtils';

export interface RankingMember {
  rank: number;
  id: number;
  nickname: string;
  photo_url: string | null;
  is_mentor: boolean;
  message_count: number;
  reactions_received: number;
  xp: number;
}

interface CommunityRankingProps {
  isOpen: boolean;
  onClose: () => void;
  ranking: RankingMember[];
  onViewProfile: (profileId: number) => void;
  isLoading?: boolean;
}

export const CommunityRanking: React.FC<CommunityRankingProps> = ({
  isOpen,
  onClose,
  ranking,
  onViewProfile,
  isLoading = false,
}) => {
  // Lock body scroll when open
  React.useEffect(() => {
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
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-xl">🥇</span>;
    if (rank === 2) return <span className="text-xl">🥈</span>;
    if (rank === 3) return <span className="text-xl">🥉</span>;
    return (
      <span className="w-6 h-6 rounded-full bg-[#182229] text-[#AEBAC1] border border-[#263A43] text-xs font-bold flex items-center justify-center">
        {rank}
      </span>
    );
  };

  const content = (
    <div 
      className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-[#0B141A] border border-[#263A43] rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 bg-[#111B21] border-b border-[#263A43] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#182F2A] border border-[#00A884]/40 flex items-center justify-center text-[#00A884]">
              <Award className="w-6 h-6 text-[#00A884]" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base sm:text-lg flex items-center gap-1.5">
                Alunos Mais Participativos <Sparkles className="w-4 h-4 text-amber-400" />
              </h2>
              <p className="text-xs text-[#AEBAC1]">Comunidade Geração Z Pro • Ranking XP</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-[#182229] hover:bg-[#202C33] text-[#AEBAC1] hover:text-white transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ranking List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 dark-panel-scrollbar">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-3.5 rounded-2xl bg-[#111B21] border border-[#263A43] animate-pulse flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-[#182229]" />
                    <div className="w-10 h-10 rounded-full bg-[#182229]" />
                    <div className="space-y-2">
                      <div className="w-28 h-3.5 rounded bg-[#182229]" />
                      <div className="w-20 h-2.5 rounded bg-[#182229]" />
                    </div>
                  </div>
                  <div className="w-16 h-6 rounded-xl bg-[#182229]" />
                </div>
              ))}
            </div>
          ) : ranking.length === 0 ? (
            <div className="text-center py-10 text-[#AEBAC1] text-xs">
              <Award className="w-8 h-8 mx-auto mb-2 text-[#AEBAC1]" />
              <p>O ranking está sendo calculated. Envie mensagens no chat para subir de posição!</p>
            </div>
          ) : (
            ranking.map((member) => (
              <div
                key={member.id}
                onClick={() => {
                  onViewProfile(member.id);
                  onClose();
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                  member.rank === 1
                    ? 'bg-[#241F13] border-[#8A6500] shadow-xs'
                    : member.rank === 2
                    ? 'bg-[#111B21] border-[#263A43]'
                    : member.rank === 3
                    ? 'bg-[#111B21] border-[#263A43]'
                    : 'bg-[#111B21] border-[#263A43] hover:bg-[#182229]'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {/* Rank Badge */}
                  <div className="shrink-0">{getRankBadge(member.rank)}</div>

                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {member.photo_url ? (
                      <img
                        src={member.photo_url}
                        alt={member.nickname}
                        className="w-10 h-10 rounded-full object-cover border border-[#00A884]"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs bg-[#182229] text-[#00A884] border border-[#263A43]`}
                      >
                        {getNicknameInitials(member.nickname)}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-white text-xs sm:text-sm truncate group-hover:text-[#00A884] transition-colors">
                        {member.nickname}
                      </span>
                      {member.is_mentor && (
                        <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center space-x-3 text-[11px] text-[#AEBAC1] mt-0.5">
                      <span className="flex items-center space-x-1 text-[#00A884]">
                        <MessageSquare className="w-3 h-3" />
                        <span>{member.message_count} msgs</span>
                      </span>

                      <span className="flex items-center space-x-1 text-rose-400">
                        <Heart className="w-3 h-3" />
                        <span>{member.reactions_received} reações</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* XP Score Badge */}
                <div className="text-right shrink-0">
                  <span className="bg-[#182F2A] text-[#00A884] border border-[#00A884]/40 text-xs font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    {member.xp} XP
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#111B21] border-t border-[#263A43] text-center text-[10px] text-[#AEBAC1]">
          +1 XP por mensagem enviada • +2 XP por reações recebidas • Atualizado em tempo real
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
};
