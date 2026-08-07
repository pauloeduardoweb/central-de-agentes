import React from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';
import { Agent } from '../../types';

interface AgentStatusBlockProps {
  agent: Agent;
}

export const AgentStatusBlock: React.FC<AgentStatusBlockProps> = ({ agent }) => {
  return (
    <div className="px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl bg-[#0a192e]/80 border border-cyan-500/25 text-slate-200 flex items-center justify-between gap-2 shadow-sm">
      <div className="flex items-center space-x-2 min-w-0">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span className="text-[10px] sm:text-[11px] font-bold text-slate-300 truncate">
          Status do Agente:
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold shadow-sm">
          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>Pronto para usar</span>
        </div>

        <div className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-[10px] font-extrabold shadow-sm">
          <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="hidden xs:inline">Chat Local</span>
          <span className="xs:hidden">Local</span>
        </div>
      </div>
    </div>
  );
};

