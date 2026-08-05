import React, { useState } from 'react';
import { ArrowLeft, Search, X, Lock, Menu, User } from 'lucide-react';
import { resolveChatMediaUrl } from '../../utils/chatMediaUrl';

interface PrivateChatHeaderProps {
  room: {
    id: number;
    name: string;
    contact_profile_id?: number;
    contact_nickname?: string;
    contact_photo_url?: string | null;
    contact_chat_status?: string;
  };
  onReturnToGeneralChat: () => void;
  onOpenProfile?: (profileId: number) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onToggleMobileDrawer?: () => void;
}

export const PrivateChatHeader: React.FC<PrivateChatHeaderProps> = ({
  room,
  onReturnToGeneralChat,
  onOpenProfile,
  searchQuery = '',
  onSearchChange,
  onToggleMobileDrawer,
}) => {
  const [showSearch, setShowSearch] = useState(false);

  const contactName = room.contact_nickname || room.name || 'Contato';
  const photoUrl = room.contact_photo_url ? resolveChatMediaUrl(room.contact_photo_url) : null;

  const handleProfileClick = () => {
    if (room.contact_profile_id && onOpenProfile) {
      onOpenProfile(room.contact_profile_id);
    }
  };

  return (
    <div className="bg-[#F0F2F5] border-b border-[#DADDE1] px-3 py-2.5 sticky top-0 z-30 shadow-xs max-w-full overflow-hidden text-[#111B21]">
      <div className="flex items-center justify-between gap-2 w-full">
        {/* Left: Back button + Contact Info */}
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          {onToggleMobileDrawer && (
            <button
              onClick={onToggleMobileDrawer}
              className="lg:hidden p-1.5 rounded-xl bg-white border border-[#DADDE1] text-[#111B21] hover:bg-[#E9EDEF] cursor-pointer shrink-0"
              title="Abrir Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onReturnToGeneralChat}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#00A884]/10 border border-[#00A884]/30 text-[#00A884] hover:bg-[#00A884]/20 text-xs font-bold transition-colors cursor-pointer shrink-0"
            title="Voltar ao Bate-papo Geral"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Voltar ao Chat Geral</span>
          </button>

          <div
            onClick={handleProfileClick}
            className="flex items-center space-x-2.5 min-w-0 cursor-pointer hover:opacity-85 transition-opacity"
            title="Clique para ver o perfil do contato"
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={contactName}
                className="w-9 h-9 rounded-full object-cover border-2 border-[#00A884] shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#182F2A] border-2 border-[#00A884] flex items-center justify-center font-bold text-[#00A884] text-xs shrink-0">
                {contactName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-[#111B21] text-sm truncate leading-tight">
                  {contactName}
                </h3>
                <span className="text-[10px] font-semibold bg-teal-100 text-teal-800 border border-teal-300 px-1.5 py-0.2 rounded-full flex items-center gap-0.5 shrink-0">
                  <Lock className="w-2.5 h-2.5" /> Conversa privada
                </span>
              </div>
              <p className="text-[11px] text-[#667781] truncate leading-tight mt-0.5">
                {room.contact_chat_status || 'Clique para ver o perfil'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Search messages in direct chat */}
        {onSearchChange && (
          <div className="relative shrink-0">
            {showSearch ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Buscar na conversa..."
                  className="bg-white border border-[#DADDE1] text-xs text-[#111B21] placeholder-[#667781] rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-[#00A884] w-36 sm:w-48"
                  autoFocus
                />
                <button
                  onClick={() => {
                    onSearchChange('');
                    setShowSearch(false);
                  }}
                  className="p-1 rounded-lg text-[#667781] hover:text-[#111B21]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                className="p-2 rounded-xl bg-white border border-[#DADDE1] text-[#667781] hover:text-[#111B21] hover:bg-[#E9EDEF] cursor-pointer"
                title="Buscar mensagens"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
