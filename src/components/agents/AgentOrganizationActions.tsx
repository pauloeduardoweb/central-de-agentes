import React from 'react';
import { Pin, Heart } from 'lucide-react';
import { Agent } from '../../types';

interface AgentOrganizationActionsProps {
  agent: Agent;
  isPinned: boolean;
  isFavorite: boolean;
  onTogglePin?: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export const AgentOrganizationActions: React.FC<AgentOrganizationActionsProps> = ({
  agent,
  isPinned,
  isFavorite,
  onTogglePin,
  onToggleFavorite,
}) => {
  return (
    <div className="space-y-1.5 pt-2 border-t border-cyan-500/20">
      <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 px-0.5">
        ORGANIZAR AGENTE
      </h4>

      <div className="grid grid-cols-2 gap-2">
        {/* Fixar no topo */}
        {onTogglePin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(agent.id);
            }}
            aria-pressed={isPinned}
            className={`w-full text-left p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center space-x-2.5 hover:scale-[1.01] active:scale-[0.98] ${
              isPinned
                ? 'bg-amber-950/60 border-amber-500/60 text-amber-200 shadow-md shadow-amber-950/40'
                : 'bg-[#0a192e]/80 hover:bg-[#0c203b] border-cyan-500/25 hover:border-cyan-400/60 text-slate-300 hover:text-white shadow-sm'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl border shrink-0 flex items-center justify-center ${
                isPinned
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-400 text-amber-400 rotate-45' : 'rotate-45'}`} />
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <h5 className={`text-[10px] sm:text-xs font-black uppercase tracking-wider truncate ${isPinned ? 'text-amber-300' : 'text-slate-200'}`}>
                {isPinned ? 'FIXADO' : 'FIXAR TOPO'}
              </h5>
              <p className={`text-[9px] font-medium leading-none truncate ${isPinned ? 'text-amber-400/80' : 'text-slate-400'}`}>
                {isPinned ? 'Acesso rápido' : 'Fixar no topo'}
              </p>
            </div>
          </button>
        )}

        {/* Favoritar agente */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(agent.id);
          }}
          aria-pressed={isFavorite}
          className={`w-full text-left p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center space-x-2.5 hover:scale-[1.01] active:scale-[0.98] ${
            isFavorite
              ? 'bg-rose-950/60 border-rose-500/60 text-rose-200 shadow-md shadow-rose-950/40'
              : 'bg-[#0a192e]/80 hover:bg-[#0c203b] border-cyan-500/25 hover:border-cyan-400/60 text-slate-300 hover:text-white shadow-sm'
          }`}
        >
          <div
            className={`w-8 h-8 rounded-xl border shrink-0 flex items-center justify-center ${
              isFavorite
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <h5 className={`text-[10px] sm:text-xs font-black uppercase tracking-wider truncate ${isFavorite ? 'text-rose-300' : 'text-slate-200'}`}>
              {isFavorite ? 'FAVORITO' : 'FAVORITAR'}
            </h5>
            <p className={`text-[9px] font-medium leading-none truncate ${isFavorite ? 'text-rose-400/80' : 'text-slate-400'}`}>
              {isFavorite ? 'Salvo na lista' : 'Salvar agente'}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};

