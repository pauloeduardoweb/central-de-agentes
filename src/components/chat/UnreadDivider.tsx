import React from 'react';

export const UnreadDivider: React.FC = () => {
  return (
    <div className="flex items-center my-4 px-4 gap-3">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-emerald-500" />
      <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider shadow-sm">
        Mensagens não lidas
      </span>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-emerald-500/50 to-emerald-500" />
    </div>
  );
};
