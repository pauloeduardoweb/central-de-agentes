import React, { useState, useEffect } from 'react';
import {
  Video,
  CheckCircle2,
  AlertCircle,
  Info,
  LogOut,
  RefreshCw,
  Lock,
  ExternalLink,
  ShieldCheck,
  User,
  Sparkles,
  HelpCircle,
  Activity,
  Globe2,
  KeyRound,
  X,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Check,
  Zap,
  ArrowLeft,
} from 'lucide-react';

interface TikTokIntegrationProps {
  studentCode: string;
  onBackToMentor?: () => void;
}

interface ConnectionData {
  connected: boolean;
  display_name?: string;
  avatar_url?: string;
  open_id_masked?: string;
  scopes?: string;
  connected_at?: string;
}

export const TikTokIntegration: React.FC<TikTokIntegrationProps> = ({ studentCode, onBackToMentor }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);
  const [connection, setConnection] = useState<ConnectionData>({ connected: false });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Check query params for status parameter from OAuth callback redirect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const statusParam = urlParams.get('status');
      const messageParam = urlParams.get('message');

      if (statusParam === 'success') {
        setFeedback({
          type: 'success',
          message: 'Conta do TikTok conectada com sucesso via OAuth 2.0 oficial!',
        });
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      } else if (statusParam === 'canceled' || statusParam === 'cancelled' || messageParam === 'Conexao_Cancelada') {
        setFeedback({
          type: 'info',
          message: 'Conexão com o TikTok cancelada. Nenhuma alteração foi realizada. Você pode tentar novamente quando desejar.',
        });
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      } else if (statusParam === 'error') {
        const readableMsg = messageParam
          ? decodeURIComponent(messageParam).replace(/_/g, ' ')
          : 'Falha na autorização do TikTok. Tente novamente.';
        setFeedback({
          type: 'error',
          message: `Erro na integração: ${readableMsg}`,
        });
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  const fetchConnection = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tiktok/connection', {
        headers: {
          'x-student-access-code': studentCode,
          'x-access-code': studentCode,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setConnection(data);
      } else {
        setConnection({ connected: false });
      }
    } catch (err) {
      console.error('Failed to fetch TikTok connection:', err);
      setConnection({ connected: false });
    } finally {
      setLoading(false);
      setLastChecked(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    }
  };

  useEffect(() => {
    if (studentCode) {
      fetchConnection();
    }
  }, [studentCode]);

  const handleConnectTikTok = () => {
    if (!studentCode) {
      setFeedback({
        type: 'error',
        message: 'Código de acesso do usuário não fornecido.',
      });
      return;
    }
    // Redirect to backend OAuth start endpoint with user's access code
    window.location.href = `/api/tiktok/oauth/start?code=${encodeURIComponent(studentCode)}`;
  };

  const handleDisconnectTikTok = async () => {
    if (!confirm('Deseja realmente desconectar a sua conta do TikTok?')) return;

    setDisconnecting(true);
    try {
      const res = await fetch('/api/tiktok/connection', {
        method: 'DELETE',
        headers: {
          'x-student-access-code': studentCode,
          'x-access-code': studentCode,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setConnection({ connected: false });
        setFeedback({
          type: 'success',
          message: 'Conta do TikTok desconectada com sucesso.',
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.message || 'Não foi possível desconectar a conta.',
        });
      }
    } catch (err) {
      console.error('Error disconnecting TikTok:', err);
      setFeedback({
        type: 'error',
        message: 'Erro de conexão ao tentar desconectar.',
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqItems = [
    {
      q: 'A conexão é segura?',
      a: 'Sim, totalmente segura. Utilizamos a API oficial TikTok Login Kit v2 baseada no protocolo OAuth 2.0 padrão da indústria com verificação PKCE. Suas credenciais e dados são protegidos por criptografia de ponta.',
    },
    {
      q: 'Posso desconectar quando quiser?',
      a: 'Com certeza. Ao clicar no botão "Desconectar TikTok", sua conta é desvinculada instantaneamente e os tokens de acesso associados à sua chave são revogados do nosso servidor.',
    },
    {
      q: 'Meus dados ficam protegidos?',
      a: 'Sim. Solicitamos estritamente a autorização mínima necessária para identificação do perfil (user.info.basic). Nós nunca solicitamos, temos acesso ou armazenamos sua senha do TikTok.',
    },
  ];

  const steps = [
    { num: '1', title: 'Conectar conta', desc: 'Iniciar fluxo OAuth' },
    { num: '2', title: 'Autorizar TikTok', desc: 'Permissão oficial' },
    { num: '3', title: 'Conta protegida', desc: 'Criptografia AES-256' },
    { num: '4', title: 'Integração ativa', desc: 'Acesso liberado' },
  ];

  return (
    <div className="space-y-6 w-full animate-fade-in transition-all duration-300">
      {/* 1. HERO HEADER PREMIUM */}
      <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-r from-[#031d2e] via-[#02131c] to-[#042133] border border-cyan-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-teal-500/20 to-blue-500/20 border border-cyan-400/40 text-cyan-400 shrink-0 shadow-xl shadow-cyan-500/10">
              <Video className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Integração Oficial TikTok
                </h1>
                <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-cyan-950 border border-cyan-500/40 text-cyan-300 tracking-wider shadow-sm">
                  Login Kit v2
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
                Conecte sua conta do TikTok com segurança utilizando OAuth 2.0 oficial para vincular seu perfil e utilizar recursos exclusivos no ecossistema Geração Z Pro.
              </p>

              {/* 3. Indicadores Visuais (Badges Status) */}
              <div className="flex items-center gap-2.5 flex-wrap mt-3.5 text-[11px] font-medium text-slate-300">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700/80" title="Autenticação padrão da indústria">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-slate-200">OAuth 2.0 Oficial</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700/80" title="Proteção de canal de comunicação">
                  <span className="w-2 h-2 rounded-full bg-teal-400" />
                  <span className="text-slate-200">Conexão Segura</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700/80" title="Tráfego encriptado com certificado SSL">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-slate-200">SSL</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700/80" title="Armazenamento seguro de tokens com AES-256">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span className="text-slate-200">Dados Criptografados</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 self-start md:self-center shrink-0">
            {onBackToMentor && (
              <button
                onClick={onBackToMentor}
                className="px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/30 text-xs font-bold text-cyan-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao Painel do Mentor</span>
              </button>
            )}

            <button
              onClick={fetchConnection}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 shadow-lg"
              title="Atualizar informações da conexão"
            >
              <RefreshCw className={`w-4 h-4 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Atualizando...' : 'Atualizar status'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. TIMELINE VISUAL DE ETAPAS */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>Progresso da Integração</span>
          </h3>
          {lastChecked && (
            <span className="text-[11px] text-slate-400">Última checagem: {lastChecked}</span>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 relative">
          {steps.map((step, idx) => {
            const isCompleted = connection.connected;
            const isFirstActive = idx === 0;
            const isActive = isCompleted || isFirstActive;

            return (
              <div
                key={step.num}
                className={`p-3.5 rounded-xl border transition-all duration-300 flex items-center gap-3 relative ${
                  isCompleted
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : isFirstActive
                    ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300'
                    : 'bg-slate-950/40 border-slate-800/80 text-slate-500'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 shadow-md ${
                    isCompleted
                      ? 'bg-emerald-500 text-slate-950'
                      : isFirstActive
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : step.num}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-400'}`}>
                    {step.title}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dashboard Informativo (Mini-Metrics Bar) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-500/30 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400 font-medium">Status Conexão</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${connection.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <p className={`text-xs font-bold truncate ${connection.connected ? 'text-emerald-400' : 'text-slate-400'}`}>
                {loading ? 'Verificando...' : connection.connected ? 'Ativa' : 'Não Conectada'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-500/30 shrink-0">
            <Globe2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400 font-medium">Ambiente</p>
            <p className="text-xs font-bold text-amber-300 mt-0.5 truncate">
              Sandbox / V2
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-950/60 text-teal-400 border border-teal-500/30 shrink-0">
            <KeyRound className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400 font-medium">Escopo Autorizado</p>
            <p className="text-xs font-mono font-bold text-teal-300 mt-0.5 truncate">
              user.info.basic
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-500/30 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400 font-medium">Segurança</p>
            <p className="text-xs font-bold text-indigo-300 mt-0.5 truncate">
              AES-256 + SSL
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Alert Banners */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 backdrop-blur-md transition-all duration-200 animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200 shadow-lg shadow-emerald-950/40'
              : feedback.type === 'info'
              ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-100 shadow-lg shadow-cyan-950/40'
              : 'bg-rose-950/70 border-rose-500/50 text-rose-200 shadow-lg shadow-rose-950/40'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : feedback.type === 'info' ? (
            <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm font-medium leading-relaxed">
            {feedback.message}
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. CARD CONECTADO PREMIUM / DISCONNECTED CARD */}
      <div className="p-6 rounded-2xl bg-[#020d14]/90 border border-cyan-500/30 backdrop-blur-md shadow-2xl relative overflow-hidden transition-all duration-300">
        {loading ? (
          /* SKELETON LOADING STATE */
          <div className="animate-pulse space-y-6 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center gap-4 w-full">
                <div className="w-20 h-20 rounded-full bg-slate-800 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-slate-800 rounded w-48" />
                  <div className="h-3 bg-slate-800/80 rounded w-32" />
                  <div className="h-3 bg-slate-800/60 rounded w-40" />
                </div>
              </div>
              <div className="h-9 bg-slate-800 rounded-xl w-36 shrink-0" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                <div className="h-4 bg-slate-800 rounded w-32" />
                <div className="h-8 bg-slate-800/80 rounded" />
              </div>
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                <div className="h-4 bg-slate-800 rounded w-36" />
                <div className="h-8 bg-slate-800/80 rounded" />
              </div>
            </div>
          </div>
        ) : connection.connected ? (
          /* State 1: CONNECTED PREMIUM CARD */
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 rounded-2xl bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-slate-900/95 border border-emerald-500/40 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/15 transition-all" />

              <div className="flex items-center gap-5 relative z-10">
                <div className="relative shrink-0">
                  {connection.avatar_url ? (
                    <img
                      src={connection.avatar_url}
                      alt={connection.display_name}
                      className="w-20 h-20 rounded-full border-2 border-emerald-400 object-cover shadow-xl shadow-emerald-500/20"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20">
                      <User className="w-10 h-10" />
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center shadow-md">
                    <Check className="w-3 h-3 text-slate-950 stroke-[3]" />
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-xl font-black text-white tracking-tight">
                      {connection.display_name || 'Usuário TikTok'}
                    </h3>

                    {/* Selo Conta Verificada */}
                    <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-950/90 text-emerald-300 border border-emerald-500/60 flex items-center gap-1.5 shadow-sm">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Conta verificada
                    </span>
                  </div>

                  {connection.open_id_masked && (
                    <p className="text-xs text-slate-300 mt-1.5 font-mono flex items-center gap-2">
                      <span className="text-slate-400 font-sans">ID do TikTok:</span>
                      <span className="bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800 text-slate-200">
                        {connection.open_id_masked}
                      </span>
                    </p>
                  )}

                  {connection.connected_at && (
                    <p className="text-xs text-slate-400 mt-1">
                      Conectado em: {new Date(connection.connected_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={handleDisconnectTikTok}
                disabled={disconnecting}
                className="px-4 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 hover:text-white text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg hover:shadow-rose-900/30 active:scale-95 self-start sm:self-center shrink-0"
              >
                <LogOut className="w-4 h-4" />
                <span>{disconnecting ? 'Desconectando...' : 'Desconectar TikTok'}</span>
              </button>
            </div>

            {/* Scopes & Security Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Escopos Autorizados</span>
                </div>
                <p className="text-xs text-slate-200 font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {connection.scopes || 'user.info.basic'}
                </p>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  Acesso limitado estritamente a informações básicas de perfil autorizadas pelo TikTok Login Kit v2.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-400 mb-2">
                  <Lock className="w-4 h-4" />
                  <span>Segurança e Privacidade</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tokens de acesso são armazenados com criptografia AES-256 no servidor. Sua senha do TikTok nunca é solicitada nem armazenada.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* State 2: DISCONNECTED CARD */
          <div className="text-center py-8 px-2 space-y-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-teal-500/20 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mx-auto shadow-xl shadow-cyan-500/10">
              <Video className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Nenhuma conta do TikTok conectada
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Conecte sua conta do TikTok usando o fluxo oficial OAuth 2.0 (TikTok Login Kit) para vincular seu perfil com segurança ao Geração Z Pro.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleConnectTikTok}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-blue-600 hover:from-cyan-400 hover:via-teal-400 hover:to-blue-500 text-white font-black shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200 cursor-pointer text-sm active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-cyan-200" />
                <span>Conectar TikTok</span>
                <ExternalLink className="w-4 h-4 text-cyan-200" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. SEÇÃO: SOBRE ESTA INTEGRAÇÃO */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white tracking-tight">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>Sobre esta Integração</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
            <p className="font-bold text-cyan-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              Protocolo OAuth 2.0
            </p>
            <p className="text-slate-400">
              A autenticação é feita diretamente na infraestrutura segura do TikTok. Você concede permissão e retorna com segurança para a nossa plataforma.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
            <p className="font-bold text-teal-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-teal-400" />
              Privacidade Garantida
            </p>
            <p className="text-slate-400">
              Solicitamos apenas informações públicas básicas de perfil (<code className="text-teal-300">user.info.basic</code>). Sua senha nunca é acessada ou gravada.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
            <p className="font-bold text-indigo-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Isolamento por Aluno
            </p>
            <p className="text-slate-400">
              Cada chave de acesso possui sua própria conexão TikTok independente e encriptada com chave exclusiva no servidor.
            </p>
          </div>
        </div>
      </div>

      {/* 5. SEÇÃO: PERGUNTAS FREQUENTES (FAQ ACCORDION) */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white tracking-tight">
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span>Perguntas Frequentes (FAQ)</span>
        </div>

        <div className="space-y-2.5">
          {faqItems.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="rounded-xl border border-slate-800/80 bg-slate-950/50 overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-4 py-3 text-left font-semibold text-xs text-slate-200 hover:text-white flex items-center justify-between gap-3 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                    {item.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-cyan-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-3.5 pt-1 text-xs text-slate-300 border-t border-slate-800/50 leading-relaxed bg-slate-900/30 animate-fade-in">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
