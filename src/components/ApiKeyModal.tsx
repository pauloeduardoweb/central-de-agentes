import React, { useState, useEffect } from 'react';
import { Key, Sparkles, ExternalLink, ShieldCheck, Check, AlertCircle, X, Lock } from 'lucide-react';
import { isValidStudentCode } from '../data/studentCodes';

interface ApiKeyModalProps {
  onClose: () => void;
  onSave: (apiKey: string, accessCode: string) => void;
  isMandatoryOnboarding?: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onClose, onSave, isMandatoryOnboarding = false }) => {
  const [apiKey, setApiKey] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedKey = localStorage.getItem('user_gemini_api_key') || '';
    const storedCode = localStorage.getItem('user_student_access_code') || '';
    setApiKey(storedKey);
    setAccessCode(storedCode);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = accessCode.trim();
    const cleanKey = apiKey.trim();

    if (!cleanCode) {
      setError('Por favor, digite o Código de Acesso do Aluno (fornecido na mentoria).');
      return;
    }

    if (!isValidStudentCode(cleanCode)) {
      setError('Código de Acesso do Aluno inválido. Verifique o código e tente novamente.');
      return;
    }

    if (!cleanKey) {
      setError('Por favor, digite a sua Chave API do Gemini para continuar.');
      return;
    }

    if (cleanKey.length < 10) {
      setError('Chave muito curta ou inválida. Por favor, cole a chave de API completa obtida no Google AI Studio.');
      return;
    }

    onSave(cleanKey, cleanCode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#041a27] border border-cyan-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5 text-slate-100">
        
        {!isMandatoryOnboarding && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header Icon */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-cyan-500/20 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
              <span>Acesso Exclusivo — Aluno Geração Z Pro</span>
            </h2>
            <p className="text-xs text-slate-400">
              Autenticação de Aluno & Chave API Gemini
            </p>
          </div>
        </div>

        {/* Notice Banner */}
        <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-3.5 text-xs text-cyan-200/90 leading-relaxed space-y-1.5">
          <div className="flex items-center space-x-1.5 font-bold text-cyan-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Área Restrita aos Alunos da Mentoria</span>
          </div>
          <p>
            Para proteger a estrutura dos agentes, insira seu <b>Código de Acesso do Aluno</b> e a sua <b>Chave API do Gemini</b>.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>1. Código de Acesso do Aluno:</span>
              <span className="text-[10px] text-cyan-400 font-normal">Fornecido na mentoria</span>
            </label>
            <input
              type="text"
              placeholder="Digite o código da mentoria..."
              value={accessCode}
              onChange={(e) => {
                setAccessCode(e.target.value);
                setError(null);
              }}
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#020d14] border border-amber-500/40 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>2. Sua Chave API do Gemini:</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 font-normal underline inline-flex items-center space-x-1 text-[11px]"
              >
                <span>Criar chave grátis</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <input
              type="password"
              placeholder="Cole sua chave de API aqui..."
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError(null);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#020d14] border border-cyan-500/30 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-400 font-medium mt-1 flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <div className="flex items-center justify-end space-x-2 pt-2">
            {!isMandatoryOnboarding && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>Entrar no Aplicativo</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

