import React from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';
import { Agent } from '../../types';

interface AgentStatusBlockProps {
  agent: Agent;
}

export const AgentStatusBlock: React.FC<AgentStatusBlockProps> = ({ agent }) => {
  return (
    <div className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-100/90 border border-slate-200/90 text-slate-700 flex items-center justify-between gap-1.5 shadow-sm">
      <div className="flex items-center space-x-1.5 min-w-0">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 truncate">
          Status do Agente:
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold shadow-2xs">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>Pronto para usar</span>
        </div>

        <div className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-700 text-[10px] font-extrabold shadow-2xs">
          <Zap className="w-3 h-3 text-cyan-600 shrink-0" />
          <span className="hidden xs:inline">Chat Local</span>
          <span className="xs:hidden">Local</span>
        </div>
      </div>
    </div>
  );
};

