import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, AlertCircle, X, Lock, Key, Loader2 } from 'lucide-react';
import { isValidStudentCode } from '../data/studentCodes';
import { getDeviceId } from '../utils/deviceId';

interface ApiKeyModalProps {
  onClose: () => void;
  onSave: (apiKey: string, accessCode: string, sessionId?: string) => void;
  isMandatoryOnboarding?: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onClose, onSave, isMandatoryOnboarding = false }) => {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedCode = localStorage.getItem('user_student_access_code') || '';
    setAccessCode(storedCode);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = accessCode.trim();

    if (!cleanCode) {
      setError('Por favor, digite o Código de Acesso do Aluno (fornecido na mentoria).');
      return;
    }

    if (!isValidStudentCode(cleanCode)) {
      setError('Código de Acesso do Aluno inválido. Verifique o código e tente novamente.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const deviceId = getDeviceId();
      const res = await fetch('/api/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-device-id': deviceId,
          'x-student-access-code': cleanCode,
        },
        body: JSON.stringify({
          studentAccessCode: cleanCode,
          deviceId,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (e) {
        // Response was non-JSON (e.g. timeout or HTML page)
      }

      if (!res.ok) {
        if ((res.status === 409 || res.status === 403 || res.status === 401) && data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        setError(data.error || `Acesso negado: O código (${cleanCode.toUpperCase()}) é inválido.`);
        setLoading(false);
        return;
      }

      const returnedSessionId = data.sessionId || '';
      onSave('STUDENT_AUTHORIZED', cleanCode, returnedSessionId);
    } catch (err: any) {
      if (isValidStudentCode(cleanCode)) {
        onSave('STUDENT_AUTHORIZED', cleanCode);
      } else {
        setError('Não foi possível verificar a licença. Verifique sua conexão com a internet e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200 ${isMandatoryOnboarding ? 'bg-slate-950/98 backdrop-blur-2xl' : 'bg-black/85 backdrop-blur-md'}`}>
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
              Autenticação de Alunos da Mentoria
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
            Insira o seu <b>Código de Acesso Exclusivo de Aluno</b> para liberar toda a plataforma e os agentes de IA.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                <span>Código de Acesso do Aluno:</span>
              </span>
              <span className="text-[10px] text-cyan-400 font-normal">Fornecido na mentoria</span>
            </label>
            <input
              type="text"
              placeholder="Digite seu código ex: GZ-5KRT-SRGB"
              value={accessCode}
              onChange={(e) => {
                setAccessCode(e.target.value);
                setError(null);
              }}
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#020d14] border border-amber-500/40 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
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
              disabled={loading}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando Dispositivo...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Validar e Entrar</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};


