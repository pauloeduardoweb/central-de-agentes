import React from 'react';
import { X, ExternalLink, DollarSign, ShieldCheck, ShoppingCart, Percent, Calculator, UserCheck, TrendingUp, Sparkles, CheckCircle2 } from 'lucide-react';

interface AfiliadosModalProps {
  onClose: () => void;
}

export const AfiliadosModal: React.FC<AfiliadosModalProps> = ({ onClose }) => {
  const affiliateUrl = 'https://dashboard.kiwify.com/join/affiliate/f7ME4NGY';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-gradient-to-b from-[#020d18] via-[#041525] to-[#010810] border border-cyan-500/50 rounded-2xl p-5 sm:p-7 shadow-[0_0_50px_rgba(0,210,255,0.25)] text-slate-100 my-auto">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 transition-all z-20"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tech Grid Background Texture Overlay */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none rounded-2xl overflow-hidden"
          style={{
            backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        <div className="relative z-10 space-y-6">

          {/* Top Banner Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-400/50 text-cyan-300 text-[11px] font-black uppercase tracking-widest shadow-md">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Programa Oficial de Parcerias</span>
            </div>
            
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400 uppercase">
              PROGRAMA DE AFILIADOS
            </h2>
            <h3 className="text-xl sm:text-2xl font-black text-cyan-400 tracking-wider uppercase">
              GERAÇÃO Z PRO
            </h3>

            <p className="text-[11px] sm:text-xs font-bold text-slate-300 uppercase tracking-widest pt-1 flex items-center justify-center space-x-2">
              <span>TRANSPARÊNCIA</span>
              <span className="text-cyan-400">•</span>
              <span>CONFIANÇA</span>
              <span className="text-cyan-400">•</span>
              <span>RESULTADOS</span>
            </p>
          </div>

          {/* Main Earnings Highlight Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#0d2a4a] via-[#091f38] to-[#051224] border-2 border-cyan-400 shadow-xl shadow-cyan-500/20 text-center relative overflow-hidden group">
            <div className="relative z-10 space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                GANHE
              </span>
              <div className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-emerald-300 drop-shadow-[0_2px_10px_rgba(0,210,255,0.4)] whitespace-nowrap">
                R$ 111,56
              </div>
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wide text-cyan-200">
                POR CADA VENDA REALIZADA
              </span>
            </div>
          </div>

          {/* Financial Breakdown Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#030d17]/90 border border-cyan-500/30 space-y-3.5 shadow-lg">
            <div className="flex items-center space-x-2 text-cyan-400 font-black text-xs uppercase tracking-wider border-b border-cyan-500/20 pb-2">
              <Calculator className="w-4 h-4" />
              <span>Divisão Transparente de Comissões (Kiwify)</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-300 font-medium flex items-center space-x-1.5">
                  <ShoppingCart className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Preço do Produto:</span>
                </span>
                <span className="font-black text-cyan-300 whitespace-nowrap">R$ 247,90</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-300 font-medium flex items-center space-x-1.5">
                  <Percent className="w-3.5 h-3.5 text-amber-400" />
                  <span>Taxa Kiwify:</span>
                </span>
                <span className="font-black text-amber-400 whitespace-nowrap">- R$ 24,78</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40">
                <span className="text-cyan-200 font-bold flex items-center space-x-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Comissão Líquida Total:</span>
                </span>
                <span className="font-black text-emerald-400 text-sm whitespace-nowrap">R$ 223,12</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-center space-y-1">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase block">
                    Afiliado (50%)
                  </span>
                  <span className="text-lg font-black text-white block whitespace-nowrap">
                    R$ 111,56
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700 text-center space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Geração Z Pro (50%)
                  </span>
                  <span className="text-lg font-black text-slate-200 block whitespace-nowrap">
                    R$ 111,56
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-2 gap-2.5 text-[11px] font-bold">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-cyan-500/20 flex items-center space-x-2 text-cyan-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Produto de Alto Valor</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-cyan-500/20 flex items-center space-x-2 text-cyan-200">
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Sem Limite de Vendas</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-cyan-500/20 flex items-center space-x-2 text-cyan-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Pagamento Pontual Kiwify</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-cyan-500/20 flex items-center space-x-2 text-cyan-200">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Escalável e Lucrativo</span>
            </div>
          </div>

          {/* Footer Call to Action Button */}
          <div className="space-y-2 pt-2">
            <a
              href={affiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center space-x-3 shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all transform hover:scale-[1.02] active:scale-95 border border-emerald-300"
            >
              <DollarSign className="w-5 h-5" />
              <span>AFILIAR-SE AGORA NA KIWIFY</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <p className="text-[10px] text-center text-cyan-300/80 font-medium">
              Link oficial Kiwify: {affiliateUrl}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};
