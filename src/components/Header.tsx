import React, { useState } from 'react';
import { ExternalLink, Key, CheckCircle2, AlertTriangle, LogOut, Lock, Unlock, Copy, Check } from 'lucide-react';

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
}

export const Header: React.FC<HeaderProps> = ({
  agentCount,
  onOpenApiKeyModal,
  onDisconnectApiKey,
  hasApiKey,
  studentCode,
}) => {
  const [isKeyHidden, setIsKeyHidden] = useState(true);
  const [copied, setCopied] = useState(false);

  const formatKeyDisplay = (code?: string) => {
    if (!code) return 'NÃO DEFINIDA';
    const upper = code.trim().toUpperCase();
    if (!isKeyHidden) return upper;

    if (upper.includes('-')) {
      const parts = upper.split('-');
      if (parts.length >= 3) {
        return `${parts[0]}-••••-••••`;
      }
      return `${parts[0]}-••••`;
    }
    if (upper.length > 6) {
      return `${upper.slice(0, 4)}••••${upper.slice(-2)}`;
    }
    return '••••••••';
  };

  const handleCopyKey = () => {
    if (studentCode) {
      navigator.clipboard.writeText(studentCode.trim().toUpperCase());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-cyan-500/20 bg-[#020d14]/90 backdrop-blur-md px-4 lg:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        
        {/* Brand & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 font-black text-lg">
            Z
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black tracking-tight text-white">
                Geração Z Pro
              </h1>
              <span className="text-xs font-semibold text-slate-500">|</span>
              <span className="text-sm font-bold text-emerald-400">
                Central de Agentes GPT
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                {agentCount} {agentCount === 1 ? 'Agente' : 'Agentes'}
              </span>
            </div>
            <div className="flex items-center space-x-2 mt-0.5">
              <p className="text-xs text-slate-400">
                Hub oficial de Agentes GPTs & Automações
              </p>
              <a
                href="https://geracaozpro.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-400 hover:underline"
              >
                <span>geracaozpro.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* API Key & Student Access Management Action */}
        <div className="flex items-center space-x-2">
          {hasApiKey && (
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              {/* Online 1/1 Badge */}
              <div 
                className="flex items-center space-x-1.5 px-2.5 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-sm"
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
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-cyan-200 text-xs font-mono font-bold shadow-sm">
                  <span className="text-slate-400 font-sans font-medium text-[11px] hidden sm:inline">Chave:</span>
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
                    className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors focus:outline-none hidden md:block"
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
            </div>
          )}

          <button
            onClick={onOpenApiKeyModal}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 border transition-all shadow-sm ${
              hasApiKey
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 hover:border-emerald-400'
                : 'bg-amber-500/10 border-amber-500/50 text-amber-400 hover:bg-amber-500/20 animate-pulse'
            }`}
            title="Clique para ver ou alterar seu código de acesso de aluno"
          >
            <Key className="w-4 h-4 shrink-0" />
            <span className="hidden lg:inline">
              {hasApiKey ? 'Acesso Liberado' : 'Digitar Código do Aluno'}
            </span>
            {hasApiKey ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            )}
          </button>

          {hasApiKey && (
            <button
              onClick={onDisconnectApiKey}
              className="px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-rose-500/40 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 hover:border-rose-400 transition-all shadow-sm"
              title="Sair e remover código do navegador"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">Sair</span>
              <span className="md:hidden">Sair</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};


