import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Trophy,
  Sparkles,
  Play,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ExternalLink,
  BarChart3,
  Store,
  Zap,
  CheckCircle2,
  Lock,
  RotateCcw,
  Loader2,
  AlertCircle,
  Flame,
  ArrowRight,
} from 'lucide-react';
import {
  ProductMinerProduct,
  getDailyPickStatusApi,
  spinDailyPickApi,
  DailyPickResponse,
} from '../../services/productMinerApi';
import { CategoryConfigItem } from './ProductMinerPage';
import { getProductPriceRange } from '../../utils/priceHelper';

interface DailyPickRouletteProps {
  studentCode: string;
  categories: CategoryConfigItem[];
  isFavorite?: (productId: string) => boolean;
  onToggleFavorite?: (product: ProductMinerProduct) => void;
  onOpenAnalysisModal?: (product: ProductMinerProduct) => void;
  onOpenDetailModal?: (product: ProductMinerProduct) => void;
  onTrackClick?: (product: ProductMinerProduct) => void;
}

const ROULETTE_PALETTE = [
  '#0f172a', // Slate 900
  '#b45309', // Amber 700
  '#1e293b', // Slate 800
  '#d97706', // Amber 600
  '#111827', // Gray 900
  '#92400e', // Amber 800
  '#1e1b4b', // Indigo 950
  '#c2410c', // Orange 700
  '#18181b', // Zinc 900
  '#b45309', // Amber 700
  '#064e3b', // Emerald 900
  '#d97706', // Amber 600
  '#1e293b', // Slate 800
  '#78350f', // Amber 900
  '#0f172a', // Slate 900
  '#ea580c', // Orange 600
  '#1e293b', // Slate 800
  '#b45309', // Amber 700
  '#111827', // Gray 900
  '#ca8a04', // Yellow 600
  '#1e1b4b', // Indigo 950
  '#d97706', // Amber 600
  '#18181b', // Zinc 900
  '#92400e', // Amber 800
  '#064e3b', // Emerald 900
  '#b45309', // Amber 700
];

function compactNumber(val?: number | null): string {
  if (val === undefined || val === null) return '0';
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}k`;
  return val.toLocaleString('pt-BR');
}

function formatMoney(cents?: number | null, symbol = 'R$'): string {
  if (cents === undefined || cents === null) return `${symbol} 0,00`;
  const val = cents / 100;
  return `${symbol} ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const DailyPickRoulette: React.FC<DailyPickRouletteProps> = ({
  studentCode,
  categories,
  isFavorite,
  onToggleFavorite,
  onOpenAnalysisModal,
  onOpenDetailModal,
  onTrackClick,
}) => {
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [pickedCategory, setPickedCategory] = useState<string | null>(null);
  const [pickedProduct, setPickedProduct] = useState<ProductMinerProduct | null>(null);

  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [spinNotice, setSpinNotice] = useState<string | null>(null);

  // Wheel configuration
  const numCategories = Math.max(1, categories.length);
  const sliceAngle = 360 / numCategories;

  // Initial status load
  useEffect(() => {
    let active = true;
    setLoadingStatus(true);
    setError(null);

    getDailyPickStatusApi(studentCode)
      .then((res) => {
        if (!active) return;
        setHasSpunToday(Boolean(res.hasSpunToday));
        setPickedDate(res.pickDate || null);
        setPickedCategory(res.category || null);
        setPickedProduct(res.product || null);

        // If user already spun, position wheel on the category
        if (res.hasSpunToday && res.category) {
          const catIdx = categories.findIndex((c) => c.filterKey === res.category || c.label === res.category);
          if (catIdx >= 0) {
            const targetSliceCenter = catIdx * sliceAngle + sliceAngle / 2;
            const alignedAngle = 360 - targetSliceCenter;
            setRotationDegrees(alignedAngle);
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error('[DailyPick Status Error]', err);
        setError('Não foi possível verificar a Escolha do Dia agora.');
      })
      .finally(() => {
        if (active) setLoadingStatus(false);
      });

    return () => {
      active = false;
    };
  }, [studentCode, categories, sliceAngle]);

  const handleSpin = async () => {
    if (isSpinning || hasSpunToday) return;

    setIsSpinning(true);
    setError(null);
    setSpinNotice(null);

    try {
      // Call backend to perform atomic spin
      const result = await spinDailyPickApi(studentCode);

      if (!result.success && result.error) {
        throw new Error(result.error);
      }

      const winningCat = result.category || categories[0]?.filterKey || 'Diversos';
      const winningProd = result.product || null;

      // Find index of winning category
      let targetIndex = categories.findIndex(
        (c) => c.filterKey === winningCat || c.label === winningCat
      );
      if (targetIndex < 0) targetIndex = 0;

      // Physics animation:
      // Pointer is at the top (0° / 360° / 12 o'clock).
      // Slice i goes from `i * sliceAngle` to `(i + 1) * sliceAngle`.
      // The center of slice i is at `i * sliceAngle + sliceAngle / 2`.
      // To bring slice i to the top (12 o'clock), we rotate by `360 - centerOfSlice`.
      const sliceCenter = targetIndex * sliceAngle + sliceAngle / 2;
      const targetBaseAngle = (360 - sliceCenter + 360) % 360;

      // 6 full 360-degree rotations for dramatic deceleration
      const extraSpins = 6 * 360;
      const currentMod = rotationDegrees % 360;
      const neededDelta = (targetBaseAngle - currentMod + 360) % 360;
      const finalRotation = rotationDegrees + extraSpins + neededDelta;

      setRotationDegrees(finalRotation);

      // Wait 4.5 seconds for CSS transition to complete
      setTimeout(() => {
        setIsSpinning(false);
        setHasSpunToday(true);
        setPickedDate(result.pickDate || new Date().toISOString().split('T')[0]);
        setPickedCategory(winningCat);
        setPickedProduct(winningProd);
        setSpinNotice(`Categoria sorteada: ${winningCat}! Produto campeão revelado abaixo.`);
      }, 4500);
    } catch (err: any) {
      setIsSpinning(false);
      const msg = err?.message || 'Falha ao girar a roleta. Tente novamente.';
      setError(msg);
    }
  };

  const commInfo = useMemo(() => {
    if (!pickedProduct) return null;
    const rate = pickedProduct.commissionRatePercent;
    const priceCents = pickedProduct.priceCents || 0;
    if (rate && rate > 0 && priceCents > 0) {
      const commCents = Math.round((priceCents * rate) / 100);
      return {
        ratePercent: rate,
        formattedCommission: formatMoney(commCents, pickedProduct.currencySymbol),
      };
    }
    return null;
  }, [pickedProduct]);

  const targetProductUrl = pickedProduct
    ? pickedProduct.productUrl || (pickedProduct.productId ? `https://shop.tiktok.com/view/product/${pickedProduct.productId}` : '')
    : '';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ================================================== */}
      {/* HEADER: APRESENTAÇÃO ESCOLHA DO DIA                */}
      {/* ================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/70 border-2 border-amber-500/40 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-black tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Inteligência Diária • 1 Giro por Dia</span>
            </div>

            <h2 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-400 shrink-0" />
              <span>ESCOLHA DO DIA</span>
            </h2>

            <p className="text-sm md:text-base text-amber-100/90 font-medium leading-relaxed">
              Descubra o seu produto campeão de hoje. A roleta de inteligência artificial do Geração Z Pro analisa as 26 categorias da TikTok Shop e sorteia um produto de alta tração com dados validados.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            {hasSpunToday ? (
              <div className="px-5 py-3 rounded-2xl bg-emerald-950/80 border border-emerald-400/60 text-emerald-200 text-xs font-black flex items-center gap-2.5 shadow-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <div>Giro de hoje já realizado!</div>
                  <div className="text-[10px] text-emerald-300/80 font-normal">Renovação diária às 00:00</div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSpin}
                disabled={isSpinning || loadingStatus}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm md:text-base shadow-xl shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer ring-2 ring-amber-300/60"
              >
                {isSpinning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
                    <span>Sorteando Categoria...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-slate-950" />
                    <span>Girar Roleta da Escolha do Dia</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-900 text-xs font-bold flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-rose-700 hover:underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* ================================================== */}
      {/* SEÇÃO PRINCIPAL: ROLETA + CARD DO PRODUTO          */}
      {/* ================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: ROLETA CIRCULAR PREMIUM */}
        <div className="lg:col-span-6 rounded-3xl border border-slate-200 bg-white p-5 md:p-8 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
          <div className="text-center space-y-1 mb-4">
            <div className="text-xs font-black uppercase tracking-wider text-amber-700">
              Roleta de Inteligência Artificial
            </div>
            <h3 className="font-extrabold text-base md:text-lg text-slate-900">
              {hasSpunToday
                ? `Categoria Sorteada: ${pickedCategory || 'Campeão do Dia'}`
                : '26 Categorias da TikTok Shop'}
            </h3>
          </div>

          {/* ROULETTE CONTAINER */}
          <div className="relative w-[300px] h-[300px] sm:w-[380px] sm:h-[380px] md:w-[420px] md:h-[420px] flex items-center justify-center my-2">
            {/* Top Fixed Indicator Pin (12 o'clock position) */}
            <div className="absolute -top-3 z-30 flex flex-col items-center pointer-events-none drop-shadow-md">
              <div className="w-7 h-7 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 border-2 border-white shadow-lg flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-950" />
              </div>
              <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[14px] border-t-amber-500 -mt-1" />
            </div>

            {/* Outer Glow Ring */}
            <div className="absolute inset-0 rounded-full border-4 border-amber-400/40 shadow-2xl shadow-amber-500/10 pointer-events-none" />

            {/* Animated Rotating Wheel */}
            <div
              className="w-full h-full rounded-full relative overflow-hidden shadow-inner border-4 border-slate-900 bg-slate-950"
              style={{
                transform: `rotate(${rotationDegrees}deg)`,
                transition: isSpinning
                  ? 'transform 4.5s cubic-bezier(0.12, 0.8, 0.2, 1)'
                  : 'transform 0.5s ease-out',
              }}
            >
              <svg viewBox="0 0 400 400" className="w-full h-full">
                <defs>
                  <radialGradient id="wheelGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#020617" stopOpacity="1" />
                  </radialGradient>
                </defs>

                {categories.map((cat, i) => {
                  const startAngle = (i * sliceAngle - 90) * (Math.PI / 180);
                  const endAngle = ((i + 1) * sliceAngle - 90) * (Math.PI / 180);
                  const midAngle = (i * sliceAngle + sliceAngle / 2 - 90) * (Math.PI / 180);

                  const x1 = 200 + 200 * Math.cos(startAngle);
                  const y1 = 200 + 200 * Math.sin(startAngle);
                  const x2 = 200 + 200 * Math.cos(endAngle);
                  const y2 = 200 + 200 * Math.sin(endAngle);

                  const pathData = `M 200 200 L ${x1} ${y1} A 200 200 0 0 1 ${x2} ${y2} Z`;
                  const color = ROULETTE_PALETTE[i % ROULETTE_PALETTE.length];

                  // Text angle and placement
                  const textRotation = (i * sliceAngle + sliceAngle / 2);
                  const shortLabel = cat.label.length > 14 ? `${cat.label.slice(0, 13)}…` : cat.label;

                  return (
                    <g key={cat.filterKey}>
                      <path
                        d={pathData}
                        fill={color}
                        stroke="#f59e0b"
                        strokeWidth="0.75"
                        strokeOpacity="0.4"
                      />
                      {/* Category Label inside slice */}
                      <g transform={`rotate(${textRotation}, 200, 200)`}>
                        <text
                          x="320"
                          y="204"
                          fill="#f8fafc"
                          fontSize="7.5"
                          fontWeight="800"
                          textAnchor="middle"
                          transform="rotate(90, 320, 204)"
                          letterSpacing="0.3"
                          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                        >
                          {shortLabel}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Central Golden Hub Button */}
            <div className="absolute z-20 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 p-1.5 shadow-2xl border-2 border-white/80 flex items-center justify-center">
              <button
                type="button"
                onClick={handleSpin}
                disabled={isSpinning || hasSpunToday || loadingStatus}
                className={`w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center text-center p-1 transition-all ${
                  !hasSpunToday && !isSpinning ? 'hover:scale-105 active:scale-95 cursor-pointer' : 'cursor-default'
                }`}
                title={hasSpunToday ? 'Giro de hoje já realizado' : 'Girar Roleta'}
              >
                {isSpinning ? (
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                ) : hasSpunToday ? (
                  <>
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span className="text-[9px] font-black text-amber-200 mt-0.5 leading-tight">
                      SORTEADO
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                    <span className="text-[10px] font-black text-white mt-0.5 leading-tight">
                      GIRAR
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Trigger / Footer Notice */}
          <div className="mt-4 text-center space-y-2">
            {!hasSpunToday ? (
              <button
                type="button"
                onClick={handleSpin}
                disabled={isSpinning || loadingStatus}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-2 mx-auto cursor-pointer"
              >
                <RotateCcw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>{isSpinning ? 'Sorteando...' : 'Girar Roleta'}</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>1 giro disponível a cada 24 horas</span>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: CARD DO PRODUTO CAMPEÃO */}
        <div className="lg:col-span-6 space-y-4">
          {loadingStatus ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
              <div className="text-xs font-bold text-slate-600">Verificando Escolha do Dia...</div>
            </div>
          ) : pickedProduct ? (
            /* CARD DO PRODUTO CAMPEÃO */
            <article className="rounded-3xl border-2 border-amber-400 bg-white p-5 md:p-6 shadow-xl space-y-4 relative overflow-hidden">
              {/* Top Golden Ribbon Banner */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-amber-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black shadow-sm">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                      🏆 Produto Escolha do Dia
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900">
                      {pickedCategory || 'Produto Campeão'}
                    </h4>
                  </div>
                </div>

                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(pickedProduct)}
                    className={`p-2.5 rounded-full bg-slate-50 border border-slate-200 shadow-sm transition-all hover:scale-110 ${
                      isFavorite?.(pickedProduct.productId)
                        ? 'text-rose-500 bg-rose-50 border-rose-200'
                        : 'text-slate-400 hover:text-rose-500'
                    }`}
                    title={isFavorite?.(pickedProduct.productId) ? 'Remover dos Favoritos' : 'Salvar nos Favoritos'}
                  >
                    <Heart className={`w-4 h-4 ${isFavorite?.(pickedProduct.productId) ? 'fill-current' : ''}`} />
                  </button>
                )}
              </div>

              {/* Product Visual & Details */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-5 relative aspect-square rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center p-2 group">
                  {pickedProduct.imageUrl ? (
                    <img
                      src={pickedProduct.imageUrl}
                      alt={pickedProduct.title}
                      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="text-slate-400 font-bold text-xs">Sem foto</div>
                  )}

                  {pickedProduct.score !== undefined && pickedProduct.score !== null ? (
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-black shadow-md flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-current" />
                      <span>Score: {pickedProduct.score}/100</span>
                    </div>
                  ) : null}
                </div>

                <div className="sm:col-span-7 space-y-2.5">
                  <h3 className="font-black text-sm sm:text-base text-slate-900 leading-snug line-clamp-2">
                    {pickedProduct.title}
                  </h3>

                  {/* Preço e Faixa */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Preço Estimado
                    </div>
                    <div className="text-xl font-black text-emerald-700">
                      {(() => {
                        const range = getProductPriceRange(pickedProduct.priceCents, pickedProduct.currencySymbol);
                        return range ? range.formattedRange : formatMoney(pickedProduct.priceCents, pickedProduct.currencySymbol);
                      })()}
                    </div>
                  </div>

                  {/* Comissão por Venda */}
                  {commInfo ? (
                    <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 p-2.5 flex items-center justify-between gap-2">
                      <div className="text-xs font-black text-emerald-900">
                        💰 Ganho Estimado:
                      </div>
                      <div className="text-sm font-black text-emerald-800">
                        {commInfo.formattedCommission} ({commInfo.ratePercent}%)
                      </div>
                    </div>
                  ) : null}

                  {/* Loja e Vendas */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-600 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 truncate">
                      <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate font-semibold">{pickedProduct.sellerName || 'TikTok Shop'}</span>
                    </div>
                    <div className="font-black text-amber-800 shrink-0">
                      {compactNumber(pickedProduct.soldCount)} vendas
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Associado (se houver) */}
              {pickedProduct.video ? (
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px] truncate">
                      Vídeo: @{pickedProduct.video.author || 'creator'}
                    </span>
                    <span className="text-[10px] text-amber-800 font-extrabold flex items-center gap-1">
                      <Flame className="w-3 h-3 fill-current text-amber-600" />
                      {compactNumber(pickedProduct.video.views)} views
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-center text-[10px] text-slate-600 font-semibold pt-1 border-t border-amber-200/50">
                    <span>
                      <Heart className="w-3 h-3 mx-auto mb-0.5 text-rose-500" />
                      {compactNumber(pickedProduct.video.likes)}
                    </span>
                    <span>
                      <MessageCircle className="w-3 h-3 mx-auto mb-0.5 text-sky-600" />
                      {compactNumber(pickedProduct.video.comments)}
                    </span>
                    <span>
                      <Share2 className="w-3 h-3 mx-auto mb-0.5 text-emerald-600" />
                      {compactNumber(pickedProduct.video.shares)}
                    </span>
                    <span>
                      <Bookmark className="w-3 h-3 mx-auto mb-0.5 text-amber-600" />
                      {compactNumber(pickedProduct.video.saves)}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Botões de Ação */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                {onOpenAnalysisModal && (
                  <button
                    type="button"
                    onClick={() => onOpenAnalysisModal(pickedProduct)}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Analisar</span>
                  </button>
                )}

                {onOpenDetailModal && (
                  <button
                    type="button"
                    onClick={() => onOpenDetailModal(pickedProduct)}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <span>Detalhes</span>
                  </button>
                )}

                {targetProductUrl ? (
                  <a
                    href={targetProductUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => onTrackClick?.(pickedProduct)}
                    className="col-span-2 sm:col-span-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
                  >
                    <span>Ver Produto</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : null}
              </div>
            </article>
          ) : (
            /* ESTADO ANTES DO GIRO (PLACEHOLDER DE CONVITE) */
            <div className="rounded-3xl border-2 border-dashed border-amber-300/80 bg-amber-50/30 p-8 text-center space-y-4 flex flex-col items-center justify-center min-h-[340px]">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600 shadow-sm">
                <Trophy className="w-8 h-8" />
              </div>

              <div className="space-y-1 max-w-sm">
                <h4 className="font-black text-base text-slate-900">
                  Pronto para descobrir o campeão de hoje?
                </h4>
                <p className="text-xs text-slate-600">
                  Clique no botão &quot;Girar Roleta&quot; para sortear a categoria e revelar o produto com maior destaque e métricas de vendas.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSpin}
                disabled={isSpinning || loadingStatus}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer hover:scale-105"
              >
                <Sparkles className="w-4 h-4" />
                <span>Girar Roleta Agora</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
