import React from 'react';
import { CardOption } from '../../types/challenge';
import { CheckCircle2, XCircle, Sparkles, Zap } from 'lucide-react';

interface MysteryCardProps {
  card: CardOption;
  cardNumber: number;
  isFlipped: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (cardId: number) => void;
}

export const MysteryCard: React.FC<MysteryCardProps> = ({
  card,
  cardNumber,
  isFlipped,
  isSelected,
  isDisabled,
  onSelect,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDisabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onSelect(card.id);
    }
  };

  return (
    <div
      tabIndex={isDisabled ? -1 : 0}
      role="button"
      aria-label={`Carta ${cardNumber}: ${isFlipped ? card.text : 'Carta virada para baixo'}`}
      aria-disabled={isDisabled}
      onKeyDown={handleKeyDown}
      onClick={() => {
        if (!isDisabled) onSelect(card.id);
      }}
      className={`group relative w-full h-[230px] sm:h-[260px] md:h-[280px] perspective-1000 cursor-pointer outline-none rounded-2xl transition-all duration-500 ${
        isDisabled ? 'cursor-default' : 'hover:-translate-y-2 hover:scale-[1.02]'
      } ${
        isFlipped && card.isCorrect
          ? 'scale-[1.03] z-20'
          : isFlipped && !card.isCorrect
          ? 'scale-95 opacity-60 grayscale-[20%]'
          : ''
      }`}
    >
      {/* Sparkle Particles on Correct Card */}
      {isFlipped && card.isCorrect && (
        <>
          <div className="absolute -top-3 -left-3 z-30 animate-ping pointer-events-none text-cyan-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="absolute -bottom-3 -right-3 z-30 animate-pulse pointer-events-none text-emerald-400">
            <Sparkles className="w-6 h-6" />
          </div>
        </>
      )}

      <div
        className={`w-full h-full relative transition-transform duration-700 transform-style-3d ease-out ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* ================= CARD BACK (UNREVEALED) ================= */}
        <div
          className={`absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col items-center justify-between border-2 bg-gradient-to-b from-[#0a1b2d] via-[#081524] to-[#030d17] shadow-xl backdrop-blur-md backface-hidden transition-all duration-300 ${
            !isDisabled
              ? 'border-cyan-500/60 group-hover:border-cyan-400 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.4)]'
              : 'border-slate-800'
          }`}
        >
          {/* Cybernetic Grid Overlay */}
          <div className="absolute inset-0 opacity-20 pointer-events-none rounded-2xl bg-[radial-gradient(#00f2ff_1px,transparent_1px)] [background-size:12px_12px]" />

          {/* Top Corner Circuit Accents */}
          <div className="w-full flex items-center justify-between text-[10px] font-black text-cyan-400/70 tracking-widest uppercase">
            <span>GERAÇÃO Z</span>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          </div>

          {/* Central Logo Emblem "Z" */}
          <div className="relative my-auto flex flex-col items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-teal-500/20 to-blue-600/20 border border-cyan-400/50 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-110 transition-transform duration-300">
              <span className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-tr from-white via-cyan-200 to-cyan-400 drop-shadow-[0_0_10px_rgba(0,242,255,0.8)]">
                Z
              </span>
            </div>
            <span className="text-[10px] text-cyan-400/60 font-mono tracking-widest mt-2 uppercase font-bold">
              CARTA MISTERIOSA
            </span>
          </div>

          {/* Bottom Card Number Pill */}
          <div className="px-4 py-1 rounded-full bg-cyan-950/90 border border-cyan-500/40 text-cyan-300 text-xs font-black tracking-wider shadow-inner">
            OPÇÃO #{cardNumber}
          </div>
        </div>

        {/* ================= CARD FRONT (REVEALED) ================= */}
        <div
          className={`absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col justify-between border-2 bg-gradient-to-b backface-hidden rotate-y-180 transition-all duration-300 overflow-y-auto ${
            card.isCorrect
              ? 'from-[#032026] via-[#042d38] to-[#021820] border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.7)] ring-2 ring-cyan-400/50'
              : isSelected
              ? 'from-[#2d0a12] via-[#1f070c] to-[#120306] border-rose-500/90 shadow-rose-500/30'
              : 'from-[#0a121c] to-[#04080e] border-slate-800'
          }`}
        >
          {/* Top Status Header */}
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
              OPÇÃO #{cardNumber}
            </span>

            {card.isCorrect ? (
              <span className="flex items-center space-x-1 text-cyan-300 text-[10px] font-black bg-cyan-950/90 px-2.5 py-1 rounded-full border border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] animate-pulse">
                <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>GANCHO VIRAL</span>
              </span>
            ) : isSelected ? (
              <span className="flex items-center space-x-1 text-rose-400 text-[10px] font-black bg-rose-950/90 px-2 py-0.5 rounded-full border border-rose-500/50">
                <XCircle className="w-3.5 h-3.5" />
                <span>SUA ESCOLHA</span>
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 font-bold uppercase">OPÇÃO FRACA</span>
            )}
          </div>

          {/* Hook Text Content */}
          <p className="my-auto text-xs sm:text-sm text-slate-100 font-bold leading-snug py-2">
            "{card.text}"
          </p>

          {/* Bottom Badge or Explanation Preview */}
          <div className="pt-2 border-t border-slate-800/80">
            {card.isCorrect ? (
              <p className="text-[10px] text-cyan-300 font-bold leading-tight line-clamp-2">
                ✨ {card.explanation}
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 font-medium line-clamp-2">
                ⚠️ {card.explanation}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

