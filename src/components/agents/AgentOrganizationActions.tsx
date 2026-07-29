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
    <div className="space-y-2 pt-1 border-t border-slate-800/80">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
        ORGANIZAR AGENTE
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Fixar no topo */}
        {onTogglePin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(agent.id);
            }}
            aria-pressed={isPinned}
            className={`w-full text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-start space-x-3 active:scale-[0.98] ${
              isPinned
                ? 'bg-orange-950/40 border-orange-500/60 text-orange-200 shadow-md shadow-orange-950/30'
                : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <div
              className={`p-2 rounded-lg border shrink-0 ${
                isPinned
                  ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Pin className={`w-4 h-4 ${isPinned ? 'fill-orange-400 text-orange-400 rotate-45' : 'rotate-45'}`} />
            </div>

            <div className="space-y-0.5">
              <h5 className="text-xs font-black uppercase tracking-wide flex items-center gap-1.5">
                {isPinned ? 'FIXADO NO TOPO' : 'FIXAR NO TOPO'}
              </h5>
              <p className="text-[11px] text-slate-400 font-medium leading-tight">
                {isPinned
                  ? 'Este agente está nos seus acessos rápidos.'
                  : 'Mantenha este agente entre seus acessos rápidos.'}
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
          className={`w-full text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-start space-x-3 active:scale-[0.98] ${
            isFavorite
              ? 'bg-rose-950/40 border-rose-500/60 text-rose-200 shadow-md shadow-rose-950/30'
              : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
          }`}
        >
          <div
            className={`p-2 rounded-lg border shrink-0 ${
              isFavorite
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
          </div>

          <div className="space-y-0.5">
            <h5 className="text-xs font-black uppercase tracking-wide flex items-center gap-1.5">
              {isFavorite ? 'AGENTE FAVORITO' : 'FAVORITAR AGENTE'}
            </h5>
            <p className="text-[11px] text-slate-400 font-medium leading-tight">
              {isFavorite
                ? 'Este agente está salvo entre seus favoritos.'
                : 'Adicione este agente à sua lista pessoal.'}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};
