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
      cardBg: 'bg-white hover:bg-amber-50/40',
      border: 'border-amber-300 hover:border-amber-400',
      glow: 'shadow-xs hover:shadow-[0_3px_12px_rgba(245,158,11,0.18)]',
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200/90',
      title: 'text-slate-900 group-hover:text-amber-900',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-300',
      externalBtn: 'bg-slate-100 text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-700',
    },
    emerald: {
      cardBg: 'bg-white hover:bg-emerald-50/40',
      border: 'border-emerald-300 hover:border-emerald-400',
      glow: 'shadow-xs hover:shadow-[0_3px_12px_rgba(16,185,129,0.18)]',
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-200/90',
      title: 'text-slate-900 group-hover:text-emerald-900',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      externalBtn: 'bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700',
    },
    indigo: {
      cardBg: 'bg-white hover:bg-indigo-50/40',
      border: 'border-indigo-300 hover:border-indigo-400',
      glow: 'shadow-xs hover:shadow-[0_3px_12px_rgba(99,102,241,0.18)]',
      iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-200/90',
      title: 'text-slate-900 group-hover:text-indigo-900',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-300',
      externalBtn: 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-700',
    },
    purple: {
      cardBg: 'bg-white hover:bg-purple-50/40',
      border: 'border-purple-300 hover:border-purple-400',
      glow: 'shadow-xs hover:shadow-[0_3px_12px_rgba(168,85,247,0.18)]',
      iconBg: 'bg-purple-50 text-purple-600 border-purple-200/90',
      title: 'text-slate-900 group-hover:text-purple-900',
      badgeBg: 'bg-purple-50 text-purple-700 border-purple-300',
      externalBtn: 'bg-slate-100 text-slate-500 group-hover:bg-purple-100 group-hover:text-purple-700',
    },
  }[variant];

  return (
    <button
      onClick={onClick}
      className={`group w-full text-left p-2.5 sm:p-3 rounded-xl ${variantStyles.cardBg} border ${variantStyles.border} ${variantStyles.glow} transition-all duration-200 cursor-pointer flex items-center justify-between gap-2.5 active:scale-[0.99]`}
    >
      <div className="flex items-center space-x-2.5 min-w-0">
        <div className={`p-2 rounded-lg ${variantStyles.iconBg} border shrink-0 flex items-center justify-center`}>
          {icon}
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className={`text-xs font-black uppercase tracking-wide ${variantStyles.title} transition-colors truncate`}>
              {title}
            </h4>
            {badge && (
              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wider shrink-0 ${variantStyles.badgeBg}`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-600 font-medium leading-tight truncate">
            {description}
          </p>
        </div>
      </div>

      <div className={`shrink-0 p-1.5 rounded-lg ${variantStyles.externalBtn} transition-colors`}>
        <ExternalLink className="w-3.5 h-3.5" />
      </div>
    </button>
  );
};

