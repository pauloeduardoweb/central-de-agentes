import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Flame, ShoppingBag, Star, Store, ExternalLink, Play, Eye, Heart,
  MessageCircle, Share2, Bookmark, TrendingUp, Loader2, Database, Zap, RefreshCw,
  Layers, ShieldCheck, AlertCircle, CheckCircle2, X, Sparkles, Home, Shirt, Utensils,
  Cpu, Dumbbell, Baby, Dog,
} from 'lucide-react';
import {
  loadProductRanking,
  ProductMinerProduct,
  ProductRankingMeta,
  ProductRankingSort,
  searchProducts,
  refreshProducts,
  fetchCollectorCategories,
  type CollectorCategoryStat,
  type ProductSearchSource,
} from '../../services/productMinerApi';

interface ProductMinerPageProps {
  studentCode: string;
  canRefresh?: boolean;
}

const QUICK_SEARCHES = ['beleza', 'casa', 'moda', 'cozinha', 'eletrônicos', 'fitness', 'bebê', 'pet'];

const RANKING_FILTERS: Array<{ id: ProductRankingSort; label: string }> = [
  { id: 'total', label: 'Mais vendidos' },
  { id: '24h', label: 'Vendas 24h' },
  { id: '7d', label: 'Vendas 7 dias' },
  { id: 'spiking', label: '🔥 Disparando' },
];

function formatMoney(cents: number | null, symbol = 'R$') {
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

const ProductCard: React.FC<{
  product: ProductMinerProduct;
  position?: number;
  rankingSort?: ProductRankingSort;
}> = ({ product, position, rankingSort }) => {
  const show24h = product.sales24h !== undefined && product.sales24h !== null;
  const show7d = product.sales7d !== undefined && product.sales7d !== null;
  const isSpikingRanking = rankingSort === 'spiking';

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
        <h3 className="font-extrabold text-sm text-white leading-snug line-clamp-2 min-h-[40px]">
          {product.title}
        </h3>

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
          <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-3 space-y-2">
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

          {product.video?.url ? (
            <a
              href={product.video.url}
              target="_blank"
              rel="noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-500/25 px-3 py-2 text-xs font-bold"
            >
              Vídeo <Play className="w-3.5 h-3.5" />
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
  const [rankingSort, setRankingSort] = useState<ProductRankingSort>('total');
  const [mode, setMode] = useState<'search' | 'ranking' | 'collector'>('search');
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

  // Coletor multipágina: até 300 produtos por categoria
  const [selectedMaxProducts, setSelectedMaxProducts] = useState<number>(300);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => b.soldCount - a.soldCount),
    [products],
  );

  useEffect(() => {
    if (mode !== 'ranking') return;

    setRankingLoading(true);
    setError('');

    loadProductRanking(studentCode, 60, rankingSort)
      .then((data) => {
        setRanking(data.products || []);
        setRankingMeta(data.meta || null);
      })
      .catch((err) => setError(err?.message || 'Falha ao carregar ranking.'))
      .finally(() => setRankingLoading(false));
  }, [mode, rankingSort, studentCode]);

  const loadCategories = () => {
    if (!canRefresh) return;

    setCollectorLoading(true);

    fetchCollectorCategories(studentCode)
      .then((cats) => setCollectorCategories(cats))
      .catch((err) => setError(err?.message || 'Falha ao carregar categorias do coletor.'))
      .finally(() => setCollectorLoading(false));
  };

  useEffect(() => {
    if (mode === 'collector' && canRefresh) {
      loadCategories();
    }
  }, [mode, canRefresh, studentCode]);

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

    if (clean.length < 2) return;

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

  return (
    <section className="space-y-5 pb-8">
      <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-[#071a28]/95 via-[#07131f]/95 to-[#040b13]/95 p-5 md:p-6 shadow-xl shadow-cyan-950/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-black uppercase tracking-[0.18em]">
              <Zap className="w-4 h-4" />
              TikTok Shop Brasil
            </div>

            <h1 className="mt-2 text-2xl md:text-3xl font-black text-white">
              Minerar Produtos
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Descubra produtos, vendas, lojas e vídeos associados sem sair do Geração Z Pro.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 font-bold">
              🇧🇷 Região BR fixa
            </span>

            <span className="px-3 py-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300 font-bold">
              30 produtos/página
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-col md:flex-row gap-2">
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
              className="w-full h-11 rounded-xl border border-slate-700/80 bg-slate-950/90 pl-10 pr-4 text-sm text-white outline-none focus:border-cyan-400/60"
            />
          </div>

          <button
            onClick={() => runSearch(query, 1, false)}
            disabled={loading || query.trim().length < 2}
            className="h-11 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/30"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4" />
            )}

            Pesquisar no banco
          </button>

          {canRefresh ? (
            <button
              onClick={() => runSearch(query, 1, true)}
              disabled={loading || query.trim().length < 2}
              className="h-11 px-4 rounded-xl border border-amber-400/35 bg-amber-500/10 text-amber-300 text-xs font-black disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-amber-500/20"
              title="Esta ação consulta a SocialCrawl e pode consumir 1 crédito."
            >
              <RefreshCw
                className={`w-4 h-4 ${
                  loading ? 'animate-spin' : ''
                }`}
              />

              Atualizar SocialCrawl • 1 crédito
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex gap-2 flex-wrap">
          {QUICK_SEARCHES.map((item) => (
            <button
              key={item}
              onClick={() => runSearch(item, 1, false)}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/70 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/30 text-xs font-semibold capitalize"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-xl border border-slate-800 bg-slate-950/70 self-start">
          <button
            onClick={() => setMode('search')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              mode === 'search'
                ? 'bg-cyan-500/20 text-cyan-300'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Pesquisa
          </button>

          <button
            onClick={() => setMode('ranking')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
              mode === 'ranking'
                ? 'bg-amber-500/20 text-amber-300'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Ranking
          </button>

          {canRefresh ? (
            <button
              onClick={() => setMode('collector')}
              className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                mode === 'collector'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Coletor Geração Z Pro
            </button>
          ) : null}
        </div>

        {credits && mode === 'search' ? (
          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
            <Database className="w-3.5 h-3.5" />

            {credits.source === 'provider'
              ? `${credits.used} crédito usado na atualização`
              : credits.source === 'database'
                ? 'Banco Geração Z Pro: 0 crédito'
                : credits.source === 'cache'
                  ? 'Dados já coletados: 0 crédito'
                  : 'Nenhuma chamada externa: 0 crédito'}

            {credits.remaining !== null ? (
              <span>• {credits.remaining} restantes</span>
            ) : null}

            {credits.needsRefresh && canRefresh ? (
              <span className="text-amber-400">
                • atualização disponível
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      {mode === 'ranking' ? (
        <div className="rounded-2xl border border-slate-800/90 bg-slate-950/55 p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex gap-2 flex-wrap">
            {RANKING_FILTERS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setRankingSort(filter.id)}
                disabled={rankingLoading}
                className={`px-3 py-2 rounded-lg text-xs font-black border transition-all ${
                  rankingSort === filter.id
                    ? 'border-amber-400/40 bg-amber-500/15 text-amber-300'
                    : 'border-slate-700 bg-slate-900/70 text-slate-400 hover:text-white'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {rankingMeta ? (
            <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                {rankingMeta.trackedProducts} produtos monitorados
              </span>

              <span>
                • {rankingMeta.with24h} com histórico 24h
              </span>

              <span>
                • {rankingMeta.with7d} com histórico 7d
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      ) : null}

      {mode === 'search' ? (
        <>
          {!loading && sortedProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 py-16 px-5 text-center">
              <ShoppingBag className="w-10 h-10 text-slate-700 mx-auto" />

              <h2 className="mt-3 font-bold text-slate-300">
                {query.trim()
                  ? 'Nenhum produto encontrado'
                  : 'Digite um produto ou nicho para começar'}
              </h2>

              {query.trim() ? (
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Ainda não temos dados coletados para esta pesquisa. A base é atualizada pelo Mentor.
                </p>
              ) : (
                <p className="text-xs text-slate-600 mt-1">
                  Pesquisar no banco do Geração Z Pro nunca consome créditos.
                </p>
              )}
            </div>
          ) : null}

          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            </div>
          ) : null}

          {!loading && sortedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {sortedProducts.map((product) => (
                <ProductCard
                  key={product.productId}
                  product={product}
                />
              ))}
            </div>
          ) : null}

          {!loading && sortedProducts.length > 0 ? (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                disabled={page <= 1}
                onClick={() =>
                  runSearch(query, page - 1, false)
                }
                className="px-4 py-2 rounded-lg border border-slate-700 text-xs font-bold text-slate-300 disabled:opacity-30"
              >
                Anterior
              </button>

              <span className="text-xs text-slate-500">
                Página {page}
              </span>

              <button
                disabled={!hasMore}
                onClick={() =>
                  runSearch(query, page + 1, false)
                }
                className="px-4 py-2 rounded-lg border border-cyan-500/30 text-xs font-bold text-cyan-300 disabled:opacity-30"
              >
                Próxima
              </button>
            </div>
          ) : null}
        </>
      ) : mode === 'ranking' ? (
        <>
          {rankingLoading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-300" />
            </div>
          ) : null}

          {!rankingLoading && ranking.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 py-16 px-5 text-center">
              <TrendingUp className="w-9 h-9 text-slate-700 mx-auto" />

              {rankingSort === 'total' ? (
                <p className="mt-3 text-sm text-slate-500">
                  Faça algumas buscas para alimentar o ranking.
                </p>
              ) : rankingSort === '7d' ? (
                <>
                  <p className="mt-3 text-sm font-bold text-slate-300">
                    Histórico de 7 dias ainda em formação.
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    O sistema já está guardando snapshots. Esse ranking aparece quando houver base histórica suficiente.
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm font-bold text-slate-300">
                    Histórico de 24 horas ainda em formação.
                  </p>

                  <p className="mt-1 text-xs text-slate-600">
                    Não é necessário gastar créditos só para preencher isso agora. O ranking aparece após novas coletas ao longo do tempo.
                  </p>
                </>
              )}
            </div>
          ) : null}

          {!rankingLoading && ranking.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {ranking.map((product, index) => (
                <ProductCard
                  key={product.productId}
                  product={product}
                  position={index + 1}
                  rankingSort={rankingSort}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : mode === 'collector' && canRefresh ? (
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
                Quantidade por Categoria:
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  {
                    count: 30,
                    credits: 'até 1 crédito',
                  },
                  {
                    count: 90,
                    credits: 'até 3 créditos',
                  },
                  {
                    count: 150,
                    credits: 'até 5 créditos',
                  },
                  {
                    count: 300,
                    credits: 'até 10 créditos',
                  },
                ].map((opt) => (
                  <button
                    key={opt.count}
                    onClick={() =>
                      setSelectedMaxProducts(opt.count)
                    }
                    disabled={Boolean(refreshingCategory)}
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
                    onClick={() =>
                      setConfirmModalCategory(cat.category)
                    }
                    disabled={
                      refreshingCategory === cat.category
                    }
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
                          : `${Math.ceil(
                              selectedMaxProducts / 30,
                            )} créditos`}
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

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
                onClick={() =>
                  !refreshingCategory &&
                  setConfirmModalCategory(null)
                }
                disabled={Boolean(refreshingCategory)}
                className="text-slate-500 hover:text-white disabled:opacity-30"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
              <p className="text-sm font-bold text-amber-200 leading-snug">
                Esta coleta buscará até {selectedMaxProducts}{' '}
                produtos da TikTok Shop Brasil e poderá consumir
                até {Math.ceil(selectedMaxProducts / 30)}{' '}
                {Math.ceil(selectedMaxProducts / 30) === 1
                  ? 'crédito'
                  : 'créditos'}{' '}
                da SocialCrawl. Continuar?
              </p>

              <p className="text-xs text-slate-400 leading-normal">
                A requisição consultará sequencialmente até{' '}
                {Math.ceil(selectedMaxProducts / 30)}{' '}
                {Math.ceil(selectedMaxProducts / 30) === 1
                  ? 'página'
                  : 'páginas'}{' '}
                de resultados para a categoria{' '}
                <strong className="text-white">
                  {confirmModalCategory}
                </strong>{' '}
                na região{' '}
                <strong className="text-white">BR</strong> e
                atualizará o banco de dados do Geração Z Pro.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() =>
                  setConfirmModalCategory(null)
                }
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
    </section>
  );
};
