import React from 'react';
import { Play, Heart, ExternalLink, MessageCircle, Volume2, Sparkles, Video, Lock } from 'lucide-react';
import { Agent } from '../types';
import { getColorTheme } from './AgentIcon';

interface TikTokPosterCardProps {
  agent: Agent;
  onSelectChat: (agent: Agent) => void;
  onToggleFavorite: (id: string) => void;
  onCopyPrompt: (agent: Agent) => void;
}

export const TikTokPosterCard: React.FC<TikTokPosterCardProps> = ({
  agent,
  onSelectChat,
  onToggleFavorite,
  onCopyPrompt,
}) => {
  const [showVideoModal, setShowVideoModal] = React.useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = React.useState(0);
  const [showOverlay, setShowOverlay] = React.useState(false);

  const videoList = React.useMemo(() => {
    if (agent.exampleVideoUrls && agent.exampleVideoUrls.length > 0) {
      return agent.exampleVideoUrls;
    }
    if (agent.exampleVideoUrl) {
      return [agent.exampleVideoUrl];
    }
    return [];
  }, [agent.exampleVideoUrl, agent.exampleVideoUrls]);

  const showExampleButton = videoList.length > 0;
  const theme = getColorTheme(agent.colorTheme);

  const targetGeminiUrl = React.useMemo(() => {
    if (agent.geminiUrl) return agent.geminiUrl;
    if (agent.chatGptUrl && agent.chatGptUrl.includes('gemini.google.com')) {
      return agent.chatGptUrl;
    }
    return null;
  }, [agent.geminiUrl, agent.chatGptUrl]);

  const handleOpenChatGPT = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (agent.chatGptUrl) {
      window.open(agent.chatGptUrl, '_blank', 'noopener,noreferrer');
    } else {
      onSelectChat(agent);
    }
  };

  const handleOpenGemini = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (targetGeminiUrl) {
      window.open(targetGeminiUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const renderPosterGraphic = () => {
    if (agent.customPosterUrl) {
      return (
        <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
          <img
            src={agent.customPosterUrl}
            alt={agent.name}
            className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30 pointer-events-none" />

          {agent.category && (
            <div className="absolute top-3 left-3 z-10 flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-wider text-cyan-300 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>{agent.category}</span>
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(agent.id);
            }}
            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white hover:text-red-400 hover:scale-110 transition-all shadow-md"
          >
            <Heart className={`w-4 h-4 ${agent.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-slate-950" />
        <div className="relative z-10 p-4 text-center">
          <h4 className="text-sm font-black text-white">{agent.name}</h4>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{agent.description}</p>
        </div>
      </div>
    );
  };

  const cardAspectRatio = 'aspect-[9/16]';

  return (
    <div className={`group relative flex flex-col rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl ${theme.hoverBorder} hover:shadow-2xl transition-all duration-300 ${cardAspectRatio}`}>
      
      {/* Upper Poster Area */}
      <div 
        className="relative flex-1 overflow-hidden cursor-pointer" 
        onClick={(e) => {
          e.stopPropagation();
          setShowOverlay((prev) => !prev);
        }}
      >
        {renderPosterGraphic()}

        {/* Options Overlay (Appears ONLY when clicking the agent poster image) */}
        <div 
          className={`absolute inset-0 bg-slate-950/92 backdrop-blur-xs transition-all duration-200 flex flex-col items-center justify-center p-4 text-center space-y-2.5 z-20 ${
            showOverlay 
              ? 'opacity-100 pointer-events-auto scale-100' 
              : 'opacity-0 pointer-events-none scale-95'
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowOverlay(false);
            }
          }}
        >
          {showExampleButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentVideoIndex(0);
                setShowVideoModal(true);
                setShowOverlay(false);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-black text-xs flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/20 active:scale-95 transition-all border border-amber-300/60"
            >
              <span>▶️ Assistir Exemplo</span>
            </button>
          )}

          {agent.chatGptUrl && (
            <button
              onClick={(e) => {
                setShowOverlay(false);
                handleOpenChatGPT(e);
              }}
              className={`w-full py-2.5 px-4 rounded-xl bg-gradient-to-r ${
                agent.chatGptUrl.includes('wa.me')
                  ? 'from-emerald-500 via-teal-600 to-green-600 hover:from-emerald-400 hover:to-green-500 shadow-emerald-500/40 border border-emerald-300/60'
                  : theme.btnGradient
              } text-white font-black text-xs flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all`}
            >
              {agent.chatGptUrl.includes('wa.me') ? (
                <>
                  <MessageCircle className="w-4 h-4 text-white fill-white/20" />
                  <span>WhatsApp (21) 96993-1420</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  <span>Abrir no ChatGPT ↗</span>
                </>
              )}
            </button>
          )}

          {targetGeminiUrl && (
            <button
              onClick={(e) => {
                setShowOverlay(false);
                handleOpenGemini(e);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black text-xs flex items-center justify-center space-x-2 shadow-lg active:scale-95 transition-all border border-blue-400/30"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir no Gemini ↗</span>
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowOverlay(false);
              onSelectChat(agent);
            }}
            className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center space-x-2 border border-slate-700 transition-all active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
            <span>Chat no App</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(agent.id);
            }}
            className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 border transition-all active:scale-95 ${
              agent.isFavorite
                ? 'bg-rose-500/25 hover:bg-rose-500/40 text-rose-200 border-rose-500/60 shadow-lg shadow-rose-500/20'
                : 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-300 hover:text-white border-slate-700/80 hover:border-slate-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${agent.isFavorite ? 'fill-red-500 text-red-500' : 'text-red-400'}`} />
            <span>{agent.isFavorite ? 'Remover dos Favoritos' : 'Favoritar Agente'}</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowOverlay(false);
            }}
            className="w-full py-1.5 px-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-[11px] flex items-center justify-center space-x-1 border border-slate-800 transition-all mt-1"
          >
            <span>✕ Fechar</span>
          </button>
        </div>
      </div>

      {/* Embedded Video Modal */}
      {showVideoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all"
          onClick={(e) => {
            e.stopPropagation();
            setShowVideoModal(false);
          }}
        >
          <div
            className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-base">▶️</span>
                <div>
                  <h3 className="text-sm font-black text-white">{agent.name} — Exemplo em Vídeo</h3>
                  <p className="text-[11px] text-slate-400">
                    {videoList.length > 1
                      ? `Exemplo ${currentVideoIndex + 1} de ${videoList.length}`
                      : videoList.length === 1
                      ? 'Exemplo prático de publicação em vídeo'
                      : 'Vídeo de exemplo em breve'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVideoModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {videoList.length > 0 ? (
              <div className="space-y-3">
                <div className="relative w-full aspect-[9/16] max-h-[60vh] bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center mx-auto shadow-inner">
                  <iframe
                    src={videoList[currentVideoIndex]}
                    title={`${agent.name} Exemplo ${currentVideoIndex + 1}`}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>

                {videoList.length > 1 && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() =>
                        setCurrentVideoIndex((prev) =>
                          prev === 0 ? videoList.length - 1 : prev - 1
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors"
                    >
                      ← Anterior
                    </button>
                    <span className="text-[11px] font-medium text-slate-400">
                      {currentVideoIndex + 1} / {videoList.length}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentVideoIndex((prev) =>
                          prev === videoList.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors"
                    >
                      Próximo →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                Nenhum vídeo cadastrado para este agente.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
