import React from 'react';
import { Trophy, Target, Zap, Sparkles, Check, HelpCircle, X } from 'lucide-react';

interface HowItWorksModalProps {
  onClose: () => void;
  isFirstAccess?: boolean;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({ onClose, isFirstAccess = false }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0a1829] via-[#091322] to-[#040c17] border border-cyan-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/80 text-white overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Trophy className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-md border border-cyan-500/30">
              {isFirstAccess ? 'BEM-VINDO À ACADEMIA DE DESAFIOS' : 'COMO FUNCIONA O JOGO'}
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-300 mt-1">
              Carta Misteriosa • Regras & Pontuação
            </h3>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 font-medium">
          Aprenda a reconhecer ganchos virais que geram retenção, curiosidade e vendas no TikTok Shop através de desafios práticos gamificados!
        </p>

        {/* Rules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/30 space-y-2">
            <div className="flex items-center space-x-2 text-cyan-400 font-bold text-xs">
              <Target className="w-4 h-4" />
              <span>1. Escolha uma Carta</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Viradas de cabeça para baixo, cada rodada apresenta 4 opções de ganchos para o produto em destaque.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30 space-y-2">
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
              <Zap className="w-4 h-4" />
              <span>2. Acumule XP & Bônus</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Acertos fáceis valem +25 XP, médios +50 XP e difíceis +100 XP. Mantenha sequências de acertos para ganhar até +150 XP bônus!
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/30 space-y-2">
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
              <Sparkles className="w-4 h-4" />
              <span>3. Suba de Nível</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Evolua do Nível 1 até a maestria do TikTok Shop à medida que acumula pontos e desbloqueia conquistas.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-purple-500/30 space-y-2">
            <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs">
              <HelpCircle className="w-4 h-4" />
              <span>4. Explicação Completa</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Cada acerto ou erro traz um feedback educativo detalhado com as técnicas envolvidas para você aplicar no seu conteúdo.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xl shadow-cyan-500/25 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{isFirstAccess ? 'Começar Agora!' : 'Entendi!'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
