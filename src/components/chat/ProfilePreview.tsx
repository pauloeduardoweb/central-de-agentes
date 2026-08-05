import React from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, MessageSquare, Shield, CheckCircle2, UserCheck, AlertTriangle, Pencil, Check } from 'lucide-react';
import { getAvatarGradient, getNicknameInitials } from '../../utils/avatarUtils';
import { resolveChatMediaUrl } from '../../utils/chatMediaUrl';
import { isMasterKey } from '../../data/studentCodes';

interface ProfilePreviewProps {
  profile: {
    id: number;
    nickname: string;
    photo_url: string | null;
    bio: string | null;
    phone?: string | null;
    phone_visibility?: string | null;
    is_moderator?: boolean | number;
    created_at?: string;
    message_count?: number;
    photos_count?: number;
    gifs_count?: number;
    audio_count?: number;
    stickers_count?: number;
    reply_count?: number;
    reactions_received_count?: number;
    reactions_given_count?: number;
    favorites_count?: number;
    xp?: number;
    level?: number;
    chat_status?: string;
    online_status?: 'ONLINE' | 'AWAY' | 'OFFLINE';
    last_seen?: string;
  } | null;
  isMentor?: boolean;
  studentCode?: string;
  currentProfileId?: number;
  onClose: () => void;
  onOpenAvatar?: (url: string, nickname: string) => void;
  onWarnUser?: (profileId: number, nickname: string) => void;
  onSearchUserMessages?: (nickname: string) => void;
  onStartPrivateChat?: (profile: any) => void;
}

export const ProfilePreview: React.FC<ProfilePreviewProps> = ({
  profile,
  isMentor,
  studentCode,
  currentProfileId,
  onClose,
  onOpenAvatar,
  onWarnUser,
  onSearchUserMessages,
  onStartPrivateChat,
}) => {
  const [activeTab, setActiveTab] = React.useState<'PROFILE' | 'BADGES' | 'STATS'>('PROFILE');
  const [actionSuccessMsg, setActionSuccessMsg] = React.useState<string | null>(null);
  const [isContact, setIsContact] = React.useState<boolean>(false);
  const [loadingContact, setLoadingContact] = React.useState<boolean>(false);

  // Bio Editing State
  const [isEditingBio, setIsEditingBio] = React.useState<boolean>(false);
  const [bioInput, setBioInput] = React.useState<string>(profile?.bio || '');
  const [savingBio, setSavingBio] = React.useState<boolean>(false);
  const [currentBio, setCurrentBio] = React.useState<string | null>(profile?.bio || null);

  const isOwnProfile = Boolean(
    profile && currentProfileId !== undefined && Number(profile.id) === Number(currentProfileId)
  );

  React.useEffect(() => {
    if (profile) {
      setCurrentBio(profile.bio || null);
      setBioInput(profile.bio || '');
    }
  }, [profile?.id, profile?.bio]);

  const handleSaveBio = async () => {
    if (!profile || savingBio || !studentCode) return;
    const trimmed = bioInput.trim();
    // Basic sanitization against raw HTML tags
    const cleanBio = trimmed.replace(/<[^>]*>?/gm, '');

    setSavingBio(true);
    try {
      const res = await fetch('/api/chat/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
        },
        body: JSON.stringify({ bio: cleanBio || null }),
      });
      const data = await res.json();
      if (data.success) {
        const savedBio = cleanBio || null;
        setCurrentBio(savedBio);
        if (profile) {
          profile.bio = savedBio;
        }
        setIsEditingBio(false);
        setActionSuccessMsg('Descrição atualizada com sucesso.');
        setTimeout(() => setActionSuccessMsg(null), 3000);
      } else {
        alert(data.message || 'Erro ao atualizar bio.');
      }
    } catch (err) {
      console.error('Error saving bio:', err);
    } finally {
      setSavingBio(false);
    }
  };

  // Check contact status on profile change
  React.useEffect(() => {
    if (!profile || !studentCode) return;
    let isMounted = true;
    fetch(`/api/chat/contacts/check/${profile.id}`, {
      headers: { 'x-access-code': studentCode },
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data && typeof data.is_contact === 'boolean') {
          setIsContact(data.is_contact);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [profile?.id, studentCode]);

  const handleToggleContact = async () => {
    if (!profile || !studentCode || loadingContact) return;
    setLoadingContact(true);
    try {
      if (isContact) {
        const res = await fetch(`/api/chat/contacts/${profile.id}`, {
          method: 'DELETE',
          headers: { 'x-access-code': studentCode },
        });
        const data = await res.json();
        if (data.success) {
          setIsContact(false);
          setActionSuccessMsg('Contato removido.');
        }
      } else {
        const res = await fetch('/api/chat/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-access-code': studentCode,
          },
          body: JSON.stringify({ contactProfileId: profile.id }),
        });
        const data = await res.json();
        if (data.success) {
          setIsContact(true);
          setActionSuccessMsg('Contato adicionado!');
        } else if (data.message) {
          setActionSuccessMsg(data.message);
        }
      }
    } catch (err) {
      console.error('Error toggling contact:', err);
    } finally {
      setLoadingContact(false);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    }
  };

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

  const isMentorProfile = Boolean(profile.is_mentor) || profile.nickname === 'Mentor Bigode' || Boolean((profile as any).codigo && isMasterKey((profile as any).codigo)) || Boolean((profile as any).code && isMasterKey((profile as any).code)) || Boolean((profile as any).access_code && isMasterKey((profile as any).access_code));
  const msgCount = profile.message_count !== undefined ? profile.message_count : 0;
  const xpCount = profile.xp !== undefined ? profile.xp : (msgCount * 15);
  const userLevel = profile.level !== undefined ? profile.level : Math.min(100, Math.max(1, Math.floor(xpCount / 200) + 1));
  const currentLevelXp = xpCount % 200;
  const levelProgressPercent = Math.min(100, Math.round((currentLevelXp / 200) * 100));

  const isOnline = profile.online_status === 'ONLINE' || profile.chat_status === 'ACTIVE';

  const userBadges = [
    { icon: '🔥', title: 'Primeira Mensagem', desc: 'Mandou a primeira mensagem na comunidade', unlocked: msgCount >= 1 },
    { icon: '💎', title: '100 Mensagens', desc: 'Superou 100 contribuições no grupo', unlocked: msgCount >= 100 },
    { icon: '🚀', title: '500 Mensagens', desc: 'Membro com engajamento altíssimo', unlocked: msgCount >= 500 },
    { icon: '🏆', title: 'Top 10', desc: 'Está entre os melhores do Ranking', unlocked: userLevel >= 3 || msgCount >= 50 },
    { icon: '👑', title: 'Mentor Oficial', desc: 'Equipe oficial de mentoria Z Pro', unlocked: isMentorProfile },
    { icon: '⭐', title: 'Membro Ativo', desc: 'Acessa e participa frequentemente', unlocked: msgCount >= 5 },
    { icon: '💬', title: 'Conversador', desc: 'Inicia debates e tira dúvidas de alunos', unlocked: msgCount >= 20 },
    { icon: '🎯', title: 'Respondeu 100 Pessoas', desc: 'Ajudou outros alunos em dúvidas', unlocked: (profile.reply_count ?? 0) >= 10 },
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
            <div className="relative shrink-0">
              <div className="p-0.5 rounded-full bg-[#111B21]">
                {profile.photo_url ? (
                  <img
                    src={resolveChatMediaUrl(profile.photo_url)}
                    alt={profile.nickname}
                    className="w-24 h-24 rounded-full object-cover border-2 border-[#00A884] shadow-md"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full border-2 border-[#00A884] shadow-md bg-[#182229] flex items-center justify-center font-bold text-2xl text-[#00A884]">
                    {getNicknameInitials(profile.nickname)}
                  </div>
                )}
              </div>

              {/* Online indicator dot */}
              <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-[#111B21] ${isOnline ? 'bg-[#00A884]' : 'bg-[#AEBAC1]'}`} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white flex items-center gap-1.5 truncate">
                  {profile.nickname}
                  {isMentorProfile && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </h3>

                {onStartPrivateChat && profile && profile.id !== currentProfileId && isContact && (
                  <button
                    type="button"
                    onClick={() => {
                      onStartPrivateChat(profile);
                      onClose();
                    }}
                    title={`Conversar com ${profile.nickname}`}
                    aria-label={`Conversar com ${profile.nickname}`}
                    className="px-2.5 py-1 rounded-lg bg-[#00A884]/20 hover:bg-[#00A884]/30 border border-[#00A884]/50 text-xs text-[#00A884] hover:text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0 active:scale-95"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#00A884]" />
                    <span>Conversar</span>
                  </button>
                )}
              </div>

              {/* Bio Display or Inline Edit */}
              {isEditingBio ? (
                <div className="mt-2 space-y-1.5">
                  <div className="relative">
                    <textarea
                      value={bioInput}
                      onChange={(e) => setBioInput(e.target.value.slice(0, 160))}
                      maxLength={160}
                      rows={2}
                      placeholder="Escreva uma descrição para seu perfil..."
                      className="w-full p-2 bg-[#182229] border border-[#00A884]/60 rounded-xl text-xs text-white placeholder-[#AEBAC1] focus:outline-none focus:border-[#00A884] resize-none"
                    />
                    <div className="text-[10px] text-[#AEBAC1] text-right font-mono mt-0.5">
                      {bioInput.length}/160
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingBio(false);
                        setBioInput(currentBio || '');
                      }}
                      disabled={savingBio}
                      className="px-2.5 py-1 rounded-lg bg-[#182229] border border-[#263A43] text-[11px] font-bold text-[#AEBAC1] hover:text-white transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveBio}
                      disabled={savingBio}
                      className="px-2.5 py-1 rounded-lg bg-[#00A884] hover:bg-[#008f70] text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      {savingBio ? (
                        <span>Salvando...</span>
                      ) : (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Salvar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-1 flex items-start gap-1.5 group">
                  <p className="text-xs text-[#AEBAC1] line-clamp-3 leading-relaxed flex-1">
                    {currentBio?.trim() ? currentBio : 'Adicione uma descrição ao seu perfil.'}
                  </p>
                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        setBioInput(currentBio || '');
                        setIsEditingBio(true);
                      }}
                      title="Editar descrição do perfil"
                      aria-label="Editar descrição do perfil"
                      className="p-1 rounded-lg hover:bg-[#182229] text-[#AEBAC1] hover:text-[#00A884] transition-colors cursor-pointer shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
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
                  <span className="text-[10px] text-[#AEBAC1]">Nível Atual</span>
                  <span className="text-sm font-bold text-emerald-400">⚡ Nível {userLevel}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#111B21] border border-[#263A43] flex flex-col">
                  <span className="text-[10px] text-[#AEBAC1]">Reações Recebidas</span>
                  <span className="text-sm font-bold text-sky-400">❤️ {profile.reactions_received_count ?? 0}</span>
                </div>
              </div>

              {/* Action Buttons Menu */}
              <div className="space-y-1.5 pt-1">
                {studentCode && profile && profile.id !== currentProfileId && (
                  <button
                    type="button"
                    onClick={handleToggleContact}
                    disabled={loadingContact}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                      isContact
                        ? 'bg-amber-950/60 border-amber-600/50 text-amber-300 hover:bg-amber-900/60'
                        : 'bg-[#182F2A] border-[#00A884]/40 text-[#00A884] hover:bg-[#1E3B34]'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{isContact ? 'Remover dos Meus Contatos' : 'Adicionar aos Meus Contatos'}</span>
                  </button>
                )}

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
                <span className="text-[#AEBAC1]">✉️ Mensagens Enviadas</span>
                <span className="font-bold text-[#00A884]">{msgCount}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#111B21] border border-[#263A43] flex items-center justify-between">
                <span className="text-[#AEBAC1]">💬 Respostas</span>
                <span className="font-bold text-sky-400">{profile.reply_count ?? 0}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#111B21] border border-[#263A43] flex items-center justify-between">
                <span className="text-[#AEBAC1]">🖼️ Fotos Compartilhadas</span>
                <span className="font-bold text-[#00A884]">{profile.photos_count ?? 0}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#111B21] border border-[#263A43] flex items-center justify-between">
                <span className="text-[#AEBAC1]">👾 GIFs Enviados</span>
                <span className="font-bold text-[#00A884]">{profile.gifs_count ?? 0}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#111B21] border border-[#263A43] flex items-center justify-between">
                <span className="text-[#AEBAC1]">🎙️ Áudios Enviados</span>
                <span className="font-bold text-[#00A884]">{profile.audio_count ?? 0}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#111B21] border border-[#263A43] flex items-center justify-between">
                <span className="text-[#AEBAC1]">🏷️ Stickers Enviados</span>
                <span className="font-bold text-[#00A884]">{profile.stickers_count ?? 0}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#111B21] border border-[#263A43] flex items-center justify-between">
                <span className="text-[#AEBAC1]">❤️ Reações Recebidas</span>
                <span className="font-bold text-amber-300">{profile.reactions_received_count ?? 0}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#111B21] border border-[#263A43] flex items-center justify-between">
                <span className="text-[#AEBAC1]">👍 Reações Realizadas</span>
                <span className="font-bold text-amber-300">{profile.reactions_given_count ?? 0}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#111B21] border border-[#263A43] flex items-center justify-between">
                <span className="text-[#AEBAC1]">⭐ Favoritos</span>
                <span className="font-bold text-yellow-400">{profile.favorites_count ?? 0}</span>
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

