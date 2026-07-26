import React, { useState } from 'react';
import { X, Users, Sparkles, Send, Loader2, Copy, Check, Bot, AlertCircle } from 'lucide-react';
import { Agent } from '../types';
import { AgentIcon, getColorTheme } from './AgentIcon';

interface MultiAgentModalProps {
  agents: Agent[];
  onClose: () => void;
}

export const MultiAgentModal: React.FC<MultiAgentModalProps> = ({ agents, onClose }) => {
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>(
    agents.slice(0, 3).map((a) => a.id)
  );
  const [taskPrompt, setTaskPrompt] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<{ agentName: string; content: string }[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const toggleAgentSelection = (id: string) => {
    if (selectedAgentIds.includes(id)) {
      if (selectedAgentIds.length > 2) {
        setSelectedAgentIds(selectedAgentIds.filter((aId) => aId !== id));
      }
    } else {
      if (selectedAgentIds.length < 4) {
        setSelectedAgentIds([...selectedAgentIds, id]);
      }
    }
  };

  const handleStartRoundtable = async () => {
    if (!taskPrompt.trim() || isExecuting) return;
    setIsExecuting(true);
    setErrorMsg(null);
    setResults(null);

    const selectedAgentsObjects = agents.filter((a) => selectedAgentIds.includes(a.id));

    try {
      const response = await fetch('/api/multi-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskPrompt,
          agents: selectedAgentsObjects.map((a) => ({
            name: a.name,
            systemInstruction: a.systemInstruction,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro na colaboração multi-agente.');
      }

      const data = await response.json();
      setResults(data.steps);
    } catch (err: any) {
      console.error('Multi-agent error:', err);
      setErrorMsg(err.message || 'Falha ao executar conversa em equipe.');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopyStep = (index: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      
      <div className="relative w-full max-w-4xl my-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Mesa Redonda Multi-Agente (Modo Equipe)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Coloque vários agentes especializados para colaborar sequencialmente na mesma tarefa
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {/* Agent Selector Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Selecione de 2 a 4 Agentes para a Equipe:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {agents.map((agent) => {
                const isSelected = selectedAgentIds.includes(agent.id);
                const theme = getColorTheme(agent.colorTheme);

                return (
                  <button
                    key={agent.id}
                    onClick={() => toggleAgentSelection(agent.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center space-x-2 ${
                      isSelected
                        ? `${theme.bg} ${theme.border} ring-2 ring-indigo-500/50`
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <AgentIcon name={agent.iconName} className={`w-4 h-4 ${theme.text}`} />
                    <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {agent.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Task Prompt Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Descreva a Tarefa para a Equipe:
            </label>
            <textarea
              rows={3}
              value={taskPrompt}
              onChange={(e) => setTaskPrompt(e.target.value)}
              placeholder="Ex: Crie um plano de lançamento completo para um aplicativo mobile. O Estrategista define o modelo de negócios, o Copywriter escreve o e-mail de anúncio e o UX Designer analisa a jornada..."
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 leading-relaxed"
            />
          </div>

          <button
            onClick={handleStartRoundtable}
            disabled={!taskPrompt.trim() || isExecuting || selectedAgentIds.length < 2}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-md shadow-indigo-600/20 active:scale-98 transition-all"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Os agentes estão debatendo e construindo a resposta...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Iniciar Discussão em Equipe</span>
              </>
            )}
          </button>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Collaborative Results Output */}
          {results && results.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Resultado da Colaboração da Equipe:</span>
              </h3>

              <div className="space-y-4">
                {results.map((step, idx) => {
                  const agentObj = agents.find((a) => a.name === step.agentName);
                  const theme = getColorTheme(agentObj?.colorTheme);

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2 relative"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 text-xs font-bold flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className={`text-xs font-bold ${theme.text}`}>
                            {step.agentName}
                          </span>
                        </div>

                        <button
                          onClick={() => handleCopyStep(idx, step.content)}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="whitespace-pre-wrap text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans pt-1">
                        {step.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
