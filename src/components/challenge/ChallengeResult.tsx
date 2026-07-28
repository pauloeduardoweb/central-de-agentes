import React, { useState, useMemo } from 'react';
import { RoundResult, MysteryCardChallenge, CardOption } from '../../types/challenge';
import { PlayerService } from '../../services/PlayerService';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Zap,
  Trophy,
  Flame,
  Award,
  Lightbulb,
} from 'lucide-react';
import { motion } from 'motion/react';

interface ChallengeResultProps {
  result: RoundResult;
  challenge: MysteryCardChallenge;
  cards: CardOption[];
  onNextChallenge: () => void;
  onRestartProduct: () => void;
  onBackToAcademy: () => void;
}

const SUCCESS_MESSAGES = [
  'Excelente escolha! Esse é exatamente o tipo de gancho que prende atenção.',
  'Você está pensando como um criador viral de elite!',
  'Mais um passo rumo ao nível máximo da comunidade.',
  'Excelente! Esse é um gancho que desperta curiosidade imediatamente.',
  'Dominou o gatilho mental nos primeiros 3 segundos do vídeo!',
];

const WRONG_MESSAGES = [
  'Quase! Na próxima rodada você acerta.',
  'Agora você já sabe identificar esse padrão de alta retenção.',
  'O objetivo é aprender o padrão viral, não apenas acertar!',
  'Foque na quebra de expectativa imediata nos primeiros segundos.',
];

export const ChallengeResult: React.FC<ChallengeResultProps> = ({
  result,
  challenge,
  cards,
  onNextChallenge,
  onRestartProduct,
  onBackToAcademy,
}) => {
  const [showFullExplanation, setShowFullExplanation] = useState(false);

  const correctCard = cards.find((c) => c.isCorrect);
  const selectedCard = cards.find((c) => c.id === result.selectedCardId);

  // Pick a random motivational message for this round
  const motivationalMessage = useMemo(() => {
    if (result.isCorrect) {
      const idx = Math.floor(Math.random() * SUCCESS_MESSAGES.length);
      return SUCCESS_MESSAGES[idx];
    } else {
      const idx = Math.floor(Math.random() * WRONG_MESSAGES.length);
      return WRONG_MESSAGES[idx];
    }
  }, [result.isCorrect]);

  // Retrieve player stats to render live XP progress bar
  const playerStats = PlayerService.getPlayerStats();
  const levelInfo = PlayerService.calculateLevelInfo(playerStats.totalXp);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`p-6 sm:p-8 rounded-3xl border-2 text-white space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-xl ${
        result.isCorrect
          ? 'bg-gradient-to-br from-[#041d24] via-[#082936] to-[#02131a] border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.3)]'
          : 'bg-gradient-to-br from-[#1a0e1c] via-[#140b17] to-[#09030a] border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
      }`}
    >
      {/* Background Ambient Glow */}
      <div
        className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
          result.isCorrect ? 'bg-cyan-500/20' : 'bg-amber-500/15'
        }`}
      />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80 relative z-10">
        
        <div className="flex items-center space-x-4">
          {result.isCorrect ? (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="p-3.5 rounded-2xl bg-cyan-500/20 border-2 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.5)] shrink-0"
            >
              <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="p-3.5 rounded-2xl bg-amber-500/20 border-2 border-amber-500/60 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)] shrink-0"
            >
              <Lightbulb className="w-10 h-10 stroke-[2.5]" />
            </motion.div>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  result.isCorrect
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.4)]'
                    : 'bg-amber-950 text-amber-300 border border-amber-500/50'
                }`}
              >
                {result.isCorrect ? 'GANCHO VIRAL DETECTADO! 🚀' : 'QUASE LÁ! VAMOS APRENDER 💡'}
              </span>

              {result.streakBonus > 0 && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-950/80 text-amber-400 border border-amber-500/40 flex items-center space-x-1">
                  <Flame className="w-3 h-3 fill-amber-400" />
                  <span>+{result.streakBonus} XP BÔNUS SEQUÊNCIA</span>
                </span>
              )}
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white mt-1.5 leading-tight">
              {result.isCorrect
                ? 'EXCELENTE ESCOLHA!'
                : 'ENTENDA O GANCHO CAMPEÃO DA RODADA'}
            </h3>
          </div>
        </div>

        {/* Animated Floating XP Badge */}
        {result.xpGained > 0 && (
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-yellow-500/20 border-2 border-amber-400 text-amber-300 font-black text-base flex items-center space-x-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] self-stretch sm:self-auto justify-center shrink-0"
          >
            <Zap className="w-6 h-6 text-amber-400 fill-amber-400 animate-bounce" />
            <span>+{result.xpGained} XP</span>
          </motion.div>
        )}
      </div>

      {/* Motivational Message Card */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center space-x-3 text-xs sm:text-sm text-cyan-200 font-bold">
        <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
        <p className="leading-snug">{motivationalMessage}</p>
      </div>

      {/* XP Level Progress Bar Fill Animation */}
      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-black">
          <span className="text-slate-400 uppercase tracking-widest flex items-center space-x-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>PROGRESSO NÍVEL {levelInfo.level}</span>
          </span>
          <span className="text-cyan-400 font-mono">
            {levelInfo.xpProgressInLevel} / {levelInfo.xpNeededForNextLevel} XP ({levelInfo.progressPercent}%)
          </span>
        </div>

        <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${levelInfo.progressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.8)]"
          />
        </div>
      </div>

      {/* Main Feedback Box: Winner Hook & Explanation */}
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-900/95 border-2 border-cyan-500/40 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>ANÁLISE DO GANCHO CAMPEÃO</span>
          </h4>

          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-cyan-950 text-cyan-300 border border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]">
            OPÇÃO #{correctCard?.id}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-100 font-bold text-sm sm:text-base italic">
          "{correctCard?.text}"
        </div>

        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
          <strong className="text-cyan-300 font-bold">Por que funciona: </strong>
          {challenge.correctExplanation}
        </p>

        {/* Techniques Badges */}
        <div className="flex flex-wrap gap-2 pt-1">
          {challenge.techniques.map((tech, idx) => (
            <span
              key={idx}
              className="px-3 py-1 rounded-lg bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>{tech}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Full Detailed Explanation Toggle */}
      <div className="space-y-2">
        <button
          onClick={() => setShowFullExplanation(!showFullExplanation)}
          className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold flex items-center justify-between transition-all cursor-pointer"
        >
          <span>Ver explicação técnica de todas as 4 alternativas</span>
          {showFullExplanation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showFullExplanation && (
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 text-xs text-slate-300">
            {cards.map((c) => (
              <div
                key={c.id}
                className={`p-3.5 rounded-xl border ${
                  c.isCorrect
                    ? 'bg-cyan-950/60 border-cyan-400 text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span>Opção #{c.id}: "{c.text}"</span>
                  <span>{c.isCorrect ? '✅ Gancho Viral' : '⚠️ Opção Fraca'}</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">{c.explanation}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
        <button
          onClick={onBackToAcademy}
          className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-all cursor-pointer"
        >
          Voltar para a Academia
        </button>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onRestartProduct}
            className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-cyan-400" />
            <span>Outro Produto</span>
          </button>

          <button
            onClick={onNextChallenge}
            className="px-7 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center space-x-2 shadow-xl shadow-cyan-500/30 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>Próxima Rodada</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>

    </motion.div>
  );
};

