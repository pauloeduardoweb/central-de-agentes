import React from 'react';
import {
  Sparkles,
  Zap,
  Bot,
  SkipForward,
  RotateCcw,
  Flame,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { playPowerupSound } from '../../utils/soundEffects';

export interface PowerupCounts {
  consultTikTok: number; // Max 1
  eliminatedHooks: number; // Max 2
  mentorBigode: number; // Max 2
  skipMission: number; // Max 1
  secondChance: number; // Max 1
  doubleXp: number; // Max 1
}

interface AffiliatePowerupsBarProps {
  powerups: PowerupCounts;
  isDoubleXpActive: boolean;
  isSecondChanceActive: boolean;
  isRevealed: boolean;
  onUseConsultTikTok: () => void;
  onUseEliminateTwo: () => void;
  onUseMentorBigode: () => void;
  onUseSkipMission: () => void;
  onUseSecondChance: () => void;
  onUseDoubleXp: () => void;
}

export const AffiliatePowerupsBar: React.FC<AffiliatePowerupsBarProps> = ({
  powerups,
  isDoubleXpActive,
  isSecondChanceActive,
  isRevealed,
  onUseConsultTikTok,
  onUseEliminateTwo,
  onUseMentorBigode,
  onUseSkipMission,
  onUseSecondChance,
  onUseDoubleXp,
}) => {
  return (
    <div className="p-4 rounded-3xl bg-gradient-to-r from-[#08182b] via-[#05111f] to-[#020b14] border-2 border-cyan-500/50 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-3">
      {/* Background Cyber Glow */}
      <div className="absolute top-0 right-0 w-48 h-12 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />

      {/* Bar Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/60 flex items-center justify-center text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)]">
            <Zap className="w-4 h-4 fill-cyan-400 text-cyan-400 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-300">
              PODERES DO AFILIADO
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">
              Vantagens táticas exclusivas para acelerar suas missões
            </p>
          </div>
        </div>

        {/* Active Multipliers Badges */}
        <div className="flex items-center space-x-2">
          {isDoubleXpActive && (
            <span className="px-2.5 py-1 rounded-full bg-amber-950/90 text-amber-300 border border-amber-400/80 text-[10px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(245,158,11,0.4)] animate-bounce flex items-center space-x-1">
              <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>2X XP ATIVO!</span>
            </span>
          )}

          {isSecondChanceActive && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-400/80 text-[10px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(52,211,153,0.4)] flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>SEGUNDA CHANCE PRONTA</span>
            </span>
          )}
        </div>
      </div>

      {/* Grid of 6 Affiliate Powerups */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {/* Powerup 1: Consultar TikTok */}
        <button
          onClick={() => {
            playPowerupSound();
            onUseConsultTikTok();
          }}
          disabled={powerups.consultTikTok <= 0 || isRevealed}
          className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-1 relative group cursor-pointer ${
            powerups.consultTikTok > 0 && !isRevealed
              ? 'bg-slate-900/90 hover:bg-slate-800/90 border-cyan-500/50 hover:border-cyan-300 shadow-md shadow-cyan-950/50'
              : 'bg-slate-950/60 border-slate-800/80 opacity-40 cursor-not-allowed'
          }`}
          title="O TikTok IA analisa e indica a carta com 98% de chance de vitória"
        >
          <div className="flex items-center justify-between">
            <span className="text-base font-black">🎵</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40">
              {powerups.consultTikTok}x
            </span>
          </div>
          <div>
            <p className="text-[11px] font-black text-white group-hover:text-cyan-300 truncate">
              Consultar TikTok
            </p>
            <p className="text-[9px] text-slate-400 font-semibold line-clamp-1">
              IA revela 98% chance
            </p>
          </div>
        </button>

        {/* Powerup 2: Eliminar 2 Ganchos */}
        <button
          onClick={() => {
            playPowerupSound();
            onUseEliminateTwo();
          }}
          disabled={powerups.eliminatedHooks <= 0 || isRevealed}
          className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-1 relative group cursor-pointer ${
            powerups.eliminatedHooks > 0 && !isRevealed
              ? 'bg-slate-900/90 hover:bg-slate-800/90 border-rose-500/50 hover:border-rose-400 shadow-md shadow-rose-950/50'
              : 'bg-slate-950/60 border-slate-800/80 opacity-40 cursor-not-allowed'
          }`}
          title="Elimina automaticamente 2 cartas incorretas"
        >
          <div className="flex items-center justify-between">
            <span className="text-base font-black">✂️</span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-500/40">
              {powerups.eliminatedHooks}x
            </span>
          </div>
          <div>
            <p className="text-[11px] font-black text-white group-hover:text-rose-300 truncate">
              Eliminar 2 Erros
            </p>
            <p className="text-[9px] text-slate-400 font-semibold line-clamp-1">
              Remove 2 cartas fracos
            </p>
          </div>
        </button>

        {/* Powerup 3: Mentor Bigode IA */}
        <button
          onClick={() => {
            playPowerupSound();
            onUseMentorBigode();
          }}
          disabled={powerups.mentorBigode <= 0 || isRevealed}
          className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-1 relative group cursor-pointer ${
            powerups.mentorBigode > 0 && !isRevealed
              ? 'bg-slate-900/90 hover:bg-slate-800/90 border-amber-500/50 hover:border-amber-300 shadow-md shadow-amber-950/50'
              : 'bg-slate-950/60 border-slate-800/80 opacity-40 cursor-not-allowed'
          }`}
          title="Receba uma dica estratégica do Mentor Bigode"
        >
          <div className="flex items-center justify-between">
            <Bot className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40">
              {powerups.mentorBigode}x
            </span>
          </div>
          <div>
            <p className="text-[11px] font-black text-white group-hover:text-amber-300 truncate">
              Mentor Bigode IA
            </p>
            <p className="text-[9px] text-slate-400 font-semibold line-clamp-1">
              Dica de engajamento
            </p>
          </div>
        </button>

        {/* Powerup 4: Pular Missão */}
        <button
          onClick={() => {
            playPowerupSound();
            onUseSkipMission();
          }}
          disabled={powerups.skipMission <= 0 || isRevealed}
          className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-1 relative group cursor-pointer ${
            powerups.skipMission > 0 && !isRevealed
              ? 'bg-slate-900/90 hover:bg-slate-800/90 border-purple-500/50 hover:border-purple-300 shadow-md shadow-purple-950/50'
              : 'bg-slate-950/60 border-slate-800/80 opacity-40 cursor-not-allowed'
          }`}
          title="Troca o produto atual por outro sem perder sua sequência de acertos"
        >
          <div className="flex items-center justify-between">
            <SkipForward className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40">
              {powerups.skipMission}x
            </span>
          </div>
          <div>
            <p className="text-[11px] font-black text-white group-hover:text-purple-300 truncate">
              Pular Missão
            </p>
            <p className="text-[9px] text-slate-400 font-semibold line-clamp-1">
              Troca de produto
            </p>
          </div>
        </button>

        {/* Powerup 5: Segunda Chance */}
        <button
          onClick={() => {
            playPowerupSound();
            onUseSecondChance();
          }}
          disabled={powerups.secondChance <= 0 || isSecondChanceActive || isRevealed}
          className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-1 relative group cursor-pointer ${
            powerups.secondChance > 0 && !isSecondChanceActive && !isRevealed
              ? 'bg-slate-900/90 hover:bg-slate-800/90 border-emerald-500/50 hover:border-emerald-300 shadow-md shadow-emerald-950/50'
              : 'bg-slate-950/60 border-slate-800/80 opacity-40 cursor-not-allowed'
          }`}
          title="Se errar, você pode tentar de novo para receber 50% do XP"
        >
          <div className="flex items-center justify-between">
            <RotateCcw className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40">
              {powerups.secondChance}x
            </span>
          </div>
          <div>
            <p className="text-[11px] font-black text-white group-hover:text-emerald-300 truncate">
              Segunda Chance
            </p>
            <p className="text-[9px] text-slate-400 font-semibold line-clamp-1">
              Tentar novamente
            </p>
          </div>
        </button>

        {/* Powerup 6: Dobrar XP */}
        <button
          onClick={() => {
            playPowerupSound();
            onUseDoubleXp();
          }}
          disabled={powerups.doubleXp <= 0 || isDoubleXpActive || isRevealed}
          className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-1 relative group cursor-pointer ${
            powerups.doubleXp > 0 && !isDoubleXpActive && !isRevealed
              ? 'bg-slate-900/90 hover:bg-slate-800/90 border-amber-400/60 hover:border-amber-300 shadow-md shadow-amber-950/50 animate-pulse'
              : 'bg-slate-950/60 border-slate-800/80 opacity-40 cursor-not-allowed'
          }`}
          title="Dobrar XP se acertar a missão nesta rodada"
        >
          <div className="flex items-center justify-between">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40">
              {powerups.doubleXp}x
            </span>
          </div>
          <div>
            <p className="text-[11px] font-black text-amber-300 group-hover:text-amber-200 truncate">
              Dobrar XP 2X
            </p>
            <p className="text-[9px] text-slate-400 font-semibold line-clamp-1">
              Recompensa dupla
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};
