import React from 'react';
import { Bell } from 'lucide-react';

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  unreadCount,
  onClick,
  className = '',
}) => {
  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-xl bg-[#FFFFFF] hover:bg-[#F0F2F5] border border-[#DADDE1] transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center text-[#54656F] hover:text-[#111B21] ${className}`}
      title="Notificações"
    >
      <Bell className="w-4 h-4 text-[#54656F]" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-[#EA0038] text-white text-[9px] font-extrabold px-1.5 py-0.2 min-w-[18px] text-center rounded-full animate-pulse shadow-xs border border-[#FFFFFF]">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};
