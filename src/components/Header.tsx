import React, { useState, useEffect } from 'react';
import { Key, AlertTriangle, Lock, Unlock, Copy, Check, Crown, Bot, MessageSquare, LogOut, Flame } from 'lucide-react';
import { resolveChatMediaUrl } from '../utils/chatMediaUrl';
import { getNicknameInitials } from '../utils/avatarUtils';
import { isMasterKey } from '../data/studentCodes';
import { getSafeImageUrl } from '../utils/imageUrl';

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
  activeView?: 'hub' | 'mentor' | 'chat' | 'miner';
  onSelectView?: (view: 'hub' | 'mentor' | 'chat' | 'miner') => void;
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
  const isMasterUser = Boolean(isMaster || isMasterKey(studentCode));

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
    <header className={`relative z-50 shrink-0 bg-transparent transition-all ${
      activeView === 'chat' ? 'pb-1.5 px-2 min-h-0 pt-[max(6px,env(safe-area-inset-top))]' : 'pt-[max(6px,env(safe-area-inset-top))] py-2 sm:py-3'
    }`}>
      {/* BLOCO 1 (NAVEGAÇÃO INDEPENDENTE - APENAS MOBILE < 768px) */}
      {hasApiKey && onSelectView && (
        <div className="md:hidden max-w-7xl mx-auto px-4 lg:px-8 mb-2">
          <div 
            className="relative p-1 rounded-xl bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 border border-cyan-500/40 shadow-xl shadow-cyan-950/40 shrink-0 w-full overflow-hidden backdrop-blur-md"
          >
            <div 
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="relative z-10 flex items-center justify-start gap-1 overflow-x-auto no-scrollbar">
              <div className="flex items-center space-x-1 shrink-0">
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

                {/* Minerador de Produtos */}
                <button
                  type="button"
                  onClick={() => onSelectView('miner')}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 sm:space-x-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    activeView === 'miner'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">Minerar Produtos</span>
                  <span className="sm:hidden">Minerar</span>
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

                {/* Mentor Button - SOMENTE PARA CHAVES MASTER */}
                {isMasterUser && (
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
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botão Digitar Código (Exibido apenas se não logado) */}
      {!hasApiKey && (
        <div className="max-w-7xl mx-auto px-4 lg:px-8 mb-2 flex justify-end">
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
        </div>
      )}

      {/* CARD ÚNICO DE PERFIL / NAVEGAÇÃO */}
      {hasApiKey && (
        <div 
          className={`max-w-7xl mx-auto px-4 lg:px-8 ${
            activeView === 'hub' ? 'block' : 'hidden md:block'
          }`}
        >
          <div className="relative border border-cyan-500/40 rounded-xl p-2.5 bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 shadow-xl shadow-cyan-950/40 backdrop-blur-md overflow-hidden">
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="relative z-10">
            {/* LAYOUT TABLET E DESKTOP (md:flex) - Linha única horizontal unificada */}
            <div className="hidden md:flex items-center justify-between gap-2 lg:gap-4 py-1 px-1 sm:px-2">
              {/* Lado Esquerdo: Perfil, Nickname, Badge, Nível */}
              <div className="flex items-center space-x-2 lg:space-x-3 min-w-0 shrink-0">
                <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 shrink-0 shadow-xs">
                  {profile?.photo_url ? (
                    <img
                      src={resolveChatMediaUrl(profile.photo_url)}
                      alt={profile?.nickname || 'Perfil'}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-[10px] lg:text-xs text-cyan-300">
                      {getNicknameInitials(profile?.nickname || 'Aluno')}
                    </div>
                  )}
                </div>

                {(() => {
                  const isMentorUser = isMaster || Boolean(profile?.is_mentor) || Boolean(studentCode && isMasterKey(studentCode));
                  const userNickname = profile?.nickname || (isMentorUser ? 'Mentor Bigode' : 'Aluno Z Pro');
                  return (
                    <div className="flex items-center space-x-1.5 lg:space-x-2 min-w-0">
                      <span className="font-extrabold text-xs lg:text-sm text-white truncate max-w-[100px] md:max-w-[130px] lg:max-w-[180px]">
                        {userNickname}
                      </span>
                      {isMentorUser && (
                        <span className="inline-flex items-center space-x-1 px-1.5 lg:px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[10px] lg:text-xs shrink-0">
                          <span>👑</span>
                          <span className="hidden lg:inline">Mentor</span>
                        </span>
                      )}
                      <span className="text-[11px] lg:text-xs text-cyan-300 font-mono font-medium shrink-0 ml-0.5 lg:ml-1">
                        🏆 Nível {profile?.level || 1}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* CENTRO: Menu de Navegação (Central de Agentes | Bate-papo | Painel do Mentor) */}
              {onSelectView && (
                <div className="flex items-center justify-center gap-1 shrink-0">
                  {/* Agentes */}
                  <button
                    type="button"
                    onClick={() => onSelectView('hub')}
                    className={`px-2.5 lg:px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 lg:space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
                      activeView === 'hub'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Central de Agentes</span>
                  </button>

                  {/* Minerador de Produtos */}
                  <button
                    type="button"
                    onClick={() => onSelectView('miner')}
                    className={`px-2.5 lg:px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 lg:space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
                      activeView === 'miner'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Minerar Produtos</span>
                  </button>

                  {/* Bate-papo */}
                  <button
                    type="button"
                    onClick={() => onSelectView('chat')}
                    className={`px-2.5 lg:px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 lg:space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
                      activeView === 'chat'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Bate-papo</span>
                  </button>

                  {/* Mentor Button - SOMENTE PARA CHAVES MASTER */}
                  {isMasterUser && (
                    <button
                      type="button"
                      onClick={() => onSelectView('mentor')}
                      className={`px-2.5 lg:px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1 lg:space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
                        activeView === 'mentor'
                          ? 'bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 text-white shadow-md'
                          : 'text-cyan-300 hover:text-white hover:bg-cyan-950/40'
                      }`}
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Painel do Mentor</span>
                    </button>
                  )}
                </div>
              )}

              {/* Lado Direito: Chave de Acesso + Indicador Online + Botão Sair */}
              <div className="flex items-center space-x-1.5 lg:space-x-2.5 shrink-0">
                {studentCode && (
                  <div className="flex items-center space-x-1 lg:space-x-1.5 px-2 lg:px-2.5 py-1 rounded-lg bg-slate-900/90 border border-cyan-500/30 text-cyan-200 text-[11px] lg:text-xs font-mono font-bold">
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
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Unlock className="w-3.5 h-3.5 text-emerald-400 font-bold animate-pulse" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="p-0.5 rounded text-slate-400 hover:text-cyan-300 transition-colors focus:outline-none cursor-pointer"
                      title="Copiar chave de acesso"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </div>
                )}

                <div 
                  className="flex items-center space-x-1 lg:space-x-1.5 px-2 lg:px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[11px] lg:text-xs font-semibold"
                  title="Online 1/1"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  <span>Online 1/1</span>
                </div>

                {/* Botão Sair Desktop */}
                {onDisconnectApiKey && (
                  <button
                    type="button"
                    onClick={onDisconnectApiKey}
                    className="px-2 lg:px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-rose-100 text-[11px] lg:text-xs font-bold flex items-center space-x-1 lg:space-x-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                    title="Sair da conta / Desconectar"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="hidden sm:inline">Sair</span>
                  </button>
                )}
              </div>
            </div>

            {/* LAYOUT MOBILE (md:hidden) - Perfil em destaque + Informações embaixo */}
            <div className="flex md:hidden flex-col space-y-2">
              {/* Linha 1 do Card: (Foto) Nickname 👑 Mentor + 🔑 Chave de Acesso (à direita) */}
              <div className="flex items-center justify-between gap-2">
                {/* Esquerda: Foto, Nickname, Badge Mentor */}
                <div className="flex items-center space-x-2 min-w-0">
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
                        <span className="font-extrabold text-xs text-white truncate max-w-[110px] sm:max-w-[160px]">
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

                {/* Direita: Chave de Acesso alinhada no canto superior direito do card */}
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

              {/* Linha 2 do Card (Abaixo do divisor): 🏆 Nível 1 (à esquerda) | 🟢 Online 1/1 + 🔴 Sair (à direita) */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-cyan-500/20 text-xs">
                {/* Esquerda: Nível */}
                <div className="text-[11px] text-cyan-300 font-mono font-medium shrink-0 flex items-center space-x-1">
                  <span>🏆 Nível {profile?.level || 1}</span>
                </div>

                {/* Direita: Badge Online 1/1 + Botão Sair */}
                <div className="flex items-center space-x-1.5 shrink-0">
                  {/* Badge Online 1/1 */}
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

                  {/* Botão Sair Mobile (Posicionado dentro do card, ao lado do Online 1/1) */}
                  {onDisconnectApiKey && (
                    <button
                      type="button"
                      onClick={onDisconnectApiKey}
                      className="px-2 py-0.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 hover:text-rose-100 text-[10px] font-bold flex items-center space-x-1 transition-all cursor-pointer shrink-0 min-h-[26px] active:scale-95"
                      title="Sair da conta"
                    >
                      <LogOut className="w-3 h-3 text-rose-400 shrink-0" />
                      <span>Sair</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </header>
  );
};




