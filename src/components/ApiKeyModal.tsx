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
  const [authError, setAuthError] = useState<{ title?: string | null; message: string } | null>(null);
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
      setAuthError({
        title: null,
        message: 'Por favor, digite o Código de Acesso do Aluno (fornecido na mentoria).',
      });
      return;
    }

    if (!isValidStudentCode(cleanCode)) {
      setAuthError({
        title: null,
        message: 'Código de acesso inválido. Verifique o código informado e tente novamente.',
      });
      return;
    }

    setLoading(true);
    setAuthError(null);

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
      } catch {
        data = {};
      }

      const errorCode = String(
        data?.error ??
        data?.code ??
        data?.errorCode ??
        data?.accessStatus ??
        ''
      ).trim().toUpperCase();

      // 1. KEY_SUSPENDED Check (HTTP 423 or KEY_SUSPENDED error code)
      const isSuspended =
        res.status === 423 ||
        errorCode === 'KEY_SUSPENDED' ||
        errorCode === 'SUSPENDED' ||
        String(data?.accessStatus || '').toUpperCase() === 'SUSPENDED' ||
        String(data?.error || '').toUpperCase().includes('SUSPEND') ||
        String(data?.title || '').toLowerCase().includes('suspenso') ||
        String(data?.message || '').toLowerCase().includes('suspens');

      if (isSuspended) {
        setAuthError({
          title: data?.title || 'Acesso temporariamente suspenso',
          message:
            data?.message ||
            'Sua chave de acesso está temporariamente suspensa pelo Mentor. Entre em contato com o suporte caso tenha dúvidas.',
        });
        setLoading(false);
        return;
      }

      // 2. KEY_BANNED Check (HTTP 403 or KEY_BANNED error code)
      const isBanned =
        res.status === 403 ||
        errorCode === 'KEY_BANNED' ||
        errorCode === 'BANNED' ||
        String(data?.accessStatus || '').toUpperCase() === 'BANNED' ||
        String(data?.title || '').toLowerCase().includes('banid') ||
        String(data?.message || '').toLowerCase().includes('banid');

      if (isBanned) {
        setAuthError({
          title: data?.title || 'Acesso permanentemente bloqueado',
          message:
            data?.message ||
            'Esta chave de acesso foi banida pelo Mentor e não pode mais ser utilizada. Caso acredite que isso ocorreu por engano, entre em contato com o suporte da Mentoria Geração Z Pro.',
        });
        setLoading(false);
        return;
      }

      // 3. INVALID_ACCESS_CODE Check
      if (errorCode === 'INVALID_ACCESS_CODE' || errorCode === 'INVALID_CODE' || res.status === 401) {
        setAuthError({
          title: null,
          message:
            data?.message ||
            'Código de acesso inválido. Verifique o código informado e tente novamente.',
        });
        setLoading(false);
        return;
      }

      // 4. SESSION_ALREADY_ACTIVE Check
      if (errorCode === 'SESSION_ALREADY_ACTIVE' || res.status === 409) {
        setAuthError({
          title: null,
          message:
            data?.message ||
            'Esta chave já está sendo utilizada em outro dispositivo. Encerre a sessão anterior para continuar.',
        });
        setLoading(false);
        return;
      }

      if (res.status >= 500 || errorCode === 'SESSION_DATABASE_ERROR') {
        setAuthError({
          title: null,
          message:
            'Não foi possível conectar ao servidor de autenticação. Tente novamente em alguns instantes.',
        });
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setAuthError({
          title: data?.title || null,
          message:
            data?.message ||
            'A autenticação foi recusada pelo servidor.',
        });
        setLoading(false);
        return;
      }

      const returnedSessionId = data.sessionId || '';
      onSave('STUDENT_AUTHORIZED', cleanCode, returnedSessionId);
    } catch (err: any) {
      // Real fetch/network failure or client Exception
      setAuthError({
        title: null,
        message: 'Não foi possível conectar ao servidor de autenticação. Tente novamente em alguns instantes.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-end sm:justify-center p-3 sm:p-6 pt-2 sm:pt-28 pb-2 sm:pb-8 animate-in fade-in duration-200 overflow-hidden select-none login-bg-responsive"
    >
      <style>{`
        .login-bg-responsive {
          min-height: 100vh;
          background-repeat: no-repeat;
          background-color: #020617;
          filter: none !important;
          backdrop-filter: none !important;
          image-rendering: auto;
        }
        @keyframes speechBubbleGlow {
          0%, 100% {
            box-shadow: 0 0 15px rgba(56, 189, 248, 0.3), inset 0 0 8px rgba(56, 189, 248, 0.1);
            border-color: rgba(56, 189, 248, 0.45);
          }
          50% {
            box-shadow: 0 0 25px rgba(56, 189, 248, 0.65), inset 0 0 15px rgba(56, 189, 248, 0.2);
            border-color: rgba(56, 189, 248, 0.85);
          }
        }
        .speech-bubble-glow {
          animation: speechBubbleGlow 4s ease-in-out infinite;
        }
        @media screen and (max-width: 767px) {
          .login-bg-responsive {
            background-image: url('/assets/login/login-mobile.png'), url('https://i.postimg.cc/xjSzC84j/Remove-login-panel-keep-character-202607291547.jpg');
            background-size: cover;
            background-position: center -78px;
            background-repeat: no-repeat;
            background-color: #020617;
            background-attachment: scroll;
            filter: none !important;
            backdrop-filter: none !important;
            image-rendering: auto;
          }
          .login-panel-mobile {
            margin-top: auto !important;
            margin-bottom: 48px !important;
          }
        }
        @media screen and (min-width: 768px) and (max-width: 1199px) {
          .login-bg-responsive {
            background-image: url('/assets/login/login-desktop.png'), url('https://i.postimg.cc/xjSzC84j/Remove-login-panel-keep-character-202607291547.jpg');
            background-size: 100% auto, cover;
            background-position: center -165px, center -40px;
            background-repeat: no-repeat;
          }
          .glass-card-responsive {
            background-color: rgba(3, 13, 34, 0.5) !important;
            border-color: rgba(6, 182, 212, 0.4) !important;
            backdrop-filter: none !important;
          }
          .speech-bubble-desktop-tablet {
            display: none !important;
          }
          .login-panel-desktop {
            margin-right: auto !important;
            margin-left: auto !important;
            transform: translateY(130px) !important;
          }
        }
        @media screen and (min-width: 1200px) {
          .login-bg-responsive {
            background-image: url('/assets/login/login-desktop.png'), url('https://i.postimg.cc/jSHh9RzY/CAPA.png');
            background-size: cover;
            background-position: center center;
            background-repeat: no-repeat;
            filter: none !important;
            backdrop-filter: none !important;
          }
          .speech-bubble-desktop-tablet {
            left: calc(50% + 125px) !important;
            top: calc(50% - 50px) !important;
            transform: none !important;
            max-width: 320px !important;
            width: 320px !important;
          }
          .speech-bubble-desktop-tablet p {
            text-align: left !important;
          }
          .speech-bubble-desktop-tablet .arrow-outer,
          .speech-bubble-desktop-tablet .arrow-inner {
            display: block !important;
            top: 48% !important;
          }
          .login-panel-desktop {
            margin-right: auto !important;
            margin-left: 13vw !important;
            transform: translateY(20px) !important;
          }
        }
      `}</style>

      {/* Minimal overlay (5%) without blur */}
      <div className="absolute inset-0 bg-black/5 pointer-events-none z-0" />

      {/* Speech Bubble - Desktop / Tablet */}
      <div className="hidden sm:flex absolute speech-bubble-desktop-tablet z-20 pointer-events-none animate-in fade-in zoom-in-95 duration-500">
        <div className="relative bg-[#030d22]/90 backdrop-blur-md border border-cyan-400/60 rounded-2xl p-3.5 sm:p-4 shadow-[0_0_25px_rgba(6,182,212,0.35)] text-slate-100 speech-bubble-glow w-full">
          {/* Arrow pointing right towards character's mouth */}
          <div className="arrow-outer absolute -right-2.5 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[8px] border-y-transparent border-l-[10px] border-l-cyan-400/70 filter drop-shadow-[2px_0_4px_rgba(6,182,212,0.5)]" />
          <div className="arrow-inner absolute -right-[8px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[7px] border-y-transparent border-l-[9px] border-l-[#030d22]" />

          <p className="text-xs sm:text-sm leading-snug font-medium text-cyan-100/90">
            <span className="font-extrabold text-white text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-300 block mb-0.5">
              🚀 Seu próximo nível começa agora.
            </span>
            Faça login e tenha acesso aos agentes <br />
            que podem acelerar seus resultados.
          </p>
        </div>
      </div>

      {/* Speech Bubble - Mobile */}
      <div className="block sm:hidden absolute top-[15%] left-3 z-20 w-[58%] max-w-[210px] pointer-events-none animate-in fade-in slide-in-from-left-2 duration-500">
        <div className="relative bg-[#030d22]/90 backdrop-blur-md border border-cyan-400/60 rounded-2xl p-2.5 shadow-[0_0_20px_rgba(6,182,212,0.35)] text-slate-100 speech-bubble-glow">
          {/* Arrow pointing right towards character's mouth */}
          <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-l-[8px] border-l-cyan-400/70 filter drop-shadow-[2px_0_4px_rgba(6,182,212,0.5)]" />
          <div className="absolute -right-[7px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent border-l-[7px] border-l-[#030d22]" />

          <p className="text-[10px] leading-snug font-medium text-cyan-100/90">
            <span className="font-extrabold text-white text-[11px] text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-300 mr-1">
              🚀 Seu próximo nível começa agora.
            </span>
            Faça login e tenha acesso aos agentes que podem acelerar seus resultados.
          </p>
        </div>
      </div>

      <div className="bg-[#030b18] border-2 border-blue-500/50 rounded-2xl w-[82%] sm:w-full max-w-[268px] sm:max-w-md overflow-hidden shadow-[0_0_50px_rgba(37,99,235,0.4)] relative z-10 text-slate-100 transform translate-y-0 sm:translate-y-8 transition-all duration-300 login-panel-mobile login-panel-desktop max-h-[85vh] overflow-y-auto">
        
        {/* High Tech Cover Banner */}
        <div className="relative w-full aspect-[16/4.5] sm:aspect-[16/6] bg-[#020713] overflow-hidden border-b border-blue-500/40">
          <svg className="w-full h-full object-cover" viewBox="0 0 1200 450" fill="none">
            <defs>
              <radialGradient id="modalBgGlow" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="#082046" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#030c1e" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#01040a" stopOpacity="1" />
              </radialGradient>
              <linearGradient id="modalNaturalText" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7dd3fc" />
                <stop offset="45%" stopColor="#38bdf8" />
                <stop offset="85%" stopColor="#1d4ed8" />
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
            
            {/* Banner Title - Impactful Natural Blue Display Style */}
            <g>
              {/* Soft Dark Drop Shadow */}
              <text x="603" y="270" textAnchor="middle" fill="#010612" stroke="#010612" strokeWidth="12" fontSize="135" fontWeight="900" fontFamily="'Impact', 'Arial Black', 'Montserrat', sans-serif" letterSpacing="5">
                GERAÇÃO Z PRO
              </text>
              {/* Main Crisp Natural Metallic Blue Text */}
              <text x="600" y="265" textAnchor="middle" fill="url(#modalNaturalText)" stroke="#1d4ed8" strokeWidth="2.5" fontSize="135" fontWeight="900" fontFamily="'Impact', 'Arial Black', 'Montserrat', sans-serif" letterSpacing="5">
                GERAÇÃO Z PRO
              </text>
            </g>

            <rect x="250" y="315" width="700" height="3" fill="url(#modalBeamGradient)" />
          </svg>
        </div>

        <div className="p-3.5 sm:p-6 pt-1 sm:pt-1 space-y-2.5 sm:space-y-4">
          {!isMandatoryOnboarding && (
            <button
              onClick={onClose}
              className="absolute top-2.5 right-2.5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors z-20"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}

          {/* Header Icon */}
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-cyan-500/20 shrink-0">
              <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xs sm:text-lg font-bold text-white flex items-center space-x-1.5">
                <span>Área do Aluno — Mentoria</span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400">
                <span className="hidden sm:inline">Digite seu Código para Acessar a Plataforma</span>
                <span className="inline sm:hidden">Digite seu código para acessar a plataforma</span>
              </p>
            </div>
          </div>

        {/* Notice Banner */}
        <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-2.5 sm:p-3.5 text-[10.5px] sm:text-xs text-cyan-200/90 leading-relaxed space-y-1">
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
        <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-4">
          <div>
            <label className="block text-[10.5px] sm:text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                <span>Código de Acesso do Aluno:</span>
              </span>
              <span className="text-[9.5px] text-cyan-400 font-normal">Fornecido na mentoria</span>
            </label>
            <input
              type="text"
              placeholder="Digite seu código ex: GZ-XXXX-XXXX"
              value={accessCode}
              onChange={(e) => {
                setAccessCode(e.target.value);
                setAuthError(null);
              }}
              autoFocus
              className="w-full px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-[#020d14] border border-amber-500/40 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {authError && (
            <div
              className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/60 text-rose-200 text-xs animate-in fade-in duration-200 shadow-lg shadow-rose-950/50 space-y-1"
            >
              {authError.title ? (
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 font-bold text-rose-300 text-xs sm:text-sm">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{authError.title}</span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-rose-200/90 leading-relaxed pl-6">
                    {authError.message}
                  </p>
                </div>
              ) : (
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] sm:text-xs text-rose-200 font-medium leading-relaxed">{authError.message}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-0.5 sm:pt-2 pb-0.5">
            {!isMandatoryOnboarding && (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2.5 sm:px-6 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
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


