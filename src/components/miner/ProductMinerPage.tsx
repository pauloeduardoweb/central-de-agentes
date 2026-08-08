import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Flame, ShoppingBag, Star, Store, ExternalLink, Play, Eye, Heart,
  MessageCircle, Share2, Bookmark, TrendingUp, Loader2, Database, Zap,
} from 'lucide-react';
import {
  loadProductRanking,
  ProductMinerProduct,
  searchProducts,
} from '../../services/productMinerApi';

interface ProductMinerPageProps {
  studentCode: string;
}

const QUICK_SEARCHES = ['beleza', 'casa', 'moda', 'cozinha', 'eletrônicos', 'fitness', 'bebê', 'pet'];

function formatMoney(cents: number | null, symbol = 'R$') {
  if (cents === null || cents === undefined) return '—';
  return `${symbol} ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function compactNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

const ProductCard: React.FC<{ product: ProductMinerProduct; position?: number }> = ({ product, position }) => {
  return (
    <article className="group rounded-2xl border border-cyan-500/20 bg-slate-950/70 overflow-hidden shadow-lg shadow-cyan-950/10 hover:border-cyan-400/45 transition-all">
      <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600"><ShoppingBag className="w-10 h-10" /></div>
        )}
        {position ? (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-slate-950/90 border border-amber-400/40 text-amber-300 text-xs font-black">#{position}</div>
        ) : null}
        {product.discountPercent ? (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-rose-500/90 text-white text-xs font-black">-{product.discountPercent}%</div>
        ) : null}
        {product.video?.url ? (
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-fuchsia-500/90 text-white text-[11px] font-bold flex items-center gap-1"><Play className="w-3 h-3 fill-current" /> Vídeo associado</div>
        ) : null}
      </div>

      <div className="p-4 space-y-3">
        <h3 className="font-extrabold text-sm text-white leading-snug line-clamp-2 min-h-[40px]">{product.title}</h3>

        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-lg font-black text-emerald-300">{formatMoney(product.priceCents, product.currencySymbol)}</div>
            {product.originalPriceCents && product.originalPriceCents > (product.priceCents || 0) ? (
              <div className="text-[11px] text-slate-500 line-through">{formatMoney(product.originalPriceCents, product.currencySymbol)}</div>
            ) : null}
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Vendas</div>
            <div className="font-black text-cyan-300">{compactNumber(product.soldCount)}</div>
          </div>
        </div>

        {product.sales24h !== undefined && product.sales24h !== null ? (
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-2">
            <TrendingUp className="w-3.5 h-3.5" /> +{compactNumber(product.sales24h)} vendas em ~24h
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg bg-slate-900/80 px-2.5 py-2 text-slate-300 flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-300" /> {product.rating ?? '—'}</div>
          <div className="rounded-lg bg-slate-900/80 px-2.5 py-2 text-slate-300 flex items-center gap-1.5 min-w-0"><Store className="w-3.5 h-3.5 text-cyan-300 shrink-0" /><span className="truncate">{product.sellerName || 'Loja'}</span></div>
        </div>

        {product.video ? (
          <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-fuchsia-300 truncate">@{product.video.author || 'creator'}</span>
              {product.video.authorFollowers !== null && product.video.authorFollowers !== undefined ? <span className="text-[10px] text-slate-500">{compactNumber(product.video.authorFollowers)} seguidores</span> : null}
            </div>
            <div className="grid grid-cols-5 gap-1 text-center text-[10px] text-slate-400">
              <span title="Views"><Eye className="w-3.5 h-3.5 mx-auto mb-1 text-cyan-300" />{compactNumber(product.video.views)}</span>
              <span title="Likes"><Heart className="w-3.5 h-3.5 mx-auto mb-1 text-rose-300" />{compactNumber(product.video.likes)}</span>
              <span title="Comentários"><MessageCircle className="w-3.5 h-3.5 mx-auto mb-1 text-violet-300" />{compactNumber(product.video.comments)}</span>
              <span title="Compartilhamentos"><Share2 className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-300" />{compactNumber(product.video.shares)}</span>
              <span title="Salvos"><Bookmark className="w-3.5 h-3.5 mx-auto mb-1 text-amber-300" />{compactNumber(product.video.saves)}</span>
            </div>
          </div>
        ) : null}

        <div className="flex gap-2">
          {product.productUrl ? (
            <a href={product.productUrl} target="_blank" rel="noreferrer" className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 px-3 py-2 text-xs font-bold">
              Produto <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : null}
          {product.video?.url ? (
            <a href={product.video.url} target="_blank" rel="noreferrer" className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-500/25 px-3 py-2 text-xs font-bold">
              Vídeo <Play className="w-3.5 h-3.5" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
};

export const ProductMinerPage: React.FC<ProductMinerPageProps> = ({ studentCode }) => {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<ProductMinerProduct[]>([]);
  const [ranking, setRanking] = useState<ProductMinerProduct[]>([]);
  const [mode, setMode] = useState<'search' | 'ranking'>('search');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [error, setError] = useState('');
  const [credits, setCredits] = useState<{ used: number; remaining: number | null; fromCache: boolean } | null>(null);

  const sortedProducts = useMemo(() => [...products].sort((a, b) => b.soldCount - a.soldCount), [products]);

  useEffect(() => {
    if (mode !== 'ranking') return;
    setRankingLoading(true);
    loadProductRanking(studentCode, 60)
      .then(setRanking)
      .catch((err) => setError(err?.message || 'Falha ao carregar ranking.'))
      .finally(() => setRankingLoading(false));
  }, [mode, studentCode]);

  const runSearch = async (targetQuery = query, targetPage = 1) => {
    const clean = targetQuery.trim();
    if (clean.length < 2) return;
    setMode('search');
    setLoading(true);
    setError('');
    try {
      const data = await searchProducts(studentCode, clean, targetPage);
      setQuery(clean);
      setProducts(data.products || []);
      setPage(targetPage);
      setHasMore(Boolean(data.hasMore));
      setCredits({ used: data.creditsUsed, remaining: data.creditsRemaining, fromCache: data.fromCache });
    } catch (err: any) {
      setError(err?.message || 'Não foi possível minerar produtos agora.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-5 pb-8">
      <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-[#071a28]/95 via-[#07131f]/95 to-[#040b13]/95 p-5 md:p-6 shadow-xl shadow-cyan-950/20">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-black uppercase tracking-[0.18em]"><Zap className="w-4 h-4" /> TikTok Shop Brasil</div>
            <h1 className="mt-2 text-2xl md:text-3xl font-black text-white">Minerar Produtos</h1>
            <p className="mt-1 text-sm text-slate-400">Descubra produtos, vendas, lojas e vídeos associados sem sair do Geração Z Pro.</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-3 py-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 font-bold">🇧🇷 Região BR fixa</span>
            <span className="px-3 py-2 rounded-xl border border-cyan-500/25 bg-cyan-500/10 text-cyan-300 font-bold">30 produtos/chamada</span>
          </div>
        </div>

        <div className="mt-5 flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch(query, 1)}
              placeholder="Ex.: beleza, air fryer, vestido, relógio..."
              className="w-full h-11 rounded-xl border border-slate-700/80 bg-slate-950/90 pl-10 pr-4 text-sm text-white outline-none focus:border-cyan-400/60"
            />
          </div>
          <button onClick={() => runSearch(query, 1)} disabled={loading || query.trim().length < 2} className="h-11 px-5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/30">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />} Minerar agora
          </button>
        </div>

        <div className="mt-3 flex gap-2 flex-wrap">
          {QUICK_SEARCHES.map((item) => (
            <button key={item} onClick={() => runSearch(item, 1)} disabled={loading} className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900/70 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/30 text-xs font-semibold capitalize">{item}</button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-xl border border-slate-800 bg-slate-950/70 self-start">
          <button onClick={() => setMode('search')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${mode === 'search' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500'}`}><Search className="w-3.5 h-3.5" /> Pesquisa</button>
          <button onClick={() => setMode('ranking')} className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${mode === 'ranking' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-500'}`}><TrendingUp className="w-3.5 h-3.5" /> Ranking</button>
        </div>

        {credits && mode === 'search' ? (
          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <Database className="w-3.5 h-3.5" />
            {credits.fromCache ? 'Resultado em cache: 0 crédito' : `${credits.used} crédito usado`}
            {credits.remaining !== null ? <span>• {credits.remaining} restantes</span> : null}
          </div>
        ) : null}
      </div>

      {error ? <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div> : null}

      {mode === 'search' ? (
        <>
          {!loading && sortedProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 py-16 text-center">
              <ShoppingBag className="w-10 h-10 text-slate-700 mx-auto" />
              <h2 className="mt-3 font-bold text-slate-300">Digite um produto ou nicho para começar</h2>
              <p className="text-xs text-slate-600 mt-1">A busca só consome crédito quando uma consulta nova é feita.</p>
            </div>
          ) : null}

          {loading ? <div className="py-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-cyan-400" /></div> : null}

          {!loading && sortedProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {sortedProducts.map((product) => <ProductCard key={product.productId} product={product} />)}
            </div>
          ) : null}

          {!loading && sortedProducts.length > 0 ? (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button disabled={page <= 1} onClick={() => runSearch(query, page - 1)} className="px-4 py-2 rounded-lg border border-slate-700 text-xs font-bold text-slate-300 disabled:opacity-30">Anterior</button>
              <span className="text-xs text-slate-500">Página {page}</span>
              <button disabled={!hasMore} onClick={() => runSearch(query, page + 1)} className="px-4 py-2 rounded-lg border border-cyan-500/30 text-xs font-bold text-cyan-300 disabled:opacity-30">Próxima</button>
            </div>
          ) : null}
        </>
      ) : (
        <>
          {rankingLoading ? <div className="py-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-300" /></div> : null}
          {!rankingLoading && ranking.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 py-16 text-center text-sm text-slate-500">Faça algumas buscas para alimentar o ranking.</div>
          ) : null}
          {!rankingLoading && ranking.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {ranking.map((product, index) => <ProductCard key={product.productId} product={product} position={index + 1} />)}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
};
