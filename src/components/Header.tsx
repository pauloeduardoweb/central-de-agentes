import React, { useState, useEffect } from 'react';
import { Key, AlertTriangle, Lock, Unlock, Copy, Check, Crown, Bot, MessageSquare } from 'lucide-react';
import { resolveChatMediaUrl } from '../utils/chatMediaUrl';
import { getNicknameInitials } from '../utils/avatarUtils';
import { isMasterKey } from '../data/studentCodes';

interface HeaderProps {
  onOpenCreate?: () => void;
  onOpenImport?: () => void;
  onOpenMultiAgent?: () => void;
  onOpenExport?: () => void;
  onResetDefaults?: () => void;
  onOpenApiKeyModal?: () => void;
  onDisconnectApiKey?: () => void;
  hasApiKey?: boolean;
  studentCode?: string;
  agentCount: number;
  isMaster?: boolean;
  activeView?: 'hub' | 'mentor' | 'chat';
  onSelectView?: (view: 'hub' | 'mentor' | 'chat') => void;
}

export const Header: React.FC<HeaderProps> = ({
  agentCount,
  onOpenApiKeyModal,
  onDisconnectApiKey,
  hasApiKey,
  studentCode,
  isMaster = false,
  activeView = 'hub',
  onSelectView,
}) => {
  const [isKeyHidden, setIsKeyHidden] = useState(true);
  const [copied, setCopied] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!studentCode) return;
    fetch('/api/chat/profile', {
      headers: {
        'x-student-access-code': studentCode,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.profile) {
          setProfile(data.profile);
        }
      })
      .catch(() => {});
  }, [studentCode]);

  const formatKeyDisplay = (code?: string) => {
    if (!code) return 'NÃO DEFINIDA';
    const upper = code.trim().toUpperCase();
    if (!isKeyHidden) return upper;
    return '***-***';
  };

  const handleCopyKey = () => {
    if (studentCode) {
      navigator.clipboard.writeText(studentCode.trim().toUpperCase());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className={`relative z-50 shrink-0 border-b border-cyan-500/20 bg-[#020d14]/95 backdrop-blur-md transition-all pt-[max(6px,env(safe-area-inset-top))] ${
      activeView === 'chat' ? 'pb-1.5 px-2 min-h-0' : 'px-3 sm:px-6 py-2 sm:py-3'
    }`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        
        {/* Navigation Tabs (Agentes | Bate-papo | Mentor) */}
        {hasApiKey && onSelectView && (
          <div 
            className="flex items-center justify-center sm:justify-start space-x-1 bg-slate-900/90 p-1 rounded-xl border border-cyan-500/30 shadow-xs shrink-0 w-full sm:w-auto overflow-x-auto no-scrollbar bg-cover bg-center bg-no-repeat"
            style={
              activeView === 'hub'
                ? {
                    backgroundImage: `linear-gradient(rgba(0, 8, 28, 0.78), rgba(0, 18, 55, 0.88)), url('/assets/fundo-geracao-z-pro.jpg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }
                : undefined
            }
          >
            {/* Agentes */}
            <button
              type="button"
              onClick={() => onSelectView('hub')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 sm:space-x-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'hub'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden sm:inline">Central de Agentes</span>
              <span className="sm:hidden">Agentes</span>
            </button>

            {/* Bate-papo */}
            <button
              type="button"
              onClick={() => onSelectView('chat')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 sm:space-x-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'chat'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Bate-papo</span>
            </button>

            {/* Mentor Button - Opens Mentor Panel directly */}
            <button
              type="button"
              onClick={() => onSelectView('mentor')}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 sm:space-x-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'mentor'
                  ? 'bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 text-white shadow-md'
                  : 'text-cyan-300 hover:text-white hover:bg-cyan-950/40'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Painel do Mentor</span>
              <span className="sm:hidden">Mentor</span>
            </button>
          </div>
        )}

        {/* Digitar Código Button (Shown only when not logged in) */}
        {!hasApiKey && (
          <button
            type="button"
            onClick={onOpenApiKeyModal}
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 animate-pulse transition-all shadow-sm shrink-0"
            title="Clique para digitar seu código de acesso de aluno"
          >
            <Key className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
            <span>Digitar Código</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </button>
        )}

      </div>

      {/* CARD DE PERFIL AZUL (NO PAINEL PRINCIPAL) */}
      {activeView === 'hub' && hasApiKey && (
        <div 
          className="max-w-7xl mx-auto border border-cyan-500/30 rounded-xl p-2.5 space-y-2 mt-2 shadow-lg bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 8, 28, 0.78), rgba(0, 18, 55, 0.88)), url('/assets/fundo-geracao-z-pro.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* Linha 1: (Foto) Bigode 👑 Mentor    🔑 ***-*** */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 shrink-0 shadow-xs">
                {profile?.photo_url ? (
                  <img
                    src={resolveChatMediaUrl(profile.photo_url)}
                    alt={profile?.nickname || 'Perfil'}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-[10px] text-cyan-300">
                    {getNicknameInitials(profile?.nickname || 'Aluno')}
                  </div>
                )}
              </div>

              {(() => {
                const isMentorUser = isMaster || Boolean(profile?.is_mentor) || Boolean(studentCode && isMasterKey(studentCode));
                const userNickname = profile?.nickname || (isMentorUser ? 'Mentor Bigode' : 'Aluno Z Pro');
                return (
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <span className="font-extrabold text-xs sm:text-sm text-white truncate max-w-[130px] sm:max-w-[200px]">
                      {userNickname}
                    </span>
                    {isMentorUser && (
                      <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[10px] shrink-0">
                        <span>👑</span>
                        <span>Mentor</span>
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Chave de Acesso */}
            {studentCode && (
              <div className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-cyan-200 text-[10px] font-mono font-bold shrink-0">
                <span className="tracking-wider text-emerald-400 select-all">
                  🔑 {formatKeyDisplay(studentCode)}
                </span>

                <button
                  type="button"
                  onClick={() => setIsKeyHidden(!isKeyHidden)}
                  className="p-0.5 rounded text-slate-400 hover:text-white transition-colors focus:outline-none cursor-pointer"
                  title={isKeyHidden ? "Revelar chave" : "Ocultar chave"}
                >
                  {isKeyHidden ? (
                    <Lock className="w-3 h-3 text-amber-400" />
                  ) : (
                    <Unlock className="w-3 h-3 text-emerald-400 font-bold animate-pulse" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="p-0.5 rounded text-slate-400 hover:text-cyan-300 transition-colors focus:outline-none cursor-pointer"
                  title="Copiar chave de acesso"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Linha 2: 🏆 Nível 1    🟢 Online 1/1 */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-cyan-500/20 text-xs">
            {/* Nível */}
            <div className="text-[11px] text-cyan-300 font-mono font-medium shrink-0 flex items-center space-x-1">
              <span>🏆 Nível {profile?.level || 1}</span>
            </div>

            {/* Online 1/1 */}
            <div 
              className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold shrink-0"
              title="Online 1/1"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span>Online 1/1</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};




