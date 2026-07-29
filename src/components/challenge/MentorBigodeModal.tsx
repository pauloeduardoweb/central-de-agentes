import React from 'react';
import { Bot, Sparkles, X, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MentorBigodeModalProps {
  isOpen: boolean;
  productName: string;
  category: string;
  onClose: () => void;
}

const MENTOR_TIPS = [
  'Procure a alternativa que desperta curiosidade imediata e faz o usuário parar de rolar o feed nos primeiros 3 segundos.',
  'Evite chamadas excessivamente comerciais ou apelativas. No TikTok Shop, os vídeos orgânicos com maior conversão parecem recomendações sinceras.',
  'Os melhores ganchos costumam fazer uma pergunta provocativa ou mostrar um problema do dia a dia.',
  'Procure pelo gatilho mental de Quebra de Padrão. Quanto mais inesperado for o início do vídeo, maior será a taxa de retenção.',
  'Atenção ao gatilho de Prova Social ou Urgência — eles aceleram a decisão de compra de quem já está interessado.',
];

export const MentorBigodeModal: React.FC<MentorBigodeModalProps> = ({
  isOpen,
  productName,
  category,
  onClose,
}) => {
  if (!isOpen) return null;

  // Pick tip based on product name hash
  const tipIndex = (productName.length + category.length) % MENTOR_TIPS.length;
  const tip = MENTOR_TIPS[tipIndex];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-lg rounded-3xl bg-gradient-to-br from-[#0c1e33] via-[#081524] to-[#040b12] border-2 border-amber-400/80 p-6 sm:p-8 text-white shadow-[0_0_50px_rgba(245,158,11,0.3)] overflow-hidden"
        >
          {/* Top Decorative Glow */}
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-amber-500/20 blur-2xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Avatar & Header */}
          <div className="flex items-center space-x-4 pb-4 border-b border-amber-500/30">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/30 via-orange-500/20 to-amber-600/30 border-2 border-amber-400 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)] shrink-0">
              <Bot className="w-10 h-10 text-amber-400" />
            </div>

            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/50 text-[10px] font-black uppercase tracking-widest shadow">
                PODER 3 • MENTOR BIGODE IA
              </span>
              <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-100 to-white mt-1">
                DICA ESTRATÉGICA DO MENTOR
              </h3>
            </div>
          </div>

          {/* Context Card */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-amber-300">
              <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Análise do Produto: {productName}</span>
            </div>

            <p className="text-sm text-slate-100 font-semibold leading-relaxed italic">
              "{tip}"
            </p>
          </div>

          {/* Call To Action */}
          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 transition transform active:scale-95 cursor-pointer"
            >
              ENTENDI! VOLTAR PARA AS CARTAS
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
