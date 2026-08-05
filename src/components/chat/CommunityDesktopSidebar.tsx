import React from 'react';
import {
  MessageSquare, Search, Settings, ShieldAlert, Award,
  Bell, BarChart2, Star, Trophy, Image as ImageIcon, Users, BookOpen, User, Crown, Sparkles, Trash2
} from 'lucide-react';
import { resolveChatMediaUrl } from '../../utils/chatMediaUrl';
import { formatLastMessagePreview, formatLastMessageTime } from '../../utils/chatFormatters';

interface CommunityDesktopSidebarProps {
  profile: any;
  isMentor: boolean;
  rooms: any[];
  activeRoomId: number;
  unreadNotificationCount?: number;
  onlineCount?: number;
  activeFilter: 'ALL' | 'NOTICES' | 'POLLS' | 'FAVORITES' | 'RANKING';
  onSelectRoom: (roomId: number) => void;
  onSelectFilter: (filter: 'ALL' | 'NOTICES' | 'POLLS' | 'FAVORITES' | 'RANKING') => void;
  onDeleteRoom?: (roomId: number) => void;
  onOpenNotifications?: () => void;
  onOpenFavorites?: () => void;
  onOpenRanking?: () => void;
  onOpenGallery?: () => void;
  onOpenOnlineDrawer?: () => void;
  onOpenContacts?: () => void;
  onOpenRules: () => void;
  onOpenModModal?: () => void;
  onOpenProfileModal: () => void;
  onViewSelfProfile?: () => void;
  onOpenAvatar?: (url: string, nickname: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export const CommunityDesktopSidebar: React.FC<CommunityDesktopSidebarProps> = ({
  profile,
  isMentor,
  rooms,
  activeRoomId,
  unreadNotificationCount = 0,
  onlineCount,
  activeFilter,
  onSelectRoom,
  onSelectFilter,
  onDeleteRoom,
  onOpenNotifications,
  onOpenFavorites,
  onOpenRanking,
  onOpenGallery,
  onOpenOnlineDrawer,
  onOpenContacts,
  onOpenRules,
  onOpenModModal,
  onOpenProfileModal,
  onViewSelfProfile,
  onOpenAvatar,
  searchTerm,
  onSearchChange,
}) => {
  const userLevel = profile?.level || Math.max(1, Math.floor(((profile?.message_count || 1) * 15 + 250) / 200));
  const userXp = profile?.xp !== undefined ? profile.xp : (profile?.message_count || 1) * 15 + 250;
  const rankPos = profile?.rank_position || 1;
  const [deleteConfirmRoom, setDeleteConfirmRoom] = React.useState<any | null>(null);

  return (
    <div className="hidden lg:flex flex-col w-[300px] xl:w-[330px] bg-[#FFFFFF] border-r border-[#DADDE1] min-h-0 shrink-0 text-[#111B21] select-none shadow-xs">
      {/* Scrollable Sidebar Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">

        {/* SECTION 1: PERFIL CARD */}
        <div className="bg-[#F0F2F5] border border-[#DADDE1] rounded-2xl p-3.5 space-y-3 shadow-xs">
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
              <div className="w-12 h-12 rounded-full bg-[#FFFFFF] border-2 border-[#00A884] flex items-center justify-center font-bold text-[#00A884] text-base shrink-0 shadow-xs">
                {profile?.nickname ? profile.nickname.charAt(0).toUpperCase() : 'Z'}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <span className="font-bold text-[#111B21] text-sm block leading-tight truncate flex items-center gap-1">
                {isMentor ? 'Mentor Bigode' : profile?.nickname || 'Aluno GZ Pro'}
                {isMentor && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
              </span>
              <span className="text-[11px] text-[#00A884] font-semibold block truncate mt-0.5">
                ● Ativo agora
              </span>
            </div>
          </div>

          {/* Level, XP & Ranking */}
          <div className="bg-[#FFFFFF] rounded-xl p-2 px-3 border border-[#DADDE1] flex items-center justify-between text-xs text-[#8A6500] font-bold shadow-2xs">
            <div className="flex items-center space-x-1.5">
              <Award className="w-4 h-4 text-[#8A6500]" />
              <span>Nível {userLevel} • {userXp} XP</span>
            </div>
            <span className="text-[#8A6500] text-[11px] font-extrabold">🏆 #{rankPos}</span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              onClick={() => {
                if (onViewSelfProfile) onViewSelfProfile();
              }}
              className="w-full py-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#E9EDEF] text-[#111B21] text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-[#DADDE1] shadow-2xs"
            >
              <User className="w-3.5 h-3.5 text-[#00A884]" />
              <span>Ver perfil</span>
            </button>

            <button
              onClick={onOpenProfileModal}
              className="w-full py-1.5 rounded-xl bg-[#FFFFFF] hover:bg-[#E9EDEF] text-[#111B21] text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border border-[#DADDE1] shadow-2xs"
            >
              <Settings className="w-3.5 h-3.5 text-[#54656F]" />
              <span>Editar Perfil</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#667781] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar no bate-papo..."
            className="w-full bg-[#F0F2F5] border border-[#DADDE1] text-xs text-[#111B21] placeholder-[#667781] rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-[#00A884] focus:bg-[#FFFFFF] transition-all"
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
                <div className="px-1 text-[11px] font-extrabold uppercase tracking-wider text-[#667781]">
                  SALAS DA COMUNIDADE
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
                          onSelectFilter('ALL');
                        }}
                        className={`w-full p-2.5 rounded-xl flex items-start space-x-3 transition-all text-left cursor-pointer min-h-[48px] ${
                          activeRoomId === room.id && activeFilter === 'ALL'
                            ? 'bg-[#E9EDEF] border-l-4 border-[#00A884] font-bold shadow-2xs'
                            : 'hover:bg-[#F0F2F5]'
                        }`}
                      >
                        <div className="relative shrink-0 mt-0.5">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold bg-[#00A884]/10 text-[#00A884] border border-[#00A884]/30">
                            <MessageSquare className="w-4 h-4" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <h4 className="text-xs font-bold text-[#111B21] truncate">
                              {room.name}
                            </h4>
                            {timeFormatted && (
                              <span className="text-[10px] text-[#667781] shrink-0 ml-1">
                                {timeFormatted}
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-[#667781] truncate">
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
              <div className="space-y-1.5 pt-2 border-t border-[#DADDE1]">
                <div className="px-1 text-[11px] font-extrabold uppercase tracking-wider text-teal-700 flex items-center justify-between">
                  <span>CONVERSAS PRIVADAS</span>
                  {privateRooms.length > 0 && (
                    <span className="text-[10px] bg-teal-100 text-teal-800 border border-teal-300 px-1.5 py-0.2 rounded-full font-bold">
                      {privateRooms.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {privateRooms.length === 0 ? (
                    <div className="p-3 text-xs text-[#667781] italic text-center bg-[#F0F2F5] rounded-xl border border-[#DADDE1]/60">
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
                            onSelectFilter('ALL');
                          }}
                          className={`w-full p-2.5 rounded-xl flex items-center justify-between transition-all text-left cursor-pointer min-h-[52px] group ${
                            activeRoomId === room.id && activeFilter === 'ALL'
                              ? 'bg-[#E9EDEF] border-l-4 border-[#00A884] font-bold shadow-2xs'
                              : 'hover:bg-[#F0F2F5]'
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
                                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold bg-teal-600/10 text-teal-600 border border-teal-500/30">
                                  <User className="w-4 h-4" />
                                </div>
                              )}
                              {Boolean(room.contact_is_online) && (
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white absolute bottom-0 right-0" title="Online" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <h4 className="text-xs font-bold text-[#111B21] truncate flex items-center gap-1">
                                  {displayName}
                                  <span className="text-[9px] font-semibold text-teal-700 bg-teal-50 px-1 rounded border border-teal-200 shrink-0">Privado</span>
                                </h4>
                                {timeFormatted && (
                                  <span className="text-[10px] text-[#667781] shrink-0 ml-1">
                                    {timeFormatted}
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-[#667781] truncate">
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
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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

        {/* SECTION 3: COMUNIDADE */}
        <div className="space-y-1.5">
          <div className="px-1 text-[11px] font-extrabold uppercase tracking-wider text-[#667781]">
            Comunidade
          </div>

          <div className="space-y-1 text-xs font-medium">
            {/* 1. Central de Notificações */}
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="w-full p-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F0F2F5] text-[#111B21] flex items-center justify-between transition-colors text-left cursor-pointer border border-[#DADDE1] shadow-2xs"
              >
                <div className="flex items-center space-x-2.5">
                  <Bell className="w-4 h-4 text-[#00A884] shrink-0" />
                  <span className="font-semibold">Central de Notificações</span>
                </div>
                {unreadNotificationCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>
            )}

            {/* 2. Avisos do Mentor */}
            <button
              onClick={() => onSelectFilter('NOTICES')}
              className={`w-full p-2.5 rounded-xl border transition-colors text-left cursor-pointer flex items-center space-x-2.5 ${
                activeFilter === 'NOTICES'
                  ? 'bg-[#E9EDEF] border-[#00A884] text-[#00A884] font-bold shadow-2xs'
                  : 'bg-[#FFFFFF] hover:bg-[#F0F2F5] border-[#DADDE1] text-[#111B21]'
              }`}
            >
              <Bell className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="font-semibold">Avisos do Mentor</span>
            </button>

            {/* 3. Enquetes */}
            <button
              onClick={() => onSelectFilter('POLLS')}
              className={`w-full p-2.5 rounded-xl border transition-colors text-left cursor-pointer flex items-center space-x-2.5 ${
                activeFilter === 'POLLS'
                  ? 'bg-[#E9EDEF] border-[#00A884] text-[#00A884] font-bold shadow-2xs'
                  : 'bg-[#FFFFFF] hover:bg-[#F0F2F5] border-[#DADDE1] text-[#111B21]'
              }`}
            >
              <BarChart2 className="w-4 h-4 text-[#00A884] shrink-0" />
              <span className="font-semibold">Enquetes</span>
            </button>

            {/* 4. Mensagens Favoritas */}
            <button
              onClick={() => {
                if (onOpenFavorites) onOpenFavorites();
                else onSelectFilter('FAVORITES');
              }}
              className={`w-full p-2.5 rounded-xl border transition-colors text-left cursor-pointer flex items-center space-x-2.5 ${
                activeFilter === 'FAVORITES'
                  ? 'bg-[#E9EDEF] border-[#00A884] text-[#00A884] font-bold shadow-2xs'
                  : 'bg-[#FFFFFF] hover:bg-[#F0F2F5] border-[#DADDE1] text-[#111B21]'
              }`}
            >
              <Star className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="font-semibold">Mensagens Favoritas</span>
            </button>

            {/* 5. Ranking & Experiência XP */}
            <button
              onClick={() => {
                if (onOpenRanking) onOpenRanking();
                else onSelectFilter('RANKING');
              }}
              className={`w-full p-2.5 rounded-xl border transition-colors text-left cursor-pointer flex items-center space-x-2.5 ${
                activeFilter === 'RANKING'
                  ? 'bg-[#E9EDEF] border-[#00A884] text-[#00A884] font-bold shadow-2xs'
                  : 'bg-[#FFFFFF] hover:bg-[#F0F2F5] border-[#DADDE1] text-[#111B21]'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="font-semibold">Ranking & Experiência XP</span>
            </button>

            {/* 6. Galeria de Mídia */}
            {onOpenGallery && (
              <button
                onClick={onOpenGallery}
                className="w-full p-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F0F2F5] text-[#111B21] border border-[#DADDE1] flex items-center space-x-2.5 transition-colors text-left cursor-pointer shadow-2xs"
              >
                <ImageIcon className="w-4 h-4 text-[#00A884] shrink-0" />
                <span className="font-semibold">Galeria de Mídia</span>
              </button>
            )}

            {/* 7. Membros Online */}
            {onOpenOnlineDrawer && (
              <button
                onClick={onOpenOnlineDrawer}
                className="w-full p-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F0F2F5] text-[#111B21] border border-[#DADDE1] flex items-center justify-between transition-colors text-left cursor-pointer shadow-2xs"
              >
                <div className="flex items-center space-x-2.5">
                  <Users className="w-4 h-4 text-[#00A884] shrink-0" />
                  <span className="font-semibold">Membros Online</span>
                </div>
                {onlineCount !== undefined && (
                  <span className="bg-[#E7F8F3] text-[#00A884] border border-[#A7F3D0] text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00A884] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00A884]"></span>
                    </span>
                    {onlineCount}
                  </span>
                )}
              </button>
            )}

            {/* 8. Meus Contatos */}
            {onOpenContacts && (
              <button
                onClick={onOpenContacts}
                className="w-full p-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F0F2F5] text-[#111B21] border border-[#DADDE1] flex items-center space-x-2.5 transition-colors text-left cursor-pointer shadow-2xs"
              >
                <Users className="w-4 h-4 text-[#00A884] shrink-0" />
                <span className="font-semibold">Meus Contatos</span>
              </button>
            )}
          </div>
        </div>

        {/* SECTION 4: CONFIGURAÇÕES E SEGURANÇA */}
        <div className="space-y-1.5">
          <div className="px-1 text-[11px] font-extrabold uppercase tracking-wider text-[#667781]">
            Configurações e Segurança
          </div>

          <div className="space-y-1 text-xs font-medium">
            <button
              onClick={onOpenRules}
              className="w-full p-2.5 rounded-xl bg-[#FFFFFF] hover:bg-[#F0F2F5] text-[#111B21] border border-[#DADDE1] flex items-center space-x-2.5 transition-colors text-left cursor-pointer shadow-2xs"
            >
              <BookOpen className="w-4 h-4 text-[#00A884] shrink-0" />
              <span className="font-semibold">Regras da Comunidade</span>
            </button>
          </div>
        </div>

        {/* SECTION 5: ADMINISTRAÇÃO E MODERAÇÃO */}
        {(isMentor || Boolean(profile?.is_moderator)) && (
          <div className="space-y-1.5 pt-1">
            <div className="px-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-600 flex items-center gap-1">
              <Crown className="w-3.5 h-3.5" /> Moderação
            </div>

            <div className="space-y-1 text-xs font-medium">
              {onOpenModModal && (
                <button
                  onClick={onOpenModModal}
                  className="w-full p-2.5 rounded-xl bg-[#FEF3C7] hover:bg-[#FDE68A] border border-[#F59E0B] text-[#92400E] flex items-center space-x-2.5 transition-colors text-left cursor-pointer shadow-2xs font-bold"
                >
                  <ShieldAlert className="w-4 h-4 text-[#D97706] shrink-0" />
                  <span>Painel de Moderação</span>
                </button>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Community Info Footer */}
      <div className="p-3 bg-[#F0F2F5] border-t border-[#DADDE1] text-center text-[10px] text-[#667781] font-semibold shrink-0">
        Comunidade Exclusiva Alunos Geração Z Pro
      </div>

      {/* Confirmation Modal for Deleting Private Room */}
      {deleteConfirmRoom && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#FFFFFF] border border-[#DADDE1] rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-[#111B21]">
            <div className="flex items-center space-x-3 text-rose-600">
              <Trash2 className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-[#111B21]">Excluir conversa privada?</h3>
            </div>
            <p className="text-xs text-[#667781] leading-relaxed">
              Deseja excluir esta conversa privada com <strong className="text-[#111B21]">{deleteConfirmRoom.contact_nickname || deleteConfirmRoom.name || 'este contato'}</strong>? Esta ação removerá a conversa da sua lista.
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmRoom(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#667781] hover:bg-[#F0F2F5] transition-colors cursor-pointer"
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
};
