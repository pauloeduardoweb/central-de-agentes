import React from 'react';
import { Crown, AtSign } from 'lucide-react';
import { getAvatarGradient, getNicknameInitials } from '../../utils/avatarUtils';

export interface MentionMember {
  id: number;
  nickname: string;
  photo_url: string | null;
  is_mentor: boolean;
}

interface MentionsAutocompleteProps {
  query: string;
  members: MentionMember[];
  onSelectMember: (nickname: string) => void;
  onClose: () => void;
}

export const MentionsAutocomplete: React.FC<MentionsAutocompleteProps> = ({
  query,
  members,
  onSelectMember,
  onClose,
}) => {
  const filtered = members
    .filter((m) => m.nickname.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);

  if (filtered.length === 0) return null;

  return (
    <div className="absolute bottom-full mb-2 left-0 right-0 max-w-md mx-auto bg-[#111b21] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-40 animate-slide-up">
      <div className="bg-[#202c33] px-3 py-1.5 border-b border-slate-800 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center space-x-1">
        <AtSign className="w-3 h-3 text-emerald-400" />
        <span>Mencionar Membro da Comunidade</span>
      </div>

      <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
        {filtered.map((member) => (
          <button
            key={member.id}
            onClick={() => onSelectMember(member.nickname)}
            className="w-full px-3.5 py-2 hover:bg-[#1f2c34] text-left flex items-center space-x-2.5 transition-colors group"
          >
            {member.photo_url ? (
              <img
                src={member.photo_url}
                alt={member.nickname}
                className="w-7 h-7 rounded-full object-cover border border-emerald-500/40"
              />
            ) : (
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] bg-gradient-to-tr ${getAvatarGradient(
                  member.nickname
                )} text-white`}
              >
                {getNicknameInitials(member.nickname)}
              </div>
            )}

            <div className="flex-1 flex items-center justify-between">
              <span className="font-bold text-xs text-slate-100 group-hover:text-emerald-400 transition-colors">
                @{member.nickname}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
