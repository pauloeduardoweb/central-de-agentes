import React from 'react';
import { X, Users, Crown, MessageSquare, Calendar, ChevronRight } from 'lucide-react';
import { getAvatarGradient, getNicknameInitials } from '../../utils/avatarUtils';
import { resolveChatMediaUrl } from '../../utils/chatMediaUrl';

export interface OnlineMemberItem {
  id: number;
  nickname: string;
  photo_url: string | null;
  bio?: string | null;
  is_mentor: boolean;
  joined_at?: string;
  total_messages?: number;
}

interface OnlineMembersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  members: OnlineMemberItem[];
  onViewProfile: (profileId: number) => void;
}

export const OnlineMembersDrawer: React.FC<OnlineMembersDrawerProps> = ({
  isOpen,
  onClose,
  members,
  onViewProfile,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-sm bg-[#0B141A] h-full shadow-2xl border-l border-[#263A43] flex flex-col animate-slide-left text-white">
        {/* Header */}
        <div className="p-4 border-b border-[#263A43] flex items-center justify-between bg-[#111B21]">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00A884] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00A884]"></span>
            </span>
            <h2 className="font-bold text-white text-base">Membros Online</h2>
            <span className="bg-[#182F2A] text-[#00A884] text-xs font-bold px-2 py-0.5 rounded-full border border-[#00A884]/40">
              {members.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#AEBAC1] hover:text-white hover:bg-[#182229] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Members List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 dark-panel-scrollbar">
          {members.length === 0 ? (
            <div className="py-12 text-center text-[#AEBAC1] text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 text-[#AEBAC1]" />
              <p>Nenhum membro ativo no momento.</p>
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                onClick={() => {
                  onViewProfile(member.id);
                  onClose();
                }}
                className="p-3 rounded-2xl bg-[#111B21] hover:bg-[#182229] border border-[#263A43] transition-all cursor-pointer flex items-center justify-between group shadow-xs"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {member.photo_url ? (
                      <img
                        src={resolveChatMediaUrl(member.photo_url)}
                        alt={member.nickname}
                        className="w-10 h-10 rounded-full object-cover border border-[#00A884]"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs bg-gradient-to-tr ${getAvatarGradient(
                          member.nickname
                        )} text-white shadow-xs`}
                      >
                        {getNicknameInitials(member.nickname)}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00A884] border-2 border-[#111B21] rounded-full"></span>
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-bold text-white text-xs truncate group-hover:text-[#00A884] transition-colors">
                        {member.nickname}
                      </span>
                      {member.is_mentor && (
                        <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                    </div>

                    {member.bio && (
                      <p className="text-[11px] text-[#AEBAC1] truncate mt-0.5">{member.bio}</p>
                    )}

                    <div className="flex items-center space-x-3 mt-1 text-[10px] text-[#AEBAC1]">
                      {member.total_messages !== undefined && (
                        <span className="flex items-center space-x-1">
                          <MessageSquare className="w-2.5 h-2.5 text-[#00A884]" />
                          <span>{member.total_messages} msgs</span>
                        </span>
                      )}
                      {member.joined_at && (
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-2.5 h-2.5 text-[#AEBAC1]" />
                          <span>
                            Desde {new Date(member.joined_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-[#AEBAC1] group-hover:text-[#00A884] transition-colors" />
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-[#263A43] bg-[#111B21] text-center text-[10px] text-[#AEBAC1]">
          Dados privados mantidos sob total confidencialidade.
        </div>
      </div>
    </div>
  );
};
