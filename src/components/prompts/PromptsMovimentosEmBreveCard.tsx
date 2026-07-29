import React from 'react';
import { Layers, Clock, ArrowLeft } from 'lucide-react';

interface PromptsMovimentosEmBreveCardProps {
  onBackToMainTab?: () => void;
}

export const PromptsMovimentosEmBreveCard: React.FC<PromptsMovimentosEmBreveCardProps> = ({ onBackToMainTab }) => {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 py-6 animate-in fade-in duration-300">
      
      {/* Main Container Card */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#0a192f] via-[#091322] to-[#040d1a] border border-cyan-500/50 p-8 sm:p-12 shadow-2xl shadow-cyan-950/80 text-white overflow-hidden text-center space-y-8">
        
        {/* Decorative Grid & Glow Background */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#06b6d4 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Badge "EM BREVE" */}
        <div className="relative inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-950/90 text-amber-300 border border-amber-500/50 text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-950/50">
          <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>EM BREVE</span>
        </div>

        {/* Main Header Icon & Title */}
        <div className="relative space-y-4 max-w-xl mx-auto">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-purple-500 via-indigo-500 to-cyan-400 p-0.5 shadow-2xl shadow-purple-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#0a192f] rounded-[22px] flex items-center justify-center text-purple-400">
              <Layers className="w-10 h-10" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase">
              PROMPTS DE MOVIMENTOS
            </h1>
            <p className="text-xl sm:text-2xl font-black text-purple-400 uppercase tracking-wider">
              Em breve
            </p>
          </div>
        </div>

        {/* Description Section */}
        <div className="relative max-w-lg mx-auto space-y-3 p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-slate-300 text-sm leading-relaxed font-medium backdrop-blur-md">
          <p>
            Estamos preparando uma biblioteca exclusiva com prompts, roteiros e estruturas de movimentos virais.
          </p>
          <p>
            A seção <strong className="text-purple-300">Prompts de Movimentos</strong> será liberada em uma próxima atualização.
          </p>
          <p className="font-semibold text-cyan-300">
            Obrigado pela paciência.
          </p>
        </div>

        {/* Action Button */}
        {onBackToMainTab && (
          <div className="relative pt-2">
            <button
              onClick={onBackToMainTab}
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar aos Agentes</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
