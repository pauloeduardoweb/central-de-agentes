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

    // Lock body scroll
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    window.addEventListener('keydown', handleKeyDown);

    // Focus modal
    if (modalRef.current) {
      modalRef.current.focus();
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Determine if agent has example video/demo
  const hasExample = Boolean(
    onWatchExample && (agent.exampleVideoUrl || (agent.exampleVideoUrls && agent.exampleVideoUrls.length > 0))
  );

  // ChatGPT or WhatsApp link check
  const isWhatsApp = agent.chatGptUrl?.includes('wa.me');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto bg-slate-950/35 transition-all animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Central Modal Container (Sleek 9:16 Smartphone Portrait Frame Aesthetic) */}
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Central de Controle do Agente - ${agent.name}`}
        onClick={(e) => e.stopPropagation()}
        className="relative w-[calc(100vw-20px)] sm:w-full max-w-[415px] my-auto bg-gradient-to-b from-[#0b192e] via-[#081526] to-[#040c17] border-[2.5px] border-slate-700/80 hover:border-cyan-500/70 rounded-[32px] sm:rounded-[36px] p-4 sm:p-5 shadow-[0_0_50px_rgba(0,0,0,0.85),0_0_25px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/30 text-white outline-none transform animate-in zoom-in-95 fade-in duration-250 max-h-[calc(100vh-32px)] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-900 scrollbar-track-slate-950 flex flex-col justify-between"
      >
        {/* Mobile Smartphone Top Notch / Speaker Line Indicator */}
        <div className="w-16 h-1 rounded-full bg-slate-700/80 border border-slate-600/40 mx-auto mb-2 shrink-0 opacity-80" />

        {/* Ambient Subtle Glow Backdrop behind Modal Header */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-cyan-500/10 blur-2xl pointer-events-none rounded-full" />

        <div className="relative z-10 space-y-3">
          {/* Header Section */}
          <div className="animate-in fade-in slide-in-from-top-1 duration-200">
            <AgentControlHeader agent={agent} onClose={onClose} />
          </div>

          {/* Agent Status Block */}
          <div className="animate-in fade-in slide-in-from-top-2 duration-250 delay-50">
            <AgentStatusBlock agent={agent} />
          </div>

          {/* Primary Action Block - ABRIR NO APP (Chat Local) */}
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 delay-100">
            <AgentPrimaryAction agent={agent} onOpenLocal={onOpenLocal} />
          </div>

          {/* Secondary Action Cards Stack */}
          <div className="space-y-2 animate-in fade-in slide-in-from-top-3 duration-300 delay-150">
            {/* Assistir Exemplo Card (Shown ONLY when available) */}
            {hasExample && onWatchExample && (
              <AgentActionCard
                title="ASSISTIR EXEMPLO"
                description="Veja uma demonstração completa antes de utilizar este agente."
                icon={<Play className="w-4 h-4 text-amber-300 fill-amber-300/30" />}
                variant="amber"
                badge="VÍDEO DEMO"
                onClick={() => {
                  onWatchExample();
                }}
              />
            )}

            {/* Abrir no ChatGPT / WhatsApp Card */}
            {agent.chatGptUrl && onOpenChatGPT && (
              <AgentActionCard
                title={isWhatsApp ? 'ABRIR WHATSAPP' : 'ABRIR NO CHATGPT'}
                description={
                  isWhatsApp
                    ? 'Conecte-se diretamente com o suporte via WhatsApp.'
                    : 'Use a estrutura oficial deste agente diretamente no ChatGPT.'
                }
                icon={
                  isWhatsApp ? (
                    <MessageCircle className="w-4 h-4 text-emerald-300 fill-emerald-300/30" />
                  ) : (
                    <ExternalLink className="w-4 h-4 text-emerald-300" />
                  )
                }
                variant="emerald"
                badge={isWhatsApp ? 'WHATSAPP' : 'OFICIAL'}
                isExternal={true}
                onClick={onOpenChatGPT}
              />
            )}

            {/* Abrir no Gemini Card */}
            {(agent.geminiUrl || onOpenGemini) && (
              <AgentActionCard
                title="ABRIR NO GEMINI"
                description="Execute este agente utilizando a plataforma Gemini."
                icon={<Sparkles className="w-4 h-4 text-indigo-300" />}
                variant="indigo"
                badge="IA GEMINI"
                isExternal={true}
                onClick={(e) => {
                  if (onOpenGemini) {
                    onOpenGemini(e);
                  } else if (agent.geminiUrl) {
                    window.open(agent.geminiUrl, '_blank');
                  }
                }}
              />
            )}
          </div>

          {/* Organization Section: Fixar & Favoritar */}
          <div className="animate-in fade-in slide-in-from-top-3 duration-300 delay-200">
            <AgentOrganizationActions
              agent={agent}
              isPinned={isPinned}
              isFavorite={isFavorite}
              onTogglePin={onTogglePinned}
              onToggleFavorite={onToggleFavorite}
            />
          </div>

          {/* Footer Section */}
          <div className="animate-in fade-in duration-300 delay-250">
            <AgentControlFooter onClose={onClose} />
          </div>

          {/* Bottom Smartphone Home Indicator Bar */}
          <div className="w-24 h-1 rounded-full bg-slate-700/60 mx-auto pt-1 opacity-70 shrink-0" />
        </div>
      </div>
    </div>
  );
};
