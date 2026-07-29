import React from 'react';
import { ShoppingBag, Mic, MapPin, Tag, Clock, Layers } from 'lucide-react';
import { AgentCopyButton } from './AgentCopyButton';

export interface ProjectSummaryData {
  productName: string;
  voiceStyle?: string;
  environment?: string;
  format?: string;
  price?: string;
  duration?: string;
  sceneCount?: number;
}

interface AgentProjectSummaryProps {
  summary: ProjectSummaryData;
  fullContentToCopy: string;
}

export const AgentProjectSummary: React.FC<AgentProjectSummaryProps> = ({
  summary,
  fullContentToCopy,
}) => {
  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 shadow-xl space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            RESUMO DO PROJETO — ROTEIRO VITRINE REALISTA
          </h3>
          <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
            Estrutura técnica validada para TikTok Shop / Reels
          </p>
        </div>
        <AgentCopyButton textToCopy={fullContentToCopy} label="Copiar Resumo" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start space-x-2.5">
          <ShoppingBag className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Produto</span>
            <span className="font-bold text-white">{summary.productName || 'Produto Destaque'}</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start space-x-2.5">
          <Mic className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Locução</span>
            <span className="font-bold text-slate-200">{summary.voiceStyle || 'Homem com voz masculina jovem e dinâmica'}</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start space-x-2.5">
          <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Cenário</span>
            <span className="font-bold text-slate-200">{summary.environment || 'Loja Comercial / Estúdio'}</span>
          </div>
        </div>

        {summary.price && (
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start space-x-2.5">
            <Tag className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Valor Confirmado</span>
              <span className="font-black text-emerald-300">{summary.price}</span>
            </div>
          </div>
        )}

        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start space-x-2.5">
          <Clock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Duração Estimada</span>
            <span className="font-bold text-slate-200">{summary.duration || '16 a 25 segundos'}</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start space-x-2.5">
          <Layers className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Quantidade de Cenas</span>
            <span className="font-bold text-slate-200">{summary.sceneCount || 3} Cenas Estruturadas</span>
          </div>
        </div>
      </div>
    </div>
  );
};
