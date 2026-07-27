import React from 'react';
import { ExternalLink, Key, CheckCircle2, AlertTriangle, LogOut } from 'lucide-react';

interface HeaderProps {
  onOpenCreate?: () => void;
  onOpenImport?: () => void;
  onOpenMultiAgent?: () => void;
  onOpenExport?: () => void;
  onResetDefaults?: () => void;
  onOpenApiKeyModal?: () => void;
  onDisconnectApiKey?: () => void;
  hasApiKey?: boolean;
  agentCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  agentCount,
  onOpenApiKeyModal,
  onDisconnectApiKey,
  hasApiKey,
}) => {
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



      </div>
    </header>
  );
};


