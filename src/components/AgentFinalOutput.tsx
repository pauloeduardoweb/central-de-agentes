import React, { useState } from 'react';
import { Sparkles, Copy, Check, Edit3, RotateCcw } from 'lucide-react';
import { FinalOutputBlock } from '../services/AgentOutputGenerator';
import { AgentProjectSummary, ProjectSummaryData } from './agent-output/AgentProjectSummary';
import { AgentSceneCard, SceneData } from './agent-output/AgentSceneCard';
import { AgentTechnicalRules } from './agent-output/AgentTechnicalRules';
import { AgentCopyButton } from './agent-output/AgentCopyButton';

interface AgentFinalOutputProps {
  outputs: FinalOutputBlock[];
  onEditAnswers: () => void;
  onClearChat: () => void;
}

export const AgentFinalOutput: React.FC<AgentFinalOutputProps> = ({
  outputs,
  onEditAnswers,
  onClearChat,
}) => {
  const [copiedAll, setCopiedAll] = useState(false);

  // Helper to parse scene content from structured text block
  const parseScenesAndSummary = (blockContent: string) => {
    // 1. Extract Summary Data
    let productName = 'Produto Destaque';
    let voiceStyle = 'Homem com voz jovem e dinâmica';
    let environment = 'Loja Comercial / Estúdio';
    let price = '';

    const prodMatch = blockContent.match(/(?:PRODUTO IDENTIFICADO|PRODUTO):\s*([^\n]+)/i);
    if (prodMatch) productName = prodMatch[1].trim();

    const voiceMatch = blockContent.match(/(?:LOCUÇÃO|VOZ):\s*([^\n]+)/i);
    if (voiceMatch) voiceStyle = voiceMatch[1].trim();

    const envMatch = blockContent.match(/(?:CENÁRIO E ATMOSFERA|CENÁRIO):\s*([^\n]+)/i);
    if (envMatch) environment = envMatch[1].trim();

    const priceMatch = blockContent.match(/(?:VALOR|PREÇO|VALOR NA LOJA FÍSICA):\s*([^\n]+)/i);
    if (priceMatch) price = priceMatch[1].trim();

    // 2. Extract Scene Cards
    const scenes: SceneData[] = [];
    const sceneRegex = /(?:🎬\s*)?CENA\s+(\d+)\b([^\n]*)/gi;
    const sceneMatches = Array.from(blockContent.matchAll(sceneRegex));

    if (sceneMatches.length > 0) {
      sceneMatches.forEach((match, index) => {
        const sceneNum = parseInt(match[1], 10) || (index + 1);
        const objSubtitle = match[2].replace(/^[—\-:\s]+/, '').trim();

        // Get text segment between this scene match and next scene match
        const startIndex = match.index! + match[0].length;
        const endIndex = sceneMatches[index + 1] ? sceneMatches[index + 1].index : blockContent.length;
        const segment = blockContent.slice(startIndex, endIndex);

        const visual = extractField(segment, 'VISUAL');
        const sound = extractField(segment, 'SOM AMBIENTE');
        const speech = extractField(segment, 'FALA');
        const scenarioPrompt = extractField(segment, 'PROMPT DO CENÁRIO');
        const videoPrompt = extractField(segment, 'PROMPT DO VÍDEO');

        scenes.push({
          sceneNumber: sceneNum,
          objective: objSubtitle || (sceneNum === 1 ? 'Gancho de 0 a 3s' : sceneNum === 2 ? 'Demonstração de Qualidade' : 'Chamada para Ação'),
          visual,
          sound,
          speech,
          scenarioPrompt,
          videoPrompt,
        });
      });
    }

    const summary: ProjectSummaryData = {
      productName,
      voiceStyle,
      environment,
      price,
      duration: '16 a 25 segundos',
      sceneCount: scenes.length || 3,
    };

    return { summary, scenes };
  };

  const extractField = (text: string, fieldName: string): string => {
    const regex = new RegExp(`${fieldName}:\\s*([\\s\\S]*?)(?=(?:VISUAL:|SOM AMBIENTE:|FALA:|PROMPT DO CENÁRIO:|PROMPT DO VÍDEO:|CENA|REGRAS|=================|$))`, 'i');
    const m = text.match(regex);
    if (!m) return '';
    return m[1].replace(/^["'\s]+|["'\s]+$/g, '').trim();
  };

  const handleCopyAll = () => {
    const fullText = outputs
      .map((b) => `${b.title}\n\n${b.content}`)
      .join('\n\n')
      .replace(/={3,}/g, '')
      .replace(/-{3,}/g, '');

    navigator.clipboard.writeText(fullText.trim());
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="my-6 p-4 sm:p-6 rounded-3xl bg-slate-950/95 border border-emerald-500/50 shadow-2xl backdrop-blur-xl space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-emerald-500/30 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-black text-white tracking-wide">
              ENTREGA ROBUSTA E PADRONIZADA
            </h3>
            <p className="text-xs text-emerald-300">
              Roteiro, Falas Limpas e Prompts em Cards Separados
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyAll}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all border border-emerald-300/40"
        >
          {copiedAll ? (
            <>
              <Check className="w-4 h-4 text-emerald-100" />
              <span>Tudo Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copiar Roteiro Completo</span>
            </>
          )}
        </button>
      </div>

      {/* Output Content Rendering */}
      {outputs.map((block) => {
        const { summary, scenes } = parseScenesAndSummary(block.content);

        if (scenes.length > 0) {
          return (
            <div key={block.id} className="space-y-6">
              {/* Card 1: Project Summary */}
              <AgentProjectSummary summary={summary} fullContentToCopy={block.content} />

              {/* Cards for each Scene */}
              <div className="space-y-6">
                {scenes.map((scene) => (
                  <AgentSceneCard key={scene.sceneNumber} scene={scene} />
                ))}
              </div>

              {/* Technical Rules */}
              <AgentTechnicalRules />
            </div>
          );
        }

        // Fallback for non-scene blocks
        return (
          <div key={block.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-xs font-black text-amber-300">{block.title}</h4>
              <AgentCopyButton textToCopy={block.content} />
            </div>
            <p className="text-xs text-slate-200 font-mono leading-relaxed whitespace-pre-wrap select-all">
              {block.content.replace(/={3,}/g, '').replace(/-{3,}/g, '')}
            </p>
          </div>
        );
      })}

      {/* Action Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onEditAnswers}
          className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center space-x-2 border border-slate-700 transition-all active:scale-95"
        >
          <Edit3 className="w-4 h-4 text-amber-400" />
          <span>Editar Respostas do Agente</span>
        </button>

        <button
          type="button"
          onClick={onClearChat}
          className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center space-x-2 border border-slate-700 transition-all active:scale-95"
        >
          <RotateCcw className="w-4 h-4 text-rose-400" />
          <span>Iniciar Nova Conversa</span>
        </button>
      </div>
    </div>
  );
};
