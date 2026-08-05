import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageSquare, Search, BookOpen, Settings, ShieldAlert, X, Crown, Award,
  Bell, BarChart2, Star, Trophy, Image as ImageIcon, Users, Shield, User, Sparkles, LogOut, Trash2
} from 'lucide-react';
import { resolveChatMediaUrl } from '../../utils/chatMediaUrl';
import { formatLastMessagePreview, formatLastMessageTime } from '../../utils/chatFormatters';
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
  onOpenContacts?: () => void;
  onOpenAvatar?: (url: string, nickname: string) => void;
  onOpenGallery?: () => void;
  onOpenRanking?: () => void;
  onOpenFavorites?: () => void;
  onOpenOnlineDrawer?: () => void;
  onViewSelfProfile?: () => void;
  onSelectFilter?: (filter: 'ALL' | 'NOTICES' | 'POLLS' | 'FAVORITES' | 'RANKING') => void;
  onDeleteRoom?: (roomId: number) => void;
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
  onOpenContacts,
  onOpenAvatar,
  onOpenGallery,
  onOpenRanking,
  onOpenFavorites,
  onOpenOnlineDrawer,
  onViewSelfProfile,
  onSelectFilter,
  onDeleteRoom,
  onLogout,
  searchTerm,
  onSearchChange,
}) => {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const [deleteConfirmRoom, setDeleteConfirmRoom] = React.useState<any | null>(null);

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

          {/* SECTION 2: SALAS DA COMUNIDADE & CONVERSAS PRIVADAS */}
          {(() => {
            const uniqueRoomsMap = new Map<number, any>();
            rooms.forEach((r) => {
              if (r && r.id && !uniqueRoomsMap.has(r.id)) {
                uniqueRoomsMap.set(r.id, r);
              }
            });
            const uniqueRoomsList = Array.from(uniqueRoomsMap.values());
            const communityRooms = uniqueRoomsList.filter((r) => r.room_type !== 'PRIVATE');
            const privateRooms = uniqueRoomsList.filter((r) => r.room_type === 'PRIVATE');

            return (
              <>
                {/* SALAS DA COMUNIDADE */}
                <div className="space-y-1.5">
                  <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-[#AEBAC1] flex items-center justify-between">
                    <span>SALAS DA COMUNIDADE</span>
                  </div>

                  <div className="space-y-1">
                    {communityRooms.map((room) => {
                      const previewText = room.last_message_content || room.description || 'Nenhuma mensagem recente';
                      const timeFormatted = formatLastMessageTime(room.last_message_at);

                      return (
                        <button
                          key={room.id}
                          onClick={() => {
                            onSelectRoom(room.id);
                            onSelectFilter?.('ALL');
                            onClose();
                          }}
                          className={`w-full p-2.5 rounded-xl flex items-start space-x-3 transition-all text-left cursor-pointer min-h-[48px] ${
                            activeRoomId === room.id
                              ? 'bg-[#202C33] border-l-4 border-[#00A884] shadow-xs'
                              : 'hover:bg-[#182229]'
                          }`}
                        >
                          <div className="relative shrink-0 mt-0.5">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold bg-[#182229] text-[#00A884] border border-[#263A43]">
                              <MessageSquare className="w-4 h-4" />
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <h4 className="text-xs font-bold text-white truncate">
                                {room.name}
                              </h4>
                              {timeFormatted && (
                                <span className="text-[10px] text-[#AEBAC1] shrink-0 ml-1">
                                  {timeFormatted}
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-[#AEBAC1] truncate">
                              {previewText}
                            </p>
                          </div>

                          {room.unread_count > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-[#00A884] text-white text-[10px] font-bold shrink-0 self-center">
                              {room.unread_count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CONVERSAS PRIVADAS */}
                <div className="space-y-1.5 pt-2 border-t border-[#263A43]/60">
                  <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-teal-400 flex items-center justify-between">
                    <span>CONVERSAS PRIVADAS</span>
                    {privateRooms.length > 0 && (
                      <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-700/50 px-1.5 py-0.2 rounded-full font-bold">
                        {privateRooms.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {privateRooms.length === 0 ? (
                      <div className="p-3 text-xs text-[#AEBAC1] italic text-center bg-[#111B21]/60 rounded-xl border border-[#263A43]/40">
                        Nenhuma conversa privada.
                      </div>
                    ) : (
                      privateRooms.map((room) => {
                        const displayName = room.contact_nickname || room.name || 'Contato';
                        const previewText = formatLastMessagePreview(room.last_message_content, room.last_message_type);
                        const timeFormatted = formatLastMessageTime(room.last_message_at);

                        return (
                          <div
                            key={room.id}
                            onClick={() => {
                              onSelectRoom(room.id);
                              onSelectFilter?.('ALL');
                              onClose();
                            }}
                            className={`w-full p-2.5 rounded-xl flex items-center justify-between transition-all text-left cursor-pointer min-h-[52px] group ${
                              activeRoomId === room.id
                                ? 'bg-[#202C33] border-l-4 border-[#00A884] shadow-xs'
                                : 'hover:bg-[#182229]'
                            }`}
                          >
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <div className="relative shrink-0">
                                {room.contact_photo_url ? (
                                  <img
                                    src={resolveChatMediaUrl(room.contact_photo_url)}
                                    alt={displayName}
                                    className="w-9 h-9 rounded-full object-cover border border-[#00A884]/40"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold bg-teal-950 text-teal-400 border border-teal-700/50">
                                    <User className="w-4 h-4" />
                                  </div>
                                )}
                                {Boolean(room.contact_is_online) && (
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#111B21] absolute bottom-0 right-0" title="Online" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                  <h4 className="text-xs font-bold text-white truncate flex items-center gap-1">
                                    {displayName}
                                    <span className="text-[9px] font-semibold text-teal-400 bg-teal-950 px-1 rounded border border-teal-700/40 shrink-0">Privado</span>
                                  </h4>
                                  {timeFormatted && (
                                    <span className="text-[10px] text-[#AEBAC1] shrink-0 ml-1">
                                      {timeFormatted}
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] text-[#AEBAC1] truncate">
                                  {previewText}
                                </p>

                                {room.unread_count > 0 && (
                                  <div className="text-[10px] font-semibold text-[#00A884] mt-0.5">
                                    {room.unread_count === 1 ? '1 mensagem não lida' : `${room.unread_count} mensagens não lidas`}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-1 shrink-0 ml-2">
                              {room.unread_count > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-[#00A884] text-white text-[10px] font-bold">
                                  {room.unread_count}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmRoom(room);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                                title="Excluir conversa"
                                aria-label="Excluir conversa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            );
          })()}

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

              {onOpenContacts && (
                <button
                  onClick={() => {
                    onOpenContacts();
                    onClose();
                  }}
                  className="w-full p-2.5 rounded-xl bg-[#111B21] hover:bg-[#182229] text-white border border-[#263A43] flex items-center space-x-2.5 transition-colors text-left cursor-pointer"
                >
                  <Users className="w-4 h-4 text-[#00A884] shrink-0" />
                  <span>Meus Contatos</span>
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

          {/* SECTION 5: ADMINISTRAÇÃO MENTOR / MODERADOR */}
          {(isMentor || Boolean(profile?.is_moderator)) && (
            <div className="space-y-1.5 pt-1">
              <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" /> Moderação
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

      {/* Confirmation Modal for Deleting Private Room */}
      {deleteConfirmRoom && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#111B21] border border-[#263A43] rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-white">
            <div className="flex items-center space-x-3 text-rose-400">
              <Trash2 className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Excluir conversa privada?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Deseja excluir esta conversa privada com <strong className="text-white">{deleteConfirmRoom.contact_nickname || deleteConfirmRoom.name || 'este contato'}</strong>? Esta ação removerá a conversa da sua lista.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmRoom(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-[#182229] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmRoom && onDeleteRoom) {
                    onDeleteRoom(deleteConfirmRoom.id);
                  }
                  setDeleteConfirmRoom(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer shadow-md"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(drawerContent, document.body);
};

