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

export type ProductRankingSort = 'total' | '24h' | '7d' | 'spiking';
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
  sellerId: string | null;
  sellerName: string | null;
  productUrl: string | null;
  category: string | null;
  lastSeenAt?: string | null;
  video: ProductMinerVideo | null;
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

// Paid: explicit mentor-only SocialCrawl refresh.
export async function refreshProducts(studentCode: string, query: string, page = 1): Promise<ProductSearchResponse> {
  const params = new URLSearchParams({ query, page: String(page) });
  const response = await fetch(`/api/product-miner/refresh?${params.toString()}`, {
    headers: authHeaders(studentCode),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  return data as ProductSearchResponse;
}

export async function loadProductRanking(studentCode: string, limit = 50, sort: ProductRankingSort = 'total') {
  const params = new URLSearchParams({ limit: String(limit), sort });
  const response = await fetch(`/api/product-miner/ranking?${params.toString()}`, {
    headers: authHeaders(studentCode),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  return data as { success: true; products: ProductMinerProduct[]; meta: ProductRankingMeta };
}
