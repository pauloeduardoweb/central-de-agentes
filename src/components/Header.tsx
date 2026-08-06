import React, { useState, useEffect, useRef } from 'react';
import { Key, AlertTriangle, LogOut, Lock, Unlock, Copy, Check, Crown, Bot, MessageSquare, ChevronDown } from 'lucide-react';
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
  const [isMentorMenuOpen, setIsMentorMenuOpen] = useState(false);
  const mentorMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mentorMenuRef.current && !mentorMenuRef.current.contains(event.target as Node)) {
        setIsMentorMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const isMainPanel = activeView !== 'chat';

  return (
    <header className={`relative z-50 shrink-0 border-b border-cyan-500/20 bg-[#020d14]/95 backdrop-blur-md transition-all pt-[max(6px,env(safe-area-inset-top))] ${
      activeView === 'chat' ? 'pb-1.5 px-2 min-h-0' : 'px-3 sm:px-6 py-2 sm:py-3'
    }`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
        
        {/* Navigation Tabs (LINHA 1 ON MOBILE) */}
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
              onClick={() => {
                setIsMentorMenuOpen(false);
                onSelectView('hub');
              }}
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
              onClick={() => {
                setIsMentorMenuOpen(false);
                onSelectView('chat');
              }}
              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 sm:space-x-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                activeView === 'chat'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Bate-papo</span>
            </button>

            {/* Mentor ▼ Dropdown Trigger */}
            <div className="relative inline-block text-left shrink-0" ref={mentorMenuRef}>
              <button
                type="button"
                onClick={() => setIsMentorMenuOpen(!isMentorMenuOpen)}
                className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 sm:space-x-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  activeView === 'mentor' || isMentorMenuOpen
                    ? 'bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 text-white shadow-md'
                    : 'text-cyan-300 hover:text-white hover:bg-cyan-950/40'
                }`}
              >
                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Mentor</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 text-cyan-300 ${isMentorMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu Mentor */}
              {isMentorMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-50 bg-[#081b29] border border-cyan-500/40 rounded-xl shadow-2xl p-1.5 min-w-[170px] space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMentorMenuOpen(false);
                      if (onSelectView) onSelectView('mentor');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-cyan-300 hover:text-white hover:bg-cyan-900/50 flex items-center space-x-2 transition-all cursor-pointer"
                  >
                    <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Painel do Mentor</span>
                  </button>

                  {onDisconnectApiKey && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMentorMenuOpen(false);
                        onDisconnectApiKey();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-rose-300 hover:text-rose-100 hover:bg-rose-950/70 flex items-center space-x-2 transition-all cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Sair</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* LINHA 2 ON MOBILE, RIGHT SIDE ON DESKTOP — SOMENTE NO PAINEL PRINCIPAL */}
        {hasApiKey && isMainPanel && (
          <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap w-full sm:w-auto">
            {/* Online 1/1 Badge */}
            <div 
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold shadow-xs shrink-0"
              title="Online 1/1"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span>Online 1/1</span>
            </div>

            {/* Chave de Acesso */}
            {studentCode && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-cyan-200 text-[11px] font-mono font-bold shadow-xs shrink-0">
                <span className="text-slate-400 font-sans font-medium text-[10px] hidden sm:inline">Chave de acesso:</span>
                <span className="tracking-wider text-emerald-400 select-all">
                  {formatKeyDisplay(studentCode)}
                </span>

                {/* Lock / Unlock Toggle Button */}
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

                {/* Copy Button */}
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

      {/* MOBILE CENTRAL DE AGENTES MINI PERFIL LIMPO (SEM REPETIR ONLINE 1/1 OU CHAVE) */}
      {activeView === 'hub' && hasApiKey && profile && (
        <div 
          className="sm:hidden max-w-7xl mx-auto border border-cyan-500/30 rounded-xl p-2 mt-2 shadow-lg bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `linear-gradient(rgba(0, 8, 28, 0.78), rgba(0, 18, 55, 0.88)), url('/assets/fundo-geracao-z-pro.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
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
                return (
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-extrabold text-xs text-white truncate max-w-[160px]">
                        {profile?.nickname || (isMentorUser ? 'Mentor Bigode' : 'Aluno Z Pro')}
                      </span>
                    </div>
                    <div className="text-[10px] text-cyan-300/90 font-mono font-medium truncate flex items-center gap-1.5">
                      <span>🏆 Nível {profile?.level || 1}</span>
                      <span className="text-cyan-500/50">•</span>
                      <span className={isMentorUser ? "text-amber-300 font-bold" : "text-cyan-200"}>
                        {isMentorUser ? "👑 Mentor" : "Aluno Z Pro"}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};



