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
  sellerId: string | null;
  sellerName: string | null;
  productUrl: string | null;
  category: string | null;
  classifiedCategory?: string | null;
  classifiedSubcategory?: string | null;
  classifiedChildCategory?: string | null;
  classificationSource?: string | null;
  description?: string | null;
  productDescription?: string | null;
  variants?: any;
  lastSeenAt?: string | null;
  estimatedCommissionCents?: number | null;
  commissionRatePercent?: number | null;
  video: ProductMinerVideo | null;
  associatedVideos?: ProductMinerVideo[];
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

export class ProductMinerApiError extends Error {
  code?: string;
  status?: number;
  stage?: string;
  data?: any;

  constructor(message: string, code?: string, status?: number, data?: any, stage?: string) {
    super(message);
    this.name = 'ProductMinerApiError';
    this.code = code;
    this.status = status;
    this.stage = stage || data?.stage;
    this.data = data;
  }
}

function authHeaders(studentCode: string): HeadersInit {
  return {
    'x-student-access-code': studentCode,
    'Accept': 'application/json',
  };
}

function accessError(data: any, status?: number): ProductMinerApiError {
  const code = String(data?.code || data?.error || '');
  const stage = data?.stage ? String(data.stage) : undefined;

  // Erros específicos de Expansão e Banco de Dados
  if (code === 'DATABASE_NOT_CONFIGURED') {
    return new ProductMinerApiError('Banco de dados MySQL não está configurado no servidor (DATABASE_NOT_CONFIGURED).', code, status, data, stage);
  }
  if (code === 'EXPANSION_JOB_PERSISTENCE_FAILED') {
    return new ProductMinerApiError('Falha crítica: o job não foi persistido no banco MySQL (EXPANSION_JOB_PERSISTENCE_FAILED).', code, status, data, stage);
  }
  if (code === 'ECONNRESET' || String(data?.message || data?.error || '').includes('ECONNRESET')) {
    return new ProductMinerApiError(typeof data?.message === 'string' && data.message ? data.message : 'Conexão com o banco de dados reiniciada inesperadamente (ECONNRESET).', 'ECONNRESET', status || 500, data, stage);
  }
  if (code === 'JOB_NOT_FOUND' || status === 404) {
    return new ProductMinerApiError(typeof data?.message === 'string' && data.message ? data.message : 'Job de expansão não encontrado no banco de dados (JOB_NOT_FOUND).', 'JOB_NOT_FOUND', status || 404, data, stage);
  }
  if (code === 'STEP_IN_PROGRESS' || status === 409) {
    return new ProductMinerApiError(typeof data?.message === 'string' && data.message ? data.message : 'Já existe um passo deste job em execução.', 'STEP_IN_PROGRESS', status || 409, data, stage);
  }
  if (code === 'STATS_INITIALIZATION_FAILED') {
    return new ProductMinerApiError(typeof data?.message === 'string' && data.message ? data.message : 'Falha ao obter estatísticas das categorias no banco de dados.', code, status, data, stage);
  }
  if (code === 'START_JOB_ERROR') {
    return new ProductMinerApiError(typeof data?.message === 'string' && data.message ? data.message : 'Erro ao inicializar job de expansão no servidor (START_JOB_ERROR).', code, status, data, stage);
  }

  // Erros específicos de Transcrição e Modelagem
  if (code === 'AUDIO_UNAVAILABLE') {
    return new ProductMinerApiError(typeof data?.message === 'string' && data.message ? data.message : 'Não foi possível acessar o áudio deste vídeo.', code, status, data, stage);
  }
  if (code === 'TRANSCRIPTION_ERROR') {
    return new ProductMinerApiError(typeof data?.message === 'string' && data.message ? data.message : 'Não foi possível transcrever o áudio deste vídeo. Tente novamente.', code, status, data, stage);
  }
  if (code === 'TRANSCRIPTION_INTERNAL_ERROR') {
    return new ProductMinerApiError(typeof data?.message === 'string' && data.message ? data.message : 'Não foi possível processar a transcrição neste momento.', code, status, data, stage);
  }
  if (code === 'MISSING_TRANSCRIPTION') {
    return new ProductMinerApiError(typeof data?.message === 'string' && data.message ? data.message : 'É necessário gerar uma transcrição válida antes de modelar o conteúdo.', code, status, data, stage);
  }
  if (code === 'MODEL_CONTENT_ERROR') {
    return new ProductMinerApiError(typeof data?.message === 'string' && data.message ? data.message : 'Não foi possível gerar a modelagem deste conteúdo. Tente novamente.', code, status, data, stage);
  }
  if (code === 'MODEL_CONTENT_INTERNAL_ERROR') {
    return new ProductMinerApiError(typeof data?.message === 'string' && data.message ? data.message : 'Não foi possível processar a modelagem neste momento.', code, status, data, stage);
  }

  // Erros de permissão e configurações gerais
  if (code === 'PRODUCT_MINER_STUDENTS_DISABLED') {
    return new ProductMinerApiError('O Minerador de Produtos ainda não foi liberado para alunos.', code, status, data, stage);
  }
  if (code === 'PRODUCT_MINER_REFRESH_MENTOR_ONLY') {
    return new ProductMinerApiError('Somente o Mentor pode atualizar dados da SocialCrawl.', code, status, data, stage);
  }
  if (code === 'SOCIALCRAWL_NOT_CONFIGURED') {
    return new ProductMinerApiError('SocialCrawl ainda não foi configurada no servidor.', code, status, data, stage);
  }
  if (code === 'AUTH_REQUIRED' || code === 'ACCESS_DENIED') {
    return new ProductMinerApiError('Sua sessão não tem acesso ao minerador.', code, status, data, stage);
  }
  if (code === 'PRODUCT_MINER_RANKING_ERROR') {
    return new ProductMinerApiError('Não foi possível carregar o ranking no momento. Tente novamente.', code, status, data, stage);
  }
  if (code === 'PRODUCT_MINER_SEARCH_ERROR') {
    return new ProductMinerApiError('Não foi possível realizar a busca de produtos no momento.', code, status, data, stage);
  }
  if (code === 'PRODUCT_MINER_COLLECTOR_STATS_ERROR') {
    return new ProductMinerApiError('Não foi possível carregar as estatísticas do coletor.', code, status, data, stage);
  }
  if (data?.message && typeof data.message === 'string') {
    return new ProductMinerApiError(data.message, code || 'API_ERROR', status, data, stage);
  }
  if (data?.detail && typeof data.detail === 'string') {
    return new ProductMinerApiError(data.detail, code || 'API_ERROR', status, data, stage);
  }
  if (data?.error && typeof data.error === 'string' && !data.error.includes('_ERROR')) {
    return new ProductMinerApiError(data.error, code || 'API_ERROR', status, data, stage);
  }
  return new ProductMinerApiError('Falha no Minerador de Produtos. Tente novamente em alguns instantes.', code || 'API_ERROR', status, data, stage);
}

export async function getProductMinerAccess(studentCode: string): Promise<ProductMinerAccess> {
  const response = await fetch('/api/product-miner/access', { headers: authHeaders(studentCode) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  return { enabled: Boolean(data.enabled), canRefresh: Boolean(data.canRefresh), role: data.role === 'mentor' ? 'mentor' : 'student' };
}

// Free: reads only our own database/cache.
export async function searchProducts(
  studentCode: string,
  query: string,
  page = 1,
  category?: string,
  subcategory?: string,
  childCategory?: string,
  classification?: string | null,
  hasVideoOnly?: boolean,
  minVideoViews?: number | null,
  maxVideoViews?: number | null,
  videoViewRange?: string | null
): Promise<ProductSearchResponse> {
  const params = new URLSearchParams({ query, page: String(page) });
  if (category && category !== 'Todos' && category !== 'Todas') params.set('category', category);
  if (subcategory && subcategory !== 'Todas' && subcategory !== 'Todos') params.set('subcategory', subcategory);
  if (childCategory && childCategory !== 'Todas' && childCategory !== 'Todos') params.set('childCategory', childCategory);
  if (classification) params.set('classification', classification);
  if (hasVideoOnly) params.set('hasVideoOnly', 'true');
  if (minVideoViews !== undefined && minVideoViews !== null && minVideoViews >= 0) {
    params.set('minVideoViews', String(minVideoViews));
    params.set('videoViewsMin', String(minVideoViews));
  }
  if (maxVideoViews !== undefined && maxVideoViews !== null && maxVideoViews >= 0) {
    params.set('maxVideoViews', String(maxVideoViews));
    params.set('videoViewsMax', String(maxVideoViews));
  }
  if (videoViewRange) {
    params.set('videoViewRange', videoViewRange);
  }

  const response = await fetch(`/api/product-miner/search?${params.toString()}`, {
    headers: authHeaders(studentCode),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  return data as ProductSearchResponse;
}

export interface CollectorRefreshResponse extends ProductSearchResponse {
  uniqueProductsCount?: number;
  totalReceived?: number;
  totalNormalized?: number;
  rejectedCount?: number;
  newProductsCount?: number;
  updatedProductsCount?: number;
  pagesConsulted?: number;
  category?: string;
  timestamp?: string;
  partialError?: string | null;
}

// Paid: explicit mentor-only SocialCrawl refresh.
export async function refreshProducts(
  studentCode: string,
  query: string,
  maxProductsOrPage: number = 90,
  collectionCategory?: string | null,
  collectionSubcategory?: string | null
): Promise<CollectorRefreshResponse> {
  const isMultiPageRequest = maxProductsOrPage >= 30;
  const body: any = isMultiPageRequest
    ? { query, maxProducts: maxProductsOrPage }
    : { query, page: maxProductsOrPage };

  if (collectionCategory) body.collectionCategory = collectionCategory;
  if (collectionSubcategory) body.collectionSubcategory = collectionSubcategory;

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

export interface CollectorSubcategoryStat {
  subcategory: string;
  productCount: number;
  isLowBase: boolean;
}

export interface CollectorCategoryStat {
  category: string;
  productCount: number;
  lastCollectedAt: string | null;
  status: 'Ativa' | 'Pendente';
  subcategories?: CollectorSubcategoryStat[];
  coverageCount?: number;
  totalSubcategories?: number;
}

export interface CollectorCategoriesResponse {
  categories: CollectorCategoryStat[];
  totalStoredProducts: number;
}

export async function fetchCollectorCategories(studentCode: string): Promise<CollectorCategoriesResponse> {
  const response = await fetch('/api/product-miner/collector/categories', {
    headers: authHeaders(studentCode),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  const categories = (
    Array.isArray(data.categories)
      ? data.categories
      : Array.isArray(data)
      ? data
      : []
  ) as CollectorCategoryStat[];
  const totalStoredProducts =
    typeof data.totalStoredProducts === 'number'
      ? data.totalStoredProducts
      : Number(data.totalStoredProducts) || categories.reduce((sum, c) => sum + (c.productCount || 0), 0);
  return { categories, totalStoredProducts };
}

export interface DailyRefreshStatus {
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
}

export async function fetchDailyRefreshStatus(studentCode: string): Promise<DailyRefreshStatus | null> {
  const response = await fetch('/api/product-miner/collector/daily-status', {
    headers: authHeaders(studentCode),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  return (data.status || null) as DailyRefreshStatus | null;
}

export async function runDailyRefresh(studentCode: string, force?: boolean): Promise<DailyRefreshStatus> {
  const response = await fetch('/api/product-miner/collector/daily-refresh', {
    method: 'POST',
    headers: {
      ...authHeaders(studentCode),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ force: Boolean(force) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  return data.status as DailyRefreshStatus;
}

export async function loadProductRanking(
  studentCode: string,
  limit = 50,
  sort: ProductRankingSort = 'opportunities',
  retryCount = 1
): Promise<{ success: true; products: ProductMinerProduct[]; meta: ProductRankingMeta }> {
  const params = new URLSearchParams({ limit: String(limit), sort });

  try {
    const response = await fetch(`/api/product-miner/ranking?${params.toString()}`, {
      headers: authHeaders(studentCode),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status >= 500 && retryCount > 0) {
        console.warn(`[loadProductRanking] Status ${response.status}. Tentando novamente (tentativa ${retryCount})...`);
        await new Promise((resolve) => setTimeout(resolve, 800));
        return loadProductRanking(studentCode, limit, sort, retryCount - 1);
      }
      throw accessError(data);
    }

    return data as { success: true; products: ProductMinerProduct[]; meta: ProductRankingMeta };
  } catch (err: any) {
    if (retryCount > 0 && err?.name !== 'AbortError' && !err?.message?.includes('liberado') && !err?.message?.includes('sessão')) {
      console.warn(`[loadProductRanking] Erro na requisição. Tentando novamente (tentativa ${retryCount})...`);
      await new Promise((resolve) => setTimeout(resolve, 800));
      return loadProductRanking(studentCode, limit, sort, retryCount - 1);
    }
    throw err;
  }
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

export async function fetchVideoPlaybackToken(
  studentCode: string,
  productId: string,
  videoId?: string
): Promise<{ success: boolean; token?: string; streamUrl?: string; expiresAt?: number; error?: string; message?: string }> {
  const response = await fetch('/api/product-miner/videos/playback-token', {
    method: 'POST',
    headers: {
      ...authHeaders(studentCode),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ productId, videoId }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  return data;
}

export async function prepareProductVideoDownload(
  studentCode: string,
  productId: string,
  videoId?: string
): Promise<{ success: boolean; prepared?: boolean; directMediaUrl?: string; error?: string; message?: string }> {
  const response = await fetch('/api/product-miner/videos/prepare-download', {
    method: 'POST',
    headers: {
      ...authHeaders(studentCode),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ productId, videoId }),
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

export async function runBaseReclassification(studentCode: string): Promise<ReclassificationReport> {
  const response = await fetch('/api/product-miner/admin/reclassify', {
    method: 'POST',
    headers: authHeaders(studentCode),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    const message = data?.message || 'Não foi possível concluir a organização da base. Tente novamente em alguns instantes.';
    const err = new Error(message);
    (err as any).code = data?.error || 'RECLASSIFY_FAILED';
    throw err;
  }
  return data.report as ReclassificationReport;
}

export interface TrackInteractionParams {
  productId: string;
  eventType: 'product_open' | 'product_click' | 'video_play';
  query?: string;
  category?: string;
  subcategory?: string;
  childCategory?: string;
}

export async function trackProductInteraction(
  studentCode: string,
  params: TrackInteractionParams
): Promise<void> {
  if (!params.productId) return;
  try {
    await fetch('/api/product-miner/track-interaction', {
      method: 'POST',
      headers: {
        ...authHeaders(studentCode),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
  } catch (err) {
    console.warn('[trackProductInteraction Error]', err);
  }
}

export interface SubcategoryTargetPlan {
  category: string;
  subcategory: string;
  currentCount: number;
  isZeroCount: boolean;
  priorityRank: number;
  allocatedTarget: number;
  estimatedPages: number;
}

export interface CategoryHistoryStatApi {
  category: string;
  sampleCount: number;
  historicalValidPerCredit: number | null;
  minEstimatedYield?: number;
  maxEstimatedYield?: number;
  averageGrowth: number;
  averageCredits: number;
  lastExecutionDate: string | null;
}

export interface CategoryExpansionPlan {
  category: string;
  currentProductCount: number;
  categoryTargetLimit: number;
  remainingTarget: number;
  totalAllocated: number;
  projectedFinalCount: number;
  unallocatedGap: number;
  estimatedCredits: number;
  minEstimatedCredits: number;
  maxEstimatedCredits: number;
  hasHistoricalData: boolean;
  historicalValidPerCredit?: number;
  sampleCount: number;
  subcategories: SubcategoryTargetPlan[];
}

export interface ExpansionPlanResponse {
  success: boolean;
  readOnly: boolean;
  meta: {
    totalCategories: number;
    totalSubcategories: number;
    zeroCountSubcategories: number;
    totalAllocatedProducts: number;
    totalEstimatedCredits: number;
    totalMinEstimatedCredits?: number;
    totalMaxEstimatedCredits?: number;
    hasHistoricalDataCount?: number;
    categoryTargetLimit: number;
    perSubcategoryMax: number;
  };
  historyMap?: Record<string, CategoryHistoryStatApi>;
  plans: CategoryExpansionPlan[];
}

export async function fetchCategoryExecutionHistory(
  studentCode: string,
  categories?: string[]
): Promise<Record<string, CategoryHistoryStatApi>> {
  const params = new URLSearchParams();
  if (categories && categories.length > 0) {
    params.set('categories', categories.join(','));
  }
  const response = await fetch(`/api/product-miner/admin/category-execution-history?${params.toString()}`, {
    headers: authHeaders(studentCode),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  return data.historyMap || {};
}

export async function fetchSubcategoryExpansionPlan(
  studentCode: string,
  categoryTargetLimit = 500,
  perSubcategoryMax = 60,
  categories?: string[]
): Promise<ExpansionPlanResponse> {
  const params = new URLSearchParams({
    categoryTargetLimit: String(categoryTargetLimit),
    perSubcategoryMax: String(perSubcategoryMax),
  });
  if (categories && categories.length > 0) {
    params.set('categories', categories.join(','));
  }

  const response = await fetch(`/api/product-miner/admin/expansion-plan-readonly?${params.toString()}`, {
    headers: authHeaders(studentCode),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  return data as ExpansionPlanResponse;
}

/**
 * Calcula localmente o plano de expansão com base nas estatísticas das categorias e no histórico de eficiência real:
 * 
 * Se houver histórico:
 * baseEstimate = remainingTarget / historicalValidPerCredit
 * estimatedCredits = Math.ceil(baseEstimate * 1.15) (15% margem de segurança)
 * minEstimatedCredits = Math.max(1, Math.round(baseEstimate * 0.9))
 * maxEstimatedCredits = Math.max(minEstimatedCredits, Math.ceil(baseEstimate * 1.25))
 * 
 * Se não houver histórico:
 * Fallback para estimativa teórica por páginas
 * 
 * Zero créditos para categorias já na meta ou acima (remainingTarget <= 0).
 */
export function calculateExpansionPlanFromStats(params: {
  categoryStats: CollectorCategoryStat[];
  selectedCategories: string[];
  categoryTargetLimit: number;
  perSubcategoryMax?: number;
  taxonomyConfig?: Record<string, string[]>;
  selectedSubcategoriesMap?: Record<string, string[]>;
  historyMap?: Record<string, CategoryHistoryStatApi>;
}): CategoryExpansionPlan[] {
  const {
    categoryStats,
    selectedCategories,
    categoryTargetLimit,
    perSubcategoryMax = 60,
    taxonomyConfig,
    selectedSubcategoriesMap,
    historyMap,
  } = params;

  if (!selectedCategories || selectedCategories.length === 0) {
    return [];
  }

  const plans: CategoryExpansionPlan[] = [];

  for (const catName of selectedCategories) {
    const catStat = categoryStats.find((c) => c.category === catName);
    const currentProductCount = catStat?.productCount || 0;
    
    // Obter lista oficial de subcategorias
    let officialSubs: string[] = [];
    if (taxonomyConfig && taxonomyConfig[catName]) {
      officialSubs = taxonomyConfig[catName].filter((s) => s !== 'Todas');
    } else if (catStat?.subcategories && catStat.subcategories.length > 0) {
      officialSubs = catStat.subcategories
        .map((s) => s.subcategory)
        .filter((s) => s !== 'Todas');
    }

    if (selectedSubcategoriesMap && Object.prototype.hasOwnProperty.call(selectedSubcategoriesMap, catName)) {
      const allowed = selectedSubcategoriesMap[catName];
      if (Array.isArray(allowed)) {
        const allowedSubs = new Set(allowed.filter((s) => s !== 'Todas'));
        officialSubs = officialSubs.filter((s) => allowedSubs.has(s));
      }
    }

    const remainingTarget = Math.max(0, categoryTargetLimit - currentProductCount);

    const subCountMap = new Map<string, number>();
    if (catStat?.subcategories) {
      for (const s of catStat.subcategories) {
        if (s.subcategory !== 'Todas') {
          subCountMap.set(s.subcategory, s.productCount || (s as any).count || 0);
        }
      }
    }

    const rawSubList = officialSubs.map((sub) => {
      const currentCount = subCountMap.get(sub) || 0;
      return {
        category: catName,
        subcategory: sub,
        currentCount,
        isZeroCount: currentCount === 0,
      };
    });

    // Ordenação estrita por prioridade:
    // 1º: isZeroCount === true
    // 2º: currentCount ASC
    // 3º: nome da subcategoria ASC
    rawSubList.sort((a, b) => {
      if (a.isZeroCount !== b.isZeroCount) {
        return a.isZeroCount ? -1 : 1;
      }
      if (a.currentCount !== b.currentCount) {
        return a.currentCount - b.currentCount;
      }
      return a.subcategory.localeCompare(b.subcategory, 'pt-BR');
    });

    let remainingBudget = remainingTarget;
    let rank = 1;
    const subPlans: SubcategoryTargetPlan[] = [];

    for (const subItem of rawSubList) {
      if (remainingBudget <= 0) {
        subPlans.push({
          category: catName,
          subcategory: subItem.subcategory,
          currentCount: subItem.currentCount,
          isZeroCount: subItem.isZeroCount,
          priorityRank: rank++,
          allocatedTarget: 0,
          estimatedPages: 0,
        });
        continue;
      }

      const allocated = Math.min(perSubcategoryMax, remainingBudget);
      const estimatedPages = allocated > 0 ? Math.max(1, Math.ceil(allocated / 30)) : 0;
      remainingBudget -= allocated;

      subPlans.push({
        category: catName,
        subcategory: subItem.subcategory,
        currentCount: subItem.currentCount,
        isZeroCount: subItem.isZeroCount,
        priorityRank: rank++,
        allocatedTarget: allocated,
        estimatedPages,
      });
    }

    const totalAllocated = subPlans.reduce((sum, s) => sum + s.allocatedTarget, 0);
    const projectedFinalCount = currentProductCount + totalAllocated;
    const unallocatedGap = Math.max(0, remainingTarget - totalAllocated);
    const theoreticalCredits = subPlans.reduce((sum, s) => sum + s.estimatedPages, 0);

    const catHistory = historyMap?.[catName];
    const hasHistoricalData = Boolean(
      catHistory &&
      catHistory.sampleCount > 0 &&
      catHistory.historicalValidPerCredit !== null &&
      catHistory.historicalValidPerCredit !== undefined &&
      catHistory.historicalValidPerCredit > 0
    );

    let estimatedCredits = theoreticalCredits;
    let minEstimatedCredits = theoreticalCredits;
    let maxEstimatedCredits = theoreticalCredits;
    let historicalValidPerCredit: number | undefined = undefined;
    let sampleCount = 0;

    if (remainingTarget === 0) {
      estimatedCredits = 0;
      minEstimatedCredits = 0;
      maxEstimatedCredits = 0;
    } else if (hasHistoricalData && catHistory?.historicalValidPerCredit && catHistory.historicalValidPerCredit > 0) {
      const yieldRate = catHistory.historicalValidPerCredit;
      const baseEstimate = remainingTarget / yieldRate;
      estimatedCredits = Math.ceil(baseEstimate * 1.15); // 15% margem de segurança
      minEstimatedCredits = Math.max(1, Math.round(baseEstimate * 0.9));
      maxEstimatedCredits = Math.max(minEstimatedCredits, Math.ceil(baseEstimate * 1.25));
      historicalValidPerCredit = Number(catHistory.historicalValidPerCredit.toFixed(2));
      sampleCount = catHistory.sampleCount;
    }

    plans.push({
      category: catName,
      currentProductCount,
      categoryTargetLimit,
      remainingTarget,
      totalAllocated,
      projectedFinalCount,
      unallocatedGap,
      estimatedCredits,
      minEstimatedCredits,
      maxEstimatedCredits,
      hasHistoricalData,
      historicalValidPerCredit,
      sampleCount,
      subcategories: subPlans,
    });
  }

  return plans;
}

export interface CategoryExecutionSummaryApi {
  category: string;
  initialValidCount: number;
  finalValidCount: number;
  actualValidGrowth?: number;
  categoryTargetLimit: number;
  validNewProductsForTarget: number;
  offTargetProducts: number;
  unclassifiedProducts: number;
  updatedProducts: number;
  totalReceived: number;
  creditsUsed: number;
  requestsMade?: number;
  pagesProcessed?: number;
  totalSelectedSubcategories?: number;
  subcategoriesConsulted: number;
  subcategoriesExhausted?: number;
  coverageBefore?: number;
  coverageAfter?: number;
  technicalErrors?: number;
  subcategoriesFailed?: number;
  executionId?: string;
  stopReason:
    | 'TARGET_REACHED'
    | 'NO_MORE_RESULTS'
    | 'NO_VALID_RESULTS'
    | 'ALL_SUBCATEGORIES_EXHAUSTED'
    | 'PARTIAL_ERROR'
    | 'API_BALANCE_ERROR'
    | 'API_AUTH_ERROR'
    | 'CANCELLED'
    | 'FAILED';
}

export interface SubcategoryBatchProgressApi {
  currentCategory: string;
  currentSubcategory: string;
  currentPage: number;
  maxPagesForThisSub: number;
  categoryIndex: number;
  totalCategories: number;
  subcategoryIndex: number;
  totalSubcategoriesInCategory: number;

  categoryTargetLimit: number;
  initialValidCount?: number;
  currentValidTargetCount: number;
  remainingNeeded: number;
  validNewProductsForTarget: number;
  offTargetProducts: number;
  unclassifiedProducts: number;
  catUpdatedCount: number;
  catTotalReceived: number;
  categoryCreditsUsed: number;
  categoryCreditLimit: number;
  categoryRequestsMade?: number;
  categoryPagesProcessed?: number;

  stepStatus: string;

  totalReceived: number;
  totalNewProducts: number;
  totalUpdatedProducts: number;
  totalCreditsUsed: number;
  totalRequestsMade?: number;
  totalPagesProcessed?: number;
  isCompleted: boolean;
  stopReason?: string;
}

export interface SubcategoryExpansionResultApi {
  success: boolean;
  totalProcessed: number;
  totalUnique: number;
  totalNew: number;
  totalUpdated: number;
  totalValidNewForTarget: number;
  totalOffTarget: number;
  totalUnclassified: number;
  totalCreditsUsed: number;
  totalRequestsMade?: number;
  totalPagesProcessed?: number;
  categoriesCompleted: number;
  totalSelectedSubcategories?: number;
  subcategoriesConsulted: number;
  subcategoriesExhausted?: number;
  subcategoriesCoverageBefore: number;
  subcategoriesCoverageAfter: number;
  categorySummaries?: CategoryExecutionSummaryApi[];
  plans: CategoryExpansionPlan[];
  errors: string[];
}

/**
 * Calcula o percentual real da barra de progresso da categoria ativa.
 * Baseado no crescimento confirmado em direção à meta da categoria (initial -> current -> target).
 * Ex: Initial=136, Target=300 (Déficit=164). Se Current=218 (Crescimento=82) -> 82/164 = 50%.
 * Se remainingNeeded <= 0 ou stopReason === 'TARGET_REACHED': 100%.
 */
export function calculateCategoryProgressPercent(params: {
  currentValidTargetCount?: number;
  initialValidCount?: number;
  categoryTargetLimit?: number;
  remainingNeeded?: number;
  validNewProductsForTarget?: number;
  isTargetReached?: boolean;
  stopReason?: string;
  creditsUsed?: number;
  creditLimit?: number;
}): number {
  if (params.isTargetReached || params.stopReason === 'TARGET_REACHED') {
    return 100;
  }
  if (params.remainingNeeded !== undefined && params.remainingNeeded <= 0) {
    return 100;
  }

  const target = params.categoryTargetLimit || 300;
  const initial = params.initialValidCount !== undefined ? params.initialValidCount : 0;
  const current = params.currentValidTargetCount !== undefined
    ? params.currentValidTargetCount
    : initial + (params.validNewProductsForTarget || 0);

  const initialDeficit = Math.max(0, target - initial);
  if (initialDeficit <= 0 || current >= target) {
    return 100;
  }

  const confirmedGrowth = Math.max(0, current - initial);
  const raw = (confirmedGrowth / initialDeficit) * 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export async function executeSubcategoryExpansionStreamApi(
  studentCode: string,
  payload: {
    selectedCategories?: string[];
    selectedSubcategoriesMap?: Record<string, string[]>;
    categoryTargetLimit?: number;
    perSubcategoryMax?: number;
    maxCreditBudgetPerCategory?: number;
  },
  onProgress?: (progress: SubcategoryBatchProgressApi) => void
): Promise<SubcategoryExpansionResultApi> {
  const response = await fetch('/api/product-miner/admin/execute-subcategory-expansion-stream', {
    method: 'POST',
    headers: {
      ...authHeaders(studentCode),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw accessError(data);
  }

  if (!response.body) {
    throw new Error('Streaming não suportado pelo navegador.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let finalResult: SubcategoryExpansionResultApi | null = null;
  let lastProgress: SubcategoryBatchProgressApi | null = null;
  let executionId: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith(':')) {
        // SSE Comment / Ping keep-alive - ignorar
        continue;
      }
      if (trimmed.startsWith('data: ')) {
        const jsonStr = trimmed.slice(6).trim();
        if (jsonStr) {
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'INIT' && parsed.executionId) {
              executionId = parsed.executionId;
            } else if (parsed.type === 'PROGRESS' && parsed.progress) {
              if (parsed.executionId) executionId = parsed.executionId;
              lastProgress = parsed.progress;
              if (onProgress) onProgress(parsed.progress);
            } else if ((parsed.type === 'COMPLETE' || parsed.type === 'DONE') && parsed.result) {
              if (parsed.executionId) executionId = parsed.executionId;
              finalResult = parsed.result;
            } else if (parsed.type === 'ERROR') {
              throw new Error(parsed.error || 'Erro na expansão');
            }
          } catch (e: any) {
            if (e.message && e.message !== 'Unexpected end of JSON input') {
              throw e;
            }
          }
        }
      }
    }
  }

  if (buffer.trim()) {
    const remainingLines = buffer.split('\n');
    for (const line of remainingLines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        const jsonStr = trimmed.slice(6).trim();
        if (jsonStr) {
          try {
            const parsed = JSON.parse(jsonStr);
            if ((parsed.type === 'COMPLETE' || parsed.type === 'DONE') && parsed.result) {
              finalResult = parsed.result;
            }
          } catch {
            // ignore
          }
        }
      }
    }
  }

  // FALLBACK DE SEGURANÇA RESILIENTE: Se a conexão SSE fechou sem o evento COMPLETE
  // (ex: timeout de proxy intermediário ou queda de conexão durante execução longa),
  // primeiro tentamos recuperar o resultado do Job no MySQL usando o executionId
  if (!finalResult && executionId) {
    try {
      const jobStatus = await getExpansionJobStatusApi(studentCode, executionId);
      if (jobStatus && jobStatus.job?.result) {
        finalResult = jobStatus.job.result;
      }
    } catch {
      // continua para fallback de contagem direta
    }
  }

  // Se ainda assim não recuperou o resultado consolidado, consulta o banco MySQL diretamente
  if (!finalResult) {
    try {
      const freshStats = await fetchCollectorCategories(studentCode);
      const catName = payload.selectedCategories?.[0] || 'Categoria';
      const targetLimit = payload.categoryTargetLimit || 300;
      const initialCount = lastProgress?.initialValidCount || 0;
      const catStat = freshStats.categories.find((c) => c.category === catName);
      const finalCount = catStat?.productCount || (lastProgress?.currentValidTargetCount ?? initialCount);
      const growth = Math.max(0, finalCount - initialCount);

      finalResult = {
        success: true,
        totalProcessed: lastProgress?.totalReceived || lastProgress?.catTotalReceived || 0,
        totalUnique: lastProgress?.totalNewProducts || (lastProgress?.validNewProductsForTarget || 0),
        totalNew: lastProgress?.totalNewProducts || (lastProgress?.validNewProductsForTarget || 0),
        totalUpdated: lastProgress?.totalUpdatedProducts || lastProgress?.catUpdatedCount || 0,
        totalValidNewForTarget: growth > 0 ? growth : (lastProgress?.validNewProductsForTarget || 0),
        totalOffTarget: lastProgress?.offTargetProducts || 0,
        totalUnclassified: lastProgress?.unclassifiedProducts || 0,
        totalCreditsUsed: lastProgress?.totalCreditsUsed || lastProgress?.categoryCreditsUsed || 0,
        totalRequestsMade: lastProgress?.totalRequestsMade || lastProgress?.categoryRequestsMade || 0,
        totalPagesProcessed: lastProgress?.totalPagesProcessed || lastProgress?.categoryPagesProcessed || 0,
        categoriesCompleted: 1,
        totalSelectedSubcategories: lastProgress?.totalSubcategoriesInCategory || 10,
        subcategoriesConsulted: lastProgress?.subcategoryIndex || lastProgress?.totalSubcategoriesInCategory || 10,
        subcategoriesExhausted: lastProgress?.subcategoryIndex || 0,
        subcategoriesCoverageBefore: 0,
        subcategoriesCoverageAfter: catStat?.coverageCount || 0,
        plans: [],
        errors: [],
        categorySummaries: [
          {
            category: catName,
            initialValidCount: initialCount,
            finalValidCount: finalCount,
            actualValidGrowth: growth,
            categoryTargetLimit: targetLimit,
            validNewProductsForTarget: growth > 0 ? growth : (lastProgress?.validNewProductsForTarget || 0),
            offTargetProducts: lastProgress?.offTargetProducts || 0,
            unclassifiedProducts: lastProgress?.unclassifiedProducts || 0,
            updatedProducts: lastProgress?.catUpdatedCount || 0,
            totalReceived: lastProgress?.catTotalReceived || lastProgress?.totalReceived || 0,
            creditsUsed: lastProgress?.categoryCreditsUsed || lastProgress?.totalCreditsUsed || 0,
            requestsMade: lastProgress?.categoryRequestsMade || lastProgress?.totalRequestsMade || 0,
            pagesProcessed: lastProgress?.categoryPagesProcessed || lastProgress?.totalPagesProcessed || 0,
            totalSelectedSubcategories: lastProgress?.totalSubcategoriesInCategory || 10,
            subcategoriesConsulted: lastProgress?.subcategoryIndex || lastProgress?.totalSubcategoriesInCategory || 10,
            subcategoriesExhausted: lastProgress?.subcategoryIndex || 0,
            stopReason: finalCount >= targetLimit ? 'TARGET_REACHED' : 'ALL_SUBCATEGORIES_EXHAUSTED',
          },
        ],
      };
    } catch {
      throw new Error('Expansão finalizada sem confirmação de resultado.');
    }
  }

  return finalResult;
}

export async function startExpansionJobApi(
  studentCode: string,
  payload: {
    selectedCategories?: string[];
    selectedSubcategoriesMap?: Record<string, string[]>;
    categoryTargetLimit?: number;
    perSubcategoryMax?: number;
  }
): Promise<{ success: boolean; executionId: string; state: any; meta: any }> {
  const response = await fetch('/api/product-miner/admin/expansion-jobs/start', {
    method: 'POST',
    headers: {
      ...authHeaders(studentCode),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data, response.status);
  return data;
}

export async function stepExpansionJobApi(
  studentCode: string,
  executionId: string
): Promise<{ success: boolean; executionId: string; isCompleted: boolean; progress?: SubcategoryBatchProgressApi; result?: SubcategoryExpansionResultApi; state?: any; stepInProgress?: boolean }> {
  const response = await fetch(`/api/product-miner/admin/expansion-jobs/${encodeURIComponent(executionId)}/step`, {
    method: 'POST',
    headers: authHeaders(studentCode),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 409 || data.error === 'STEP_IN_PROGRESS' || data.code === 'STEP_IN_PROGRESS') {
    return { success: false, executionId, isCompleted: false, stepInProgress: true };
  }
  if (!response.ok) throw accessError(data, response.status);
  return data;
}

export async function getExpansionJobStatusApi(
  studentCode: string,
  executionId: string
): Promise<{ success: boolean; job: any }> {
  const response = await fetch(`/api/product-miner/admin/expansion-jobs/${encodeURIComponent(executionId)}/status`, {
    headers: authHeaders(studentCode),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data, response.status);
  return data;
}

export async function cancelExpansionJobApi(
  studentCode: string,
  executionId: string
): Promise<{ success: boolean; executionId: string; status: string }> {
  const response = await fetch(`/api/product-miner/admin/expansion-jobs/${encodeURIComponent(executionId)}/cancel`, {
    method: 'POST',
    headers: authHeaders(studentCode),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data, response.status);
  return data;
}

export async function executeSubcategoryExpansionApi(
  studentCode: string,
  payload: {
    selectedCategories?: string[];
    selectedSubcategoriesMap?: Record<string, string[]>;
    categoryTargetLimit?: number;
    perSubcategoryMax?: number;
    maxCreditBudgetPerCategory?: number;
  },
  onProgress?: (progress: SubcategoryBatchProgressApi) => void,
  signal?: AbortSignal
): Promise<SubcategoryExpansionResultApi> {
  // Inicia o job persistente no backend
  const startRes = await startExpansionJobApi(studentCode, {
    selectedCategories: payload.selectedCategories,
    selectedSubcategoriesMap: payload.selectedSubcategoriesMap,
    categoryTargetLimit: payload.categoryTargetLimit,
    perSubcategoryMax: payload.perSubcategoryMax,
  });

  const executionId = startRes.executionId;
  let isCompleted = false;
  let finalResult: SubcategoryExpansionResultApi | undefined;

  // Itera chamando /step até a conclusão do job ou cancelamento
  let networkFailures = 0;
  const MAX_NETWORK_RETRIES = 5;

  while (!isCompleted) {
    if (signal?.aborted) {
      await cancelExpansionJobApi(studentCode, executionId).catch(() => {});
      throw new Error('EXPANSION_CANCELLED');
    }

    try {
      const stepRes = await stepExpansionJobApi(studentCode, executionId);

      if (stepRes.stepInProgress) {
        // Step em execução por lock atômico — aguarda brevemente sem contabilizar falha de rede
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }

      networkFailures = 0; // Reset ao obter resposta com sucesso

      if (stepRes.progress && onProgress) {
        onProgress(stepRes.progress);
      }

      isCompleted = Boolean(stepRes.isCompleted);
      if (stepRes.result) {
        finalResult = stepRes.result;
      }
    } catch (err: any) {
      if (signal?.aborted) {
        await cancelExpansionJobApi(studentCode, executionId).catch(() => {});
        throw new Error('EXPANSION_CANCELLED');
      }

      const errCode = err?.code || (err instanceof ProductMinerApiError ? err.code : '');
      const errStatus = err?.status || (err instanceof ProductMinerApiError ? err.status : 0);

      // Erros LÓGICOS não transitórios (ex: 404 JOB_NOT_FOUND, 401, 403, DB não configurado): interromper IMEDIATAMENTE sem retries
      if (
        errStatus === 404 ||
        errCode === 'JOB_NOT_FOUND' ||
        errCode === 'INVALID_JOB_STATE' ||
        errCode === 'EXPANSION_JOB_PERSISTENCE_FAILED' ||
        errCode === 'DATABASE_NOT_CONFIGURED' ||
        errCode === 'AUTH_REQUIRED' ||
        errCode === 'ACCESS_DENIED' ||
        errCode === 'PRODUCT_MINER_REFRESH_MENTOR_ONLY'
      ) {
        console.error(`[Expansion Job] Erro lógico fatal no step para job ${executionId} (${errCode || errStatus}):`, err?.message || err);
        throw err;
      }

      networkFailures++;
      console.warn(`[Expansion Job] Falha transitória de comunicação no step (${networkFailures}/${MAX_NETWORK_RETRIES}) para job ${executionId}:`, err?.message || err);

      if (networkFailures > MAX_NETWORK_RETRIES) {
        throw new Error(`Falha de comunicação persistente com o servidor após ${MAX_NETWORK_RETRIES} tentativas: ${err?.message || err}`);
      }

      // Backoff exponencial: 1s, 2s, 4s...
      const backoffMs = Math.min(8000, 1000 * Math.pow(2, networkFailures - 1));
      await new Promise((r) => setTimeout(r, backoffMs));

      // Consulta o estado oficial persistido no backend usando o MESMO executionId
      try {
        const statusRes = await getExpansionJobStatusApi(studentCode, executionId);
        if (statusRes.job) {
          if (statusRes.job.progress && onProgress) {
            onProgress(statusRes.job.progress);
          }
          if (statusRes.job.status === 'COMPLETED' || statusRes.job.status === 'CANCELLED' || statusRes.job.status === 'FAILED' || statusRes.job.status === 'PARTIAL_ERROR') {
            isCompleted = true;
            if (statusRes.job.result) {
              finalResult = statusRes.job.result;
            }
          }
        }
      } catch (statusErr: any) {
        const statusErrCode = statusErr?.code || (statusErr instanceof ProductMinerApiError ? statusErr.code : '');
        if (statusErrCode === 'JOB_NOT_FOUND' || statusErr?.status === 404) {
          throw statusErr;
        }
        console.warn(`[Expansion Job] Falha ao consultar status após erro de rede:`, statusErr?.message || statusErr);
      }
    }
  }

  if (finalResult) {
    return finalResult;
  }

  const statusRes = await getExpansionJobStatusApi(studentCode, executionId);
  if (statusRes.job?.result) {
    return statusRes.job.result;
  }

  throw new Error('Expansão finalizada sem confirmação de resultado.');
}

export interface DailyPickResponse {
  success: boolean;
  role?: 'mentor' | 'student';
  dailyLimit?: number | null;
  spinsUsedToday?: number;
  remainingSpins?: number | null;
  canSpin?: boolean;
  hasSpunToday?: boolean;
  pickDate?: string;
  category?: string;
  product?: ProductMinerProduct | null;
  error?: string;
}

export async function getDailyPickStatusApi(studentCode: string): Promise<DailyPickResponse> {
  const response = await fetch('/api/product-miner/daily-pick/status', {
    headers: authHeaders(studentCode),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  return data;
}

export async function spinDailyPickApi(studentCode: string, targetCategory?: string): Promise<DailyPickResponse> {
  const response = await fetch('/api/product-miner/daily-pick/spin', {
    method: 'POST',
    headers: {
      ...authHeaders(studentCode),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ targetCategory }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  return data;
}

// =========================================================================
// TRANSCRIÇÃO EXATA E MODELAGEM DE CONTEÚDO
// =========================================================================

export interface TimedTranscriptBlock {
  time: string;
  text: string;
}

export interface VideoCaptionBlock {
  start: number;
  end: number;
  text: string;
}

export interface VideoTranscriptionResponse {
  success: boolean;
  exists?: boolean;
  fromCache?: boolean;
  fallback?: boolean;
  productId: string;
  videoId?: string;
  transcription?: string;
  language?: string;
  captions?: VideoCaptionBlock[];
  originalLanguage: string;
  isForeignLanguage: boolean;
  rawTranscript: string;
  timedTranscript: TimedTranscriptBlock[];
  portugueseTranslation?: string | null;
  durationSeconds: number;
  rhythm: string;
  hookOriginal: string;
  structureOriginal: string;
  developmentOriginal: string;
  ctaOriginal: string;
  confidenceScore: number;
  source?: string;
  status?: string;
}

export interface ModeledScriptSection {
  time: string;
  tag: string;
  visualAction: string;
  spokenText: string;
  onScreenText: string;
}

export interface ContentModelAnalysis {
  hookOriginal: string;
  structureOriginal: string;
  developmentOriginal: string;
  ctaOriginal: string;
  rhythm: string;
  duration: string;
  whyItWorks?: string;
}

export interface ModeledScriptData {
  title: string;
  targetProduct: string;
  niche?: string;
  estimatedDuration: string;
  sections: ModeledScriptSection[];
  fullScriptMarkdown: string;
  viralTips?: string[];
}

export interface ModelContentResponse {
  success: boolean;
  productId: string;
  videoId?: string;
  modelAnalysis: ContentModelAnalysis;
  modeledScript: ModeledScriptData;
}

export async function fetchPersistedTranscriptionByVideoIdApi(
  studentCode: string,
  videoId: string,
  productId?: string
): Promise<VideoTranscriptionResponse> {
  const params = new URLSearchParams();
  if (productId) params.set('productId', productId);
  const qs = params.toString() ? `?${params.toString()}` : '';

  const response = await fetch(`/api/product-miner/videos/transcription/${encodeURIComponent(videoId)}${qs}`, {
    headers: authHeaders(studentCode),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  return data as VideoTranscriptionResponse;
}

export async function fetchVideoTranscriptionApi(
  studentCode: string,
  params: {
    productId: string;
    videoId?: string;
    videoUrl?: string;
    productTitle?: string;
    productCategory?: string;
    videoAuthor?: string;
    videoDescription?: string;
    forceRefresh?: boolean;
  }
): Promise<VideoTranscriptionResponse> {
  const response = await fetch('/api/product-miner/videos/transcription', {
    method: 'POST',
    headers: {
      ...authHeaders(studentCode),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  return data as VideoTranscriptionResponse;
}

export async function modelVideoContentApi(
  studentCode: string,
  params: {
    productId: string;
    videoId?: string;
    exactTranscript: string;
    originalHook?: string;
    originalStructure?: string;
    originalDevelopment?: string;
    originalCta?: string;
    originalRhythm?: string;
    originalDuration?: number | string;
    targetProduct: string;
    targetNiche?: string;
    targetAngle?: string;
    targetDifferentiator?: string;
    voiceTone?: string;
    structuralFidelity?: 'Alta' | 'Média' | 'Livre';
    customInstructions?: string;
    variantSeed?: number;
  }
): Promise<ModelContentResponse> {
  const response = await fetch('/api/product-miner/videos/model-content', {
    method: 'POST',
    headers: {
      ...authHeaders(studentCode),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw accessError(data);
  return data as ModelContentResponse;
}



