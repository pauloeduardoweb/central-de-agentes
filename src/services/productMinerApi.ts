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
  if (code === 'PRODUCT_MINER_RANKING_ERROR') {
    return new Error('Não foi possível carregar o ranking no momento. Tente novamente.');
  }
  if (code === 'PRODUCT_MINER_SEARCH_ERROR') {
    return new Error('Não foi possível realizar a busca de produtos no momento.');
  }
  if (code === 'PRODUCT_MINER_COLLECTOR_STATS_ERROR') {
    return new Error('Não foi possível carregar as estatísticas do coletor.');
  }
  if (data?.detail && typeof data.detail === 'string') {
    return new Error(data.detail);
  }
  if (data?.error && typeof data.error === 'string' && !data.error.includes('_ERROR')) {
    return new Error(data.error);
  }
  return new Error('Falha no Minerador de Produtos. Tente novamente em alguns instantes.');
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
  classification?: string | null
): Promise<ProductSearchResponse> {
  const params = new URLSearchParams({ query, page: String(page) });
  if (category && category !== 'Todos' && category !== 'Todas') params.set('category', category);
  if (subcategory && subcategory !== 'Todas' && subcategory !== 'Todos') params.set('subcategory', subcategory);
  if (childCategory && childCategory !== 'Todas' && childCategory !== 'Todos') params.set('childCategory', childCategory);
  if (classification) params.set('classification', classification);

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
  if (!response.ok) throw accessError(data);
  return data.report as ReclassificationReport;
}

export interface TrackInteractionParams {
  productId: string;
  eventType: 'product_open' | 'product_click';
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

export interface CategoryExpansionPlan {
  category: string;
  currentProductCount: number;
  categoryTargetLimit: number;
  remainingTarget: number;
  totalAllocated: number;
  projectedFinalCount: number;
  unallocatedGap: number;
  estimatedCredits: number;
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
    categoryTargetLimit: number;
    perSubcategoryMax: number;
  };
  plans: CategoryExpansionPlan[];
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
 * Calcula localmente o plano de expansão com base nas estatísticas das categorias,
 * seguindo com precisão matemática a mesma regra do backend subcategoryExpansionService:
 * 
 * remainingTarget = Math.max(0, categoryTargetLimit - currentProductCount)
 * allocatedTarget = Math.min(perSubcategoryMax, remainingBudget)
 * estimatedPages = allocatedTarget > 0 ? Math.max(1, Math.ceil(allocatedTarget / 30)) : 0
 * estimatedCredits = SUM(estimatedPages)
 * 
 * Zero créditos para categorias já na meta ou acima (remainingTarget <= 0).
 */
export function calculateExpansionPlanFromStats(params: {
  categoryStats: CollectorCategoryStat[];
  selectedCategories: string[];
  categoryTargetLimit: number;
  perSubcategoryMax?: number;
  taxonomyConfig?: Record<string, string[]>;
}): CategoryExpansionPlan[] {
  const {
    categoryStats,
    selectedCategories,
    categoryTargetLimit,
    perSubcategoryMax = 60,
    taxonomyConfig,
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
    const estimatedCredits = subPlans.reduce((sum, s) => sum + s.estimatedPages, 0);

    plans.push({
      category: catName,
      currentProductCount,
      categoryTargetLimit,
      remainingTarget,
      totalAllocated,
      projectedFinalCount,
      unallocatedGap,
      estimatedCredits,
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
  subcategoriesConsulted: number;
  coverageBefore?: number;
  coverageAfter?: number;
  stopReason: 'TARGET_REACHED' | 'NO_MORE_RESULTS' | 'NO_VALID_RESULTS' | 'ALL_SUBCATEGORIES_EXHAUSTED' | 'CANCELLED';
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

  stepStatus: string;

  totalReceived: number;
  totalNewProducts: number;
  totalUpdatedProducts: number;
  totalCreditsUsed: number;
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
  categoriesCompleted: number;
  subcategoriesConsulted: number;
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

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        const jsonStr = trimmed.slice(6).trim();
        if (jsonStr) {
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'PROGRESS' && parsed.progress && onProgress) {
              onProgress(parsed.progress);
            } else if (parsed.type === 'DONE' && parsed.result) {
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

  if (buffer.trim().startsWith('data: ')) {
    const jsonStr = buffer.trim().slice(6).trim();
    if (jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.type === 'DONE' && parsed.result) {
          finalResult = parsed.result;
        }
      } catch {
        // ignore
      }
    }
  }

  if (!finalResult) {
    throw new Error('Expansão finalizada sem retorno de resultado.');
  }

  return finalResult;
}

export async function executeSubcategoryExpansionApi(
  studentCode: string,
  payload: {
    selectedCategories?: string[];
    categoryTargetLimit?: number;
    perSubcategoryMax?: number;
    maxCreditBudgetPerCategory?: number;
  },
  onProgress?: (progress: SubcategoryBatchProgressApi) => void
): Promise<SubcategoryExpansionResultApi> {
  return executeSubcategoryExpansionStreamApi(studentCode, payload, onProgress);
}


