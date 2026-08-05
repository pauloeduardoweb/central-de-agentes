import React, { useState } from 'react';
import { Heart, MessageSquare, MoreVertical, Edit2, Copy, Trash2, Code2, Globe, Image, FileJson, Sparkles, ExternalLink } from 'lucide-react';
import { Agent } from '../types';
import { AgentIcon, getColorTheme } from './AgentIcon';
import { PinAgentButton } from './agents/PinAgentButton';

interface AgentCardProps {
  agent: Agent;
  isPinned?: boolean;
  onSelectChat: (agent: Agent) => void;
  onToggleFavorite: (id: string) => void;
  onEdit: (agent: Agent) => void;
  onDuplicate: (agent: Agent) => void;
  onDelete: (id: string) => void;
  onCopyPrompt: (agent: Agent) => void;
  onTogglePin?: (id: string) => void;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  isPinned = false,
  onSelectChat,
  onToggleFavorite,
  onEdit,
  onDuplicate,
  onDelete,
  onCopyPrompt,
  onTogglePin,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const theme = getColorTheme(agent.colorTheme);

  return (
    <div
      id={`agent-card-${agent.id}`}
      className="group relative flex flex-col justify-between rounded-2xl bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 border border-cyan-500/30 hover:border-cyan-400/70 p-5 shadow-xl shadow-cyan-950/30 transition-all duration-300 backdrop-blur-md overflow-hidden"
    >
      {/* Tech Grid Texture Overlay */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity"
        style={{
          backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="relative z-10">
        {/* Card Header: Icon, Favorite & Menu */}
        <div className="flex items-start justify-between gap-3 mb-3.5">
          <div className="flex items-center space-x-3">
            <div
              className={`relative overflow-hidden w-12 h-12 rounded-xl ${theme.bg} ${theme.text} ${theme.border} border flex items-center justify-center shrink-0 shadow-md transition-transform group-hover:scale-105`}
            >
              <img 
                src="https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png" 
                alt="" 
                className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-overlay pointer-events-none"
                referrerPolicy="no-referrer"
              />
              <AgentIcon name={agent.iconName} size={22} className="relative z-10" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${theme.badge}`}>
                  {agent.category}
                </span>
                {agent.isCustom && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                    Custom
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-white mt-1 group-hover:text-cyan-300 transition-colors line-clamp-1">
                {agent.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0">
            {onTogglePin && (
              <PinAgentButton
                agentId={agent.id}
                isPinned={isPinned}
                onTogglePin={onTogglePin}
                size="sm"
              />
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(agent.id);
              }}
              title={agent.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-800 transition-colors"
            >
              <Heart className={`w-4 h-4 ${agent.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
            </button>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-8 z-20 w-44 rounded-xl bg-slate-800 border border-slate-700 shadow-xl py-1 text-xs">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onEdit(agent);
                      }}
                      className="w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-700 flex items-center space-x-2"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar Agente</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onDuplicate(agent);
                      }}
                      className="w-full px-3 py-2 text-left text-slate-200 hover:bg-slate-700 flex items-center space-x-2"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Duplicar Agente</span>
                    </button>
                    {agent.isCustom && (
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          onDelete(agent.id);
                        }}
                        className="w-full px-3 py-2 text-left text-rose-400 hover:bg-rose-950/50 flex items-center space-x-2 border-t border-slate-700/60 mt-1 pt-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tagline & Description */}
        {agent.tagline && (
          <p className="text-xs font-semibold text-slate-300 mb-1.5">
            {agent.tagline}
          </p>
        )}
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-3 mb-4">
          {agent.description}
        </p>
      </div>

      {/* Footer: Capabilities & Chat Trigger */}
      <div>
        <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 mb-3">
          <div className="flex items-center space-x-1.5 text-slate-400">
            {agent.capabilities?.codeInterpreter && (
              <span title="Code Interpreter" className="p-1 rounded bg-slate-800 text-slate-300">
                <Code2 className="w-3.5 h-3.5" />
              </span>
            )}
            {agent.capabilities?.webSearch && (
              <span title="Web Search" className="p-1 rounded bg-slate-800 text-slate-300">
                <Globe className="w-3.5 h-3.5" />
              </span>
            )}
            {agent.capabilities?.imageGeneration && (
              <span title="Geração de Imagens" className="p-1 rounded bg-slate-800 text-slate-300">
                <Image className="w-3.5 h-3.5" />
              </span>
            )}
            {agent.capabilities?.jsonOutput && (
              <span title="JSON Estruturado" className="p-1 rounded bg-slate-800 text-slate-300">
                <FileJson className="w-3.5 h-3.5" />
              </span>
            )}
          </div>

          <span className="text-[11px] font-medium text-slate-400">
            Temp: {agent.temperature}
          </span>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => onSelectChat(agent)}
            className="flex-1 py-2.5 px-3 rounded-xl text-xs font-black bg-gradient-to-r from-white via-slate-50 to-white hover:from-slate-100 hover:to-white text-slate-950 flex items-center justify-center space-x-1.5 shadow-md shadow-white/20 transition-all active:scale-95 border border-white/90 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-600 animate-pulse" />
            <span>Abrir no App (Beta)</span>
          </button>

          {agent.chatGptUrl && (
            <a
              href={agent.chatGptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center space-x-1 border border-slate-700 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir no ChatGPT</span>
            </a>
          )}

          {(agent.geminiUrl || agent.category === 'Tiktok Shop' || agent.category === 'Tiktok 2K' || agent.category === 'Recurso Anti-Violação') && (
            <a
              href={agent.geminiUrl || 'https://gemini.google.com/gem/1ytmjN-QrbLkcPzV03sfl--JL6tBF0mvL?usp=sharing'}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center space-x-1 border border-slate-700 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Gemini ↗</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
