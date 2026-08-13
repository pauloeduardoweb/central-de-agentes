import React, { useEffect, useRef } from 'react';
import { Play, MessageCircle, ExternalLink, Sparkles } from 'lucide-react';
import { Agent } from '../../types';
import { AgentControlHeader } from './AgentControlHeader';
import { AgentStatusBlock } from './AgentStatusBlock';
import { AgentPrimaryAction } from './AgentPrimaryAction';
import { AgentActionCard } from './AgentActionCard';
import { AgentOrganizationActions } from './AgentOrganizationActions';
import { AgentControlFooter } from './AgentControlFooter';

export interface AgentControlCenterProps {
  agent: Agent;
  isOpen: boolean;
  isFavorite: boolean;
  isPinned: boolean;
  canPin?: boolean;
  onOpenLocal: (agent: Agent) => void;
  onOpenChatGPT?: (e: React.MouseEvent) => void;
  onOpenGemini?: (e: React.MouseEvent) => void;
  onWatchExample?: () => void;
  onToggleFavorite: (id: string) => void;
  onTogglePinned?: (id: string) => void;
  onClose: () => void;
}

export const AgentControlCenter: React.FC<AgentControlCenterProps> = ({
  agent,
  isOpen,
  isFavorite,
  isPinned,
  canPin = true,
  onOpenLocal,
  onOpenChatGPT,
  onOpenGemini,
  onWatchExample,
  onToggleFavorite,
  onTogglePinned,
  onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Keyboard Escape listener & focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Lock body and html scroll to prevent background scroll on mobile
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    window.addEventListener('keydown', handleKeyDown);

    // Focus modal
    if (modalRef.current) {
      modalRef.current.focus();
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Determine if this is the Mensageiro de Deus isolated visual test
  const isMensageiroDeDeus =
    agent.id === 'agent-tiktok2k-mensageiro-de-deus' ||
    agent.name?.toLowerCase().trim() === 'mensageiro de deus';

  // Determine if this is Vitrine dos Heróis
  const isVitrineDosHerois =
    agent.id === 'agent-shop-vitrine-dos-herois' ||
    agent.name?.toLowerCase().trim().includes('vitrine dos heróis') ||
    agent.name?.toLowerCase().trim().includes('vitrine dos herois');

  // Determine if agent has example video/demo
  const hasExample = Boolean(
    agent.exampleVideoUrl || (agent.exampleVideoUrls && agent.exampleVideoUrls.length > 0)
  );

  // ChatGPT or WhatsApp link check
  const isWhatsApp = agent.chatGptUrl?.includes('wa.me');

  const handleWatchExample = () => {
    if (onWatchExample) {
      onWatchExample();
    } else {
      const videoUrl = agent.exampleVideoUrl || agent.exampleVideoUrls?.[0];
      if (videoUrl) {
        window.open(videoUrl, '_blank');
      }
    }
  };

  const handleOpenChatGPT = (e: React.MouseEvent) => {
    if (onOpenChatGPT) {
      onOpenChatGPT(e);
    } else if (agent.chatGptUrl) {
      window.open(agent.chatGptUrl, '_blank');
    }
  };

  const handleOpenGemini = (e: React.MouseEvent) => {
    if (onOpenGemini) {
      onOpenGemini(e);
    } else if (agent.geminiUrl) {
      window.open(agent.geminiUrl, '_blank');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 overflow-hidden md:overflow-y-auto bg-slate-950/80 md:bg-slate-900/60 backdrop-blur-md md:backdrop-blur-sm transition-all animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Central Modal Container (Fullscreen Mobile < md | Sleek Smartphone Frame >= md) */}
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Central de Controle do Agente - ${agent.name}`}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full h-[100dvh] md:h-auto md:max-h-[calc(100vh-24px)] md:max-w-[400px] my-0 md:my-auto bg-gradient-to-b from-[#07111f] via-[#0a192f] to-[#040d1a] border-0 md:border md:border-cyan-500/30 md:hover:border-cyan-400/60 rounded-none md:rounded-[28px] md:sm:rounded-[32px] p-3.5 pt-[calc(0.875rem+env(safe-area-inset-top,0px))] pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))] md:p-4.5 shadow-none md:shadow-[0_0_35px_rgba(6,182,212,0.2),0_20px_50px_rgba(0,0,0,0.8)] ring-0 md:ring-1 md:ring-cyan-500/20 text-white outline-none transform animate-in zoom-in-95 fade-in duration-200 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700/50 scrollbar-track-transparent flex flex-col justify-between overflow-x-hidden"
      >
        {/* Futuristic Background Texture */}
        <div
          className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
          style={{
            backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Mobile Smartphone Top Notch / Speaker Line Indicator (Shown ONLY on Tablet/Desktop) */}
        <div className="hidden md:block w-12 h-1 rounded-full bg-slate-700/80 border border-slate-600/50 mx-auto mb-2 shrink-0 opacity-80 relative z-10" />

        {/* Ambient Subtle Cyan Glow Backdrop behind Modal Header */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-24 bg-gradient-to-tr from-cyan-500/20 via-blue-500/10 to-transparent blur-2xl pointer-events-none rounded-full" />

        <div className="relative z-10 space-y-2 sm:space-y-2.5">
          {/* Header Section */}
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <AgentControlHeader agent={agent} onClose={onClose} />
          </div>

          {/* PARTE SUPERIOR: Aviso destacado para Vitrine dos Heróis */}
          {isVitrineDosHerois && (
            <div className="relative overflow-hidden bg-gradient-to-r from-amber-950/80 via-yellow-950/60 to-amber-950/80 border border-amber-500/50 rounded-xl p-3 text-center shadow-[0_0_15px_rgba(245,158,11,0.25)] animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-center space-x-2 text-amber-200 font-bold text-xs sm:text-sm tracking-wide">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                <span>Recomendação Plataforma: Grok (Sem Direitos Autorais)</span>
              </div>
            </div>
          )}

          {/* ISOLATED LAYOUT FOR "MENSAGEIRO DE DEUS" */}
          {isMensageiroDeDeus ? (
            <>
              {/* Agent Status Block (without Local badge) */}
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <AgentStatusBlock agent={agent} hideLocalBadge={true} />
              </div>

              {/* Exact Ordered Stack:
                  1. ASSISTIR EXEMPLO (Amber)
                  2. ABRIR NO APP (BETA) (Cyan/Blue Primary CTA)
                  3. ABRIR NO CHATGPT (Emerald/Green)
                  4. ABRIR NO GEMINI (Purple/Roxo)
              */}
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* 1. ASSISTIR EXEMPLO */}
                <AgentActionCard
                  title="ASSISTIR EXEMPLO"
                  description="Veja uma demonstração completa antes de utilizar."
                  icon={<Play className="w-3.5 h-3.5 text-amber-300 fill-amber-300/30" />}
                  variant="amber"
                  onClick={handleWatchExample}
                />

                {/* 2. ABRIR NO APP (BETA) */}
                <AgentPrimaryAction agent={agent} onOpenLocal={onOpenLocal} />

                {/* 3. ABRIR NO CHATGPT */}
                {(agent.chatGptUrl || onOpenChatGPT) && (
                  <AgentActionCard
                    title={isWhatsApp ? 'ABRIR WHATSAPP' : 'ABRIR NO CHATGPT'}
                    description={
                      isWhatsApp
                        ? 'Conecte-se diretamente com o suporte via WhatsApp.'
                        : 'Use a estrutura oficial deste agente no ChatGPT.'
                    }
                    icon={
                      isWhatsApp ? (
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-300 fill-emerald-300/30" />
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-300" />
                      )
                    }
                    variant="emerald"
                    badge={isWhatsApp ? 'WHATSAPP' : undefined}
                    isExternal={true}
                    onClick={handleOpenChatGPT}
                  />
                )}

                {/* 4. ABRIR NO GEMINI */}
                {(agent.geminiUrl || onOpenGemini) && (
                  <AgentActionCard
                    title="ABRIR NO GEMINI"
                    description="Execute este agente na plataforma Gemini."
                    icon={<Sparkles className="w-3.5 h-3.5 text-purple-300" />}
                    variant="purple"
                    isExternal={true}
                    onClick={handleOpenGemini}
                  />
                )}
              </div>
            </>
          ) : (
            /* STANDARD LAYOUT FOR ALL OTHER AGENTS */
            <>
              {/* Agent Status Block */}
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <AgentStatusBlock agent={agent} />
              </div>

              {/* Primary Action Block - ABRIR NO APP (Chat Local) */}
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <AgentPrimaryAction agent={agent} onOpenLocal={onOpenLocal} />
              </div>

              {/* Secondary Action Cards Stack */}
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Assistir Exemplo Card */}
                {hasExample && (
                  <AgentActionCard
                    title="ASSISTIR EXEMPLO"
                    description="Veja uma demonstração completa antes de utilizar."
                    icon={<Play className="w-3.5 h-3.5 text-amber-300 fill-amber-300/30" />}
                    variant="amber"
                    onClick={handleWatchExample}
                  />
                )}

                {/* Abrir no ChatGPT / WhatsApp Card */}
                {!isVitrineDosHerois && (agent.chatGptUrl || onOpenChatGPT) && (
                  <AgentActionCard
                    title={isWhatsApp ? 'ABRIR WHATSAPP' : 'ABRIR NO CHATGPT'}
                    description={
                      isWhatsApp
                        ? 'Conecte-se diretamente com o suporte via WhatsApp.'
                        : 'Use a estrutura oficial deste agente no ChatGPT.'
                    }
                    icon={
                      isWhatsApp ? (
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-300 fill-emerald-300/30" />
                      ) : (
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-300" />
                      )
                    }
                    variant="emerald"
                    badge={isWhatsApp ? 'WHATSAPP' : undefined}
                    isExternal={true}
                    onClick={handleOpenChatGPT}
                  />
                )}

                {/* Abrir no Gemini Card */}
                {(agent.geminiUrl || onOpenGemini) && (
                  <AgentActionCard
                    title="ABRIR NO GEMINI"
                    description="Execute este agente na plataforma Gemini."
                    icon={<Sparkles className="w-3.5 h-3.5 text-indigo-300" />}
                    variant="indigo"
                    isExternal={true}
                    onClick={handleOpenGemini}
                  />
                )}
              </div>
            </>
          )}

          {/* Organization Section: Fixar & Favoritar */}
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            <AgentOrganizationActions
              agent={agent}
              isPinned={isPinned}
              isFavorite={isFavorite}
              onTogglePin={onTogglePinned}
              onToggleFavorite={onToggleFavorite}
            />
          </div>

          {/* Footer Section */}
          <div className="animate-in fade-in duration-200">
            <AgentControlFooter onClose={onClose} />
          </div>

          {/* Bottom Smartphone Home Indicator Bar (Shown ONLY on Tablet/Desktop) */}
          <div className="hidden md:block w-16 h-0.5 rounded-full bg-slate-700/80 mx-auto pt-0.5 opacity-60 shrink-0" />
        </div>
      </div>
    </div>
  );
};
