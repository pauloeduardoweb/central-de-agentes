import React from 'react';
import { ShieldCheck, X, Check, AlertCircle } from 'lucide-react';

interface CommunityRulesModalProps {
  onClose: () => void;
}

export const CommunityRulesModal: React.FC<CommunityRulesModalProps> = ({ onClose }) => {
  const rules = [
    'Respeito Absoluto: Não são tolerados discursos de ódio, ofensas, discriminação ou bullying.',
    'Proibido Spam e Links Suspeitos: Divulgações não autorizadas, esquemas de pirâmide ou links de terceiros são estritamente proibidos.',
    'Privacidade Guardada: Nunca compartilhe dados pessoais de outros alunos ou informações de conta.',
    'Conteúdo Construtivo: Mantenha as conversas focadas no aprendizado, mentoria e evolução da Geração Z Pro.',
    'Moderação Ativa: O Mentor Bigode reserva o direito de advertir, suspender ou banir membros em descumprimento das diretrizes.',
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Regras da Comunidade</h3>
            <p className="text-xs text-slate-400">Geração Z Pro — Comunidade Exclusiva</p>
          </div>
        </div>

        <div className="space-y-3 my-6 max-h-[60vh] overflow-y-auto pr-2">
          {rules.map((rule, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <div className="p-1 rounded bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{rule}</p>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-300 mb-6">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Ao enviar mensagens no Bate-papo você concorda com os termos acima.</span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 font-semibold text-sm text-slate-950 shadow-lg shadow-emerald-500/20 transition-all"
        >
          Entendi as Regras
        </button>
      </div>
    </div>
  );
};
