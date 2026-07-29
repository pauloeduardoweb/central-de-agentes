import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, AlertCircle, X, Lock, Key, Loader2 } from 'lucide-react';
import { isValidStudentCode } from '../data/studentCodes';
import { getDeviceId } from '../utils/deviceId';
import { getSafeImageUrl } from '../utils/imageUrl';

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

    // Lock page scrollbar while modal is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-device-id': deviceId,
        },
        body: JSON.stringify({
          accessCode: cleanCode,
          deviceId,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (e) {
        // Response was non-JSON
      }

      if (!res.ok) {
        if (res.status === 500) {
          setError(data.message || data.error || 'O servidor de autenticação está temporariamente indisponível.');
        } else if (res.status === 409) {
          setError(data.message || data.error || 'Esta chave já está sendo utilizada em outro dispositivo. Encerre a sessão anterior para continuar.');
        } else if (res.status === 401) {
          setError(data.message || data.error || `Acesso negado: O código (${cleanCode.toUpperCase()}) é inválido.`);
        } else {
          setError(data.message || data.error || 'O servidor de autenticação está temporariamente indisponível.');
        }
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
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-end sm:justify-center p-3 sm:p-6 pt-2 sm:pt-28 pb-3 sm:pb-8 animate-in fade-in duration-200 overflow-hidden select-none login-bg-responsive"
    >
      <style>{`
        .login-bg-responsive {
          background-repeat: no-repeat;
          background-color: #020612;
        }
        @media (max-width: 639px) {
          .login-bg-responsive {
            background-image: url('https://i.postimg.cc/300YdHdZ/CAPA.png'), url('/login-bg-hd.png');
            background-size: cover, cover;
            background-position: center top, center top;
          }
        }
        @media (min-width: 640px) {
          .login-bg-responsive {
            background-image: url('/login-bg-hd.png'), url('https://i.postimg.cc/DnDYSZ00/CAPA.png');
            background-size: cover, cover;
            background-position: center center, center center;
          }
        }
      `}</style>

      {/* Soft overlay (10%) to preserve text contrast without darkening the Ultra HD image */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none z-0" />

      <div className="bg-[#030b18]/95 border-2 border-blue-500/50 rounded-2xl w-[90%] sm:w-full max-w-[340px] sm:max-w-md overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.4)] relative z-10 text-slate-100 transform translate-y-0 sm:translate-y-8 transition-all duration-300">
        
        {/* High Tech Cover Banner */}
        <div className="relative w-full aspect-[16/6] bg-[#020713] overflow-hidden border-b border-blue-500/40">
          <svg className="w-full h-full object-cover" viewBox="0 0 1200 450" fill="none">
            <defs>
              <radialGradient id="modalBgGlow" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="#082046" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#030c1e" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#01040a" stopOpacity="1" />
              </radialGradient>
              <linearGradient id="modalTextMetallic" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#e0f2fe" />
                <stop offset="35%" stopColor="#38bdf8" />
                <stop offset="70%" stopColor="#1d4ed8" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
              <linearGradient id="modalBeamGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
                <stop offset="50%" stopColor="#60a5fa" stopOpacity="1" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </linearGradient>
              <filter id="modalGlow">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <rect width="1200" height="450" fill="url(#modalBgGlow)" />
            <g stroke="#60a5fa" strokeWidth="2.5" fill="none" opacity="0.85">
              <path d="M 0 0 L 60 50 L 40 80 L 120 120 L 90 150 L 180 200" />
              <path d="M 1200 0 L 1140 50 L 1160 80 L 1080 120 L 1110 150 L 1020 200" />
            </g>
            <g stroke="#3b82f6" strokeWidth="2" fill="none" opacity="0.8">
              <path d="M 0 200 H 120 L 180 260 H 260" />
              <path d="M 1200 200 H 1080 L 1020 260 H 940" />
              <circle cx="260" cy="260" r="4" fill="#60a5fa" />
              <circle cx="940" cy="260" r="4" fill="#60a5fa" />
            </g>
            <rect x="0" y="340" width="1200" height="4" fill="url(#modalBeamGradient)" filter="url(#modalGlow)" />
            
            {/* Desktop Banner Titles */}
            <g filter="url(#modalGlow)">
              <text x="600" y="180" textAnchor="middle" fill="url(#modalTextMetallic)" stroke="#60a5fa" strokeWidth="2.5" fontSize="82" fontWeight="900" fontFamily="sans-serif" letterSpacing="3">
                MENTOR BIGODE
              </text>
              <text x="600" y="285" textAnchor="middle" fill="url(#modalTextMetallic)" stroke="#60a5fa" strokeWidth="2" fontSize="68" fontWeight="900" fontFamily="sans-serif" letterSpacing="3">
                GERAÇÃO Z PRO
              </text>
            </g>

            <rect x="250" y="315" width="700" height="3" fill="url(#modalBeamGradient)" />
          </svg>
        </div>

        <div className="p-4 sm:p-6 pt-1 sm:pt-1 space-y-3 sm:space-y-4">
          {!isMandatoryOnboarding && (
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors z-20"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Header Icon */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-cyan-500/20 shrink-0">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-lg font-bold text-white flex items-center space-x-2">
                <span>Área do Aluno — Mentoria</span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400">
                <span className="hidden sm:inline">Digite seu Código para Acessar a Plataforma</span>
                <span className="inline sm:hidden">Digite seu código para acessar a plataforma</span>
              </p>
            </div>
          </div>

        {/* Notice Banner */}
        <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-3 sm:p-3.5 text-[11px] sm:text-xs text-cyan-200/90 leading-relaxed space-y-1">
          <div className="flex items-center space-x-1.5 font-bold text-cyan-400">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Área Restrita aos Alunos da Mentoria</span>
          </div>
          <p>
            <span className="hidden sm:inline">Insira o seu <b>Código de Acesso Exclusivo de Aluno</b> para liberar toda a plataforma e os agentes de IA.</span>
            <span className="inline sm:hidden">Insira seu <b>Código de Acesso Exclusivo de Aluno</b> para liberar toda a plataforma e os agentes de IA.</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-[11px] sm:text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                <span>Código de Acesso do Aluno:</span>
              </span>
              <span className="text-[10px] text-cyan-400 font-normal">Fornecido na mentoria</span>
            </label>
            <input
              type="text"
              placeholder="Digite seu código ex: GZ-XXXX-XXXX"
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

          <div className="flex items-center justify-end space-x-2 pt-1 sm:pt-2">
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
    </div>
  );
};


