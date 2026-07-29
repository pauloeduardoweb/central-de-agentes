import React from 'react';
import { X } from 'lucide-react';
import { Agent } from '../../types';
import { AgentIcon } from '../AgentIcon';

interface AgentControlHeaderProps {
  agent: Agent;
  onClose: () => void;
}

export const AgentControlHeader: React.FC<AgentControlHeaderProps> = ({ agent, onClose }) => {
  const isTikTokCategory = !agent.category || agent.category.toLowerCase().includes('tiktok');

  return (
    <div className="relative pb-3.5 border-b border-slate-800/80">
      <div className="flex items-start justify-between gap-3">
        {/* Agent Avatar / Graphic & Title Info */}
        <div className="flex items-start space-x-3 pr-8">
          <div className="relative shrink-0 w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-slate-800 to-slate-900 border border-cyan-400/50 flex items-center justify-center p-0.5 shadow-lg shadow-cyan-950/50 overflow-hidden">
            {agent.avatarUrl ? (
              <img
                src={agent.avatarUrl}
                alt={agent.name}
                className="w-full h-full object-cover rounded-[14px]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center text-cyan-400">
                <AgentIcon name={agent.iconName || 'Bot'} className="w-6 h-6" />
              </div>
            )}
            <span className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950 shadow-sm" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center flex-wrap gap-1.5">
              {/* TikTok Shop Badge in Black */}
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-950 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 shadow-sm">
                <svg className="w-3 h-3 fill-current text-cyan-400" viewBox="0 0 24 24">
                  <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 2.593 6.29 6.29 0 0 0 .19 7.42 6.335 6.335 0 0 0 8.016 1.764c2.518-1.282 3.824-3.84 3.824-6.684V8.6a8.214 8.214 0 0 0 4.597 1.588V6.743a4.832 4.832 0 0 1-2.002-.057z"/>
                </svg>
                <span>TikTok Shop</span>
              </span>

              {!isTikTokCategory && agent.category && (
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-700 flex items-center gap-1">
                  {agent.category}
                </span>
              )}
            </div>

            <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug flex items-center gap-1.5">
              <span>{agent.name}</span>
            </h2>

            <p className="text-[11px] sm:text-xs text-slate-300 line-clamp-2 leading-relaxed font-normal">
              {agent.tagline || agent.description}
            </p>
          </div>
        </div>

        {/* Top-Right Close Button (X) */}
        <button
          onClick={onClose}
          aria-label="Fechar painel do agente"
          className="absolute top-0 right-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 z-10 shrink-0"
        >
          <X className="w-4 h-4 sm:w-4 sm:h-4 text-slate-300" />
        </button>
      </div>
    </div>
  );
};

