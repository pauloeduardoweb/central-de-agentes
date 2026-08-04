import React, { useState, useEffect } from 'react';
import { ExternalLink, Key, CheckCircle2, AlertTriangle, LogOut, Lock, Unlock, Copy, Check, Crown, Bot, MessageSquare } from 'lucide-react';
import { resolveChatMediaUrl } from '../utils/chatMediaUrl';
import { getNicknameInitials } from '../utils/avatarUtils';

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
      <div className={`max-w-7xl mx-auto flex items-center ${
        activeView === 'chat' || activeView === 'hub' ? 'justify-center sm:justify-between' : 'justify-between sm:justify-center'
      } flex-nowrap sm:flex-wrap gap-1.5 sm:gap-3`}>
        
        {/* Navigation Tabs for All Authenticated Users */}
        {hasApiKey && onSelectView && (
          <div 
            className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-cyan-500/30 shadow-xs flex-nowrap shrink-0 max-w-full overflow-x-auto no-scrollbar bg-cover bg-center bg-no-repeat"
            style={
              activeView === 'hub'
                ? {
                    backgroundImage: `linear-gradient(rgba(1, 10, 25, 0.72), rgba(1, 10, 25, 0.82)), url('/assets/fundo-geracao-z-pro.jpg')`,
                  }
                : undefined
            }
          >
            <button
              type="button"
              onClick={() => onSelectView('hub')}
              className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 sm:space-x-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'hub'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden sm:inline">Central de Agentes</span>
              <span className="sm:hidden">Agentes</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectView('chat')}
              className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 sm:space-x-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'chat'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Bate-papo</span>
            </button>

            {isMaster && (
              <button
                type="button"
                onClick={() => onSelectView('mentor')}
                className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 sm:space-x-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeView === 'mentor'
                    ? 'bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 text-white shadow-md'
                    : 'text-cyan-300 hover:text-white hover:bg-cyan-950/40'
                }`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Painel do Mentor</span>
                <span className="sm:hidden">Mentor</span>
              </button>
            )}

            {/* In mobile view (Hub or Chat), align Sair directly beside Bate-papo */}
            {(activeView === 'chat' || activeView === 'hub') && onDisconnectApiKey && (
              <button
                type="button"
                onClick={onDisconnectApiKey}
                className="sm:hidden px-2 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 border border-rose-500/40 bg-rose-950/80 text-rose-300 hover:bg-rose-900 transition-all shrink-0 active:scale-95 cursor-pointer whitespace-nowrap ml-0.5"
                title="Sair"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span>Sair</span>
              </button>
            )}
          </div>
        )}

        {/* Status, Key & Access Actions */}
        {hasApiKey && (
          <div className={`items-center gap-1.5 flex-wrap ${activeView === 'chat' || activeView === 'hub' ? 'hidden sm:flex' : 'flex'}`}>
            {/* Online 1/1 Badge */}
            <div 
              className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold shadow-xs shrink-0"
              title="Online 1/1"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span>Online 1/1</span>
            </div>

            {/* Active Key Display Badge with Lock Toggle */}
            {studentCode && (
              <div className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-cyan-200 text-[11px] font-mono font-bold shadow-xs shrink-0">
                <span className="text-slate-400 font-sans font-medium text-[10px] hidden sm:inline">Chave:</span>
                <span className="tracking-wider text-emerald-400 select-all">
                  {formatKeyDisplay(studentCode)}
                </span>

                {/* Lock / Unlock Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsKeyHidden(!isKeyHidden)}
                  className="p-0.5 rounded text-slate-400 hover:text-white transition-colors focus:outline-none"
                  title={isKeyHidden ? "Revelar chave" : "Ocultar chave"}
                >
                  {isKeyHidden ? (
                    <Lock className="w-3 h-3 text-amber-400" />
                  ) : (
                    <Unlock className="w-3 h-3 text-emerald-400 font-bold animate-pulse" />
                  )}
                </button>

                {/* Copy Button */}
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="p-0.5 rounded text-slate-400 hover:text-cyan-300 transition-colors focus:outline-none"
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

            {/* Sair Button (on Desktop in Chat mode, or on Mobile/Desktop in Hub mode) */}
            {onDisconnectApiKey && (
              <button
                type="button"
                onClick={onDisconnectApiKey}
                className="px-2.5 sm:px-2 py-1.5 sm:py-1 rounded-lg text-xs sm:text-[11px] font-bold flex items-center space-x-1.5 border border-rose-500/40 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 transition-all shadow-xs shrink-0 ml-1 sm:ml-2.5 active:scale-95 cursor-pointer min-h-[32px] sm:min-h-0"
                title="Sair"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-3 sm:h-3 shrink-0 text-rose-400" />
                <span>Sair</span>
              </button>
            )}
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

      {/* MOBILE CENTRAL DE AGENTES MINI PERFIL LIMPO */}
      {activeView === 'hub' && hasApiKey && (
        <div 
          className="sm:hidden max-w-7xl mx-auto border border-cyan-500/30 rounded-xl p-2.5 space-y-2 mt-2 shadow-lg bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 14, 28, 0.78), rgba(0, 18, 38, 0.88)), url('/assets/fundo-geracao-z-pro.jpg')`,
          }}
        >
          {/* LINHA 1: Foto, Nome, Indicador Online, Nível & XP */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              {/* Foto / Avatar Circular */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 shrink-0 shadow-xs">
                {profile?.photo_url ? (
                  <img
                    src={resolveChatMediaUrl(profile.photo_url)}
                    alt={profile?.nickname || 'FrutasFeliz'}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-cyan-300">
                    {getNicknameInitials(profile?.nickname || 'FrutasFeliz')}
                  </div>
                )}
              </div>

              {/* Nome + Nível & XP */}
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="font-extrabold text-xs text-white truncate max-w-[130px]">
                    {profile?.nickname || 'FrutasFeliz'}
                  </span>
                  {/* Badge Online */}
                  <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Online</span>
                  </span>
                </div>
                <div className="text-[10px] text-cyan-300/90 font-mono font-medium truncate mt-0.5">
                  🏆 Nível {profile?.level || 1} • {profile?.xp || 61} XP
                </div>
              </div>
            </div>
          </div>

          {/* LINHA 2: Badge Online 1/1 + Chave Mascarada + Cadeado + Copiar */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-cyan-500/20 text-xs">
            {/* Badge Online 1/1 */}
            <div className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span>Online 1/1</span>
            </div>

            {/* Chave de Acesso Mascarada */}
            {studentCode && (
              <div className="flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-cyan-200 text-[10px] font-mono font-bold shrink-0">
                <span className="tracking-wider text-emerald-400 select-all">
                  {formatKeyDisplay(studentCode)}
                </span>

                {/* Lock / Unlock Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsKeyHidden(!isKeyHidden)}
                  className="p-0.5 rounded text-slate-400 hover:text-white transition-colors focus:outline-none"
                  title={isKeyHidden ? "Revelar chave" : "Ocultar chave"}
                >
                  {isKeyHidden ? (
                    <Lock className="w-3 h-3 text-amber-400" />
                  ) : (
                    <Unlock className="w-3 h-3 text-emerald-400 font-bold animate-pulse" />
                  )}
                </button>

                {/* Copy Button */}
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="p-0.5 rounded text-slate-400 hover:text-cyan-300 transition-colors focus:outline-none"
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
        </div>
      )}
    </header>
  );
};



