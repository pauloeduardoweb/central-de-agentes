import React from 'react';
import {
  Bell,
  X,
  CheckCheck,
  MessageSquareQuote,
  Heart,
  AtSign,
  Zap,
  Trophy,
  Megaphone,
  BarChart2,
  Crown,
  AlertTriangle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { resolveChatMediaUrl } from '../../utils/chatMediaUrl';
import { getAvatarGradient, getNicknameInitials } from '../../utils/avatarUtils';

export interface NotificationItem {
  id: number;
  profile_id: number;
  notification_type: string;
  title: string;
  message: string | null;
  content?: string | null;
  related_message_id: number | null;
  related_profile_id: number | null;
  related_room_id: number | null;
  related_poll_id: number | null;
  related_achievement_id: number | null;
  deduplication_key?: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  actor?: {
    id: number;
    nickname: string;
    photo_url: string | null;
  } | null;
}

interface ChatNotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading?: boolean;
  filter: 'ALL' | 'UNREAD';
  onFilterChange: (filter: 'ALL' | 'UNREAD') => void;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  onNotificationClick: (item: NotificationItem) => void;
}

function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Agora mesmo';
  if (diffSec < 3600) return `Há ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `Há ${Math.floor(diffSec / 3600)} h`;
  if (diffSec < 172800) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'REPLY_RECEIVED':
      return <MessageSquareQuote className="w-4 h-4 text-cyan-400" />;
    case 'REACTION_RECEIVED':
      return <Heart className="w-4 h-4 text-pink-400" />;
    case 'MENTION_RECEIVED':
      return <AtSign className="w-4 h-4 text-purple-400" />;
    case 'LEVEL_UP':
      return <Zap className="w-4 h-4 text-amber-400" />;
    case 'ACHIEVEMENT_UNLOCKED':
      return <Trophy className="w-4 h-4 text-yellow-400" />;
    case 'ANNOUNCEMENT_PUBLISHED':
      return <Megaphone className="w-4 h-4 text-emerald-400" />;
    case 'POLL_CREATED':
      return <BarChart2 className="w-4 h-4 text-teal-400" />;
    case 'TOP_10_ENTERED':
      return <Crown className="w-4 h-4 text-amber-300" />;
    case 'MENTOR_WARNING':
      return <AlertTriangle className="w-4 h-4 text-red-400" />;
    default:
      return <Bell className="w-4 h-4 text-slate-400" />;
  }
}

export const ChatNotificationsPanel: React.FC<ChatNotificationsPanelProps> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  isLoading = false,
  filter,
  onFilterChange,
  onMarkRead,
  onMarkAllRead,
  onNotificationClick,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#111b21] h-full shadow-2xl border-l border-slate-800 flex flex-col text-slate-200">
        {/* Panel Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#1f2c34]">
          <div className="flex items-center gap-2.5">
            <div className="relative p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <Bell className="w-5 h-5 text-cyan-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full animate-pulse shadow-md">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="font-bold text-base text-white flex items-center gap-2">
                Central de Notificações
              </h2>
              <p className="text-xs text-slate-400">Fique por dentro das novidades da comunidade</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="px-4 py-2.5 bg-[#182229] border-b border-slate-800/80 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 bg-[#111b21] p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => onFilterChange('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filter === 'ALL'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => onFilterChange('UNREAD')}
              className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                filter === 'UNREAD'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Não lidas
              {unreadCount > 0 && (
                <span className="bg-cyan-400/20 text-cyan-300 px-1.5 py-0.2 rounded-md text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-cyan-500/10"
              title="Marcar todas como lidas"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Marcar todas lidas</span>
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 dark-panel-scrollbar">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Carregando notificações...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-4 text-cyan-400 shadow-inner">
                <Sparkles className="w-7 h-7 text-cyan-400/80" />
              </div>
              <h3 className="font-bold text-white text-base mb-1">
                {filter === 'UNREAD' ? 'Nenhuma notificação não lida' : 'Tudo tranquilo por aqui'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                {filter === 'UNREAD'
                  ? 'Você já visualizou todas as suas atualizações recentes.'
                  : 'Suas respostas, menções, conquistas e avisos aparecerão neste espaço.'}
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              const icon = getNotificationIcon(item.notification_type);
              const messageText = item.content || item.message || '';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!item.is_read) {
                      onMarkRead(item.id);
                    }
                    onNotificationClick(item);
                  }}
                  className={`group relative p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex gap-3 ${
                    !item.is_read
                      ? 'bg-[#182a32] hover:bg-[#1f343e] border-cyan-500/30 shadow-md shadow-cyan-950/20'
                      : 'bg-[#182229]/60 hover:bg-[#1f2c34] border-slate-800/80'
                  }`}
                >
                  {/* Unread Badge Indicator */}
                  {!item.is_read && (
                    <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400/50" />
                  )}

                  {/* Icon or Actor Avatar */}
                  <div className="shrink-0 pt-0.5">
                    {item.actor ? (
                      <div className="relative">
                        {item.actor.photo_url ? (
                          <img
                            src={resolveChatMediaUrl(item.actor.photo_url)}
                            alt={item.actor.nickname}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-700"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${getAvatarGradient(item.actor.nickname)} flex items-center justify-center font-bold text-xs text-white`}>
                            {getNicknameInitials(item.actor.nickname)}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 p-1 bg-[#111b21] rounded-lg border border-slate-800">
                          {icon}
                        </div>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-[#202c33] border border-slate-700/60 flex items-center justify-center">
                        {icon}
                      </div>
                    )}
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0 pr-4">
                    <h4 className="font-bold text-xs text-slate-100 group-hover:text-white transition-colors leading-snug">
                      {item.title}
                    </h4>
                    {messageText && (
                      <p className="text-xs text-slate-300 line-clamp-2 mt-1 leading-relaxed">
                        {messageText}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{formatRelativeTime(item.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
