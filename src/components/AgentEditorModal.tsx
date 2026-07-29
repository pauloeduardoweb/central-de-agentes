import React, { useState } from 'react';
import { X, Sparkles, Loader2, Bot, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Agent, CategoryType, AgentCapabilities } from '../types';
import { AgentIcon, COLOR_MAP } from './AgentIcon';
import { getAuthHeaders, getDeviceId } from '../utils/deviceId';

interface AgentEditorModalProps {
  initialAgent?: Agent | null;
  onSave: (agentData: Partial<Agent>) => void;
  onClose: () => void;
}

const CATEGORIES: CategoryType[] = ['Tiktok 2K', 'Tiktok Shop', 'Recurso Anti-Violação', 'Suporte', 'Grupo de Network', 'Flow Ultra', 'Academia de Desafios', 'Prompts de Movimentos'];

const ICONS_LIST = [
  'Bot', 'Code2', 'PenTool', 'Languages', 'Briefcase', 'Sparkles',
  'LineChart', 'Palette', 'ShieldCheck', 'HeartPulse', 'GraduationCap',
  'Terminal', 'Cpu', 'Database', 'Search', 'Zap', 'Lightbulb', 'Compass'
];

const COLORS_LIST = ['indigo', 'rose', 'emerald', 'amber', 'violet', 'cyan', 'fuchsia', 'sky', 'teal'];

export const AgentEditorModal: React.FC<AgentEditorModalProps> = ({
  initialAgent,
  onSave,
  onClose,
}) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [name, setName] = useState(initialAgent?.name || '');
  const [tagline, setTagline] = useState(initialAgent?.tagline || '');
  const [description, setDescription] = useState(initialAgent?.description || '');
  const [chatGptUrl, setChatGptUrl] = useState(initialAgent?.chatGptUrl || '');
  const [category, setCategory] = useState<CategoryType>(
    initialAgent?.category || 'Tiktok 2K'
  );
  const [iconName, setIconName] = useState(initialAgent?.iconName || 'Bot');
  const [colorTheme, setColorTheme] = useState(initialAgent?.colorTheme || 'indigo');
  const [systemInstruction, setSystemInstruction] = useState(
    initialAgent?.systemInstruction || 'Você é um assistente especializado em...'
  );
  const [temperature, setTemperature] = useState(initialAgent?.temperature || 0.7);
  const [conversationStarters, setConversationStarters] = useState<string[]>(
    initialAgent?.conversationStarters || [
      'Como você pode me ajudar hoje?',
      'Quais são suas principais habilidades?',
    ]
  );
  const [capabilities, setCapabilities] = useState<AgentCapabilities>(
    initialAgent?.capabilities || {
      codeInterpreter: true,
      webSearch: true,
      imageGeneration: false,
      jsonOutput: true,
    }
  );

  const handleGenerateWithAi = async () => {
    if (!aiPrompt.trim() || isAiGenerating) return;
    setIsAiGenerating(true);
    setAiError(null);

    try {
      const storedKey = localStorage.getItem('user_gemini_api_key') || '';
      const storedCode = localStorage.getItem('user_student_access_code') || '';
      const response = await fetch('/api/generate-agent', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          prompt: aiPrompt,
          customApiKey: storedKey || undefined,
          studentAccessCode: storedCode || undefined,
          deviceId: getDeviceId(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao gerar o agente.');
      }

      const data = await response.json();
      const generated = data.agent;

      if (generated) {
        setName(generated.name || '');
        setTagline(generated.tagline || '');
        setDescription(generated.description || '');
        if (generated.category && CATEGORIES.includes(generated.category as any)) {
          setCategory(generated.category as any);
        }
        if (generated.iconName) setIconName(generated.iconName);
        if (generated.colorTheme) setColorTheme(generated.colorTheme);
        if (generated.systemInstruction) setSystemInstruction(generated.systemInstruction);
        if (generated.conversationStarters) setConversationStarters(generated.conversationStarters);
        if (generated.capabilities) setCapabilities(generated.capabilities);
        if (typeof generated.temperature === 'number') setTemperature(generated.temperature);
      }
    } catch (err: any) {
      console.error('AI generation error:', err);
      setAiError(err.message || 'Erro ao gerar agente com IA.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleAddStarter = () => {
    if (conversationStarters.length < 5) {
      setConversationStarters([...conversationStarters, 'Nova pergunta inicial...']);
    }
  };

  const handleUpdateStarter = (index: number, val: string) => {
    const updated = [...conversationStarters];
    updated[index] = val;
    setConversationStarters(updated);
  };

  const handleRemoveStarter = (index: number) => {
    setConversationStarters(conversationStarters.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name,
      tagline,
      description,
      chatGptUrl: chatGptUrl.trim() || undefined,
      category,
      iconName,
      colorTheme,
      systemInstruction,
      temperature,
      conversationStarters: conversationStarters.filter((s) => s.trim().length > 0),
      capabilities,
      isCustom: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      
      <div className="relative w-full max-w-3xl my-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {initialAgent ? 'Editar Agente GPT' : 'Criar Novo Agente GPT'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* AI Magic Generator Section */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-emerald-500/10 border border-indigo-200/60 dark:border-indigo-800/60">
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Gerar Agente com Inteligência Artificial
              </h3>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mb-3">
              Descreva o tipo de agente que você quer e o Gemini preencherá automaticamente o nome, tom, instruções de sistema e sugestões de conversa!
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Ex: Um corretor de imóveis especialista em negociação no Rio de Janeiro..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                disabled={isAiGenerating}
                className="flex-1 py-2 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
              />
              <button
                type="button"
                onClick={handleGenerateWithAi}
                disabled={!aiPrompt.trim() || isAiGenerating}
                className="py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs shrink-0"
              >
                {isAiGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Gerando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Gerar Agente</span>
                  </>
                )}
              </button>
            </div>
            {aiError && <p className="text-[11px] text-rose-500 mt-2">{aiError}</p>}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Name & Tagline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Agente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Especialista em SEO Tecnológico"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tagline (Subtítulo de 1 linha)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Auditorias técnicas, schemas e estratégias de busca"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>

            {/* Description & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição Completa
                </label>
                <input
                  type="text"
                  placeholder="Breve descrição dos objetivos e escopo do agente..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full py-2 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Direct ChatGPT Link */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Link do Agente no ChatGPT (URL Direta)
              </label>
              <input
                type="url"
                placeholder="https://chatgpt.com/g/g-..."
                value={chatGptUrl}
                onChange={(e) => setChatGptUrl(e.target.value)}
                className="w-full py-2 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            {/* Icon & Color Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Escolher Ícone
                </label>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  {ICONS_LIST.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIconName(ic)}
                      className={`p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors ${
                        iconName === ic ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500' : ''
                      }`}
                    >
                      <AgentIcon name={ic} size={18} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tema de Cor
                </label>
                <div className="flex flex-wrap gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  {COLORS_LIST.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setColorTheme(col)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                        colorTheme === col ? 'ring-2 ring-slate-900 dark:ring-white font-bold' : ''
                      } ${COLOR_MAP[col]?.bg} ${COLOR_MAP[col]?.text}`}
                    >
                      {col}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* System Instruction (Prompt) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Instruções do Sistema (System Instructions / Prompt do Custom GPT) *
              </label>
              <textarea
                required
                rows={5}
                value={systemInstruction}
                onChange={(e) => setSystemInstruction(e.target.value)}
                placeholder="Defina o comportamento, tom de voz, regras e persona do agente..."
                className="w-full p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50 leading-relaxed"
              />
            </div>

            {/* Temperature & Capabilities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Temperatura (Criatividade)
                  </label>
                  <span className="text-xs font-bold text-emerald-600">{temperature}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Pragmático (0.1)</span>
                  <span>Equilibrado (0.7)</span>
                  <span>Criativo (1.0)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Recursos & Ferramentas
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={capabilities.codeInterpreter}
                      onChange={(e) => setCapabilities({ ...capabilities, codeInterpreter: e.target.checked })}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Interpretador de Código</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={capabilities.webSearch}
                      onChange={(e) => setCapabilities({ ...capabilities, webSearch: e.target.checked })}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Navegação Web</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={capabilities.imageGeneration}
                      onChange={(e) => setCapabilities({ ...capabilities, imageGeneration: e.target.checked })}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Geração de Imagens</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Conversation Starters */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Perguntas/Comandos Iniciais (Conversation Starters)
                </label>
                {conversationStarters.length < 5 && (
                  <button
                    type="button"
                    onClick={handleAddStarter}
                    className="text-xs font-medium text-emerald-600 hover:underline flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar</span>
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {conversationStarters.map((starter, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={starter}
                      onChange={(e) => handleUpdateStarter(idx, e.target.value)}
                      placeholder={`Starter ${idx + 1}`}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveStarter(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="btn-save-agent"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
              >
                Salvar Agente
              </button>
            </div>

          </form>

        </div>

      </div>

    </div>
  );
};
