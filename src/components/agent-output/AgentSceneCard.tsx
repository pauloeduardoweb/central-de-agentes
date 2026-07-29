import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Film, Sparkles } from 'lucide-react';
import { AgentFieldBlock } from './AgentFieldBlock';
import { AgentCopyButton } from './AgentCopyButton';

export interface SceneData {
  sceneNumber: number;
  objective?: string;
  visual: string;
  sound: string;
  speech: string;
  scenarioPrompt: string;
  videoPrompt: string;
}

interface AgentSceneCardProps {
  scene: SceneData;
}

export const AgentSceneCard: React.FC<AgentSceneCardProps> = ({ scene }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const fullSceneText = `
🎬 CENA ${scene.sceneNumber}

OBJETIVO:
${scene.objective || (scene.sceneNumber === 1 ? 'Gancho de 0 a 3 segundos' : scene.sceneNumber === 2 ? 'Demonstração e Prova de Qualidade' : 'Chamada para Ação e Fechamento')}

VISUAL:
${scene.visual}

SOM AMBIENTE:
${scene.sound}

FALA:
${scene.speech}

PROMPT DO CENÁRIO:
${scene.scenarioPrompt}

PROMPT DO VÍDEO:
${scene.videoPrompt}
`.trim();

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden transition-all duration-300 hover:border-slate-700 space-y-0 my-6">
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-between cursor-pointer select-none border-b border-slate-800/80 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-extrabold text-xs">
            {scene.sceneNumber}
          </div>
          <div>
            <h4 className="text-xs font-black text-white flex items-center gap-2">
              <Film className="w-4 h-4 text-amber-400" />
              🎬 CENA {scene.sceneNumber}
            </h4>
            <span className="text-[11px] text-slate-400 font-medium">
              OBJETIVO: {scene.objective || (scene.sceneNumber === 1 ? 'Gancho de 0 a 3s' : scene.sceneNumber === 2 ? 'Demonstração de Qualidade' : 'Chamada para Ação (CTA)')}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <AgentCopyButton textToCopy={fullSceneText} label="Copiar Cena" />
          <button
            type="button"
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-3.5 bg-slate-950/60 animate-in fade-in duration-200">
          <AgentFieldBlock
            label="VISUAL"
            content={scene.visual}
            badgeColor="bg-blue-950 text-blue-300 border-blue-800"
            accentColor="border-blue-900/40 bg-blue-950/20"
          />

          <AgentFieldBlock
            label="SOM AMBIENTE"
            content={scene.sound}
            badgeColor="bg-purple-950 text-purple-300 border-purple-800"
            accentColor="border-purple-900/40 bg-purple-950/20"
          />

          <AgentFieldBlock
            label="FALA"
            content={scene.speech}
            badgeColor="bg-emerald-950 text-emerald-300 border-emerald-800 font-black text-xs"
            accentColor="border-emerald-700/60 bg-emerald-950/30 ring-1 ring-emerald-500/30"
          />

          <AgentFieldBlock
            label="PROMPT DO CENÁRIO"
            content={scene.scenarioPrompt}
            badgeColor="bg-amber-950 text-amber-300 border-amber-800"
            accentColor="border-amber-900/40 bg-amber-950/20"
          />

          <AgentFieldBlock
            label="PROMPT DO VÍDEO"
            content={scene.videoPrompt}
            badgeColor="bg-cyan-950 text-cyan-300 border-cyan-800"
            accentColor="border-cyan-900/40 bg-cyan-950/20"
          />
        </div>
      )}
    </div>
  );
};
