import React from 'react';
import { MessageSquare, Sparkles, Heart, Copy, Zap, Flame, Play, ExternalLink, MessageCircle, X } from 'lucide-react';
import { Agent } from '../types';

function getSafeImageUrl(url?: string): string {
  if (!url) return '';
  if (url.includes('postimg.cc') || url.includes('postimg.org')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
  }
  return url;
}

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

  const currentVideoUrl = videoList[currentVideoIndex] || agent.exampleVideoUrl;

  const isTikTokModule = React.useMemo(() => {
    return agent.category === 'Tiktok 2K' || agent.category === 'Tiktok Shop' || agent.category?.toLowerCase().includes('tiktok');
  }, [agent.category]);

  const showExampleButton = isTikTokModule || videoList.length > 0;

  const getVimeoEmbedUrl = (url?: string) => {
    if (!url) return null;
    const match = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
    if (match && match[1]) {
      return `https://player.vimeo.com/video/${match[1]}?autoplay=1&autopause=0`;
    }
    return url;
  };
  // Category Theme calculation
  const theme = React.useMemo(() => {
    switch (agent.category) {
      case 'Tiktok Shop':
        return {
          borderColor: 'border-emerald-400/80',
          glowShadow: 'shadow-[0_0_50px_rgba(16,185,129,0.8)]',
          badgeBg: 'bg-emerald-950/80 text-emerald-200 border border-emerald-400/60',
          badgeLabel: '🛒 TikTok Shop',
          titleGradient: 'from-white via-emerald-100 to-teal-300',
          footerColor: 'text-emerald-300',
          hoverBorder: 'hover:border-emerald-500/60 hover:shadow-emerald-500/20',
          btnGradient: 'from-emerald-500 via-teal-600 to-green-600 hover:from-emerald-400 hover:to-green-500 shadow-emerald-500/40 border border-emerald-300/60',
        };
      case 'Recurso Anti-Violação':
        return {
          borderColor: 'border-rose-400/80',
          glowShadow: 'shadow-[0_0_50px_rgba(244,63,94,0.8)]',
          badgeBg: 'bg-rose-950/80 text-rose-200 border border-rose-400/60',
          badgeLabel: '🛡️ Anti-Violação',
          titleGradient: 'from-white via-rose-100 to-amber-300',
          footerColor: 'text-rose-300',
          hoverBorder: 'hover:border-rose-500/60 hover:shadow-rose-500/20',
          btnGradient: 'from-rose-500 via-red-600 to-amber-600 hover:from-rose-400 hover:to-amber-500 shadow-rose-500/40 border border-rose-300/60',
        };
      case 'Suporte':
        return {
          borderColor: 'border-violet-400/80',
          glowShadow: 'shadow-[0_0_50px_rgba(139,92,246,0.8)]',
          badgeBg: 'bg-violet-950/80 text-violet-200 border border-violet-400/60',
          badgeLabel: '🎧 Suporte GZ Pro',
          titleGradient: 'from-white via-violet-100 to-indigo-300',
          footerColor: 'text-violet-300',
          hoverBorder: 'hover:border-violet-500/60 hover:shadow-violet-500/20',
          btnGradient: 'from-violet-500 via-purple-600 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 shadow-violet-500/40 border border-violet-300/60',
        };
      case 'Tiktok 2K':
      default:
        return {
          borderColor: 'border-cyan-400/80',
          glowShadow: 'shadow-[0_0_50px_rgba(34,211,238,0.8)]',
          badgeBg: 'bg-cyan-950/80 text-cyan-200 border border-cyan-400/60',
          badgeLabel: '⚡ TikTok 2K',
          titleGradient: 'from-white via-cyan-100 to-sky-300',
          footerColor: 'text-cyan-300',
          hoverBorder: 'hover:border-cyan-500/60 hover:shadow-cyan-500/20',
          btnGradient: 'from-emerald-500 via-teal-600 to-green-600 hover:from-emerald-400 hover:to-green-500 shadow-emerald-500/40 border border-emerald-300/60',
        };
    }
  }, [agent.category]);

  // Open direct ChatGPT link if available
  const handleOpenChatGPT = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (agent.chatGptUrl) {
      window.open(agent.chatGptUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const targetGeminiUrl = agent.geminiUrl || ((agent.category === 'Tiktok Shop' || agent.category === 'Tiktok 2K' || agent.category === 'Recurso Anti-Violação') ? 'https://gemini.google.com/gem/1ytmjN-QrbLkcPzV03sfl--JL6tBF0mvL?usp=sharing' : undefined);

  // Open direct Gemini link if available
  const handleOpenGemini = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (targetGeminiUrl) {
      window.open(targetGeminiUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Render stylized visual poster based on slug
  const renderPosterGraphic = () => {
    // Shared Cinematic Atmospheric Elements
    const AtmosphericEffects = () => (
      <>
        {/* Deep Blue & Cyan Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-blue-950/90 to-cyan-950 pointer-events-none" />
        
        {/* Volumetric Smoke / Fog Layer */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(14,165,233,0.25)_0%,_rgba(2,6,23,0.92)_75%)] pointer-events-none" />
        
        {/* Energy Light Rays */}
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_46%,rgba(34,211,238,0.15)_50%,transparent_54%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(-45deg,transparent_46%,rgba(56,189,248,0.12)_50%,transparent_54%)] pointer-events-none" />

        {/* Luminous Light Particles */}
        <div className="absolute top-1/4 left-1/4 w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.9)] animate-ping pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-2 h-2 rounded-full bg-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.9)] pointer-events-none" />
        <div className="absolute bottom-1/3 left-1/3 w-1 h-1 rounded-full bg-cyan-100 shadow-[0_0_8px_rgba(255,255,255,0.9)] pointer-events-none" />
        <div className="absolute top-2/3 right-1/3 w-2.5 h-2.5 rounded-full bg-blue-300/60 blur-xs pointer-events-none" />

        {/* Dark Vignette Overlay for Depth & High Contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/80 pointer-events-none" />
      </>
    );

    // If agent has a custom coverImage (e.g. TikTok Shop or TikTok 2K posters), use the clean full-poster card layout
    if (agent.coverImage) {
      const safeCoverUrl = getSafeImageUrl(agent.coverImage);

      return (
        <div className="relative w-full h-full bg-slate-950 flex flex-col justify-between p-2.5 sm:p-3.5 overflow-hidden text-center select-none rounded-2xl">
          {/* Single Full-bleed Cover Image */}
          <img
            src={safeCoverUrl}
            alt={agent.name}
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src.includes('wsrv.nl') && agent.coverImage) {
                target.src = agent.coverImage;
              } else if (agent.coverImage && !target.src.includes('wsrv.nl')) {
                target.src = `https://wsrv.nl/?url=${encodeURIComponent(agent.coverImage)}`;
              }
            }}
            className="absolute inset-0 w-full h-full object-cover object-center opacity-100 group-hover:scale-105 transition-transform duration-500 pointer-events-none"
            referrerPolicy="no-referrer"
          />

          {/* Top Badge */}
          <div className="relative z-10 flex justify-between items-center pointer-events-auto">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${theme.badgeBg} backdrop-blur-md shadow-lg`}>
              {theme.badgeLabel}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(agent.id);
              }}
              className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md transition-transform active:scale-90 border border-white/20"
            >
              <Heart className={`w-4 h-4 ${agent.isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
            </button>
          </div>

          {/* Bottom Footer Line */}
          <div className="relative z-10 pt-1.5 border-t border-white/10 flex items-center justify-end pointer-events-auto">
            <span className={`text-[10px] font-extrabold ${theme.footerColor} flex items-center space-x-1 drop-shadow-md`}>
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>{agent.usageCount || 100}+ Usos</span>
            </span>
          </div>
        </div>
      );
    }

    switch (agent.posterSlug) {
      case 'casquinha-animal':
        return (
          <div className="relative w-full h-full bg-slate-950 flex flex-col justify-between p-4 sm:p-5 overflow-hidden text-center select-none">
            <AtmosphericEffects />

            {/* Background Image & Lighting */}
            <img
              src={agent.coverImage || "https://images.unsplash.com/photo-1540573133985-758581d4df50?auto=format&fit=crop&w=1000&q=80"}
              alt="Casquinha Animal IA"
              className="absolute inset-0 w-full h-full object-cover object-center opacity-65 group-hover:scale-105 transition-transform duration-700 pointer-events-none mix-blend-luminosity"
              referrerPolicy="no-referrer"
            />

            {/* Glowing Neon Cyan Energy Ring */}
            <div className="absolute top-24 left-1/2 -translate-x-1/2 w-48 h-48 sm:w-56 sm:h-56 rounded-full border-2 border-cyan-400/90 shadow-[0_0_50px_rgba(34,211,238,0.95)] pointer-events-none animate-pulse" />
            <div className="absolute top-24 left-1/2 -translate-x-1/2 w-56 h-56 sm:w-64 sm:h-64 rounded-full border border-cyan-500/30 pointer-events-none" />

            {/* Top Badge */}
            <div className="relative z-10 flex justify-between items-center">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-950/80 text-cyan-200 border border-cyan-400/60 backdrop-blur-md shadow-[0_0_12px_rgba(34,211,238,0.4)]">
                ⚡ TikTok 2K Viral
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(agent.id);
                }}
                className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md transition-transform active:scale-90 border border-white/20"
              >
                <Heart className={`w-4 h-4 ${agent.isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
              </button>
            </div>

            {/* Center: Waffle Cone & Animal */}
            <div className="relative z-10 mt-6 mb-2 flex flex-col items-center">
              <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center">
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.8)] bg-gradient-to-b from-blue-900 to-slate-950 p-1">
                  <img
                    src="https://images.unsplash.com/photo-1540573133985-758581d4df50?auto=format&fit=crop&w=600&q=80"
                    alt="Filhote na casquinha"
                    className="w-full h-full object-cover object-top rounded-full filter contrast-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-0 inset-x-0 h-9 bg-slate-950/90 border-t border-cyan-400/60 flex items-center justify-center">
                    <span className="text-[10px] font-extrabold text-cyan-200 uppercase tracking-widest drop-shadow">
                      🍦 WAFFLE CONE
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Title & Subtitle */}
            <div className="relative z-10 mt-auto mb-1 flex flex-col items-center px-1">
              <div className="flex flex-col items-center leading-none mb-2">
                <h3 className="text-3xl sm:text-4xl font-black tracking-tight uppercase drop-shadow-[0_0_20px_rgba(34,211,238,0.8)] bg-clip-text text-transparent bg-gradient-to-b from-white via-cyan-100 to-sky-300">
                  CASQUINHA
                </h3>
                <h3 className="text-3xl sm:text-4xl font-black tracking-tight uppercase drop-shadow-[0_0_20px_rgba(34,211,238,0.8)] bg-clip-text text-transparent bg-gradient-to-b from-white via-cyan-100 to-sky-300">
                  ANIMAL
                </h3>
                <h3 className="text-4xl sm:text-5xl font-black tracking-widest uppercase drop-shadow-[0_0_30px_rgba(34,211,238,1)] bg-clip-text text-transparent bg-gradient-to-b from-cyan-100 via-sky-300 to-cyan-500 mt-1">
                  IA
                </h3>
              </div>

              <div className="w-full border-t border-b border-cyan-400/50 py-1.5 my-1 bg-slate-950/80 backdrop-blur-md rounded-md shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <p className="text-[9px] sm:text-[10px] font-black text-cyan-100 tracking-wider uppercase leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                  TRANSFORME ANIMAIS EM FOFURA COM APENAS UM PROMPT
                </p>
              </div>
            </div>

            {/* Bottom Footer Line */}
            <div className="relative z-10 pt-2 border-t border-cyan-500/30 flex items-center justify-end">
              <span className="text-[10px] font-black text-cyan-200 flex items-center space-x-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>2K/Dia Viral</span>
              </span>
            </div>
          </div>
        );

      case 'frutas-em-crise':
        return (
          <div className="relative w-full h-full bg-slate-950 flex flex-col justify-between p-4 sm:p-5 overflow-hidden text-center select-none">
            <AtmosphericEffects />

            {/* Top Badge */}
            <div className="relative z-10 flex justify-between items-center">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-950/80 text-cyan-200 border border-cyan-400/60 backdrop-blur-md shadow-[0_0_12px_rgba(34,211,238,0.4)]">
                🎭 Novela Frutas
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(agent.id);
                }}
                className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md transition-transform active:scale-90 border border-white/20"
              >
                <Heart className={`w-4 h-4 ${agent.isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
              </button>
            </div>

            {/* Center: Dramatic Fruit Conflict Element */}
            <div className="relative z-10 my-auto flex flex-col items-center">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-emerald-600 via-blue-900 to-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.5)] border-2 border-emerald-400/80 text-3xl sm:text-4xl transform -rotate-6 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                  🥑
                </div>
                <div className="text-xl sm:text-2xl font-black text-cyan-300 tracking-tighter drop-shadow-[0_0_12px_rgba(34,211,238,0.9)] animate-pulse">
                  VS
                </div>
                <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-br from-amber-500 via-blue-900 to-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.5)] border-2 border-amber-300/80 text-3xl sm:text-4xl transform rotate-6 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                  🍌
                </div>
              </div>

              {/* Title Integration */}
              <div className="text-xl sm:text-2xl font-black tracking-widest uppercase leading-none drop-shadow-[0_0_15px_rgba(34,211,238,0.7)] bg-clip-text text-transparent bg-gradient-to-b from-white via-cyan-100 to-sky-300">
                NOVELA
              </div>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight uppercase leading-tight drop-shadow-[0_0_20px_rgba(56,189,248,0.9)] bg-clip-text text-transparent bg-gradient-to-b from-white via-cyan-100 to-cyan-400">
                FRUTAS EM CRISE
              </h3>

              <div className="w-full border-t border-b border-cyan-400/40 py-1.5 mt-3 bg-slate-950/80 backdrop-blur-md rounded-md shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <p className="text-[9px] sm:text-[10px] font-black text-cyan-100 tracking-wider uppercase leading-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                  DRAMA, DISPUTA E SUPERAÇÃO NO MUNDO DAS FRUTAS
                </p>
              </div>
            </div>

            {/* Bottom Footer Line */}
            <div className="relative z-10 pt-2 border-t border-cyan-500/30 flex items-center justify-end">
              <span className="text-[10px] font-bold text-amber-300 flex items-center space-x-1">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Alta Retenção</span>
              </span>
            </div>
          </div>
        );

      case 'homem-da-roca':
        return (
          <div className="relative w-full h-full bg-slate-950 flex flex-col justify-between p-4 sm:p-5 overflow-hidden text-center select-none">
            <AtmosphericEffects />

            {/* Background Image: Rugged Cowboy Portrait */}
            <img
              src={agent.coverImage || "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=1000&q=80"}
              alt="Homem da Roça"
              className="absolute inset-0 w-full h-full object-cover object-center opacity-70 group-hover:scale-105 transition-transform duration-700 pointer-events-none mix-blend-luminosity"
              referrerPolicy="no-referrer"
            />

            {/* Glowing Blue Holographic Ring */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border-2 border-cyan-400/80 shadow-[0_0_50px_rgba(34,211,238,0.9)] pointer-events-none animate-pulse" />

            {/* Top Badge */}
            <div className="relative z-10 flex justify-between items-center">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-950/80 text-cyan-200 border border-cyan-400/60 backdrop-blur-md shadow-[0_0_12px_rgba(34,211,238,0.4)]">
                🤠 Roça & Sertanejo
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(agent.id);
                }}
                className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md transition-transform active:scale-90 border border-white/20"
              >
                <Heart className={`w-4 h-4 ${agent.isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
              </button>
            </div>

            {/* Bottom Title & Subtitle */}
            <div className="relative z-10 mt-auto mb-2 flex flex-col items-center px-1">
              <h3 className="text-3xl sm:text-4xl font-black tracking-tight uppercase drop-shadow-[0_0_20px_rgba(34,211,238,0.9)] bg-clip-text text-transparent bg-gradient-to-b from-white via-cyan-100 to-sky-300 leading-none mb-2">
                HOMEM DA ROÇA
              </h3>

              <div className="w-full border-t border-b border-cyan-400/50 py-2 bg-slate-950/85 backdrop-blur-md rounded-md shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <p className="text-[9px] sm:text-[10px] font-black text-cyan-100 tracking-wider uppercase leading-relaxed drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                  O MÉTODO PARA GANHAR SEGUIDORES E VIRALIZAR RAPIDAMENTE
                </p>
              </div>
            </div>

            {/* Bottom Footer Line */}
            <div className="relative z-10 pt-2 border-t border-cyan-500/30 flex items-center justify-end">
              <span className="text-[10px] font-black text-emerald-400 flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span>Viral Agro</span>
              </span>
            </div>
          </div>
        );

      case 'mulher-da-roca':
        return (
          <div className="relative w-full h-full bg-slate-950 flex flex-col justify-between p-4 sm:p-5 overflow-hidden text-center select-none">
            <AtmosphericEffects />

            {/* Background Image: Smiling Cowgirl */}
            <img
              src={agent.coverImage || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1000&q=80"}
              alt="Mulher da Roça"
              className="absolute inset-0 w-full h-full object-cover object-top opacity-70 group-hover:scale-105 transition-transform duration-700 pointer-events-none mix-blend-luminosity"
              referrerPolicy="no-referrer"
            />

            {/* Glowing Blue Circuit Halo */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full border border-cyan-400/60 shadow-[0_0_50px_rgba(34,211,238,0.8)] pointer-events-none" />

            {/* Top Badge */}
            <div className="relative z-10 flex justify-between items-center">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-950/80 text-cyan-200 border border-cyan-400/60 backdrop-blur-md shadow-[0_0_12px_rgba(34,211,238,0.4)]">
                👩‍🌾 Mulher Agro
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(agent.id);
                }}
                className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md transition-transform active:scale-90 border border-white/20"
              >
                <Heart className={`w-4 h-4 ${agent.isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
              </button>
            </div>

            {/* Bottom Title & Subtitle */}
            <div className="relative z-10 mt-auto mb-2 flex flex-col items-center px-1">
              <h3 className="text-3xl sm:text-4xl font-black tracking-tight uppercase drop-shadow-[0_0_20px_rgba(34,211,238,0.9)] bg-clip-text text-transparent bg-gradient-to-b from-white via-cyan-100 to-sky-300 leading-none mb-2">
                MULHER DA ROÇA
              </h3>

              <div className="w-full border-t border-b border-cyan-400/50 py-2 bg-slate-950/85 backdrop-blur-md rounded-md shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <p className="text-[9px] sm:text-[10px] font-black text-cyan-100 tracking-wider uppercase leading-relaxed drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                  O MÉTODO PARA GANHAR SEGUIDORES E VIRALIZAR RÁPIDO
                </p>
              </div>
            </div>

            {/* Bottom Footer Line */}
            <div className="relative z-10 pt-2 border-t border-cyan-500/30 flex items-center justify-end">
              <span className="text-[10px] font-black text-amber-300 flex items-center space-x-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Nicho Forte</span>
              </span>
            </div>
          </div>
        );

      case 'babybola-viral':
        return (
          <div className="relative w-full h-full bg-slate-950 flex flex-col justify-between p-4 sm:p-5 overflow-hidden text-center select-none">
            <AtmosphericEffects />

            {/* Top Badge */}
            <div className="relative z-10 flex justify-between items-center">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-950/80 text-cyan-200 border border-cyan-400/60 backdrop-blur-md shadow-[0_0_12px_rgba(34,211,238,0.4)]">
                👶⚽ Bebês & Futebol
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(agent.id);
                }}
                className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md transition-transform active:scale-90 border border-white/20"
              >
                <Heart className={`w-4 h-4 ${agent.isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
              </button>
            </div>

            {/* Center: Baby & Soccer Ball Fusion Element */}
            <div className="relative z-10 my-auto flex flex-col items-center">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-900 text-2xl flex items-center justify-center border-2 border-cyan-400/80 shadow-[0_0_15px_rgba(34,211,238,0.6)]">
                  👶
                </div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-3xl flex items-center justify-center border-2 border-white shadow-[0_0_25px_rgba(34,211,238,0.9)] scale-110">
                  ⚽
                </div>
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-900 text-2xl flex items-center justify-center border-2 border-cyan-400/80 shadow-[0_0_15px_rgba(34,211,238,0.6)]">
                  👶
                </div>
              </div>

              <h3 className="text-3xl sm:text-4xl font-black tracking-tight uppercase drop-shadow-[0_0_20px_rgba(34,211,238,0.9)] bg-clip-text text-transparent bg-gradient-to-b from-white via-cyan-100 to-sky-300 leading-tight">
                BABYBOLA VIRAL
              </h3>

              <div className="w-full border-t border-b border-cyan-400/50 py-2 mt-3 bg-slate-950/85 backdrop-blur-md rounded-md shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <p className="text-[9px] sm:text-[10px] font-black text-cyan-100 tracking-wider uppercase leading-relaxed drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                  O MÉTODO PARA VIRALIZAR COM BEBÊS E FUTEBOL
                </p>
              </div>
            </div>

            {/* Bottom Footer Line */}
            <div className="relative z-10 pt-2 border-t border-cyan-500/30 flex items-center justify-end">
              <span className="text-[10px] font-black text-cyan-300 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Super Engajador</span>
              </span>
            </div>
          </div>
        );

      case 'dama-vidente':
        return (
          <div className="relative w-full h-full bg-slate-950 flex flex-col justify-between p-4 sm:p-5 overflow-hidden text-center select-none">
            <AtmosphericEffects />

            {/* Background Image: Mystic Woman */}
            <img
              src={agent.coverImage || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80"}
              alt="Dama Vidente"
              className="absolute inset-0 w-full h-full object-cover object-top opacity-70 group-hover:scale-105 transition-transform duration-700 pointer-events-none mix-blend-luminosity"
              referrerPolicy="no-referrer"
            />

            {/* Floating Glowing Blue Tarot Cards */}
            <div className="absolute top-12 left-2 w-14 h-20 border border-cyan-400/80 rounded bg-slate-950/80 p-1 backdrop-blur-xs transform -rotate-12 shadow-[0_0_15px_rgba(34,211,238,0.7)] pointer-events-none flex flex-col items-center justify-center text-[7px] font-mono text-cyan-200">
              <span className="font-bold">HIGH</span>
              <span className="font-bold">PRIESTESS</span>
            </div>
            <div className="absolute top-10 right-2 w-14 h-20 border border-cyan-400/80 rounded bg-slate-950/80 p-1 backdrop-blur-xs transform rotate-12 shadow-[0_0_15px_rgba(34,211,238,0.7)] pointer-events-none flex flex-col items-center justify-center text-[7px] font-mono text-cyan-200">
              <span className="font-bold">THE</span>
              <span className="font-bold">MOON</span>
            </div>

            {/* Glowing Blue Astrological Zodiac Ring */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-cyan-400/70 shadow-[0_0_40px_rgba(34,211,238,0.8)] pointer-events-none animate-pulse" />

            {/* Top Badge */}
            <div className="relative z-10 flex justify-between items-center">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-950/80 text-cyan-200 border border-cyan-400/60 backdrop-blur-md shadow-[0_0_12px_rgba(34,211,238,0.4)]">
                🔮 Tarot & Mistério
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(agent.id);
                }}
                className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md transition-transform active:scale-90 border border-white/20"
              >
                <Heart className={`w-4 h-4 ${agent.isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
              </button>
            </div>

            {/* Bottom Title & Subtitle */}
            <div className="relative z-10 mt-auto mb-2 flex flex-col items-center px-1">
              <h3 className="text-3xl sm:text-4xl font-black tracking-widest uppercase drop-shadow-[0_0_20px_rgba(34,211,238,0.9)] bg-clip-text text-transparent bg-gradient-to-b from-white via-cyan-100 to-sky-300 leading-none mb-2">
                DAMA VIDENTE
              </h3>

              <div className="w-full border-t border-b border-cyan-400/50 py-2 bg-slate-950/85 backdrop-blur-md rounded-md shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <p className="text-[9px] sm:text-[10px] font-black text-cyan-100 tracking-wider uppercase leading-relaxed drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                  COMO CRIAR MISTÉRIO, AUTORIDADE E CONEXÃO EMOCIONAL
                </p>
              </div>
            </div>

            {/* Bottom Footer Line */}
            <div className="relative z-10 pt-2 border-t border-cyan-500/30 flex items-center justify-end">
              <span className="text-[10px] font-black text-cyan-200 flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Mistério Viral</span>
              </span>
            </div>
          </div>
        );

      case 'mensageiro-de-deus':
        return (
          <div className="relative w-full h-full bg-slate-950 flex flex-col justify-between p-4 sm:p-5 overflow-hidden text-center select-none">
            {/* Atmospheric Celestial Cosmic Background */}
            <AtmosphericEffects />

            {/* Descending Divine Beam of Light from Top */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-80 bg-gradient-to-b from-white/60 via-cyan-300/30 to-transparent pointer-events-none filter blur-2xl" />

            {/* Electric Blue Portal / Energy Halo Circle behind Central Figure's Head & Shoulders */}
            <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-80 sm:h-80 rounded-full border-2 border-cyan-300 shadow-[0_0_90px_rgba(34,211,238,1)] pointer-events-none animate-pulse" />
            <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 sm:w-96 sm:h-96 rounded-full border border-sky-400/40 animate-spin pointer-events-none" style={{ animationDuration: '30s' }} />

            {/* Volumetric Blue Energetic Smoke & Fog Overlay at Bottom */}
            <div className="absolute bottom-0 inset-x-0 h-52 bg-gradient-to-t from-slate-950 via-blue-950/90 to-transparent pointer-events-none filter blur-md" />
            
            {/* Sparkling Luminous Light Particles */}
            <div className="absolute bottom-20 left-1/5 w-2.5 h-2.5 bg-cyan-300 rounded-full blur-xs shadow-[0_0_15px_rgba(34,211,238,1)] animate-ping pointer-events-none" />
            <div className="absolute bottom-28 right-1/4 w-2 h-2 bg-white rounded-full blur-xs shadow-[0_0_12px_rgba(255,255,255,1)] animate-pulse pointer-events-none" />
            <div className="absolute top-1/4 left-1/4 w-1.5 h-1.5 bg-sky-200 rounded-full shadow-[0_0_10px_rgba(56,189,248,1)] pointer-events-none" />

            {/* Top Badge */}
            <div className="relative z-10 flex justify-between items-center">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-950/80 text-cyan-200 border border-cyan-400/60 backdrop-blur-md shadow-[0_0_12px_rgba(34,211,238,0.4)]">
                ✨ Mensagens de Fé
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(agent.id);
                }}
                className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md transition-transform active:scale-90 border border-white/20"
              >
                <Heart className={`w-4 h-4 ${agent.isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
              </button>
            </div>

            {/* Central Figure: Representation of Jesus in White Tunic, Brown Mantle, Open Palms & Serene Expression */}
            <div className="relative z-10 my-auto flex flex-col items-center">
              <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center">
                {/* Outer Energy Rim */}
                <div className="absolute inset-0 rounded-full border-2 border-cyan-300 shadow-[0_0_50px_rgba(34,211,238,0.9)] animate-pulse" />

                {/* Central Jesus Figure Frame */}
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border-2 border-amber-200/90 shadow-[0_0_40px_rgba(34,211,238,1)] bg-gradient-to-b from-blue-900 via-slate-900 to-black p-1 flex items-center justify-center">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80"
                    alt="Jesus Cristo - Mensageiro de Deus"
                    className="w-full h-full object-cover object-top rounded-full filter contrast-125 saturate-110 brightness-105"
                    referrerPolicy="no-referrer"
                  />
                  {/* Subtle Divine Cyan Rim Light */}
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 via-cyan-400/10 to-white/25 pointer-events-none rounded-full" />
                </div>

                {/* Open Welcoming Hands Gestures Overlay / Welcoming Aura */}
                <div className="absolute -bottom-2 inset-x-0 flex justify-between px-2 pointer-events-none">
                  <div className="w-8 h-8 rounded-full bg-slate-900/90 border border-cyan-400/80 shadow-[0_0_12px_rgba(34,211,238,0.8)] flex items-center justify-center text-xs">
                    🪬
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-900/90 border border-cyan-400/80 shadow-[0_0_12px_rgba(34,211,238,0.8)] flex items-center justify-center text-xs">
                    🪬
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Cinematic Typography & Layout */}
            <div className="relative z-10 mt-auto mb-1 flex flex-col items-center px-1">
              {/* Grand Title "MENSAGEIRO DE DEUS" in Serif Font */}
              <h3 className="text-2xl sm:text-3xl font-black font-serif tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-sky-200 drop-shadow-[0_0_25px_rgba(34,211,238,1)] leading-tight">
                MENSAGEIRO DE DEUS
              </h3>

              {/* Glowing Blue Line with Center Diamond Ornament */}
              <div className="flex items-center justify-center space-x-2 my-2 w-full px-4">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-cyan-400 to-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
                <div className="w-2.5 h-2.5 rotate-45 bg-cyan-200 border border-white shadow-[0_0_12px_rgba(34,211,238,1)] flex-shrink-0 animate-pulse" />
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-cyan-400 to-cyan-200 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
              </div>

              {/* Subtitle "Conteúdo Baseado na Fé que Toca e Espalha" */}
              <p className="text-[11px] sm:text-[12px] font-sans font-medium text-white/95 tracking-wide leading-tight drop-shadow-[0_0_10px_rgba(34,211,238,0.7)]">
                Conteúdo Baseado na Fé que Toca e Espalha
              </p>
            </div>

            {/* Bottom Footer Line */}
            <div className="relative z-10 pt-2 border-t border-cyan-500/30 flex items-center justify-end">
              <span className="text-[10px] font-black text-cyan-200 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Fé & Inspiração</span>
              </span>
            </div>
          </div>
        );

      default: {
        const rawBg = agent.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80';
        const bgImg = getSafeImageUrl(rawBg);
        const hideCardOverlays = Boolean(agent.coverImage);

        return (
          <div className="relative w-full h-full bg-slate-950 flex flex-col justify-between p-4 sm:p-5 overflow-hidden text-center select-none">
            <AtmosphericEffects />

            {/* Background Cover Image with Blend */}
            <img
              src={bgImg}
              alt={agent.name}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src.includes('wsrv.nl') && rawBg) {
                  target.src = rawBg;
                } else if (rawBg && !target.src.includes('wsrv.nl')) {
                  target.src = `https://wsrv.nl/?url=${encodeURIComponent(rawBg)}`;
                }
              }}
              className={`absolute inset-0 w-full h-full object-cover object-center ${hideCardOverlays ? 'opacity-100 group-hover:scale-105 transition-transform duration-700 pointer-events-none' : 'opacity-60 group-hover:scale-105 transition-transform duration-700 pointer-events-none mix-blend-luminosity'}`}
              referrerPolicy="no-referrer"
            />

            {/* Glowing Neon Ring in Theme Color */}
            {!hideCardOverlays && (
              <div className={`absolute top-20 left-1/2 -translate-x-1/2 w-44 h-44 sm:w-52 sm:h-52 rounded-full border-2 ${theme.borderColor} ${theme.glowShadow} pointer-events-none animate-pulse`} />
            )}

            {/* Top Badge */}
            <div className="relative z-10 flex justify-between items-center">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${theme.badgeBg} backdrop-blur-md shadow-lg`}>
                {theme.badgeLabel}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(agent.id);
                }}
                className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md transition-transform active:scale-90 border border-white/20"
              >
                <Heart className={`w-4 h-4 ${agent.isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
              </button>
            </div>

            {/* Center Avatar / Portrait Frame */}
            {!hideCardOverlays && (
              <div className="relative z-10 my-auto flex flex-col items-center">
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-white/80 shadow-2xl bg-gradient-to-b from-slate-900 to-black p-1 flex items-center justify-center">
                  <img
                    src={bgImg}
                    alt={agent.name}
                    className="w-full h-full object-cover rounded-full filter contrast-110 saturate-110"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            )}

            {/* Bottom Cinematic Title & Tagline Banner */}
            <div className="relative z-10 mt-auto mb-1 flex flex-col items-center px-1">
              {!hideCardOverlays && (
                <h3 className={`text-xl sm:text-2xl font-black tracking-tight uppercase leading-tight drop-shadow-lg bg-clip-text text-transparent bg-gradient-to-b ${theme.titleGradient}`}>
                  {agent.name}
                </h3>
              )}

              {!hideCardOverlays && agent.tagline && (
                <div className="w-full border-t border-b border-white/20 py-1.5 my-1.5 bg-slate-950/85 backdrop-blur-md rounded-md shadow-md">
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-100 tracking-wide uppercase leading-tight line-clamp-2">
                    {agent.tagline}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Footer Line */}
            <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-end">
              <span className={`text-[10px] font-extrabold ${theme.footerColor} flex items-center space-x-1`}>
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>{agent.usageCount || 100}+ Usos</span>
              </span>
            </div>
          </div>
        );
      }
    }
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
            // Close overlay if background tapped
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

      {/* Embedded Video Modal directly on screen */}
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
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pagination Controls for multiple videos */}
            {videoList.length > 1 && (
              <div className="flex items-center justify-between bg-slate-950/80 p-2 rounded-xl border border-slate-800/90">
                <button
                  onClick={() => setCurrentVideoIndex((prev) => (prev > 0 ? prev - 1 : videoList.length - 1))}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold flex items-center space-x-1 border border-slate-700/80 transition-colors"
                >
                  <span>&larr; Anterior</span>
                </button>

                <div className="flex items-center space-x-1.5">
                  {videoList.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentVideoIndex(idx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                        idx === currentVideoIndex
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md shadow-amber-500/20 scale-105'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {idx + 1}/{videoList.length}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentVideoIndex((prev) => (prev < videoList.length - 1 ? prev + 1 : 0))}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold flex items-center space-x-1 border border-slate-700/80 transition-colors"
                >
                  <span>Próximo &rarr;</span>
                </button>
              </div>
            )}

            {videoList.length > 0 ? (
              <div className="relative w-full aspect-[9/16] max-h-[60vh] sm:max-h-[65vh] rounded-xl overflow-hidden bg-black border border-slate-800 shadow-inner mx-auto">
                <iframe
                  key={currentVideoUrl}
                  src={getVimeoEmbedUrl(currentVideoUrl) || currentVideoUrl}
                  title={`Exemplo em Vídeo - ${agent.name}`}
                  className="w-full h-full border-0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="relative w-full aspect-[9/16] max-h-[50vh] sm:max-h-[55vh] rounded-xl overflow-hidden bg-slate-950/90 border border-slate-800/80 shadow-inner mx-auto flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-rose-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl shadow-lg shadow-orange-500/10">
                  ▶️
                </div>
                <div className="space-y-1.5 max-w-xs">
                  <h4 className="text-base font-black text-white">Vídeo de Exemplo em Breve</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Nenhum vídeo cadastrado no momento para o agente <strong className="text-amber-300">{agent.name}</strong>. Os vídeos de exemplo serão adicionados em breve!
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] font-bold text-slate-400">
                  Módulo {agent.category}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
              <span className="truncate">{agent.category} • {agent.name}</span>
              {videoList.length > 1 && (
                <span className="font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                  Exemplo {currentVideoIndex + 1} de {videoList.length}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

