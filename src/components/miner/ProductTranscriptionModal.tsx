import React, { useState, useEffect } from 'react';
import {
  X, Copy, Check, Sparkles, Loader2, AlertCircle, RefreshCw,
  Clock, Languages, Wand2, FileText, Quote, Volume2, ShieldCheck,
  ChevronRight, Users, Play, ExternalLink
} from 'lucide-react';
import {
  ProductMinerProduct,
  VideoTranscriptionResponse,
  fetchVideoTranscriptionApi,
} from '../../services/productMinerApi';

interface ProductTranscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductMinerProduct | null;
  studentCode: string;
  onOpenContentModelerModal?: (product: ProductMinerProduct, transcriptData?: VideoTranscriptionResponse) => void;
  onTrackClick?: (product: ProductMinerProduct) => void;
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
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedTranslation, setCopiedTranslation] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  const video = product?.video || (product?.associatedVideos && product.associatedVideos[0]) || null;
  const productId = product?.productId;
  const videoId = video?.id || (video as any)?.videoId || (video as any)?.video_id || '';

  const loadTranscription = async (force = false) => {
    if (!product || !productId) return;
    if (force) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
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

  if (!isOpen || !product) return null;

  const handleCopyOriginal = async () => {
    if (!transcriptionData) return;
    const textToCopy = transcriptionData.timedTranscript && transcriptionData.timedTranscript.length > 0
      ? transcriptionData.timedTranscript.map((b) => `[${b.time}] "${b.text}"`).join('\n\n')
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
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-3xl bg-white border border-slate-200 p-5 sm:p-7 shadow-2xl text-slate-900 my-auto flex flex-col max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
              <Quote className="w-5 h-5 fill-amber-500/20" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight">
                  TRANSCRIÇÃO DO VÍDEO
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
              <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">
                {product.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer shrink-0"
            title="Fechar (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
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
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-center space-y-3">
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
          ) : transcriptionData ? (
            <div className="space-y-4">
              {/* Metadados do Vídeo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase">Criador</span>
                  <span className="font-black text-slate-900 truncate block">
                    @{video?.author || product.videoAuthor || 'criador'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                  <span className="block text-[10px] font-bold text-amber-700 uppercase">Duração</span>
                  <span className="font-black text-amber-950">
                    ~{transcriptionData.durationSeconds || 30}s
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                  <span className="block text-[10px] font-bold text-emerald-700 uppercase">Ritmo da Fala</span>
                  <span className="font-bold text-emerald-950 truncate block text-[11px]">
                    {transcriptionData.rhythm || 'Cadenciado'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/80">
                  <span className="block text-[10px] font-bold text-purple-700 uppercase">Idioma</span>
                  <span className="font-black text-purple-950 uppercase">
                    {transcriptionData.originalLanguage || 'PT'}
                  </span>
                </div>
              </div>

              {/* Seção 1: Transcrição Exata (Cronológica com Timestamps) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <h4 className="font-black text-xs sm:text-sm text-slate-900 uppercase tracking-wide">
                      {isForeign ? 'TRANSCRIÇÃO ORIGINAL (ÁUDIO NATIVO)' : 'TEXTO INTEGRAL DA FALA'}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyOriginal}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      copiedOriginal
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-900 border border-slate-200 hover:border-amber-200'
                    }`}
                  >
                    {copiedOriginal ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copiar Transcrição</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Blocos Cronológicos */}
                {transcriptionData.timedTranscript && transcriptionData.timedTranscript.length > 0 ? (
                  <div className="space-y-2.5 max-h-[38dvh] overflow-y-auto pr-1">
                    {transcriptionData.timedTranscript.map((block, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/70 flex items-start gap-3 hover:bg-amber-50/30 transition-colors"
                      >
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-mono text-[11px] font-bold shrink-0 shadow-2xs">
                          {block.time}
                        </span>
                        <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed">
                          &ldquo;{block.text}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                    &ldquo;{transcriptionData.rawTranscript}&rdquo;
                  </div>
                )}
              </div>

              {/* Seção 2: Tradução Completa (Se estrangeiro) */}
              {isForeign && transcriptionData.portugueseTranslation ? (
                <div className="rounded-2xl border border-sky-200 bg-sky-50/30 p-4 sm:p-5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-sky-100">
                    <div className="flex items-center gap-2">
                      <Languages className="w-4 h-4 text-sky-600 shrink-0" />
                      <h4 className="font-black text-xs sm:text-sm text-sky-950 uppercase tracking-wide">
                        TRADUÇÃO PARA PORTUGUÊS (BR)
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyTranslation}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        copiedTranslation
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-900 border border-sky-200 hover:border-sky-300'
                      }`}
                    >
                      {copiedTranslation ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-sky-600" />
                          <span>Copiar Tradução</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-sky-100 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                    {transcriptionData.portugueseTranslation}
                  </div>
                </div>
              ) : null}

              {/* Destaques da Estrutura Fiel (Hook + CTA) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {transcriptionData.hookOriginal ? (
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                    <span className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">
                      🎣 Hook de Abertura (0-3s)
                    </span>
                    <p className="font-bold text-slate-900 text-xs line-clamp-2">
                      &ldquo;{transcriptionData.hookOriginal}&rdquo;
                    </p>
                  </div>
                ) : null}

                {transcriptionData.ctaOriginal ? (
                  <div className="p-3 rounded-xl bg-orange-50/60 border border-orange-200/80 space-y-1">
                    <span className="text-[10px] font-black text-orange-800 uppercase tracking-wider block">
                      📢 CTA Falado (Conversão)
                    </span>
                    <p className="font-bold text-slate-900 text-xs line-clamp-2">
                      &ldquo;{transcriptionData.ctaOriginal}&rdquo;
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
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
                onClick={handleCopyRaw}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {copiedRaw ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRaw ? 'Copiado!' : 'Copiar Texto Puro'}</span>
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
