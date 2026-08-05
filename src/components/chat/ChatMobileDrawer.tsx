import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageSquare, Search, BookOpen, Settings, ShieldAlert, X, Crown, Award,
  Bell, BarChart2, Star, Trophy, Image as ImageIcon, Users, Shield, User, Sparkles, LogOut
} from 'lucide-react';
import { resolveChatMediaUrl } from '../../utils/chatMediaUrl';
import { CHAT_LABELS } from '../../constants/chatLabels';

export const mobileCommunityMenuItems = [
  { id: 'notifications', label: CHAT_LABELS.notifications },
  { id: 'notices', label: 'Avisos do Mentor' },
  { id: 'polls', label: 'Enquetes' },
  { id: 'favorites', label: 'Mensagens Favoritas' },
  { id: 'ranking', label: 'Ranking & Experiência XP' },
  { id: 'gallery', label: 'Galeria de Mídia' },
  { id: 'online', label: 'Membros Online' },
  { id: 'rules', label: 'Regras da Comunidade' },
  { id: 'edit_profile', label: CHAT_LABELS.editProfile },
] as const;

interface ChatMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  isMentor: boolean;
  rooms: any[];
  activeRoomId: number;
  unreadNotificationCount?: number;
  onOpenNotifications?: () => void;
  onSelectRoom: (roomId: number) => void;
  onOpenRules: () => void;
  onOpenProfileModal: () => void;
  onOpenModModal?: () => void;
  onOpenAvatar?: (url: string, nickname: string) => void;
  onOpenGallery?: () => void;
  onOpenRanking?: () => void;
  onOpenFavorites?: () => void;
  onOpenOnlineDrawer?: () => void;
  onViewSelfProfile?: () => void;
  onSelectFilter?: (filter: 'ALL' | 'NOTICES' | 'POLLS' | 'FAVORITES' | 'RANKING') => void;
  onLogout?: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export const ChatMobileDrawer: React.FC<ChatMobileDrawerProps> = ({
  isOpen,
  onClose,
  profile,
  isMentor,
  rooms,
  activeRoomId,
  unreadNotificationCount = 0,
  onOpenNotifications,
  onSelectRoom,
  onOpenRules,
  onOpenProfileModal,
  onOpenModModal,
  onOpenAvatar,
  onOpenGallery,
  onOpenRanking,
  onOpenFavorites,
  onOpenOnlineDrawer,
  onViewSelfProfile,
  onSelectFilter,
  onLogout,
  searchTerm,
  onSearchChange,
}) => {
  const backdropRef = useRef<HTMLDivElement | null>(null);

  // Lock background body scroll when drawer is open
  useEffect(() => {
    if (!isOpen) return;
    if (typeof document !== 'undefined') {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  const userLevel = profile?.level || Math.max(1, Math.floor(((profile?.message_count || 1) * 15 + 250) / 200));
  const userXp = profile?.xp !== undefined ? profile.xp : (profile?.message_count || 1) * 15 + 250;
  const rankPos = profile?.rank_position || 1;

  const drawerContent = (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      aria-label="Central de Navegação Mobile"
      className="fixed inset-0 z-[5000] bg-black/50 backdrop-blur-xs animate-fade-in flex lg:hidden select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[88vw] max-w-[340px] h-full bg-[#0B141A] border-r border-[#263A43] shadow-2xl flex flex-col animate-slide-right text-white overflow-hidden"
      >
        {/* Drawer Header with Close Button */}
        <div className="px-4 py-3 bg-[#111B21] border-b border-[#263A43] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-[#00A884] font-bold text-sm">Central Geração Z Pro</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#182229] hover:bg-[#202C33] text-[#AEBAC1] hover:text-white transition-colors cursor-pointer"
            title="Fechar Menu"
            aria-label="Fechar Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Drawer Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 p-3 dark-panel-scrollbar">

          {/* SECTION 1: PERFIL CARD */}
          <div className="bg-[#111B21] border border-[#263A43] rounded-2xl p-3.5 space-y-3 shadow-xs">
            <div className="flex items-center space-x-3">
              {profile?.photo_url ? (
                <img
                  src={resolveChatMediaUrl(profile.photo_url)}
                  alt={profile.nickname}
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#00A884] cursor-pointer hover:brightness-105 shrink-0"
                  onClick={() => {
                    if (onViewSelfProfile) {
                      onViewSelfProfile();
                    }
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#182229] border-2 border-[#00A884] flex items-center justify-center font-bold text-[#00A884] text-base shrink-0">
                  {profile?.nickname ? profile.nickname.charAt(0).toUpperCase() : 'Z'}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <span className="font-bold text-white text-sm block leading-tight truncate flex items-center gap-1">
                  {isMentor ? 'Mentor Bigode' : profile?.nickname || 'Aluno GZ Pro'}
                  {isMentor && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                </span>
                <span className="text-[11px] text-[#00A884] font-medium block truncate mt-0.5">
                  ● Ativo agora
                </span>
              </div>
            </div>

            {/* Level, XP & Ranking */}
            <div className="bg-[#182229] rounded-xl p-2 px-3 border border-[#263A43] flex items-center justify-between text-xs text-amber-300 font-bold">
              <div className="flex items-center space-x-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Nível {userLevel} • {userXp} XP</span>
              </div>
              <span className="text-amber-400 text-[11px]">🏆 #{rankPos}</span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                onClick={() => {
                  console.log('[CHAT PROFILE OPEN CLICK]', profile?.id, 'source = MOBILE_DRAWER');
                  if (onViewSelfProfile) onViewSelfProfile();
                  onClose();
                }}
                className="w-full py-1.5 rounded-xl bg-[#182229] hover:bg-[#202C33] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-[#263A43]"
              >
                <User className="w-3.5 h-3.5 text-[#00A884]" />
                <span>Ver perfil</span>
              </button>

              <button
                onClick={() => {
                  onOpenProfileModal();
                  onClose();
                }}
                className="w-full py-1.5 rounded-xl bg-[#182229] hover:bg-[#202C33] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-[#263A43]"
              >
                <Settings className="w-3.5 h-3.5 text-[#AEBAC1]" />
                <span>Editar Perfil</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#AEBAC1] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar no bate-papo..."
              className="w-full bg-[#182229] border border-[#263A43] text-xs text-white placeholder-[#AEBAC1] rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-[#00A884] transition-colors"
            />
          </div>

          {/* SECTION 2: SALAS DA COMUNIDADE */}
          <div className="space-y-1.5">
            <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-[#AEBAC1] flex items-center justify-between">
              <span>Salas da Comunidade</span>
            </div>

            <div className="space-y-1">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => {
                    onSelectRoom(room.id);
                    onSelectFilter('ALL');
                    onClose();
                  }}
                  className={`w-full p-2.5 rounded-xl flex items-start space-x-3 transition-all text-left cursor-pointer min-h-[48px] ${
                    activeRoomId === room.id
                      ? 'bg-[#202C33] border-l-4 border-[#00A884] shadow-xs'
                      : 'hover:bg-[#182229]'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-[#182229] border border-[#263A43] flex items-center justify-center text-[#00A884] shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-xs font-bold text-white truncate">{room.name}</h4>
                      {room.last_message_at && (
                        <span className="text-[10px] text-[#AEBAC1]">
                          {new Date(room.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-[#AEBAC1] truncate">
                      {room.last_message_content || room.description || 'Nenhuma mensagem recente'}
                    </p>
                  </div>

                  {room.unread_count > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#00A884] text-white text-[10px] font-bold shrink-0">
                      {room.unread_count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 3: RECURSOS DA COMUNIDADE */}
          <div className="space-y-1.5">
            <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-[#AEBAC1]">
              Comunidade
            </div>

            <div className="space-y-1 text-xs font-medium">
              {onOpenNotifications && (
                <button
                  onClick={() => {
                    onOpenNotifications();
                    onClose();
                  }}
                  className="w-full p-2.5 rounded-xl bg-[#111B21] hover:bg-[#182229] text-white flex items-center justify-between transition-colors text-left cursor-pointer border border-[#263A43]"
                >
                  <div className="flex items-center space-x-2.5">
                    <Bell className="w-4 h-4 text-[#00A884] shrink-0" />
                    <span>Central de Notificações</span>
                  </div>
                  {unreadNotificationCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                      {unreadNotificationCount}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() => {
                  if (onSelectFilter) onSelectFilter('NOTICES');
                  onClose();
                }}
                className="w-full p-2.5 rounded-xl bg-[#111B21] hover:bg-[#182229] text-white border border-[#263A43] flex items-center space-x-2.5 transition-colors text-left cursor-pointer"
              >
                <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Avisos do Mentor</span>
              </button>

              <button
                onClick={() => {
                  if (onSelectFilter) onSelectFilter('POLLS');
                  onClose();
                }}
                className="w-full p-2.5 rounded-xl bg-[#111B21] hover:bg-[#182229] text-white border border-[#263A43] flex items-center space-x-2.5 transition-colors text-left cursor-pointer"
              >
                <BarChart2 className="w-4 h-4 text-[#00A884] shrink-0" />
                <span>Enquetes</span>
              </button>

              <button
                onClick={() => {
                  if (onOpenFavorites) onOpenFavorites();
                  onClose();
                }}
                className="w-full p-2.5 rounded-xl bg-[#111B21] hover:bg-[#182229] text-white border border-[#263A43] flex items-center space-x-2.5 transition-colors text-left cursor-pointer"
              >
                <Star className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Mensagens Favoritas</span>
              </button>

              <button
                onClick={() => {
                  if (onOpenRanking) onOpenRanking();
                  onClose();
                }}
                className="w-full p-2.5 rounded-xl bg-[#111B21] hover:bg-[#182229] text-white border border-[#263A43] flex items-center space-x-2.5 transition-colors text-left cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Ranking & Experiência XP</span>
              </button>

              {onOpenGallery && (
                <button
                  onClick={() => {
                    onOpenGallery();
                    onClose();
                  }}
                  className="w-full p-2.5 rounded-xl bg-[#111B21] hover:bg-[#182229] text-white border border-[#263A43] flex items-center space-x-2.5 transition-colors text-left cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-[#00A884] shrink-0" />
                  <span>Galeria de Mídia</span>
                </button>
              )}

              {onOpenOnlineDrawer && (
                <button
                  onClick={() => {
                    onOpenOnlineDrawer();
                    onClose();
                  }}
                  className="w-full p-2.5 rounded-xl bg-[#111B21] hover:bg-[#182229] text-white border border-[#263A43] flex items-center space-x-2.5 transition-colors text-left cursor-pointer"
                >
                  <Users className="w-4 h-4 text-[#00A884] shrink-0" />
                  <span>Membros Online</span>
                </button>
              )}
            </div>
          </div>

          {/* SECTION 4: CONFIGURAÇÕES E SEGURANÇA */}
          <div className="space-y-1.5">
            <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-[#AEBAC1]">
              Configurações & Segurança
            </div>

            <div className="space-y-1 text-xs font-medium">
              <button
                onClick={() => {
                  onOpenRules();
                  onClose();
                }}
                className="w-full p-2.5 rounded-xl bg-[#111B21] hover:bg-[#182229] text-white border border-[#263A43] flex items-center gap-2.5 transition-colors text-left cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-[#00A884] shrink-0" />
                <span className="text-xs font-medium text-white leading-normal">Regras da Comunidade</span>
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full p-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800 flex items-center space-x-2.5 transition-colors text-left cursor-pointer font-bold mt-2"
                >
                  <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Sair da Conta</span>
                </button>
              )}
            </div>
          </div>

          {/* SECTION 5: ADMINISTRAÇÃO MENTOR (Only if isMentor) */}
          {isMentor && (
            <div className="space-y-1.5 pt-1">
              <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" /> Administração
              </div>

              <div className="space-y-1 text-xs font-medium">
                {onOpenModModal && (
                  <button
                    onClick={() => {
                      onOpenModModal();
                      onClose();
                    }}
                    className="w-full p-2.5 rounded-xl bg-[#241F13] hover:bg-[#2A2314] border border-[#8A6500] text-amber-300 flex items-center space-x-2.5 transition-colors text-left cursor-pointer"
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Painel de Moderação</span>
                  </button>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 bg-[#111B21] border-t border-[#263A43] text-center text-[10px] text-[#AEBAC1] font-medium shrink-0">
          Comunidade Exclusiva Alunos Geração Z Pro
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
};

