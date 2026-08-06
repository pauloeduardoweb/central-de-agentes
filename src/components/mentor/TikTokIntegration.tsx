import React, { useState, useEffect } from 'react';
import {
  Video,
  CheckCircle2,
  AlertCircle,
  LogOut,
  RefreshCw,
  Lock,
  ExternalLink,
  ShieldCheck,
  User,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface TikTokIntegrationProps {
  studentCode: string;
}

interface ConnectionData {
  connected: boolean;
  display_name?: string;
  avatar_url?: string;
  open_id_masked?: string;
  scopes?: string;
  connected_at?: string;
}

export const TikTokIntegration: React.FC<TikTokIntegrationProps> = ({ studentCode }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);
  const [connection, setConnection] = useState<ConnectionData>({ connected: false });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
        // Clear status from URL clean without reload
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#031d2e] via-[#02131c] to-[#042133] border border-cyan-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 border border-cyan-500/40 text-cyan-400 shrink-0">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-tight">
                  Integração com TikTok
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                  Login Kit v2
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                Conecte sua conta do TikTok para vincular seu perfil externo, autenticar via OAuth 2.0 oficial e utilizar recursos do ecossistema Geração Z Pro.
              </p>
            </div>
          </div>

          <button
            onClick={fetchConnection}
            disabled={loading}
            className="self-start md:self-center px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar status</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert Banners */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 backdrop-blur-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm font-medium leading-relaxed">
            {feedback.message}
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Connection Card */}
      <div className="p-6 rounded-2xl bg-[#020d14]/90 border border-cyan-500/30 backdrop-blur-md shadow-xl">
        {loading ? (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-300">
              Verificando status da conexão TikTok...
            </p>
          </div>
        ) : connection.connected ? (
          /* State 1: CONNECTED */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-emerald-500/30">
              <div className="flex items-center gap-4">
                {connection.avatar_url ? (
                  <img
                    src={connection.avatar_url}
                    alt={connection.display_name}
                    className="w-14 h-14 rounded-full border-2 border-emerald-400 object-cover shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-md">
                    <User className="w-7 h-7" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">
                      {connection.display_name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Conta TikTok Conectada
                    </span>
                  </div>

                  {connection.open_id_masked && (
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      ID TikTok: {connection.open_id_masked}
                    </p>
                  )}

                  {connection.connected_at && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Conectado em: {new Date(connection.connected_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={handleDisconnectTikTok}
                disabled={disconnecting}
                className="px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md self-start sm:self-center"
              >
                <LogOut className="w-4 h-4" />
                <span>{disconnecting ? 'Desconectando...' : 'Desconectar TikTok'}</span>
              </button>
            </div>

            {/* Scopes & Security Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 mb-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Escopos Autorizados</span>
                </div>
                <p className="text-xs text-slate-300 font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {connection.scopes || 'user.info.basic'}
                </p>
                <p className="text-[11px] text-slate-400 mt-2">
                  Acesso limitado estritamente a informações básicas de perfil autorizadas pelo TikTok.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-400 mb-2">
                  <Lock className="w-4 h-4" />
                  <span>Segurança e Privacidade</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tokens de acesso são armazenados com criptografia no servidor. Sua senha do TikTok nunca é solicitada nem armazenada.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* State 2: DISCONNECTED */
          <div className="text-center py-8 px-2 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto shadow-lg">
              <Video className="w-8 h-8" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-lg font-bold text-white">
                Nenhuma conta do TikTok conectada
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Conecte sua conta do TikTok usando o fluxo oficial OAuth 2.0 (TikTok Login Kit) para vincular seu perfil com segurança ao Geração Z Pro.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleConnectTikTok}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all duration-200 cursor-pointer text-sm"
              >
                <Sparkles className="w-4 h-4" />
                <span>Conectar TikTok</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-4 border-t border-slate-800/80 max-w-lg mx-auto text-left">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 mb-2">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <span>Como funciona a integração?</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span>Você será redirecionado para a página oficial de autorização do TikTok.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span>O escopo solicitado é exclusivamente <strong className="text-slate-300 font-mono">user.info.basic</strong>.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span>Nenhum dado de senha é compartilhado com nossa plataforma.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span>Você pode revogar a autorização a qualquer momento neste painel.</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
