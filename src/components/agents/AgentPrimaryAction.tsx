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
      className="group relative w-full text-left p-2.5 sm:p-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 border-2 border-cyan-300 hover:border-white shadow-[0_6px_22px_rgba(6,182,212,0.35)] hover:shadow-[0_8px_30px_rgba(6,182,212,0.5)] transition-all duration-200 cursor-pointer overflow-hidden z-10 active:scale-[0.99]"
    >
      {/* Horizontal Light Beam Sweep Effect */}
      <div className="absolute inset-0 opacity-35 pointer-events-none overflow-hidden rounded-2xl">
        <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent transform -skew-x-12 -translate-x-full animate-[shimmer_1.2s_ease-out_1_forwards]" />
      </div>

      <div className="relative z-10 flex items-center justify-between gap-2.5">
        <div className="space-y-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center flex-wrap gap-1">
            <span className="px-2 py-0.2 rounded-full bg-white text-cyan-950 text-[9px] font-black uppercase tracking-wider shadow-sm">
              ★ RECOMENDADO
            </span>
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-950/40 text-cyan-100 border border-cyan-200/40 text-[9px] font-extrabold uppercase">
              CHAT LOCAL
            </span>
          </div>

          <div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
              <Zap className="w-4 h-4 text-cyan-200 fill-cyan-200/40 shrink-0" />
              <span>ABRIR NO APP (BETA)</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-cyan-50/95 font-medium leading-tight truncate">
              Crie seus prompts diretamente dentro da plataforma.
            </p>
          </div>
        </div>

        {/* Action Button Icon Indicator */}
        <div className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white text-cyan-900 font-black flex items-center justify-center shadow-md group-hover:scale-105 group-hover:bg-cyan-50 transition-all">
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-800" />
        </div>
      </div>
    </button>
  );
};

