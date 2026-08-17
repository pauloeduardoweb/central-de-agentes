import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Copy, Check, Sparkles, Loader2, AlertCircle, RefreshCw,
  Clock, Languages, Wand2, FileText, Quote, Volume2, ShieldCheck,
  ChevronRight, Users, Play, Pause, ExternalLink, RotateCcw,
  Radio, AlignLeft, Eye, MessageSquare, Flame, CheckCircle2
} from 'lucide-react';
import {
  ProductMinerProduct,
  VideoTranscriptionResponse,
  VideoCaptionBlock,
  TimedTranscriptBlock,
  fetchPersistedTranscriptionByVideoIdApi,
  fetchVideoTranscriptionApi,
} from '../../services/productMinerApi';
import {
  extractCleanTikTokVideoId,
  getTikTokDirectWatchUrl,
} from './ProductMinerModals';

interface ProductTranscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductMinerProduct | null;
  studentCode: string;
  onOpenContentModelerModal?: (product: ProductMinerProduct, transcriptData?: VideoTranscriptionResponse) => void;
  onTrackClick?: (product: ProductMinerProduct) => void;
}

interface NormalizedCaption {
  id: number;
  start: number;
  end: number;
  timeLabel: string;
  text: string;
}

function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().replace(/[\[\]]/g, '');
  const parts = clean.split(':').map((p) => parseFloat(p));
  if (parts.length === 3) {
    return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
  }
  if (parts.length === 2) {
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
}

function formatSecondsToTime(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const ProductTranscriptionModal: React.FC<ProductTranscriptionModalProps> = ({
  isOpen,
  onClose,
  product,
  studentCode,
  onOpenContentModelerModal,
  onTrackClick,
}) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcriptionData, setTranscriptionData] = useState<VideoTranscriptionResponse | null>(null);

  // Modos de visualização e sincronização
  const [viewMode, setViewMode] = useState<'synchronized' | 'fullText'>('synchronized');
  const [followPlayback, setFollowPlayback] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Player iframe states
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  // Copy feedbacks
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedTranslation, setCopiedTranslation] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeBlockRef = useRef<HTMLDivElement>(null);

  const video = product?.video || (product?.associatedVideos && product.associatedVideos[0]) || null;
  const productId = product?.productId;
  const videoId = extractCleanTikTokVideoId(video) || (video?.id || (video as any)?.videoId || (video as any)?.video_id || '');
  const tiktokWatchUrl = getTikTokDirectWatchUrl(video);

  const embedUrl = videoId
    ? `https://www.tiktok.com/player/v1/${encodeURIComponent(videoId)}?autoplay=1&controls=1`
    : null;

  // Carregar dados de transcrição
  const loadTranscription = async (force = false) => {
    if (!product || !productId) return;
    if (force) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      if (!force) {
        try {
          const cleanVid = videoId || '';
          const cached = await fetchPersistedTranscriptionByVideoIdApi(studentCode, cleanVid, productId);
          if (cached && cached.exists && cached.rawTranscript) {
            setTranscriptionData(cached);
            setLoading(false);
            setRefreshing(false);
            return;
          }
        } catch (consultErr) {
          console.warn('[Transcription Fast Consultation Miss/Error]:', consultErr);
        }
      }

      const data = await fetchVideoTranscriptionApi(studentCode, {
        productId,
        videoId,
        videoUrl: video?.url || product.videoUrl,
        productTitle: product.title,
        productCategory: product.category,
        videoAuthor: video?.author || product.videoAuthor,
        videoDescription: video?.description || product.videoDescription,
        forceRefresh: force,
      });

      setTranscriptionData(data);
    } catch (err: any) {
      console.error('[Transcription Load Error]:', err);
      setError(err?.message || 'Não foi possível carregar a transcrição do vídeo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen && product) {
      loadTranscription(false);
      setCurrentTime(0);
      setIsPlaying(true);
      setIframeLoading(true);
      setIframeError(false);
    } else {
      setTranscriptionData(null);
      setError(null);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [isOpen, productId, videoId]);

  // ESC listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Normalização unificada das falas com timestamps em segundos
  const normalizedCaptions = useMemo<NormalizedCaption[]>(() => {
    if (!transcriptionData) return [];

    const totalDuration = transcriptionData.durationSeconds || 30;

    // 1. Se possuir captions com start e end precisos
    if (Array.isArray(transcriptionData.captions) && transcriptionData.captions.length > 0) {
      return transcriptionData.captions.map((cap, idx) => {
        const start = typeof cap.start === 'number' ? cap.start : 0;
        const end = typeof cap.end === 'number' ? cap.end : start + 3;
        return {
          id: idx,
          start,
          end,
          timeLabel: `${formatSecondsToTime(start)} – ${formatSecondsToTime(end)}`,
          text: cap.text || '',
        };
      });
    }

    // 2. Se possuir timedTranscript com formato cronológico
    if (Array.isArray(transcriptionData.timedTranscript) && transcriptionData.timedTranscript.length > 0) {
      return transcriptionData.timedTranscript.map((item, idx, arr) => {
        const start = parseTimeToSeconds(item.time);
        const nextItem = arr[idx + 1];
        const nextStart = nextItem ? parseTimeToSeconds(nextItem.time) : 0;
        const end = nextStart > start ? nextStart : Math.min(start + 3.5, totalDuration);

        return {
          id: idx,
          start,
          end,
          timeLabel: item.time.includes('–') || item.time.includes('-')
            ? item.time
            : `${formatSecondsToTime(start)} – ${formatSecondsToTime(end)}`,
          text: item.text || '',
        };
      });
    }

    // 3. Fallback: dividir rawTranscript em frases ou parágrafos
    if (transcriptionData.rawTranscript) {
      const sentences = transcriptionData.rawTranscript
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);

      if (sentences.length === 0) return [];

      const segmentDuration = totalDuration / sentences.length;
      return sentences.map((text, idx) => {
        const start = idx * segmentDuration;
        const end = Math.min((idx + 1) * segmentDuration, totalDuration);
        return {
          id: idx,
          start,
          end,
          timeLabel: `${formatSecondsToTime(start)} – ${formatSecondsToTime(end)}`,
          text,
        };
      });
    }

    return [];
  }, [transcriptionData]);

  // Duração total máxima para a barra e sincronização
  const maxDuration = useMemo(() => {
    if (transcriptionData?.durationSeconds && transcriptionData.durationSeconds > 0) {
      return transcriptionData.durationSeconds;
    }
    if (normalizedCaptions.length > 0) {
      return Math.max(...normalizedCaptions.map((c) => c.end), 30);
    }
    return 30;
  }, [transcriptionData, normalizedCaptions]);

  // Identificar caption ativa pelo currentTime
  const activeCaptionIndex = useMemo(() => {
    if (normalizedCaptions.length === 0) return -1;
    const foundIndex = normalizedCaptions.findIndex(
      (c) => currentTime >= c.start && currentTime < c.end
    );
    if (foundIndex !== -1) return foundIndex;

    // Se passou do último, destaca o último
    if (currentTime >= (normalizedCaptions[normalizedCaptions.length - 1]?.end || 0)) {
      return normalizedCaptions.length - 1;
    }

    // Se antes do primeiro, destaca o primeiro
    return 0;
  }, [normalizedCaptions, currentTime]);

  // Timer de reprodução sincronizada
  useEffect(() => {
    if (!isOpen || !isPlaying || normalizedCaptions.length === 0) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 0.25;
        if (next >= maxDuration) {
          return 0; // Loop sincronizado com o vídeo
        }
        return parseFloat(next.toFixed(2));
      });
    }, 250);

    return () => clearInterval(interval);
  }, [isOpen, isPlaying, maxDuration, normalizedCaptions.length]);

  // Auto-scroll para o elemento ativo
  useEffect(() => {
    if (followPlayback && viewMode === 'synchronized' && activeBlockRef.current) {
      activeBlockRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeCaptionIndex, followPlayback, viewMode]);

  if (!isOpen || !product) return null;

  const handleSeek = (seconds: number) => {
    setCurrentTime(Math.min(Math.max(seconds, 0), maxDuration));
    setIsPlaying(true);
  };

  const handleCopyOriginal = async () => {
    if (!transcriptionData) return;
    const textToCopy = normalizedCaptions.length > 0
      ? normalizedCaptions.map((b) => `[${b.timeLabel}] "${b.text}"`).join('\n\n')
      : transcriptionData.rawTranscript;

    await navigator.clipboard.writeText(textToCopy);
    setCopiedOriginal(true);
    setTimeout(() => setCopiedOriginal(false), 2500);
  };

  const handleCopyTranslation = async () => {
    if (!transcriptionData?.portugueseTranslation) return;
    await navigator.clipboard.writeText(transcriptionData.portugueseTranslation);
    setCopiedTranslation(true);
    setTimeout(() => setCopiedTranslation(false), 2500);
  };

  const handleCopyRaw = async () => {
    if (!transcriptionData) return;
    await navigator.clipboard.writeText(transcriptionData.rawTranscript);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2500);
  };

  const isForeign = transcriptionData?.isForeignLanguage && Boolean(transcriptionData.portugueseTranslation);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl rounded-3xl bg-white border border-slate-200 p-4 sm:p-6 shadow-2xl text-slate-900 my-auto flex flex-col max-h-[94dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================================================== */}
        {/* 1. CABEÇALHO DO MODAL                              */}
        {/* ================================================== */}
        <div className="flex items-start justify-between pb-3.5 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
              <Quote className="w-5 h-5 fill-amber-500/20" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight flex items-center gap-2">
                  <span>TRANSCRIÇÃO SINCRONIZADA</span>
                  <span className="text-amber-500 text-xs px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 font-black uppercase">
                    V3 Player
                  </span>
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-[10px] uppercase">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Fidelidade Máxima
                </span>
                {isForeign ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-sky-800 font-black text-[10px] uppercase">
                    <Languages className="w-3 h-3 text-sky-600" />
                    Original + Tradução
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-black text-[10px] uppercase">
                    🇧🇷 Português (BR)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                {product.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {tiktokWatchUrl ? (
              <a
                href={tiktokWatchUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => onTrackClick?.(product)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-900 text-xs font-bold border border-slate-200 hover:border-amber-300 transition-all shadow-2xs"
                title="Assistir no TikTok em nova aba"
              >
                <span>Assistir no TikTok</span>
                <ExternalLink className="w-3 h-3 text-amber-600" />
              </a>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
              title="Fechar (ESC)"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* ================================================== */}
        {/* 2. CONTEÚDO PRINCIPAL (SPLIT: VÍDEO + TRANSCRIÇÃO) */}
        {/* ================================================== */}
        <div className="py-3.5 flex-1 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 animate-pulse">
                  <FileText className="w-7 h-7" />
                </div>
                <Loader2 className="w-6 h-6 animate-spin text-amber-600 absolute -top-1 -right-1" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-sm text-slate-900">
                  Extraindo Transcrição Fiel do Vídeo...
                </h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  Analisando a fala integral do vídeo sem resumir, preservando termos, ordem, gírias e pontuação.
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-center space-y-3 my-6">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-sm text-rose-900">Falha ao carregar transcrição</h4>
                <p className="text-xs text-rose-700">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => loadTranscription(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tentar Novamente</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* ============================================== */}
              {/* COLUNA ESQUERDA: PLAYER OFICIAL TIKTOK (42%)   */}
              {/* ============================================== */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-3">
                <div className="relative w-full max-w-[320px] sm:max-w-[340px] aspect-[9/16] max-h-[50dvh] sm:max-h-[56dvh] lg:max-h-[62dvh] rounded-2xl bg-black overflow-hidden border border-slate-200 shadow-lg flex items-center justify-center">
                  {embedUrl && !iframeError ? (
                    <>
                      {iframeLoading && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-950 text-amber-400">
                          <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
                          <span className="text-xs font-bold text-slate-200">Carregando Player...</span>
                        </div>
                      )}
                      <iframe
                        key={videoId}
                        src={embedUrl}
                        title="TikTok Video Player"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                        allowFullScreen
                        onLoad={() => setIframeLoading(false)}
                        onError={() => {
                          setIframeLoading(false);
                          setIframeError(true);
                        }}
                      />
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center bg-slate-950 text-slate-200">
                      <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div className="space-y-1 max-w-xs">
                        <h4 className="font-extrabold text-sm text-white">Player Indisponível</h4>
                        <p className="text-[11px] text-slate-400">
                          Use a transcrição ao lado ou assista direto no TikTok.
                        </p>
                      </div>
                      {tiktokWatchUrl && (
                        <a
                          href={tiktokWatchUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-colors"
                        >
                          <span>Assistir no TikTok</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Metadados rápidos do criador e vídeo */}
                <div className="w-full max-w-[340px] grid grid-cols-3 gap-1.5 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="block text-[9px] font-bold text-slate-500 uppercase">Criador</span>
                    <span className="font-black text-slate-900 truncate block text-[11px]">
                      @{video?.author || product.videoAuthor || 'criador'}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50/70 border border-amber-200">
                    <span className="block text-[9px] font-bold text-amber-700 uppercase">Duração</span>
                    <span className="font-black text-amber-950 text-[11px]">
                      ~{transcriptionData?.durationSeconds || 30}s
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-purple-50/70 border border-purple-200">
                    <span className="block text-[9px] font-bold text-purple-700 uppercase">Idioma</span>
                    <span className="font-black text-purple-950 uppercase text-[11px]">
                      {transcriptionData?.originalLanguage || 'PT'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ============================================== */}
              {/* COLUNA DIREITA: TRANSCRIÇÃO SINCRONIZADA (58%) */}
              {/* ============================================== */}
              <div className="lg:col-span-7 flex flex-col space-y-3 min-w-0">
                {/* Barra de Controles da Transcrição */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                  {/* Alternância de Modo */}
                  <div className="inline-flex p-1 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setViewMode('synchronized')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        viewMode === 'synchronized'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>Sincronizado</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('fullText')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        viewMode === 'fullText'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                      <span>Texto Integral</span>
                    </button>
                  </div>

                  {/* Controles de Reprodução Sincronizada */}
                  {viewMode === 'synchronized' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-amber-50 text-slate-700 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                        title={isPlaying ? 'Pausar sincronização' : 'Retomar sincronização'}
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5 text-amber-600" />
                            <span>Pausar</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                            <span>Seguir</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCurrentTime(0);
                          setIsPlaying(true);
                        }}
                        className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                        title="Voltar ao início (00:00)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 cursor-pointer select-none pl-1">
                        <input
                          type="checkbox"
                          checked={followPlayback}
                          onChange={(e) => setFollowPlayback(e.target.checked)}
                          className="w-3.5 h-3.5 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                        />
                        <span>Seguir reprodução</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Linha do Tempo e Barra de Progresso Interativa */}
                {viewMode === 'synchronized' && (
                  <div className="px-3 py-2 rounded-xl bg-amber-50/50 border border-amber-200/70 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold text-amber-950">
                      <span className="flex items-center gap-1.5">
                        <Volume2 className={`w-3.5 h-3.5 text-amber-600 ${isPlaying ? 'animate-pulse' : ''}`} />
                        <span>{formatSecondsToTime(currentTime)}</span>
                      </span>
                      <span className="text-slate-500">{formatSecondsToTime(maxDuration)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={maxDuration}
                      step={0.5}
                      value={currentTime}
                      onChange={(e) => handleSeek(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                    />
                  </div>
                )}

                {/* ============================================== */}
                {/* MODO 1: SINCRONIZADO (BLOCO A BLOCO)           */}
                {/* ============================================== */}
                {viewMode === 'synchronized' ? (
                  <div
                    ref={containerRef}
                    className="space-y-2 max-h-[46dvh] lg:max-h-[48dvh] overflow-y-auto pr-1 select-text scroll-smooth"
                  >
                    {normalizedCaptions.length > 0 ? (
                      normalizedCaptions.map((block, index) => {
                        const isActive = index === activeCaptionIndex;
                        return (
                          <div
                            key={block.id}
                            ref={isActive ? activeBlockRef : null}
                            onClick={() => handleSeek(block.start)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                              isActive
                                ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/20 shadow-md transform scale-[1.01]'
                                : 'bg-slate-50/70 hover:bg-amber-50/30 border-slate-200/80 text-slate-700'
                            }`}
                          >
                            <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                              <span
                                className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border transition-colors ${
                                  isActive
                                    ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                                    : 'bg-white text-slate-600 border-slate-200'
                                }`}
                              >
                                {block.timeLabel}
                              </span>
                              {isActive && (
                                <span className="flex h-2 w-2 relative mt-0.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </span>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-xs sm:text-sm leading-relaxed transition-colors ${
                                  isActive
                                    ? 'font-bold text-amber-950'
                                    : 'font-medium text-slate-800'
                                }`}
                              >
                                &ldquo;{block.text}&rdquo;
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                        Nenhum bloco de fala individual identificado.
                      </div>
                    )}
                  </div>
                ) : (
                  /* ============================================== */
                  /* MODO 2: TEXTO INTEGRAL (SEM BLOCOS)            */
                  /* ============================================== */
                  <div className="space-y-3 max-h-[46dvh] lg:max-h-[48dvh] overflow-y-auto pr-1">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                          {isForeign ? 'Transcrição Original (Nativa)' : 'Fala Integral'}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyRaw}
                          className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                        >
                          {copiedRaw ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedRaw ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed whitespace-pre-line">
                        {transcriptionData?.rawTranscript || 'Transcrição indisponível.'}
                      </p>
                    </div>

                    {/* Tradução se idioma estrangeiro */}
                    {isForeign && transcriptionData?.portugueseTranslation ? (
                      <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-200 space-y-2">
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-sky-200">
                          <span className="text-[11px] font-black text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Languages className="w-3.5 h-3.5 text-sky-600" />
                            Tradução para Português (BR)
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyTranslation}
                            className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-800 cursor-pointer"
                          >
                            {copiedTranslation ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedTranslation ? 'Copiado' : 'Copiar'}</span>
                          </button>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed whitespace-pre-line">
                          {transcriptionData.portugueseTranslation}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Destaques Estruturais (Hook e CTA) */}
                {(transcriptionData?.hookOriginal || transcriptionData?.ctaOriginal) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {transcriptionData.hookOriginal ? (
                      <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-0.5">
                        <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">
                          🎣 Hook Inicial (0-3s)
                        </span>
                        <p className="font-bold text-slate-900 text-xs truncate">
                          &ldquo;{transcriptionData.hookOriginal}&rdquo;
                        </p>
                      </div>
                    ) : null}

                    {transcriptionData.ctaOriginal ? (
                      <div className="p-2.5 rounded-xl bg-orange-50/60 border border-orange-200 space-y-0.5">
                        <span className="text-[10px] font-black text-orange-800 uppercase tracking-wider block">
                          📢 CTA Falado
                        </span>
                        <p className="font-bold text-slate-900 text-xs truncate">
                          &ldquo;{transcriptionData.ctaOriginal}&rdquo;
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ================================================== */}
        {/* 3. RODAPÉ DE AÇÕES                                 */}
        {/* ================================================== */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={() => loadTranscription(true)}
            disabled={loading || refreshing}
            className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Recarregar transcrição com nova extração"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-600' : ''}`} />
            <span>{refreshing ? 'Atualizando...' : 'Recarregar'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {transcriptionData ? (
              <button
                type="button"
                onClick={handleCopyOriginal}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  copiedOriginal
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                {copiedOriginal ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedOriginal ? 'Transcrição Copiada!' : 'Copiar Transcrição'}</span>
              </button>
            ) : null}

            {onOpenContentModelerModal && transcriptionData ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenContentModelerModal(product, transcriptionData);
                }}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Wand2 className="w-4 h-4" />
                <span>MODELAR CONTEÚDO</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
