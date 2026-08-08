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
  sellerId: string | null;
  sellerName: string | null;
  productUrl: string | null;
  category: string | null;
  lastSeenAt?: string | null;
  video: ProductMinerVideo | null;
}

function authHeaders(studentCode: string): HeadersInit {
  return {
    'x-student-access-code': studentCode,
    'Accept': 'application/json',
  };
}

export async function searchProducts(studentCode: string, query: string, page = 1) {
  const params = new URLSearchParams({ query, page: String(page) });
  const response = await fetch(`/api/product-miner/search?${params.toString()}`, {
    headers: authHeaders(studentCode),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = String(data?.error || '');
    if (code === 'SOCIALCRAWL_NOT_CONFIGURED') {
      throw new Error('SocialCrawl ainda não foi configurada no servidor.');
    }
    if (code === 'AUTH_REQUIRED' || code === 'ACCESS_DENIED') {
      throw new Error('Sua sessão não tem acesso ao minerador.');
    }
    throw new Error(data?.detail || data?.error || 'Falha ao minerar produtos.');
  }
  return data as {
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
  };
}

export async function loadProductRanking(studentCode: string, limit = 50) {
  const response = await fetch(`/api/product-miner/ranking?limit=${limit}`, {
    headers: authHeaders(studentCode),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Falha ao carregar ranking.');
  return data.products as ProductMinerProduct[];
}
