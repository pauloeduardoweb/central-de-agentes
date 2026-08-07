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
    <div className="space-y-1.5 pt-2 border-t border-slate-200/90">
      <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500 px-0.5">
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
                ? 'bg-amber-50/90 border-amber-300 text-amber-950 shadow-xs'
                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800 shadow-xs'
            }`}
          >
            <div
              className={`p-1.5 rounded-lg border shrink-0 flex items-center justify-center ${
                isPinned
                  ? 'bg-amber-100 border-amber-300 text-amber-600'
                  : 'bg-slate-100 border-slate-200 text-slate-500'
              }`}
            >
              <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-500 text-amber-600 rotate-45' : 'rotate-45'}`} />
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <h5 className={`text-[10px] sm:text-xs font-black uppercase tracking-wider truncate ${isPinned ? 'text-amber-950' : 'text-slate-900'}`}>
                {isPinned ? 'FIXADO' : 'FIXAR TOPO'}
              </h5>
              <p className={`text-[9px] font-medium leading-none truncate ${isPinned ? 'text-amber-700' : 'text-slate-500'}`}>
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
              ? 'bg-rose-50/90 border-rose-300 text-rose-950 shadow-xs'
              : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800 shadow-xs'
          }`}
        >
          <div
            className={`p-1.5 rounded-lg border shrink-0 flex items-center justify-center ${
              isFavorite
                ? 'bg-rose-100 border-rose-300 text-rose-600'
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <h5 className={`text-[10px] sm:text-xs font-black uppercase tracking-wider truncate ${isFavorite ? 'text-rose-950' : 'text-slate-900'}`}>
              {isFavorite ? 'FAVORITO' : 'FAVORITAR'}
            </h5>
            <p className={`text-[9px] font-medium leading-none truncate ${isFavorite ? 'text-rose-700' : 'text-slate-500'}`}>
              {isFavorite ? 'Salvo na lista' : 'Salvar agente'}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};

