import React from 'react';
import { Award, Sparkles, Check, Trophy } from 'lucide-react';
import { Achievement } from '../../types/challenge';

interface AchievementModalProps {
  achievement: Achievement;
  onClose: () => void;
}

export const AchievementModal: React.FC<AchievementModalProps> = ({ achievement, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-250">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#181102] via-[#241703] to-[#0d0701] border-2 border-amber-500/80 rounded-3xl p-6 text-center shadow-2xl shadow-amber-500/30 text-white overflow-hidden">
        
        {/* Shine Animation Backdrop */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-amber-400/20 to-transparent pointer-events-none animate-pulse" />

        {/* Icon Emblem */}
        <div className="relative z-10 mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 p-0.5 shadow-2xl shadow-amber-500/50 mb-4 flex items-center justify-center">
          <div className="w-full h-full rounded-[22px] bg-slate-950/90 flex items-center justify-center text-amber-400">
            <Trophy className="w-10 h-10 animate-bounce" />
          </div>
        </div>

        <span className="relative z-10 inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-950 text-amber-300 border border-amber-500/50 mb-2">
          🏆 NOVA CONQUISTA DESBLOQUEADA!
        </span>

        <h3 className="relative z-10 text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-100 to-amber-400 mb-2">
          {achievement.title}
        </h3>

        <p className="relative z-10 text-xs text-slate-300 font-medium leading-relaxed mb-4 px-2">
          {achievement.description}
        </p>

        {achievement.bonusXp > 0 && (
          <div className="relative z-10 inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs mb-6">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>+{achievement.bonusXp} XP BÔNUS CONCEDIDOS</span>
          </div>
        )}

        <button
          onClick={onClose}
          className="relative z-10 w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xl shadow-amber-500/40 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Continuar Jogando</span>
        </button>
      </div>
    </div>
  );
};
