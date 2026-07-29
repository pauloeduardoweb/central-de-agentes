import React from 'react';
import { Pin } from 'lucide-react';

interface PinAgentButtonProps {
  agentId: string;
  isPinned: boolean;
  onTogglePin: (agentId: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PinAgentButton: React.FC<PinAgentButtonProps> = ({
  agentId,
  isPinned,
  onTogglePin,
  className = '',
  size = 'md',
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePin(agentId);
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isPinned ? 'Desafixar agente' : 'Fixar agente'}
      aria-pressed={isPinned}
      title={isPinned ? 'Agente fixado' : 'Fixar agente'}
      className={`relative inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full backdrop-blur-md transition-all duration-300 active:scale-90 focus:outline-none focus:ring-2 focus:ring-orange-400/60 select-none ${
        isPinned
          ? 'bg-black/80 text-orange-400 border border-orange-500/80 shadow-[0_0_15px_rgba(249,115,22,0.6)] ring-1 ring-orange-500/50'
          : 'bg-black/60 text-slate-300 hover:text-white border border-white/20 hover:bg-black/80 hover:border-white/40'
      } ${className}`}
    >
      <Pin
        className={`${iconSizes[size]} transition-transform duration-200 ${
          isPinned ? 'fill-orange-400 text-orange-400 rotate-45 scale-110' : 'text-slate-300 hover:text-white'
        }`}
      />
    </button>
  );
};
