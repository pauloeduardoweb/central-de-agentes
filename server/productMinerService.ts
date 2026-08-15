import { db, isDatabaseConfigured, ensureProductMinerTables } from './database.js';
import {
  COLLECTOR_CATEGORIES,
  OFFICIAL_TIKTOK_TAXONOMY,
  OFFICIAL_TIKTOK_CHILD_CATEGORIES,
  classifyProductFull,
  getCategoryAliases,
  getSubcategoryAliases,
  removeAccents,
} from './taxonomy.js';

export {
  COLLECTOR_CATEGORIES,
  OFFICIAL_TIKTOK_TAXONOMY,
  OFFICIAL_TIKTOK_CHILD_CATEGORIES,
  classifyProductFull,
  getCategoryAliases,
  getSubcategoryAliases,
  removeAccents,
};

const SOCIALCRAWL_BASE_URL = 'https://www.socialcrawl.dev/v1';
const DEFAULT_REGION = 'BR';
const DEFAULT_CACHE_MINUTES = 1440;

type SocialCrawlSearchResponse = {
  success?: boolean;
  platform?: string;
  endpoint?: string;
  data?: any;
  items?: any[];
  products?: any[];
  results?: any[];
  product_list?: any[];
  search_result?: any[];
  credits?: number;
  credits_used?: number;
  credits_remaining?: number;
  cost?: number;
  request_id?: string;
  cached?: boolean;
  pagination?: { next_cursor?: string | null; has_more?: boolean; page_size?: number; total?: number };
  has_more?: boolean;
  hasMore?: boolean;
  error?: string;
  message?: string;
};

export function extractRawItemsFromPayload(payload: any): any[] {
  if (!payload || typeof payload !== 'object') return [];

  // 1. Array direto na raiz ou em payload.data
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;

  // 2. Objetos aninhados sob payload.data
  if (payload.data && typeof payload.data === 'object') {
    if (Array.isArray(payload.data.items)) return payload.data.items;
    if (Array.isArray(payload.data.products)) return payload.data.products;
    if (Array.isArray(payload.data.results)) return payload.data.results;
    if (Array.isArray(payload.data.product_list)) return payload.data.product_list;
    if (Array.isArray(payload.data.search_result)) return payload.data.search_result;
    if (Array.isArray(payload.data.data)) return Array.isArray(payload.data.data) ? payload.data.data : (Array.isArray(payload.data.data.items) ? payload.data.data.items : []);
    if (Array.isArray(payload.data.list)) return payload.data.list;
  }

  // 3. Chaves na raiz do payload
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.products)) return payload.products;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.product_list)) return payload.product_list;
  if (Array.isArray(payload.search_result)) return payload.search_result;
  if (Array.isArray(payload.list)) return payload.list;

  return [];
}

export function extractHasMoreFromPayload(payload: any, itemsLength: number): boolean {
  if (typeof payload?.pagination?.has_more === 'boolean') return payload.pagination.has_more;
  if (typeof payload?.data?.pagination?.has_more === 'boolean') return payload.data.pagination.has_more;
  if (typeof payload?.has_more === 'boolean') return payload.has_more;
  if (typeof payload?.hasMore === 'boolean') return payload.hasMore;
  if (typeof payload?.data?.has_more === 'boolean') return payload.data.has_more;
  if (typeof payload?.data?.hasMore === 'boolean') return payload.data.hasMore;
  // Se retornou pelo menos 15 produtos, assumir que existem mais páginas disponíveis
  return itemsLength >= 15;
}

export const MAX_ASSOCIATED_VIDEOS = 9;

export type ProductRankingSort = 'opportunities' | 'total' | '24h' | '7d' | 'spiking';

export type ClassificationType =
  | 'best_sellers'
  | 'top_rated'
  | 'highest_commission'
  | 'viral_video'
  | 'sales_24h'
  | 'spiking'
  | 'trending'
  | 'editors_choice'
  | 'most_searched';

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
  collectionCategory?: string | null;
  collectionSubcategory?: string | null;
  querySource?: string | null;
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

function parsePriceToCents(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const raw = String(value).trim();
  if (!raw) return null;

  // Formato decimal padrão ou monetário explícito (ex: "37.58", "37,58", "R$ 37,58")
  if (raw.includes(',') || (raw.includes('.') && raw.split('.')[1]?.length <= 2)) {
    const cleaned = raw.replace(/[^\d.,]/g, '').replace(',', '.');
    const num = Number(cleaned);
    if (!Number.isFinite(num) || num < 0) return null;
    return Math.round(num * 100);
  }

  // Formato inteiro de centavos da API TikTok Shop (ex: "3758" -> 3758 centavos = R$ 37,58)
  const num = Number(raw.replace(/[^\d]/g, ''));
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num);
}

function parseCurrencyToCents(value: unknown): number | null {
  return parsePriceToCents(value);
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
    { name: 'product_price_info.sale_price_decimal', val: priceObj?.sale_price_decimal },
    { name: 'product_price_info.real_price_decimal', val: priceObj?.real_price_decimal },
    { name: 'product_price_info.real_price', val: priceObj?.real_price },
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

export function validateAndNormalizeProduct(
  rawItem: any,
  sourceEndpoint: string = 'SocialCrawl Provider',
  collectionPosition?: number
): {
  product: MinedProduct | null;
  rejectReason: string | null;
} {
  if (!rawItem || typeof rawItem !== 'object') {
    return { product: null, rejectReason: 'invalid_raw_item_object' };
  }

  const item = (rawItem.product && typeof rawItem.product === 'object' && !Array.isArray(rawItem.product))
    ? { ...rawItem.product, ...rawItem }
    : rawItem;

  const cleanProductId = String(
    item?.product_id ??
    item?.productId ??
    item?.id ??
    item?.item_id ??
    item?.itemId ??
    ''
  ).trim();

  if (!cleanProductId) {
    return { product: null, rejectReason: 'missing_product_id' };
  }

  const priceObj = item?.product_price_info || item?.price_info || item?.price || item?.price_range || item?.priceInfo || {};
  const video = item?.video || item?.primary_video || null;
  const stats = video?.statistics || video?.stats || {};
  const author = video?.author || {};

  // Categoria a partir de category_breadcrumb (formato real SocialCrawl)
  let category: string | null = null;
  if (Array.isArray(item?.category_breadcrumb)) {
    category = item.category_breadcrumb
      .map((entry: any) => (entry && typeof entry === 'object' ? (entry.category_name || entry.name) : String(entry)))
      .filter(Boolean)
      .join(' > ');
  }

  if (!category && Array.isArray(item?.categories)) {
    category = item.categories
      .map((c: any) => (typeof c === 'string' ? c : (c?.name || c?.category_name)))
      .filter(Boolean)
      .join(' > ');
  }

  if (!category) {
    category = item?.category_path || item?.category_name || item?.category || item?.categoryPath || null;
  }

  // Preço de venda (sale_price)
  const rawSalePrice = priceObj?.sale_price_decimal ??
                       priceObj?.real_price_decimal ??
                       priceObj?.sale_price ??
                       priceObj?.real_price ??
                       priceObj?.price_decimal ??
                       priceObj?.price ??
                       priceObj?.min_price_decimal ??
                       priceObj?.min_price ??
                       item?.real_price ??
                       item?.sale_price ??
                       item?.price;

  // Preço original (origin_price)
  const rawOriginPrice = priceObj?.origin_price_decimal ??
                         priceObj?.original_price_decimal ??
                         priceObj?.origin_price ??
                         priceObj?.original_price ??
                         priceObj?.max_price_decimal ??
                         priceObj?.max_price ??
                         item?.origin_price ??
                         item?.original_price;

  const priceCents = parsePriceToCents(rawSalePrice);
  const originalPriceCents = parsePriceToCents(rawOriginPrice);

  // Desconto percentual
  let discountPercent: number | null = null;
  if (priceObj?.discount_format) {
    const parsedDisc = parseInteger(String(priceObj.discount_format).replace(/[^\d]/g, ''));
    if (parsedDisc !== null && parsedDisc > 0) discountPercent = parsedDisc;
  } else if (priceObj?.discount_decimal !== undefined && priceObj?.discount_decimal !== null) {
    discountPercent = Math.round(Number(priceObj.discount_decimal) * 100);
  }
  if ((discountPercent === null || discountPercent === 0) && priceCents && originalPriceCents && originalPriceCents > priceCents) {
    discountPercent = Math.round(((originalPriceCents - priceCents) / originalPriceCents) * 100);
  }

  // Comissões (opcional)
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
    commCents = parsePriceToCents(
      commInfo?.estimated_commission ??
      commInfo?.commission ??
      item?.estimated_commission
    );
  }
  if (commCents === null && commRate !== null && commRate > 0 && priceCents) {
    commCents = Math.round((priceCents * commRate) / 100);
  }

  // URL canônica ou pdp do produto
  const rawProductUrl = item?.seo_url?.canonical_url
    || item?.product_url
    || item?.pdp_url
    || item?.detail_url
    || item?.url;

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
  if (!resolvedProductUrl && cleanProductId) {
    resolvedProductUrl = `https://www.tiktok.com/shop/pdp/${cleanProductId}`;
  }

  // Extração e normalização de vídeos associados
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
  for (let vIdx = 0; vIdx < rawVideoList.length; vIdx++) {
    const vItem = rawVideoList[vIdx];
    if (!vItem || typeof vItem !== 'object') continue;
    const awemeId = vItem?.aweme_id
      ? String(vItem.aweme_id)
      : (vItem?.id ? String(vItem.id) : (vItem?.video_id ? String(vItem.video_id) : (cleanProductId ? `${cleanProductId}_v${vIdx + 1}` : null)));
    if (!awemeId) continue;
    const vStats = vItem?.statistics || vItem?.stats || {};
    const vAuthor = vItem?.author || {};
    const vUrl = vItem?.share_url || vItem?.url_list?.[0] || vItem?.url || vItem?.play_addr || null;
    const videoObj: MinedVideo = {
      id: awemeId,
      url: vUrl,
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

  const fallbackSingleVideo: MinedVideo | null = (video && typeof video === 'object') ? {
    id: video?.aweme_id ? String(video.aweme_id) : (video?.id ? String(video.id) : (video?.video_id ? String(video.video_id) : (cleanProductId ? `${cleanProductId}_v1` : 'vid'))),
    url: video?.share_url || video?.url_list?.[0] || video?.url || null,
    description: video?.desc || video?.description || null,
    author: author?.unique_id || author?.nickname || null,
    authorFollowers: parseInteger(author?.follower_count || author?.followers),
    views: parseInteger(stats?.play_count || stats?.views),
    likes: parseInteger(stats?.digg_count || stats?.likes),
    comments: parseInteger(stats?.comment_count || stats?.comments),
    shares: parseInteger(stats?.share_count || stats?.shares),
    saves: parseInteger(stats?.collect_count || stats?.saves),
  } : null;

  const primaryVideo = associatedVideosList.length > 0 ? associatedVideosList[0] : fallbackSingleVideo;

  const rawTitle = String(
    item?.title ??
    item?.product_name ??
    item?.name ??
    item?.item_name ??
    item?.productTitle ??
    'Produto sem nome'
  ).trim();

  const rawImageUrl =
    item?.image?.url_list?.[0] ||
    item?.image?.url ||
    item?.image_url ||
    item?.imageUrl ||
    item?.cover ||
    item?.main_image ||
    item?.mainImage ||
    (Array.isArray(item?.images) ? (typeof item.images[0] === 'string' ? item.images[0] : item.images[0]?.url) : null) ||
    null;

  const product: MinedProduct = {
    productId: cleanProductId,
    title: rawTitle,
    imageUrl: rawImageUrl,
    priceCents,
    originalPriceCents,
    discountPercent,
    currencySymbol: String(priceObj?.currency_symbol || item?.currency_symbol || item?.currency || 'R$'),
    rating: parseRating(item?.rate_info?.score ?? item?.rate_info?.rating ?? item?.rating ?? item?.score),
    soldCount: parseInteger(item?.sold_info?.sold_count ?? item?.sold_count ?? item?.sales ?? item?.total_sold) || 0,
    sellerId: item?.seller_info?.seller_id ? String(item.seller_info.seller_id) : (item?.seller_id ? String(item.seller_id) : null),
    sellerName: item?.seller_info?.shop_name ? String(item.seller_info.shop_name) : (item?.seller_name ? String(item.seller_name) : (item?.shop_name ? String(item.shop_name) : null)),
    productUrl: resolvedProductUrl,
    category,
    estimatedCommissionCents: commCents && commCents > 0 ? commCents : null,
    commissionRatePercent: commRate && commRate > 0 ? commRate : null,
    video: primaryVideo,
    associatedVideos: associatedVideosList,
    collectionPosition,
  };

  return { product, rejectReason: null };
}

export function normalizeProduct(rawItem: any, sourceEndpoint: string = 'SocialCrawl Provider'): MinedProduct {
  const res = validateAndNormalizeProduct(rawItem, sourceEndpoint);
  if (res.product) return res.product;
  const pId = String(rawItem?.product_id || rawItem?.productId || rawItem?.id || 'temp').trim();
  return {
    productId: pId,
    title: String(rawItem?.title || rawItem?.product_name || 'Produto sem nome').trim(),
    imageUrl: rawItem?.image?.url_list?.[0] || null,
    priceCents: null,
    originalPriceCents: null,
    discountPercent: null,
    currencySymbol: 'R$',
    rating: null,
    soldCount: 0,
    sellerId: null,
    sellerName: null,
    productUrl: null,
    category: null,
    estimatedCommissionCents: null,
    commissionRatePercent: null,
    video: null,
    associatedVideos: [],
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

export async function persistProducts(
  products: MinedProduct[],
  query: string,
  collectionCategory?: string | null,
  collectionSubcategory?: string | null
): Promise<{
  insertedCount: number;
  updatedCount: number;
  insertedIds: string[];
  totalValid: number;
}> {
  if (!isDatabaseConfigured() || products.length === 0) {
    return { insertedCount: 0, updatedCount: 0, insertedIds: [], totalValid: 0 };
  }
  await ensureProductMinerTables();

  const validProducts = products.filter((product) => product.productId && String(product.productId).trim() !== '');
  if (validProducts.length === 0) {
    return { insertedCount: 0, updatedCount: 0, insertedIds: [], totalValid: 0 };
  }

  const ids = validProducts.map((product) => product.productId);

  // Verificar quais produtos já existem no banco para contabilização exata de novos vs atualizados
  const existingSet = new Set<string>();
  try {
    const [existingRows]: any = await db.query(
      `SELECT product_id FROM tiktok_shop_products WHERE product_id IN (?)`,
      [ids]
    );
    if (Array.isArray(existingRows)) {
      for (const r of existingRows) {
        if (r.product_id) existingSet.add(String(r.product_id));
      }
    }
  } catch (err: any) {
    console.warn('[persistProducts check existing warning]:', err?.message || err);
  }

  const insertedIds = ids.filter((id) => !existingSet.has(id));
  const insertedCount = insertedIds.length;
  const updatedCount = ids.length - insertedCount;

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
    collectionCategory || null,
    collectionSubcategory || null,
  ]);

  await db.query(
    `INSERT INTO tiktok_shop_products (
      product_id, title, image_url, price_cents, original_price_cents, discount_percent,
      currency_symbol, rating, sold_count, seller_id, seller_name, product_url, category_path,
      video_id, video_url, video_author, video_author_followers, video_views, video_likes,
      video_comments, video_shares, video_saves, estimated_commission_cents, commission_rate_percent, query_source,
      collection_category, collection_subcategory
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
      category_path = IF(category_path IS NULL OR TRIM(category_path) = '', VALUES(category_path), category_path),
      video_id = IF(VALUES(video_id) IS NOT NULL AND VALUES(video_id) != '', VALUES(video_id), video_id),
      video_url = IF(VALUES(video_url) IS NOT NULL AND VALUES(video_url) != '', VALUES(video_url), video_url),
      video_author = IF(VALUES(video_author) IS NOT NULL AND VALUES(video_author) != '', VALUES(video_author), video_author),
      video_author_followers = IF(VALUES(video_author_followers) IS NOT NULL, VALUES(video_author_followers), video_author_followers),
      video_views = IF(VALUES(video_views) IS NOT NULL, VALUES(video_views), video_views),
      video_likes = IF(VALUES(video_likes) IS NOT NULL, VALUES(video_likes), video_likes),
      video_comments = IF(VALUES(video_comments) IS NOT NULL, VALUES(video_comments), video_comments),
      video_shares = IF(VALUES(video_shares) IS NOT NULL, VALUES(video_shares), video_shares),
      video_saves = IF(VALUES(video_saves) IS NOT NULL, VALUES(video_saves), video_saves),
      estimated_commission_cents = IF(VALUES(estimated_commission_cents) IS NOT NULL, VALUES(estimated_commission_cents), estimated_commission_cents),
      commission_rate_percent = IF(VALUES(commission_rate_percent) IS NOT NULL, VALUES(commission_rate_percent), commission_rate_percent),
      query_source = IF(query_source IS NOT NULL AND query_source != '', query_source, VALUES(query_source)),
      collection_category = IF(collection_category IS NOT NULL AND collection_category != '', collection_category, VALUES(collection_category)),
      collection_subcategory = IF(collection_subcategory IS NOT NULL AND collection_subcategory != '', collection_subcategory, VALUES(collection_subcategory)),
      last_seen_at = NOW()`,
    [productRows]
  );

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

  return {
    insertedCount,
    updatedCount,
    insertedIds,
    totalValid: validProducts.length,
  };
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

export function getSubcategoryKeywords(sub: string): string[] {
  const norm = String(sub || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!norm || norm === 'todas' || norm === 'todos' || norm === 'geral') return [];

  const map: Record<string, string[]> = {
    'acessorios interiores de veiculos': ['interior', 'capa', 'suporte', 'organizador', 'tapete', 'volante', 'assento'],
    'lavagem e manutencao de carros': ['lavagem', 'shampoo', 'cera', 'pretinho', 'limpeza', 'microfibra', 'polimento'],
    'ferramentas de reparo de veiculos': ['ferramenta', 'chave', 'macaco', 'soquete', 'reparo', 'scanner', 'obd'],
    'sistema eletronico de veiculos': ['eletronico', 'alarme', 'rastreador', 'som', 'multimidia', 'rele', 'modulo'],
    'luzes do veiculo': ['luz', 'lampada', 'led', 'farol', 'lanterna', 'milha', 'pingo'],
    'acessorios exteriores de veiculos': ['exterior', 'palheta', 'calha', 'aerofolio', 'emblema', 'retrovisor', 'protecao'],
    'capas e protecoes de veiculos': ['capa', 'protecao', 'sol', 'parasol', 'cobertura'],
    'pecas de reposicao para veiculos': ['peca', 'filtro', 'vela', 'pastilha', 'correia', 'amortecedor', 'bomba'],
    'motocicletas e quadriciclos': ['moto', 'motocicleta', 'capacetes', 'luva moto', 'bau moto', 'jaqueta moto'],
    'pecas e acessorios para motos': ['moto', 'retrovisor moto', 'manopla', 'corrente moto', 'escapamento', 'suporte cel'],

    'fragrancias': ['perfume', 'parfum', 'fragrancia', 'splash', 'colonia'],
    'cuidados com a pele': ['skincare', 'serum', 'creme', 'hidratante', 'protetor', 'limpeza', 'esfoliante'],
    'maquiagem': ['batom', 'base', 'corretivo', 'rimel', 'sombra', 'pincel', 'po', 'gloss'],
    'cuidados com o cabelo': ['shampoo', 'condicionador', 'mascara', 'oleo', 'cabelo', 'trancador', 'progressiva'],
    'higiene pessoal': ['sabonete', 'desodorante', 'pasta', 'escova', 'absorvente', 'fio dental'],
  };

  return map[norm] || [norm];
}

export function getChildCategoryAliases(child: string): string[] {
  const norm = String(child || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!norm || norm === 'todas' || norm === 'todos') return [child];

  const aliases = new Set<string>([child]);

  const map: Record<string, string[]> = {
    'limpadores para equipamentos de escritorio': ['Office Equipment Cleaners', 'Equipment Cleaners'],
    'monitor portatil para computador': ['Portable Computer Monitor', 'Portable Monitor'],
    'cabos e acessorios': ['Cables & Accessories', 'Cables and Accessories'],
    'computadores de placa unica (sbc)': ['Single Board Computers', 'Single Board Computer'],
    'roupas islamicas femininas para dormir e ficar em casa': ["Women's Muslim Sleepwear & Loungewear", "Women's Sleepwear & Loungewear"],
    'roupas islamicas masculinas para dormir e ficar em casa': ["Men's Muslim Sleepwear & Loungewear", "Men's Sleepwear & Loungewear"],
    'manguitos para maos': ['Handsocks', 'Hand Sleeves'],
    'alfinetes para hijab': ['Hijab Pins', 'Hijab Pin'],
    'meias': ['Socks'],
    'calcados tradicionais': ['Traditional Footwear'],
    'sapatos para casamento': ['Wedding Shoes'],
    'suplementos herbais': ['Herbal Supplements'],
    'dispositivos de compressao corporal': ['Body Compression Devices'],
    'suprimentos de nutricao e cuidados de saude': ['Nutrition & Health Care Supplies'],
    'capas contra poeira e armazenamento em tecido': ['Dust cover & Fabric storage', 'Dust cover and Fabric storage'],
    'camas inflaveis, travesseiros e acessorios': ['Inflatable Beds, Pillows & Accessories', 'Inflatable Beds, Pillows and Accessories'],
    'trico': ['Knitting'],
    'bordado e conjuntos': ['Embroidery & sets', 'Embroidery and sets'],
    'croche': ['Crochet'],
    'feltro e conjuntos': ['Felt & sets', 'Felt and sets'],
  };

  if (map[norm]) {
    for (const a of map[norm]) {
      aliases.add(a);
    }
  }

  return Array.from(aliases);
}

export function getChildCategoryKeywords(child: string): string[] {
  const norm = String(child || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!norm || norm === 'todas' || norm === 'todos' || norm === 'geral') return [];

  const map: Record<string, string[]> = {
    'perfume feminino': ['perfume', 'feminino', 'woman', 'women', 'splash', 'parfum', 'doce', 'floral'],
    'perfume masculino': ['perfume', 'masculino', 'men', 'man', 'parfum', 'amadeirado', 'citrico'],
    'body splash e brumas': ['body splash', 'bruma', 'splash', 'desodorante colonia'],
    'fragrancias unissex': ['unissex', 'perfume', 'colonia'],

    'suportes para celular de carro': ['suporte', 'celular', 'veicular', 'painel', 'saida de ar'],
    'organizadores e sacos de armazenamento': ['organizador', 'porta objetos', 'bolsa', 'banco'],
    'aromatizantes e purificadores de ar': ['cheirinho', 'aromatizante', 'difusor', 'aroma', 'glade', 'little trees'],
    'capas de volante': ['capa', 'volante', 'couro', 'costurada'],
    'capas de banco e protetores': ['capa', 'banco', 'assento', 'estofado', 'couro'],

    'shampoo e sabao automotivo': ['shampoo', 'sabao', 'desengraxante', 'lava auto'],
    'ceras e selantes': ['cera', 'selante', 'vitrificador', 'cristalizador'],
    'toalhas e luvas de microfibra': ['microfibra', 'flanela', 'toalha', 'luva lavagem'],
    'pretinho e limpa pneus': ['pneu', 'pretinho', 'revitalizador', 'borracha'],

    'scanner de diagnostico obd2': ['scanner', 'obd2', 'obd', 'diagnostico', 'elm327'],
    'jogos de chaves e soquetes': ['chave', 'soquete', 'catraca', 'jogo de chaves', 'alicate'],
    'macacos e cavaletes': ['macaco', 'cavalete', 'hidraulico', 'joelho'],

    'cameras para carros (dashcam)': ['camera', 'dashcam', 'retrovisor', 'gravador', 're'],
    'central multimidia e som': ['multimidia', 'som', 'bluetooth', 'radio', 'carplay', 'android auto'],

    'lampadas led para farol': ['led', 'lampada', 'h7', 'h4', 'h1', 'farol'],
    'lanternas e luzes internas': ['lanterna', 'interna', 'pingo', 't10', 'festoft'],

    'limpadores para equipamentos de escritorio': ['limpador', 'limpeza', 'cleaner', 'spray limpeza'],
    'monitor portatil para computador': ['monitor', 'portatil', 'portable', 'tela portatil'],
    'cabos e acessorios': ['cabo', 'cable', 'hdmi', 'displayport', 'adaptador'],
    'computadores de placa unica (sbc)': ['sbc', 'single board', 'raspberry', 'placa unica'],
  };

  return map[norm] || [norm];
}

export function buildProductSearchWhereClause(params: {
  query?: string;
  category?: string;
  subcategory?: string;
  childCategory?: string;
  hasVideoOnly?: boolean;
  minVideoViews?: number;
}): { whereSql: string; sqlParams: any[]; querySourceForOrder: string | null } {
  const whereConditions: string[] = [];
  const sqlParams: any[] = [];

  const rawQuery = String(params.query || '').trim();
  const rawCategory = String(params.category || '').trim();
  const rawSubcategory = String(params.subcategory || '').trim();
  const rawChildCategory = String(params.childCategory || '').trim();
  const hasVideoOnly = Boolean(params.hasVideoOnly);
  const minVideoViews = params.minVideoViews && Number.isFinite(params.minVideoViews) && params.minVideoViews > 0 ? params.minVideoViews : undefined;

  let categoryToUse = rawCategory;
  if (categoryToUse.toLowerCase() === 'todos' || categoryToUse.toLowerCase() === 'todas') {
    categoryToUse = '';
  }

  let subcategoryToUse = rawSubcategory;
  if (subcategoryToUse.toLowerCase() === 'todas' || subcategoryToUse.toLowerCase() === 'todos') {
    subcategoryToUse = '';
  }

  let childCategoryToUse = rawChildCategory;
  if (childCategoryToUse.toLowerCase() === 'todas' || childCategoryToUse.toLowerCase() === 'todos') {
    childCategoryToUse = '';
  }

  // 1. Category Filter
  if (categoryToUse) {
    const catAliases = getCategoryAliases(categoryToUse);
    const catOrs: string[] = [];
    for (const alias of catAliases) {
      catOrs.push(`TRIM(p.query_source) = ?`);
      sqlParams.push(alias);
      catOrs.push(`LOWER(TRIM(p.query_source)) = LOWER(?)`);
      sqlParams.push(alias);
      catOrs.push(`p.category_path = ?`);
      sqlParams.push(alias);
      catOrs.push(`p.category_path LIKE ?`);
      sqlParams.push(`${alias} >%`);
    }
    whereConditions.push(`(${catOrs.join(' OR ')})`);
  }

  // 2. Subcategory Filter
  if (subcategoryToUse) {
    const subOrs: string[] = [];
    const subAliases = getSubcategoryAliases(subcategoryToUse);
    for (const alias of subAliases) {
      subOrs.push(`p.category_path LIKE ?`);
      sqlParams.push(`%> ${alias}`);
      subOrs.push(`p.category_path LIKE ?`);
      sqlParams.push(`%> ${alias} >%`);
      subOrs.push(`p.category_path = ?`);
      sqlParams.push(alias);
    }

    const subKeywords = getSubcategoryKeywords(subcategoryToUse);
    if (subKeywords.length > 0) {
      const kwOrs = subKeywords.map(() => `p.title LIKE ?`);
      for (const kw of subKeywords) {
        sqlParams.push(`%${kw}%`);
      }
      subOrs.push(`(${kwOrs.join(' OR ')})`);
    }

    whereConditions.push(`(${subOrs.join(' OR ')})`);
  }

  // 3. Child Category Filter
  if (childCategoryToUse) {
    const childOrs: string[] = [];
    const childAliases = getChildCategoryAliases(childCategoryToUse);
    for (const alias of childAliases) {
      childOrs.push(`p.category_path LIKE ?`);
      sqlParams.push(`%> ${alias}`);
      childOrs.push(`p.category_path LIKE ?`);
      sqlParams.push(`%> ${alias} >%`);
      childOrs.push(`p.category_path = ?`);
      sqlParams.push(alias);
    }

    const childKeywords = getChildCategoryKeywords(childCategoryToUse);
    if (childKeywords.length > 0) {
      const kwOrs = childKeywords.map(() => `p.title LIKE ?`);
      for (const kw of childKeywords) {
        sqlParams.push(`%${kw}%`);
      }
      childOrs.push(`(${kwOrs.join(' OR ')})`);
    }

    whereConditions.push(`(${childOrs.join(' OR ')})`);
  }

  // 4. Video and Views Filter
  if (minVideoViews) {
    whereConditions.push(`(
      COALESCE(p.video_views, 0) >= ?
      OR EXISTS (
        SELECT 1 FROM tiktok_shop_product_videos pv_flt
        WHERE pv_flt.product_id = p.product_id AND COALESCE(pv_flt.video_views, 0) >= ?
      )
    )`);
    sqlParams.push(minVideoViews, minVideoViews);
  } else if (hasVideoOnly) {
    whereConditions.push(`(
      (p.video_url IS NOT NULL AND p.video_url != '')
      OR (p.video_id IS NOT NULL AND p.video_id != '')
      OR COALESCE(p.video_views, 0) > 0
      OR EXISTS (
        SELECT 1 FROM tiktok_shop_product_videos pv_flt
        WHERE pv_flt.product_id = p.product_id
      )
    )`);
  }

  // 5. Search Query Filter
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

export async function logSearchEvent(params: {
  studentCode?: string;
  query?: string;
  category?: string;
  subcategory?: string;
  childCategory?: string;
  eventType?: 'text_search' | 'category_filter';
}): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const q = String(params.query || '').trim();
  const cat = String(params.category || '').trim();
  const eventType = params.eventType || (q ? 'text_search' : 'category_filter');

  // Do not log empty queries / filter actions without context
  if (!q && !cat) return;

  try {
    await ensureProductMinerTables();
    await db.query(
      `INSERT INTO product_search_events (student_code, search_query, event_type, category, subcategory, child_category)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        params.studentCode || null,
        q || cat,
        eventType,
        cat || null,
        params.subcategory || null,
        params.childCategory || null,
      ]
    );
  } catch (err: any) {
    console.warn('[logSearchEvent Error]:', err?.message || err);
  }
}

export async function logProductInteractionEvent(params: {
  studentCode?: string;
  productId: string;
  query?: string;
  category?: string;
  subcategory?: string;
  childCategory?: string;
  eventType?: 'product_open' | 'product_click';
}): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const productId = String(params.productId || '').trim();
  if (!productId) return;

  try {
    await ensureProductMinerTables();

    const studentCode = params.studentCode || null;
    const eventType = params.eventType || 'product_open';

    // Anti-double-click deduplication: ignore identical (studentCode, productId, eventType) within 5 seconds
    const [recentRows]: any = await db.query(
      `SELECT id FROM product_interaction_events
       WHERE product_id = ?
         AND event_type = ?
         AND (student_code = ? OR (student_code IS NULL AND ? IS NULL))
         AND created_at >= DATE_SUB(NOW(), INTERVAL 5 SECOND)
       LIMIT 1`,
      [productId, eventType, studentCode, studentCode]
    );

    if (Array.isArray(recentRows) && recentRows.length > 0) {
      return;
    }

    await db.query(
      `INSERT INTO product_interaction_events (student_code, product_id, search_query, category, subcategory, child_category, event_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        studentCode,
        productId,
        params.query || null,
        params.category || null,
        params.subcategory || null,
        params.childCategory || null,
        eventType,
      ]
    );
  } catch (err: any) {
    console.warn('[logProductInteractionEvent Error]:', err?.message || err);
  }
}

export async function searchTikTokShopProducts(params: {
  query?: string;
  category?: string;
  subcategory?: string;
  childCategory?: string;
  classification?: ClassificationType | null;
  hasVideoOnly?: boolean;
  minVideoViews?: number;
  page?: number;
  region?: string;
  forceRefresh?: boolean;
  collectionCategory?: string | null;
  collectionSubcategory?: string | null;
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
  newProductsCount?: number;
  updatedProductsCount?: number;
  insertedIds?: string[];
  totalReceived?: number;
  rejectedCount?: number;
}> {
  const query = String(params.query || '').trim();
  const category = String(params.category || '').trim();
  const subcategory = String(params.subcategory || '').trim();
  const childCategory = String(params.childCategory || '').trim();
  const classification = params.classification;
  const hasVideoOnly = Boolean(params.hasVideoOnly || (params.minVideoViews && params.minVideoViews > 0));
  const minVideoViews = params.minVideoViews && Number.isFinite(params.minVideoViews) && params.minVideoViews > 0 ? params.minVideoViews : undefined;

  // Telemetry: record search event for query/category
  if (query || category) {
    logSearchEvent({ query, category, subcategory, childCategory }).catch(() => {});
  }

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
        childCategory,
        hasVideoOnly,
        minVideoViews,
      });

      let orderClause = `ORDER BY p.last_seen_at DESC, p.sold_count DESC, p.product_id DESC`;
      let joinClause = ``;

      if (classification === 'best_sellers') {
        orderClause = `ORDER BY p.sold_count DESC, COALESCE(p.rating, 0) DESC, p.last_seen_at DESC`;
      } else if (classification === 'top_rated') {
        orderClause = `ORDER BY COALESCE(p.rating, 0) DESC, p.sold_count DESC, p.last_seen_at DESC`;
      } else if (classification === 'highest_commission') {
        orderClause = `ORDER BY (CASE WHEN (COALESCE(p.estimated_commission_cents, 0) > 0 OR COALESCE(p.commission_rate_percent, 0) > 0) THEN 0 ELSE 1 END), COALESCE(p.estimated_commission_cents, (COALESCE(p.price_cents, 0) * COALESCE(p.commission_rate_percent, 0) / 100), 0) DESC, COALESCE(p.commission_rate_percent, 0) DESC, p.sold_count DESC, p.last_seen_at DESC`;
      } else if (classification === 'viral_video') {
        // VÍDEO VIRAL: Usa a tabela relacional tiktok_shop_product_videos
        // Agrupado por product_id para selecionar o MELHOR vídeo (1 produto = 1 linha)
        // Score viral = views * 1.0 + shares * 10.0 + saves * 5.0 + comments * 3.0 + likes * 0.5
        joinClause = `
          LEFT JOIN (
            SELECT 
              product_id,
              MAX(
                COALESCE(video_views, 0) * 1.0 + 
                COALESCE(video_shares, 0) * 10.0 + 
                COALESCE(video_saves, 0) * 5.0 + 
                COALESCE(video_comments, 0) * 3.0 + 
                COALESCE(video_likes, 0) * 0.5
              ) AS best_video_viral_score,
              MAX(COALESCE(video_views, 0)) AS max_v_views
            FROM tiktok_shop_product_videos
            GROUP BY product_id
          ) pv ON pv.product_id = p.product_id
        `;
        orderClause = `ORDER BY GREATEST(
          COALESCE(pv.best_video_viral_score, 0),
          (
            COALESCE(p.video_views, 0) * 1.0 + 
            COALESCE(p.video_shares, 0) * 10.0 + 
            COALESCE(video_saves, 0) * 5.0 + 
            COALESCE(video_comments, 0) * 3.0 + 
            COALESCE(video_likes, 0) * 0.5
          )
        ) DESC, p.sold_count DESC, p.last_seen_at DESC`;
      } else if (classification === 'sales_24h') {
        // VENDAS 24H: Variação real de sold_count em janela coerente (~24h: 18h a 42h)
        joinClause = `
          LEFT JOIN (
            SELECT s.product_id, s.sold_count AS sold_24h
            FROM tiktok_shop_product_snapshots s
            INNER JOIN (
              SELECT product_id, MAX(captured_at) AS max_cap
              FROM tiktok_shop_product_snapshots
              WHERE captured_at <= NOW() - INTERVAL 18 HOUR AND captured_at >= NOW() - INTERVAL 42 HOUR
              GROUP BY product_id
            ) m ON s.product_id = m.product_id AND s.captured_at = m.max_cap
          ) snap24 ON snap24.product_id = p.product_id
        `;
        orderClause = `ORDER BY GREATEST(0, p.sold_count - COALESCE(snap24.sold_24h, p.sold_count)) DESC, p.last_seen_at DESC, p.sold_count DESC`;
      } else if (classification === 'spiking') {
        // DISPARANDO: Mede ACELERAÇÃO recente real = sales_last_24h - sales_previous_24h com proteção contra deltas negativos
        joinClause = `
          LEFT JOIN (
            SELECT s.product_id, s.sold_count AS sold_24h
            FROM tiktok_shop_product_snapshots s
            INNER JOIN (
              SELECT product_id, MAX(captured_at) AS max_cap
              FROM tiktok_shop_product_snapshots
              WHERE captured_at <= NOW() - INTERVAL 18 HOUR AND captured_at >= NOW() - INTERVAL 42 HOUR
              GROUP BY product_id
            ) m ON s.product_id = m.product_id AND s.captured_at = m.max_cap
          ) snap24 ON snap24.product_id = p.product_id
          LEFT JOIN (
            SELECT s.product_id, s.sold_count AS sold_48h
            FROM tiktok_shop_product_snapshots s
            INNER JOIN (
              SELECT product_id, MAX(captured_at) AS max_cap
              FROM tiktok_shop_product_snapshots
              WHERE captured_at <= NOW() - INTERVAL 42 HOUR AND captured_at >= NOW() - INTERVAL 72 HOUR
              GROUP BY product_id
            ) m ON s.product_id = m.product_id AND s.captured_at = m.max_cap
          ) snap48 ON snap48.product_id = p.product_id
        `;
        orderClause = `ORDER BY 
          (CASE WHEN snap24.sold_24h IS NOT NULL AND snap48.sold_48h IS NOT NULL THEN 0 ELSE 1 END) ASC,
          (
            GREATEST(0, p.sold_count - snap24.sold_24h)
            -
            GREATEST(0, snap24.sold_24h - snap48.sold_48h)
          ) DESC,
          GREATEST(0, p.sold_count - snap24.sold_24h) DESC,
          p.sold_count DESC,
          p.last_seen_at DESC`;
      } else if (classification === 'trending') {
        // TENDÊNCIAS: Crescimento recente sustentável (vendas 24h + vendas 48h + rating + alcance)
        joinClause = `
          LEFT JOIN (
            SELECT s.product_id, s.sold_count AS sold_24h
            FROM tiktok_shop_product_snapshots s
            INNER JOIN (
              SELECT product_id, MAX(captured_at) AS max_cap
              FROM tiktok_shop_product_snapshots
              WHERE captured_at <= NOW() - INTERVAL 18 HOUR AND captured_at >= NOW() - INTERVAL 42 HOUR
              GROUP BY product_id
            ) m ON s.product_id = m.product_id AND s.captured_at = m.max_cap
          ) snap24 ON snap24.product_id = p.product_id
          LEFT JOIN (
            SELECT s.product_id, s.sold_count AS sold_48h
            FROM tiktok_shop_product_snapshots s
            INNER JOIN (
              SELECT product_id, MAX(captured_at) AS max_cap
              FROM tiktok_shop_product_snapshots
              WHERE captured_at <= NOW() - INTERVAL 42 HOUR AND captured_at >= NOW() - INTERVAL 72 HOUR
              GROUP BY product_id
            ) m ON s.product_id = m.product_id AND s.captured_at = m.max_cap
          ) snap48 ON snap48.product_id = p.product_id
          LEFT JOIN (
            SELECT product_id, MAX(video_views) AS max_v_views
            FROM tiktok_shop_product_videos
            GROUP BY product_id
          ) pv ON pv.product_id = p.product_id
        `;
        orderClause = `ORDER BY (
          GREATEST(0, p.sold_count - COALESCE(snap24.sold_24h, p.sold_count)) * 1.0 +
          GREATEST(0, COALESCE(snap24.sold_24h, p.sold_count) - COALESCE(snap48.sold_48h, snap24.sold_24h, p.sold_count)) * 0.5 +
          COALESCE(p.rating, 0) * 10.0 +
          GREATEST(COALESCE(pv.max_v_views, 0), COALESCE(p.video_views, 0)) * 0.001
        ) DESC, p.last_seen_at DESC, p.sold_count DESC`;
      } else if (classification === 'editors_choice') {
        // ESCOLHA DO DIA: Pontuação composta equilibrada com escala logarítmica
        joinClause = `
          LEFT JOIN (
            SELECT s.product_id, s.sold_count AS sold_24h
            FROM tiktok_shop_product_snapshots s
            INNER JOIN (
              SELECT product_id, MAX(captured_at) AS max_cap
              FROM tiktok_shop_product_snapshots
              WHERE captured_at <= NOW() - INTERVAL 18 HOUR AND captured_at >= NOW() - INTERVAL 42 HOUR
              GROUP BY product_id
            ) m ON s.product_id = m.product_id AND s.captured_at = m.max_cap
          ) snap24 ON snap24.product_id = p.product_id
          LEFT JOIN (
            SELECT product_id, MAX(video_views) AS max_v_views
            FROM tiktok_shop_product_videos
            GROUP BY product_id
          ) pv ON pv.product_id = p.product_id
        `;
        orderClause = `ORDER BY (
          LOG10(1 + p.sold_count) * 20.0 +
          LOG10(1 + GREATEST(0, p.sold_count - COALESCE(snap24.sold_24h, p.sold_count))) * 25.0 +
          COALESCE(p.rating, 0) * 10.0 +
          LOG10(1 + COALESCE(p.estimated_commission_cents, (COALESCE(p.price_cents, 0) * COALESCE(p.commission_rate_percent, 0) / 100), 0)) * 15.0 +
          LOG10(1 + GREATEST(COALESCE(pv.max_v_views, 0), COALESCE(p.video_views, 0))) * 10.0 +
          (CASE WHEN p.last_seen_at >= NOW() - INTERVAL 7 DAY THEN 10.0 ELSE 0.0 END)
        ) DESC, p.last_seen_at DESC, p.sold_count DESC`;
      } else if (classification === 'most_searched') {
        // MAIS PESQUISADOS: Interações reais originadas por pesquisa/clique no produto
        joinClause = `
          LEFT JOIN (
            SELECT product_id, COUNT(*) AS interaction_count
            FROM product_interaction_events
            WHERE event_type IN ('product_open', 'product_click')
            GROUP BY product_id
          ) pie ON pie.product_id = p.product_id
        `;
        orderClause = `ORDER BY COALESCE(pie.interaction_count, 0) DESC, p.sold_count DESC, p.last_seen_at DESC`;
      } else if (querySourceForOrder) {
        orderClause = `ORDER BY CASE WHEN LOWER(TRIM(p.query_source)) = LOWER(?) THEN 0 ELSE 1 END, p.sold_count DESC, p.last_seen_at DESC`;
      }

      // When a minVideoViews filter is active, force ordering by video_views DESC
      if (minVideoViews) {
        if (!joinClause.includes('pv ON pv.product_id')) {
          joinClause += `
            LEFT JOIN (
              SELECT product_id, MAX(COALESCE(video_views, 0)) AS max_v_views
              FROM tiktok_shop_product_videos
              GROUP BY product_id
            ) pv ON pv.product_id = p.product_id
          `;
        }
        orderClause = `ORDER BY GREATEST(COALESCE(pv.max_v_views, 0), COALESCE(p.video_views, 0)) DESC, p.sold_count DESC, p.last_seen_at DESC`;
      }

      const orderParams = (!classification && !minVideoViews && querySourceForOrder) ? [querySourceForOrder] : [];

      const [rows]: any = await db.query(
        `SELECT p.*
         FROM tiktok_shop_products p
         ${joinClause}
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
           ${joinClause}
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

  const rawItems = extractRawItemsFromPayload(payload);
  const rawCredits = payload.credits_used ?? payload.credits ?? payload.cost;
  if (rawCredits === undefined || rawCredits === null) {
    console.warn(`[SocialCrawl Search Warning]: Campo de créditos ausente na resposta da query "${providerQuery}" (Pág ${page}). Assumindo 0 créditos.`);
  }
  const creditsUsedForThisCall = (typeof rawCredits === 'number' && Number.isFinite(rawCredits))
    ? Math.max(0, rawCredits)
    : (rawCredits !== undefined && rawCredits !== null && !isNaN(Number(rawCredits)) ? Math.max(0, Number(rawCredits)) : 0);
  const hasMore = extractHasMoreFromPayload(payload, rawItems.length);

  if (rawItems.length === 0 && response.ok) {
    const topKeys = Object.keys(payload);
    const dataKeys = payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
      ? Object.keys(payload.data)
      : (Array.isArray(payload.data) ? `array[${payload.data.length}]` : typeof payload.data);

    console.warn(`[SocialCrawl Search Unexpected Payload Structure]:`, {
      category: providerQuery,
      page,
      httpStatus: response.status,
      topLevelKeys: topKeys,
      dataKeys,
      itemsFound: 0,
      reason: 'Nenhum array de produtos identificado nas propriedades conhecidas (items, products, results, product_list, etc.)',
    });

    logMinerAcquisition({
      query: providerQuery,
      page,
      region,
      endpoint: '/v1/tiktokshop/search',
      requestUrl: url.toString(),
      requestExecuted: true,
      httpStatus: response.status,
      itemsReceived: 0,
      creditsUsed: creditsUsedForThisCall,
      skipReason: `PAYLOAD_STRUCTURE_MISMATCH: topKeys=[${topKeys.join(',')}], dataKeys=[${dataKeys}]`,
    });
  }

  const rejectionReasons: Record<string, number> = {};
  const normalized: MinedProduct[] = [];

  for (let idx = 0; idx < rawItems.length; idx++) {
    const rawItem = rawItems[idx];
    const pos = (page - 1) * 30 + (idx + 1);
    const { product, rejectReason } = validateAndNormalizeProduct(rawItem, 'SocialCrawl Search API', pos);
    if (product && product.productId) {
      normalized.push(product);
    } else {
      const reason = rejectReason || 'unknown_rejection';
      rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
    }
  }

  console.log(`[SocialCrawl Search Stats]: query="${providerQuery}" page=${page} itemsReceived=${rawItems.length} normalizedCount=${normalized.length} rejectedCount=${rawItems.length - normalized.length} reasons=${JSON.stringify(rejectionReasons)}`);

  if (rawItems.length > 0 && normalized.length === 0) {
    const reasonStr = Object.entries(rejectionReasons).map(([k, v]) => `${k}:${v}`).join(', ');
    throw new Error(`PARSER_REJECTION: Nenhum produto válido extraído de ${rawItems.length} itens recebidos da SocialCrawl (Motivos: ${reasonStr || 'missing_product_id'}).`);
  }

  const persistStats = await persistProducts(
    normalized,
    query,
    params.collectionCategory || category || null,
    params.collectionSubcategory || subcategory || null
  );
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
    itemsReceived: rawItems.length,
    creditsUsed: creditsUsedForThisCall,
  });

  return {
    products,
    creditsUsed: creditsUsedForThisCall,
    creditsRemaining: payload.credits_remaining ?? null,
    hasMore,
    pageSize: Number(payload.pagination?.page_size || products.length),
    fromCache: false,
    source: 'provider',
    needsRefresh: false,
    cacheExpired: false,
    requestId: payload.request_id || null,
    newProductsCount: persistStats.insertedCount,
    updatedProductsCount: persistStats.updatedCount,
    insertedIds: persistStats.insertedIds,
    totalReceived: rawItems.length,
  };
}

export async function refreshMultiPageTikTokShopProducts(params: {
  query: string;
  region?: string;
  maxProducts?: number;
  page?: number;
  collectionCategory?: string | null;
  collectionSubcategory?: string | null;
}): Promise<{
  products: MinedProduct[];
  uniqueProductsCount: number;
  totalReceived?: number;
  totalNormalized?: number;
  rejectedCount?: number;
  newProductsCount: number;
  updatedProductsCount: number;
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

  // Validate maxProducts (permite de 30 até 1200 produtos por expansão)
  let rawMax = Number(params.maxProducts || 90);
  if (!Number.isFinite(rawMax) || rawMax < 30) rawMax = 30;
  if (rawMax > 1200) rawMax = 1200;

  let startPage = 1;
  let maxPages = Math.min(40, Math.max(1, Math.ceil(rawMax / 30)));

  if (params.page && !params.maxProducts) {
    startPage = Math.max(1, Math.min(Number(params.page), 40));
    maxPages = startPage;
  }

  const seenProductIds = new Set<string>();
  const allUniqueProducts: MinedProduct[] = [];
  let pagesConsulted = 0;
  let totalCreditsUsed = 0;
  let totalReceived = 0;
  let totalNormalized = 0;
  let totalRejected = 0;
  let totalNewProducts = 0;
  let totalUpdatedProducts = 0;
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
        collectionCategory: params.collectionCategory || null,
        collectionSubcategory: params.collectionSubcategory || null,
      });

      if (isInfantil && res.products.length > 0) {
        await persistProducts(res.products, 'Infantil').catch(() => {});
      }

      pagesConsulted++;
      totalCreditsUsed += res.creditsUsed;
      const receivedThisPage = res.totalReceived ?? res.products.length;
      totalReceived += receivedThisPage;
      totalNormalized += res.products.length;
      totalRejected += (res.rejectedCount ?? 0);
      totalNewProducts += (res.newProductsCount ?? 0);
      totalUpdatedProducts += (res.updatedProductsCount ?? 0);

      if (res.creditsRemaining !== null) {
        creditsRemaining = res.creditsRemaining;
      }
      hasMore = Boolean(res.hasMore);

      for (const prod of res.products) {
        if (prod.productId && !seenProductIds.has(prod.productId)) {
          seenProductIds.add(prod.productId);
          allUniqueProducts.push(prod);
        }
      }

      console.log(`[MultiPage] Query "${query}" - Página ${p}/${maxPages} processada: recebidos_página=${receivedThisPage}, acumulados_recebidos=${totalReceived}, novos=${res.newProductsCount}, atualizados=${res.updatedProductsCount}, meta=${rawMax}, hasMore=${hasMore}`);

      // Condição 1: Parar se a API retornou 0 itens reais
      if (receivedThisPage === 0) {
        if (!isInfantil) {
          console.log(`[MultiPage] Query "${query}" finalizou na página ${p}: 0 produtos recebidos da API.`);
          break;
        }
      }

      // Condição 2: Parar se a API informar explicitamente que não há mais páginas
      if (!hasMore && !isInfantil) {
        console.log(`[MultiPage] Query "${query}" finalizou na página ${p}: API indicou hasMore=false.`);
        break;
      }

      // Condição 3: Parar se atingir ou ultrapassar a meta solicitada de produtos
      if (totalReceived >= rawMax || allUniqueProducts.length >= rawMax) {
        console.log(`[MultiPage] Query "${query}" atingiu meta de ${rawMax} produtos (acumulados recebidos: ${totalReceived}, únicos: ${allUniqueProducts.length}) na página ${p}.`);
        break;
      }

      // Pequeno intervalo preventivo entre requisições para estabilidade de rate limit
      if (p < maxPages) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } catch (err: any) {
      console.warn(`[MultiPage Collection Partial Failure on page ${p} for query "${query}"]:`, err?.message || err);
      partialError = err?.message || `Falha na página ${p}`;
      if (pagesConsulted === 0) {
        throw err;
      }
      break;
    }
  }

  const finalProducts = await attachAssociatedVideos(allUniqueProducts);

  return {
    products: finalProducts,
    uniqueProductsCount: allUniqueProducts.length,
    totalReceived,
    totalNormalized,
    rejectedCount: totalRejected,
    newProductsCount: totalNewProducts,
    updatedProductsCount: totalUpdatedProducts,
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
  unclassifiedProductsCount?: number;
};

export function classifyProductToCategoryAndSubcategory(product: {
  title?: string;
  category_path?: string;
  query_source?: string;
  seller_name?: string;
}): { category: string; subcategory: string; childCategory: string | null } {
  const res = classifyProductFull(product);
  return {
    category: res.category || 'Não classificado',
    subcategory: res.subcategory || 'Geral',
    childCategory: res.childCategory,
  };
}

export type ReclassificationReport = {
  totalAnalyzed: number;
  totalChanged: number;
  totalMaintained: number;
  totalClassified: number;
  totalUnclassified: number;
  totalWithSubcategory: number;
  totalWithoutSubcategory: number;
  totalWithChildCategory: number;
  totalWithoutChildCategory: number;
  categoryCounts: Record<string, number>;
  subcategoryCounts: Record<string, number>;
  unclassifiedByCategory: Record<string, number>;
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
      totalWithSubcategory: 0,
      totalWithoutSubcategory: 0,
      totalWithChildCategory: 0,
      totalWithoutChildCategory: 0,
      categoryCounts: {},
      subcategoryCounts: {},
      unclassifiedByCategory: {},
      socialCrawlCalled: false,
      creditsConsumed: 0,
    };
  }
  await ensureProductMinerTables();

  const [rows]: any = await db.query(
    `SELECT product_id, title, category_path, query_source, seller_name,
            classified_category, classified_subcategory, classified_child_category, classification_source
     FROM tiktok_shop_products`
  );

  const products = Array.isArray(rows) ? rows : [];
  const categoryCounts: Record<string, number> = {};
  const unclassifiedByCategory: Record<string, number> = {};
  for (const cat of COLLECTOR_CATEGORIES) {
    categoryCounts[cat] = 0;
    unclassifiedByCategory[cat] = 0;
  }

  const subcategoryCounts: Record<string, number> = {};
  let classifiedCount = 0;
  let withSubcategoryCount = 0;
  let withoutSubcategoryCount = 0;
  let withChildCount = 0;
  let withoutChildCount = 0;
  let totalChanged = 0;
  let totalMaintained = 0;

  // Group products by derived classification to execute bulk updates without touching category_path or query_source
  const groupMap = new Map<string, {
    classifiedCat: string | null;
    classifiedSub: string | null;
    classifiedChild: string | null;
    source: string;
    ids: string[];
  }>();

  for (const p of products) {
    const { category, subcategory, childCategory, source } = classifyProductFull(p);

    if (category) {
      classifiedCount++;
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    }

    if (subcategory) {
      withSubcategoryCount++;
      subcategoryCounts[subcategory] = (subcategoryCounts[subcategory] || 0) + 1;
    } else {
      withoutSubcategoryCount++;
      if (category) {
        unclassifiedByCategory[category] = (unclassifiedByCategory[category] || 0) + 1;
      }
    }

    if (childCategory) {
      withChildCount++;
    } else {
      withoutChildCount++;
    }

    const prevCat = p.classified_category || null;
    const prevSub = p.classified_subcategory || null;
    const prevChild = p.classified_child_category || null;
    const prevSource = p.classification_source || null;

    const hasChanged =
      prevCat !== category ||
      prevSub !== subcategory ||
      prevChild !== childCategory ||
      prevSource !== source;

    if (hasChanged) {
      totalChanged++;
      const key = `${category ?? '__NULL__'}|||${subcategory ?? '__NULL__'}|||${childCategory ?? '__NULL__'}|||${source}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          classifiedCat: category,
          classifiedSub: subcategory,
          classifiedChild: childCategory,
          source,
          ids: [],
        });
      }
      groupMap.get(key)!.ids.push(String(p.product_id));
    } else {
      totalMaintained++;
    }
  }

  // Execute bulk updates on derived columns ONLY — NEVER overwrite raw category_path or query_source
  for (const group of groupMap.values()) {
    const { classifiedCat, classifiedSub, classifiedChild, source, ids } = group;
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const placeholders = chunk.map(() => '?').join(',');
      await db.query(
        `UPDATE tiktok_shop_products
         SET classified_category = ?, classified_subcategory = ?, classified_child_category = ?, classification_source = ?
         WHERE product_id IN (${placeholders})`,
        [classifiedCat, classifiedSub, classifiedChild, source, ...chunk]
      );
    }
  }

  return {
    totalAnalyzed: products.length,
    totalChanged,
    totalMaintained,
    totalClassified: classifiedCount,
    totalUnclassified: products.length - classifiedCount,
    totalWithSubcategory: withSubcategoryCount,
    totalWithoutSubcategory: withoutSubcategoryCount,
    totalWithChildCategory: withChildCount,
    totalWithoutChildCategory: withoutChildCount,
    categoryCounts,
    subcategoryCounts,
    unclassifiedByCategory,
    socialCrawlCalled: false,
    creditsConsumed: 0,
  };
}

export async function getCollectorCategoriesStats(): Promise<{
  categories: CollectorCategoryStat[];
  totalStoredProducts: number;
}> {
  if (!isDatabaseConfigured()) {
    const fallbackCategories = COLLECTOR_CATEGORIES.map((cat) => {
      const subs = OFFICIAL_TIKTOK_TAXONOMY[cat] || [];
      return {
        category: cat,
        productCount: 0,
        lastCollectedAt: null,
        status: 'Pendente' as const,
        subcategories: subs.map((sub) => ({ subcategory: sub, productCount: 0, isLowBase: true })),
        coverageCount: 0,
        totalSubcategories: subs.length,
        unclassifiedProductsCount: 0,
      };
    });
    return { categories: fallbackCategories, totalStoredProducts: 0 };
  }

  await ensureProductMinerTables();

  let totalStoredProducts = 0;
  let rows: any[] = [];

  try {
    const [pRows]: any = await db.query(
      `SELECT product_id, title, category_path, query_source, last_seen_at, updated_at
       FROM tiktok_shop_products`
    );
    if (Array.isArray(pRows)) {
      rows = pRows;
      totalStoredProducts = rows.length;
    }
  } catch (err: any) {
    console.warn('[getCollectorCategoriesStats SQL Query Error]:', err?.message || err);
  }

  // Aggregate counts with strict single-winner classification per product
  const categoryProductsMap: Record<string, number> = {};
  const subcategoryProductsMap: Record<string, Record<string, number>> = {};
  const unclassifiedProductsMap: Record<string, number> = {};
  const lastSeenMap: Record<string, string | null> = {};

  for (const cat of COLLECTOR_CATEGORIES) {
    categoryProductsMap[cat] = 0;
    subcategoryProductsMap[cat] = {};
    unclassifiedProductsMap[cat] = 0;
    for (const sub of OFFICIAL_TIKTOK_TAXONOMY[cat] || []) {
      subcategoryProductsMap[cat][sub] = 0;
    }
  }

  for (const p of rows) {
    const { category, subcategory } = classifyProductFull(p);

    if (category && categoryProductsMap[category] !== undefined) {
      categoryProductsMap[category]++;

      const maxDate = p.last_seen_at || p.updated_at;
      if (maxDate) {
        const iso = new Date(maxDate).toISOString();
        if (!lastSeenMap[category] || iso > lastSeenMap[category]!) {
          lastSeenMap[category] = iso;
        }
      }

      if (subcategory && subcategoryProductsMap[category][subcategory] !== undefined) {
        subcategoryProductsMap[category][subcategory]++;
      } else {
        unclassifiedProductsMap[category]++;
      }
    }
  }

  // 3. Assemble stats strictly for each of the 26 OFFICIAL COLLECTOR CATEGORIES
  const statsList: CollectorCategoryStat[] = [];

  for (const cat of COLLECTOR_CATEGORIES) {
    const subNames = OFFICIAL_TIKTOK_TAXONOMY[cat] || [];
    const productCount = categoryProductsMap[cat] || 0;
    const catSubMap = subcategoryProductsMap[cat] || {};
    const unclassifiedCount = unclassifiedProductsMap[cat] || 0;

    let coveredCount = 0;
    const subStats: CollectorSubcategoryStat[] = subNames.map((subName) => {
      const subCount = catSubMap[subName] || 0;
      if (subCount > 0) {
        coveredCount++;
      }

      return {
        subcategory: subName,
        productCount: subCount,
        isLowBase: subCount < 15,
      };
    });

    const lastCollectedAt = lastSeenMap[cat] || null;

    statsList.push({
      category: cat,
      productCount,
      lastCollectedAt,
      status: productCount > 0 ? 'Ativa' : 'Pendente',
      subcategories: subStats,
      coverageCount: coveredCount,
      totalSubcategories: subNames.length,
      unclassifiedProductsCount: unclassifiedCount,
    });
  }

  return { categories: statsList, totalStoredProducts };
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
