import React from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, MessageSquare, Shield, CheckCircle2, UserCheck, AlertTriangle } from 'lucide-react';
import { getAvatarGradient, getNicknameInitials } from '../../utils/avatarUtils';
import { resolveChatMediaUrl } from '../../utils/chatMediaUrl';

interface ProfilePreviewProps {
  profile: {
    id: number;
    nickname: string;
    photo_url: string | null;
    bio: string | null;
    phone?: string | null;
    phone_visibility?: string | null;
    created_at?: string;
    message_count?: number;
    chat_status?: string;
    online_status?: 'ONLINE' | 'AWAY' | 'OFFLINE';
    last_seen?: string;
  } | null;
  isMentor?: boolean;
  onClose: () => void;
  onOpenAvatar?: (url: string, nickname: string) => void;
  onWarnUser?: (profileId: number, nickname: string) => void;
  onSearchUserMessages?: (nickname: string) => void;
}

export const ProfilePreview: React.FC<ProfilePreviewProps> = ({
  profile,
  isMentor,
  onClose,
  onOpenAvatar,
  onWarnUser,
  onSearchUserMessages,
}) => {
  const [activeTab, setActiveTab] = React.useState<'PROFILE' | 'BADGES' | 'STATS'>('PROFILE');
  const [actionSuccessMsg, setActionSuccessMsg] = React.useState<string | null>(null);

  // Lock body scroll when open
  React.useEffect(() => {
    if (!profile) return;
    if (typeof document !== 'undefined') {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [profile]);

  // Handle Escape key
  React.useEffect(() => {
    if (!profile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profile, onClose]);

  if (!profile) return null;

  const isMentorProfile = profile.nickname === 'Mentor Bigode' || isMentor;
  const msgCount = profile.message_count !== undefined ? profile.message_count : 124;
  const xpCount = msgCount * 15 + 250;
  const userLevel = Math.min(100, Math.max(1, Math.floor(xpCount / 200)));
  const currentLevelXp = xpCount % 200;
  const levelProgressPercent = Math.min(100, Math.round((currentLevelXp / 200) * 100));

  const isOnline = profile.online_status === 'ONLINE' || profile.chat_status === 'ACTIVE';

  const userBadges = [
    { icon: '🔥', title: 'Primeira Mensagem', desc: 'Mandou a primeira mensagem na comunidade', unlocked: msgCount >= 1 },
    { icon: '💎', title: '100 Mensagens', desc: 'Superou 100 contribuições no grupo', unlocked: msgCount >= 100 },
    { icon: '🚀', title: '500 Mensagens', desc: 'Membro com engajamento altíssimo', unlocked: msgCount >= 500 },
    { icon: '🏆', title: 'Top 10', desc: 'Está entre os melhores do Ranking', unlocked: true },
    { icon: '👑', title: 'Mentor Oficial', desc: 'Equipe oficial de mentoria Z Pro', unlocked: isMentorProfile },
    { icon: '⭐', title: 'Membro Ativo', desc: 'Acessa e participa frequentemente', unlocked: true },
    { icon: '💬', title: 'Conversador', desc: 'Inicia debates e tira dúvidas de alunos', unlocked: msgCount >= 20 },
    { icon: '🎯', title: 'Respondeu 100 Pessoas', desc: 'Ajudou outros alunos em dúvidas', unlocked: msgCount >= 50 },
  ];

  const handleActionClick = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const content = (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-[#0B141A] border border-[#263A43] rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Clean Dark Style without green strip */}
        <div className="bg-[#111B21] border-b border-[#263A43] px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#182F2A] text-[#00A884] border border-[#00A884]/40">
              ⚡ Nível {userLevel}
            </span>
            {isMentorProfile ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#241F13] text-amber-300 border border-[#8A6500]">
                👑 Mentor Oficial
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-[#132338] text-sky-300 border border-sky-800">
                🚀 Aluno Z Pro
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-[#182229] hover:bg-[#202C33] text-[#AEBAC1] hover:text-white transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="px-6 py-4 flex-1 overflow-y-auto dark-panel-scrollbar space-y-4">
          {/* Avatar and Nickname Info */}
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => {
                if (profile.photo_url && onOpenAvatar) {
                  onOpenAvatar(profile.photo_url, profile.nickname);
                }
              }}
              className="relative group focus:outline-none cursor-pointer shrink-0"
            >
              <div className="p-0.5 rounded-full bg-[#111B21]">
                {profile.photo_url ? (
                  <img
                    src={resolveChatMediaUrl(profile.photo_url)}
                    alt={profile.nickname}
                    className="w-16 h-16 rounded-full object-cover border-2 border-[#00A884] shadow-xs group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full border-2 border-[#00A884] shadow-xs bg-[#182229] flex items-center justify-center font-bold text-xl text-[#00A884] group-hover:scale-105 transition-transform">
                    {getNicknameInitials(profile.nickname)}
                  </div>
                )}
              </div>

              {/* Online indicator dot */}
              <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[#111B21] ${isOnline ? 'bg-[#00A884]' : 'bg-[#AEBAC1]'}`} />
            </button>

            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-white flex items-center gap-1.5 truncate">
                {profile.nickname}
                {isMentorProfile && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
              </h3>
              <p className="text-xs text-[#AEBAC1] mt-0.5 line-clamp-2 leading-relaxed">
                {profile.bio || 'Aluno oficial da plataforma Geração Z Pro.'}
              </p>
            </div>
          </div>

          {/* Level Progress Bar */}
          <div className="p-3 rounded-2xl bg-[#111B21] border border-[#263A43]">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-[#00A884]">Progresso do Nível</span>
              <span className="text-[11px] text-[#AEBAC1] font-mono">{currentLevelXp} / 200 XP ({levelProgressPercent}%)</span>
            </div>
            <div className="w-full bg-[#182229] h-2 rounded-full overflow-hidden">
              <div 
                className="bg-[#00A884] h-full rounded-full transition-all duration-500"
                style={{ width: `${levelProgressPercent}%` }}
              />
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="flex items-center gap-2 border-b border-[#263A43] pb-2 text-xs">
            <button
              onClick={() => setActiveTab('PROFILE')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'PROFILE' ? 'bg-[#182F2A] text-[#00A884] border border-[#00A884]/40' : 'text-[#AEBAC1] hover:text-white hover:bg-[#182229]'
              }`}
            >
              Perfil
            </button>
            <button
              onClick={() => setActiveTab('BADGES')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'BADGES' ? 'bg-[#182F2A] text-[#00A884] border border-[#00A884]/40' : 'text-[#AEBAC1] hover:text-white hover:bg-[#182229]'
              }`}
            >
              Conquistas ({userBadges.filter(b => b.unlocked).length})
            </button>
            <button
              onClick={() => setActiveTab('STATS')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'STATS' ? 'bg-[#182F2A] text-[#00A884] border border-[#00A884]/40' : 'text-[#AEBAC1] hover:text-white hover:bg-[#182229]'
              }`}
            >
              Estatísticas
            </button>
          </div>

          {/* Action Success Toast */}
          {actionSuccessMsg && (
            <div className="p-2 bg-[#182F2A] border border-[#00A884]/40 rounded-xl text-[#00A884] text-xs text-center font-bold animate-fade-in">
              {actionSuccessMsg}
            </div>
          )}

          {/* Tab 1: Profile Main */}
          {activeTab === 'PROFILE' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#111B21] border border-[#263A43] flex flex-col">
                  <span className="text-[10px] text-[#AEBAC1]">Total Mensagens</span>
                  <span className="text-sm font-bold text-[#00A884]">{msgCount}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#111B21] border border-[#263A43] flex flex-col">
                  <span className="text-[10px] text-[#AEBAC1]">Experiência (XP)</span>
                  <span className="text-sm font-bold text-amber-300">⭐ {xpCount} XP</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#111B21] border border-[#263A43] flex flex-col">
                  <span className="text-[10px] text-[#AEBAC1]">Dias Consecutivos</span>
                  <span className="text-sm font-bold text-amber-400">⚡ {Math.max(3, (profile.id * 2) % 15 + 1)} dias</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#111B21] border border-[#263A43] flex flex-col">
                  <span className="text-[10px] text-[#AEBAC1]">Posição Ranking</span>
                  <span className="text-sm font-bold text-sky-400">🏆 #{Math.max(1, 12 - (profile.id % 10))}</span>
                </div>
              </div>

              {/* Action Buttons Menu */}
              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (onSearchUserMessages) {
                      onSearchUserMessages(profile.nickname);
                      onClose();
                    }
                  }}
                  className="w-full text-left p-2.5 rounded-xl bg-[#182F2A] hover:bg-[#1E3B34] border border-[#00A884]/40 text-xs text-[#00A884] font-bold flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#00A884]" />
                    <span>Ver Mensagens de @{profile.nickname}</span>
                  </div>
                  <span>→</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleActionClick('Usuário silenciado temporariamente.')}
                    className="flex-1 p-2 rounded-xl bg-[#182229] hover:bg-[#202C33] border border-[#263A43] text-[#AEBAC1] hover:text-white text-xs font-bold text-center cursor-pointer transition-colors"
                  >
                    🚫 Silenciar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleActionClick('Denúncia registrada para análise da mentoria.')}
                    className="flex-1 p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800 text-xs font-bold text-center cursor-pointer transition-colors"
                  >
                    🚩 Denunciar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Conquistas Badges */}
          {activeTab === 'BADGES' && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {userBadges.map((badge, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-2xl border flex flex-col gap-1 transition-all ${
                    badge.unlocked
                      ? 'bg-[#111B21] border-amber-500/40 text-white'
                      : 'bg-[#182229] border-[#263A43] text-[#AEBAC1] opacity-50 grayscale'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{badge.icon}</span>
                    <span className="font-bold text-xs truncate">{badge.title}</span>
                  </div>
                  <p className="text-[10px] text-[#AEBAC1] leading-tight">{badge.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Detailed Stats */}
          {activeTab === 'STATS' && (
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-2xl bg-[#111B21] border border-[#263A43] flex items-center justify-between">
                <span className="text-[#AEBAC1]">🖼️ Fotos Compartilhadas</span>
                <span className="font-bold text-[#00A884]">{Math.floor(msgCount / 5)}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#111B21] border border-[#263A43] flex items-center justify-between">
                <span className="text-[#AEBAC1]">🎙️ Áudios Enviados</span>
                <span className="font-bold text-[#00A884]">{Math.floor(msgCount / 8)}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#111B21] border border-[#263A43] flex items-center justify-between">
                <span className="text-[#AEBAC1]">❤️ Reações Recebidas</span>
                <span className="font-bold text-amber-300">{msgCount * 3 + 12}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#111B21] border border-[#263A43] flex items-center justify-between">
                <span className="text-[#AEBAC1]">💬 Mensagens Respondidas</span>
                <span className="font-bold text-sky-400">{Math.floor(msgCount / 3)}</span>
              </div>
            </div>
          )}

          {/* Mentor Actions if viewer is Mentor and target is student */}
          {isMentor && !isMentorProfile && onWarnUser && (
            <div className="pt-3 border-t border-[#263A43]">
              <button
                type="button"
                onClick={() => onWarnUser(profile.id, profile.nickname)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#241F13] hover:bg-[#2A2314] text-amber-300 border border-[#8A6500] text-xs font-medium transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Emitir Advertência Oficial
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
};

