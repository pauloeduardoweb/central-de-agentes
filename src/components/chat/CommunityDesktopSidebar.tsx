import React from 'react';
import {
  MessageSquare, Search, Settings, ShieldAlert, Award,
  Bell, BarChart2, Star, Trophy, Image as ImageIcon, Users, BookOpen, User, Crown, Sparkles
} from 'lucide-react';
import { resolveChatMediaUrl } from '../../utils/chatMediaUrl';

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
  onOpenNotifications?: () => void;
  onOpenFavorites?: () => void;
  onOpenRanking?: () => void;
  onOpenGallery?: () => void;
  onOpenOnlineDrawer?: () => void;
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
  onOpenNotifications,
  onOpenFavorites,
  onOpenRanking,
  onOpenGallery,
  onOpenOnlineDrawer,
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
                  if (onOpenAvatar && profile?.photo_url) {
                    onOpenAvatar(profile.photo_url, profile.nickname);
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

        {/* SECTION 2: SALAS DA COMUNIDADE */}
        <div className="space-y-1.5">
          <div className="px-1 text-[11px] font-extrabold uppercase tracking-wider text-[#667781]">
            Salas da Comunidade
          </div>

          <div className="space-y-1">
            {rooms.map((room) => (
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
                <div className="w-9 h-9 rounded-xl bg-[#00A884]/10 border border-[#00A884]/30 flex items-center justify-center text-[#00A884] shrink-0 mt-0.5">
                  <MessageSquare className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-xs font-bold text-[#111B21] truncate">{room.name}</h4>
                    {room.last_message_at && (
                      <span className="text-[10px] text-[#667781]">
                        {new Date(room.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#667781] truncate">
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

        {/* SECTION 5: ADMINISTRAÇÃO (somente Mentor) */}
        {isMentor && (
          <div className="space-y-1.5 pt-1">
            <div className="px-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-600 flex items-center gap-1">
              <Crown className="w-3.5 h-3.5" /> Administração
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
    </div>
  );
};
