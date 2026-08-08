import { db, isDatabaseConfigured, ensureProductMinerTables } from './database.js';

const SOCIALCRAWL_BASE_URL = 'https://www.socialcrawl.dev/v1';
const DEFAULT_REGION = 'BR';
const DEFAULT_CACHE_MINUTES = 15;

type SocialCrawlSearchResponse = {
  success?: boolean;
  platform?: string;
  endpoint?: string;
  data?: {
    items?: any[];
    dropped?: number;
  };
  credits_used?: number;
  credits_remaining?: number;
  request_id?: string;
  cached?: boolean;
  pagination?: {
    next_cursor?: string | null;
    has_more?: boolean;
    page_size?: number;
  };
  error?: string;
  message?: string;
};

export type MinedProduct = {
  productId: string;
  title: string;
  imageUrl: string | null;
  priceCents: number | null;
  originalPriceCents: number | null;
  discountPercent: number | null;
  currencySymbol: string;
  rating: number | null;
  soldCount: number;
  sellerId: string | null;
  sellerName: string | null;
  productUrl: string | null;
  category: string | null;
  video: null | {
    id: string | null;
    url: string | null;
    description: string | null;
    author: string | null;
    authorFollowers: number | null;
    views: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saves: number | null;
  };
};

function getSocialCrawlApiKey(): string {
  const key = String(process.env.SOCIALCRAWL_API_KEY || '').trim();
  if (!key) throw new Error('SOCIALCRAWL_API_KEY_MISSING');
  return key;
}

function parseInteger(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePriceCents(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value).trim().replace(',', '.');
  if (/^\d+$/.test(raw)) {
    const cents = Number.parseInt(raw, 10);
    return Number.isFinite(cents) ? Math.max(0, cents) : null;
  }
  const decimal = Number(raw);
  return Number.isFinite(decimal) ? Math.max(0, Math.round(decimal * 100)) : null;
}

function parseRating(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeProduct(item: any): MinedProduct {
  const price = item?.product_price_info || {};
  const video = item?.video || null;
  const stats = video?.statistics || {};
  const author = video?.author || {};
  const category = Array.isArray(item?.category_breadcrumb)
    ? item.category_breadcrumb.map((entry: any) => entry?.category_name).filter(Boolean).join(' > ')
    : null;

  return {
    productId: String(item?.product_id || ''),
    title: String(item?.title || 'Produto sem nome'),
    imageUrl: item?.image?.url_list?.[0] || null,
    priceCents: parsePriceCents(price?.sale_price_decimal),
    originalPriceCents: parsePriceCents(price?.origin_price_decimal),
    discountPercent: price?.discount_decimal !== undefined && price?.discount_decimal !== null
      ? Math.round(Number(price.discount_decimal) * 100)
      : null,
    currencySymbol: String(price?.currency_symbol || 'R$'),
    rating: parseRating(item?.rate_info?.score),
    soldCount: parseInteger(item?.sold_info?.sold_count) || 0,
    sellerId: item?.seller_info?.seller_id ? String(item.seller_info.seller_id) : null,
    sellerName: item?.seller_info?.shop_name ? String(item.seller_info.shop_name) : null,
    productUrl: item?.seo_url?.canonical_url ? String(item.seo_url.canonical_url) : null,
    category,
    video: video ? {
      id: video?.aweme_id ? String(video.aweme_id) : null,
      url: video?.share_url || null,
      description: video?.desc || null,
      author: author?.unique_id || author?.nickname || null,
      authorFollowers: parseInteger(author?.follower_count),
      views: parseInteger(stats?.play_count),
      likes: parseInteger(stats?.digg_count),
      comments: parseInteger(stats?.comment_count),
      shares: parseInteger(stats?.share_count),
      saves: parseInteger(stats?.collect_count),
    } : null,
  };
}

async function getCachedPayload(query: string, region: string, page: number): Promise<SocialCrawlSearchResponse | null> {
  if (!isDatabaseConfigured()) return null;
  await ensureProductMinerTables();
  try {
    const [rows]: any = await db.query(
      `SELECT payload_json
       FROM tiktok_shop_search_cache
       WHERE search_query = ? AND region = ? AND page = ? AND expires_at > NOW()
       LIMIT 1`,
      [query, region, page]
    );
    if (!Array.isArray(rows) || !rows[0]?.payload_json) return null;
    return JSON.parse(rows[0].payload_json);
  } catch (error: any) {
    console.warn('[Product Miner Cache Read Warning]:', error?.message || error);
    return null;
  }
}

async function saveCachedPayload(query: string, region: string, page: number, payload: SocialCrawlSearchResponse): Promise<void> {
  if (!isDatabaseConfigured()) return;
  await ensureProductMinerTables();
  const configured = Number(process.env.SOCIALCRAWL_CACHE_MINUTES || DEFAULT_CACHE_MINUTES);
  const minutes = Number.isFinite(configured) ? Math.max(1, Math.min(configured, 120)) : DEFAULT_CACHE_MINUTES;
  await db.query(
    `INSERT INTO tiktok_shop_search_cache
      (search_query, region, page, payload_json, expires_at)
     VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))
     ON DUPLICATE KEY UPDATE
      payload_json = VALUES(payload_json),
      expires_at = VALUES(expires_at),
      updated_at = CURRENT_TIMESTAMP`,
    [query, region, page, JSON.stringify(payload), minutes]
  ).catch((error: any) => {
    console.warn('[Product Miner Cache Write Warning]:', error?.message || error);
  });
}

async function persistProducts(products: MinedProduct[], query: string): Promise<void> {
  if (!isDatabaseConfigured() || products.length === 0) return;
  await ensureProductMinerTables();

  const validProducts = products.filter((product) => product.productId);
  if (validProducts.length === 0) return;

  const productRows = validProducts.map((product) => [
    product.productId,
    product.title,
    product.imageUrl,
    product.priceCents,
    product.originalPriceCents,
    product.discountPercent,
    product.currencySymbol,
    product.rating,
    product.soldCount,
    product.sellerId,
    product.sellerName,
    product.productUrl,
    product.category,
    product.video?.id || null,
    product.video?.url || null,
    product.video?.author || null,
    product.video?.authorFollowers || null,
    product.video?.views || null,
    product.video?.likes || null,
    product.video?.comments || null,
    product.video?.shares || null,
    product.video?.saves || null,
    query,
  ]);

  await db.query(
    `INSERT INTO tiktok_shop_products (
      product_id, title, image_url, price_cents, original_price_cents, discount_percent,
      currency_symbol, rating, sold_count, seller_id, seller_name, product_url, category_path,
      video_id, video_url, video_author, video_author_followers, video_views, video_likes,
      video_comments, video_shares, video_saves, query_source
    ) VALUES ?
    ON DUPLICATE KEY UPDATE
      title = VALUES(title), image_url = VALUES(image_url), price_cents = VALUES(price_cents),
      original_price_cents = VALUES(original_price_cents), discount_percent = VALUES(discount_percent),
      currency_symbol = VALUES(currency_symbol), rating = VALUES(rating), sold_count = VALUES(sold_count),
      seller_id = VALUES(seller_id), seller_name = VALUES(seller_name), product_url = VALUES(product_url),
      category_path = VALUES(category_path), video_id = VALUES(video_id), video_url = VALUES(video_url),
      video_author = VALUES(video_author), video_author_followers = VALUES(video_author_followers),
      video_views = VALUES(video_views), video_likes = VALUES(video_likes), video_comments = VALUES(video_comments),
      video_shares = VALUES(video_shares), video_saves = VALUES(video_saves), query_source = VALUES(query_source),
      last_seen_at = NOW()`,
    [productRows]
  );

  const ids = validProducts.map((product) => product.productId);
  const [lastSnapshotRows]: any = await db.query(
    `SELECT s.product_id, MAX(s.captured_at) AS last_captured_at
     FROM tiktok_shop_product_snapshots s
     WHERE s.product_id IN (?)
     GROUP BY s.product_id`,
    [ids]
  );

  const lastCapturedByProduct = new Map<string, number>();
  for (const row of Array.isArray(lastSnapshotRows) ? lastSnapshotRows : []) {
    const timestamp = row?.last_captured_at ? new Date(row.last_captured_at).getTime() : 0;
    lastCapturedByProduct.set(String(row.product_id), timestamp);
  }

  const snapshotRows = validProducts
    .filter((product) => {
      const last = lastCapturedByProduct.get(product.productId) || 0;
      return !last || Date.now() - last >= 30 * 60 * 1000;
    })
    .map((product) => [
      product.productId,
      product.soldCount,
      product.priceCents,
      product.video?.views || null,
      query,
    ]);

  if (snapshotRows.length > 0) {
    await db.query(
      `INSERT INTO tiktok_shop_product_snapshots
        (product_id, sold_count, price_cents, video_views, query_source)
       VALUES ?`,
      [snapshotRows]
    );
  }
}

export async function searchTikTokShopProducts(params: {
  query: string;
  page?: number;
  region?: string;
}): Promise<{
  products: MinedProduct[];
  creditsUsed: number;
  creditsRemaining: number | null;
  hasMore: boolean;
  pageSize: number;
  fromCache: boolean;
  requestId: string | null;
}> {
  const query = String(params.query || '').trim();
  if (query.length < 2) throw new Error('SEARCH_QUERY_TOO_SHORT');
  if (query.length > 120) throw new Error('SEARCH_QUERY_TOO_LONG');
  const requestedPage = Number.parseInt(String(params.page || 1), 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.min(requestedPage, 20)) : 1;
  const region = String(params.region || DEFAULT_REGION).trim().toUpperCase();

  const cached = await getCachedPayload(query, region, page);
  if (cached) {
    const products = (cached.data?.items || []).map(normalizeProduct).filter((item) => item.productId);
    return {
      products,
      creditsUsed: 0,
      creditsRemaining: cached.credits_remaining ?? null,
      hasMore: Boolean(cached.pagination?.has_more),
      pageSize: Number(cached.pagination?.page_size || products.length),
      fromCache: true,
      requestId: cached.request_id || null,
    };
  }

  const url = new URL(`${SOCIALCRAWL_BASE_URL}/tiktokshop/search`);
  url.searchParams.set('query', query);
  url.searchParams.set('region', region);
  url.searchParams.set('page', String(page));

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-api-key': getSocialCrawlApiKey(),
      'Accept': 'application/json',
      'User-Agent': 'GeracaoZPro/1.0',
    },
    signal: AbortSignal.timeout(30000),
  });

  const rawText = await response.text();
  let payload: SocialCrawlSearchResponse;
  try {
    payload = JSON.parse(rawText);
  } catch {
    throw new Error(`SOCIALCRAWL_INVALID_RESPONSE_${response.status}`);
  }

  if (!response.ok || payload.success === false) {
    const detail = payload.message || payload.error || `HTTP_${response.status}`;
    throw new Error(`SOCIALCRAWL_REQUEST_FAILED:${detail}`);
  }

  await saveCachedPayload(query, region, page, payload);
  const products = (payload.data?.items || []).map(normalizeProduct).filter((item) => item.productId);
  await persistProducts(products, query);

  return {
    products,
    creditsUsed: Number(payload.credits_used || 0),
    creditsRemaining: payload.credits_remaining ?? null,
    hasMore: Boolean(payload.pagination?.has_more),
    pageSize: Number(payload.pagination?.page_size || products.length),
    fromCache: false,
    requestId: payload.request_id || null,
  };
}

export async function getProductMinerRanking(limit = 50): Promise<any[]> {
  if (!isDatabaseConfigured()) return [];
  await ensureProductMinerTables();
  const safeLimit = Math.max(1, Math.min(Number(limit || 50), 100));
  const [rows]: any = await db.query(
    `SELECT
      p.*,
      (
        SELECT s.sold_count
        FROM tiktok_shop_product_snapshots s
        WHERE s.product_id = p.product_id
          AND s.captured_at <= DATE_SUB(NOW(), INTERVAL 20 HOUR)
        ORDER BY s.captured_at DESC
        LIMIT 1
      ) AS sold_count_24h_base
     FROM tiktok_shop_products p
     ORDER BY p.sold_count DESC, p.last_seen_at DESC
     LIMIT ?`,
    [safeLimit]
  );

  return (Array.isArray(rows) ? rows : []).map((row: any) => ({
    productId: String(row.product_id),
    title: row.title,
    imageUrl: row.image_url,
    priceCents: row.price_cents === null ? null : Number(row.price_cents),
    originalPriceCents: row.original_price_cents === null ? null : Number(row.original_price_cents),
    discountPercent: row.discount_percent === null ? null : Number(row.discount_percent),
    currencySymbol: row.currency_symbol || 'R$',
    rating: row.rating === null ? null : Number(row.rating),
    soldCount: Number(row.sold_count || 0),
    sales24h: row.sold_count_24h_base === null ? null : Math.max(0, Number(row.sold_count || 0) - Number(row.sold_count_24h_base || 0)),
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    productUrl: row.product_url,
    category: row.category_path,
    lastSeenAt: row.last_seen_at,
    video: row.video_id || row.video_url ? {
      id: row.video_id,
      url: row.video_url,
      author: row.video_author,
      authorFollowers: row.video_author_followers === null ? null : Number(row.video_author_followers),
      views: row.video_views === null ? null : Number(row.video_views),
      likes: row.video_likes === null ? null : Number(row.video_likes),
      comments: row.video_comments === null ? null : Number(row.video_comments),
      shares: row.video_shares === null ? null : Number(row.video_shares),
      saves: row.video_saves === null ? null : Number(row.video_saves),
    } : null,
  }));
}
