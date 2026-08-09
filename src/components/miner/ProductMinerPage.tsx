import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Flame, ShoppingBag, Star, Store, ExternalLink, Play, Eye, Heart,
  MessageCircle, Share2, Bookmark, TrendingUp, Loader2, Database, Zap, RefreshCw,
  Layers, ShieldCheck, AlertCircle, CheckCircle2, X, Sparkles, Home, Shirt, Utensils,
  Cpu, Dumbbell, Baby, Dog, Copy, Check, Video, Download, FileText, BarChart3, Wand2, Filter,
  Trophy, ThumbsUp, SlidersHorizontal, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  loadProductRanking,
  ProductMinerProduct,
  ProductRankingMeta,
  ProductRankingSort,
  searchProducts,
  refreshProducts,
  fetchCollectorCategories,
  fetchDailyRefreshStatus,
  runDailyRefresh,
  type DailyRefreshStatus,
  type CollectorCategoryStat,
  type ProductSearchSource,
} from '../../services/productMinerApi';
import {
  ScriptGeneratorModal,
  VideoAnalysisModal,
  VideoDownloadModal,
} from './ProductMinerModals';

interface ProductMinerPageProps {
  studentCode: string;
  canRefresh?: boolean;
}

const QUICK_SEARCHES = ['beleza', 'casa', 'moda', 'cozinha', 'eletrônicos', 'fitness', 'bebê', 'pet'];

const RANKING_FILTERS: Array<{ id: ProductRankingSort; label: string }> = [
  { id: 'opportunities', label: '🔥 Melhores Oportunidades' },
  { id: 'total', label: 'Mais vendidos' },
  { id: '24h', label: 'Vendas 24h' },
  { id: '7d', label: 'Vendas 7 dias' },
  { id: 'spiking', label: '🔥 Disparando' },
];

export type ClassificationType = 'best_sellers' | 'top_rated' | 'trending' | 'most_searched' | 'editors_choice';

export interface ClassificationItem {
  id: ClassificationType;
  label: string;
  imgUrl: string;
  fallbackIcon: React.ReactNode;
}

const CLASSIFICATIONS: ClassificationItem[] = [
  {
    id: 'best_sellers',
    label: 'Mais vendidos',
    imgUrl: 'https://i.postimg.cc/tg8X1nND/troféu.jpg',
    fallbackIcon: <Trophy className="w-6 h-6 text-amber-400" />,
  },
  {
    id: 'top_rated',
    label: 'Melhores avaliações',
    imgUrl: 'https://i.postimg.cc/JnJRj7p3/Like.jpg',
    fallbackIcon: <ThumbsUp className="w-6 h-6 text-blue-400" />,
  },
  {
    id: 'trending',
    label: 'Tendências',
    imgUrl: 'https://i.postimg.cc/26vCnj0n/Fogo.jpg',
    fallbackIcon: <Flame className="w-6 h-6 text-orange-400" />,
  },
  {
    id: 'most_searched',
    label: 'Mais pesquisados',
    imgUrl: 'https://i.postimg.cc/PxZd1fSW/Lupa.jpg',
    fallbackIcon: <Search className="w-6 h-6 text-cyan-400" />,
  },
  {
    id: 'editors_choice',
    label: 'Escolha do dia',
    imgUrl: 'https://i.postimg.cc/767qSPKN/coração.jpg',
    fallbackIcon: <Heart className="w-6 h-6 text-rose-400" />,
  },
];

const TIKTOK_CATEGORIES = [
  { filterKey: 'Todos', label: 'Todos' },
  { filterKey: 'Moda', label: 'Moda' },
  { filterKey: 'Itens para Casa', label: 'Casa' },
  { filterKey: 'Eletrônicos', label: 'Eletrônicos' },
  { filterKey: 'Beleza e Cuidados Pessoais', label: 'Beleza' },
  { filterKey: 'Esporte e Lazer', label: 'Esporte' },
  { filterKey: 'Brinquedos e Pets', label: 'Brinquedos e Pets' },
  { filterKey: 'Health', label: 'Health' },
];

function formatMoney(cents: number | null | undefined, symbol = 'R$') {
  if (cents === null || cents === undefined) return '—';
  return `${symbol} ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function compactNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function formatCollectionDate(isoStr: string | null): string {
  if (!isoStr) return 'Sem dados coletados';
  const date = new Date(isoStr);
  if (!Number.isFinite(date.getTime())) return 'Sem dados coletados';

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) {
    return `Atualizado hoje às ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Atualizado ontem às ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `Atualizado em ${dateStr} às ${timeStr}`;
}

function getCategoryIcon(catName: string) {
  const norm = catName.toLowerCase();
  if (norm.includes('beleza')) return <Sparkles className="w-5 h-5 text-amber-300" />;
  if (norm.includes('casa')) return <Home className="w-5 h-5 text-cyan-300" />;
  if (norm.includes('moda')) return <Shirt className="w-5 h-5 text-fuchsia-300" />;
  if (norm.includes('cozinha')) return <Utensils className="w-5 h-5 text-orange-300" />;
  if (norm.includes('eletrônicos') || norm.includes('eletronicos')) return <Cpu className="w-5 h-5 text-blue-300" />;
  if (norm.includes('fitness')) return <Dumbbell className="w-5 h-5 text-emerald-300" />;
  if (norm.includes('bebê') || norm.includes('bebe')) return <Baby className="w-5 h-5 text-pink-300" />;
  if (norm.includes('pet')) return <Dog className="w-5 h-5 text-purple-300" />;
  return <ShoppingBag className="w-5 h-5 text-cyan-300" />;
}

function matchesCategoryFilter(productCatRaw: string | null, selectedCat: string): boolean {
  if (!selectedCat || selectedCat === 'Todos') return true;
  if (!productCatRaw) return false;

  const cat = productCatRaw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const target = selectedCat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (target === 'moda') {
    return cat.includes('moda') || cat.includes('vestuario') || cat.includes('roupa') || cat.includes('calçado');
  }
  if (target.includes('casa')) {
    return cat.includes('casa') || cat.includes('cozinha') || cat.includes('lar') || cat.includes('decoracao');
  }
  if (target.includes('eletronicos')) {
    return cat.includes('eletronico') || cat.includes('tecnologia') || cat.includes('gadget') || cat.includes('celular') || cat.includes('fone');
  }
  if (target.includes('beleza')) {
    return cat.includes('beleza') || cat.includes('pessoal') || cat.includes('cosmetico') || cat.includes('skincare') || cat.includes('cabelo') || cat.includes('maquiagem');
  }
  if (target.includes('esporte')) {
    return cat.includes('esporte') || cat.includes('fitness') || cat.includes('lazer') || cat.includes('treino') || cat.includes('academia');
  }
  if (target.includes('brinquedos') || target.includes('pets')) {
    return cat.includes('pet') || cat.includes('brinquedo') || cat.includes('bebe') || cat.includes('infantil') || cat.includes('animais');
  }
  if (target.includes('health')) {
    return cat.includes('health') || cat.includes('saude') || cat.includes('suplemento') || cat.includes('vitamina');
  }

  return cat.includes(target);
}

const ClassificationIconComponent: React.FC<{ item: ClassificationItem; isActive: boolean }> = ({ item, isActive }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden transition-all flex items-center justify-center shrink-0 border-2 ${
        isActive
          ? 'border-amber-400 bg-gradient-to-br from-amber-500/30 to-orange-500/30 shadow-lg shadow-amber-500/30 ring-2 ring-amber-400/50 scale-105'
          : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
      }`}
    >
      {!imgError ? (
        <img
          src={item.imgUrl}
          alt={item.label}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        item.fallbackIcon
      )}
    </div>
  );
};

/* Compact Mobile Card (TikTok Shop list style) */
const MobileProductCard: React.FC<{
  product: ProductMinerProduct;
  position?: number;
  rankingSort?: ProductRankingSort;
  isMentor?: boolean;
  onOpenScriptModal?: (p: ProductMinerProduct) => void;
  onOpenAnalysisModal?: (p: ProductMinerProduct) => void;
  onOpenDownloadModal?: (p: ProductMinerProduct) => void;
}> = ({
  product,
  position,
  rankingSort,
  isMentor,
  onOpenScriptModal,
  onOpenAnalysisModal,
  onOpenDownloadModal,
}) => {
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyVideoLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.video?.url) {
      navigator.clipboard.writeText(product.video.url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-950/90 p-3 shadow-md hover:border-cyan-500/30 transition-all flex gap-3 relative overflow-hidden">
      {/* Ranking position tag */}
      {position ? (
        <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded-md bg-slate-950/90 border border-amber-400/50 text-amber-300 text-[10px] font-black shadow-sm">
          #{position}
        </div>
      ) : null}

      {/* Product Image */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-800">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            <ShoppingBag className="w-8 h-8" />
          </div>
        )}

        {product.discountPercent ? (
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-rose-600/90 text-white text-[9px] font-black">
            -{product.discountPercent}%
          </div>
        ) : null}

        {product.video?.url ? (
          <div className="absolute top-1 right-1 p-1 rounded-full bg-fuchsia-600/90 text-white shadow" title="Possui vídeo">
            <Play className="w-2.5 h-2.5 fill-current" />
          </div>
        ) : null}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0 flex flex-col justify-between space-y-1">
        <div>
          {/* Title */}
          <h3 className="font-extrabold text-xs text-white leading-snug line-clamp-2">
            {product.title}
          </h3>

          {/* Vendas & Rating */}
          <div className="flex items-center gap-2 mt-1 text-[11px] flex-wrap">
            <span className="font-black text-cyan-300">
              {compactNumber(product.soldCount)} vendidos
            </span>

            {product.rating ? (
              <span className="font-bold text-amber-300 flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-current text-amber-400" />
                {product.rating}
              </span>
            ) : null}
          </div>

          {/* Ganho Afiliado / Comissão */}
          {product.estimatedCommissionCents ? (
            <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black">
              Ganhe {formatMoney(product.estimatedCommissionCents, product.currencySymbol)}
            </div>
          ) : product.commissionRatePercent ? (
            <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black">
              Comissão {product.commissionRatePercent}%
            </div>
          ) : null}

          {/* Price & Score Geração Z Pro */}
          <div className="flex items-center justify-between gap-2 mt-1 flex-wrap">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-black text-emerald-300">
                {formatMoney(product.priceCents, product.currencySymbol)}
              </span>
              {product.originalPriceCents && product.originalPriceCents > (product.priceCents || 0) ? (
                <span className="text-[10px] text-slate-500 line-through">
                  {formatMoney(product.originalPriceCents, product.currencySymbol)}
                </span>
              ) : null}
            </div>

            {product.score !== undefined && product.score !== null ? (
              <span className="text-[10px] font-black text-purple-300 bg-purple-950/80 border border-purple-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-amber-300 fill-current" />
                Score: {product.score}
              </span>
            ) : null}
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-1 text-[10px]">
          <div className="truncate max-w-[90px] text-[10px] text-slate-400">
            {product.sellerName || 'TikTok Shop'}
          </div>

          <div className="flex items-center gap-1">
            {product.video ? (
              <>
                <button
                  type="button"
                  onClick={() => onOpenScriptModal?.(product)}
                  className="px-2 py-1 rounded bg-fuchsia-500/20 text-fuchsia-300 font-bold border border-fuchsia-500/30 hover:bg-fuchsia-500/30"
                  title="Gerar Roteiro"
                >
                  Roteiro
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAnalysisModal?.(product)}
                  className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30 hover:bg-cyan-500/30"
                  title="Analisar"
                >
                  Analisar
                </button>
              </>
            ) : null}

            {product.productUrl ? (
              <a
                href={product.productUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-1 rounded bg-slate-800 text-slate-200 hover:text-white font-bold border border-slate-700 flex items-center gap-0.5"
              >
                Ver <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
};

/* Desktop Full Card */
const ProductCard: React.FC<{
  product: ProductMinerProduct;
  position?: number;
  rankingSort?: ProductRankingSort;
  isMentor?: boolean;
  onOpenScriptModal?: (p: ProductMinerProduct) => void;
  onOpenAnalysisModal?: (p: ProductMinerProduct) => void;
  onOpenDownloadModal?: (p: ProductMinerProduct) => void;
}> = ({
  product,
  position,
  rankingSort,
  isMentor,
  onOpenScriptModal,
  onOpenAnalysisModal,
  onOpenDownloadModal,
}) => {
  const [linkCopied, setLinkCopied] = useState(false);
  const show24h = product.sales24h !== undefined && product.sales24h !== null;
  const show7d = product.sales7d !== undefined && product.sales7d !== null;
  const isSpikingRanking = rankingSort === 'spiking';
  const isVideoPrepared = Boolean(product.videoDownload?.isPrepared);

  const handleCopyVideoLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.video?.url) {
      navigator.clipboard.writeText(product.video.url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  return (
    <article className="group rounded-2xl border border-cyan-500/20 bg-slate-950/70 overflow-hidden shadow-lg shadow-cyan-950/10 hover:border-cyan-400/45 transition-all flex flex-col h-full">
      <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden shrink-0">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">
            <ShoppingBag className="w-10 h-10" />
          </div>
        )}

        {position ? (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-slate-950/90 border border-amber-400/40 text-amber-300 text-xs font-black">
            #{position}
          </div>
        ) : null}

        {product.discountPercent ? (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-rose-500/90 text-white text-xs font-black">
            -{product.discountPercent}%
          </div>
        ) : null}

        {isSpikingRanking && show24h ? (
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-orange-500/95 text-white text-[11px] font-black flex items-center gap-1">
            <Flame className="w-3 h-3 fill-current" /> DISPARANDO
          </div>
        ) : product.video?.url ? (
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-fuchsia-500/90 text-white text-[11px] font-bold flex items-center gap-1">
            <Play className="w-3 h-3 fill-current" /> Vídeo associado
          </div>
        ) : null}
      </div>

      <div className="p-4 space-y-3 flex-1 flex flex-col">
        {product.score !== undefined && product.score !== null ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-950/90 to-indigo-950/90 border border-purple-500/40 text-purple-200 text-xs font-semibold self-start shadow-sm">
            <Zap className="w-3.5 h-3.5 text-amber-300 fill-current" />
            <span>Score Geração Z Pro: <strong className="text-amber-300 font-black">{product.score}</strong>/100</span>
          </div>
        ) : null}

        <h3 className="font-extrabold text-sm text-white leading-snug line-clamp-2 min-h-[40px]">
          {product.title}
        </h3>

        {/* Ganho Afiliado / Comissão (se disponível) */}
        {product.estimatedCommissionCents ? (
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black self-start">
            Ganhe {formatMoney(product.estimatedCommissionCents, product.currencySymbol)} por venda
          </div>
        ) : product.commissionRatePercent ? (
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-black self-start">
            Comissão {product.commissionRatePercent}%
          </div>
        ) : null}

        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-lg font-black text-emerald-300">
              {formatMoney(product.priceCents, product.currencySymbol)}
            </div>

            {product.originalPriceCents && product.originalPriceCents > (product.priceCents || 0) ? (
              <div className="text-[11px] text-slate-500 line-through">
                {formatMoney(product.originalPriceCents, product.currencySymbol)}
              </div>
            ) : null}
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400">Vendas totais</div>
            <div className="font-black text-cyan-300">{compactNumber(product.soldCount)}</div>
          </div>
        </div>

        {(show24h || show7d) ? (
          <div className="grid grid-cols-2 gap-2">
            <div
              className={`rounded-lg border px-2.5 py-2 ${
                rankingSort === '24h' || rankingSort === 'spiking'
                  ? 'border-emerald-400/35 bg-emerald-500/10'
                  : 'border-slate-700/70 bg-slate-900/60'
              }`}
            >
              <div className="text-[10px] text-slate-500">≈ 24 horas</div>
              <div className="text-xs font-black text-emerald-300">
                {show24h ? `+${compactNumber(product.sales24h)}` : 'Coletando'}
              </div>
              {show24h ? (
                <div className="text-[10px] text-emerald-400/80">
                  {formatPercent(product.growth24hPercent)}
                </div>
              ) : null}
            </div>

            <div
              className={`rounded-lg border px-2.5 py-2 ${
                rankingSort === '7d'
                  ? 'border-violet-400/35 bg-violet-500/10'
                  : 'border-slate-700/70 bg-slate-900/60'
              }`}
            >
              <div className="text-[10px] text-slate-500">≈ 7 dias</div>
              <div className="text-xs font-black text-violet-300">
                {show7d ? `+${compactNumber(product.sales7d)}` : 'Coletando'}
              </div>
              {show7d ? (
                <div className="text-[10px] text-violet-400/80">
                  {formatPercent(product.growth7dPercent)}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg bg-slate-900/80 px-2.5 py-2 text-slate-300 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-amber-300" />
            {product.rating ?? '—'}
          </div>

          <div className="rounded-lg bg-slate-900/80 px-2.5 py-2 text-slate-300 flex items-center gap-1.5 min-w-0">
            <Store className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
            <span className="truncate">{product.sellerName || 'Loja'}</span>
          </div>
        </div>

        {product.video ? (
          <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-fuchsia-300 truncate">
                @{product.video.author || 'creator'}
              </span>

              {product.video.authorFollowers !== null &&
              product.video.authorFollowers !== undefined ? (
                <span className="text-[10px] text-slate-500">
                  {compactNumber(product.video.authorFollowers)} seguidores
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-5 gap-1 text-center text-[10px] text-slate-400">
              <span title="Views">
                <Eye className="w-3.5 h-3.5 mx-auto mb-1 text-cyan-300" />
                {compactNumber(product.video.views)}
              </span>

              <span title="Likes">
                <Heart className="w-3.5 h-3.5 mx-auto mb-1 text-rose-300" />
                {compactNumber(product.video.likes)}
              </span>

              <span title="Comentários">
                <MessageCircle className="w-3.5 h-3.5 mx-auto mb-1 text-violet-300" />
                {compactNumber(product.video.comments)}
              </span>

              <span title="Compartilhamentos">
                <Share2 className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-300" />
                {compactNumber(product.video.shares)}
              </span>

              <span title="Salvos">
                <Bookmark className="w-3.5 h-3.5 mx-auto mb-1 text-amber-300" />
                {compactNumber(product.video.saves)}
              </span>
            </div>

            {/* Video Action Buttons Area */}
            <div className="pt-2 border-t border-fuchsia-500/20 space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => onOpenScriptModal?.(product)}
                  className="py-1.5 px-2 rounded-lg bg-gradient-to-r from-fuchsia-600/30 to-purple-600/30 border border-fuchsia-500/40 text-fuchsia-200 hover:text-white font-black flex items-center justify-center gap-1 transition-all"
                >
                  <Sparkles className="w-3 h-3 text-fuchsia-300" />
                  ✨ Gerar Roteiro
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAnalysisModal?.(product)}
                  className="py-1.5 px-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:text-white font-bold flex items-center justify-center gap-1 transition-all"
                >
                  <BarChart3 className="w-3 h-3 text-cyan-300" />
                  🔍 Analisar
                </button>
              </div>

              <div className={`grid ${isMentor ? 'grid-cols-3' : 'grid-cols-2'} gap-1 text-[10px]`}>
                {product.video.url ? (
                  <a
                    href={product.video.url}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1 px-1.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 hover:text-white font-bold flex items-center justify-center gap-1 truncate"
                  >
                    <Play className="w-3 h-3 text-cyan-400" />
                    Assistir
                  </a>
                ) : null}

                <button
                  type="button"
                  onClick={handleCopyVideoLink}
                  className="py-1 px-1.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 hover:text-white font-bold flex items-center justify-center gap-1 truncate"
                >
                  {linkCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  {linkCopied ? 'Copiado' : 'Copiar'}
                </button>

                {isMentor ? (
                  <button
                    type="button"
                    onClick={() => onOpenDownloadModal?.(product)}
                    className={`py-1 px-1.5 rounded-md border font-bold flex items-center justify-center gap-1 truncate transition-all ${
                      isVideoPrepared
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                    title={
                      isVideoPrepared
                        ? 'Baixar vídeo (.mp4)'
                        : 'Preparar download do vídeo'
                    }
                  >
                    <Download className={`w-3 h-3 ${isVideoPrepared ? 'text-emerald-400' : 'text-amber-400'}`} />
                    {isVideoPrepared ? 'Baixar' : 'Preparar'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 min-h-[78px] flex items-center justify-center text-center">
            <span className="text-xs text-slate-500 font-medium">
              Sem vídeo associado
            </span>
          </div>
        )}

        <div className="flex gap-2 mt-auto pt-1">
          {product.productUrl ? (
            <a
              href={product.productUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 px-3 py-2 text-xs font-bold"
            >
              Produto <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
};


export const ProductMinerPage: React.FC<ProductMinerPageProps> = ({
  studentCode,
  canRefresh = false,
}) => {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<ProductMinerProduct[]>([]);
  const [ranking, setRanking] = useState<ProductMinerProduct[]>([]);
  const [rankingMeta, setRankingMeta] = useState<ProductRankingMeta | null>(null);
  const [rankingSort, setRankingSort] = useState<ProductRankingSort>('opportunities');

  const [selectedClassification, setSelectedClassification] = useState<ClassificationType>('best_sellers');

  const [mode, setModeState] = useState<'search' | 'ranking' | 'collector'>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('gzp_miner_mode');
      if (saved === 'search' || saved === 'ranking' || saved === 'collector') {
        return saved;
      }
    }
    return 'search';
  });

  const setMode = (newMode: 'search' | 'ranking' | 'collector') => {
    setModeState(newMode);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('gzp_miner_mode', newMode);
    }
  };

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [error, setError] = useState('');

  const [credits, setCredits] = useState<{
    used: number;
    remaining: number | null;
    fromCache: boolean;
    source: ProductSearchSource;
    needsRefresh: boolean;
  } | null>(null);

  // Coletor state
  const [collectorCategories, setCollectorCategories] = useState<CollectorCategoryStat[]>([]);
  const [collectorLoading, setCollectorLoading] = useState(false);
  const [refreshingCategory, setRefreshingCategory] = useState<string | null>(null);
  const [confirmModalCategory, setConfirmModalCategory] = useState<string | null>(null);
  const [collectorNotice, setCollectorNotice] = useState<string | null>(null);

  // Atualização Diária da Base State
  const [dailyStatus, setDailyStatus] = useState<DailyRefreshStatus | null>(null);
  const [isDailyRefreshing, setIsDailyRefreshing] = useState(false);
  const [showDailyConfirmModal, setShowDailyConfirmModal] = useState(false);

  // Coletor multipágina
  const [selectedMaxProducts, setSelectedMaxProducts] = useState<number>(90);

  // Local Ranking Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [hasVideoOnly, setHasVideoOnly] = useState<boolean>(false);
  const [viralVideoOnly, setViralVideoOnly] = useState<boolean>(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  // Modals state
  const [scriptModalProduct, setScriptModalProduct] = useState<ProductMinerProduct | null>(null);
  const [analysisModalProduct, setAnalysisModalProduct] = useState<ProductMinerProduct | null>(null);
  const [downloadModalProduct, setDownloadModalProduct] = useState<ProductMinerProduct | null>(null);

  useEffect(() => {
    if (mode !== 'ranking') return;

    setRankingLoading(true);
    setError('');

    loadProductRanking(studentCode, 150, rankingSort)
      .then((data) => {
        setRanking(data.products || []);
        setRankingMeta(data.meta || null);
      })
      .catch((err) => setError(err?.message || 'Falha ao carregar ranking.'))
      .finally(() => setRankingLoading(false));
  }, [mode, rankingSort, studentCode]);

  /* Unified Display List applying Category Filter + Classification Order */
  const displayProducts = useMemo(() => {
    let list = mode === 'ranking' ? ranking : products;

    // 1. Filter by TikTok category
    list = list.filter((p) => matchesCategoryFilter(p.category, selectedCategory));

    // 2. Filter by video options
    if (hasVideoOnly) {
      list = list.filter((p) => Boolean(p.video?.url));
    }
    if (viralVideoOnly) {
      list = list.filter((p) => Boolean(p.video && (p.video.views ?? 0) >= 1000000));
    }

    // 3. Sort by classification choice
    const copy = [...list];
    if (selectedClassification === 'best_sellers') {
      copy.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
    } else if (selectedClassification === 'top_rated') {
      copy.sort((a, b) => {
        const rateDiff = (b.rating || 0) - (a.rating || 0);
        if (Math.abs(rateDiff) > 0.01) return rateDiff;
        return (b.soldCount || 0) - (a.soldCount || 0);
      });
    } else if (selectedClassification === 'trending') {
      copy.sort((a, b) => {
        const g24b = b.growth24hPercent ?? b.sales24h ?? 0;
        const g24a = a.growth24hPercent ?? a.sales24h ?? 0;
        if (g24b !== g24a) return g24b - g24a;
        return (b.soldCount || 0) - (a.soldCount || 0);
      });
    } else if (selectedClassification === 'most_searched') {
      copy.sort((a, b) => {
        const aScore = (a.trendScore || 0) + (a.video?.views ? Math.log10(a.video.views) : 0);
        const bScore = (b.trendScore || 0) + (b.video?.views ? Math.log10(b.video.views) : 0);
        if (bScore !== aScore) return bScore - aScore;
        return (b.soldCount || 0) - (a.soldCount || 0);
      });
    } else if (selectedClassification === 'editors_choice') {
      copy.sort((a, b) => {
        const scoreDiff = (b.score || 0) - (a.score || 0);
        if (scoreDiff !== 0) return scoreDiff;
        return (b.soldCount || 0) - (a.soldCount || 0);
      });
    }

    return copy;
  }, [products, ranking, mode, selectedCategory, hasVideoOnly, viralVideoOnly, selectedClassification]);

  const loadDailyStatus = async () => {
    if (!canRefresh) return;
    try {
      const st = await fetchDailyRefreshStatus(studentCode);
      setDailyStatus(st);
      if (st?.isCurrentlyRunning) {
        setIsDailyRefreshing(true);
      } else {
        setIsDailyRefreshing(false);
      }
    } catch {
      // ignore
    }
  };

  const loadCategories = () => {
    if (!canRefresh) return;

    setCollectorLoading(true);

    fetchCollectorCategories(studentCode)
      .then((cats) => setCollectorCategories(cats))
      .catch((err) => setError(err?.message || 'Falha ao carregar categorias do coletor.'))
      .finally(() => setCollectorLoading(false));

    loadDailyStatus();
  };

  useEffect(() => {
    if (mode === 'collector' && canRefresh) {
      loadCategories();
    }
  }, [mode, canRefresh, studentCode]);

  useEffect(() => {
    if (!isDailyRefreshing || !canRefresh) return;
    const interval = setInterval(() => {
      loadDailyStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [isDailyRefreshing, canRefresh, studentCode]);

  const handleStartDailyRefresh = async () => {
    setShowDailyConfirmModal(false);
    setIsDailyRefreshing(true);
    setError('');
    setCollectorNotice(null);

    try {
      const result = await runDailyRefresh(studentCode);
      setDailyStatus(result);
      setIsDailyRefreshing(false);

      const notice = `Atualização Diária concluída! ${result.categoriesProcessed} de ${result.totalCategories} categorias processadas (${result.uniqueProductsCount} produtos únicos, ${result.creditsUsed} créditos utilizados).`;
      setCollectorNotice(notice);
      loadCategories();
    } catch (err: any) {
      setIsDailyRefreshing(false);
      setError(err?.message || 'Falha ao executar atualização diária da base.');
      loadDailyStatus();
    }
  };

  const handleConfirmCategoryCollect = async () => {
    if (!confirmModalCategory) return;

    const cat = confirmModalCategory;

    setRefreshingCategory(cat);
    setError('');
    setCollectorNotice(null);

    try {
      const res = await refreshProducts(
        studentCode,
        cat,
        selectedMaxProducts,
      );

      const count =
        res.uniqueProductsCount ??
        res.products?.length ??
        0;

      const pages =
        res.pagesConsulted ??
        Math.ceil(selectedMaxProducts / 30);

      const creditsUsed =
        res.creditsUsed ??
        pages;

      let notice =
        `Coleta concluída para ${cat}! ` +
        `${count} produtos únicos coletados em ${pages} ` +
        `${pages === 1 ? 'página' : 'páginas'} ` +
        `(${creditsUsed} ${creditsUsed === 1 ? 'crédito utilizado' : 'créditos utilizados'}).`;

      if (res.partialError) {
        notice += ` (Aviso: ${res.partialError})`;
      }

      setCollectorNotice(notice);
      setConfirmModalCategory(null);
      loadCategories();
    } catch (err: any) {
      setError(
        err?.message ||
          `Falha ao coletar produtos da categoria ${cat}.`,
      );
    } finally {
      setRefreshingCategory(null);
    }
  };

  const runSearch = async (
    targetQuery = query,
    targetPage = 1,
    refresh = false,
  ) => {
    const clean = targetQuery.trim();

    if (clean.length === 1) return;

    setMode('search');
    setLoading(true);
    setError('');

    try {
      const data = refresh
        ? await refreshProducts(studentCode, clean, targetPage)
        : await searchProducts(studentCode, clean, targetPage);

      setQuery(clean);
      setProducts(data.products || []);
      setPage(targetPage);
      setHasMore(Boolean(data.hasMore));

      setCredits({
        used: data.creditsUsed,
        remaining: data.creditsRemaining,
        fromCache: data.fromCache,
        source: data.source,
        needsRefresh: Boolean(data.needsRefresh),
      });
    } catch (err: any) {
      setError(
        err?.message ||
          'Não foi possível buscar produtos agora.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'search' && products.length === 0 && !loading) {
      runSearch('', 1, false);
    }
  }, [mode]);

  const activeFilterCount = (selectedCategory !== 'Todos' ? 1 : 0) + (hasVideoOnly ? 1 : 0) + (viralVideoOnly ? 1 : 0);

  return (
    <section className="space-y-4 pb-12">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-[#071a28]/95 via-[#07131f]/95 to-[#040b13]/95 p-4 sm:p-5 shadow-xl shadow-cyan-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-black uppercase tracking-[0.18em]">
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-current" />
              TikTok Shop Brasil
            </div>

            <h1 className="mt-1 text-xl sm:text-2xl md:text-3xl font-black text-white">
              Minerar Produtos
            </h1>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="px-2.5 py-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 font-bold">
              🇧🇷 Região BR
            </span>

            <span className="px-2.5 py-1 rounded-lg border border-cyan-500/25 bg-cyan-500/10 text-cyan-300 font-bold">
              30 prod/pág
            </span>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' &&
                runSearch(query, 1, false)
              }
              placeholder="Ex.: beleza, air fryer, vestido, relógio..."
              className="w-full h-10 sm:h-11 rounded-xl border border-slate-700/80 bg-slate-950/90 pl-10 pr-4 text-xs sm:text-sm text-white outline-none focus:border-cyan-400/60"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => runSearch(query, 1, false)}
              disabled={loading || query.trim().length === 1}
              className="flex-1 sm:flex-none h-10 sm:h-11 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs sm:text-sm font-black disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-950/30"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              Pesquisar
            </button>

            {canRefresh ? (
              <button
                onClick={() => runSearch(query, 1, true)}
                disabled={loading || query.trim().length < 2}
                className="h-10 sm:h-11 px-3 rounded-xl border border-amber-400/35 bg-amber-500/10 text-amber-300 text-xs font-black disabled:opacity-50 flex items-center justify-center gap-1.5 hover:bg-amber-500/20"
                title="Esta ação consulta a SocialCrawl e pode consumir 1 crédito."
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    loading ? 'animate-spin' : ''
                  }`}
                />
                <span className="hidden md:inline">SocialCrawl • 1 crédito</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 1 — CLASSIFICAÇÕES DE PRODUTOS (TIKTOK SHOP STYLE) */}
      {/* ================================================== */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 sm:p-4 shadow-lg space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Classificações de Produtos
          </span>
          <span className="text-[10px] text-slate-500 font-medium">Inspirado no TikTok Shop</span>
        </div>

        {/* Horizontal scrollable row of classification icons (~4 visible on mobile + peek of 5th) */}
        <div className="flex items-start justify-between sm:justify-start gap-2 sm:gap-5 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x">
          {CLASSIFICATIONS.map((c) => {
            const isActive = selectedClassification === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedClassification(c.id)}
                className="flex flex-col items-center shrink-0 w-[78px] sm:w-[90px] md:w-auto group focus:outline-none snap-start"
              >
                <ClassificationIconComponent item={c} isActive={isActive} />
                <span
                  className={`text-[11px] font-bold text-center mt-1.5 leading-tight max-w-[80px] transition-colors ${
                    isActive ? 'text-amber-300 font-black' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================================================== */}
      {/* 2 — CATEGORIAS DO TIKTOK SHOP                      */}
      {/* ================================================== */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400">Categorias:</span>
          {selectedCategory !== 'Todos' ? (
            <button
              onClick={() => setSelectedCategory('Todos')}
              className="text-[10px] font-bold text-rose-400 hover:underline"
            >
              Ver Todas
            </button>
          ) : null}
        </div>

        {/* Categories Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x">
          {TIKTOK_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.filterKey;
            return (
              <button
                key={cat.filterKey}
                type="button"
                onClick={() => setSelectedCategory(cat.filterKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border transition-all snap-start ${
                  isActive
                    ? 'border-cyan-400/60 bg-gradient-to-r from-cyan-500/30 to-blue-600/30 text-cyan-200 shadow-md shadow-cyan-950/40 font-black'
                    : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================================================== */}
      {/* 3 — MODES & ADVANCED FILTERS BAR                   */}
      {/* ================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-xl border border-slate-800 bg-slate-950/80 self-start">
          <button
            onClick={() => setMode('search')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              mode === 'search'
                ? 'bg-cyan-500/20 text-cyan-300 font-black border border-cyan-500/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Pesquisa
          </button>

          <button
            onClick={() => setMode('ranking')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              mode === 'ranking'
                ? 'bg-amber-500/20 text-amber-300 font-black border border-amber-500/30'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Ranking
          </button>

          {canRefresh ? (
            <button
              onClick={() => setMode('collector')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                mode === 'collector'
                  ? 'bg-purple-500/20 text-purple-300 font-black border border-purple-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Coletor
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {/* Advanced Filters Toggle Button */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              showAdvancedFilters || activeFilterCount > 0
                ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-300'
                : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtros Avançados</span>
            {activeFilterCount > 0 ? (
              <span className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            ) : null}
            {showAdvancedFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {credits && mode === 'search' ? (
            <span className="text-[11px] text-slate-500 hidden md:inline">
              {credits.source === 'provider' ? `${credits.used} crédito` : '0 crédito'}
            </span>
          ) : null}
        </div>
      </div>

      {/* Advanced Filters Drawer Panel */}
      {showAdvancedFilters ? (
        <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/90 p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-black text-cyan-300 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Filtros e Métricas Adicionais
            </span>
            <button
              onClick={() => {
                setSelectedCategory('Todos');
                setHasVideoOnly(false);
                setViralVideoOnly(false);
              }}
              className="text-[11px] text-rose-400 hover:underline font-bold"
            >
              Limpar Todos
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sort mode selector for ranking */}
            {mode === 'ranking' ? (
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 font-bold">Métrica do Ranking:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {RANKING_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setRankingSort(f.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                        rankingSort === f.id
                          ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                          : 'border-slate-800 bg-slate-900 text-slate-400'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Video filters */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 font-bold">Filtros de Vídeo:</span>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setHasVideoOnly((p) => !p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    hasVideoOnly
                      ? 'border-fuchsia-500/50 bg-fuchsia-500/20 text-fuchsia-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  <Play className="w-3 h-3 text-fuchsia-400 fill-current" />
                  Apenas com vídeo
                </button>

                <button
                  type="button"
                  onClick={() => setViralVideoOnly((p) => !p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    viralVideoOnly
                      ? 'border-amber-400/50 bg-amber-500/20 text-amber-300'
                      : 'border-slate-800 bg-slate-900 text-slate-400'
                  }`}
                >
                  <Flame className="w-3 h-3 text-amber-400 fill-current" />
                  Vídeo viral (1M+ views)
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      ) : null}

      {/* ================================================== */}
      {/* 4 — LISTA / FEED DE PRODUTOS                       */}
      {/* ================================================== */}
      {mode === 'search' || mode === 'ranking' ? (
        <>
          {(loading || rankingLoading) ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
          ) : null}

          {!(loading || rankingLoading) && displayProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 py-16 px-5 text-center space-y-2">
              <ShoppingBag className="w-10 h-10 text-slate-700 mx-auto" />
              <h2 className="font-bold text-slate-300">
                Nenhum produto encontrado com os filtros atuais.
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Tente selecionar outra categoria ou classificação, ou realize uma pesquisa diferente no campo acima.
              </p>
              {(selectedCategory !== 'Todos' || hasVideoOnly || viralVideoOnly) ? (
                <button
                  onClick={() => {
                    setSelectedCategory('Todos');
                    setHasVideoOnly(false);
                    setViralVideoOnly(false);
                  }}
                  className="mt-2 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold"
                >
                  Remover Filtros
                </button>
              ) : null}
            </div>
          ) : null}

          {!(loading || rankingLoading) && displayProducts.length > 0 ? (
            <>
              {/* Mobile View: Compact Vertical List (TikTok Shop inspired layout) */}
              <div className="block sm:hidden space-y-2.5">
                {displayProducts.map((product, index) => (
                  <MobileProductCard
                    key={product.productId}
                    product={product}
                    position={index + 1}
                    rankingSort={rankingSort}
                    isMentor={canRefresh}
                    onOpenScriptModal={(p) => setScriptModalProduct(p)}
                    onOpenAnalysisModal={(p) => setAnalysisModalProduct(p)}
                    onOpenDownloadModal={(p) => setDownloadModalProduct(p)}
                  />
                ))}
              </div>

              {/* Desktop View: Full Rich Grid */}
              <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {displayProducts.map((product, index) => (
                  <ProductCard
                    key={product.productId}
                    product={product}
                    position={index + 1}
                    rankingSort={rankingSort}
                    isMentor={canRefresh}
                    onOpenScriptModal={(p) => setScriptModalProduct(p)}
                    onOpenAnalysisModal={(p) => setAnalysisModalProduct(p)}
                    onOpenDownloadModal={(p) => setDownloadModalProduct(p)}
                  />
                ))}
              </div>

              {/* Pagination controls for Search mode */}
              {mode === 'search' ? (
                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    disabled={page <= 1}
                    onClick={() => runSearch(query, page - 1, false)}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 disabled:opacity-30 hover:bg-slate-800"
                  >
                    Anterior
                  </button>

                  <span className="text-xs text-slate-500">
                    Página {page}
                  </span>

                  <button
                    disabled={!hasMore}
                    onClick={() => runSearch(query, page + 1, false)}
                    className="px-4 py-2 rounded-xl border border-cyan-500/30 text-xs font-bold text-cyan-300 disabled:opacity-30 hover:bg-cyan-500/10"
                  >
                    Próxima
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </>
      ) : mode === 'collector' && canRefresh ? (
        /* PAINEL DO COLETOR (MENTOR ONLY) */
        <div className="space-y-5">
          <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-950/80 to-slate-950/90 p-5 md:p-6 shadow-xl shadow-purple-950/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-purple-300 text-xs font-black uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  Painel do Coletor • Mentor
                </div>

                <h2 className="mt-1 text-xl md:text-2xl font-black text-white">
                  Base Geração Z Pro
                </h2>

                <p className="mt-1 text-xs md:text-sm text-slate-300">
                  Os alunos consultam estes dados sem consumir créditos.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-3 py-2 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-300 font-bold">
                  8 Categorias Monitoradas
                </span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-300">
                Quantidade por Categoria (Individual):
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { count: 30, credits: 'até 1 crédito' },
                  { count: 90, credits: 'até 3 créditos' },
                  { count: 150, credits: 'até 5 créditos' },
                  { count: 300, credits: 'até 10 créditos' },
                ].map((opt) => (
                  <button
                    key={opt.count}
                    onClick={() => setSelectedMaxProducts(opt.count)}
                    disabled={Boolean(refreshingCategory) || isDailyRefreshing}
                    className={`px-3 py-2 rounded-xl text-xs font-black border transition-all text-center ${
                      selectedMaxProducts === opt.count
                        ? 'border-purple-400 bg-purple-500/25 text-purple-200 shadow-md shadow-purple-950/40'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <div>{opt.count} produtos</div>
                    <div className="text-[10px] font-normal opacity-80">
                      {opt.credits}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card Especial: Atualização Diária da Base */}
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-slate-950/80 to-slate-950/90 p-5 md:p-6 shadow-xl shadow-amber-950/10 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-amber-300 text-xs font-black uppercase tracking-wider">
                  <RefreshCw className={`w-4 h-4 text-amber-400 ${isDailyRefreshing ? 'animate-spin' : ''}`} />
                  Atualização Diária da Base • 8 Categorias
                </div>
                <h3 className="mt-1 text-lg font-black text-white">
                  Atualizar Todas as Categorias em Sequência
                </h3>
                <p className="mt-1 text-xs text-slate-300 max-w-2xl">
                  Atualiza as 8 categorias oficiais (Beleza, Casa, Moda, Cozinha, Eletrônicos, Fitness, Bebê, Pet) em lote, coletando até 90 produtos por categoria (3 páginas por categoria) e consumindo até 24 créditos SocialCrawl.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDailyConfirmModal(true)}
                disabled={isDailyRefreshing || Boolean(dailyStatus?.isCooldownActive) || Boolean(refreshingCategory)}
                className={`px-5 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                  isDailyRefreshing
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-wait'
                    : dailyStatus?.isCooldownActive
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 opacity-90'
                    : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-amber-950/40 hover:scale-[1.02]'
                }`}
              >
                {isDailyRefreshing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Atualizando base ({dailyStatus?.categoriesProcessed ?? 0}/8)...</span>
                  </>
                ) : dailyStatus?.isCooldownActive ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Base atualizada hoje ✅</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>🔄 Atualizar todas as categorias • até 24 créditos</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-amber-500/20 text-xs">
              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
                <div className="text-[11px] text-slate-400">Última atualização geral</div>
                <div className="font-bold text-slate-200 mt-0.5 truncate">
                  {dailyStatus?.completedAt || dailyStatus?.startedAt
                    ? formatCollectionDate(dailyStatus.completedAt || dailyStatus.startedAt)
                    : 'Nenhuma realizada'}
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
                <div className="text-[11px] text-slate-400">Categorias processadas</div>
                <div className="font-extrabold text-amber-300 mt-0.5">
                  {dailyStatus ? `${dailyStatus.categoriesProcessed} / ${dailyStatus.totalCategories}` : '0 / 8'}
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
                <div className="text-[11px] text-slate-400">Próxima recomendada</div>
                <div className="font-bold text-cyan-300 mt-0.5 truncate">
                  {dailyStatus?.isCooldownActive && dailyStatus.cooldownRemainingSeconds > 0
                    ? `Em ~${Math.ceil(dailyStatus.cooldownRemainingSeconds / 3600)} horas`
                    : 'Pronta para atualizar'}
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-3">
                <div className="text-[11px] text-slate-400">Status atual</div>
                <div className="font-bold mt-0.5 truncate">
                  {isDailyRefreshing ? (
                    <span className="text-amber-300 animate-pulse">🔄 Em andamento ({dailyStatus?.currentCategory || 'processando'})</span>
                  ) : dailyStatus?.status === 'COMPLETED' ? (
                    <span className="text-emerald-300">Base Ativa ✅</span>
                  ) : dailyStatus?.status === 'PARTIAL_FAILED' ? (
                    <span className="text-amber-400">Atualização Parcial ⚠️</span>
                  ) : (
                    <span className="text-slate-400">Pronta para atualização</span>
                  )}
                </div>
              </div>
            </div>

            {dailyStatus?.isCooldownActive ? (
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>A base de dados já passou pela atualização diária recomendada. A proteção de 24 horas está ativa no backend.</span>
              </div>
            ) : null}
          </div>

          {collectorNotice ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{collectorNotice}</span>
              </div>

              <button
                onClick={() => setCollectorNotice(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : null}

          {collectorLoading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {collectorCategories.map((cat) => (
                <div
                  key={cat.category}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 flex flex-col justify-between space-y-4 hover:border-purple-500/40 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                          {getCategoryIcon(cat.category)}
                        </div>

                        <h3 className="font-extrabold text-base text-white">
                          {cat.category}
                        </h3>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${
                          cat.status === 'Ativa'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                            : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                        }`}
                      >
                        {cat.status === 'Ativa'
                          ? 'Base Ativa'
                          : 'Pendente'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-slate-300 font-bold">
                        {cat.productCount}{' '}
                        {cat.productCount === 1
                          ? 'produto armazenado'
                          : 'produtos armazenados'}
                      </div>

                      <div className="text-[11px] text-slate-400 font-medium">
                        {formatCollectionDate(cat.lastCollectedAt)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setConfirmModalCategory(cat.category)}
                    disabled={refreshingCategory === cat.category}
                    className="w-full py-2.5 px-3 rounded-xl border border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {refreshingCategory === cat.category ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Coletando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        Atualizar até {selectedMaxProducts} • máx.{' '}
                        {selectedMaxProducts === 30
                          ? '1 crédito'
                          : `${Math.ceil(selectedMaxProducts / 30)} créditos`}
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Confirmation Modal for Individual Category Collection */}
      {confirmModalCategory ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-purple-500/30 bg-slate-950 p-6 shadow-2xl shadow-purple-950/30 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
                  <AlertCircle className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="font-extrabold text-lg text-white">
                    Confirmar Coleta
                  </h3>

                  <p className="text-xs text-purple-300 font-medium">
                    Categoria: {confirmModalCategory}
                  </p>
                </div>
              </div>

              <button
                onClick={() => !refreshingCategory && setConfirmModalCategory(null)}
                disabled={Boolean(refreshingCategory)}
                className="text-slate-500 hover:text-white disabled:opacity-30"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
              <p className="text-sm font-bold text-amber-200 leading-snug">
                Esta coleta buscará até {selectedMaxProducts} produtos da TikTok Shop Brasil e poderá consumir até {Math.ceil(selectedMaxProducts / 30)} {Math.ceil(selectedMaxProducts / 30) === 1 ? 'crédito' : 'créditos'} da SocialCrawl. Continuar?
              </p>

              <p className="text-xs text-slate-400 leading-normal">
                A requisição consultará sequencialmente até {Math.ceil(selectedMaxProducts / 30)} {Math.ceil(selectedMaxProducts / 30) === 1 ? 'página' : 'páginas'} de resultados para a categoria <strong className="text-white">{confirmModalCategory}</strong> na região <strong className="text-white">BR</strong> e atualizará o banco de dados do Geração Z Pro.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setConfirmModalCategory(null)}
                disabled={Boolean(refreshingCategory)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs font-bold disabled:opacity-30"
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirmCategoryCollect}
                disabled={Boolean(refreshingCategory)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-950/30 disabled:opacity-50"
              >
                {refreshingCategory ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Coletando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Confirmar e Atualizar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Confirmation Modal for Daily Refresh */}
      {showDailyConfirmModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-slate-950 p-6 shadow-2xl shadow-amber-950/40 space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  <AlertCircle className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="font-extrabold text-lg text-white">
                    Confirmar Atualização Diária
                  </h3>
                  <p className="text-xs text-amber-300 font-medium">
                    Coleta sequencial das 8 categorias
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDailyConfirmModal(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
              <p className="text-sm font-bold text-amber-200 leading-snug">
                Esta ação atualizará as 8 categorias oficiais do Geração Z Pro, utilizando até 90 produtos por categoria e podendo consumir até 24 créditos SocialCrawl. As categorias serão processadas uma por vez. Continuar?
              </p>

              <div className="text-xs text-slate-300 space-y-1.5 pt-2 border-t border-amber-500/20">
                <div>• <strong>Categorias:</strong> Beleza, Casa, Moda, Cozinha, Eletrônicos, Fitness, Bebê e Pet.</div>
                <div>• <strong>Profundidade:</strong> Até 90 produtos (3 páginas de 30) por categoria.</div>
                <div>• <strong>Consumo Máximo:</strong> Até 24 créditos (3 por categoria).</div>
                <div>• <strong>Proteção:</strong> Execução sequencial com progresso em tempo real e proteção de 24 horas no backend.</div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setShowDailyConfirmModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs font-bold"
              >
                Cancelar
              </button>

              <button
                onClick={handleStartDailyRefresh}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-950/30"
              >
                <RefreshCw className="w-4 h-4" />
                Confirmar Atualização
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Video & AI Modals */}
      <ScriptGeneratorModal
        isOpen={Boolean(scriptModalProduct)}
        onClose={() => setScriptModalProduct(null)}
        product={scriptModalProduct}
        studentCode={studentCode}
      />

      <VideoAnalysisModal
        isOpen={Boolean(analysisModalProduct)}
        onClose={() => setAnalysisModalProduct(null)}
        product={analysisModalProduct}
        onOpenScriptModal={(p) => setScriptModalProduct(p)}
      />

      <VideoDownloadModal
        isOpen={Boolean(downloadModalProduct)}
        onClose={() => setDownloadModalProduct(null)}
        product={downloadModalProduct}
        studentCode={studentCode}
        isMentor={canRefresh}
        onVideoPrepared={(productId, directUrl) => {
          setProducts((prev) =>
            prev.map((p) =>
              p.productId === productId
                ? { ...p, videoDownload: { isPrepared: true, directMediaUrl: directUrl, status: 'COMPLETED' } }
                : p
            )
          );
          setRanking((prev) =>
            prev.map((p) =>
              p.productId === productId
                ? { ...p, videoDownload: { isPrepared: true, directMediaUrl: directUrl, status: 'COMPLETED' } }
                : p
            )
          );
        }}
      />
    </section>
  );
};
