import React from 'react';
import { ExternalLink } from 'lucide-react';

interface HeaderProps {
  onOpenCreate?: () => void;
  onOpenImport?: () => void;
  onOpenMultiAgent?: () => void;
  onOpenExport?: () => void;
  onResetDefaults?: () => void;
  agentCount: number;
}

export const Header: React.FC<HeaderProps> = ({ agentCount }) => {
  return (
    <header className="sticky top-0 z-30 border-b border-cyan-500/20 bg-[#020d14]/90 backdrop-blur-md px-4 lg:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        
        {/* Brand & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-emerald-400 to-emerald-300 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#03131e] rounded-[10px] flex items-center justify-center font-bold text-emerald-400 text-base">
              Z
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-slate-100 tracking-tight">
                Geração Z Pro
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-medium">
                Central de Agentes GPT
              </span>
              <span className="hidden sm:inline-flex text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-medium">
                {agentCount} Agentes
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block mt-0.5">
              Hub oficial de Agentes GPTs & Automações{' '}
              <a
                href="https://geracaozpro.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline inline-flex items-center gap-0.5 font-medium"
              >
                geracaozpro.com <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </p>
          </div>
        </div>

      </div>
    </header>
  );
};
