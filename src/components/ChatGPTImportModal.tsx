import React, { useState } from 'react';
import { X, Upload, Sparkles, Check, AlertCircle, FileCode } from 'lucide-react';
import { Agent, CategoryType } from '../types';

interface ChatGPTImportModalProps {
  onImport: (agent: Partial<Agent>) => void;
  onClose: () => void;
}

export const ChatGPTImportModal: React.FC<ChatGPTImportModalProps> = ({ onImport, onClose }) => {
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'text' | 'json'>('text');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const SAMPLE_GPT_PROMPT = `Nome: Especialista em Estruturação de Artigos
Tagline: Estruturas SEO e roteiros de conteúdo para blogs
Instruções: Você é um redator sênior focado em artigos de alta relevância com seções H2, H3, FAQ e conclusão acionável em Português.
Starters:
- Crie a estrutura de um post sobre Inteligência Artificial nos negócios
- Escreva um roteiro completo para artigo técnico
Categoria: Escrita e Conteúdo`;

  const handleImportSubmit = () => {
    setErrorMsg(null);
    if (!importText.trim()) return;

    if (importMode === 'json') {
      try {
        const parsed = JSON.parse(importText);
        if (!parsed.name || !parsed.systemInstruction) {
          throw new Error('O JSON deve conter pelo menos os campos "name" e "systemInstruction" (ou "instructions").');
        }
        onImport({
          name: parsed.name,
          tagline: parsed.tagline || 'Custom GPT Importado',
          description: parsed.description || parsed.instructions || '',
          category: parsed.category || 'Outros',
          iconName: parsed.iconName || 'Bot',
          colorTheme: parsed.colorTheme || 'indigo',
          systemInstruction: parsed.systemInstruction || parsed.instructions || '',
          conversationStarters: parsed.conversationStarters || parsed.starters || ['Olá! Como posso ajudar?'],
          capabilities: parsed.capabilities || { codeInterpreter: true, webSearch: true, imageGeneration: false, jsonOutput: false },
          temperature: parsed.temperature || 0.7,
          isCustom: true,
        });
        onClose();
      } catch (err: any) {
        setErrorMsg(`Erro no JSON: ${err.message}`);
      }
    } else {
      // Parse plain text / instructions
      const lines = importText.split('\n');
      let name = 'Custom GPT Importado';
      let tagline = 'Importado do ChatGPT';
      let category: CategoryType = 'Tiktok 2K';
      let starters: string[] = [];
      let systemInstruction = importText;

      lines.forEach((line) => {
        if (line.toLowerCase().startsWith('nome:') || line.toLowerCase().startsWith('name:')) {
          name = line.split(':')[1].trim();
        } else if (line.toLowerCase().startsWith('tagline:')) {
          tagline = line.split(':')[1].trim();
        } else if (line.toLowerCase().startsWith('instruções:') || line.toLowerCase().startsWith('instructions:')) {
          systemInstruction = importText.substring(importText.indexOf(line));
        }
      });

      onImport({
        name,
        tagline,
        description: `Agente importado a partir de prompt do ChatGPT.`,
        category,
        iconName: 'Bot',
        colorTheme: 'emerald',
        systemInstruction: systemInstruction.trim(),
        conversationStarters: starters.length > 0 ? starters : ['Inicie a conversa com este GPT'],
        capabilities: { codeInterpreter: true, webSearch: true, imageGeneration: false, jsonOutput: false },
        temperature: 0.7,
        isCustom: true,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Importar Custom GPT do ChatGPT
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          
          {/* Format Selector */}
          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setImportMode('text')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                importMode === 'text'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Instruções / Texto Livre
            </button>
            <button
              onClick={() => setImportMode('json')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                importMode === 'json'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              JSON Estruturado
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {importMode === 'text' ? 'Cole o Prompt / Instruções do Custom GPT:' : 'Cole o JSON de Configuração:'}
              </label>
              <button
                type="button"
                onClick={() => setImportText(SAMPLE_GPT_PROMPT)}
                className="text-[11px] text-emerald-600 hover:underline"
              >
                Carregar Exemplo
              </button>
            </div>

            <textarea
              rows={8}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={
                importMode === 'text'
                  ? 'Cole aqui as instruções ou o prompt completo do seu Custom GPT do ChatGPT...'
                  : '{\n  "name": "Meu GPT",\n  "systemInstruction": "Você é..."\n}'
              }
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/50 leading-relaxed"
            />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              onClick={handleImportSubmit}
              disabled={!importText.trim()}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
            >
              Importar Agente
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
