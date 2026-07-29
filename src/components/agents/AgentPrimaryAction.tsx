import React from 'react';
import { Sparkles, Zap, ArrowRight } from 'lucide-react';
import { Agent } from '../../types';

interface AgentPrimaryActionProps {
  agent: Agent;
  onOpenLocal: (agent: Agent) => void;
}

export const AgentPrimaryAction: React.FC<AgentPrimaryActionProps> = ({ agent, onOpenLocal }) => {
  return (
    <button
      onClick={() => onOpenLocal(agent)}
      className="group relative w-full text-left p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#0d1f35] via-[#091e36] to-[#051324] border-2 border-cyan-400/80 hover:border-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.3)] hover:shadow-[0_0_35px_rgba(6,182,212,0.45)] transition-all duration-300 transform hover:-translate-y-1 active:scale-[0.99] cursor-pointer overflow-hidden z-10"
    >
      {/* Horizontal Light Beam Sweep Animation Effect (Runs once on panel open) */}
      <div className="absolute inset-0 opacity-40 pointer-events-none overflow-hidden rounded-2xl">
        <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent transform -skew-x-12 -translate-x-full animate-[shimmer_0.9s_ease-out_1_forwards]" />
      </div>

      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="space-y-2">
          {/* Badges */}
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-sm">
              ★ RECOMENDADO
            </span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 text-[10px] font-extrabold uppercase">
              CHAT LOCAL
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold uppercase">
              SEM API
            </span>
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2 group-hover:text-cyan-200 transition-colors">
              <Zap className="w-5 h-5 text-cyan-400 fill-cyan-400/30 animate-pulse" />
              ABRIR NO APP
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-0.5">
              Crie seus prompts diretamente dentro da plataforma.
            </p>
          </div>
        </div>

        {/* Action Button Icon Indicator */}
        <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-500 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition-transform">
          <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>
    </button>
  );
};
