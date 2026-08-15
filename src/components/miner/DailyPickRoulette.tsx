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
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';
import {
  ProductMinerProduct,
  getDailyPickStatusApi,
  spinDailyPickApi,
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
  onPlayVideo?: (product: ProductMinerProduct) => void;
  onTrackClick?: (product: ProductMinerProduct) => void;
}

// Sophisticated Slate / Amber / Warm Charcoal Palette without harsh blues
const ROULETTE_PALETTE = [
  '#1e293b', // Slate 800
  '#b45309', // Amber 700
  '#334155', // Slate 700
  '#d97706', // Amber 600
  '#1e293b', // Slate 800
  '#92400e', // Amber 800
  '#27272a', // Zinc 800
  '#c2410c', // Orange 700
  '#3f3f46', // Zinc 700
  '#b45309', // Amber 700
  '#1e293b', // Slate 800
  '#d97706', // Amber 600
  '#292524', // Stone 800
  '#78350f', // Amber 900
  '#1e293b', // Slate 800
  '#ea580c', // Orange 600
  '#334155', // Slate 700
  '#b45309', // Amber 700
  '#27272a', // Zinc 800
  '#ca8a04', // Yellow 600
  '#1c1917', // Stone 900
  '#d97706', // Amber 600
  '#3f3f46', // Zinc 700
  '#92400e', // Amber 800
  '#1e293b', // Slate 800
  '#b45309', // Amber 700
];

function getShortCategoryLabel(fullLabel: string): string {
  const normalized = (fullLabel || '').trim();
  const map: Record<string, string> = {
    'Acessórios de moda': 'ACESSÓRIOS',
    'Alimentos e bebidas': 'ALIMENTOS',
    'Automotivo': 'AUTOMOTIVO',
    'Bebês e maternidade': 'BEBÊS',
    'Beleza e cuidados pessoais': 'BELEZA',
    'Bolsas e malas': 'BOLSAS',
    'Brinquedos e hobbies': 'BRINQUEDOS',
    'Calçados': 'CALÇADOS',
    'Câmeras e óptica': 'CÂMERAS',
    'Casa e decoração': 'CASA',
    'Construção e ferramentas': 'FERRAMENTAS',
    'Eletrodomésticos': 'ELETROS',
    'Eletrônicos e celulares': 'CELULARES',
    'Telefonia e celular': 'CELULARES',
    'Esportes e lazer': 'ESPORTES',
    'Informática e escritório': 'INFORMÁTICA',
    'Instrumentos musicais': 'MÚSICA',
    'Joias e relógios': 'JOIAS',
    'Livros e papelaria': 'LIVROS',
    'Moda feminina': 'MODA FEM',
    'Moda íntima': 'MODA ÍNT',
    'Moda masculina': 'MODA MASC',
    'Moda praia': 'MODA PRAIA',
    'Pet shop': 'PET SHOP',
    'Relógios': 'RELÓGIOS',
    'Saúde e bem-estar': 'SAÚDE',
    'Utensílios de cozinha': 'COZINHA',
  };

  if (map[normalized]) return map[normalized];
  return normalized.toUpperCase().slice(0, 11);
}

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
  onPlayVideo,
  onTrackClick,
}) => {
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [pickedCategory, setPickedCategory] = useState<string | null>(null);
  const [pickedProduct, setPickedProduct] = useState<ProductMinerProduct | null>(null);

  const [role, setRole] = useState<'mentor' | 'student'>('student');
  const [spinsUsedToday, setSpinsUsedToday] = useState<number>(0);
  const [remainingSpins, setRemainingSpins] = useState<number | null>(3);
  const [canSpin, setCanSpin] = useState<boolean>(true);

  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [_spinNotice, setSpinNotice] = useState<string | null>(null);

  // Wheel configuration based on 26 categories
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
        const isMaster = res.role === 'mentor';
        const used = res.spinsUsedToday || (res.hasSpunToday ? 1 : 0);
        const rem = res.remainingSpins !== undefined ? res.remainingSpins : (isMaster ? null : Math.max(0, 3 - used));
        const allowSpin = res.canSpin !== undefined ? res.canSpin : (isMaster ? true : used < 3);

        setHasSpunToday(Boolean(res.hasSpunToday));
        setPickedDate(res.pickDate || null);
        setPickedCategory(res.category || null);
        setPickedProduct(res.product || null);
        setRole(res.role || 'student');
        setSpinsUsedToday(used);
        setRemainingSpins(rem);
        setCanSpin(allowSpin);

        // If user already spun, position wheel smoothly on the category
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
    if (isSpinning || !canSpin) return;

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

      // 8 full 360-degree rotations for sustained momentum across 6 seconds
      const extraSpins = 8 * 360;
      const currentMod = rotationDegrees % 360;
      const neededDelta = (targetBaseAngle - currentMod + 360) % 360;
      const finalRotation = rotationDegrees + extraSpins + neededDelta;

      setRotationDegrees(finalRotation);

      // Exactly 6 seconds (6000ms) transition and state revelation
      setTimeout(() => {
        setIsSpinning(false);
        setHasSpunToday(true);
        setPickedDate(result.pickDate || new Date().toISOString().split('T')[0]);
        setPickedCategory(winningCat);
        setPickedProduct(winningProd);

        const newUsed = result.spinsUsedToday !== undefined ? result.spinsUsedToday : (spinsUsedToday + 1);
        const isMaster = (result.role || role) === 'mentor';
        const newRem = result.remainingSpins !== undefined ? result.remainingSpins : (isMaster ? null : Math.max(0, 3 - newUsed));
        const allowSpin = result.canSpin !== undefined ? result.canSpin : (isMaster ? true : newUsed < 3);

        setRole(result.role || role);
        setSpinsUsedToday(newUsed);
        setRemainingSpins(newRem);
        setCanSpin(allowSpin);
        setSpinNotice(`Categoria sorteada: ${winningCat}! Produto campeão revelado ao lado.`);
      }, 6000);
    } catch (err: any) {
      setIsSpinning(false);
      const msg = err?.message === 'DAILY_SPIN_LIMIT_REACHED'
        ? 'Você já utilizou seus 3 giros diários. Novos giros estarão disponíveis amanhã.'
        : (err?.message || 'Falha ao girar a roleta. Tente novamente.');
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

  const isMentor = role === 'mentor';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ================================================== */}
      {/* HEADER: APRESENTAÇÃO ESCOLHA DO DIA (LIGHT PREMIUM)*/}
      {/* ================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-amber-200/90 p-6 md:p-8 text-slate-900 shadow-sm">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-amber-100/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-orange-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              {isMentor ? (
                <span>ACESSO MENTOR • GIROS ILIMITADOS</span>
              ) : (
                <span>INTELIGÊNCIA DIÁRIA • 3 GIROS POR DIA ({Math.min(3, spinsUsedToday)}/3)</span>
              )}
            </div>

            <h2 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-amber-500 shrink-0" />
              <span>ESCOLHA DO DIA</span>
            </h2>

            <p className="text-sm md:text-base text-slate-600 font-normal leading-relaxed">
              Descubra o seu produto campeão de hoje. A inteligência de mercado do Geração Z Pro analisa as 26 categorias da TikTok Shop e sorteia um produto de alta tração com métricas de vendas validadas.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            {canSpin ? (
              <button
                type="button"
                onClick={handleSpin}
                disabled={isSpinning || loadingStatus}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm md:text-base shadow-lg shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSpinning ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span>Sorteando Categoria...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-white" />
                    <span>
                      {spinsUsedToday === 0
                        ? 'Girar Roleta da Escolha do Dia'
                        : isMentor
                        ? 'Girar Novamente (Ilimitado)'
                        : `Girar Novamente (Restam ${remainingSpins ?? 0})`}
                    </span>
                  </>
                )}
              </button>
            ) : (
              <div className="px-5 py-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-black flex items-center gap-2.5 shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-extrabold">3 giros de hoje já realizados!</div>
                  <div className="text-[10px] text-emerald-700/80 font-normal">Renovação diária às 00:00</div>
                </div>
              </div>
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
            className="text-rose-700 hover:underline cursor-pointer"
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
        <div className="lg:col-span-6 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 md:p-7 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
          <div className="text-center space-y-1 mb-3">
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
          <div className="relative w-[290px] h-[290px] sm:w-[370px] sm:h-[370px] md:w-[410px] md:h-[410px] flex items-center justify-center my-2">
            {/* Top Fixed Indicator Pin (12 o'clock position) */}
            <div className="absolute -top-3.5 z-30 flex flex-col items-center pointer-events-none drop-shadow-md">
              <div className="w-7 h-7 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 border-2 border-white shadow-md flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-950" />
              </div>
              <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[14px] border-t-amber-500 -mt-1" />
            </div>

            {/* Outer Golden Glow Ring */}
            <div className="absolute inset-0 rounded-full border-4 border-amber-300/60 shadow-lg pointer-events-none" />

            {/* Animated Rotating Wheel with 6 seconds timing */}
            <div
              className="w-full h-full rounded-full relative overflow-hidden shadow-inner border-4 border-slate-800 bg-slate-950"
              style={{
                transform: `rotate(${rotationDegrees}deg)`,
                transition: isSpinning
                  ? 'transform 6s cubic-bezier(0.12, 0.85, 0.15, 1)'
                  : 'transform 0.5s ease-out',
              }}
            >
              <svg viewBox="0 0 400 400" className="w-full h-full">
                {categories.map((cat, i) => {
                  const startAngle = (i * sliceAngle - 90) * (Math.PI / 180);
                  const endAngle = ((i + 1) * sliceAngle - 90) * (Math.PI / 180);

                  const x1 = 200 + 200 * Math.cos(startAngle);
                  const y1 = 200 + 200 * Math.sin(startAngle);
                  const x2 = 200 + 200 * Math.cos(endAngle);
                  const y2 = 200 + 200 * Math.sin(endAngle);

                  const pathData = `M 200 200 L ${x1} ${y1} A 200 200 0 0 1 ${x2} ${y2} Z`;
                  const color = ROULETTE_PALETTE[i % ROULETTE_PALETTE.length];

                  // Bisector angle of this slice in degrees
                  const textRotation = i * sliceAngle + sliceAngle / 2 - 90;
                  const shortLabel = getShortCategoryLabel(cat.label);

                  return (
                    <g key={cat.filterKey}>
                      <path
                        d={pathData}
                        fill={color}
                        stroke="#f59e0b"
                        strokeWidth="0.75"
                        strokeOpacity="0.4"
                      />
                      {/* Radial label with crisp contrast located inside each sector */}
                      <g transform={`rotate(${textRotation}, 200, 200)`}>
                        <text
                          x="320"
                          y="203"
                          fill="#ffffff"
                          fontSize="8.5"
                          fontWeight="800"
                          textAnchor="middle"
                          letterSpacing="0.4"
                          style={{
                            textShadow: '0 1px 2px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.85)',
                          }}
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
            <div className="absolute z-20 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 p-1.5 shadow-xl border-2 border-white/90 flex items-center justify-center">
              <button
                type="button"
                onClick={handleSpin}
                disabled={isSpinning || !canSpin || loadingStatus}
                className={`w-full h-full rounded-full bg-slate-950 flex flex-col items-center justify-center text-center p-1 transition-all ${
                  canSpin && !isSpinning ? 'hover:scale-105 active:scale-95 cursor-pointer' : 'cursor-default'
                }`}
                title={canSpin ? 'Girar Roleta' : 'Limite de giros diários atingido'}
              >
                {isSpinning ? (
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                ) : canSpin ? (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                    <span className="text-[10px] font-black text-white mt-0.5 leading-tight">
                      {spinsUsedToday > 0 ? 'GIRAR' : 'GIRAR'}
                    </span>
                    {!isMentor && (
                      <span className="text-[8px] font-bold text-amber-300">
                        {3 - spinsUsedToday} rest.
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <Trophy className="w-5 h-5 text-amber-400" />
                    <span className="text-[9px] font-black text-amber-200 mt-0.5 leading-tight">
                      3/3 FEITO
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="mt-3 text-center space-y-2">
            {canSpin ? (
              <button
                type="button"
                onClick={handleSpin}
                disabled={isSpinning || loadingStatus}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center gap-2 mx-auto cursor-pointer"
              >
                <RotateCcw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>
                  {isSpinning
                    ? 'Sorteando em 6s...'
                    : spinsUsedToday > 0
                    ? isMentor
                      ? 'Girar Novamente (Ilimitado)'
                      : `Girar Novamente (Restam ${remainingSpins ?? 0})`
                    : 'Girar Roleta'}
                </span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>3 giros diários concluídos • Renovação às 00:00</span>
              </div>
            )}
          </div>

          {/* ================================================== */}
          {/* INDICADOR DISCRETO DAS 26 CATEGORIAS               */}
          {/* ================================================== */}
          <div className="w-full mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>26 categorias analisadas</span>
          </div>
        </div>

        {/* COLUNA DIREITA: CARD DO PRODUTO CAMPEÃO */}
        <div className="lg:col-span-6 space-y-4">
          {loadingStatus ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-3 shadow-sm">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
              <div className="text-xs font-bold text-slate-600">Verificando Escolha do Dia...</div>
            </div>
          ) : pickedProduct ? (
            /* CARD DO PRODUTO CAMPEÃO (LIGHT PREMIUM COM BORDA ÂMBAR) */
            <article className="rounded-3xl border-2 border-amber-300 bg-white p-5 md:p-6 shadow-lg space-y-4 relative overflow-hidden">
              {/* Top Banner */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-amber-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500 text-white font-black shadow-xs">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">
                      🏆 PRODUTO ESCOLHA DO DIA
                    </span>
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900">
                      {pickedCategory || 'Produto Campeão'}
                    </h4>
                  </div>
                </div>

                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(pickedProduct)}
                    className={`p-2.5 rounded-full bg-slate-50 border border-slate-200 shadow-2xs transition-all hover:scale-105 cursor-pointer ${
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
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-amber-500 text-white text-[11px] font-black shadow-xs flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-current" />
                      <span>Score: {pickedProduct.score}/100</span>
                    </div>
                  ) : null}
                </div>

                <div className="sm:col-span-7 space-y-2.5">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug line-clamp-2">
                    {pickedProduct.title}
                  </h3>

                  {/* Preço e Faixa */}
                  <div className="space-y-0.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Preço Estimado
                    </div>
                    <div className="text-xl font-black text-emerald-600">
                      {(() => {
                        const range = getProductPriceRange(pickedProduct.priceCents, pickedProduct.currencySymbol);
                        return range ? range.formattedRange : formatMoney(pickedProduct.priceCents, pickedProduct.currencySymbol);
                      })()}
                    </div>
                  </div>

                  {/* Comissão por Venda */}
                  {commInfo ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5 flex items-center justify-between gap-2">
                      <div className="text-xs font-black text-emerald-900">
                        💰 Ganho Estimado:
                      </div>
                      <div className="text-sm font-black text-emerald-700">
                        {commInfo.formattedCommission} ({commInfo.ratePercent}%)
                      </div>
                    </div>
                  ) : null}

                  {/* Loja e Vendas */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-600 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 truncate">
                      <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate font-semibold">Loja: {pickedProduct.sellerName || 'TikTok Shop'}</span>
                    </div>
                    <div className="font-black text-amber-800 shrink-0">
                      {compactNumber(pickedProduct.soldCount)} vendas
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Associado (se houver) */}
              {pickedProduct.video ? (
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/30 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px] truncate">
                      Vídeo: @{pickedProduct.video.author || 'creator'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-amber-800 font-extrabold flex items-center gap-1">
                        <Flame className="w-3 h-3 fill-current text-amber-600" />
                        {compactNumber(pickedProduct.video.views)} views
                      </span>
                      {onPlayVideo && (
                        <button
                          type="button"
                          onClick={() => {
                            onTrackClick?.(pickedProduct);
                            onPlayVideo(pickedProduct);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                          <span>Assistir</span>
                        </button>
                      )}
                    </div>
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
                    className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-slate-200 shadow-2xs cursor-pointer"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Analisar</span>
                  </button>
                )}

                {onOpenDetailModal && (
                  <button
                    type="button"
                    onClick={() => onOpenDetailModal(pickedProduct)}
                    className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all border border-slate-200 shadow-2xs cursor-pointer"
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
                    className="col-span-2 sm:col-span-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <span>Ver Produto</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : null}
              </div>
            </article>
          ) : (
            /* ESTADO ANTES DO GIRO (PLACEHOLDER DE CONVITE LIGHT) */
            <div className="rounded-3xl border-2 border-dashed border-amber-200 bg-amber-50/20 p-8 text-center space-y-4 flex flex-col items-center justify-center min-h-[340px]">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600 shadow-xs">
                <Trophy className="w-8 h-8" />
              </div>

              <div className="space-y-1 max-w-sm">
                <h4 className="font-black text-base text-slate-900">
                  Pronto para descobrir o campeão de hoje?
                </h4>
                <p className="text-xs text-slate-600">
                  Clique no botão &quot;Girar Roleta&quot; para sortear a categoria e revelar o produto com maior destaque e métricas de vendas validadas.
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
