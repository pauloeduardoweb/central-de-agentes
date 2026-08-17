import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Rocket,
  Compass,
  Trophy,
  Layers,
  Search,
  SlidersHorizontal,
  Video,
  ShoppingBag,
  Flame,
  Heart,
  CheckCircle2,
} from 'lucide-react';

export const TOUR_STORAGE_KEY = 'productMinerTourCompleted_v1';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  fallbackSelector?: string;
  actionBeforeStep?: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  preferredPlacement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export const PRODUCT_MINER_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao Minerador',
    description: 'Encontre produtos, tendências e vídeos que já estão chamando atenção no TikTok Shop.',
    preferredPlacement: 'center',
    icon: Sparkles,
  },
  {
    id: 'classifications',
    title: 'Classificações',
    description: 'Escolha rapidamente o tipo de oportunidade que deseja encontrar: Mais Vendidos, Tendências, Vídeo Viral, Escolha do Dia e Maior Comissão.',
    targetSelector: '#tour-classifications',
    preferredPlacement: 'bottom',
    icon: Trophy,
  },
  {
    id: 'categories',
    title: 'Categorias',
    description: 'Escolha um segmento e refine a busca pelas subcategorias disponíveis.',
    targetSelector: '#tour-categories',
    preferredPlacement: 'bottom',
    icon: Layers,
  },
  {
    id: 'search',
    title: 'Pesquisa rápida',
    description: 'Procure produtos diretamente pelo nome ou por uma palavra-chave.',
    targetSelector: '#tour-search-bar',
    fallbackSelector: '#tour-search-btn',
    preferredPlacement: 'bottom',
    icon: Search,
  },
  {
    id: 'advanced_filters',
    title: 'Filtros Avançados',
    description: 'Refine os resultados para encontrar oportunidades mais específicas.',
    targetSelector: '#tour-advanced-filters-btn',
    preferredPlacement: 'bottom',
    icon: SlidersHorizontal,
  },
  {
    id: 'video_ranges',
    title: 'Filtre pelos vídeos',
    description: 'Encontre vídeos por alcance: 100K+, 500K+, 1M+, 5M+ ou 10M+ visualizações.',
    targetSelector: '#tour-video-ranges',
    fallbackSelector: '#tour-advanced-filters-btn',
    preferredPlacement: 'bottom',
    icon: Video,
  },
  {
    id: 'product_data',
    title: 'Dados do Produto',
    description: 'Veja preço, vendas, avaliação, loja e principais informações antes de analisar uma oportunidade.',
    targetSelector: '#tour-first-product',
    preferredPlacement: 'right',
    icon: ShoppingBag,
  },
  {
    id: 'associated_video',
    title: 'Vídeo Associado',
    description: 'Quando houver vídeo, assista diretamente no Minerador e veja como o produto está sendo divulgado.',
    targetSelector: '#tour-video-action',
    fallbackSelector: '#tour-first-product',
    preferredPlacement: 'right',
    icon: Video,
  },
  {
    id: 'viral_video',
    title: 'Vídeo Viral',
    description: 'Encontre vídeos com alto alcance para estudar formatos que já estão chamando atenção.',
    targetSelector: '#tour-classification-viral_video',
    fallbackSelector: '#tour-classifications',
    preferredPlacement: 'bottom',
    icon: Flame,
  },
  {
    id: 'daily_choice',
    title: 'Escolha do Dia',
    description: 'Use a inteligência diária para descobrir automaticamente uma nova oportunidade.',
    targetSelector: '#tour-classification-editors_choice',
    fallbackSelector: '#tour-classifications',
    preferredPlacement: 'bottom',
    icon: Sparkles,
  },
  {
    id: 'favorites',
    title: 'Salve oportunidades',
    description: 'Favorite os produtos que deseja revisar novamente depois.',
    targetSelector: '#tour-favorites-btn',
    preferredPlacement: 'bottom',
    icon: Heart,
  },
  {
    id: 'ready',
    title: 'Tudo pronto!',
    description: 'Agora você já conhece as principais ferramentas do Minerador Geração Z Pro.',
    preferredPlacement: 'center',
    icon: Rocket,
  },
];

interface ProductMinerTourProps {
  isOpen: boolean;
  onClose: () => void;
  onStepChange?: (stepIndex: number, step: TourStep) => void;
  initialStepIndex?: number;
}

export const ProductMinerTour: React.FC<ProductMinerTourProps> = ({
  isOpen,
  onClose,
  onStepChange,
  initialStepIndex = 0,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStepIndex);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const steps = PRODUCT_MINER_TOUR_STEPS;
  const currentStep = steps[currentStepIndex] || steps[0];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  // Conclusão definitiva (GRAVA no localStorage)
  const handleFinish = useCallback(() => {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    } catch {
      // ignore localStorage errors
    }
    onClose();
  }, [onClose]);

  // Fechamento temporário (NÃO grava no localStorage)
  const handleCloseTemporarily = useCallback(() => {
    onClose();
  }, [onClose]);

  // Step change trigger
  const goToStep = useCallback(
    (newIndex: number) => {
      if (newIndex < 0) return;
      if (newIndex >= steps.length) {
        handleFinish();
        return;
      }
      setCurrentStepIndex(newIndex);
      if (onStepChange && steps[newIndex]) {
        onStepChange(newIndex, steps[newIndex]);
      }
    },
    [steps, onStepChange, handleFinish]
  );

  const handleNext = useCallback(() => {
    goToStep(currentStepIndex + 1);
  }, [currentStepIndex, goToStep]);

  const handlePrev = useCallback(() => {
    goToStep(currentStepIndex - 1);
  }, [currentStepIndex, goToStep]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCloseTemporarily();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, handleCloseTemporarily]);

  // Position calculation and element tracking
  const updateTargetPosition = useCallback(() => {
    if (!isOpen) return;

    if (!currentStep.targetSelector && !currentStep.fallbackSelector) {
      setTargetRect(null);
      return;
    }

    let el: HTMLElement | null = null;
    if (currentStep.targetSelector) {
      el = document.querySelector<HTMLElement>(currentStep.targetSelector);
    }
    if (!el && currentStep.fallbackSelector) {
      el = document.querySelector<HTMLElement>(currentStep.fallbackSelector);
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      // Ensure element has dimensions
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(rect);
        return;
      }
    }

    setTargetRect(null);
  }, [isOpen, currentStep]);

  // Handle auto-scroll and step transition
  useEffect(() => {
    if (!isOpen) return;

    // Call optional action
    if (currentStep.actionBeforeStep) {
      currentStep.actionBeforeStep();
    }

    let targetElement: HTMLElement | null = null;
    if (currentStep.targetSelector) {
      targetElement = document.querySelector<HTMLElement>(currentStep.targetSelector);
    }
    if (!targetElement && currentStep.fallbackSelector) {
      targetElement = document.querySelector<HTMLElement>(currentStep.fallbackSelector);
    }

    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const inView =
        rect.top >= 60 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight - 60) &&
        rect.right <= window.innerWidth;

      if (!inView) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }
    }

    // Measure after scroll has completed
    const timer = setTimeout(() => {
      updateTargetPosition();
    }, 280);

    return () => clearTimeout(timer);
  }, [isOpen, currentStepIndex, currentStep, updateTargetPosition]);

  // Continuous listener on resize / scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(() => {
        updateTargetPosition();
      });
    };

    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });

    updateTargetPosition();

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isOpen, updateTargetPosition]);

  // Calculate tooltip style dynamically
  useEffect(() => {
    if (!isOpen) return;

    const isMobile = window.innerWidth < 640;
    const tooltipWidth = isMobile ? Math.min(window.innerWidth - 24, 380) : 380;
    const tooltipHeight = tooltipRef.current?.offsetHeight || 220;
    const padding = 14;

    // If centered (step 1 or 12 or no target element)
    if (!targetRect || currentStep.preferredPlacement === 'center') {
      setTooltipStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${tooltipWidth}px`,
        zIndex: 999999,
      });
      return;
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = 0;
    let left = 0;

    if (isMobile) {
      // Mobile positioning: prefer docking near bottom or top away from highlighted element
      const targetCenterY = targetRect.top + targetRect.height / 2;
      const targetIsTopHalf = targetCenterY < vh / 2;

      if (targetIsTopHalf) {
        // Position near bottom of screen
        top = Math.max(targetRect.bottom + padding, vh - tooltipHeight - 20);
      } else {
        // Position near top of screen
        top = Math.min(targetRect.top - tooltipHeight - padding, 20);
        if (top < 12) {
          top = 12;
        }
      }
      left = (vw - tooltipWidth) / 2;
    } else {
      // Desktop positioning
      const spaceBelow = vh - targetRect.bottom;
      const spaceAbove = targetRect.top;
      const spaceRight = vw - targetRect.right;
      const spaceLeft = targetRect.left;

      let placement = currentStep.preferredPlacement || 'bottom';

      // Fallback placement if not enough space
      if (placement === 'bottom' && spaceBelow < tooltipHeight + padding && spaceAbove > tooltipHeight + padding) {
        placement = 'top';
      } else if (placement === 'top' && spaceAbove < tooltipHeight + padding && spaceBelow > tooltipHeight + padding) {
        placement = 'bottom';
      } else if (placement === 'right' && spaceRight < tooltipWidth + padding && spaceBelow > tooltipHeight + padding) {
        placement = 'bottom';
      }

      if (placement === 'bottom') {
        top = targetRect.bottom + padding;
        left = targetRect.left + (targetRect.width - tooltipWidth) / 2;
      } else if (placement === 'top') {
        top = targetRect.top - tooltipHeight - padding;
        left = targetRect.left + (targetRect.width - tooltipWidth) / 2;
      } else if (placement === 'right') {
        top = targetRect.top + (targetRect.height - tooltipHeight) / 2;
        left = targetRect.right + padding;
      } else if (placement === 'left') {
        top = targetRect.top + (targetRect.height - tooltipHeight) / 2;
        left = targetRect.left - tooltipWidth - padding;
      }

      // Clamp within viewport
      if (left < padding) left = padding;
      if (left + tooltipWidth > vw - padding) left = vw - tooltipWidth - padding;
      if (top < padding) top = padding;
      if (top + tooltipHeight > vh - padding) top = vh - tooltipHeight - padding;
    }

    setTooltipStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      zIndex: 999999,
    });
  }, [isOpen, targetRect, currentStep]);

  if (!isOpen) return null;

  const StepIcon = currentStep.icon || Sparkles;

  return (
    <div
      id="product-miner-tour-root"
      className="fixed inset-0 z-[999990] overflow-hidden select-none pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Tour do Minerador"
    >
      {/* 1. Backdrop Overlay */}
      {targetRect ? (
        // Spotlight Box Cutout
        <div
          className="fixed pointer-events-none transition-all duration-300 ease-out"
          style={{
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
            borderRadius: '16px',
            boxShadow: '0 0 0 9999px rgba(3, 19, 28, 0.72)',
            zIndex: 999992,
          }}
        >
          {/* Animated Gold/Amber Spotlight Ring */}
          <div className="absolute inset-0 rounded-2xl ring-2 ring-amber-400 ring-offset-2 ring-offset-transparent shadow-[0_0_20px_rgba(245,158,11,0.45)] pointer-events-none animate-pulse" />
        </div>
      ) : (
        // Full Dark Backdrop for Centered Steps
        <div className="fixed inset-0 bg-[#03131c]/75 backdrop-blur-xs transition-opacity duration-300" />
      )}

      {/* Transparent Click-Catcher */}
      <div
        className="fixed inset-0 z-[999995] cursor-default"
        onClick={(e) => {
          // Prevent accidental backdrop closing on clicks outside card, allow user to focus on tour
          e.stopPropagation();
        }}
      />

      {/* 2. Tooltip Card */}
      <div
        ref={tooltipRef}
        style={tooltipStyle}
        className="animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
      >
        <div className="rounded-2xl border border-amber-500/40 bg-slate-950/95 text-slate-100 p-4 sm:p-5 shadow-2xl shadow-black/90 backdrop-blur-md relative overflow-hidden flex flex-col justify-between min-h-[190px]">
          {/* Top Subtle Amber Ambient Glow */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />

          <div>
            {/* Header: Step counter + Step Icon + Close button */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <StepIcon className="w-4 h-4 text-amber-400" />
                </span>
                <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider">
                  Etapa {currentStepIndex + 1} de {steps.length}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCloseTemporarily}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
                title="Fechar tour temporariamente (Esc)"
                aria-label="Fechar tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Short Description */}
            <div className="pt-3 space-y-1.5">
              <h3 className="text-base sm:text-lg font-black text-white leading-snug tracking-tight">
                {currentStep.title}
              </h3>
              <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed">
                {currentStep.description}
              </p>
            </div>
          </div>

          {/* Footer: Progress dots + Navigation buttons */}
          <div className="pt-4 mt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
            {/* Progress Dots */}
            <div className="flex items-center gap-1">
              {steps.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goToStep(idx)}
                  className={`transition-all rounded-full ${
                    idx === currentStepIndex
                      ? 'w-4 h-1.5 bg-amber-400 shadow-xs shadow-amber-400/50'
                      : 'w-1.5 h-1.5 bg-slate-700 hover:bg-slate-500'
                  }`}
                  title={`Ir para etapa ${idx + 1}: ${s.title}`}
                  aria-label={`Etapa ${idx + 1}`}
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 hover:border-slate-600 text-slate-200 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Anterior</span>
                </button>
              )}

              {isLastStep ? (
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/25 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <Rocket className="w-4 h-4 text-slate-950" />
                  <span>Começar a Minerar</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <span>Próximo</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
