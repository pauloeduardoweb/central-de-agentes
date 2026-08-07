import React from 'react';
import { ExternalLink } from 'lucide-react';

interface AgentActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  variant: 'amber' | 'emerald' | 'indigo' | 'purple';
  badge?: string;
  onClick: (e: React.MouseEvent) => void;
  isExternal?: boolean;
}

export const AgentActionCard: React.FC<AgentActionCardProps> = ({
  title,
  description,
  icon,
  variant,
  badge,
  onClick,
  isExternal = false,
}) => {
  const variantStyles = {
    amber: {
      cardBg: 'bg-[#0b1728]/80 hover:bg-[#0e2038]',
      border: 'border-amber-500/35 hover:border-amber-400/70',
      glow: 'shadow-sm hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]',
      iconBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      title: 'text-white group-hover:text-amber-300',
      badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
      externalBtn: 'bg-slate-800/80 text-slate-400 group-hover:bg-amber-950/80 group-hover:text-amber-300',
    },
    emerald: {
      cardBg: 'bg-[#0b1728]/80 hover:bg-[#0e2038]',
      border: 'border-emerald-500/35 hover:border-emerald-400/70',
      glow: 'shadow-sm hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]',
      iconBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      title: 'text-white group-hover:text-emerald-300',
      badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      externalBtn: 'bg-slate-800/80 text-slate-400 group-hover:bg-emerald-950/80 group-hover:text-emerald-300',
    },
    indigo: {
      cardBg: 'bg-[#0b1728]/80 hover:bg-[#0e2038]',
      border: 'border-indigo-500/35 hover:border-indigo-400/70',
      glow: 'shadow-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]',
      iconBg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
      title: 'text-white group-hover:text-indigo-300',
      badgeBg: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
      externalBtn: 'bg-slate-800/80 text-slate-400 group-hover:bg-indigo-950/80 group-hover:text-indigo-300',
    },
    purple: {
      cardBg: 'bg-[#0b1728]/80 hover:bg-[#0e2038]',
      border: 'border-purple-500/35 hover:border-purple-400/70',
      glow: 'shadow-sm hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]',
      iconBg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      title: 'text-white group-hover:text-purple-300',
      badgeBg: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
      externalBtn: 'bg-slate-800/80 text-slate-400 group-hover:bg-purple-950/80 group-hover:text-purple-300',
    },
  }[variant];

  return (
    <button
      onClick={onClick}
      className={`group w-full text-left p-3 rounded-2xl ${variantStyles.cardBg} border ${variantStyles.border} ${variantStyles.glow} hover:scale-[1.01] transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 min-h-[52px] active:scale-[0.99]`}
    >
      <div className="flex items-center space-x-2.5 min-w-0">
        <div className={`w-9 h-9 rounded-xl ${variantStyles.iconBg} border shrink-0 flex items-center justify-center`}>
          {icon}
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className={`text-xs font-black uppercase tracking-wide ${variantStyles.title} transition-colors truncate`}>
              {title}
            </h4>
            {badge && (
              <span className={`text-[8.5px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider shrink-0 ${variantStyles.badgeBg}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-300/80 font-medium leading-tight truncate">
            {description}
          </p>
        </div>
      </div>

      <div className={`shrink-0 p-1.5 rounded-xl ${variantStyles.externalBtn} transition-colors`}>
        <ExternalLink className="w-3.5 h-3.5" />
      </div>
    </button>
  );
};

