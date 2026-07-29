import React from 'react';
import { AgentCopyButton } from './AgentCopyButton';

interface AgentFieldBlockProps {
  label: string;
  content: string;
  badgeColor?: string;
  accentColor?: string;
}

export const AgentFieldBlock: React.FC<AgentFieldBlockProps> = ({
  label,
  content,
  badgeColor = 'bg-slate-800 text-amber-300 border-slate-700',
  accentColor = 'border-slate-800 bg-slate-950/80',
}) => {
  if (!content) return null;

  return (
    <div className={`p-3.5 rounded-xl border ${accentColor} space-y-2 transition-all hover:border-slate-700`}>
      <div className="flex items-center justify-between">
        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${badgeColor}`}>
          {label}
        </span>
        <AgentCopyButton textToCopy={content} label={`Copiar ${label}`} />
      </div>
      <p className="text-xs text-slate-200 font-mono leading-relaxed whitespace-pre-wrap select-all">
        {content}
      </p>
    </div>
  );
};
