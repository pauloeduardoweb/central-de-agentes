import React, { useState } from 'react';
import { MysteryCardChallenge } from '../../types/challenge';
import { MissionService, Mission } from '../../services/MissionService';
import { ShoppingBag, Zap, Award, Target, Sparkles, ShieldAlert, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProductChallengePanelProps {
  challenge: MysteryCardChallenge;
  roundNumber: number;
}

export const ProductChallengePanel: React.FC<ProductChallengePanelProps> = ({ challenge, roundNumber }) => {
  const [imageError, setImageError] = useState(false);

  // Generate dynamic mission details using MissionService
  const mission: Mission = MissionService.generateMission(challenge, roundNumber);

  const difficultyColors: Record<string, { bg: string; text: string; border: string }> = {
    facil: { bg: 'bg-emerald-950/80', text: 'text-emerald-400', border: 'border-emerald-500/40' },
    medio: { bg: 'bg-amber-950/80', text: 'text-amber-400', border: 'border-amber-500/40' },
    dificil: { bg: 'bg-rose-950/80', text: 'text-rose-400', border: 'border-rose-500/40' },
  };

  const diffConfig = difficultyColors[challenge.difficulty] || difficultyColors.facil;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${challenge.id}_${roundNumber}`}
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#091b2c] via-[#071626] to-[#030e1a] border-2 border-cyan-500/60 shadow-[0_0_35px_rgba(34,211,238,0.25)] text-white overflow-hidden backdrop-blur-xl"
      >
        {/* Background Cyber Tech Grid */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Top Mission Header Badge */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-cyan-500/30">
          <div className="flex items-center space-x-3">
            <span className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400 text-xs font-black uppercase tracking-widest shadow-[0_0_12px_rgba(34,211,238,0.4)] flex items-center space-x-2">
              <Compass className="w-4 h-4 text-cyan-400 animate-spin-slow" />
              <span>{mission.missionCode}</span>
            </span>

            <span className="hidden sm:inline-block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              GERAÇÃO Z PRO • DESAFIO VIRAL
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${diffConfig.bg} ${diffConfig.text} border ${diffConfig.border}`}>
              {mission.difficultyLabel}
            </span>

            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-950 text-amber-300 border border-amber-500/50 flex items-center space-x-1 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>+{mission.rewardXp} XP</span>
            </span>
          </div>
        </div>

        {/* Mission Content Layout */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Product Image Column */}
          <div className="md:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-48 h-48 sm:w-52 sm:h-52 rounded-3xl bg-gradient-to-b from-cyan-500/20 via-slate-900/90 to-[#020b14] border-2 border-cyan-400/50 p-3 shadow-[0_0_25px_rgba(34,211,238,0.3)] flex flex-col items-center justify-center group overflow-hidden">
              
              {/* Glowing Pedestal Effect */}
              <div className="absolute bottom-3 w-32 h-6 bg-cyan-400/30 rounded-full blur-xl animate-pulse pointer-events-none" />
              
              <div className="relative z-10 w-32 h-32 sm:w-36 sm:h-36 rounded-2xl bg-slate-900/90 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-inner group-hover:scale-105 transition-transform duration-300 overflow-hidden">
                {mission.image && !imageError ? (
                  <img
                    src={mission.image}
                    alt={mission.productName}
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <ShoppingBag className="w-12 h-12 sm:w-14 sm:h-14 stroke-[1.5]" />
                )}
              </div>

              <span className="relative z-10 mt-2 text-[10px] font-black uppercase tracking-widest text-cyan-300 bg-cyan-950/90 px-3 py-0.5 rounded-full border border-cyan-500/40 shadow">
                {mission.category}
              </span>
            </div>
          </div>

          {/* Mission Details & Objective Column */}
          <div className="md:col-span-7 space-y-4 text-center md:text-left">
            
            <div>
              <span className="text-[10px] font-black tracking-widest text-cyan-400 uppercase">
                PRODUTO SELECIONADO
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-300">
                {mission.productName}
              </h3>
            </div>

            {/* Structured Mission Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-left">
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-black">Categoria</p>
                <p className="text-xs font-bold text-cyan-200 truncate">{mission.category}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-black">Nível</p>
                <p className={`text-xs font-bold ${diffConfig.text}`}>{mission.difficultyLabel}</p>
              </div>

              <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-black">Recompensa</p>
                <p className="text-xs font-black text-amber-400">+{mission.rewardXp} XP</p>
              </div>
            </div>

            {/* Objective Card */}
            <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 text-left space-y-1.5 shadow-lg backdrop-blur-sm">
              <div className="flex items-center space-x-2 text-cyan-300 text-xs font-black uppercase tracking-wider">
                <Target className="w-4 h-4 text-cyan-400" />
                <span>OBJETIVO DA MISSÃO:</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-100 font-semibold leading-relaxed">
                {mission.objective}
              </p>
            </div>

          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
};
