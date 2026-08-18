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
  BadgeCheck,
  Share2,
  Play,
  Film,
  Clock,
  Calendar,
} from 'lucide-react';

interface TikTokIntegrationProps {
  studentCode: string;
  onBackToMentor?: () => void;
  onBack?: () => void;
  backButtonLabel?: string;
}

export interface TikTokVideoItem {
  id: string;
  title?: string;
  video_description?: string;
  duration?: number;
  cover_image_url?: string;
  embed_link?: string;
  create_time?: number;
  share_url?: string;
}

interface ConnectionData {
  connected: boolean;
  display_name?: string;
  username?: string;
  bio_description?: string;
  avatar_url?: string;
  avatar_large_url?: string;
  profile_deep_link?: string;
  profile_web_link?: string;
  is_verified?: boolean;
  open_id_masked?: string;
  scopes?: string;
  connected_at?: string;
  updated_at?: string;
  environment?: 'production' | 'sandbox';
}

/**
 * Resolves official TikTok profile URL adhering to strict priority rules:
 * 1. connection.profile_deep_link (fonte oficial prioritária)
 * 2. connection.profile_web_link
 * 3. se nenhum existir: https://www.tiktok.com/@{cleanUsername}
 *
 * Sanitização:
 * - remove ?source=ad_review ou query parameters indesejados que quebram o TikTok Web no desktop
 * - nunca adiciona ?source=ad_review ou qualquer outro parâmetro manualmente
 * - remove @ inicial, aplica trim e preserva pontos (.) e underscores (_) no username
 */
export function resolveTikTokProfileUrl(conn?: {
  profile_deep_link?: string | null;
  profile_web_link?: string | null;
  username?: string | null;
}): string | null {
  if (!conn) return null;

  const sanitizeUrl = (url: string): string => {
    try {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        const parsed = new URL(url);
        parsed.searchParams.delete('source');
        const search = parsed.searchParams.toString();
        return `${parsed.origin}${parsed.pathname}${search ? '?' + search : ''}${parsed.hash}`;
      }
      return url.replace(/[?&]source=ad_review(&|$)/g, '$1').replace(/[?&]$/, '').trim();
    } catch {
      return url.replace(/[?&]source=ad_review(&|$)/g, '$1').replace(/[?&]$/, '').trim();
    }
  };

  // 1. connection.profile_deep_link (prioridade oficial)
  if (conn.profile_deep_link && typeof conn.profile_deep_link === 'string' && conn.profile_deep_link.trim()) {
    const sanitized = sanitizeUrl(conn.profile_deep_link.trim());
    if (sanitized) return sanitized;
  }

  // 2. connection.profile_web_link
  if (conn.profile_web_link && typeof conn.profile_web_link === 'string' && conn.profile_web_link.trim()) {
    const sanitized = sanitizeUrl(conn.profile_web_link.trim());
    if (sanitized) return sanitized;
  }

  // 3. Fallback por username (limpo, sem @ inicial, preservando pontos e underscores)
  if (conn.username && typeof conn.username === 'string' && conn.username.trim()) {
    const cleanUser = conn.username.trim().replace(/^@+/, '').split('?')[0].split('#')[0].trim();
    if (cleanUser) {
      return `https://www.tiktok.com/@${cleanUser}`;
    }
  }

  return null;
}

export const TikTokIntegration: React.FC<TikTokIntegrationProps> = ({
  studentCode,
  onBackToMentor,
  onBack,
  backButtonLabel,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [syncingProfile, setSyncingProfile] = useState<boolean>(false);
  const [disconnecting, setDisconnecting] = useState<boolean>(false);
  const [connection, setConnection] = useState<ConnectionData>({ connected: false });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Videos state
  const [videos, setVideos] = useState<TikTokVideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState<boolean>(false);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [requiresVideoReauth, setRequiresVideoReauth] = useState<boolean>(false);
  const [activeEmbedModal, setActiveEmbedModal] = useState<TikTokVideoItem | null>(null);

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

  const getAuthHeaders = (): Record<string, string> => {
    const activeSession = typeof window !== 'undefined' ? localStorage.getItem('user_session_id') || '' : '';
    const headers: Record<string, string> = {};
    if (activeSession) {
      headers['x-session-id'] = activeSession;
    }
    return headers;
  };

  const formatDuration = (seconds?: number): string => {
    if (typeof seconds !== 'number' || isNaN(seconds) || seconds <= 0) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCreateTime = (timestampSeconds?: number): string => {
    if (!timestampSeconds) return '';
    try {
      const d = new Date(timestampSeconds * 1000);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const fetchVideos = async () => {
    setLoadingVideos(true);
    setVideosError(null);
    setRequiresVideoReauth(false);

    try {
      const res = await fetch('/api/tiktok/videos', {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'same-origin',
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setVideos(Array.isArray(data.videos) ? data.videos : []);
        if (data.requires_reauth) {
          setRequiresVideoReauth(true);
        }
      } else {
        if (data.error === 'SCOPE_REQUIRED' || data.requires_reauth) {
          setRequiresVideoReauth(true);
          setVideosError(data.message || 'Permissão para vídeos ainda não autorizada.');
        } else {
          setVideosError(data.message || 'Não foi possível carregar seus vídeos agora. Tente novamente.');
        }
        setVideos([]);
      }
    } catch (err) {
      console.error('Error fetching TikTok videos:', err);
      setVideosError('Não foi possível carregar seus vídeos agora. Tente novamente.');
      setVideos([]);
    } finally {
      setLoadingVideos(false);
    }
  };

  const fetchConnection = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tiktok/connection', {
        headers: getAuthHeaders(),
        credentials: 'same-origin',
      });

      if (res.ok) {
        const data = await res.json();
        setConnection(data);
        if (data.connected && data.scopes && data.scopes.includes('video.list')) {
          fetchVideos();
        }
      } else {
        setConnection({ connected: false });
        setVideos([]);
      }
    } catch (err) {
      console.error('Failed to fetch TikTok connection:', err);
      setConnection({ connected: false });
      setVideos([]);
    } finally {
      setLoading(false);
      setLastChecked(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    }
  };

  useEffect(() => {
    fetchConnection();
  }, [studentCode]);

  const handleConnectTikTok = async () => {
    const activeSession = typeof window !== 'undefined' ? localStorage.getItem('user_session_id') || '' : '';

    // Set authenticated session cookie before navigation to authorize OAuth start endpoint
    if (typeof document !== 'undefined' && activeSession) {
      document.cookie = `tiktok_auth_session=${encodeURIComponent(activeSession)}; path=/; max-age=3600; SameSite=Lax`;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/tiktok/oauth/prepare', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'same-origin',
      });

      const data = await res.json();
      if (res.ok && data.success && data.authUrl) {
        window.location.href = data.authUrl;
        return;
      } else {
        setFeedback({
          type: 'error',
          message: data.message || 'Falha ao iniciar conexão com o TikTok. Verifique sua autenticação.',
        });
        setLoading(false);
      }
    } catch (err) {
      console.error('Error initiating TikTok OAuth prepare:', err);
      window.location.href = '/api/tiktok/oauth/start';
    }
  };

  const handleSyncProfile = async () => {
    if (syncingProfile) return;
    setSyncingProfile(true);
    try {
      const res = await fetch('/api/tiktok/refresh-profile', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'same-origin',
      });

      const data = await res.json();
      if (res.ok && data.success && data.connection) {
        setConnection(data.connection);
        if (data.connection.connected && data.connection.scopes && data.connection.scopes.includes('video.list')) {
          fetchVideos();
        }
        setFeedback({
          type: 'success',
          message: 'Dados do perfil do TikTok atualizados com sucesso!',
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.message || 'Não foi possível atualizar os dados do TikTok.',
        });
      }
    } catch (err) {
      console.error('Error syncing TikTok profile:', err);
      setFeedback({
        type: 'error',
        message: 'Erro de conexão ao sincronizar perfil do TikTok.',
      });
    } finally {
      setSyncingProfile(false);
      setLastChecked(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    }
  };

  const handleDisconnectTikTok = async () => {
    if (!confirm('Deseja realmente desconectar a sua conta do TikTok?')) return;

    setDisconnecting(true);
    try {
      const res = await fetch('/api/tiktok/connection', {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'same-origin',
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setConnection({ connected: false });
        setVideos([]);
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
      q: 'Quais dados são solicitados?',
      a: `Solicitamos estritamente as permissões aprovadas ${connection.environment === 'sandbox' ? 'em sandbox' : 'em produção'} pelo TikTok Developers: user.info.basic (nome de exibição, avatar e identificador), user.info.profile (nome de usuário @, biografia pública e verificação) e video.list (listagem dos seus vídeos públicos recentes). Nós nunca temos acesso a senhas ou dados confidenciais.`,
    },
    {
      q: 'Posso desconectar quando quiser?',
      a: 'Com certeza. Ao clicar no botão "Desconectar TikTok", sua conta é desvinculada instantaneamente e os tokens de acesso associados à sua chave são revogados do nosso servidor.',
    },
  ];

  const steps = [
    { num: '1', title: 'Conectar conta', desc: 'Iniciar fluxo OAuth' },
    { num: '2', title: 'Autorizar TikTok', desc: 'Permissões oficiais' },
    { num: '3', title: 'Conta protegida', desc: 'Criptografia AES-256' },
    { num: '4', title: 'Perfil integrado', desc: 'Dados sincronizados' },
  ];

  const hasProfileScope = Boolean(connection.scopes && connection.scopes.includes('user.info.profile'));
  const hasVideoListScope = Boolean(connection.scopes && connection.scopes.includes('video.list'));
  const isSandbox = connection.environment === 'sandbox';
  const isProduction = connection.environment === 'production';
  const environmentDisplay = connection.environment === 'sandbox'
    ? 'Sandbox / V2'
    : connection.environment === 'production'
    ? 'Produção / V2'
    : 'Carregando...';
  const permissionsDescText = connection.environment === 'sandbox'
    ? 'Permissões oficiais em sandbox'
    : connection.environment === 'production'
    ? 'Permissões oficiais em produção'
    : 'Permissões oficiais';
  const profileUrl = resolveTikTokProfileUrl(connection);
  const avatarSrc = connection.avatar_large_url || connection.avatar_url;

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

              {/* Badges Status */}
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
            {(onBack || onBackToMentor) && (
              <button
                onClick={onBack || onBackToMentor}
                className="px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/30 text-xs font-bold text-cyan-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{backButtonLabel || (onBackToMentor ? 'Voltar ao Painel do Mentor' : 'Voltar à Central de Agentes')}</span>
              </button>
            )}

            <button
              onClick={fetchConnection}
              disabled={loading || syncingProfile}
              className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95 shadow-lg"
              title="Atualizar status da conexão"
            >
              <RefreshCw className={`w-4 h-4 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Verificando...' : 'Atualizar status'}</span>
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
          <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 shrink-0">
            <Globe2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400 font-medium">Ambiente</p>
            <p className="text-xs font-bold text-emerald-300 mt-0.5 truncate flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${!connection.environment ? 'bg-slate-400 animate-pulse' : 'bg-emerald-400'}`} />
              {environmentDisplay}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-sm flex items-center gap-3">
          <div className="p-2 rounded-lg bg-teal-950/60 text-teal-400 border border-teal-500/30 shrink-0">
            <KeyRound className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-400 font-medium">Escopos Oficiais</p>
            <p className="text-xs font-mono font-bold text-teal-300 mt-0.5 truncate" title={connection.scopes || 'user.info.basic, user.info.profile'}>
              {connection.scopes || 'user.info.basic, user.info.profile'}
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

      {/* Reauthorization Alert Banner if user only has legacy basic scope */}
      {connection.connected && !hasProfileScope && (
        <div className="p-4 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-blue-950/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md shadow-xl animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-cyan-200">Novas informações de perfil estão disponíveis!</p>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                Os escopos oficiais <code className="text-cyan-300 bg-slate-950 px-1.5 py-0.5 rounded text-[11px]">user.info.profile</code> foram aprovados em {isSandbox ? 'sandbox' : 'produção'}. Atualize sua autorização para sincronizar @username, biografia e selo de verificação.
              </p>
            </div>
          </div>
          <button
            onClick={handleConnectTikTok}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-md hover:shadow-cyan-500/30 active:scale-95 self-start sm:self-center"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Atualizar autorização TikTok</span>
          </button>
        </div>
      )}

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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 p-6 rounded-2xl bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-slate-900/95 border border-emerald-500/40 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/15 transition-all" />

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10">
                <div className="relative shrink-0">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={connection.display_name || 'TikTok Avatar'}
                      className="w-20 h-20 rounded-full border-2 border-emerald-400 object-cover shadow-xl shadow-emerald-500/20"
                      referrerPolicy="no-referrer"
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

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-xl font-black text-white tracking-tight">
                      {connection.display_name || 'Usuário TikTok'}
                    </h3>

                    {/* Username Pill */}
                    {connection.username && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-slate-800 text-cyan-300 border border-slate-700">
                        @{connection.username}
                      </span>
                    )}

                    {/* Selo Conta Verificada */}
                    {connection.is_verified && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-cyan-950/90 text-cyan-300 border border-cyan-500/60 flex items-center gap-1 shadow-sm">
                        <BadgeCheck className="w-3.5 h-3.5 text-cyan-400" />
                        Conta verificada
                      </span>
                    )}
                  </div>

                  {/* Bio Description if available */}
                  {connection.bio_description && (
                    <p className="text-xs text-slate-300 max-w-xl line-clamp-2 leading-relaxed bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                      {connection.bio_description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 flex-wrap text-xs text-slate-400 pt-0.5">
                    {connection.open_id_masked && (
                      <span className="font-mono flex items-center gap-1.5">
                        <span className="text-slate-400 font-sans">ID:</span>
                        <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-200">
                          {connection.open_id_masked}
                        </span>
                      </span>
                    )}

                    {connection.connected_at && (
                      <span>
                        Conectado em: {new Date(connection.connected_at).toLocaleString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-2.5 relative z-10 self-start md:self-center shrink-0">
                {profileUrl && (
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95"
                  >
                    <span>Abrir no TikTok</span>
                    <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  </a>
                )}

                <button
                  onClick={handleSyncProfile}
                  disabled={syncingProfile}
                  className="px-3.5 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md active:scale-95"
                  title="Buscar dados atualizados do TikTok"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${syncingProfile ? 'animate-spin' : ''}`} />
                  <span>{syncingProfile ? 'Atualizando...' : 'Atualizar dados'}</span>
                </button>

                <button
                  onClick={handleDisconnectTikTok}
                  disabled={disconnecting}
                  className="px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 hover:text-white text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg hover:shadow-rose-900/30 active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{disconnecting ? 'Desconectando...' : 'Desconectar'}</span>
                </button>
              </div>
            </div>

            {/* Scopes & Security Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Escopos Autorizados</span>
                  </div>
                  {hasProfileScope && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                      Completo
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-200 font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {connection.scopes || 'user.info.basic, user.info.profile'}
                </p>
                <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                  {permissionsDescText}: identificação pública básica (<code className="text-cyan-300">user.info.basic</code>) e perfil (<code className="text-teal-300">user.info.profile</code>).
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
                <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Isolamento estrito por chave de aluno</span>
                </div>
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

      {/* 5. SEÇÃO: MEUS VÍDEOS RECENTES (QUANDO CONECTADO) */}
      {connection.connected && (
        <div className="p-6 rounded-2xl bg-[#020d14]/90 border border-cyan-500/30 backdrop-blur-md shadow-2xl space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner">
                <Film className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Meus vídeos recentes</span>
                  {hasVideoListScope && videos.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {videos.length} {videos.length === 1 ? 'vídeo' : 'vídeos'}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Vídeos públicos recentes publicados na sua própria conta TikTok conectada
                </p>
              </div>
            </div>

            {hasVideoListScope && (
              <button
                onClick={fetchVideos}
                disabled={loadingVideos}
                className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/40 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer self-start sm:self-center disabled:opacity-50 shadow-sm active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loadingVideos ? 'animate-spin' : ''}`} />
                <span>{loadingVideos ? 'Carregando vídeos...' : 'Atualizar vídeos'}</span>
              </button>
            )}
          </div>

          {/* Estado 1: Permissão video.list não autorizada */}
          {!hasVideoListScope ? (
            <div className="p-6 rounded-xl bg-gradient-to-br from-amber-950/30 via-slate-950/70 to-slate-900/40 border border-amber-500/30 text-center space-y-4 py-8">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
                <Lock className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h4 className="text-sm font-bold text-amber-200">
                  Permissão para vídeos ainda não autorizada
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Autorize o acesso aos seus vídeos públicos para visualizar seus conteúdos no Geração Z Pro.
                </p>
              </div>
              <button
                onClick={handleConnectTikTok}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-950/40 transition-all cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Atualizar autorização TikTok</span>
              </button>
            </div>
          ) : loadingVideos ? (
            /* Estado 2: Carregando vídeos */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 py-2">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 space-y-3 animate-pulse">
                  <div className="aspect-[9/16] max-h-56 bg-slate-800 rounded-lg w-full" />
                  <div className="h-3.5 bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-800/60 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : videosError ? (
            /* Estado 3: Erro temporário / Reauth */
            <div className="p-6 rounded-xl bg-rose-950/30 border border-rose-500/30 text-center space-y-4 py-8">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <p className="text-xs text-rose-200 font-medium leading-relaxed">
                  {videosError}
                </p>
              </div>
              {requiresVideoReauth ? (
                <button
                  onClick={handleConnectTikTok}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Atualizar autorização TikTok</span>
                </button>
              ) : (
                <button
                  onClick={fetchVideos}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Tentar novamente</span>
                </button>
              )}
            </div>
          ) : videos.length === 0 ? (
            /* Estado 4: Nenhum vídeo público */
            <div className="p-8 rounded-xl bg-slate-950/50 border border-slate-800 text-center space-y-3 py-10">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Film className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <p className="text-sm font-semibold text-slate-300">
                  Esta conta ainda não possui vídeos públicos disponíveis.
                </p>
                <p className="text-xs text-slate-500">
                  Publique vídeos públicos no TikTok e clique em "Atualizar vídeos" para visualizá-los aqui.
                </p>
              </div>
            </div>
          ) : (
            /* Estado 5: Grid de vídeos responsivo */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="group rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 transition-all duration-300 flex flex-col overflow-hidden shadow-lg hover:shadow-cyan-950/30 relative"
                >
                  {/* Capa com overlay e duração */}
                  <div className="relative aspect-[9/16] max-h-64 sm:max-h-72 w-full bg-slate-900 overflow-hidden">
                    {video.cover_image_url ? (
                      <img
                        src={video.cover_image_url}
                        alt={video.title || video.video_description || 'Capa do vídeo'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2 bg-gradient-to-b from-slate-900 to-slate-950">
                        <Film className="w-10 h-10 opacity-50" />
                        <span className="text-[11px] text-slate-500">Sem capa disponível</span>
                      </div>
                    )}

                    {/* Badges de sobreposição: Duração e Data */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30 pointer-events-none" />

                    {typeof video.duration === 'number' && video.duration > 0 ? (
                      <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[11px] font-mono font-bold text-white border border-white/10 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>{formatDuration(video.duration)}</span>
                      </div>
                    ) : null}

                    {video.create_time ? (
                      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-[10px] font-medium text-slate-300 border border-white/10 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-cyan-400" />
                        <span>{formatCreateTime(video.create_time)}</span>
                      </div>
                    ) : null}

                    {/* Botão Play rápido central no hover */}
                    {video.embed_link && (
                      <button
                        onClick={() => setActiveEmbedModal(video)}
                        className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-cyan-500/90 hover:bg-cyan-400 text-slate-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 transform scale-90 group-hover:scale-100 shadow-xl cursor-pointer"
                        title="Assistir no player"
                      >
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </button>
                    )}
                  </div>

                  {/* Informações do vídeo */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between gap-3 bg-gradient-to-b from-slate-950 to-[#020d14]">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-white line-clamp-2 leading-snug" title={video.video_description || video.title}>
                        {video.video_description || video.title || 'Vídeo publicado no TikTok'}
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                      {video.embed_link && (
                        <button
                          onClick={() => setActiveEmbedModal(video)}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Assistir</span>
                        </button>
                      )}

                      {video.share_url && (
                        <a
                          href={video.share_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 hover:border-cyan-500/40 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
                            video.embed_link ? '' : 'flex-1'
                          }`}
                          title="Abrir diretamente no TikTok"
                        >
                          <span>Assistir no TikTok</span>
                          <ExternalLink className="w-3 h-3 text-cyan-400" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Player Embed Oficial TikTok */}
      {activeEmbedModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-950 border border-cyan-500/40 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-cyan-400" />
                <h4 className="text-sm font-bold text-white truncate max-w-[260px]">
                  {activeEmbedModal.title || activeEmbedModal.video_description || 'Vídeo do TikTok'}
                </h4>
              </div>
              <button
                onClick={() => setActiveEmbedModal(null)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full aspect-[9/16] max-h-[500px] rounded-xl overflow-hidden bg-black flex items-center justify-center">
              {activeEmbedModal.embed_link ? (
                <iframe
                  src={activeEmbedModal.embed_link}
                  title={activeEmbedModal.title || 'TikTok Video Player'}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="text-center p-4 text-slate-400 text-xs">
                  Player embed indisponível diretamente. Utilize o botão abaixo para assistir no TikTok.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
              {activeEmbedModal.share_url && (
                <a
                  href={activeEmbedModal.share_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-2 transition-all hover:text-white"
                >
                  <span>Abrir no TikTok oficial</span>
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                </a>
              )}
              <button
                onClick={() => setActiveEmbedModal(null)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all cursor-pointer ml-auto"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

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
              Protocolo OAuth 2.0 Oficial
            </p>
            <p className="text-slate-400">
              A autenticação é feita diretamente na infraestrutura segura do TikTok Developers em ambiente de {isSandbox ? 'Sandbox' : 'Produção'}.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
            <p className="font-bold text-teal-300 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-teal-400" />
              Privacidade Garantida
            </p>
            <p className="text-slate-400">
              Solicitamos apenas dados públicos autorizados (<code className="text-teal-300">user.info.basic</code>, <code className="text-cyan-300">user.info.profile</code> e <code className="text-indigo-300">video.list</code>). Senhas nunca são solicitadas.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
            <p className="font-bold text-indigo-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              Isolamento por Aluno
            </p>
            <p className="text-slate-400">
              Cada chave de acesso possui sua própria conexão TikTok independente e encriptada com AES-256 no banco de dados.
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
