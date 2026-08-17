import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X, Copy, Check, Sparkles, Loader2, AlertCircle, RefreshCw,
  Clock, Languages, Wand2, FileText, Quote, Volume2, ShieldCheck,
  ChevronRight, Users, Play, Pause, ExternalLink, RotateCcw,
  Radio, AlignLeft, Eye, MessageSquare, Flame, CheckCircle2,
  BookOpen, ListOrdered
} from 'lucide-react';
import {
  ProductMinerProduct,
  VideoTranscriptionResponse,
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

interface RealTimedCaption {
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

  // Modos de visualização reais:
  // - 'timed': Leitura com Timestamps reais (captions V3 / timedTranscript)
  // - 'fullText': Texto Integral
  const [viewMode, setViewMode] = useState<'timed' | 'fullText'>('timed');

  // Player iframe states
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  // Copy feedbacks
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedTranslation, setCopiedTranslation] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

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
      setIframeLoading(true);
      setIframeError(false);
    } else {
      setTranscriptionData(null);
      setError(null);
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

  // Captions reais (extraídas da V3 - NUNCA inventadas/estimadas por divisão de texto)
  const realCaptions = useMemo<RealTimedCaption[]>(() => {
    if (!transcriptionData) return [];

    // 1. Se possuir captions com start e end reais
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

    // 2. Se possuir timedTranscript estruturado real
    if (Array.isArray(transcriptionData.timedTranscript) && transcriptionData.timedTranscript.length > 0) {
      return transcriptionData.timedTranscript.map((item, idx, arr) => {
        const start = parseTimeToSeconds(item.time);
        const nextItem = arr[idx + 1];
        const nextStart = nextItem ? parseTimeToSeconds(nextItem.time) : start + 3.5;
        const end = nextStart > start ? nextStart : start + 3.5;

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

    // REGRA ESTRITA: Se houver somente rawTranscript, NÃO inventar timestamps.
    return [];
  }, [transcriptionData]);

  const hasRealTimestamps = realCaptions.length > 0;

  // Se não houver timestamps reais, abrir automaticamente em Texto Integral
  useEffect(() => {
    if (transcriptionData && !hasRealTimestamps) {
      setViewMode('fullText');
    } else if (transcriptionData && hasRealTimestamps) {
      setViewMode('timed');
    }
  }, [transcriptionData, hasRealTimestamps]);

  if (!isOpen || !product) return null;

  const handleCopyOriginal = async () => {
    if (!transcriptionData) return;
    const textToCopy = hasRealTimestamps
      ? realCaptions.map((b) => `[${b.timeLabel}] "${b.text}"`).join('\n\n')
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
                  <span>TRANSCRIÇÃO E ROTEIRO</span>
                  <span className="text-amber-500 text-xs px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 font-black uppercase">
                    Modo Leitura
                  </span>
                </h3>
                {hasRealTimestamps ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-[10px] uppercase">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Fidelidade Máxima (Timestamps Reais)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] uppercase">
                    <BookOpen className="w-3 h-3 text-slate-500" />
                    Texto Integral
                  </span>
                )}
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
                  Carregando Transcrição Fiel do Vídeo...
                </h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  Analisando a fala integral do vídeo sem resumir, preservando termos, ordem e pontuação.
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
                          <span className="text-xs font-bold text-slate-200">Carregando Player Oficial...</span>
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

                {/* Metadados do criador e vídeo */}
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
              {/* COLUNA DIREITA: TRANSCRIÇÃO / ROTEIRO (58%)    */}
              {/* ============================================== */}
              <div className="lg:col-span-7 flex flex-col space-y-3 min-w-0">
                {/* Barra de Seleção de Visualização */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                  <div className="inline-flex p-1 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    {hasRealTimestamps && (
                      <button
                        type="button"
                        onClick={() => setViewMode('timed')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          viewMode === 'timed'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                        <span>Com Timestamps</span>
                      </button>
                    )}
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

                  {!hasRealTimestamps && (
                    <span className="text-[11px] font-medium text-slate-500">
                      Timestamps por trecho indisponíveis para esta transcrição.
                    </span>
                  )}
                </div>

                {/* ============================================== */}
                {/* MODO 1: LEITURA COM TIMESTAMPS REAIS           */}
                {/* ============================================== */}
                {viewMode === 'timed' && hasRealTimestamps ? (
                  <div className="space-y-2 max-h-[50dvh] lg:max-h-[52dvh] overflow-y-auto pr-1 select-text scroll-smooth">
                    {realCaptions.map((block) => (
                      <div
                        key={block.id}
                        className="p-3 rounded-2xl bg-slate-50/80 hover:bg-amber-50/40 border border-slate-200/90 hover:border-amber-300 transition-all flex items-start gap-3"
                      >
                        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                          <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                            {block.timeLabel}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm leading-relaxed font-medium text-slate-800">
                            &ldquo;{block.text}&rdquo;
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* ============================================== */
                  /* MODO 2: TEXTO INTEGRAL                         */
                  /* ============================================== */
                  <div className="space-y-3 max-h-[50dvh] lg:max-h-[52dvh] overflow-y-auto pr-1">
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
