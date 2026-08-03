import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Users, Search, Award, Star, BarChart2, Bell, ShieldCheck, Sparkles, Plus, Menu, Eye, X } from 'lucide-react';
import { resolveChatMediaUrl } from '../../utils/chatMediaUrl';
import { getAvatarGradient, getNicknameInitials } from '../../utils/avatarUtils';
import { PollData, PollCard } from './PollCard';
import { NotificationBell } from './NotificationBell';

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
      <div className="flex lg:hidden items-center justify-between h-[52px] gap-2">
        {/* Left: Hamburger Menu Only */}
        <div className="flex items-center space-x-2 min-w-0">
          {onToggleMobileDrawer && (
            <button
              onClick={onToggleMobileDrawer}
              aria-label="Abrir Menu de Navegação"
              className="p-2 rounded-xl bg-[#FFFFFF] active:bg-[#E9EDEF] text-[#111B21] border border-[#DADDE1] transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
              title="Central Mobile"
            >
              <Menu className="w-5 h-5 text-[#00A884]" />
            </button>
          )}
        </div>

        {/* Right: Compact Online Badge, Notifications & Search Toggle */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Compact Online Counter Badge */}
          <button
            onClick={onOpenOnlineDrawer}
            className="flex items-center space-x-1 bg-[#FFFFFF] active:bg-[#E9EDEF] border border-[#DADDE1] rounded-xl px-2 py-1 text-xs text-[#00A884] font-bold transition-all cursor-pointer min-h-[36px]"
            title="Membros Online"
            aria-label={`${onlineCount} membros online`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00A884] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00A884]"></span>
            </span>
            <span className="text-xs">{onlineCount}</span>
          </button>

          {/* Notifications Button */}
          {onOpenNotifications && (
            <button
              onClick={onOpenNotifications}
              className="p-2 rounded-xl bg-[#FFFFFF] active:bg-[#E9EDEF] text-[#54656F] border border-[#DADDE1] transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center relative shrink-0"
              title="Notificações"
              aria-label="Notificações"
            >
              <Bell className="w-4 h-4 text-[#54656F]" />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full border border-[#FFFFFF] animate-pulse">
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </span>
              )}
            </button>
          )}

          {/* Search Toggle Button */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            aria-label="Buscar no Bate-papo"
            className={`p-2 rounded-xl transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center border ${
              showMobileSearch || searchQuery
                ? 'bg-[#00A884] text-white border-[#00A884]'
                : 'bg-[#FFFFFF] text-[#54656F] border-[#DADDE1]'
            }`}
            title="Buscar"
          >
            <Search className="w-4 h-4" />
          </button>
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
      <div className="hidden lg:grid grid-cols-[minmax(200px,1fr)_auto] items-center gap-3 w-full">
        {/* ÁREA ESQUERDA: Title + Enquete */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 overflow-hidden">
          {/* Left: Community Title */}
          <div className="flex items-center space-x-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#00A884] flex items-center justify-center text-white font-bold shadow-xs shrink-0">
              💬
            </div>

            <div className="min-w-0 max-w-[160px] xl:max-w-none">
              <div className="flex items-center space-x-1.5">
                <h1 className="font-bold text-[#111B21] text-sm xl:text-base tracking-tight truncate">
                  Comunidade Geração Z Pro
                </h1>
                <span className="bg-[#E7F8F3] text-[#00A884] text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-[#A7F3D0] flex items-center gap-1 shrink-0 hidden xl:flex">
                  <Sparkles className="w-2.5 h-2.5" /> Exclusivo
                </span>
              </div>
              <p className="text-[11px] text-[#667781] truncate hidden xl:block">
                Espaço oficial de suporte e networking
              </p>
            </div>
          </div>

          {/* Desktop Compact Poll Widget */}
          <div className="flex items-center gap-2 bg-[#FFFFFF] border border-[#DADDE1] rounded-xl px-2.5 py-1 text-xs text-[#111B21] min-w-0 max-w-[300px] xl:max-w-[360px] flex-1 overflow-hidden shadow-xs h-[38px]">
            <div className="p-1 rounded-md bg-[#E7F8F3] text-[#00A884] shrink-0">
              <BarChart2 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              {poll ? (
                <div className="truncate whitespace-nowrap text-ellipsis text-xs">
                  <span className="text-[10px] font-bold uppercase text-[#00A884] mr-1">
                    📊 Enquete ({poll.totalVotes})
                  </span>
                  <span className="font-semibold text-[#111B21]">{poll.question}</span>
                </div>
              ) : (
                <span className="text-xs text-[#667781] truncate whitespace-nowrap block">
                  <span className="hidden xl:inline">📊 Nenhuma enquete ativa</span>
                  <span className="inline xl:hidden">📊 Sem enquete ativa</span>
                </span>
              )}
            </div>
            {poll ? (
              <button
                onClick={() => setShowPollDetailModal(true)}
                className="text-[10px] font-bold bg-[#00A884] hover:bg-[#008F72] text-white px-2.5 py-1 rounded-lg transition-colors shrink-0 cursor-pointer min-h-[28px] flex items-center gap-1"
              >
                <Eye className="w-3 h-3" /> Ver
              </button>
            ) : isMentor && onCreatePoll ? (
              <button
                onClick={() => setShowCreatePollModal(true)}
                className="text-[10px] font-bold bg-[#E7F8F3] hover:bg-[#A7F3D0] text-[#00A884] border border-[#A7F3D0] px-2 py-1 rounded-lg transition-colors shrink-0 cursor-pointer min-h-[28px] whitespace-nowrap"
              >
                + Criar
              </button>
            ) : null}
          </div>
        </div>

        {/* ÁREA DIREITA: Action Controls (flex-shrink-0) */}
        <div className="flex items-center space-x-1.5 shrink-0 justify-end">
          {/* User Level, XP & Ranking Compact Pill */}
          {currentProfile && (
            <button
              onClick={onOpenProfileSettings}
              className="flex items-center space-x-1.5 bg-[#FFFFFF] hover:bg-[#E9EDEF] border border-[#DADDE1] rounded-xl px-2.5 py-1 text-xs text-[#8A6500] font-bold transition-all cursor-pointer min-h-[36px] shrink-0"
              title="Meu Nível, XP e Posição no Ranking"
            >
              <Award className="w-3.5 h-3.5 text-[#8A6500]" />
              <span>
                🏆 #{currentProfile.rank_position || 1} • Nível {currentProfile.level || Math.max(1, Math.floor(((currentProfile.message_count || 1) * 15 + 250) / 200))} • {(currentProfile.xp !== undefined ? currentProfile.xp : (currentProfile.message_count || 1) * 15 + 250)} XP
              </span>
            </button>
          )}

          {/* Profile Settings Avatar Button */}
          {currentProfile && onOpenProfileSettings && (
            <button
              onClick={onOpenProfileSettings}
              className="flex items-center space-x-1.5 p-1 rounded-xl bg-[#FFFFFF] hover:bg-[#E9EDEF] border border-[#DADDE1] transition-all cursor-pointer min-h-[36px] shrink-0"
              title="Configurações do Perfil e Foto"
            >
              {currentProfile.photo_url ? (
                <img
                  src={resolveChatMediaUrl(currentProfile.photo_url)}
                  alt={currentProfile.nickname || 'Perfil'}
                  className="w-7 h-7 rounded-full object-cover border border-[#00A884] shrink-0"
                />
              ) : (
                <div className={`w-7 h-7 rounded-full bg-gradient-to-tr ${getAvatarGradient(currentProfile.nickname || 'Eu')} flex items-center justify-center font-bold text-[10px] text-white shrink-0`}>
                  {getNicknameInitials(currentProfile.nickname || 'Eu')}
                </div>
              )}
              <span className="text-xs font-semibold text-[#111B21] pr-1.5 hidden xl:inline max-w-[90px] truncate">
                {currentProfile.nickname}
              </span>
            </button>
          )}

          {/* Online Counter Button */}
          <button
            onClick={onOpenOnlineDrawer}
            className="flex items-center space-x-1.5 bg-[#FFFFFF] hover:bg-[#E9EDEF] border border-[#DADDE1] rounded-xl px-2.5 py-1.5 text-xs text-[#111B21] transition-all cursor-pointer min-h-[36px] shrink-0"
            title="Membros online"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00A884] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00A884]"></span>
            </span>
            <span className="font-bold text-[#00A884] text-xs">{onlineCount}</span>
            <span className="text-[#667781] text-[10px]">Online</span>
            <Users className="w-3.5 h-3.5 text-[#667781] ml-0.5" />
          </button>

          {/* Gallery Button */}
          {onOpenGallery && (
            <button
              onClick={onOpenGallery}
              className="p-1.5 px-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#E9EDEF] text-[#111B21] transition-colors border border-[#DADDE1] cursor-pointer flex items-center gap-1 text-xs font-bold min-h-[36px] shrink-0"
              title="Galeria da Comunidade"
            >
              <span className="text-xs">🖼️</span>
              <span>Galeria</span>
            </button>
          )}

          {/* Notification Bell Button */}
          {onOpenNotifications && (
            <NotificationBell
              unreadCount={unreadNotificationCount}
              onClick={onOpenNotifications}
            />
          )}

          {/* Rules Button */}
          <button
            onClick={onOpenRules}
            className="p-2 rounded-xl bg-[#FFFFFF] hover:bg-[#E9EDEF] text-[#54656F] hover:text-[#111B21] transition-colors border border-[#DADDE1] cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
            title="Diretrizes da Comunidade"
          >
            <ShieldCheck className="w-4 h-4 text-[#00A884]" />
          </button>
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

      {/* Filter Tabs Row (Hidden on mobile to keep header clean) */}
      <div className="hidden md:flex items-center space-x-1.5 overflow-x-auto pb-0.5 text-xs no-scrollbar select-none min-w-0 w-full max-w-full">
        <button
          onClick={() => onFilterChange('ALL')}
          className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer min-h-[32px] ${
            activeFilter === 'ALL'
              ? 'bg-[#00A884] text-white font-bold shadow-xs'
              : 'bg-[#FFFFFF] text-[#54656F] border border-[#DADDE1] hover:bg-[#E9EDEF]'
          }`}
        >
          💬 Tudo
        </button>

        <button
          onClick={() => onFilterChange('NOTICES')}
          className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all flex items-center space-x-1 cursor-pointer min-h-[32px] ${
            activeFilter === 'NOTICES'
              ? 'bg-[#00A884] text-white font-bold shadow-xs'
              : 'bg-[#FFFFFF] text-[#54656F] border border-[#DADDE1] hover:bg-[#E9EDEF]'
          }`}
        >
          <Bell className="w-3.5 h-3.5 text-[#8A6500]" />
          <span>Avisos</span>
        </button>

        <button
          onClick={() => onFilterChange('POLLS')}
          className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all flex items-center space-x-1 cursor-pointer min-h-[32px] ${
            activeFilter === 'POLLS'
              ? 'bg-[#00A884] text-white font-bold shadow-xs'
              : 'bg-[#FFFFFF] text-[#54656F] border border-[#DADDE1] hover:bg-[#E9EDEF]'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5 text-[#00A884]" />
          <span>Enquetes</span>
        </button>

        {/* Desktop-only extra tabs */}
        <button
          onClick={() => onFilterChange('FAVORITES')}
          className={`hidden lg:flex px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all items-center space-x-1 cursor-pointer min-h-[32px] ${
            activeFilter === 'FAVORITES'
              ? 'bg-[#00A884] text-white font-bold shadow-xs'
              : 'bg-[#FFFFFF] text-[#54656F] border border-[#DADDE1] hover:bg-[#E9EDEF]'
          }`}
        >
          <Star className="w-3.5 h-3.5 text-[#8A6500]" />
          <span>Favoritas</span>
        </button>

        <button
          onClick={() => onFilterChange('RANKING')}
          className={`hidden lg:flex px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all items-center space-x-1 cursor-pointer min-h-[32px] ${
            activeFilter === 'RANKING'
              ? 'bg-[#00A884] text-white font-bold shadow-xs'
              : 'bg-[#FFFFFF] text-[#54656F] border border-[#DADDE1] hover:bg-[#E9EDEF]'
          }`}
        >
          <Award className="w-3.5 h-3.5 text-[#00A884]" />
          <span>Ranking 🏆</span>
        </button>

        {/* Mobile "Mais" button opening Drawer */}
        {onToggleMobileDrawer && (
          <button
            onClick={onToggleMobileDrawer}
            className="lg:hidden px-2.5 py-1 rounded-lg font-bold text-[#54656F] bg-[#FFFFFF] border border-[#DADDE1] hover:bg-[#E9EDEF] whitespace-nowrap transition-all flex items-center space-x-1 cursor-pointer min-h-[32px]"
          >
            <Plus className="w-3.5 h-3.5 text-[#00A884]" />
            <span>Mais</span>
          </button>
        )}
      </div>

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


