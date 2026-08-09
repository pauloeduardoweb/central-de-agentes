export interface ProductMinerVideo {
  id?: string | null;
  url?: string | null;
  description?: string | null;
  author?: string | null;
  authorFollowers?: number | null;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
}

export type ProductRankingSort = 'opportunities' | 'total' | '24h' | '7d' | 'spiking';
export type ProductSearchSource = 'provider' | 'cache' | 'database' | 'empty';

export interface ProductMinerProduct {
  productId: string;
  title: string;
  imageUrl: string | null;
  priceCents: number | null;
  originalPriceCents: number | null;
  discountPercent: number | null;
  currencySymbol: string;
  rating: number | null;
  soldCount: number;
  sales24h?: number | null;
  sales7d?: number | null;
  growth24hPercent?: number | null;
  growth7dPercent?: number | null;
  trendScore?: number | null;
  score?: number | null;
  sellerId: string | null;
  sellerName: string | null;
  productUrl: string | null;
  category: string | null;
  lastSeenAt?: string | null;
  video: ProductMinerVideo | null;
  videoDownload?: {
    isPrepared: boolean;
    directMediaUrl?: string | null;
    preparedAt?: string | null;
    status?: string | null;
  } | null;
}

export interface ProductRankingMeta {
  trackedProducts: number;
  with24h: number;
  with7d: number;
  sort: ProductRankingSort;
}

export interface ProductMinerAccess {
  enabled: boolean;
  canRefresh: boolean;
  role: 'mentor' | 'student';
}

export interface ProductSearchResponse {
  success: true;
  region: 'BR';
  query: string;
  page: number;
  products: ProductMinerProduct[];
  creditsUsed: number;
  creditsRemaining: number | null;
  hasMore: boolean;
  pageSize: number;
  fromCache: boolean;
  source: ProductSearchSource;
  needsRefresh: boolean;
  cacheExpired: boolean;
}

function authHeaders(studentCode: string): HeadersInit {
  return {
    'x-student-access-code': studentCode,
    'Accept': 'application/json',
  };
}

function accessError(data: any): Error {
  const code = String(data?.error || '');
  if (code === 'PRODUCT_MINER_STUDENTS_DISABLED') {
    return new Error('O Minerador de Produtos ainda não foi liberado para alunos.');
  }
  if (code === 'PRODUCT_MINER_REFRESH_MENTOR_ONLY') {
    return new Error('Somente o Mentor pode atualizar dados da SocialCrawl.');
  }
  if (code === 'SOCIALCRAWL_NOT_CONFIGURED') {
    return new Error('SocialCrawl ainda não foi configurada no servidor.');
  }
  if (code === 'AUTH_REQUIRED' || code === 'ACCESS_DENIED') {
    return new Error('Sua sessão não tem acesso ao minerador.');
  }
  return new Error(data?.detail || data?.error || 'Falha no Minerador de Produtos.');
}

export async function getProductMinerAccess(studentCode: string): Promise<ProductMinerAccess> {
  const response = await fetch('/api/product-miner/access', { headers: authHeaders(studentCode) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  return { enabled: Boolean(data.enabled), canRefresh: Boolean(data.canRefresh), role: data.role === 'mentor' ? 'mentor' : 'student' };
}

// Free: reads only our own database/cache.
export async function searchProducts(studentCode: string, query: string, page = 1): Promise<ProductSearchResponse> {
  const params = new URLSearchParams({ query, page: String(page) });
  const response = await fetch(`/api/product-miner/search?${params.toString()}`, {
    headers: authHeaders(studentCode),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  return data as ProductSearchResponse;
}

export interface CollectorRefreshResponse extends ProductSearchResponse {
  uniqueProductsCount?: number;
  pagesConsulted?: number;
  category?: string;
  timestamp?: string;
  partialError?: string | null;
}

// Paid: explicit mentor-only SocialCrawl refresh.
export async function refreshProducts(
  studentCode: string,
  query: string,
  maxProductsOrPage: number = 90
): Promise<CollectorRefreshResponse> {
  const isMultiPageRequest = maxProductsOrPage >= 30;
  const body = isMultiPageRequest
    ? { query, maxProducts: maxProductsOrPage }
    : { query, page: maxProductsOrPage };

  const response = await fetch('/api/product-miner/refresh', {
    method: 'POST',
    headers: {
      ...authHeaders(studentCode),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  return data as CollectorRefreshResponse;
}

export interface CollectorCategoryStat {
  category: string;
  productCount: number;
  lastCollectedAt: string | null;
  status: 'Ativa' | 'Pendente';
}

export async function fetchCollectorCategories(studentCode: string): Promise<CollectorCategoryStat[]> {
  const response = await fetch('/api/product-miner/collector/categories', {
    headers: authHeaders(studentCode),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  return (data.categories || []) as CollectorCategoryStat[];
}

export async function loadProductRanking(studentCode: string, limit = 50, sort: ProductRankingSort = 'opportunities') {

  const params = new URLSearchParams({ limit: String(limit), sort });
  const response = await fetch(`/api/product-miner/ranking?${params.toString()}`, {
    headers: authHeaders(studentCode),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  return data as { success: true; products: ProductMinerProduct[]; meta: ProductRankingMeta };
}

export type ProductScriptType = 'roteiro_completo' | 'roteiro_viral' | 'copy_venda' | 'hooks' | 'cta';

export async function generateProductScript(
  studentCode: string,
  product: ProductMinerProduct,
  scriptType: ProductScriptType,
  customPrompt?: string,
  variantSeed?: number
): Promise<{ success: boolean; script: string }> {
  const response = await fetch('/api/product-miner/generate-script', {
    method: 'POST',
    headers: {
      ...authHeaders(studentCode),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product,
      scriptType,
      customPrompt,
      variantSeed,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  return data as { success: true; script: string };
}

export async function prepareProductVideoDownload(
  studentCode: string,
  productId: string
): Promise<{ success: boolean; prepared?: boolean; directMediaUrl?: string; error?: string; message?: string }> {
  const response = await fetch('/api/product-miner/videos/prepare-download', {
    method: 'POST',
    headers: {
      ...authHeaders(studentCode),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ productId }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  return data;
}

export type VideoStrength = 'Fraco' | 'Bom' | 'Forte' | 'Viral';

export function calculateVideoAnalysis(video: ProductMinerProduct['video']) {
  if (!video) return null;

  const views = Number(video.views || 0);
  const likes = Number(video.likes || 0);
  const comments = Number(video.comments || 0);
  const shares = Number(video.shares || 0);
  const saves = Number(video.saves || 0);
  const followers = Number(video.authorFollowers || 0);

  const totalInteractions = likes + comments + shares + saves;
  const engagementRate = views > 0 ? (totalInteractions / views) * 100 : 0;

  let classification: VideoStrength = 'Fraco';
  let badgeColor = 'bg-slate-800/80 text-slate-300 border-slate-700';
  let scorePercent = 25;

  if (views >= 1000000 || (views >= 300000 && engagementRate >= 5)) {
    classification = 'Viral';
    badgeColor = 'bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border-amber-500/40 font-black';
    scorePercent = 100;
  } else if (views >= 100000 || engagementRate >= 3) {
    classification = 'Forte';
    badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
    scorePercent = 75;
  } else if (views >= 10000 || engagementRate >= 1) {
    classification = 'Bom';
    badgeColor = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-semibold';
    scorePercent = 50;
  }

  return {
    views,
    likes,
    comments,
    shares,
    saves,
    followers,
    totalInteractions,
    engagementRate: Number(engagementRate.toFixed(2)),
    classification,
    badgeColor,
    scorePercent,
  };
}
