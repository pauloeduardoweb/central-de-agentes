import { db, isDatabaseConfigured, ensureProductMinerTables } from './database.js';

const SOCIALCRAWL_BASE_URL = 'https://www.socialcrawl.dev/v1';
const DEFAULT_REGION = 'BR';
const DEFAULT_CACHE_MINUTES = 1440;

type SocialCrawlSearchResponse = {
  success?: boolean;
  platform?: string;
  endpoint?: string;
  data?: { items?: any[]; dropped?: number };
  credits_used?: number;
  credits_remaining?: number;
  request_id?: string;
  cached?: boolean;
  pagination?: { next_cursor?: string | null; has_more?: boolean; page_size?: number };
  error?: string;
  message?: string;
};

export type ProductRankingSort = 'opportunities' | 'total' | '24h' | '7d' | 'spiking';

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
  collectionPosition?: number | null;
  lastSeenAt?: string | Date | null;
  video: null | {
    id: string | null;
    url: string | null;
    description?: string | null;
    author: string | null;
    authorFollowers: number | null;
    views: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saves: number | null;
  };
  videoDownload?: null | {
    isPrepared: boolean;
    directMediaUrl?: string | null;
    preparedAt?: string | null;
    status?: string | null;
  };
};

type SnapshotPoint = {
  soldCount: number;
  capturedAt: Date;
};

type TrendMetrics = {
  sales24h: number | null;
  sales7d: number | null;
  growth24hPercent: number | null;
  growth7dPercent: number | null;
  trendScore: number | null;
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

async function getStoredPayload(query: string, region: string, page: number): Promise<{ payload: SocialCrawlSearchResponse; expired: boolean } | null> {
  if (!isDatabaseConfigured()) return null;
  await ensureProductMinerTables();
  try {
    const [rows]: any = await db.query(
      `SELECT payload_json, expires_at
       FROM tiktok_shop_search_cache
       WHERE search_query = ? AND region = ? AND page = ?
       LIMIT 1`,
      [query, region, page]
    );
    if (!Array.isArray(rows) || !rows[0]?.payload_json) return null;
    const expiresAt = rows[0]?.expires_at ? new Date(rows[0].expires_at).getTime() : 0;
    return {
      payload: JSON.parse(rows[0].payload_json),
      expired: !expiresAt || expiresAt <= Date.now(),
    };
  } catch (error: any) {
    console.warn('[Product Miner Stored Cache Read Warning]:', error?.message || error);
    return null;
  }
}

async function saveCachedPayload(query: string, region: string, page: number, payload: SocialCrawlSearchResponse): Promise<void> {
  if (!isDatabaseConfigured()) return;
  await ensureProductMinerTables();
  const configured = Number(process.env.SOCIALCRAWL_CACHE_MINUTES || DEFAULT_CACHE_MINUTES);
  const minutes = Number.isFinite(configured) ? Math.max(1, Math.min(configured, 10080)) : DEFAULT_CACHE_MINUTES;
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
      product.rating ?? null,
      product.sellerId ?? null,
      product.sellerName ?? null,
      product.collectionPosition ?? null,
    ]);

  if (snapshotRows.length > 0) {
    await db.query(
      `INSERT INTO tiktok_shop_product_snapshots
        (product_id, sold_count, price_cents, video_views, query_source, rating, seller_id, seller_name, collection_position)
       VALUES ?`,
      [snapshotRows]
    );
  }
}

function chooseBaseline(samples: SnapshotPoint[], targetHours: number, minHours: number, maxHours: number): SnapshotPoint | null {
  const now = Date.now();
  let best: SnapshotPoint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const sample of samples) {
    const ageHours = (now - sample.capturedAt.getTime()) / 3_600_000;
    if (!Number.isFinite(ageHours) || ageHours < minHours || ageHours > maxHours) continue;
    const distance = Math.abs(ageHours - targetHours);
    if (distance < bestDistance) {
      best = sample;
      bestDistance = distance;
    }
  }
  return best;
}

function calculateWindowMetric(currentSold: number, baseline: SnapshotPoint | null, targetHours: number): { sales: number | null; growth: number | null } {
  if (!baseline) return { sales: null, growth: null };
  const elapsedHours = Math.max(1, (Date.now() - baseline.capturedAt.getTime()) / 3_600_000);
  const rawDelta = Math.max(0, currentSold - baseline.soldCount);
  const normalizedSales = Math.max(0, Math.round(rawDelta * (targetHours / elapsedHours)));
  const estimatedBase = Math.max(1, currentSold - normalizedSales);
  const growth = Number(((normalizedSales / estimatedBase) * 100).toFixed(2));
  return { sales: normalizedSales, growth };
}

export function calculateScoreGeracaoZPro(product: MinedProduct): number {
  let score = 0;

  // 1. Growth & Recent Sales (24h/7d) - Max 35 pts
  if (product.sales24h !== null && product.sales24h !== undefined && product.sales24h > 0) {
    const sales24Pts = Math.min(20, Math.log10(1 + product.sales24h) * 8);
    const growth24Pts = Math.min(15, Math.max(0, product.growth24hPercent || 0) / 10);
    score += (sales24Pts + growth24Pts);
  } else if (product.sales7d !== null && product.sales7d !== undefined && product.sales7d > 0) {
    const sales7Pts = Math.min(20, Math.log10(1 + (product.sales7d / 7)) * 8);
    const growth7Pts = Math.min(15, Math.max(0, product.growth7dPercent || 0) / 15);
    score += (sales7Pts + growth7Pts);
  } else if (product.trendScore && product.trendScore > 0) {
    score += Math.min(30, Math.log10(1 + product.trendScore) * 10);
  } else if (product.soldCount > 0) {
    score += Math.min(15, Math.log10(1 + product.soldCount) * 4);
  }

  // 2. Associated Video Strength & Engagement - Max 30 pts
  if (product.video) {
    score += 5; // Base boost for having a video
    const views = Number(product.video.views || 0);
    if (views > 0) {
      score += Math.min(10, Math.log10(1 + views) * 2);
    }

    const likes = Number(product.video.likes || 0);
    const comments = Number(product.video.comments || 0);
    const shares = Number(product.video.shares || 0);
    const saves = Number(product.video.saves || 0);
    const engagement = likes + (comments * 2) + (shares * 3) + (saves * 2);
    if (engagement > 0) {
      score += Math.min(10, Math.log10(1 + engagement) * 2.5);
    }

    const followers = Number(product.video.authorFollowers || 0);
    if (followers > 0) {
      score += Math.min(5, Math.log10(1 + followers) * 1);
    }
  }

  // 3. Total Sales Volume - Max 20 pts
  if (product.soldCount > 0) {
    score += Math.min(20, Math.log10(1 + product.soldCount) * 5);
  }

  // 4. Product Rating - Max 15 pts
  if (product.rating !== null && product.rating !== undefined && product.rating > 0) {
    const normRating = Math.min(5, Math.max(0, product.rating));
    score += (normRating / 5) * 15;
  } else {
    score += 7.5; // Neutral rating fallback
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

async function attachTrendMetrics(products: MinedProduct[]): Promise<MinedProduct[]> {
  if (!isDatabaseConfigured() || products.length === 0) {
    return products.map((product) => {
      const baseProduct = { ...product, sales24h: null, sales7d: null, growth24hPercent: null, growth7dPercent: null, trendScore: null };
      return { ...baseProduct, score: calculateScoreGeracaoZPro(baseProduct) };
    });
  }

  await ensureProductMinerTables();
  const ids = products.map((product) => product.productId).filter(Boolean);
  if (ids.length === 0) return products;

  const [rows]: any = await db.query(
    `SELECT product_id, sold_count, captured_at
     FROM tiktok_shop_product_snapshots
     WHERE product_id IN (?)
       AND captured_at >= DATE_SUB(NOW(), INTERVAL 9 DAY)
     ORDER BY product_id ASC, captured_at ASC`,
    [ids]
  );

  const snapshots = new Map<string, SnapshotPoint[]>();
  for (const row of Array.isArray(rows) ? rows : []) {
    const productId = String(row.product_id);
    const capturedAt = new Date(row.captured_at);
    if (!Number.isFinite(capturedAt.getTime())) continue;
    const list = snapshots.get(productId) || [];
    list.push({ soldCount: Number(row.sold_count || 0), capturedAt });
    snapshots.set(productId, list);
  }

  const enrichedProductsWithScore = products.map((product) => {
    const list = snapshots.get(product.productId) || [];
    const baseline24h = chooseBaseline(list, 24, 18, 48);
    const baseline7d = chooseBaseline(list, 168, 120, 216);
    const metric24h = calculateWindowMetric(product.soldCount, baseline24h, 24);
    const metric7d = calculateWindowMetric(product.soldCount, baseline7d, 168);
    const trendScore = metric24h.sales === null
      ? null
      : Math.round(metric24h.sales * (1 + Math.min(Math.max(metric24h.growth || 0, 0), 300) / 100));

    const enrichedProduct: MinedProduct = {
      ...product,
      sales24h: metric24h.sales,
      sales7d: metric7d.sales,
      growth24hPercent: metric24h.growth,
      growth7dPercent: metric7d.growth,
      trendScore,
    };

    const score = calculateScoreGeracaoZPro(enrichedProduct);

    const enrichedProductWithScore = {
      ...enrichedProduct,
      score,
    };

    return enrichedProductWithScore;
  });

  return attachVideoDownloads(enrichedProductsWithScore);
}

export async function attachVideoDownloads(products: MinedProduct[]): Promise<MinedProduct[]> {
  if (!isDatabaseConfigured() || products.length === 0) return products;
  const productIds = products.map((p) => p.productId).filter(Boolean);
  if (productIds.length === 0) return products;

  try {
    await ensureProductMinerTables();
    const placeholders = productIds.map(() => '?').join(',');
    const [rows]: any = await db.query(
      `SELECT product_id, direct_media_url, status, prepared_at
       FROM tiktok_shop_video_downloads
       WHERE product_id IN (${placeholders})`,
      productIds
    );

    const map = new Map<string, { isPrepared: boolean; directMediaUrl: string | null; preparedAt: string | null; status: string }>();
    if (Array.isArray(rows)) {
      for (const r of rows) {
        map.set(String(r.product_id), {
          isPrepared: r.status === 'COMPLETED' && Boolean(r.direct_media_url),
          directMediaUrl: r.direct_media_url || null,
          preparedAt: r.prepared_at ? new Date(r.prepared_at).toISOString() : null,
          status: String(r.status),
        });
      }
    }

    return products.map((p) => ({
      ...p,
      videoDownload: map.get(p.productId) || null,
    }));
  } catch (err: any) {
    console.warn('[attachVideoDownloads Warning]:', err?.message || err);
    return products;
  }
}

export async function prepareVideoDownload(productId: string): Promise<{
  success: boolean;
  prepared?: boolean;
  directMediaUrl?: string;
  error?: string;
  message?: string;
}> {
  if (!productId) {
    return { success: false, error: 'MISSING_PRODUCT_ID', message: 'ID do produto não informado.' };
  }
  if (!isDatabaseConfigured()) {
    return { success: false, error: 'DATABASE_NOT_CONFIGURED', message: 'Banco de dados não configurado.' };
  }

  await ensureProductMinerTables();

  // 1. Check if already prepared or preparing
  const [existingRows]: any = await db.query(
    `SELECT direct_media_url, status, updated_at
     FROM tiktok_shop_video_downloads
     WHERE product_id = ?
     LIMIT 1`,
    [productId]
  );

  const existing = Array.isArray(existingRows) && existingRows[0];
  if (existing) {
    if (existing.status === 'COMPLETED' && existing.direct_media_url) {
      return {
        success: true,
        prepared: true,
        directMediaUrl: String(existing.direct_media_url),
      };
    }

    if (existing.status === 'PREPARING') {
      const updatedAtMs = new Date(existing.updated_at).getTime();
      const nowMs = Date.now();
      if (nowMs - updatedAtMs < 120_000) {
        return {
          success: false,
          error: 'PREPARING_IN_PROGRESS',
          message: 'O vídeo já está sendo preparado por outro processo. Aguarde alguns segundos.',
        };
      }
    }
  }

  // 2. Locate video_url for product
  let videoUrl: string | null = null;
  const [prodRows]: any = await db.query(
    `SELECT video_url FROM tiktok_shop_products WHERE product_id = ? LIMIT 1`,
    [productId]
  );

  if (Array.isArray(prodRows) && prodRows[0]?.video_url) {
    videoUrl = String(prodRows[0].video_url);
  }

  if (!videoUrl) {
    const [cacheRows]: any = await db.query(
      `SELECT payload_json FROM tiktok_shop_search_cache LIMIT 50`
    );
    if (Array.isArray(cacheRows)) {
      for (const row of cacheRows) {
        try {
          const payload = JSON.parse(row.payload_json);
          const item = payload.data?.items?.find((i: any) => String(i.product_id || i.productId) === productId);
          if (item?.video?.url || item?.video_url) {
            videoUrl = item?.video?.url || item?.video_url;
            break;
          }
        } catch {}
      }
    }
  }

  if (!videoUrl) {
    return {
      success: false,
      error: 'NO_VIDEO_URL',
      message: 'Nenhum vídeo do TikTok associado a este produto.',
    };
  }

  // 3. Set lock 'PREPARING'
  await db.query(
    `INSERT INTO tiktok_shop_video_downloads (product_id, video_page_url, status, updated_at)
     VALUES (?, ?, 'PREPARING', NOW())
     ON DUPLICATE KEY UPDATE status = 'PREPARING', updated_at = NOW()`,
    [productId, videoUrl]
  );

  // 4. Request SocialCrawl endpoint GET /v1/tiktok/post?url=...&download_media=true
  try {
    const apiKey = getSocialCrawlApiKey();
    const scUrl = new URL('https://www.socialcrawl.dev/v1/tiktok/post');
    scUrl.searchParams.set('url', videoUrl);
    scUrl.searchParams.set('download_media', 'true');

    const scRes = await fetch(scUrl.toString(), {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'GeracaoZPro/1.0',
      },
      signal: AbortSignal.timeout(30000),
    });

    const rawText = await scRes.text();
    let jsonPayload: any = null;
    try {
      jsonPayload = JSON.parse(rawText);
    } catch {
      throw new Error(`SOCIALCRAWL_INVALID_JSON_${scRes.status}`);
    }

    if (!scRes.ok || jsonPayload?.success === false) {
      const msg = jsonPayload?.message || jsonPayload?.error || `HTTP_${scRes.status}`;
      throw new Error(`SOCIALCRAWL_FAILED: ${msg}`);
    }

    const ext = jsonPayload?.data?.post?.ext || jsonPayload?.post?.ext;
    const downloadMediaUrls = ext?.download_media_urls || [];

    let mediaItem: any = null;
    if (Array.isArray(downloadMediaUrls)) {
      mediaItem = downloadMediaUrls.find((m: any) => m && m.cdn_url);
    }

    if (!mediaItem || !mediaItem.cdn_url) {
      await db.query(
        `UPDATE tiktok_shop_video_downloads
         SET status = 'FAILED', error_message = 'A SocialCrawl não retornou uma mídia utilizável.'
         WHERE product_id = ?`,
        [productId]
      );
      return {
        success: false,
        error: 'NO_MEDIA_FOUND',
        message: 'Não foi possível preparar este vídeo. A SocialCrawl não retornou uma mídia utilizável.',
      };
    }

    const cdnUrl = String(mediaItem.cdn_url);
    const postId = String(mediaItem.post_id || jsonPayload?.data?.post?.id || '');
    const mediaType = String(mediaItem.type || 'video');
    const isCached = Boolean(mediaItem.cached);

    await db.query(
      `UPDATE tiktok_shop_video_downloads
       SET direct_media_url = ?,
           video_post_id = ?,
           media_type = ?,
           provider = 'socialcrawl',
           provider_cached = ?,
           prepared_at = NOW(),
           status = 'COMPLETED',
           error_message = NULL
       WHERE product_id = ?`,
      [cdnUrl, postId, mediaType, isCached ? 1 : 0, productId]
    );

    return {
      success: true,
      prepared: true,
      directMediaUrl: cdnUrl,
    };
  } catch (err: any) {
    console.error('[Product Miner Prepare Video Download Error]:', err?.message || err);
    await db.query(
      `UPDATE tiktok_shop_video_downloads
       SET status = 'FAILED', error_message = ?
       WHERE product_id = ?`,
      [String(err?.message || 'Erro de conexão com a SocialCrawl'), productId]
    ).catch(() => {});

    return {
      success: false,
      error: 'SOCIALCRAWL_ERROR',
      message: `Não foi possível preparar este vídeo (${err?.message || 'Falha na SocialCrawl'}).`,
    };
  }
}

export async function searchTikTokShopProducts(params: {
  query: string;
  page?: number;
  region?: string;
  forceRefresh?: boolean;
}): Promise<{
  products: MinedProduct[];
  creditsUsed: number;
  creditsRemaining: number | null;
  hasMore: boolean;
  pageSize: number;
  fromCache: boolean;
  source: 'provider' | 'cache' | 'database' | 'empty';
  needsRefresh: boolean;
  cacheExpired: boolean;
  requestId: string | null;
}> {
  const query = String(params.query || '').trim();
  if (query.length < 2) throw new Error('SEARCH_QUERY_TOO_SHORT');
  if (query.length > 120) throw new Error('SEARCH_QUERY_TOO_LONG');
  const requestedPage = Number.parseInt(String(params.page || 1), 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.min(requestedPage, 20)) : 1;
  const region = String(params.region || DEFAULT_REGION).trim().toUpperCase();
  const forceRefresh = Boolean(params.forceRefresh);

  // Normal searches are ALWAYS free: first reuse any stored SocialCrawl result,
  // even when its refresh window has expired. Provider credits are spent only
  // through an explicit mentor refresh.
  if (!forceRefresh) {
    const stored = await getStoredPayload(query, region, page);
    if (stored) {
      const normalized = (stored.payload.data?.items || []).map(normalizeProduct).filter((item) => item.productId);
      const products = await attachTrendMetrics(normalized);
      return {
        products,
        creditsUsed: 0,
        creditsRemaining: null,
        hasMore: Boolean(stored.payload.pagination?.has_more),
        pageSize: Number(stored.payload.pagination?.page_size || products.length),
        fromCache: true,
        source: 'cache',
        needsRefresh: stored.expired,
        cacheExpired: stored.expired,
        requestId: stored.payload.request_id || null,
      };
    }

    // If this exact search has never been collected, search our own product bank.
    // This also costs zero SocialCrawl credits.
    if (isDatabaseConfigured()) {
      await ensureProductMinerTables();
      const safePageSize = 30;
      const offset = (page - 1) * safePageSize;
      const like = `%${query}%`;
      const [rows]: any = await db.query(
        `SELECT p.*
         FROM tiktok_shop_products p
         WHERE p.title LIKE ?
            OR p.seller_name LIKE ?
            OR p.category_path LIKE ?
            OR p.query_source LIKE ?
         ORDER BY
           CASE WHEN LOWER(p.query_source) = LOWER(?) THEN 0 ELSE 1 END,
           p.sold_count DESC,
           p.last_seen_at DESC
         LIMIT ? OFFSET ?`,
        [like, like, like, like, query, safePageSize + 1, offset]
      );
      const localRows = Array.isArray(rows) ? rows : [];
      const hasMore = localRows.length > safePageSize;
      const localProducts = localRows.slice(0, safePageSize).map(rowToProduct);
      if (localProducts.length > 0) {
        const products = await attachTrendMetrics(localProducts);
        return {
          products,
          creditsUsed: 0,
          creditsRemaining: null,
          hasMore,
          pageSize: safePageSize,
          fromCache: true,
          source: 'database',
          needsRefresh: true,
          cacheExpired: false,
          requestId: null,
        };
      }
    }

    return {
      products: [],
      creditsUsed: 0,
      creditsRemaining: null,
      hasMore: false,
      pageSize: 0,
      fromCache: true,
      source: 'empty',
      needsRefresh: true,
      cacheExpired: false,
      requestId: null,
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
  const normalized = (payload.data?.items || [])
    .map((rawItem, idx) => {
      const p = normalizeProduct(rawItem);
      p.collectionPosition = (page - 1) * 30 + (idx + 1);
      return p;
    })
    .filter((item) => item.productId);
  await persistProducts(normalized, query);
  const products = await attachTrendMetrics(normalized);

  return {
    products,
    creditsUsed: Number(payload.credits_used || 0),
    creditsRemaining: payload.credits_remaining ?? null,
    hasMore: Boolean(payload.pagination?.has_more),
    pageSize: Number(payload.pagination?.page_size || products.length),
    fromCache: false,
    source: 'provider',
    needsRefresh: false,
    cacheExpired: false,
    requestId: payload.request_id || null,
  };
}

export async function refreshMultiPageTikTokShopProducts(params: {
  query: string;
  region?: string;
  maxProducts?: number;
  page?: number;
}): Promise<{
  products: MinedProduct[];
  uniqueProductsCount: number;
  pagesConsulted: number;
  creditsUsed: number;
  creditsRemaining: number | null;
  hasMore: boolean;
  query: string;
  category: string;
  timestamp: string;
  partialError: string | null;
}> {
  const query = String(params.query || '').trim();
  if (query.length < 2) throw new Error('SEARCH_QUERY_TOO_SHORT');
  if (query.length > 120) throw new Error('SEARCH_QUERY_TOO_LONG');

  const region = String(params.region || DEFAULT_REGION).trim().toUpperCase();

  // Validate maxProducts (allowed: 30, 90, 150, 300; strictly capped at 300)
  let rawMax = Number(params.maxProducts || 90);
  if (!Number.isFinite(rawMax) || rawMax < 30) rawMax = 30;
  if (rawMax > 300) rawMax = 300;

  let startPage = 1;
  let maxPages = Math.min(10, Math.max(1, Math.ceil(rawMax / 30)));

  if (params.page && !params.maxProducts) {
    startPage = Math.max(1, Math.min(Number(params.page), 20));
    maxPages = startPage;
  }

  const seenProductIds = new Set<string>();
  const allUniqueProducts: MinedProduct[] = [];
  let pagesConsulted = 0;
  let totalCreditsUsed = 0;
  let creditsRemaining: number | null = null;
  let hasMore = true;
  let partialError: string | null = null;

  for (let p = startPage; p <= maxPages; p++) {
    try {
      const res = await searchTikTokShopProducts({
        query,
        page: p,
        region,
        forceRefresh: true,
      });

      pagesConsulted++;
      totalCreditsUsed += res.creditsUsed;
      if (res.creditsRemaining !== null) {
        creditsRemaining = res.creditsRemaining;
      }
      hasMore = res.hasMore;

      for (const prod of res.products) {
        if (prod.productId && !seenProductIds.has(prod.productId)) {
          seenProductIds.add(prod.productId);
          allUniqueProducts.push(prod);
        }
      }

      if (!hasMore || res.products.length === 0) {
        break;
      }
    } catch (err: any) {
      console.warn(`[MultiPage Collection Partial Failure on page ${p} for query "${query}"]:`, err?.message || err);
      partialError = err?.message || `Falha na página ${p}`;
      break;
    }
  }

  return {
    products: allUniqueProducts,
    uniqueProductsCount: allUniqueProducts.length,
    pagesConsulted,
    creditsUsed: totalCreditsUsed,
    creditsRemaining,
    hasMore,
    query,
    category: query,
    timestamp: new Date().toISOString(),
    partialError,
  };
}

export function rowToProduct(row: any): MinedProduct {
  return {
    productId: String(row.product_id),
    title: row.title,
    imageUrl: row.image_url,
    priceCents: row.price_cents === null ? null : Number(row.price_cents),
    originalPriceCents: row.original_price_cents === null ? null : Number(row.original_price_cents),
    discountPercent: row.discount_percent === null ? null : Number(row.discount_percent),
    currencySymbol: row.currency_symbol || 'R$',
    rating: row.rating === null ? null : Number(row.rating),
    soldCount: Number(row.sold_count || 0),
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
  };
}

export async function getProductMinerRanking(limit = 50, sort: ProductRankingSort = 'opportunities'): Promise<{
  products: MinedProduct[];
  meta: { trackedProducts: number; with24h: number; with7d: number; sort: ProductRankingSort };
}> {
  if (!isDatabaseConfigured()) {
    return { products: [], meta: { trackedProducts: 0, with24h: 0, with7d: 0, sort } };
  }
  await ensureProductMinerTables();
  const safeLimit = Math.max(1, Math.min(Number(limit || 50), 100));
  const [rows]: any = await db.query(
    `SELECT p.*
     FROM tiktok_shop_products p
     ORDER BY p.last_seen_at DESC, p.sold_count DESC
     LIMIT 500`
  );

  const baseProducts = (Array.isArray(rows) ? rows : []).map(rowToProduct);
  const enriched = await attachTrendMetrics(baseProducts);

  const sorted = [...enriched].sort((a, b) => {
    if (sort === 'opportunities') {
      const as = a.score ?? 0;
      const bs = b.score ?? 0;
      return bs - as || b.soldCount - a.soldCount;
    }
    if (sort === '24h') {
      const av = a.sales24h ?? -1;
      const bv = b.sales24h ?? -1;
      return bv - av || b.soldCount - a.soldCount;
    }
    if (sort === '7d') {
      const av = a.sales7d ?? -1;
      const bv = b.sales7d ?? -1;
      return bv - av || b.soldCount - a.soldCount;
    }
    if (sort === 'spiking') {
      const av = a.trendScore ?? -1;
      const bv = b.trendScore ?? -1;
      return bv - av || (b.sales24h ?? -1) - (a.sales24h ?? -1) || b.soldCount - a.soldCount;
    }
    return b.soldCount - a.soldCount || String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || ''));
  });

  let visible = sorted;
  if (sort === 'opportunities') {
    visible = sorted.slice(0, 20); // Limit to TOP 20 for Melhores Oportunidades
  } else if (sort === '24h') {
    visible = sorted.filter((product) => product.sales24h !== null && product.sales24h !== undefined).slice(0, safeLimit);
  } else if (sort === '7d') {
    visible = sorted.filter((product) => product.sales7d !== null && product.sales7d !== undefined).slice(0, safeLimit);
  } else if (sort === 'spiking') {
    visible = sorted.filter((product) => product.trendScore !== null && product.trendScore !== undefined).slice(0, safeLimit);
  } else {
    visible = sorted.slice(0, safeLimit);
  }

  return {
    products: visible,
    meta: {
      trackedProducts: enriched.length,
      with24h: enriched.filter((product) => product.sales24h !== null && product.sales24h !== undefined).length,
      with7d: enriched.filter((product) => product.sales7d !== null && product.sales7d !== undefined).length,
      sort,
    },
  };
}

export type CollectorCategoryStat = {
  category: string;
  productCount: number;
  lastCollectedAt: string | null;
  status: 'Ativa' | 'Pendente';
};

const COLLECTOR_CATEGORIES = ['Beleza', 'Casa', 'Moda', 'Cozinha', 'Eletrônicos', 'Fitness', 'Bebê', 'Pet'];

export async function getCollectorCategoriesStats(): Promise<CollectorCategoryStat[]> {
  if (!isDatabaseConfigured()) {
    return COLLECTOR_CATEGORIES.map((cat) => ({
      category: cat,
      productCount: 0,
      lastCollectedAt: null,
      status: 'Pendente',
    }));
  }

  await ensureProductMinerTables();

  const statsList: CollectorCategoryStat[] = [];

  for (const cat of COLLECTOR_CATEGORIES) {
    try {
      // 1. Prefer exact category search query cache timestamp
      const [cacheRows]: any = await db.query(
        `SELECT updated_at FROM tiktok_shop_search_cache
         WHERE LOWER(search_query) = LOWER(?) AND region = 'BR'
         ORDER BY updated_at DESC LIMIT 1`,
        [cat]
      );

      // 2. Exact category query snapshot timestamp
      const [snapshotTimeRows]: any = await db.query(
        `SELECT MAX(captured_at) as max_captured
         FROM tiktok_shop_product_snapshots
         WHERE LOWER(query_source) = LOWER(?)`,
        [cat]
      );

      // 3. Count products collected via this category query in snapshots and products table
      const [snapshotCountRows]: any = await db.query(
        `SELECT COUNT(DISTINCT product_id) as total_products
         FROM tiktok_shop_product_snapshots
         WHERE LOWER(query_source) = LOWER(?)`,
        [cat]
      );

      const [productCountRows]: any = await db.query(
        `SELECT COUNT(DISTINCT product_id) as total_products
         FROM tiktok_shop_products
         WHERE LOWER(query_source) = LOWER(?) OR category_path LIKE ?`,
        [cat, `%${cat}%`]
      );

      const cacheRow = Array.isArray(cacheRows) ? cacheRows[0] : null;
      const snapTimeRow = Array.isArray(snapshotTimeRows) ? snapshotTimeRows[0] : null;
      const snapCount = Number(Array.isArray(snapshotCountRows) ? snapshotCountRows[0]?.total_products || 0 : 0);
      const prodCount = Number(Array.isArray(productCountRows) ? productCountRows[0]?.total_products || 0 : 0);

      const productCount = Math.max(snapCount, prodCount);

      let lastCollectedAt: string | null = null;
      if (cacheRow?.updated_at) {
        lastCollectedAt = new Date(cacheRow.updated_at).toISOString();
      }
      if (snapTimeRow?.max_captured) {
        const snapDate = new Date(snapTimeRow.max_captured).toISOString();
        if (!lastCollectedAt || snapDate > lastCollectedAt) {
          lastCollectedAt = snapDate;
        }
      }

      statsList.push({
        category: cat,
        productCount,
        lastCollectedAt,
        status: productCount > 0 ? 'Ativa' : 'Pendente',
      });
    } catch (err: any) {
      console.warn(`[Collector Stats Error for ${cat}]:`, err?.message || err);
      statsList.push({
        category: cat,
        productCount: 0,
        lastCollectedAt: null,
        status: 'Pendente',
      });
    }
  }

  return statsList;
}
