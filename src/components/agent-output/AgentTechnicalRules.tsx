import React from 'react';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

export const AgentTechnicalRules: React.FC = () => {
  const rules = [
    'Formato vertical 9:16 (TikTok / Reels / Shorts)',
    'Produto preservado exatamente como na imagem de referência',
    'Nenhum texto visível no vídeo ou na imagem',
    'Nenhuma legenda gráfica sobreposta',
    'Nenhum carrinho laranja visível na tela (existente somente na fala)',
    'Nenhum ícone, botão ou imagem gráfica no vídeo',
    'Nenhuma câmera, celular ou ring light visível no cenário',
    'Nenhuma mão extra ou dedo deformado',
    'Nenhuma alteração de rótulo, embalagem ou cores',
    'Falas 100% limpas em Português Brasileiro (sem barras ou travessões)',
    'Valores monetários estritamente formatados com R$',
    'Linguagem segura sem alegações médicas desnecessárias',
  ];

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3 my-6">
      <div className="flex items-center space-x-2.5 pb-2.5 border-b border-slate-800">
        <ShieldCheck className="w-5 h-5 text-emerald-400" />
        <h4 className="text-xs font-black text-white uppercase tracking-wider">
          REGRAS TÉCNICAS APLICADAS
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
        {rules.map((rule, idx) => (
          <div key={idx} className="flex items-start space-x-2 bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <span className="font-medium text-slate-200">{rule}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
