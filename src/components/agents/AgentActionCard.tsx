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
      bg: 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-rose-950/30',
      border: 'border-amber-500/40 hover:border-amber-400',
      glow: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]',
      iconBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      title: 'text-white group-hover:text-amber-200',
      badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
    },
    emerald: {
      bg: 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/30',
      border: 'border-emerald-500/40 hover:border-emerald-400',
      glow: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]',
      iconBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      title: 'text-white group-hover:text-emerald-200',
      badgeBg: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
    },
    indigo: {
      bg: 'bg-gradient-to-r from-indigo-950/40 via-slate-900 to-purple-950/30',
      border: 'border-indigo-500/40 hover:border-indigo-400',
      glow: 'hover:shadow-[0_0_20px_rgba(99,102,241,0.25)]',
      iconBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      title: 'text-white group-hover:text-indigo-200',
      badgeBg: 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40',
    },
    purple: {
      bg: 'bg-gradient-to-r from-purple-950/40 via-slate-900 to-pink-950/30',
      border: 'border-purple-500/40 hover:border-purple-400',
      glow: 'hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]',
      iconBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      title: 'text-white group-hover:text-purple-200',
      badgeBg: 'bg-purple-950/80 text-purple-300 border-purple-500/40',
    },
  }[variant];

  return (
    <button
      onClick={onClick}
      className={`group w-full text-left p-3.5 sm:p-4 rounded-xl ${variantStyles.bg} border ${variantStyles.border} ${variantStyles.glow} transition-all duration-200 transform hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer flex items-center justify-between gap-3`}
    >
      <div className="flex items-start space-x-3">
        <div className={`p-2.5 rounded-xl ${variantStyles.iconBg} border shrink-0`}>
          {icon}
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <h4 className={`text-xs sm:text-sm font-black uppercase tracking-wide ${variantStyles.title} transition-colors flex items-center gap-1.5`}>
              {title}
            </h4>
            {badge && (
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border ${variantStyles.badgeBg}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-300 font-medium leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {isExternal && (
        <div className="shrink-0 p-1.5 rounded-lg bg-slate-800/80 text-slate-400 group-hover:text-white transition-colors">
          <ExternalLink className="w-3.5 h-3.5" />
        </div>
      )}
    </button>
  );
};
