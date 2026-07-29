import React from 'react';
import { ShieldCheck, Zap, CheckCircle2 } from 'lucide-react';
import { Agent } from '../../types';

interface AgentStatusBlockProps {
  agent: Agent;
}

export const AgentStatusBlock: React.FC<AgentStatusBlockProps> = ({ agent }) => {
  return (
    <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/90 text-slate-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400/90 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          STATUS DO AGENTE
        </span>
        <span className="text-[10px] font-semibold text-slate-400">
          Geração Z Pro
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-semibold text-slate-300">
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Pronto para usar</span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>Chat Local disponível</span>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Sem necessidade de API</span>
        </div>
      </div>
    </div>
  );
};
