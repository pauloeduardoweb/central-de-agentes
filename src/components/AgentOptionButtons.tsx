import React from 'react';
import { AgentOption } from '../agents/agentTypes';
import { CheckCircle2 } from 'lucide-react';

interface AgentOptionButtonsProps {
  options: AgentOption[];
  onSelectOption: (option: AgentOption) => void;
  disabled?: boolean;
}

export const AgentOptionButtons: React.FC<AgentOptionButtonsProps> = ({
  options,
  onSelectOption,
  disabled = false,
}) => {
  if (!options || options.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3 animate-in fade-in duration-200">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelectOption(opt)}
          className="group text-left p-3 rounded-xl bg-slate-800/90 hover:bg-emerald-600/20 text-slate-100 hover:text-white border border-slate-700/80 hover:border-emerald-500/60 transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-start space-x-2.5 shadow-sm"
        >
          <div className="w-5 h-5 rounded-full border border-slate-600 group-hover:border-emerald-400 group-hover:bg-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5 transition-colors">
            <CheckCircle2 className="w-3.5 h-3.5 text-transparent group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs font-bold block leading-snug break-words">
              {opt.label}
            </span>
            {opt.description && (
              <span className="text-[10px] text-slate-400 group-hover:text-slate-300 block mt-0.5 line-clamp-2">
                {opt.description}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};
