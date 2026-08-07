import React from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';
import { Agent } from '../../types';

interface AgentStatusBlockProps {
  agent: Agent;
}

export const AgentStatusBlock: React.FC<AgentStatusBlockProps> = ({ agent }) => {
  return (
    <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-900/60 border border-slate-800/80 text-slate-200 flex items-center justify-between gap-1.5">
      <div className="flex items-center space-x-1.5 min-w-0">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-[10px] sm:text-[11px] font-bold text-slate-300 truncate">
          Status do Agente:
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>Pronto para usar</span>
        </div>

        <div className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-cyan-950/70 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold">
          <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="hidden xs:inline">Chat Local</span>
          <span className="xs:hidden">Local</span>
        </div>
      </div>
    </div>
  );
};

