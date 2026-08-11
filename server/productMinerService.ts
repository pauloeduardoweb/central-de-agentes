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

export const MAX_ASSOCIATED_VIDEOS = 9;

export type ProductRankingSort = 'opportunities' | 'total' | '24h' | '7d' | 'spiking';

export type MinedVideo = {
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
  sellerId: string | null;
  sellerName: string | null;
  productUrl: string | null;
  category: string | null;
  collectionPosition?: number | null;
  lastSeenAt?: string | Date | null;
  estimatedCommissionCents?: number | null;
  commissionRatePercent?: number | null;
  video: MinedVideo | null;
  associatedVideos?: MinedVideo[];
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

function parseCurrencyToCents(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value).trim().replace(',', '.');
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 0) return null;
  // Convert currency units (e.g. 154 or 154.50 BRL) to cents (15400 or 15450)
  return Math.round(num * 100);
}

function parseCents(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value).trim().replace(',', '.');
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num);
}

function parseRating(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getPriceCascadeDetails(item: any, priceObj: any) {
  const saleCascade: Array<{ name: string; val: any }> = [
    { name: 'product_price_info.real_price_decimal', val: priceObj?.real_price_decimal },
    { name: 'product_price_info.real_price', val: priceObj?.real_price },
    { name: 'product_price_info.sale_price_decimal', val: priceObj?.sale_price_decimal },
    { name: 'product_price_info.sale_price', val: priceObj?.sale_price },
    { name: 'product_price_info.price_decimal', val: priceObj?.price_decimal },
    { name: 'product_price_info.price', val: priceObj?.price },
    { name: 'product_price_info.min_price_decimal', val: priceObj?.min_price_decimal },
    { name: 'product_price_info.min_price', val: priceObj?.min_price },
    { name: 'item.real_price', val: item?.real_price },
    { name: 'item.sale_price', val: item?.sale_price },
    { name: 'item.price', val: item?.price },
  ];

  const selectedSale = saleCascade.find((c) => c.val !== undefined && c.val !== null) || {
    name: 'none',
    val: undefined,
  };

  const originCascade: Array<{ name: string; val: any }> = [
    { name: 'product_price_info.origin_price_decimal', val: priceObj?.origin_price_decimal },
    { name: 'product_price_info.original_price_decimal', val: priceObj?.original_price_decimal },
    { name: 'product_price_info.origin_price', val: priceObj?.origin_price },
    { name: 'product_price_info.original_price', val: priceObj?.original_price },
    { name: 'product_price_info.max_price_decimal', val: priceObj?.max_price_decimal },
    { name: 'product_price_info.max_price', val: priceObj?.max_price },
    { name: 'item.origin_price', val: item?.origin_price },
    { name: 'item.original_price', val: item?.original_price },
  ];

  const selectedOrigin = originCascade.find((c) => c.val !== undefined && c.val !== null) || {
    name: 'none',
    val: undefined,
  };

  return {
    selectedSaleField: selectedSale.name,
    selectedSaleRawValue: selectedSale.val,
    selectedOriginField: selectedOrigin.name,
    selectedOriginRawValue: selectedOrigin.val,
  };
}

function normalizeProduct(item: any, sourceEndpoint: string = 'SocialCrawl Provider'): MinedProduct {
  const priceObj = item?.product_price_info || item?.price_info || item?.price || item?.price_range || {};
  const video = item?.video || null;
  const stats = video?.statistics || {};
  const author = video?.author || {};
  let category = Array.isArray(item?.category_breadcrumb)
    ? item.category_breadcrumb.map((entry: any) => entry?.category_name || entry?.name || entry).filter(Boolean).join(' > ')
    : null;

  if (!category) {
    category = item?.category_path || item?.category_name || item?.category || null;
  }

  const rawSalePrice = priceObj?.real_price_decimal ??
                       priceObj?.real_price ??
                       priceObj?.sale_price_decimal ??
                       priceObj?.sale_price ??
                       priceObj?.price_decimal ??
                       priceObj?.price ??
                       priceObj?.min_price_decimal ??
                       priceObj?.min_price ??
                       item?.real_price ??
                       item?.sale_price ??
                       item?.price;

  const rawOriginPrice = priceObj?.origin_price_decimal ??
                         priceObj?.original_price_decimal ??
                         priceObj?.origin_price ??
                         priceObj?.original_price ??
                         priceObj?.max_price_decimal ??
                         priceObj?.max_price ??
                         item?.origin_price ??
                         item?.original_price;

  const priceCents = parseCurrencyToCents(rawSalePrice);
  const originalPriceCents = parseCurrencyToCents(rawOriginPrice);

  let discountPercent = priceObj?.discount_decimal !== undefined && priceObj?.discount_decimal !== null
    ? Math.round(Number(priceObj.discount_decimal) * 100)
    : null;

  if ((discountPercent === null || discountPercent === 0) && priceCents && originalPriceCents && originalPriceCents > priceCents) {
    discountPercent = Math.round(((originalPriceCents - priceCents) / originalPriceCents) * 100);
  }

  const commInfo = item?.commission_info || item?.affiliate_info || item?.commission || item?.promotion_info || item?.collaboration_info || item?.creator_commission_info || {};
  let commRate = parseRating(
    commInfo?.commission_rate ??
    commInfo?.commission_percent ??
    commInfo?.rate ??
    item?.commission_rate ??
    item?.commission_percent ??
    item?.commission_rate_percent ??
    item?.affiliate_commission_rate ??
    item?.creator_commission_rate
  );
  if (commRate !== null && commRate > 0 && commRate <= 1) {
    commRate = Math.round(commRate * 100);
  }
  let commCents = parseCents(
    commInfo?.commission_amount ??
    commInfo?.estimated_commission_cents ??
    item?.commission_amount ??
    item?.estimated_commission_cents ??
    item?.affiliate_commission_amount ??
    item?.earn_amount ??
    item?.earnings
  );
  if (commCents === null) {
    commCents = parseCurrencyToCents(
      commInfo?.estimated_commission ??
      commInfo?.commission ??
      item?.estimated_commission
    );
  }
  if (commCents === null && commRate !== null && commRate > 0 && priceCents) {
    commCents = Math.round((priceCents * commRate) / 100);
  }

  const rawProductUrl = item?.seo_url?.canonical_url
    || item?.product_url
    || item?.pdp_url
    || item?.detail_url;

  const cleanProductId = item?.product_id ? String(item.product_id).trim() : '';

  let resolvedProductUrl: string | null = null;
  if (rawProductUrl && typeof rawProductUrl === 'string') {
    const trimmed = rawProductUrl.trim();
    const isSearch = trimmed.includes('/search') ||
                     trimmed.includes('/query') ||
                     trimmed.includes('/store/search') ||
                     trimmed.includes('q=') ||
                     trimmed.includes('search_id=') ||
                     trimmed.includes('keyword=');
    if (!isSearch && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
      resolvedProductUrl = trimmed;
    }
  }

  const isDebug = process.env.NODE_ENV !== 'production' || process.env.MINER_DEBUG === 'true';
  if (isDebug) {
    const cascade = getPriceCascadeDetails(item, priceObj);
    const skus = item?.skus || item?.sku_list || item?.skus_list || item?.variants || null;

    console.log(`[MINER DIAGNOSTIC LOG] ========================================`);
    console.log(`product_id:`, String(item?.product_id || ''));
    console.log(`title:`, String(item?.title || ''));
    console.log(`seller:`, item?.seller_info?.shop_name || item?.seller_info?.seller_id || item?.seller_name || null);
    console.log(`endpoint/origem:`, sourceEndpoint);
    console.log(`currency_name:`, priceObj?.currency || item?.currency_name || item?.currency || null);
    console.log(`currency_symbol:`, priceObj?.currency_symbol || item?.currency_symbol || item?.currency || null);
    console.log(`product_price_info completo:`, item?.product_price_info ? JSON.stringify(item.product_price_info) : null);
    console.log(`price_info completo:`, item?.price_info ? JSON.stringify(item.price_info) : null);
    console.log(`price completo:`, item?.price ? JSON.stringify(item.price) : null);
    console.log(`price_range completo:`, item?.price_range ? JSON.stringify(item.price_range) : null);
    console.log(`item.sale_price:`, item?.sale_price ?? null);
    console.log(`item.real_price:`, item?.real_price ?? null);
    console.log(`item.price:`, item?.price ?? null);
    if (skus) {
      console.log(`skus / sku_list:`, JSON.stringify(skus));
    }
    console.log(`selectedPriceField:`, cascade.selectedSaleField);
    console.log(`selectedPriceRawValue:`, cascade.selectedSaleRawValue);
    console.log(`normalizedPriceCents (priceCents):`, priceCents);
    console.log(`selectedOriginalPriceField:`, cascade.selectedOriginField);
    console.log(`selectedOriginalPriceRawValue:`, cascade.selectedOriginRawValue);
    console.log(`normalizedOriginalPriceCents:`, originalPriceCents);
    console.log(`URL original recebida:`, rawProductUrl || null);
    console.log(`URL final escolhida:`, resolvedProductUrl);
    console.log(`================================================================`);
  }

  const rawVideoList: any[] = [];
  if (item?.video && typeof item.video === 'object') {
    rawVideoList.push(item.video);
  }
  if (Array.isArray(item?.videos)) {
    rawVideoList.push(...item.videos);
  }
  if (Array.isArray(item?.associated_videos)) {
    rawVideoList.push(...item.associated_videos);
  }
  if (Array.isArray(item?.associatedVideos)) {
    rawVideoList.push(...item.associatedVideos);
  }

  const vMap = new Map<string, MinedVideo>();
  for (const vItem of rawVideoList) {
    if (!vItem) continue;
    const awemeId = vItem?.aweme_id ? String(vItem.aweme_id) : (vItem?.id ? String(vItem.id) : null);
    if (!awemeId) continue;
    const vStats = vItem?.statistics || {};
    const vAuthor = vItem?.author || {};
    const videoObj: MinedVideo = {
      id: awemeId,
      url: vItem?.share_url || vItem?.url || null,
      description: vItem?.desc || vItem?.description || null,
      author: vAuthor?.unique_id || vAuthor?.nickname || (typeof vItem?.author === 'string' ? vItem.author : null),
      authorFollowers: parseInteger(vAuthor?.follower_count || vAuthor?.followers),
      views: parseInteger(vStats?.play_count || vStats?.views || vItem?.views || vItem?.play_count),
      likes: parseInteger(vStats?.digg_count || vStats?.likes || vItem?.likes || vItem?.digg_count),
      comments: parseInteger(vStats?.comment_count || vStats?.comments || vItem?.comments),
      shares: parseInteger(vStats?.share_count || vStats?.shares || vItem?.shares),
      saves: parseInteger(vStats?.collect_count || vStats?.saves || vItem?.saves),
    };
    const existing = vMap.get(awemeId);
    if (!existing || compareMinedVideosDesc(videoObj, existing) < 0) {
      vMap.set(awemeId, videoObj);
    }
  }

  const associatedVideosList = Array.from(vMap.values())
    .sort(compareMinedVideosDesc)
    .slice(0, MAX_ASSOCIATED_VIDEOS);

  const fallbackSingleVideo: MinedVideo | null = video ? {
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
  } : null;

  const primaryVideo = associatedVideosList.length > 0 ? associatedVideosList[0] : fallbackSingleVideo;

  return {
    productId: String(item?.product_id || ''),
    title: String(item?.title || 'Produto sem nome'),
    imageUrl: item?.image?.url_list?.[0] || null,
    priceCents,
    originalPriceCents,
    discountPercent,
    currencySymbol: String(priceObj?.currency_symbol || item?.currency_symbol || item?.currency || 'R$'),
    rating: parseRating(item?.rate_info?.score),
    soldCount: parseInteger(item?.sold_info?.sold_count) || 0,
    sellerId: item?.seller_info?.seller_id ? String(item.seller_info.seller_id) : null,
    sellerName: item?.seller_info?.shop_name ? String(item.seller_info.shop_name) : null,
    productUrl: resolvedProductUrl,
    category,
    estimatedCommissionCents: commCents && commCents > 0 ? commCents : null,
    commissionRatePercent: commRate && commRate > 0 ? commRate : null,
    video: primaryVideo,
    associatedVideos: associatedVideosList,
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
    product.estimatedCommissionCents || null,
    product.commissionRatePercent || null,
    query,
  ]);

  await db.query(
    `INSERT INTO tiktok_shop_products (
      product_id, title, image_url, price_cents, original_price_cents, discount_percent,
      currency_symbol, rating, sold_count, seller_id, seller_name, product_url, category_path,
      video_id, video_url, video_author, video_author_followers, video_views, video_likes,
      video_comments, video_shares, video_saves, estimated_commission_cents, commission_rate_percent, query_source
    ) VALUES ?
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      image_url = VALUES(image_url),
      price_cents = IF(VALUES(price_cents) IS NOT NULL AND VALUES(price_cents) > 0, VALUES(price_cents), price_cents),
      original_price_cents = IF(VALUES(original_price_cents) IS NOT NULL AND VALUES(original_price_cents) > 0, VALUES(original_price_cents), original_price_cents),
      discount_percent = VALUES(discount_percent),
      currency_symbol = VALUES(currency_symbol),
      rating = VALUES(rating),
      sold_count = VALUES(sold_count),
      seller_id = VALUES(seller_id),
      seller_name = VALUES(seller_name),
      product_url = IF(VALUES(product_url) IS NOT NULL AND VALUES(product_url) != '', VALUES(product_url), product_url),
      category_path = VALUES(category_path), video_id = VALUES(video_id), video_url = VALUES(video_url),
      video_author = VALUES(video_author), video_author_followers = VALUES(video_author_followers),
      video_views = VALUES(video_views), video_likes = VALUES(video_likes), video_comments = VALUES(video_comments),
      video_shares = VALUES(video_shares), video_saves = VALUES(video_saves),
      estimated_commission_cents = VALUES(estimated_commission_cents), commission_rate_percent = VALUES(commission_rate_percent),
      query_source = VALUES(query_source),
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

  for (const p of validProducts) {
    const vList = p.associatedVideos && p.associatedVideos.length > 0
      ? p.associatedVideos
      : (p.video && p.video.id ? [p.video] : []);
    if (vList.length > 0) {
      await saveVideosToProductVideosTable(p.productId, vList).catch(() => {});
    }
  }
}

export function compareMinedVideosDesc(a: MinedVideo, b: MinedVideo): number {
  const viewsA = a.views ?? 0;
  const viewsB = b.views ?? 0;
  if (viewsA !== viewsB) return viewsB - viewsA;

  const likesA = a.likes ?? 0;
  const likesB = b.likes ?? 0;
  if (likesA !== likesB) return likesB - likesA;

  const sharesA = a.shares ?? 0;
  const sharesB = b.shares ?? 0;
  if (sharesA !== sharesB) return sharesB - sharesA;

  const savesA = a.saves ?? 0;
  const savesB = b.saves ?? 0;
  return savesB - savesA;
}

export async function saveVideosToProductVideosTable(productId: string, videos: MinedVideo[]): Promise<void> {
  if (!isDatabaseConfigured() || !productId || !videos || videos.length === 0) return;
  await ensureProductMinerTables();

  const validVideos = videos.filter((v) => v && v.id && String(v.id).trim() !== '');
  if (validVideos.length === 0) return;

  for (const v of validVideos) {
    const videoId = String(v.id).trim();
    const videoUrl = v.url ? String(v.url) : null;
    const author = v.author ? String(v.author) : null;
    const authorFollowers = v.authorFollowers === null || v.authorFollowers === undefined ? null : Number(v.authorFollowers);
    const views = v.views === null || v.views === undefined ? null : Number(v.views);
    const likes = v.likes === null || v.likes === undefined ? null : Number(v.likes);
    const comments = v.comments === null || v.comments === undefined ? null : Number(v.comments);
    const shares = v.shares === null || v.shares === undefined ? null : Number(v.shares);
    const saves = v.saves === null || v.saves === undefined ? null : Number(v.saves);
    const description = v.description ? String(v.description) : null;

    await db.query(
      `INSERT INTO tiktok_shop_product_videos (
        product_id, video_id, video_url, video_author, video_author_followers,
        video_views, video_likes, video_comments, video_shares, video_saves, video_description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        video_url = IF(VALUES(video_url) IS NOT NULL AND VALUES(video_url) != '', VALUES(video_url), video_url),
        video_author = COALESCE(VALUES(video_author), video_author),
        video_author_followers = COALESCE(VALUES(video_author_followers), video_author_followers),
        video_views = GREATEST(COALESCE(VALUES(video_views), 0), COALESCE(video_views, 0)),
        video_likes = GREATEST(COALESCE(VALUES(video_likes), 0), COALESCE(video_likes, 0)),
        video_comments = COALESCE(VALUES(video_comments), video_comments),
        video_shares = COALESCE(VALUES(video_shares), video_shares),
        video_saves = COALESCE(VALUES(video_saves), video_saves),
        video_description = COALESCE(VALUES(video_description), video_description),
        updated_at = NOW()`,
      [
        productId,
        videoId,
        videoUrl,
        author,
        authorFollowers,
        views,
        likes,
        comments,
        shares,
        saves,
        description,
      ]
    ).catch((vErr: any) => {
      console.warn('[Save Video Row Error]:', vErr?.message || vErr);
    });
  }

  // Enforce MAX_ASSOCIATED_VIDEOS per product: keep top MAX_ASSOCIATED_VIDEOS by views, likes, shares, saves
  const [existingRows]: any = await db.query(
    `SELECT video_id
     FROM tiktok_shop_product_videos
     WHERE product_id = ?
     ORDER BY COALESCE(video_views, 0) DESC,
              COALESCE(video_likes, 0) DESC,
              COALESCE(video_shares, 0) DESC,
              COALESCE(video_saves, 0) DESC,
              id DESC`,
    [productId]
  ).catch(() => [[]]);

  if (Array.isArray(existingRows) && existingRows.length > MAX_ASSOCIATED_VIDEOS) {
    const topIds = existingRows.slice(0, MAX_ASSOCIATED_VIDEOS).map((r: any) => String(r.video_id));
    await db.query(
      `DELETE FROM tiktok_shop_product_videos
       WHERE product_id = ? AND video_id NOT IN (?)`,
      [productId, topIds]
    ).catch(() => {});
  }
}

export async function attachAssociatedVideos(products: MinedProduct[]): Promise<MinedProduct[]> {
  if (!isDatabaseConfigured() || !products || products.length === 0) return products;
  await ensureProductMinerTables();

  const productIds = Array.from(new Set(products.map((p) => p.productId).filter(Boolean)));
  if (productIds.length === 0) return products;

  try {
    const [rows]: any = await db.query(
      `SELECT product_id, video_id, video_url, video_author, video_author_followers,
              video_views, video_likes, video_comments, video_shares, video_saves, video_description
       FROM tiktok_shop_product_videos
       WHERE product_id IN (?)
       ORDER BY product_id,
                COALESCE(video_views, 0) DESC,
                COALESCE(video_likes, 0) DESC,
                COALESCE(video_shares, 0) DESC,
                COALESCE(video_saves, 0) DESC,
                id DESC`,
      [productIds]
    );

    const videoMap = new Map<string, MinedVideo[]>();
    if (Array.isArray(rows)) {
      for (const row of rows) {
        const pId = String(row.product_id);
        if (!videoMap.has(pId)) {
          videoMap.set(pId, []);
        }
        const currentList = videoMap.get(pId)!;
        if (currentList.length < MAX_ASSOCIATED_VIDEOS) {
          currentList.push({
            id: String(row.video_id),
            url: row.video_url,
            description: row.video_description,
            author: row.video_author,
            authorFollowers: row.video_author_followers === null ? null : Number(row.video_author_followers),
            views: row.video_views === null ? null : Number(row.video_views),
            likes: row.video_likes === null ? null : Number(row.video_likes),
            comments: row.video_comments === null ? null : Number(row.video_comments),
            shares: row.video_shares === null ? null : Number(row.video_shares),
            saves: row.video_saves === null ? null : Number(row.video_saves),
          });
        }
      }
    }

    for (const p of products) {
      const vList = videoMap.get(p.productId) || [];
      if (vList.length > 0) {
        p.associatedVideos = vList;
        p.video = vList[0];
      } else if (p.video && p.video.id) {
        p.associatedVideos = [p.video];
      } else {
        p.associatedVideos = [];
      }
    }
  } catch (err) {
    console.warn('[attachAssociatedVideos Error]:', err);
    for (const p of products) {
      if (!p.associatedVideos) {
        p.associatedVideos = p.video && p.video.id ? [p.video] : [];
      }
    }
  }

  return products;
}

export async function backfillLegacyVideosToProductVideos(): Promise<{ processedCount: number; insertedCount: number }> {
  if (!isDatabaseConfigured()) return { processedCount: 0, insertedCount: 0 };
  await ensureProductMinerTables();

  const [rows]: any = await db.query(`
    SELECT product_id, video_id, video_url, video_author, video_author_followers,
           video_views, video_likes, video_comments, video_shares, video_saves
    FROM tiktok_shop_products
    WHERE video_id IS NOT NULL AND video_id != ''
  `);

  const list = Array.isArray(rows) ? rows : [];
  let insertedCount = 0;

  for (const row of list) {
    const video: MinedVideo = {
      id: String(row.video_id),
      url: row.video_url,
      author: row.video_author,
      authorFollowers: row.video_author_followers === null ? null : Number(row.video_author_followers),
      views: row.video_views === null ? null : Number(row.video_views),
      likes: row.video_likes === null ? null : Number(row.video_likes),
      comments: row.video_comments === null ? null : Number(row.video_comments),
      shares: row.video_shares === null ? null : Number(row.video_shares),
      saves: row.video_saves === null ? null : Number(row.video_saves),
    };

    await saveVideosToProductVideosTable(String(row.product_id), [video]);
    insertedCount++;
  }

  return { processedCount: list.length, insertedCount };
}

export async function extractVideosFromSearchCachePayloads(): Promise<{
  cacheRowsProcessed: number;
  totalProductsFound: number;
  totalVideosExtracted: number;
  totalVideosInserted: number;
}> {
  if (!isDatabaseConfigured()) return { cacheRowsProcessed: 0, totalProductsFound: 0, totalVideosExtracted: 0, totalVideosInserted: 0 };
  await ensureProductMinerTables();

  const [rows]: any = await db.query(`
    SELECT payload_json FROM tiktok_shop_search_cache
  `);

  const cacheRows = Array.isArray(rows) ? rows : [];
  let cacheRowsProcessed = 0;
  let totalProductsFound = 0;
  let totalVideosExtracted = 0;
  let totalVideosInserted = 0;

  const productVideosMap = new Map<string, Map<string, MinedVideo>>();

  for (const row of cacheRows) {
    if (!row.payload_json) continue;
    cacheRowsProcessed++;
    try {
      const parsed = typeof row.payload_json === 'string' ? JSON.parse(row.payload_json) : row.payload_json;
      const items = parsed?.data?.products || parsed?.data?.items || parsed?.products || parsed?.items || (Array.isArray(parsed) ? parsed : []);

      if (Array.isArray(items)) {
        for (const item of items) {
          const productId = item?.product_id ? String(item.product_id).trim() : '';
          if (!productId) continue;
          totalProductsFound++;

          const rawVideoList: any[] = [];
          if (item?.video && typeof item.video === 'object') {
            rawVideoList.push(item.video);
          }
          if (Array.isArray(item?.videos)) {
            rawVideoList.push(...item.videos);
          }
          if (Array.isArray(item?.associated_videos)) {
            rawVideoList.push(...item.associated_videos);
          }
          if (Array.isArray(item?.associatedVideos)) {
            rawVideoList.push(...item.associatedVideos);
          }

          for (const v of rawVideoList) {
            if (!v) continue;
            const awemeId = v?.aweme_id ? String(v.aweme_id) : (v?.id ? String(v.id) : null);
            if (!awemeId) continue;

            totalVideosExtracted++;

            const stats = v?.statistics || {};
            const author = v?.author || {};

            const videoObj: MinedVideo = {
              id: awemeId,
              url: v?.share_url || v?.url || null,
              description: v?.desc || v?.description || null,
              author: author?.unique_id || author?.nickname || (typeof v?.author === 'string' ? v.author : null),
              authorFollowers: parseInteger(author?.follower_count || author?.followers),
              views: parseInteger(stats?.play_count || stats?.views || v?.views || v?.play_count),
              likes: parseInteger(stats?.digg_count || stats?.likes || v?.likes || v?.digg_count),
              comments: parseInteger(stats?.comment_count || stats?.comments || v?.comments),
              shares: parseInteger(stats?.share_count || stats?.shares || v?.shares),
              saves: parseInteger(stats?.collect_count || stats?.saves || v?.saves),
            };

            if (!productVideosMap.has(productId)) {
              productVideosMap.set(productId, new Map());
            }
            const vMap = productVideosMap.get(productId)!;
            const existing = vMap.get(awemeId);
            if (!existing || compareMinedVideosDesc(videoObj, existing) < 0) {
              vMap.set(awemeId, videoObj);
            }
          }
        }
      }
    } catch (err) {
      // Ignore JSON parse errors
    }
  }

  for (const [productId, vMap] of productVideosMap.entries()) {
    const videoList = Array.from(vMap.values()).sort(compareMinedVideosDesc);
    if (videoList.length > 0) {
      await saveVideosToProductVideosTable(productId, videoList);
      totalVideosInserted += videoList.length;
    }
  }

  return {
    cacheRowsProcessed,
    totalProductsFound,
    totalVideosExtracted,
    totalVideosInserted,
  };
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

async function attachTrendMetrics(products: MinedProduct[]): Promise<MinedProduct[]> {
  if (!isDatabaseConfigured() || products.length === 0) {
    return products.map((product) => ({
      ...product,
      sales24h: null,
      sales7d: null,
      growth24hPercent: null,
      growth7dPercent: null,
      trendScore: null,
    }));
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

  const enrichedProducts = products.map((product) => {
    const list = snapshots.get(product.productId) || [];
    const baseline24h = chooseBaseline(list, 24, 18, 48);
    const baseline7d = chooseBaseline(list, 168, 120, 216);
    const metric24h = calculateWindowMetric(product.soldCount, baseline24h, 24);
    const metric7d = calculateWindowMetric(product.soldCount, baseline7d, 168);
    const trendScore = metric24h.sales === null
      ? null
      : Math.round(metric24h.sales * (1 + Math.min(Math.max(metric24h.growth || 0, 0), 300) / 100));

    return {
      ...product,
      sales24h: metric24h.sales,
      sales7d: metric7d.sales,
      growth24hPercent: metric24h.growth,
      growth7dPercent: metric7d.growth,
      trendScore,
    };
  });

  return attachVideoDownloads(enrichedProducts);
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

export function buildProductSearchWhereClause(params: {
  query?: string;
  category?: string;
  subcategory?: string;
}): { whereSql: string; sqlParams: any[]; querySourceForOrder: string | null } {
  const whereConditions: string[] = [];
  const sqlParams: any[] = [];

  const rawQuery = String(params.query || '').trim();
  const rawCategory = String(params.category || '').trim();
  const rawSubcategory = String(params.subcategory || '').trim();

  let categoryToUse = rawCategory;
  if (categoryToUse.toLowerCase() === 'todos' || categoryToUse.toLowerCase() === 'todas') {
    categoryToUse = '';
  }

  let subcategoryToUse = rawSubcategory;
  if (subcategoryToUse.toLowerCase() === 'todas' || subcategoryToUse.toLowerCase() === 'todos') {
    subcategoryToUse = '';
  }

  // 1. Category Filter
  if (categoryToUse) {
    whereConditions.push(`(
      TRIM(p.query_source) = ?
      OR LOWER(TRIM(p.query_source)) = LOWER(?)
      OR p.category_path = ?
      OR p.category_path LIKE ?
    )`);
    sqlParams.push(categoryToUse, categoryToUse, categoryToUse, `${categoryToUse} >%`);
  }

  // 2. Subcategory Filter
  if (subcategoryToUse) {
    if (categoryToUse) {
      whereConditions.push(`(
        p.category_path = ?
        OR p.category_path LIKE ?
        OR p.category_path LIKE ?
        OR p.category_path LIKE ?
        OR p.category_path = ?
      )`);
      const exactPath = `${categoryToUse} > ${subcategoryToUse}`;
      const prefixPath = `${categoryToUse} > ${subcategoryToUse} >%`;
      const endPath = `%> ${subcategoryToUse}`;
      const midPath = `%> ${subcategoryToUse} >%`;
      sqlParams.push(exactPath, prefixPath, endPath, midPath, subcategoryToUse);
    } else {
      whereConditions.push(`(
        p.category_path LIKE ?
        OR p.category_path LIKE ?
        OR p.category_path = ?
      )`);
      sqlParams.push(`%> ${subcategoryToUse}`, `%> ${subcategoryToUse} >%`, subcategoryToUse);
    }
  }

  // 3. Search Query Filter
  let querySourceForOrder: string | null = null;
  if (rawQuery) {
    const isMainCatName = COLLECTOR_CATEGORIES.some((c) => c.toLowerCase() === rawQuery.toLowerCase());
    if (isMainCatName && !categoryToUse) {
      whereConditions.push(`(
        TRIM(p.query_source) = ?
        OR LOWER(TRIM(p.query_source)) = LOWER(?)
        OR p.category_path = ?
        OR p.category_path LIKE ?
        OR p.title LIKE ?
        OR p.seller_name LIKE ?
      )`);
      const likeQ = `%${rawQuery}%`;
      sqlParams.push(rawQuery, rawQuery, rawQuery, `${rawQuery} >%`, likeQ, likeQ);
      querySourceForOrder = rawQuery;
    } else {
      whereConditions.push(`(
        p.title LIKE ?
        OR p.seller_name LIKE ?
        OR p.category_path LIKE ?
        OR p.query_source LIKE ?
      )`);
      const likeQ = `%${rawQuery}%`;
      sqlParams.push(likeQ, likeQ, likeQ, likeQ);
    }
  } else if (categoryToUse) {
    querySourceForOrder = categoryToUse;
  }

  const whereSql = whereConditions.length > 0 ? whereConditions.join(' AND ') : '1=1';

  return {
    whereSql,
    sqlParams,
    querySourceForOrder,
  };
}

function getCategoryWhereClause(query: string): { whereSql: string; params: any[] } {
  const { whereSql, sqlParams } = buildProductSearchWhereClause({ query });
  return { whereSql, params: sqlParams };
}

function logMinerAcquisition(details: {
  category?: string;
  query: string;
  page: number;
  region: string;
  endpoint: string;
  requestUrl?: string;
  requestExecuted: boolean;
  httpStatus?: number | null;
  itemsReceived?: number;
  creditsUsed?: number | null;
  skipReason?: string | null;
}) {
  console.log(`[MINER ACQUISITION] ========================================`);
  if (details.category) console.log(`category: ${details.category}`);
  console.log(`query: ${details.query}`);
  console.log(`page: ${details.page}`);
  console.log(`region: ${details.region}`);
  console.log(`endpoint: ${details.endpoint}`);
  if (details.requestUrl) console.log(`requestUrl: ${details.requestUrl}`);
  console.log(`requestExecuted: ${details.requestExecuted}`);
  if (details.skipReason) console.log(`skipReason: "${details.skipReason}"`);
  if (details.httpStatus !== undefined && details.httpStatus !== null) console.log(`httpStatus: ${details.httpStatus}`);
  if (details.itemsReceived !== undefined) console.log(`itemsReceived: ${details.itemsReceived}`);
  if (details.creditsUsed !== undefined && details.creditsUsed !== null) console.log(`creditsUsed: ${details.creditsUsed}`);
  console.log(`================================================================`);
}

export async function searchTikTokShopProducts(params: {
  query?: string;
  category?: string;
  subcategory?: string;
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
  const category = String(params.category || '').trim();
  const subcategory = String(params.subcategory || '').trim();

  if (query.length === 1) {
    logMinerAcquisition({
      category,
      query,
      page: 1,
      region: params.region || DEFAULT_REGION,
      endpoint: '/v1/tiktokshop/search',
      requestExecuted: false,
      skipReason: 'SEARCH_QUERY_TOO_SHORT',
    });
    throw new Error('SEARCH_QUERY_TOO_SHORT');
  }
  if (query.length > 120) {
    logMinerAcquisition({
      category,
      query,
      page: 1,
      region: params.region || DEFAULT_REGION,
      endpoint: '/v1/tiktokshop/search',
      requestExecuted: false,
      skipReason: 'SEARCH_QUERY_TOO_LONG',
    });
    throw new Error('SEARCH_QUERY_TOO_LONG');
  }
  const requestedPage = Number.parseInt(String(params.page || 1), 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.min(requestedPage, 50)) : 1;
  const region = String(params.region || DEFAULT_REGION).trim().toUpperCase();
  const forceRefresh = Boolean(params.forceRefresh);

  // Normal searches are ALWAYS free: first reuse any stored SocialCrawl result,
  // or query our MySQL database. Provider credits are spent only through an explicit mentor refresh.
  if (!forceRefresh) {
    if (isDatabaseConfigured()) {
      await ensureProductMinerTables();
      const safePageSize = 30;
      const offset = (page - 1) * safePageSize;

      const { whereSql, sqlParams, querySourceForOrder } = buildProductSearchWhereClause({
        query,
        category,
        subcategory,
      });

      const orderClause = querySourceForOrder
        ? `ORDER BY CASE WHEN LOWER(TRIM(p.query_source)) = LOWER(?) THEN 0 ELSE 1 END, p.sold_count DESC, p.last_seen_at DESC`
        : `ORDER BY p.sold_count DESC, p.last_seen_at DESC`;

      const orderParams = querySourceForOrder ? [querySourceForOrder] : [];

      const [rows]: any = await db.query(
        `SELECT p.*
         FROM tiktok_shop_products p
         WHERE ${whereSql}
         ${orderClause}
         LIMIT ? OFFSET ?`,
        [...sqlParams, ...orderParams, safePageSize + 1, offset]
      );

      const localRows = Array.isArray(rows) ? rows : [];
      let hasMore = localRows.length > safePageSize;
      let localProducts = localRows.slice(0, safePageSize).map(rowToProduct);

      // Fallback: If requested page > 1 has no products, return page 1
      if (localProducts.length === 0 && page > 1) {
        const [fallbackRows]: any = await db.query(
          `SELECT p.*
           FROM tiktok_shop_products p
           WHERE ${whereSql}
           ${orderClause}
           LIMIT ? OFFSET 0`,
          [...sqlParams, ...orderParams, safePageSize + 1]
        );
        const fRows = Array.isArray(fallbackRows) ? fallbackRows : [];
        hasMore = fRows.length > safePageSize;
        localProducts = fRows.slice(0, safePageSize).map(rowToProduct);
      }

      const productsWithTrends = await attachTrendMetrics(localProducts);
      const products = await attachAssociatedVideos(productsWithTrends);
      logMinerAcquisition({
        category,
        query,
        page,
        region,
        endpoint: '/v1/tiktokshop/search',
        requestExecuted: false,
        skipReason: 'forceRefresh=false & local DB hit',
        itemsReceived: products.length,
        creditsUsed: 0,
      });

      return {
        products,
        creditsUsed: 0,
        creditsRemaining: null,
        hasMore,
        pageSize: safePageSize,
        fromCache: true,
        source: products.length > 0 ? 'database' : 'empty',
        needsRefresh: false,
        cacheExpired: false,
        requestId: null,
      };
    }

    logMinerAcquisition({
      category,
      query,
      page,
      region,
      endpoint: '/v1/tiktokshop/search',
      requestExecuted: false,
      skipReason: 'forceRefresh=false & database not configured',
    });

    return {
      products: [],
      creditsUsed: 0,
      creditsRemaining: null,
      hasMore: false,
      pageSize: 0,
      fromCache: true,
      source: 'empty',
      needsRefresh: false,
      cacheExpired: false,
      requestId: null,
    };
  }

  // forceRefresh is true -> Prepare SocialCrawl API call
  let apiKey = '';
  try {
    apiKey = getSocialCrawlApiKey();
  } catch (keyErr: any) {
    logMinerAcquisition({
      query,
      page,
      region,
      endpoint: '/v1/tiktokshop/search',
      requestExecuted: false,
      skipReason: 'SOCIALCRAWL_API_KEY_MISSING',
    });
    throw keyErr;
  }

  const isInfantil = query.toLowerCase() === 'infantil';
  const providerQuery = isInfantil ? 'moda infantil' : query;

  const url = new URL(`${SOCIALCRAWL_BASE_URL}/tiktokshop/search`);
  url.searchParams.set('query', providerQuery);
  url.searchParams.set('region', region);
  url.searchParams.set('page', String(page));

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'GeracaoZPro/1.0',
      },
      signal: AbortSignal.timeout(30000),
    });
  } catch (fetchErr: any) {
    logMinerAcquisition({
      query: providerQuery,
      page,
      region,
      endpoint: '/v1/tiktokshop/search',
      requestUrl: url.toString(),
      requestExecuted: false,
      skipReason: `FETCH_ERROR: ${fetchErr?.message || String(fetchErr)}`,
    });
    throw fetchErr;
  }

  const rawText = await response.text();
  let payload: SocialCrawlSearchResponse;
  try {
    payload = JSON.parse(rawText);
  } catch {
    logMinerAcquisition({
      query: providerQuery,
      page,
      region,
      endpoint: '/v1/tiktokshop/search',
      requestUrl: url.toString(),
      requestExecuted: true,
      httpStatus: response.status,
      skipReason: `SOCIALCRAWL_INVALID_RESPONSE_${response.status}`,
    });
    throw new Error(`SOCIALCRAWL_INVALID_RESPONSE_${response.status}`);
  }

  if (!response.ok || payload.success === false) {
    const detail = payload.message || payload.error || `HTTP_${response.status}`;
    logMinerAcquisition({
      query: providerQuery,
      page,
      region,
      endpoint: '/v1/tiktokshop/search',
      requestUrl: url.toString(),
      requestExecuted: true,
      httpStatus: response.status,
      skipReason: `SOCIALCRAWL_REQUEST_FAILED:${detail}`,
    });
    throw new Error(`SOCIALCRAWL_REQUEST_FAILED:${detail}`);
  }

  await saveCachedPayload(query, region, page, payload);
  const normalized = (payload.data?.items || [])
    .map((rawItem, idx) => {
      const p = normalizeProduct(rawItem, 'SocialCrawl Search API');
      p.collectionPosition = (page - 1) * 30 + (idx + 1);
      return p;
    })
    .filter((item) => item.productId);
  await persistProducts(normalized, query);
  const productsWithTrends = await attachTrendMetrics(normalized);
  const products = await attachAssociatedVideos(productsWithTrends);

  logMinerAcquisition({
    query: providerQuery,
    page,
    region,
    endpoint: '/v1/tiktokshop/search',
    requestUrl: url.toString(),
    requestExecuted: true,
    httpStatus: response.status,
    itemsReceived: (payload.data?.items || []).length,
    creditsUsed: payload.credits_used ?? 0,
  });

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

  const INFANTIL_EXPANSION_TERMS = [
    'moda infantil',
    'brinquedo infantil',
    'bebê',
    'maternidade',
    'calçado infantil',
    'roupa infantil',
    'acessórios infantis',
    'cuidados para bebê',
  ];

  for (let p = startPage; p <= maxPages; p++) {
    try {
      const isInfantil = query.toLowerCase() === 'infantil';
      const actualQuery = isInfantil
        ? INFANTIL_EXPANSION_TERMS[(p - 1) % INFANTIL_EXPANSION_TERMS.length]
        : query;
      const actualPage = isInfantil
        ? Math.floor((p - 1) / INFANTIL_EXPANSION_TERMS.length) + 1
        : p;

      const res = await searchTikTokShopProducts({
        query: actualQuery,
        page: actualPage,
        region,
        forceRefresh: true,
      });

      if (isInfantil && res.products.length > 0) {
        await persistProducts(res.products, 'Infantil').catch(() => {});
      }

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
        if (!isInfantil) break;
      }
    } catch (err: any) {
      console.warn(`[MultiPage Collection Partial Failure on page ${p} for query "${query}"]:`, err?.message || err);
      partialError = err?.message || `Falha na página ${p}`;
      break;
    }
  }

  const finalProducts = await attachAssociatedVideos(allUniqueProducts);

  return {
    products: finalProducts,
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
    productUrl: row.product_url ? String(row.product_url).trim() : null,
    category: row.category_path,
    lastSeenAt: row.last_seen_at,
    estimatedCommissionCents: row.estimated_commission_cents === null || row.estimated_commission_cents === undefined ? null : Number(row.estimated_commission_cents),
    commissionRatePercent: row.commission_rate_percent === null || row.commission_rate_percent === undefined ? null : Number(row.commission_rate_percent),
    video: row.video_id || row.video_url ? {
      id: row.video_id,
      url: row.video_url,
      description: row.video_description || row.video_desc || row.description || null,
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
  const safeLimit = Math.max(1, Math.min(Number(limit || 50), 200));
  const [rows]: any = await db.query(
    `SELECT p.*
     FROM tiktok_shop_products p
     ORDER BY p.last_seen_at DESC, p.sold_count DESC
     LIMIT 500`
  );

  const baseProducts = (Array.isArray(rows) ? rows : []).map(rowToProduct);
  const enrichedWithTrends = await attachTrendMetrics(baseProducts);
  const enriched = await attachAssociatedVideos(enrichedWithTrends);

  const sorted = [...enriched].sort((a, b) => {
    if (sort === 'opportunities') {
      const av = (a.sales24h ?? 0) * 10 + (a.growth24hPercent ?? 0) + (a.trendScore ?? 0) + (a.rating ? a.rating * 10 : 0);
      const bv = (b.sales24h ?? 0) * 10 + (b.growth24hPercent ?? 0) + (b.trendScore ?? 0) + (b.rating ? b.rating * 10 : 0);
      return bv - av || b.soldCount - a.soldCount;
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
    visible = sorted.slice(0, safeLimit);
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

export type CollectorSubcategoryStat = {
  subcategory: string;
  productCount: number;
  isLowBase: boolean;
};

export type CollectorCategoryStat = {
  category: string;
  productCount: number;
  lastCollectedAt: string | null;
  status: 'Ativa' | 'Pendente';
  subcategories?: CollectorSubcategoryStat[];
  coverageCount?: number;
  totalSubcategories?: number;
};

export const OFFICIAL_TIKTOK_TAXONOMY: Record<string, string[]> = {
  'Acessórios de moda': ['Geral'],
  'Alimentos e bebidas': ['Geral'],
  'Automotivo e moto': ['Geral'],
  'Bebê e maternidade': ['Geral'],
  'Beleza e cuidados pessoais': ['Geral'],
  'Brinquedos e passatempos': ['Geral'],
  'Computadores e equipamentos de escritório': ['Geral'],
  'Eletrodomésticos': ['Geral'],
  'Esportes e atividades ao ar livre': ['Geral'],
  'Ferramentas e hardware': ['Geral'],
  'Joias, acessórios e derivados': ['Geral'],
  'Livros, revistas e áudios': ['Geral'],
  'Malas e bolsas': ['Geral'],
  'Moda muçulmana': ['Geral'],
  'Moda para crianças': ['Geral'],
  'Móveis': ['Geral'],
  'Reformas residenciais': ['Geral'],
  'Roupas femininas e roupas íntimas femininas': ['Geral'],
  'Roupas masculinas e roupas íntimas masculinas': ['Geral'],
  'Sapatos': ['Geral'],
  'Saúde': ['Geral'],
  'Suprimentos domésticos': ['Geral'],
  'Suprimentos para animais de estimação': ['Geral'],
  'Telefones e eletrônicos': ['Geral'],
  'Têxteis e móveis': ['Geral'],
  'Utensílios de cozinha': ['Geral'],
};

export const COLLECTOR_CATEGORIES = Object.keys(OFFICIAL_TIKTOK_TAXONOMY);

function matchSubcategory(p: { title?: string; category_path?: string; query_source?: string }, subName: string): boolean {
  if (!subName || subName === 'Todas') return false;
  const path = removeAccents(p.category_path || '');
  const title = removeAccents(p.title || '');
  const query = removeAccents(p.query_source || '');
  const text = `${path} ${title} ${query}`;
  const subNorm = removeAccents(subName);

  // Direct structured check first
  if (path.includes(`> ${subNorm}`) || path.includes(`>${subNorm}`) || path.endsWith(subNorm)) {
    return true;
  }

  switch (subName) {
    // Moda
    case 'Acessórios':
      return text.includes('acessorio') || text.includes('brinco') || text.includes('colar') || text.includes('anel') || text.includes('pulseira') || text.includes('oculos') || text.includes('relogio') || text.includes('cinto') || text.includes('joia');
    case 'Malas e Mochilas':
      return text.includes('mala') || text.includes('mochila') || text.includes('bolsa') || text.includes('carteira') || text.includes('pochete') || text.includes('necessaire');
    case 'Moda Feminina':
      return text.includes('feminin') || text.includes('vestido') || text.includes('saia') || text.includes('lingerie') || text.includes('sutia') || text.includes('top') || text.includes('blusa');
    case 'Moda Masculina':
      return text.includes('masculin') || text.includes('camisa') || text.includes('bermuda') || text.includes('cueca') || text.includes('homem');
    case 'Calçados':
      return text.includes('calcado') || text.includes('tenis') || text.includes('sapato') || text.includes('sandalia') || text.includes('bota') || text.includes('chinelo') || text.includes('salto');

    // Itens para Casa
    case 'Utensílios de Cozinha':
      return text.includes('cozinha') || text.includes('panela') || text.includes('copo') || text.includes('xicara') || text.includes('faca') || text.includes('prato') || text.includes('talher') || text.includes('frigideira') || text.includes('pote') || text.includes('garrafa') || text.includes('abridor');
    case 'Móveis':
      return text.includes('movel') || text.includes('moveis') || text.includes('cadeira') || text.includes('mesa') || text.includes('sofa') || text.includes('estante') || text.includes('armario') || text.includes('prateleira');
    case 'Ferramentas':
      return text.includes('ferramenta') || text.includes('furadeira') || text.includes('chave') || text.includes('alicate') || text.includes('martelo') || text.includes('trena');
    case 'Artigos para Festas':
      return text.includes('festa') || text.includes('balao') || text.includes('vela') || text.includes('aniversario') || text.includes('fantasia');
    case 'Reforma e Construção':
      return text.includes('reforma') || text.includes('construcao') || text.includes('tinta') || text.includes('iluminacao') || text.includes('lampada') || text.includes('fio') || text.includes('tomada') || text.includes('led');
    case 'Itens para Banheiro':
      return text.includes('banheiro') || text.includes('toalha') || text.includes('saboneteira') || text.includes('chuveiro') || text.includes('espelho') || text.includes('porta-escova');
    case 'Produtos de Limpeza':
      return text.includes('limpeza') || text.includes('detergente') || text.includes('sabao') || text.includes('mop') || text.includes('vassoura') || text.includes('pano') || text.includes('esponja') || text.includes('aspirador');
    case 'Decoração de Casa':
      return text.includes('decoracao') || text.includes('decorat') || text.includes('quadro') || text.includes('almofada') || text.includes('tapete') || text.includes('vaso') || text.includes('planta');
    case 'Cama, Mesa e Banho':
      return text.includes('cama') || text.includes('lencol') || text.includes('edredom') || text.includes('travesseiro') || text.includes('coberta') || text.includes('fronha');

    // Eletrônicos
    case 'Celulares e Eletrônicos':
      return text.includes('celular') || text.includes('smartphone') || text.includes('iphone') || text.includes('samsung') || text.includes('fone') || text.includes('carregador') || text.includes('cabo') || text.includes('gadget') || text.includes('eletron') || text.includes('bluetooth');
    case 'Livros e Revistas':
    case 'Livros e Áudio':
      return text.includes('livro') || text.includes('revista') || text.includes('kindle') || text.includes('e-book') || text.includes('leitura') || text.includes('audio');
    case 'Automotivo':
      return text.includes('automotiv') || text.includes('carro') || text.includes('veiculo') || text.includes('moto') || text.includes('pneu') || text.includes('volante');
    case 'Computadores e Equipamentos':
      return text.includes('computador') || text.includes('notebook') || text.includes('pc') || text.includes('teclado') || text.includes('mouse') || text.includes('monitor') || text.includes('usb');
    case 'Dispositivos de Higiene':
      return text.includes('higiene') || text.includes('escova') || text.includes('barbeador') || text.includes('secador') || text.includes('prancha') || text.includes('depilador') || text.includes('aparador');
    case 'Eletrodomésticos':
      return text.includes('eletrodomestico') || text.includes('air fryer') || text.includes('liquidificador') || text.includes('batedeira') || text.includes('aspirador') || text.includes('ventilador') || text.includes('cafeteira');

    // Beleza e Cuidados Pessoais
    case 'Maquiagem':
      return text.includes('maquiagem') || text.includes('batom') || text.includes('rimel') || text.includes('base') || text.includes('corretivo') || text.includes('po') || text.includes('sombra') || text.includes('pincel') || text.includes('gloss');
    case 'Cuidados Capilares':
      return text.includes('capilar') || text.includes('cabelo') || text.includes('shampoo') || text.includes('condicionador') || text.includes('mascara') || text.includes('oleo capilar') || text.includes('ampola');
    case 'Perfumes':
      return text.includes('perfume') || text.includes('colonia') || text.includes('fragrancia') || text.includes('body splash');
    case 'Cuidados com o Corpo':
      return text.includes('corpo') || text.includes('corporal') || text.includes('hidratante') || text.includes('desodorante') || text.includes('sabonete') || text.includes('esfoliante');
    case 'Cuidados Masculinos':
      return text.includes('masculino') || text.includes('barba') || text.includes('pos-barba');
    case 'Cuidados com a Pele':
      return text.includes('pele') || text.includes('skincare') || text.includes('serum') || text.includes('protetor') || text.includes('facial') || text.includes('creme') || text.includes('tonico');

    // Esportes e Lazer
    case 'Fitness':
      return text.includes('fitness') || text.includes('academia') || text.includes('treino') || text.includes('suplemento') || text.includes('elastico') || text.includes('peso') || text.includes('halter');
    case 'Equipamentos para Lazer':
      return text.includes('lazer') || text.includes('camping') || text.includes('barraca') || text.includes('pesca') || text.includes('jogo');
    case 'Roupas Esportivas':
      return text.includes('esportiv') || text.includes('legging') || text.includes('short esportivo') || text.includes('regata');
    case 'Acessórios para Esportes':
      return text.includes('esporte') || text.includes('garrafa') || text.includes('luva') || text.includes('faixa') || text.includes('joelheira');
    case 'Calçados Esportivos':
      return text.includes('tenis esportivo') || text.includes('chuteira') || text.includes('sapatilha');

    // Brinquedos e Pets
    case 'Produtos para Pets':
    case 'Suprimentos para Pets':
      return text.includes('pet') || text.includes('cachorro') || text.includes('gato') || text.includes('racao') || text.includes('coleira') || text.includes('brinquedo pet') || text.includes('peitoral');

    // Health
    case 'Health Nutrition':
      return text.includes('health') || text.includes('nutrition') || text.includes('suplemento') || text.includes('whey') || text.includes('creatina') || text.includes('vitamina') || text.includes('saude');

    // Infantil
    case 'Bebês':
      return text.includes('bebe') || text.includes('baby') || text.includes('maternidade') || text.includes('recem nascido') || text.includes('fralda') || text.includes('mamadeira') || text.includes('chupeta') || text.includes('berco') || text.includes('carrinho de bebe') || text.includes('ninho');
    case 'Moda Infantil':
      return text.includes('moda infantil') || text.includes('roupa infantil') || text.includes('vestido infantil') || text.includes('conjunto infantil') || text.includes('pijama infantil') || text.includes('camisa infantil') || text.includes('macacao') || text.includes('body') || text.includes('pijama bebe') || text.includes('romper');
    case 'Brinquedos':
      return text.includes('brinquedo') || text.includes('jogos') || text.includes('boneca') || text.includes('carrinho') || text.includes('pelucia') || text.includes('lego') || text.includes('mordedor') || text.includes('chocalho');
    case 'Cuidados':
      return text.includes('cuidado') || text.includes('higiene') || text.includes('banho') || text.includes('sabonete') || text.includes('shampoo bebe') || text.includes('pomada') || text.includes('lenco umedecido') || text.includes('termometro');

    default: {
      const norm = subNorm.replace(/^(cuidados|produtos|artigos|itens|suprimentos)\s*(com\s*o?|para)?\s*/i, '');
      return path.includes(norm) || title.includes(norm) || query.includes(norm);
    }
  }
}

function removeAccents(str: string): string {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function classifyProductToCategoryAndSubcategory(product: {
  title?: string;
  category_path?: string;
  query_source?: string;
  seller_name?: string;
}): { category: string; subcategory: string } {
  const rawText = `${product.title || ''} ${product.seller_name || ''} ${product.category_path || ''}`;
  const text = removeAccents(rawText);

  const has = (...terms: string[]) => terms.some((t) => text.includes(removeAccents(t)));

  // 1. SAÚDE
  if (
    has(
      'creatina', 'suplemento', 'suplementos', 'vitamina', 'vitaminas', 'capsula', 'capsulas',
      'proteina', 'proteinas', 'whey', 'magnesio', 'colageno', 'omega', 'saude', 'multivitaminico',
      'termogenico', 'melatonina', 'glutamina', 'bcaa', 'pre treino', 'termometro', 'medidor de pressao',
      'inalador', 'ortopedico', 'mascara cirurgica'
    )
  ) {
    return { category: 'Saúde', subcategory: 'Geral' };
  }

  // 2. SUPRIMENTOS PARA ANIMAIS DE ESTIMAÇÃO
  if (
    has(
      'pet', 'pets', 'cachorro', 'cachorros', 'gato', 'gatos', 'cao', 'caes', 'racao', 'coleira',
      'peitoral', 'caminha pet', 'comedouro', 'areia sanitaria', 'arranhador', 'tapete higienico',
      'aquario', 'petisco', 'brinquedo pet', 'guia pet'
    )
  ) {
    return { category: 'Suprimentos para animais de estimação', subcategory: 'Geral' };
  }

  // 3. BEBÊ E MATERNIDADE
  if (
    has(
      'bebe', 'bebes', 'baby', 'maternidade', 'recem nascido', 'recem-nascido', 'fralda', 'fraldas',
      'mamadeira', 'mamadeiras', 'chupeta', 'chupetas', 'berco', 'ninho bebe', 'carrinho de bebe',
      'chocalho', 'mordedor', 'banheira bebe'
    )
  ) {
    return { category: 'Bebê e maternidade', subcategory: 'Geral' };
  }

  // 4. MODA PARA CRIANÇAS
  if (
    has(
      'infantil', 'crianca', 'criancas', 'kids', 'kid', 'menino', 'meninos', 'menina', 'meninas',
      'juvenil', 'roupa infantil', 'vestido infantil', 'conjunto infantil', 'pijama infantil', 'moda infantil'
    )
  ) {
    return { category: 'Moda para crianças', subcategory: 'Geral' };
  }

  // 5. ALIMENTOS E BEBIDAS
  if (
    has(
      'alimento', 'alimentos', 'comida', 'bebida', 'bebidas', 'cafe', 'cha', 'doce', 'doces',
      'chocolate', 'chocolates', 'snack', 'molho', 'azeite', 'macarrao', 'tempero', 'cereal',
      'refrigerante', 'suco', 'biscoito', 'bolacha'
    )
  ) {
    return { category: 'Alimentos e bebidas', subcategory: 'Geral' };
  }

  // 6. BELEZA E CUIDADOS PESSOAIS
  if (
    has(
      'maquiagem', 'batom', 'rimel', 'base facial', 'corretivo', 'po compacto', 'sombra', 'pincel',
      'gloss', 'perfume', 'perfumes', 'colonia', 'fragrancia', 'body splash', 'skincare', 'serum',
      'protetor solar', 'creme facial', 'tonico', 'esmalte', 'unhas', 'shampoo', 'condicionador',
      'mascara capilar', 'oleo capilar', 'depilador', 'barbeador', 'secador', 'prancha', 'escova rotativa',
      'sabonete', 'esfoliante', 'hidratante', 'desodorante', 'barba'
    )
  ) {
    return { category: 'Beleza e cuidados pessoais', subcategory: 'Geral' };
  }

  // 7. TELEFONES E ELETRÔNICOS
  if (
    has(
      'celular', 'celulares', 'smartphone', 'iphone', 'samsung', 'xiaomi', 'fone', 'fones',
      'headphone', 'headset', 'caixa de som', 'smartwatch', 'relogio inteligente', 'carregador',
      'cabo usb', 'power bank', 'ring light', 'tripe', 'microfone', 'camera', 'bluetooth'
    )
  ) {
    return { category: 'Telefones e eletrônicos', subcategory: 'Geral' };
  }

  // 8. COMPUTADORES E EQUIPAMENTOS DE ESCRITÓRIO
  if (
    has(
      'computador', 'notebook', 'pc', 'teclado', 'mouse', 'monitor', 'webcam', 'impressora',
      'cartucho', 'cadeira de escritorio', 'suporte notebook', 'hub usb', 'papelaria', 'caneta',
      'caderno', 'organizador mesa'
    )
  ) {
    return { category: 'Computadores e equipamentos de escritório', subcategory: 'Geral' };
  }

  // 9. ELETRODOMÉSTICOS
  if (
    has(
      'eletrodomestico', 'eletrodomesticos', 'air fryer', 'airfryer', 'liquidificador', 'batedeira',
      'aspirador', 'ventilador', 'umidificador', 'purificador', 'cafeteira', 'ferro de passar',
      'microondas', 'robo aspirador'
    )
  ) {
    return { category: 'Eletrodomésticos', subcategory: 'Geral' };
  }

  // 10. AUTOMOTIVO E MOTO
  if (
    has(
      'automotivo', 'carro', 'veiculo', 'moto', 'motocicleta', 'pneu', 'capacete', 'volante',
      'oleo motor', 'farol', 'capa carro'
    )
  ) {
    return { category: 'Automotivo e moto', subcategory: 'Geral' };
  }

  // 11. ESPORTES E ATIVIDADES AO AR LIVRE
  if (
    has(
      'academia', 'fitness', 'treino', 'exercicio', 'elastico', 'peso', 'halter', 'kettlebell',
      'yoga', 'camping', 'barraca', 'pesca', 'chuteira', 'bicicleta', 'ciclismo', 'regata treino',
      'garrafa academia'
    )
  ) {
    return { category: 'Esportes e atividades ao ar livre', subcategory: 'Geral' };
  }

  // 12. FERRAMENTAS E HARDWARE
  if (
    has(
      'ferramenta', 'ferramentas', 'furadeira', 'parafusadeira', 'chave de fenda', 'alicate',
      'martelo', 'trena', 'serra', 'caixa de ferramentas', 'broca', 'multimetro'
    )
  ) {
    return { category: 'Ferramentas e hardware', subcategory: 'Geral' };
  }

  // 13. JOIAS, ACESSÓRIOS E DERIVADOS
  if (
    has(
      'joia', 'joias', 'brinco', 'brincos', 'colar', 'colares', 'anel', 'aneis', 'pulseira',
      'pulseiras', 'corrente', 'pingente', 'bijuteria', 'folheado', 'prata', 'ouro'
    )
  ) {
    return { category: 'Joias, acessórios e derivados', subcategory: 'Geral' };
  }

  // 14. LIVROS, REVISTAS E ÁUDIOS
  if (
    has(
      'livro', 'livros', 'revista', 'revistas', 'kindle', 'ebook', 'e-book', 'leitura', 'audiobook',
      'caderno de oracao', 'biblia'
    )
  ) {
    return { category: 'Livros, revistas e áudios', subcategory: 'Geral' };
  }

  // 15. MALAS E BOLSAS
  if (
    has(
      'mala', 'malas', 'mochila', 'mochilas', 'bolsa', 'bolsas', 'carteira', 'carteiras',
      'pochete', 'necessaire', 'pasta notebook'
    )
  ) {
    return { category: 'Malas e bolsas', subcategory: 'Geral' };
  }

  // 16. MODA MUÇULMANA
  if (has('moda musulmana', 'hijab', 'abaya', 'burca', 'turbante')) {
    return { category: 'Moda muçulmana', subcategory: 'Geral' };
  }

  // 17. MÓVEIS
  if (
    has(
      'movel', 'moveis', 'cadeira', 'mesa', 'sofa', 'estante', 'armario', 'prateleira', 'rack',
      'comoda', 'poltrona', 'escrivaninha'
    )
  ) {
    return { category: 'Móveis', subcategory: 'Geral' };
  }

  // 18. REFORMAS RESIDENCIAIS
  if (
    has(
      'reforma', 'construcao', 'tinta', 'iluminacao', 'lampada', 'fita led', 'interruptor',
      'tomada', 'chuveiro', 'torneira', 'piso', 'papel de parede', 'fechadura'
    )
  ) {
    return { category: 'Reformas residenciais', subcategory: 'Geral' };
  }

  // 19. ROUPAS FEMININAS E ROUPAS ÍNTIMAS FEMININAS
  if (
    has(
      'vestido', 'saia', 'blusa', 'cropped', 'top', 'blazer', 'cardigan', 'lingerie', 'sutia',
      'calcinha', 'body', 'babydoll', 'baby doll', 'maio', 'biquini', 'feminina', 'femininas'
    )
  ) {
    return { category: 'Roupas femininas e roupas íntimas femininas', subcategory: 'Geral' };
  }

  // 20. ROUPAS MASCULINAS E ROUPAS ÍNTIMAS MASCULINAS
  if (
    has(
      'camisa masculina', 'camiseta masculina', 'bermuda masculina', 'calca masculina', 'cueca',
      'cuecas', 'masculina', 'masculinas', 'masculino', 'masculinos', 'terno'
    )
  ) {
    return { category: 'Roupas masculinas e roupas íntimas masculinas', subcategory: 'Geral' };
  }

  // 21. SAPATOS
  if (
    has(
      'calcado', 'calcados', 'tenis', 'sapato', 'sapatos', 'sandalia', 'sandalias', 'bota',
      'botas', 'chinelo', 'chinelos', 'salto', 'rasteirinha', 'mocassim', 'pantufa', 'sapatilha'
    )
  ) {
    return { category: 'Sapatos', subcategory: 'Geral' };
  }

  // 22. SUPRIMENTOS DOMÉSTICOS
  if (
    has(
      'limpeza', 'detergente', 'sabao', 'mop', 'vassoura', 'esfregao', 'pano', 'saco de lixo',
      'aromatizador', 'desinfetante', 'organizador', 'cabide', 'lixeira', 'papel toalha', 'amaciante'
    )
  ) {
    return { category: 'Suprimentos domésticos', subcategory: 'Geral' };
  }

  // 23. BRINQUEDOS E PASSATEMPOS
  if (
    has(
      'brinquedo', 'brinquedos', 'jogo', 'jogos', 'boneca', 'bonecas', 'pelucia', 'lego',
      'quebra cabeca', 'piao', 'slime', 'controle remoto'
    )
  ) {
    return { category: 'Brinquedos e passatempos', subcategory: 'Geral' };
  }

  // 24. ACESSÓRIOS DE MODA
  if (
    has(
      'cinto', 'oculos', 'relogio', 'bone', 'touca', 'chapeu', 'cachecol', 'luva', 'tiara',
      'laco', 'lenco', 'suspensorio', 'acessorio', 'acessorios'
    )
  ) {
    return { category: 'Acessórios de moda', subcategory: 'Geral' };
  }

  // 25. TÊXTEIS E MÓVEIS
  if (
    has(
      'cama', 'lencol', 'edredom', 'travesseiro', 'coberta', 'fronha', 'toalha', 'cortina',
      'tapete', 'almofada', 'manta', 'capa de sofa', 'enxoval'
    )
  ) {
    return { category: 'Têxteis e móveis', subcategory: 'Geral' };
  }

  // 26. UTENSÍLIOS DE COZINHA
  if (
    has(
      'panela', 'frigideira', 'copo', 'xicara', 'faca', 'prato', 'talher', 'pote', 'garrafa',
      'tabua', 'cortador', 'abridor', 'cozinha', 'utensilio', 'utensilios'
    )
  ) {
    return { category: 'Utensílios de cozinha', subcategory: 'Geral' };
  }

  // FALLBACK
  return { category: 'Utensílios de cozinha', subcategory: 'Geral' };
}

export type ReclassificationReport = {
  totalAnalyzed: number;
  totalChanged: number;
  totalMaintained: number;
  totalClassified: number;
  totalUnclassified: number;
  categoryCounts: Record<string, number>;
  subcategoryCounts: Record<string, number>;
  leftInfantil: number;
  enteredInfantil: number;
  remainedInInfantil: number;
  movedFromInfantilTo: Record<string, number>;
  socialCrawlCalled: false;
  creditsConsumed: 0;
};

export async function reclassifyExistingDatabaseProducts(): Promise<ReclassificationReport> {
  if (!isDatabaseConfigured()) {
    return {
      totalAnalyzed: 0,
      totalChanged: 0,
      totalMaintained: 0,
      totalClassified: 0,
      totalUnclassified: 0,
      categoryCounts: {
        'Moda': 0,
        'Itens para Casa': 0,
        'Eletrônicos': 0,
        'Beleza e Cuidados Pessoais': 0,
        'Esportes e Lazer': 0,
        'Brinquedos e Pets': 0,
        'Health': 0,
        'Infantil': 0,
      },
      subcategoryCounts: {},
      leftInfantil: 0,
      enteredInfantil: 0,
      remainedInInfantil: 0,
      movedFromInfantilTo: {},
      socialCrawlCalled: false,
      creditsConsumed: 0,
    };
  }
  await ensureProductMinerTables();

  const [rows]: any = await db.query(
    `SELECT product_id, title, category_path, query_source, seller_name FROM tiktok_shop_products`
  );

  const products = Array.isArray(rows) ? rows : [];
  const categoryCounts: Record<string, number> = {
    'Moda': 0,
    'Itens para Casa': 0,
    'Eletrônicos': 0,
    'Beleza e Cuidados Pessoais': 0,
    'Esportes e Lazer': 0,
    'Brinquedos e Pets': 0,
    'Health': 0,
    'Infantil': 0,
  };

  const subcategoryCounts: Record<string, number> = {};
  const movedFromInfantilTo: Record<string, number> = {};

  let classifiedCount = 0;
  let totalChanged = 0;
  let totalMaintained = 0;
  let leftInfantil = 0;
  let enteredInfantil = 0;
  let remainedInInfantil = 0;

  // Group products by (category, subcategory) to batch update SQL queries ONLY for products that changed
  const groupMap = new Map<string, { category: string; subcategory: string; ids: string[] }>();

  for (const p of products) {
    const oldPath = String(p.category_path || '');
    const oldQuerySource = String(p.query_source || '');
    const isOldInfantil = oldQuerySource === 'Infantil' || oldPath.startsWith('Infantil') || oldPath.includes('Infantil');

    const { category, subcategory } = classifyProductToCategoryAndSubcategory(p);
    const newPath = `${category} > ${subcategory}`;
    const newQuerySource = category;
    const isNewInfantil = category === 'Infantil';

    classifiedCount++;
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    subcategoryCounts[subcategory] = (subcategoryCounts[subcategory] || 0) + 1;

    // Track movement in/out/staying in Infantil
    if (isOldInfantil && !isNewInfantil) {
      leftInfantil++;
      movedFromInfantilTo[category] = (movedFromInfantilTo[category] || 0) + 1;
    } else if (isOldInfantil && isNewInfantil) {
      remainedInInfantil++;
    } else if (!isOldInfantil && isNewInfantil) {
      enteredInfantil++;
    }

    const hasChanged = oldPath !== newPath || oldQuerySource !== newQuerySource;

    if (hasChanged) {
      totalChanged++;
      const key = `${category}|||${subcategory}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, { category, subcategory, ids: [] });
      }
      groupMap.get(key)!.ids.push(String(p.product_id));
    } else {
      totalMaintained++;
    }
  }

  // Execute bulk updates in chunks of 200 IDs for maximum speed & safety
  for (const group of groupMap.values()) {
    const newPath = `${group.category} > ${group.subcategory}`;
    const newQuerySource = group.category;
    const ids = group.ids;

    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const placeholders = chunk.map(() => '?').join(',');
      await db.query(
        `UPDATE tiktok_shop_products
         SET category_path = ?, query_source = ?
         WHERE product_id IN (${placeholders})`,
        [newPath, newQuerySource, ...chunk]
      );
    }
  }

  return {
    totalAnalyzed: products.length,
    totalChanged,
    totalMaintained,
    totalClassified: classifiedCount,
    totalUnclassified: products.length - classifiedCount,
    categoryCounts,
    subcategoryCounts,
    leftInfantil,
    enteredInfantil,
    remainedInInfantil,
    movedFromInfantilTo,
    socialCrawlCalled: false,
    creditsConsumed: 0,
  };
}

export async function getCollectorCategoriesStats(): Promise<CollectorCategoryStat[]> {
  if (!isDatabaseConfigured()) {
    return COLLECTOR_CATEGORIES.map((cat) => {
      const subs = OFFICIAL_TIKTOK_TAXONOMY[cat] || [];
      return {
        category: cat,
        productCount: 0,
        lastCollectedAt: null,
        status: 'Pendente',
        subcategories: subs.map((sub) => ({ subcategory: sub, productCount: 0, isLowBase: true })),
        coverageCount: 0,
        totalSubcategories: subs.length,
      };
    });
  }

  await ensureProductMinerTables();

  // 1. Direct READ-ONLY SQL query for main category product counts via query_source
  const categoryCountsMap: Record<string, number> = {};
  const lastSeenMap: Record<string, string | null> = {};

  try {
    const [qRows]: any = await db.query(
      `SELECT TRIM(query_source) AS query_source,
              COUNT(*) AS productCount,
              MAX(last_seen_at) AS max_seen,
              MAX(updated_at) AS max_updated
       FROM tiktok_shop_products
       WHERE query_source IS NOT NULL AND query_source != ''
       GROUP BY TRIM(query_source)`
    );

    if (Array.isArray(qRows)) {
      for (const row of qRows) {
        const q = String(row.query_source || '').trim();
        const cnt = Number(row.productCount || 0);
        if (q) {
          categoryCountsMap[q] = (categoryCountsMap[q] || 0) + cnt;

          const maxDate = row.max_seen || row.max_updated;
          if (maxDate) {
            const iso = new Date(maxDate).toISOString();
            if (!lastSeenMap[q] || iso > lastSeenMap[q]!) {
              lastSeenMap[q] = iso;
            }
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('[getCollectorCategoriesStats SQL Query Error]:', err?.message || err);
  }

  // 2. Direct READ-ONLY SQL query for subcategory breakdown via category_path
  const pathCountsMap: Record<string, number> = {};
  try {
    const [pRows]: any = await db.query(
      `SELECT TRIM(category_path) AS category_path, COUNT(*) AS subCount
       FROM tiktok_shop_products
       WHERE category_path IS NOT NULL AND category_path != ''
       GROUP BY TRIM(category_path)`
    );

    if (Array.isArray(pRows)) {
      for (const row of pRows) {
        const cp = String(row.category_path || '').trim();
        const cnt = Number(row.subCount || 0);
        if (cp) {
          pathCountsMap[cp] = (pathCountsMap[cp] || 0) + cnt;
        }
      }
    }
  } catch (err: any) {
    console.warn('[getCollectorCategoriesStats Subcategory SQL Query Error]:', err?.message || err);
  }

  // 3. Assemble stats for each of the 8 OFFICIAL COLLECTOR CATEGORIES
  const statsList: CollectorCategoryStat[] = [];

  for (const cat of COLLECTOR_CATEGORIES) {
    const subNames = OFFICIAL_TIKTOK_TAXONOMY[cat] || [];

    // Exact count from query_source directly in MySQL
    let productCount = categoryCountsMap[cat] || 0;
    // Case-insensitive / normalized fallback if exact key case/accents vary
    if (productCount === 0) {
      const lowerCat = cat.toLowerCase();
      for (const [k, v] of Object.entries(categoryCountsMap)) {
        if (k.toLowerCase() === lowerCat) {
          productCount += v;
        }
      }
    }

    // Subcategories breakdown strictly from category_path
    let coveredCount = 0;
    let pathTotalForCat = 0;

    const subStats: CollectorSubcategoryStat[] = subNames.map((subName) => {
      let subCount = 0;
      const expectedExact = `${cat} > ${subName}`;
      const expectedEnd = `> ${subName}`;

      for (const [cp, count] of Object.entries(pathCountsMap)) {
        if (cp === expectedExact || cp.endsWith(expectedEnd) || cp.includes(`> ${subName} >`) || cp === subName) {
          subCount += count;
        }
      }

      if (subCount > 0) {
        coveredCount++;
      }

      return {
        subcategory: subName,
        productCount: subCount,
        isLowBase: subCount < 15,
      };
    });

    for (const [cp, count] of Object.entries(pathCountsMap)) {
      if (cp === cat || cp.startsWith(`${cat} >`) || cp.startsWith(`${cat}>`)) {
        pathTotalForCat += count;
      }
    }

    const subProductsSum = subStats.reduce((sum, s) => sum + s.productCount, 0);
    const finalProductCount = Math.max(productCount, pathTotalForCat, subProductsSum);
    const lastCollectedAt = lastSeenMap[cat] || null;

    statsList.push({
      category: cat,
      productCount: finalProductCount,
      lastCollectedAt,
      status: finalProductCount > 0 ? 'Ativa' : 'Pendente',
      subcategories: subStats,
      coverageCount: coveredCount,
      totalSubcategories: subNames.length,
    });
  }

  return statsList;
}

export type DailyRefreshStatusResult = {
  id: number;
  startedAt: string;
  completedAt: string | null;
  categoriesProcessed: number;
  totalCategories: number;
  uniqueProductsCount: number;
  creditsUsed: number;
  status: 'RUNNING' | 'COMPLETED' | 'PARTIAL_FAILED' | 'FAILED' | 'cooldown';
  currentCategory: string | null;
  failedCategories: string[];
  isCooldownActive: boolean;
  cooldownRemainingSeconds: number;
  nextRecommendedAt: string | null;
  isCurrentlyRunning: boolean;
};

export async function getDailyRefreshStatus(): Promise<DailyRefreshStatusResult | null> {
  if (!isDatabaseConfigured()) return null;
  await ensureProductMinerTables();

  try {
    const [rows]: any = await db.query(
      `SELECT * FROM product_miner_daily_collections ORDER BY id DESC LIMIT 1`
    );

    const record = Array.isArray(rows) && rows[0];
    if (!record) return null;

    const startedAt = record.started_at ? new Date(record.started_at).toISOString() : new Date().toISOString();
    const completedAt = record.completed_at ? new Date(record.completed_at).toISOString() : null;
    const now = Date.now();
    const referenceTime = record.completed_at ? new Date(record.completed_at).getTime() : new Date(record.started_at).getTime();

    const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
    const elapsedMs = now - referenceTime;

    const isFinishedStatus = record.status === 'COMPLETED' || record.status === 'PARTIAL_FAILED';
    const isCooldownActive = isFinishedStatus && elapsedMs < COOLDOWN_MS;

    const cooldownRemainingSeconds = isCooldownActive ? Math.ceil((COOLDOWN_MS - elapsedMs) / 1000) : 0;
    const nextRecommendedAt = isFinishedStatus ? new Date(referenceTime + COOLDOWN_MS).toISOString() : null;

    const startedMs = new Date(record.started_at).getTime();
    const isCurrentlyRunning = record.status === 'RUNNING' && (now - startedMs < 15 * 60 * 1000);

    let failedCategories: string[] = [];
    if (record.failed_categories) {
      try {
        failedCategories = JSON.parse(record.failed_categories);
      } catch {
        failedCategories = [];
      }
    }

    return {
      id: Number(record.id),
      startedAt,
      completedAt,
      categoriesProcessed: Number(record.categories_processed || 0),
      totalCategories: COLLECTOR_CATEGORIES.length,
      uniqueProductsCount: Number(record.unique_products_count || 0),
      creditsUsed: Number(record.credits_used || 0),
      status: record.status,
      currentCategory: record.current_category || null,
      failedCategories,
      isCooldownActive,
      cooldownRemainingSeconds,
      nextRecommendedAt,
      isCurrentlyRunning,
    };
  } catch (err: any) {
    console.warn('[getDailyRefreshStatus Error]:', err?.message || err);
    return null;
  }
}

export async function executeDailyRefresh(options?: { force?: boolean }): Promise<DailyRefreshStatusResult> {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_NOT_CONFIGURED');
  }

  await ensureProductMinerTables();

  const currentStatus = await getDailyRefreshStatus();
  if (currentStatus?.isCurrentlyRunning) {
    for (const cat of COLLECTOR_CATEGORIES) {
      logMinerAcquisition({
        category: cat,
        query: cat,
        page: 1,
        region: 'BR',
        endpoint: '/v1/tiktokshop/search',
        requestExecuted: false,
        skipReason: 'Daily refresh execution already in progress',
      });
    }
    throw new Error('DAILY_REFRESH_IN_PROGRESS');
  }

  if (currentStatus?.isCooldownActive && !options?.force) {
    for (const cat of COLLECTOR_CATEGORIES) {
      logMinerAcquisition({
        category: cat,
        query: cat,
        page: 1,
        region: 'BR',
        endpoint: '/v1/tiktokshop/search',
        requestExecuted: false,
        skipReason: '24h protection cooldown active (force=false)',
      });
    }
    return {
      id: currentStatus.id,
      startedAt: currentStatus.startedAt,
      completedAt: currentStatus.completedAt,
      categoriesProcessed: 0,
      totalCategories: COLLECTOR_CATEGORIES.length,
      uniqueProductsCount: 0,
      creditsUsed: 0,
      status: 'cooldown',
      currentCategory: null,
      failedCategories: [],
      isCooldownActive: true,
      cooldownRemainingSeconds: currentStatus.cooldownRemainingSeconds,
      nextRecommendedAt: currentStatus.nextRecommendedAt,
      isCurrentlyRunning: false,
    };
  }

  const [insertRes]: any = await db.query(
    `INSERT INTO product_miner_daily_collections
     (started_at, categories_processed, unique_products_count, credits_used, status, current_category)
     VALUES (NOW(), 0, 0, 0, 'RUNNING', ?)`,
    [COLLECTOR_CATEGORIES[0]]
  );

  const runId = insertRes.insertId;
  const seenProductIds = new Set<string>();
  let totalCreditsUsed = 0;
  let categoriesProcessed = 0;
  const failedCategories: string[] = [];

  for (const cat of COLLECTOR_CATEGORIES) {
    try {
      await db.query(
        `UPDATE product_miner_daily_collections
         SET current_category = ?
         WHERE id = ?`,
        [cat, runId]
      ).catch(() => {});

      const res = await refreshMultiPageTikTokShopProducts({
        query: cat,
        region: 'BR',
        maxProducts: 90,
      });

      totalCreditsUsed += Number(res.creditsUsed || 0);

      for (const p of res.products) {
        if (p.productId) seenProductIds.add(p.productId);
      }

      if (res.partialError || res.pagesConsulted === 0) {
        failedCategories.push(cat);
      } else {
        categoriesProcessed++;
      }
    } catch (catErr: any) {
      console.warn(`[Daily Refresh Failure for category ${cat}]:`, catErr?.message || catErr);
      failedCategories.push(cat);
    }

    await db.query(
      `UPDATE product_miner_daily_collections
       SET categories_processed = ?, unique_products_count = ?, credits_used = ?, failed_categories = ?
       WHERE id = ?`,
      [categoriesProcessed, seenProductIds.size, totalCreditsUsed, JSON.stringify(failedCategories), runId]
    ).catch(() => {});
  }

  let finalStatus: 'COMPLETED' | 'PARTIAL_FAILED' | 'FAILED' = 'COMPLETED';
  if (failedCategories.length > 0) {
    if (failedCategories.length === COLLECTOR_CATEGORIES.length) {
      finalStatus = 'FAILED';
    } else {
      finalStatus = 'PARTIAL_FAILED';
    }
  }

  await db.query(
    `UPDATE product_miner_daily_collections
     SET completed_at = NOW(), status = ?, categories_processed = ?, unique_products_count = ?, credits_used = ?, current_category = NULL, failed_categories = ?
     WHERE id = ?`,
    [finalStatus, categoriesProcessed, seenProductIds.size, totalCreditsUsed, JSON.stringify(failedCategories), runId]
  );

  const updatedStatus = await getDailyRefreshStatus();
  if (updatedStatus) return updatedStatus;

  return {
    id: Number(runId),
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    categoriesProcessed,
    totalCategories: COLLECTOR_CATEGORIES.length,
    uniqueProductsCount: seenProductIds.size,
    creditsUsed: totalCreditsUsed,
    status: finalStatus,
    currentCategory: null,
    failedCategories,
    isCooldownActive: finalStatus !== 'FAILED',
    cooldownRemainingSeconds: 86400,
    nextRecommendedAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    isCurrentlyRunning: false,
  };
}
