import React from 'react';
import { CardOption } from '../../types/challenge';
import { CheckCircle2, XCircle, Sparkles, Check, ShoppingCart } from 'lucide-react';

interface MysteryCardProps {
  card: CardOption;
  cardNumber: number;
  isFlipped: boolean;
  isSelected: boolean;
  isConfirmed: boolean;
  isDisabled: boolean;
  isEliminated?: boolean;
  tikTokHint?: boolean;
  onSelect: (cardId: number) => void;
}

export const MysteryCard: React.FC<MysteryCardProps> = ({
  card,
  cardNumber,
  isFlipped,
  isSelected,
  isConfirmed,
  isDisabled,
  isEliminated = false,
  tikTokHint = false,
  onSelect,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDisabled && !isEliminated && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onSelect(card.id);
    }
  };

  const handleClick = () => {
    if (!isDisabled && !isEliminated) {
      onSelect(card.id);
    }
  };

  // Determine card border & glow styling based on state
  let cardBorderClass = 'border-cyan-500/60 group-hover:border-cyan-300';
  let cardBgGlow = '';

  if (isConfirmed) {
    if (card.isCorrect) {
      cardBorderClass = 'border-emerald-400 shadow-[0_0_35px_rgba(52,211,153,0.6)] ring-2 ring-emerald-400/80';
      cardBgGlow = 'from-[#02221b] via-[#043329] to-[#011712]';
    } else if (isSelected) {
      cardBorderClass = 'border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.5)] ring-2 ring-rose-500/70';
      cardBgGlow = 'from-[#2d0a12] via-[#1f070c] to-[#120306]';
    } else {
      cardBorderClass = 'border-slate-800 opacity-60';
      cardBgGlow = 'from-[#0a121c] to-[#04080e]';
    }
  } else if (isSelected) {
    cardBorderClass = 'border-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.7)] ring-2 ring-cyan-400/80 scale-[1.02]';
    cardBgGlow = 'from-[#07263d] via-[#09324e] to-[#031726]';
  } else {
    cardBgGlow = 'from-[#0d2138] via-[#091728] to-[#040d18]';
  }

  return (
    <div
      tabIndex={isDisabled || isEliminated ? -1 : 0}
      role="button"
      aria-label={`Carta Misteriosa #${cardNumber}: ${isFlipped ? card.text : 'Carta fechada'}`}
      aria-disabled={isDisabled || isEliminated}
      aria-pressed={isSelected}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      className={`group relative w-full h-[280px] sm:h-[300px] md:h-[320px] perspective-1000 cursor-pointer outline-none rounded-2xl transition-all duration-300 ${
        isDisabled || isEliminated ? 'cursor-not-allowed opacity-40 grayscale-[60%]' : 'hover:-translate-y-2 hover:scale-[1.02]'
      }`}
    >
      {/* TikTok Powerup 98% Hint Badge */}
      {tikTokHint && !isConfirmed && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-[0_0_15px_rgba(52,211,153,0.8)] flex items-center space-x-1 animate-bounce">
          <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
          <span>98% CHANCE (TIKTOK IA)</span>
        </div>
      )}

      {/* Eliminated Badge overlay */}
      {isEliminated && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 rounded-2xl border-2 border-rose-500/40 pointer-events-none">
          <span className="px-3 py-1 rounded-lg bg-rose-950 text-rose-300 font-black text-xs uppercase tracking-widest border border-rose-500/50 rotate-[-12deg]">
            ❌ ELIMINADO
          </span>
        </div>
      )}

      {/* Ambient Selection Particle & Aura */}
      {isSelected && !isConfirmed && (
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-amber-500 opacity-70 blur-md pointer-events-none animate-pulse-glow z-0" />
      )}

      {/* Correct Answer Celebration Particle */}
      {isConfirmed && card.isCorrect && (
        <>
          <div className="absolute -top-3 -left-3 z-30 animate-bounce pointer-events-none text-emerald-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="absolute -bottom-3 -right-3 z-30 animate-pulse pointer-events-none text-cyan-400">
            <Sparkles className="w-6 h-6" />
          </div>
        </>
      )}

      {/* 3D Rotator Container */}
      <div
        className={`w-full h-full relative transition-transform duration-700 transform-style-3d ease-out z-10 ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* ================= 1. CARD BACK (UNREVEALED / FECHADA) - TIKTOK SHOP REDESIGN ================= */}
        <div
          className={`absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col items-center justify-between border-2 bg-gradient-to-b ${cardBgGlow} shadow-2xl backdrop-blur-xl backface-hidden transition-all duration-300 overflow-hidden ${cardBorderClass}`}
        >
          {/* Top Metallic Glass Sheen Reflection */}
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white/10 via-cyan-400/5 to-transparent pointer-events-none rounded-t-2xl" />

          {/* Ambient Orange & Cyan Inner Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-orange-500/20 transition-all duration-500" />
          <div className="absolute bottom-2 right-2 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />

          {/* Top Header: Brand Accent + Rarity Badge */}
          <div className="w-full flex items-center justify-between text-[10px] font-black tracking-widest uppercase relative z-10">
            <span className="text-cyan-300 font-mono flex items-center space-x-1.5 bg-slate-950/80 px-2 py-0.5 rounded-full border border-cyan-500/40 shadow-sm">
              <svg className="w-3.5 h-3.5 fill-current text-cyan-400" viewBox="0 0 24 24">
                <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 2.593 6.29 6.29 0 0 0 .19 7.42 6.335 6.335 0 0 0 8.016 1.764c2.518-1.282 3.824-3.84 3.824-6.684V8.6a8.214 8.214 0 0 0 4.597 1.588V6.743a4.832 4.832 0 0 1-2.002-.057z"/>
              </svg>
              <span>TIKTOK</span>
            </span>

            <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-orange-400/50 text-orange-300 text-[9px] font-black tracking-wider shadow-[0_0_10px_rgba(249,115,22,0.3)]">
              GANCHO VIRAL
            </span>
          </div>

          {/* Central TikTok Shop Shopping Cart Emblem */}
          <div className="relative my-auto flex flex-col items-center justify-center z-10 text-center space-y-2">
            {/* Orange Shopping Cart Ring */}
            <div className="relative group-hover:scale-110 transition-transform duration-300 animate-float-slow">
              <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-500/30 via-orange-500/25 to-red-500/20 border-2 border-orange-400/70 flex items-center justify-center shadow-[0_0_25px_rgba(249,115,22,0.4)] backdrop-blur-md">
                <ShoppingCart className="w-9 h-9 text-orange-400 drop-shadow-[0_0_10px_rgba(249,115,22,0.8)] stroke-[2.2]" />
              </div>
              <div className="absolute -inset-1 rounded-2xl bg-orange-500/20 blur-md pointer-events-none -z-10 group-hover:opacity-100 opacity-60 transition-opacity" />
            </div>

            {/* Title: CARTA MISTERIOSA #X */}
            <div className="space-y-0.5 pt-1">
              <h3 className="text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-300 tracking-wider">
                CARTA MISTERIOSA #{cardNumber}
              </h3>
              <p className="text-[11px] text-slate-300/80 font-semibold tracking-wide">
                Toque para revelar
              </p>
            </div>
          </div>

          {/* Bottom Card Pill / Select CTA */}
          <div className="w-full relative z-10">
            <div
              className={`w-full py-2 px-3 rounded-xl text-center text-xs font-black tracking-wider transition-all shadow-inner ${
                isSelected
                  ? 'bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 border border-cyan-200 font-extrabold shadow-[0_0_15px_rgba(34,211,238,0.6)] scale-[1.02]'
                  : 'bg-slate-900/90 border border-cyan-400/40 text-cyan-300 group-hover:border-cyan-300 group-hover:bg-cyan-950/90'
              }`}
            >
              {isSelected ? '✓ RESPOSTA SELECIONADA' : 'SELECIONAR CARTA'}
            </div>
          </div>
        </div>

        {/* ================= 2. CARD FRONT (REVEALED / FRENTE) ================= */}
        {/* CRITICAL FOR 3D FLIP: MUST have rotate-y-180 class so when container flips 180deg, this side ends up facing forward 0deg with readable text */}
        <div
          className={`absolute inset-0 w-full h-full rounded-2xl p-4 flex flex-col justify-between border-2 bg-gradient-to-b ${cardBgGlow} backface-hidden rotate-y-180 transition-all duration-300 overflow-hidden shadow-2xl ${cardBorderClass}`}
        >
          {/* Top Status Header */}
          <div className="flex items-center justify-between text-xs font-bold shrink-0 pb-2 border-b border-slate-800/80">
            <span className="text-[10px] font-black tracking-widest text-cyan-300 uppercase">
              CARTA MISTERIOSA #{cardNumber}
            </span>

            {isConfirmed ? (
              card.isCorrect ? (
                <span className="flex items-center space-x-1 text-emerald-300 text-[10px] font-black bg-emerald-950/90 px-2.5 py-0.5 rounded-full border border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>CORRETA</span>
                </span>
              ) : isSelected ? (
                <span className="flex items-center space-x-1 text-rose-300 text-[10px] font-black bg-rose-950/90 px-2.5 py-0.5 rounded-full border border-rose-500/60">
                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>INCORRETA</span>
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 font-bold uppercase">OPÇÃO FRACA</span>
              )
            ) : isSelected ? (
              <span className="flex items-center space-x-1 text-cyan-300 text-[10px] font-black bg-cyan-950/90 px-2.5 py-0.5 rounded-full border border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]">
                <Check className="w-3 h-3 text-cyan-300" />
                <span>SELECIONADA</span>
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-bold uppercase">REVELADA</span>
            )}
          </div>

          {/* Hook Option Text Content */}
          <div className="my-auto py-2 overflow-y-auto max-h-[150px] pr-1 custom-scrollbar">
            <p className="text-xs sm:text-sm text-slate-100 font-bold leading-relaxed">
              "{card.text}"
            </p>
          </div>

          {/* Bottom Footer Area */}
          <div className="pt-2 border-t border-slate-800/80 shrink-0">
            {isConfirmed ? (
              card.isCorrect ? (
                <p className="text-[10px] text-emerald-300 font-semibold leading-tight line-clamp-2">
                  ✨ {card.explanation}
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 font-medium leading-tight line-clamp-2">
                  ⚠️ {card.explanation}
                </p>
              )
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(card.id);
                }}
                disabled={isDisabled}
                className={`w-full py-2 px-3 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all flex items-center justify-center space-x-1 ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.6)]'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30'
                }`}
              >
                <span>{isSelected ? '✓ SELECIONADA' : 'SELECIONAR ESTA'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
