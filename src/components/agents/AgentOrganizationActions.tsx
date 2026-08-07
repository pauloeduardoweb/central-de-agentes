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
    <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
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
            className={`w-full text-left p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center space-x-2 active:scale-[0.98] ${
              isPinned
                ? 'bg-amber-950/40 border-amber-500/60 text-amber-200 shadow-md shadow-amber-950/30'
                : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <div
              className={`p-1.5 rounded-lg border shrink-0 flex items-center justify-center ${
                isPinned
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-400 text-amber-400 rotate-45' : 'rotate-45'}`} />
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <h5 className="text-[10px] sm:text-xs font-black uppercase tracking-wider truncate">
                {isPinned ? 'FIXADO' : 'FIXAR TOPO'}
              </h5>
              <p className="text-[9px] text-slate-400 font-medium leading-none truncate">
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
          className={`w-full text-left p-2.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center space-x-2 active:scale-[0.98] ${
            isFavorite
              ? 'bg-rose-950/40 border-rose-500/60 text-rose-200 shadow-md shadow-rose-950/30'
              : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
          }`}
        >
          <div
            className={`p-1.5 rounded-lg border shrink-0 flex items-center justify-center ${
              isFavorite
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <h5 className="text-[10px] sm:text-xs font-black uppercase tracking-wider truncate">
              {isFavorite ? 'FAVORITO' : 'FAVORITAR'}
            </h5>
            <p className="text-[9px] text-slate-400 font-medium leading-none truncate">
              {isFavorite ? 'Salvo na lista' : 'Salvar agente'}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};

