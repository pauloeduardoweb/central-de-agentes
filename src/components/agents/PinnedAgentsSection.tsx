import React from 'react';
import { Pin, Sparkles } from 'lucide-react';
import { Agent } from '../../types';
import { TikTokPosterCard } from '../TikTokPosterCard';

interface PinnedAgentsSectionProps {
  pinnedAgentIds: string[];
  allAgents: Agent[];
  onSelectChat: (agent: Agent) => void;
  onToggleFavorite: (id: string) => void;
  onCopyPrompt: (agent: Agent) => void;
  onTogglePin: (id: string) => void;
}

export const PinnedAgentsSection: React.FC<PinnedAgentsSectionProps> = ({
  pinnedAgentIds,
  allAgents,
  onSelectChat,
  onToggleFavorite,
  onCopyPrompt,
  onTogglePin,
}) => {
  if (!pinnedAgentIds || pinnedAgentIds.length === 0) {
    return null;
  }

  // Map pinned IDs to agent objects in order of pinning (max 4)
  const pinnedAgents = pinnedAgentIds
    .map((id) => allAgents.find((a) => a.id === id))
    .filter((agent): agent is Agent => Boolean(agent))
    .slice(0, 4);

  if (pinnedAgents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-8 animate-in fade-in duration-300">
      {/* Section Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0d1f35]/95 via-[#0a182b]/95 to-[#050f1c]/95 border border-orange-500/40 shadow-xl shadow-orange-950/20 text-white relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        <div className="relative z-10 flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-orange-500/20 border border-orange-500/50 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.4)]">
            <Pin className="w-5 h-5 fill-orange-400 rotate-45" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base sm:text-lg font-black tracking-wide text-white uppercase flex items-center gap-2">
                AGENTES FIXADOS
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-[10px] font-extrabold">
                {pinnedAgents.length}/4
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 font-medium">
              Seus atalhos de acesso rápido fixados no topo da central.
            </p>
          </div>
        </div>

        <div className="relative z-10 shrink-0 flex items-center space-x-2">
          <span className="text-[11px] font-bold text-orange-400/90 bg-orange-950/60 border border-orange-500/30 px-3 py-1.5 rounded-xl flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>Acesso Rápido</span>
          </span>
        </div>
      </div>

      {/* Grid of Pinned Agents (Max 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {pinnedAgents.map((agent) => (
          <TikTokPosterCard
            key={`pinned-${agent.id}`}
            agent={agent}
            isPinned={true}
            onSelectChat={onSelectChat}
            onToggleFavorite={onToggleFavorite}
            onCopyPrompt={onCopyPrompt}
            onTogglePin={onTogglePin}
          />
        ))}
      </div>
    </div>
  );
};
