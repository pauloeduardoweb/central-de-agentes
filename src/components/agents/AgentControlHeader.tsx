import React from 'react';
import { X } from 'lucide-react';
import { Agent } from '../../types';
import { AgentIcon } from '../AgentIcon';
import { getSafeImageUrl } from '../../utils/imageUrl';

interface AgentControlHeaderProps {
  agent: Agent;
  onClose: () => void;
}

export const AgentControlHeader: React.FC<AgentControlHeaderProps> = ({ agent, onClose }) => {
  const isTikTokCategory = !agent.category || agent.category.toLowerCase().includes('tiktok');
  const originalImage = agent.coverImage || agent.avatarUrl;
  const displayImage = getSafeImageUrl(originalImage);

  console.log('[AGENT MODAL IMAGE]', {
    agent: agent.name,
    originalImage,
    resolvedImage: displayImage,
  });

  return (
    <div className="relative pb-3 border-b border-cyan-500/20">
      <div className="flex items-start justify-between gap-3 pr-8">
        {/* Agent Avatar / Graphic & Title Info */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="relative shrink-0 w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-cyan-500/25 via-slate-800 to-slate-950 border border-cyan-400/60 flex items-center justify-center p-0.5 shadow-[0_0_18px_rgba(6,182,212,0.3)] overflow-hidden">
            {displayImage ? (
              <img
                src={displayImage}
                alt={agent.name}
                onError={(e) => {
                  console.error('[IMAGE LOAD ERROR]', {
                    agent: agent.name,
                    src: e.currentTarget.src,
                  });
                  if (originalImage && e.currentTarget.src !== originalImage) {
                    e.currentTarget.src = originalImage;
                  }
                }}
                className="w-full h-full object-cover rounded-[13px]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full rounded-[13px] bg-slate-900 flex items-center justify-center text-cyan-400">
                <AgentIcon name={agent.iconName || 'Bot'} className="w-6 h-6" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center flex-wrap gap-1">
              {/* TikTok Shop Badge */}
              <span className="text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-950 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 shadow-sm shrink-0">
                <svg className="w-2.5 h-2.5 fill-current text-cyan-400" viewBox="0 0 24 24">
                  <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 2.593 6.29 6.29 0 0 0 .19 7.42 6.335 6.335 0 0 0 8.016 1.764c2.518-1.282 3.824-3.84 3.824-6.684V8.6a8.214 8.214 0 0 0 4.597 1.588V6.743a4.832 4.832 0 0 1-2.002-.057z"/>
                </svg>
                <span>TikTok Shop</span>
              </span>

              {!isTikTokCategory && agent.category && (
                <span className="text-[8.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900/90 text-slate-300 border border-slate-700 shrink-0">
                  {agent.category}
                </span>
              )}
            </div>

            <h2 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {agent.name}
            </h2>

            <p className="text-[10px] sm:text-[11px] text-slate-300/90 line-clamp-2 leading-snug font-normal">
              {agent.tagline || agent.description}
            </p>
          </div>
        </div>

        {/* Top-Right Discreet Close Button (X) */}
        <button
          onClick={onClose}
          aria-label="Fechar painel do agente"
          className="absolute top-0 right-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/80 flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0 z-10"
        >
          <X className="w-3.5 h-3.5 text-slate-300" />
        </button>
      </div>
    </div>
  );
};


