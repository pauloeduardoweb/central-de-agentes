import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Users, Search, Award, Star, BarChart2, Bell, ShieldCheck, Sparkles, Plus, Menu, Eye, X, ArrowLeft } from 'lucide-react';
import { resolveChatMediaUrl } from '../../utils/chatMediaUrl';
import { getAvatarGradient, getNicknameInitials } from '../../utils/avatarUtils';
import { PollData, PollCard } from './PollCard';
import { NotificationBell } from './NotificationBell';
import { CHAT_LABELS } from '../../constants/chatLabels';

interface CommunityHeaderProps {
  onlineCount: number;
  totalParticipants?: number;
  unreadMentions?: number;
  unreadNotificationCount?: number;
  onOpenNotifications?: () => void;
  activeFilter: 'ALL' | 'NOTICES' | 'POLLS' | 'FAVORITES' | 'RANKING';
  searchQuery: string;
  onFilterChange: (filter: 'ALL' | 'NOTICES' | 'POLLS' | 'FAVORITES' | 'RANKING') => void;
  onSearchChange: (query: string) => void;
  onOpenOnlineDrawer: () => void;
  onOpenRules: () => void;
  onOpenGallery?: () => void;
  onOpenProfileSettings?: () => void;
  onToggleMobileDrawer?: () => void;
  isSecondaryView?: boolean;
  onReturnToGeneralChat?: () => void;
  currentProfile?: {
    id?: number;
    nickname?: string;
    photo_url?: string | null;
    level?: number;
    xp?: number;
    rank_position?: number;
    message_count?: number;
  } | null;
  poll?: PollData | null;
  isMentor?: boolean;
  onVote?: (pollId: number, optionIndex: number) => void;
  onCreatePoll?: (question: string, options: string[]) => void;
}

export const CommunityHeader: React.FC<CommunityHeaderProps> = ({
  onlineCount,
  totalParticipants = 0,
  unreadMentions = 0,
  unreadNotificationCount = 0,
  onOpenNotifications,
  activeFilter,
  searchQuery,
  onFilterChange,
  onSearchChange,
  onOpenOnlineDrawer,
  onOpenRules,
  onOpenGallery,
  onOpenProfileSettings,
  onToggleMobileDrawer,
  isSecondaryView = false,
  onReturnToGeneralChat,
  currentProfile,
  poll,
  isMentor = false,
  onVote,
  onCreatePoll,
}) => {
  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [showPollDetailModal, setShowPollDetailModal] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');
  const pollModalRef = useRef<HTMLDivElement | null>(null);

  // Lock body scroll when poll detail modal is open
  useEffect(() => {
    if (!showPollDetailModal) return;
    if (typeof document !== 'undefined') {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showPollDetailModal]);

  // Handle Escape key for poll detail modal
  useEffect(() => {
    if (!showPollDetailModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPollDetailModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPollDetailModal]);

  const handleCreatePollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreatePoll || !pollQuestion.trim() || !opt1.trim() || !opt2.trim()) return;
    const options = [opt1.trim(), opt2.trim()];
    if (opt3.trim()) options.push(opt3.trim());
    onCreatePoll(pollQuestion.trim(), options);
    setShowCreatePollModal(false);
    setPollQuestion('');
    setOpt1('');
    setOpt2('');
    setOpt3('');
  };

  return (
    <div className="bg-[#F0F2F5] border-b border-[#DADDE1] p-2 sm:p-3.5 space-y-2 sticky top-0 z-30 shadow-xs max-w-full overflow-hidden text-[#111B21]">
      {/* MOBILE / TABLET COMPACT SINGLE-LINE HEADER (< 1024px) */}
      <div className="flex lg:hidden items-center justify-between h-[44px] gap-2">
        {/* Left: Voltar ao Bate-papo Button or Community Brand */}
        <div className="flex items-center space-x-2 min-w-0">
          {/* Voltar ao Bate-papo Button - Only visible when in a secondary view */}
          {isSecondaryView && onReturnToGeneralChat ? (
            <button
              onClick={onReturnToGeneralChat}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-[#00A884] active:bg-[#008F72] text-white font-bold text-xs transition-all shadow-xs cursor-pointer shrink-0 animate-fade-in"
              title="Voltar ao Bate-papo Geral"
            >
              <ArrowLeft className="w-4 h-4 text-white shrink-0" />
              <span className="truncate">Voltar ao Bate-papo</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-[#00A884] flex items-center justify-center text-white font-bold text-xs shrink-0">
                💬
              </div>
              <span className="font-extrabold text-sm text-[#111B21] truncate">
                Comunidade Geração Z Pro
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Collapsible Search Input on Mobile when active */}
      {showMobileSearch && (
        <div className="lg:hidden animate-slide-down pb-1">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#667781] absolute left-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar mensagem no bate-papo..."
              autoFocus
              className="w-full bg-[#FFFFFF] border border-[#DADDE1] text-xs text-[#111B21] placeholder-[#667781] rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:border-[#00A884]"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 text-[#667781] hover:text-[#111B21] p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* DESKTOP HEADER (>= 1024px ONLY) */}
      <div className="hidden lg:flex items-center justify-between gap-3 w-full py-0.5">
        {/* Left: Community Icon, Title & Subtitle */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#00A884] flex items-center justify-center text-white font-bold shadow-xs shrink-0 text-base">
            💬
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-[#111B21] text-base tracking-tight truncate">
              Comunidade Geração Z Pro
            </h1>
            <p className="text-xs text-[#667781] truncate">
              Espaço oficial de suporte e networking
            </p>
          </div>
        </div>

        {/* Right: Message Search Field */}
        <div className="w-72 xl:w-80 relative shrink-0">
          <Search className="w-4 h-4 text-[#667781] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar mensagens no bate-papo..."
            className="w-full bg-[#FFFFFF] border border-[#DADDE1] text-xs text-[#111B21] placeholder-[#667781] rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:border-[#00A884] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-2 text-[#667781] hover:text-[#111B21] p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile/Tablet Compact Poll Bar (Hidden on Desktop) */}
      {poll && (
        <div className="lg:hidden w-full">
          <div className="bg-[#FFFFFF] border border-[#DADDE1] rounded-xl px-2.5 py-1.5 flex items-center justify-between text-xs text-[#111B21] min-h-[36px] gap-2 shadow-xs">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <BarChart2 className="w-3.5 h-3.5 text-[#00A884] shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-bold uppercase text-[#00A884] block leading-tight">
                  Enquete Ativa ({poll.totalVotes} votos)
                </span>
                <p className="font-semibold text-xs text-[#111B21] truncate leading-tight">{poll.question}</p>
              </div>
            </div>
            <button
              onClick={() => setShowPollDetailModal(true)}
              className="bg-[#00A884] hover:bg-[#008F72] text-white font-bold text-[10px] px-2 py-1 rounded-lg transition-colors cursor-pointer min-h-[28px] flex items-center gap-1 shrink-0"
            >
              <Eye className="w-3 h-3" /> Ver
            </button>
          </div>
        </div>
      )}



      {/* Search Bar Input Row (Desktop only - on mobile it toggles via header icon) */}
      <div className="hidden lg:block relative flex-1 w-full pt-0.5">
        <Search className="w-3.5 h-3.5 text-[#667781] absolute left-3 top-2.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar mensagem ou @nickname..."
          className="w-full bg-[#FFFFFF] border border-[#DADDE1] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#111B21] placeholder-[#667781] focus:outline-none focus:border-[#00A884] transition-colors"
        />
      </div>

      {/* Poll Detail Portal Modal */}
      {showPollDetailModal && typeof document !== 'undefined' && createPortal(
        <div
          ref={pollModalRef}
          onClick={(e) => {
            if (e.target === pollModalRef.current) setShowPollDetailModal(false);
          }}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in select-none"
        >
          <div className="relative w-full max-w-lg bg-[#182229] border border-teal-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-32px)] text-slate-100">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-sm sm:text-base text-white">Enquete da Comunidade</h3>
              </div>
              <button
                onClick={() => setShowPollDetailModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <PollCard
                poll={poll}
                isMentor={isMentor}
                onVote={(pollId, optIdx) => {
                  if (onVote) onVote(pollId, optIdx);
                }}
                onCreatePoll={onCreatePoll}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Mentor Create Poll Modal */}
      {showCreatePollModal && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#182229] border border-teal-500/40 rounded-2xl p-5 max-w-md w-full shadow-2xl text-slate-100">
            <h3 className="font-bold text-base text-white mb-3 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-teal-400" />
              Criar Enquete Oficial da Comunidade
            </h3>
            <form onSubmit={handleCreatePollSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Pergunta da Enquete</label>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Ex: Qual o seu maior desafio de vendas hoje?"
                  className="w-full bg-[#202c33] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Opção 1</label>
                <input
                  type="text"
                  value={opt1}
                  onChange={(e) => setOpt1(e.target.value)}
                  placeholder="Primeira opção"
                  className="w-full bg-[#202c33] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Opção 2</label>
                <input
                  type="text"
                  value={opt2}
                  onChange={(e) => setOpt2(e.target.value)}
                  placeholder="Segunda opção"
                  className="w-full bg-[#202c33] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Opção 3 (Opcional)</label>
                <input
                  type="text"
                  value={opt3}
                  onChange={(e) => setOpt3(e.target.value)}
                  placeholder="Terceira opção"
                  className="w-full bg-[#202c33] border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePollModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold cursor-pointer min-h-[44px]"
                >
                  Publicar Enquete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


