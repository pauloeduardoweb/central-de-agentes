import React from 'react';
import { Zap, Sparkles, Check, ChevronUp } from 'lucide-react';

interface LevelUpModalProps {
  newLevel: number;
  onClose: () => void;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({ newLevel, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-250">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#031d2b] via-[#082b3d] to-[#02111c] border-2 border-cyan-400/80 rounded-3xl p-6 text-center shadow-2xl shadow-cyan-500/40 text-white overflow-hidden">
        
        {/* Glow Ring */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-teal-400/20 to-transparent pointer-events-none animate-pulse" />

        {/* Icon Emblem */}
        <div className="relative z-10 mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-400 via-teal-400 to-emerald-500 p-0.5 shadow-2xl shadow-cyan-500/50 mb-4 flex items-center justify-center">
          <div className="w-full h-full rounded-[22px] bg-slate-950/90 flex flex-col items-center justify-center text-cyan-400">
            <ChevronUp className="w-8 h-8 -mb-2 animate-bounce stroke-[3]" />
            <span className="text-2xl font-black">{newLevel}</span>
          </div>
        </div>

        <span className="relative z-10 inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-cyan-950 text-cyan-300 border border-cyan-500/50 mb-2">
          ⚡ SUBIU DE NÍVEL!
        </span>

        <h3 className="relative z-10 text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-300 mb-2">
          NÍVEL {newLevel} ALCANÇADO
        </h3>

        <p className="relative z-10 text-xs text-slate-300 font-medium leading-relaxed mb-6 px-4">
          Parabéns! Sua capacidade de reconhecer ganchos virais está cada vez mais apurada. Continue treinando para dominar o algoritmo!
        </p>

        <button
          onClick={onClose}
          className="relative z-10 w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xl shadow-cyan-500/40 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Bora para o Próximo!</span>
        </button>
      </div>
    </div>
  );
};
