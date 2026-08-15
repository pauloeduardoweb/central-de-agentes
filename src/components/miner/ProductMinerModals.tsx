import React, { useState, useEffect } from 'react';
import {
  X, Sparkles, Copy, Check, Play, Eye, Heart, MessageCircle, Share2,
  Bookmark, Zap, Loader2, AlertCircle, FileText, Wand2, RefreshCw, ExternalLink, ShieldCheck, BarChart3,
  Store, Star, Flame, ShoppingBag, Info, Tag, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Film, VideoOff, Layers
} from 'lucide-react';
import {
  ProductMinerProduct,
  ProductScriptType,
  generateProductScript,
  calculateVideoAnalysis,
} from '../../services/productMinerApi';
import { getProductPriceRange } from '../../utils/priceHelper';

function compactNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatMoney(cents: number | null, symbol = 'R$') {
  if (cents === null || cents === undefined) return '—';
  return `${symbol} ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface EffectiveCommissionInfo {
  effectiveCommissionCents: number;
  formattedCommission: string;
  ratePercent: number | null;
  hasDirectAmount: boolean;
}

export function formatStoreName(sellerName?: string | null): string {
  if (!sellerName || !sellerName.trim()) {
    return 'Loja: TikTok Shop';
  }
  const clean = sellerName.trim();
  if (clean.toLowerCase().startsWith('loja:')) {
    return clean;
  }
  return `Loja: ${clean}`;
}

export function getEffectiveCommissionInfo(product: ProductMinerProduct): EffectiveCommissionInfo | null {
  const directCents = product.estimatedCommissionCents && product.estimatedCommissionCents > 0
    ? product.estimatedCommissionCents
    : 0;

  const rate = product.commissionRatePercent && product.commissionRatePercent > 0
    ? product.commissionRatePercent
    : null;

  let calculatedCents = 0;
  if (directCents > 0) {
    calculatedCents = directCents;
  } else if (rate !== null && product.priceCents && product.priceCents > 0) {
    calculatedCents = Math.round((product.priceCents * rate) / 100);
  }

  if (calculatedCents <= 0 && rate === null) {
    return null;
  }

  return {
    effectiveCommissionCents: calculatedCents,
    formattedCommission: formatMoney(calculatedCents, product.currencySymbol || 'R$'),
    ratePercent: rate,
    hasDirectAmount: directCents > 0,
  };
}

function getCommissionText(product: ProductMinerProduct): string | null {
  const info = getEffectiveCommissionInfo(product);
  if (!info) return null;

  if (info.effectiveCommissionCents > 0 && info.ratePercent !== null) {
    return `Comissão ${info.formattedCommission} · ${info.ratePercent}%`;
  }
  if (info.effectiveCommissionCents > 0) {
    return `Comissão ${info.formattedCommission}`;
  }
  if (info.ratePercent !== null) {
    return `Comissão ${info.ratePercent}%`;
  }
  return null;
}

function getOfficialProductUrl(product: { productUrl?: string | null; productId?: string | null }): string | null {
  if (!product) return null;

  const rawUrl = product.productUrl ? String(product.productUrl).trim() : '';

  if (rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
    const isSearchUrl = rawUrl.includes('/search') ||
                        rawUrl.includes('/query') ||
                        rawUrl.includes('/store/search') ||
                        rawUrl.includes('q=') ||
                        rawUrl.includes('search_id=') ||
                        rawUrl.includes('keyword=');
    if (!isSearchUrl) {
      return rawUrl;
    }
  }

  return null;
}

// ==========================================
// 1. SCRIPT GENERATOR MODAL (AI ROTEIRO/COPY)
// ==========================================
interface ScriptGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductMinerProduct | null;
  studentCode: string;
}

const SCRIPT_TYPES: Array<{ id: ProductScriptType; label: string; desc: string }> = [
  { id: 'roteiro_completo', label: '📜 Roteiro Completo', desc: 'Hook + 3 Cenas + CTA para TikTok Shop' },
  { id: 'roteiro_viral', label: '🔥 Roteiro Viral', desc: 'Focado em reter a atenção e gerar salvamentos' },
  { id: 'copy_venda', label: '💰 Copy de Venda', desc: '3 opções de copy persuasiva de conversão' },
  { id: 'hooks', label: '🪝 5 Hooks Virais', desc: 'Ganchos irrecusáveis para os primeiros 3s' },
  { id: 'cta', label: '📣 5 CTAs', desc: 'Chamadas para clicar no carrinho amarelo' },
];

export const ScriptGeneratorModal: React.FC<ScriptGeneratorModalProps> = ({
  isOpen,
  onClose,
  product,
  studentCode,
}) => {
  const [scriptType, setScriptType] = useState<ProductScriptType>('roteiro_completo');
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [scriptText, setScriptText] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [variantCount, setVariantCount] = useState(0);

  if (!isOpen || !product) return null;

  const handleGenerate = async (seedOverride?: number) => {
    setLoading(true);
    setError('');
    setCopied(false);

    try {
      const res = await generateProductScript(
        studentCode,
        product,
        scriptType,
        customPrompt,
        seedOverride ?? (variantCount > 0 ? Date.now() : undefined)
      );
      setScriptText(res.script);
      if (seedOverride !== undefined) {
        setVariantCount((prev) => prev + 1);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao gerar roteiro.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!scriptText) return;
    navigator.clipboard.writeText(scriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl my-8 text-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                Gerador de Roteiro AI <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 font-bold">TikTok Shop</span>
              </h2>
              <p className="text-xs text-slate-500">
                Produza conteúdo viral direcionado para conversão no carrinho amarelo.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Summary Header */}
        <div className="mt-4 p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 truncate">{product.title}</h3>
              {product.score !== undefined && product.score !== null ? (
                <span className="shrink-0 px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-black border border-amber-200">
                  Score {product.score}/100
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
              <span className="font-bold text-emerald-700">
                {(() => {
                  const range = getProductPriceRange(product.priceCents, product.currencySymbol);
                  return range ? range.formattedRange : formatMoney(product.priceCents, product.currencySymbol);
                })()}
              </span>
              <span>• {compactNumber(product.soldCount)} vendas</span>
              {product.video?.views ? <span>• {compactNumber(product.video.views)} views no vídeo</span> : null}
            </div>
          </div>
        </div>

        {/* Script Type Options */}
        <div className="mt-4 space-y-2">
          <label className="text-xs font-bold text-slate-700 block">Tipo de Conteúdo Desejado:</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SCRIPT_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setScriptType(t.id)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  scriptType === t.id
                    ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold">{t.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Prompt Input */}
        <div className="mt-4 space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            Instrução Adicional / Foco Específico <span className="text-slate-400 font-normal">(Opcional)</span>:
          </label>
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Ex: Foque na dor de falta de tempo, ou enfatize o preço promocional para estudantes..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Generate Action Button */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => handleGenerate()}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando Roteiro com IA...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                {scriptText ? 'Recriar Roteiro' : '✨ Gerar Roteiro com IA'}
              </>
            )}
          </button>

          {scriptText ? (
            <button
              onClick={() => handleGenerate(Date.now())}
              disabled={loading}
              title="Gerar uma versão alternativa"
              className="px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Outra Versão
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="mt-3 p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800">
            {error}
          </div>
        ) : null}

        {/* Script Output Box */}
        {scriptText ? (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                Roteiro Gerado:
              </span>

              <button
                onClick={handleCopy}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  copied
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar Roteiro
                  </>
                )}
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-y-auto">
              {scriptText}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};


// ==========================================
// 2. VIDEO ANALYSIS MODAL (ANÁLISE DE VÍDEO)
// ==========================================
interface VideoAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductMinerProduct | null;
  onOpenScriptModal?: (p: ProductMinerProduct) => void;
}

export const VideoAnalysisModal: React.FC<VideoAnalysisModalProps> = ({
  isOpen,
  onClose,
  product,
  onOpenScriptModal,
}) => {
  if (!isOpen || !product || !product.video) return null;

  const analysis = calculateVideoAnalysis(product.video);
  if (!analysis) return null;

  const video = product.video;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl my-8 text-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                Análise do Vídeo Vencedor
              </h2>
              <p className="text-xs text-slate-500">
                Métricas detalhadas e diagnóstico de engajamento do TikTok Shop.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Strength Badge & Classification */}
        <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Classificação de Força</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-3 py-1 rounded-lg border text-sm font-black ${analysis.badgeColor}`}>
                {analysis.classification === 'Viral' ? '🔥 VIRAL (1M+ Views)' : `Classificação: ${analysis.classification}`}
              </span>
              <span className="text-xs text-slate-600 font-medium">
                • {analysis.engagementRate}% de engajamento
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full sm:w-48">
            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
              <span>Potencial de Escala</span>
              <span className="font-bold text-slate-800">{analysis.scorePercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                style={{ width: `${analysis.scorePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Author / Creator info */}
        <div className="mt-4 p-3 rounded-xl border border-amber-200 bg-amber-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center font-bold text-amber-900 text-sm">
              @
            </div>
            <div>
              <div className="text-xs font-bold text-amber-950">@{video.author || 'criador'}</div>
              <div className="text-[10px] text-slate-500">
                {video.authorFollowers ? `${compactNumber(video.authorFollowers)} seguidores` : 'Creator do TikTok Shop'}
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
            <Eye className="w-4 h-4 mx-auto mb-1 text-slate-600" />
            <div className="text-xs text-slate-500">Visualizações</div>
            <div className="text-sm font-black text-slate-900 mt-0.5">{compactNumber(analysis.views)}</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
            <Heart className="w-4 h-4 mx-auto mb-1 text-rose-500" />
            <div className="text-xs text-slate-500">Curtidas</div>
            <div className="text-sm font-black text-slate-900 mt-0.5">{compactNumber(analysis.likes)}</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
            <MessageCircle className="w-4 h-4 mx-auto mb-1 text-sky-600" />
            <div className="text-xs text-slate-500">Comentários</div>
            <div className="text-sm font-black text-slate-900 mt-0.5">{compactNumber(analysis.comments)}</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
            <Share2 className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
            <div className="text-xs text-slate-500">Compartilhamentos</div>
            <div className="text-sm font-black text-slate-900 mt-0.5">{compactNumber(analysis.shares)}</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
            <Bookmark className="w-4 h-4 mx-auto mb-1 text-amber-600" />
            <div className="text-xs text-slate-500">Salvos</div>
            <div className="text-sm font-black text-slate-900 mt-0.5">{compactNumber(analysis.saves)}</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
            <Zap className="w-4 h-4 mx-auto mb-1 text-amber-500" />
            <div className="text-xs text-slate-500">Engajamento Aprox.</div>
            <div className="text-sm font-black text-amber-700 mt-0.5">{analysis.engagementRate}%</div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-5">
          {product.video?.url ? (
            <a
              href={product.video.url}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Play className="w-4 h-4 fill-current text-white" />
              Assistir Vídeo no TikTok
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 3. PRODUCT DETAIL MODAL (MOBILE & DESKTOP INTEL)
// ==========================================
interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductMinerProduct | null;
  isFavorite?: boolean;
  onToggleFavorite?: (p: ProductMinerProduct) => void;
  onOpenScriptModal?: (p: ProductMinerProduct) => void;
  onOpenAnalysisModal?: (p: ProductMinerProduct) => void;
  onTrackClick?: (p: ProductMinerProduct) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  isFavorite = false,
  onToggleFavorite,
  onOpenScriptModal,
  onOpenAnalysisModal,
  onTrackClick,
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  useEffect(() => {
    setActiveVideoIndex(0);
  }, [product?.productId]);

  if (!isOpen || !product) return null;

  const show24h = product.sales24h !== undefined && product.sales24h !== null;
  const show7d = product.sales7d !== undefined && product.sales7d !== null;
  const officialProductUrl = getOfficialProductUrl(product);

  const videoList = (product.associatedVideos && product.associatedVideos.length > 0)
    ? product.associatedVideos
    : (product.video ? [product.video] : []);

  const activeVideo = videoList[activeVideoIndex] || product.video || null;

  const officialDescription =
    product.description ||
    product.productDescription ||
    (product as any).product_description ||
    (product as any).desc;

  const videoDescription = activeVideo?.description || product.video?.description;

  const cleanOfficialDesc = officialDescription ? String(officialDescription).trim() : '';
  const cleanVideoDesc = videoDescription ? String(videoDescription).trim() : '';

  const hasOfficialDesc = Boolean(cleanOfficialDesc);
  const hasVideoDesc = !hasOfficialDesc && Boolean(cleanVideoDesc);

  const displayDescription = hasOfficialDesc ? cleanOfficialDesc : (hasVideoDesc ? cleanVideoDesc : '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-[calc(100vw-24px)] sm:w-full max-w-2xl max-h-[90dvh] rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-6 shadow-2xl my-auto text-slate-900 flex flex-col overflow-x-hidden">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white pb-3 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                Detalhes do Produto
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto overflow-x-hidden pr-0.5 space-y-4 pt-3 flex-1">
          {/* Main Info Box */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start bg-slate-50 border border-slate-200/80 p-3 sm:p-4 rounded-xl">
            <div className="relative w-full sm:w-36 aspect-square rounded-lg bg-white overflow-hidden shrink-0 border border-slate-200">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <ShoppingBag className="w-12 h-12" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-2 w-full">
              {product.score !== undefined && product.score !== null ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/80 border border-amber-300 text-amber-950 text-xs font-extrabold shadow-xs">
                  <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                  Score Geração Z Pro: {product.score}/100
                </div>
              ) : null}

              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug">
                {product.title}
              </h3>

              {(() => {
                const range = getProductPriceRange(product.priceCents, product.currencySymbol);
                if (!range) {
                  return (
                    <div className="mt-2.5">
                      <span className="text-lg sm:text-xl font-black text-emerald-700">
                        {formatMoney(product.priceCents, product.currencySymbol)}
                      </span>
                    </div>
                  );
                }
                return (
                  <div className="mt-2.5">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80 inline-block leading-none whitespace-nowrap">
                        Faixa estimada
                      </span>
                    </div>
                    <div className="text-lg sm:text-xl font-black text-emerald-700 leading-tight whitespace-nowrap">
                      {range.formattedRange}
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const commText = getCommissionText(product);
                if (!commText) return null;
                return (
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-black">
                    💰 {commText}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Bloco 1: Sobre o Produto */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200/90 bg-white space-y-2">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase tracking-wide">
                  Sobre o Produto
                </h4>
              </div>
              {hasVideoDesc ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                  Descrição do vídeo associado
                </span>
              ) : null}
            </div>

            {displayDescription ? (
              <div className="space-y-2 pt-1">
                <p className={`text-xs text-slate-700 leading-relaxed whitespace-pre-line ${!isDescriptionExpanded ? 'line-clamp-5' : ''}`}>
                  {displayDescription}
                </p>
                {displayDescription.length > 180 ? (
                  <button
                    type="button"
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 pt-0.5 cursor-pointer"
                  >
                    {isDescriptionExpanded ? (
                      <>Ver menos <ChevronUp className="w-3.5 h-3.5" /></>
                    ) : (
                      <>Ver mais <ChevronDown className="w-3.5 h-3.5" /></>
                    )}
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="py-2 text-xs text-slate-400 italic">
                Descrição detalhada indisponível para este produto.
              </div>
            )}
          </div>

          {/* Bloco 2: Informações do Produto */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200/90 bg-white space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Tag className="w-4 h-4 text-amber-600 shrink-0" />
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase tracking-wide">
                Informações do Produto
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-2 min-w-0">
                <span className="text-slate-500 font-medium shrink-0">Loja</span>
                <span className="font-bold text-slate-900 truncate" title={formatStoreName(product.sellerName)}>
                  {formatStoreName(product.sellerName)}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-2 min-w-0">
                <span className="text-slate-500 font-medium shrink-0">Categoria</span>
                <span className="font-bold text-slate-900 truncate">
                  {product.category || 'Geral'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-2 min-w-0">
                <span className="text-slate-500 font-medium shrink-0">Vendas Totais</span>
                <span className="font-bold text-amber-700">
                  {compactNumber(product.soldCount)}
                  {show24h ? ` (+${compactNumber(product.sales24h)} em 24h)` : ''}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-2 min-w-0">
                <span className="text-slate-500 font-medium shrink-0">Avaliação</span>
                <span className="font-bold text-amber-600 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  {product.rating ?? '—'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-between gap-2 min-w-0 sm:col-span-2">
                <span className="text-slate-500 font-medium shrink-0">Vídeo associado</span>
                <span className={`font-bold flex items-center gap-1 ${videoList.length > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {videoList.length > 0 ? (
                    <>
                      <Film className="w-3.5 h-3.5 text-emerald-600" /> Sim {videoList.length > 1 ? `(${videoList.length} vídeos)` : ''}
                    </>
                  ) : (
                    <>
                      <VideoOff className="w-3.5 h-3.5 text-slate-400" /> Não
                    </>
                  )}
                </span>
              </div>

              {/* Display variants if present */}
              {(() => {
                const vars = product.variants || (product as any).variations || (product as any).skus;
                if (!vars || (Array.isArray(vars) && vars.length === 0)) return null;
                const varsText = Array.isArray(vars) ? vars.map((v: any) => typeof v === 'string' ? v : v.name || v.title || JSON.stringify(v)).join(', ') : String(vars);
                if (!varsText) return null;
                return (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 sm:col-span-2 space-y-1">
                    <span className="text-slate-500 font-medium text-[11px] block">Variações Identificadas</span>
                    <span className="font-bold text-slate-800 text-xs block truncate">{varsText}</span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Creator & Video Section */}
          {activeVideo ? (
            <div className="p-3.5 sm:p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-amber-200/60 pb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                    📹 Criador: @{activeVideo.author || 'creator'}
                  </span>
                  {activeVideo.authorFollowers !== null && activeVideo.authorFollowers !== undefined ? (
                    <span className="text-[11px] font-semibold text-slate-600 shrink-0 hidden sm:inline">
                      ({compactNumber(activeVideo.authorFollowers)} seguidores)
                    </span>
                  ) : null}
                </div>

                {videoList.length > 1 ? (
                  <div className="flex items-center gap-1.5 shrink-0 bg-white/90 border border-amber-300 rounded-lg p-1 shadow-xs">
                    <button
                      type="button"
                      onClick={() => setActiveVideoIndex((prev) => (prev - 1 + videoList.length) % videoList.length)}
                      className="p-1 rounded hover:bg-amber-100 text-amber-900 transition-colors cursor-pointer"
                      title="Vídeo anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-black text-amber-950 px-1 select-none">
                      {activeVideoIndex + 1} de {videoList.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveVideoIndex((prev) => (prev + 1) % videoList.length)}
                      className="p-1 rounded hover:bg-amber-100 text-amber-900 transition-colors cursor-pointer"
                      title="Próximo vídeo"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : activeVideo.authorFollowers !== null && activeVideo.authorFollowers !== undefined ? (
                  <span className="text-[11px] font-semibold text-slate-600 shrink-0 sm:hidden">
                    {compactNumber(activeVideo.authorFollowers)} seguidores
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-5 gap-1 text-center text-[9px] sm:text-xs text-slate-700 font-semibold">
                <div className="p-1 sm:p-1.5 rounded-lg bg-white/80 border border-slate-200/80 min-w-0 overflow-hidden">
                  <Eye className="w-3.5 h-3.5 mx-auto mb-0.5 text-slate-600" />
                  <span className="block truncate">{compactNumber(activeVideo.views)}</span>
                </div>
                <div className="p-1 sm:p-1.5 rounded-lg bg-white/80 border border-slate-200/80 min-w-0 overflow-hidden">
                  <Heart className="w-3.5 h-3.5 mx-auto mb-0.5 text-rose-500" />
                  <span className="block truncate">{compactNumber(activeVideo.likes)}</span>
                </div>
                <div className="p-1 sm:p-1.5 rounded-lg bg-white/80 border border-slate-200/80 min-w-0 overflow-hidden">
                  <MessageCircle className="w-3.5 h-3.5 mx-auto mb-0.5 text-sky-600" />
                  <span className="block truncate">{compactNumber(activeVideo.comments)}</span>
                </div>
                <div className="p-1 sm:p-1.5 rounded-lg bg-white/80 border border-slate-200/80 min-w-0 overflow-hidden">
                  <Share2 className="w-3.5 h-3.5 mx-auto mb-0.5 text-emerald-600" />
                  <span className="block truncate">{compactNumber(activeVideo.shares)}</span>
                </div>
                <div className="p-1 sm:p-1.5 rounded-lg bg-white/80 border border-slate-200/80 min-w-0 overflow-hidden">
                  <Bookmark className="w-3.5 h-3.5 mx-auto mb-0.5 text-amber-600" />
                  <span className="block truncate">{compactNumber(activeVideo.saves)}</span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Action Buttons Grid */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeVideo ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAnalysisModal?.({ ...product, video: activeVideo });
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <BarChart3 className="w-4 h-4 text-amber-600" />
                  🔍 Analisar Vídeo {videoList.length > 1 ? `(${activeVideoIndex + 1})` : ''}
                </button>
              ) : null}

              {activeVideo?.url ? (
                <a
                  href={activeVideo.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onTrackClick?.(product)}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 text-amber-600 fill-amber-500" />
                  ▶️ Assistir Vídeo {videoList.length > 1 ? `(${activeVideoIndex + 1})` : ''}
                </a>
              ) : null}

              {officialProductUrl ? (
                <a
                  href={officialProductUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onTrackClick?.(product)}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  Pesquisar no TikTok Shop <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : null}

              <button
                type="button"
                onClick={() => onToggleFavorite?.(product)}
                className={`w-full py-2.5 px-3 rounded-xl border font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isFavorite
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current text-rose-500' : ''}`} />
                {isFavorite ? 'Salvo nos Favoritos' : 'Salvar nos Favoritos'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 4. TIKTOK EMBED VIDEO PLAYER MODAL
// ==========================================
export function extractCleanTikTokVideoId(video?: { id?: string | null; url?: string | null } | null): string | null {
  if (!video) return null;
  if (video.id) {
    const rawId = String(video.id).trim();
    if (/^\d{10,25}$/.test(rawId)) {
      return rawId;
    }
  }
  if (video.url) {
    const rawUrl = String(video.url).trim();
    const match = rawUrl.match(/\/video\/(\d{10,25})/i) || rawUrl.match(/\/v\/(\d{10,25})/i) || rawUrl.match(/(\d{15,25})/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

export function getTikTokDirectWatchUrl(video?: { id?: string | null; url?: string | null; author?: string | null } | null): string | null {
  if (!video) return null;
  if (video.url && (video.url.startsWith('http://') || video.url.startsWith('https://'))) {
    return video.url;
  }
  const cleanId = extractCleanTikTokVideoId(video);
  if (cleanId) {
    const author = video.author ? encodeURIComponent(video.author.replace(/^@/, '')) : 'user';
    return `https://www.tiktok.com/@${author}/video/${cleanId}`;
  }
  return null;
}

interface TikTokVideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductMinerProduct | null;
  onOpenAnalysisModal?: (p: ProductMinerProduct) => void;
  onOpenDetailModal?: (p: ProductMinerProduct) => void;
  onToggleFavorite?: (p: ProductMinerProduct) => void;
  isFavorite?: boolean;
  onTrackClick?: (p: ProductMinerProduct) => void;
}

export const TikTokVideoPlayerModal: React.FC<TikTokVideoPlayerModalProps> = ({
  isOpen,
  onClose,
  product,
  onOpenAnalysisModal,
  onOpenDetailModal,
  onToggleFavorite,
  isFavorite = false,
  onTrackClick,
}) => {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const video = product?.video || (product?.associatedVideos && product.associatedVideos[0]) || null;
  const videoId = extractCleanTikTokVideoId(video);
  const tiktokWatchUrl = getTikTokDirectWatchUrl(video);
  const officialProductUrl = product ? getOfficialProductUrl(product) : null;

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setIframeLoading(true);
      setLoadError(false);
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, product?.productId, videoId]);

  // ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const embedUrl = videoId
    ? `https://www.tiktok.com/player/v1/${encodeURIComponent(videoId)}?autoplay=1&controls=1`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-3xl bg-white border border-slate-200 p-4 sm:p-6 shadow-2xl text-slate-900 my-auto flex flex-col max-h-[96dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar with clean Assistir no TikTok & Close Button (No redundant header/title) */}
        <div className="flex items-center justify-end gap-2 pb-3 mb-2 border-b border-slate-100">
          {tiktokWatchUrl ? (
            <a
              href={tiktokWatchUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => onTrackClick?.(product)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-amber-50/60 text-slate-700 hover:text-amber-900 text-xs font-bold border border-slate-200 hover:border-amber-300 transition-all shadow-2xs"
              title="Assistir vídeo no TikTok em nova aba"
            >
              <span>Assistir no TikTok</span>
              <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
            </a>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
            title="Fechar player (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================================================== */}
        {/* 2. MODAL MAIN GRID (DESKTOP: 2 COLS / MOBILE: V)   */}
        {/* ================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-start">
          {/* Column 1: Vertical 9:16 Video Player */}
          <div className="md:col-span-6 lg:col-span-6 flex justify-center">
            <div className="relative w-full max-w-[340px] sm:max-w-[360px] aspect-[9/16] max-h-[66dvh] sm:max-h-[70dvh] rounded-2xl bg-black overflow-hidden border border-slate-200 shadow-xl flex items-center justify-center">
              {embedUrl && !loadError ? (
                <>
                  {iframeLoading && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-950 text-amber-400">
                      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                      <span className="text-xs font-bold text-slate-200">Carregando Player TikTok...</span>
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
                      setLoadError(true);
                    }}
                  />
                </>
              ) : (
                /* Fallback State */
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-slate-950 text-slate-200">
                  <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                  <div className="space-y-1 max-w-xs">
                    <h4 className="text-sm font-black text-white">
                      Este vídeo não está disponível para reprodução incorporada.
                    </h4>
                    <p className="text-xs text-slate-400">
                      Você pode assistir diretamente na plataforma oficial do TikTok.
                    </p>
                  </div>
                  {tiktokWatchUrl ? (
                    <a
                      href={tiktokWatchUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => onTrackClick?.(product)}
                      className="mt-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs flex items-center gap-2 shadow-md transition-all"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Assistir no TikTok</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Creator, Metrics, and Related Product */}
          <div className="md:col-span-6 lg:col-span-6 flex flex-col space-y-4">
            {/* 2.1 CARD DO CRIADOR */}
            {video ? (
              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                    @
                  </div>
                  <div className="min-w-0">
                    <span className="font-extrabold text-sm sm:text-base text-slate-900 truncate block leading-tight">
                      @{video.author || 'creator'}
                    </span>
                    {video.authorFollowers !== null && video.authorFollowers !== undefined ? (
                      <span className="text-xs text-slate-500 block font-medium mt-0.5">
                        {compactNumber(video.authorFollowers)} seguidores
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 block font-medium mt-0.5">
                        Criador TikTok Shop
                      </span>
                    )}
                  </div>
                </div>

                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(product)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs shrink-0 ${
                      isFavorite
                        ? 'border-rose-300 bg-rose-50 text-rose-600'
                        : 'border-slate-200 bg-white text-slate-400 hover:text-rose-500 hover:border-rose-200'
                    }`}
                    title={isFavorite ? 'Remover dos Favoritos' : 'Salvar nos Favoritos'}
                  >
                    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>
                )}
              </div>
            ) : null}

            {/* 2.2 MÉTRICAS DO VÍDEO — 5 MINI CARDS PREMIUM */}
            {video ? (
              <div className="space-y-1.5">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 px-0.5">
                  Métricas de Engajamento
                </div>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center">
                  {/* Views */}
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center">
                    <Eye className="w-4 h-4 text-slate-600 mb-1" />
                    <span className="font-black text-slate-900 text-xs sm:text-sm block leading-tight">
                      {compactNumber(video.views)}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">
                      Views
                    </span>
                  </div>

                  {/* Likes */}
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center">
                    <Heart className="w-4 h-4 text-rose-500 mb-1" />
                    <span className="font-black text-slate-900 text-xs sm:text-sm block leading-tight">
                      {compactNumber(video.likes)}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">
                      Likes
                    </span>
                  </div>

                  {/* Comments */}
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-sky-500 mb-1" />
                    <span className="font-black text-slate-900 text-xs sm:text-sm block leading-tight">
                      {compactNumber(video.comments)}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">
                      Coment.
                    </span>
                  </div>

                  {/* Shares */}
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center">
                    <Share2 className="w-4 h-4 text-emerald-600 mb-1" />
                    <span className="font-black text-slate-900 text-xs sm:text-sm block leading-tight">
                      {compactNumber(video.shares)}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">
                      Shares
                    </span>
                  </div>

                  {/* Saves */}
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center">
                    <Bookmark className="w-4 h-4 text-amber-600 mb-1" />
                    <span className="font-black text-slate-900 text-xs sm:text-sm block leading-tight">
                      {compactNumber(video.saves)}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-0.5">
                      Salvos
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* 2.3 PRODUTO RELACIONADO — PRODUCT INTELLIGENCE CARD */}
            <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 p-3.5 space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
                <span className="text-slate-700">PRODUTO RELACIONADO</span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300/80 text-amber-900 font-black text-[10px]">
                  {compactNumber(product.soldCount)} VENDAS
                </span>
              </div>

              <div className="flex items-start gap-3">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 bg-white shadow-2xs"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-1">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-snug">
                    {product.title}
                  </h4>
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <div className="text-sm sm:text-base font-black text-emerald-600">
                      {(() => {
                        const range = getProductPriceRange(product.priceCents, product.currencySymbol);
                        return range ? range.formattedRange : formatMoney(product.priceCents, product.currencySymbol);
                      })()}
                    </div>
                    <div className="text-[11px] text-slate-600 truncate max-w-[150px] flex items-center gap-1 font-medium" title={formatStoreName(product.sellerName)}>
                      <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">{formatStoreName(product.sellerName)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2.4 AÇÕES DO MODAL */}
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                {onOpenAnalysisModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAnalysisModal(product);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition-all cursor-pointer shadow-2xs"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Análise com IA</span>
                  </button>
                )}

                {onOpenDetailModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDetailModal(product);
                    }}
                    className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition-all cursor-pointer shadow-2xs"
                  >
                    <span>Detalhes do Produto</span>
                  </button>
                )}
              </div>

              {officialProductUrl ? (
                <a
                  href={officialProductUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onTrackClick?.(product)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <span>VER PRODUTO NO TIKTOK SHOP</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : null}

              {tiktokWatchUrl ? (
                <a
                  href={tiktokWatchUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => onTrackClick?.(product)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-200 transition-all sm:hidden cursor-pointer"
                >
                  <span>Assistir no TikTok</span>
                  <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
