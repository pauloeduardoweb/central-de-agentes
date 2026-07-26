import React from 'react';
import { Bot, Plus, Download, Upload, Users, RotateCcw, Globe, ExternalLink } from 'lucide-react';

interface HeaderProps {
  onOpenCreate: () => void;
  onOpenImport: () => void;
  onOpenMultiAgent: () => void;
  onOpenExport: () => void;
  onResetDefaults: () => void;
  agentCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCreate,
  onOpenImport,
  onOpenMultiAgent,
  onOpenExport,
  onResetDefaults,
  agentCount,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-cyan-500/20 bg-white/90 dark:bg-[#020d14]/80 backdrop-blur-md px-4 lg:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Brand & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 font-black text-lg">
            Z
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Geração Z Pro
              </h1>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">|</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                Central de Agentes GPT
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {agentCount} {agentCount === 1 ? 'Agente' : 'Agentes'}
              </span>
            </div>
            <div className="flex items-center space-x-2 mt-0.5">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hub oficial de Agentes GPTs & Automações
              </p>
              <a
                href="https://geracaozpro.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <span>geracaozpro.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          
          <button
            onClick={onOpenMultiAgent}
            id="btn-multi-agent"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors shadow-xs"
          >
            <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Modo Equipe</span>
          </button>

          <button
            onClick={onOpenImport}
            id="btn-import-gpt"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Importar GPT</span>
          </button>

          <button
            onClick={onOpenExport}
            id="btn-export-agents"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Backup / Exportar</span>
          </button>

          <button
            onClick={onOpenCreate}
            id="btn-create-agent"
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Agente</span>
          </button>

          <button
            onClick={onResetDefaults}
            id="btn-reset-defaults"
            title="Restaurar Agentes Padrão"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};

