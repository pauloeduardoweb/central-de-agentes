import React from 'react';
import { Trophy, Clock, ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react';

interface AcademiaEmBreveCardProps {
  onBackToMainTab?: () => void;
}

export const AcademiaEmBreveCard: React.FC<AcademiaEmBreveCardProps> = ({ onBackToMainTab }) => {
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
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Badge "EM BREVE" */}
        <div className="relative inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-amber-950/90 text-amber-300 border border-amber-500/50 text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-950/50">
          <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>EM BREVE</span>
        </div>

        {/* Main Header Icon & Title */}
        <div className="relative space-y-4 max-w-xl mx-auto">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 via-cyan-500 to-teal-400 p-0.5 shadow-2xl shadow-cyan-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#0a192f] rounded-[22px] flex items-center justify-center text-amber-400">
              <Trophy className="w-10 h-10" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase">
              ACADEMIA DE DESAFIOS
            </h1>
            <p className="text-xl sm:text-2xl font-black text-cyan-400 uppercase tracking-wider">
              Em breve
            </p>
          </div>
        </div>

        {/* Description Section */}
        <div className="relative max-w-lg mx-auto space-y-3 p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-slate-300 text-sm leading-relaxed font-medium backdrop-blur-md">
          <p>
            Estamos preparando uma experiência totalmente nova para nossos alunos.
          </p>
          <p>
            A Academia de Desafios será liberada em uma próxima atualização.
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
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Painel Principal</span>
            </button>
          </div>
        )}

        {/* Rodapé Institucional */}
        <div className="relative pt-6 sm:pt-8 mt-8 border-t border-slate-800/80 space-y-3 text-center text-[11px] sm:text-xs text-slate-400 font-medium">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-slate-300 font-semibold">
            <span>Mentoria Geração Z Pro</span>
            <span className="text-slate-600">•</span>
            <span>Versão 1.0.0</span>
            <span className="text-slate-600">•</span>
            <span className="inline-flex items-center space-x-1.5 text-emerald-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Status: Online</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-slate-400">
            <span className="hover:text-cyan-300 transition-colors cursor-pointer">Política de Privacidade</span>
            <span className="text-slate-600">•</span>
            <span className="hover:text-cyan-300 transition-colors cursor-pointer">Termos de Uso</span>
            <span className="text-slate-600">•</span>
            <span className="hover:text-cyan-300 transition-colors cursor-pointer">Suporte</span>
          </div>

          <p className="text-slate-500 text-[11px] pt-1">
            © 2026 Geração Z Pro. Todos os direitos reservados.
          </p>
        </div>

      </div>

    </div>
  );
};
