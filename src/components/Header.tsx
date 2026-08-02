import React, { useState } from 'react';
import { ExternalLink, Key, CheckCircle2, AlertTriangle, LogOut, Lock, Unlock, Copy, Check, Crown, Bot } from 'lucide-react';

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
  activeView?: 'hub' | 'mentor';
  onSelectView?: (view: 'hub' | 'mentor') => void;
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
    <header className="sticky top-0 z-30 border-b border-cyan-500/20 bg-[#020d14]/90 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-2 sm:gap-3.5">
        
        {/* Navigation Tabs (Master View Toggle exclusively for MASTER) */}
        {isMaster && onSelectView && (
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-cyan-500/30 shadow-sm">
            <button
              onClick={() => onSelectView('hub')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                activeView === 'hub'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              <span>Central de Agentes</span>
            </button>
            <button
              onClick={() => onSelectView('mentor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                activeView === 'mentor'
                  ? 'bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                  : 'text-cyan-300 hover:text-white hover:bg-cyan-950/40'
              }`}
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Painel do Mentor</span>
            </button>
          </div>
        )}

        {/* Status, Key & Access Actions */}
        {hasApiKey && (
          <>
            {/* Online 1/1 Badge */}
            <div 
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-sm shrink-0"
              title="Sua licença está ativada e reconhecida exclusivamente para este dispositivo (1 Dispositivo Ativo)"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span>Online 1/1</span>
            </div>

            {/* Active Key Display Badge with Lock Toggle */}
            {studentCode && (
              <div className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-cyan-200 text-xs font-mono font-bold shadow-sm shrink-0">
                <span className="text-slate-400 font-sans font-medium text-[11px]">Chave:</span>
                <span className="tracking-wider text-emerald-400 select-all">
                  {formatKeyDisplay(studentCode)}
                </span>

                {/* Lock / Unlock Toggle Button */}
                <button
                  onClick={() => setIsKeyHidden(!isKeyHidden)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none"
                  title={isKeyHidden ? "Clique para revelar a chave de acesso em uso" : "Clique para ocultar e proteger a chave de acesso"}
                >
                  {isKeyHidden ? (
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-emerald-400 font-bold animate-pulse" />
                  )}
                </button>

                {/* Copy Button */}
                <button
                  onClick={handleCopyKey}
                  className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors focus:outline-none"
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
          </>
        )}

        {/* Digitar Código Button (Shown only when not logged in) */}
        {!hasApiKey && (
          <button
            onClick={onOpenApiKeyModal}
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 animate-pulse transition-all shadow-sm shrink-0"
            title="Clique para digitar seu código de acesso de aluno"
          >
            <Key className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
            <span>Digitar Código</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </button>
        )}

        {/* Sair Button */}
        {hasApiKey && (
          <button
            onClick={onDisconnectApiKey}
            className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-rose-500/40 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 hover:border-rose-400 transition-all shadow-sm shrink-0"
            title="Sair e remover código do navegador"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Sair</span>
          </button>
        )}

      </div>
    </header>
  );
};


