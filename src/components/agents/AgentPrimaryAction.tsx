import React from 'react';
import { Zap, ArrowRight } from 'lucide-react';
import { Agent } from '../../types';

interface AgentPrimaryActionProps {
  agent: Agent;
  onOpenLocal: (agent: Agent) => void;
}

export const AgentPrimaryAction: React.FC<AgentPrimaryActionProps> = ({ agent, onOpenLocal }) => {
  return (
    <button
      onClick={() => onOpenLocal(agent)}
      className="group relative w-full text-left p-2.5 sm:p-3.5 rounded-2xl bg-gradient-to-r from-[#09223e] via-[#081c33] to-[#051426] border-2 border-cyan-400/80 hover:border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] transition-all duration-200 cursor-pointer overflow-hidden z-10 active:scale-[0.99]"
    >
      {/* Horizontal Light Beam Sweep Effect */}
      <div className="absolute inset-0 opacity-30 pointer-events-none overflow-hidden rounded-2xl">
        <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent transform -skew-x-12 -translate-x-full animate-[shimmer_1.2s_ease-out_1_forwards]" />
      </div>

      <div className="relative z-10 flex items-center justify-between gap-2.5">
        <div className="space-y-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center flex-wrap gap-1">
            <span className="px-2 py-0.2 rounded-full bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 text-[9px] font-black uppercase tracking-wider shadow-sm">
              ★ RECOMENDADO
            </span>
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 text-[9px] font-extrabold uppercase">
              CHAT LOCAL
            </span>
          </div>

          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5 group-hover:text-cyan-200 transition-colors">
              <Zap className="w-4 h-4 text-cyan-400 fill-cyan-400/30 shrink-0" />
              <span>ABRIR NO APP (BETA)</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-300/90 font-medium leading-tight truncate">
              Crie seus prompts diretamente dentro da plataforma.
            </p>
          </div>
        </div>

        {/* Action Button Icon Indicator */}
        <div className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-400 text-slate-950 font-black flex items-center justify-center shadow-md shadow-cyan-500/30 group-hover:scale-105 transition-transform">
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>
    </button>
  );
};

