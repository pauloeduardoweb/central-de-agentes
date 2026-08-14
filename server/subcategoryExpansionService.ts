import { db, isDatabaseConfigured, ensureProductMinerTables } from './database.js';
import {
  COLLECTOR_CATEGORIES,
  OFFICIAL_TIKTOK_TAXONOMY,
} from './taxonomy.js';
import {
  getCollectorCategoriesStats,
  searchTikTokShopProducts,
  persistProducts,
  CollectorCategoryStat,
  MinedProduct,
} from './productMinerService.js';

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
  subcategories: SubcategoryTargetPlan[];
  totalAllocated: number;
  estimatedCredits: number;
}

export interface SubcategoryBatchProgress {
  currentCategory: string;
  currentSubcategory: string;
  categoryIndex: number;
  totalCategories: number;
  subcategoryIndex: number;
  totalSubcategoriesInCategory: number;
  categoryProductsCollected: number;
  categoryTargetLimit: number;
  totalNewProducts: number;
  totalUpdatedProducts: number;
  totalCreditsUsed: number;
  isCompleted: boolean;
}

export interface SubcategoryExpansionResult {
  success: boolean;
  totalProcessed: number;
  totalUnique: number;
  totalNew: number;
  totalUpdated: number;
  totalCreditsUsed: number;
  categoriesCompleted: number;
  subcategoriesConsulted: number;
  subcategoriesCoverageBefore: number;
  subcategoriesCoverageAfter: number;
  plans: CategoryExpansionPlan[];
  errors: string[];
}

/**
 * Constrói o plano ordenado e determinístico de expansão por subcategorias oficiais.
 * Regras estritas:
 * 1. Prioridade Máxima: Subcategorias com 0 produtos na base (isZeroCount: true).
 * 2. Segunda Prioridade: Subcategorias com menor contagem existente (ordem crescente).
 * 3. Critério de desempate determinístico: Nome da subcategoria em ordem alfabética.
 * 4. Meta-limit por categoria: A soma alocada não ultrapassa o limite da categoria.
 */
export function buildSubcategoryExpansionPlan(params: {
  categoryStats: CollectorCategoryStat[];
  selectedCategories?: string[];
  categoryTargetLimit?: number;
  perSubcategoryMax?: number;
}): CategoryExpansionPlan[] {
  const {
    categoryStats,
    selectedCategories = COLLECTOR_CATEGORIES,
    categoryTargetLimit = 500,
    perSubcategoryMax = 60,
  } = params;

  const targetCats = selectedCategories.length > 0 ? selectedCategories : COLLECTOR_CATEGORIES;
  const plans: CategoryExpansionPlan[] = [];

  for (const catName of targetCats) {
    const catStat = categoryStats.find((c) => c.category === catName);
    const currentProductCount = catStat?.productCount || 0;
    const officialSubs = OFFICIAL_TIKTOK_TAXONOMY[catName] || [];

    // Mapear contagem atual por subcategoria
    const subCountMap = new Map<string, number>();
    if (catStat?.subcategories) {
      for (const s of catStat.subcategories) {
        subCountMap.set(s.subcategory, s.productCount);
      }
    }

    // Criar lista de subcategorias para ordenação
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

    // Alocar cotas respeitando a meta global da categoria
    let remainingCategoryQuota = Math.max(0, categoryTargetLimit);
    let rank = 1;
    const subPlans: SubcategoryTargetPlan[] = [];

    for (const subItem of rawSubList) {
      if (remainingCategoryQuota <= 0) {
        // Se a meta da categoria já foi preenchida pela cota das anteriores
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

      // Aloca até perSubcategoryMax ou o que resta da quota da categoria
      const allocated = Math.min(perSubcategoryMax, remainingCategoryQuota);
      const estimatedPages = Math.max(1, Math.ceil(allocated / 30));
      remainingCategoryQuota -= allocated;

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
    const estimatedCredits = subPlans.reduce((sum, s) => sum + s.estimatedPages, 0);

    plans.push({
      category: catName,
      currentProductCount,
      categoryTargetLimit,
      subcategories: subPlans,
      totalAllocated,
      estimatedCredits,
    });
  }

  return plans;
}

/**
 * Executa a expansão iterando pelas subcategorias oficiais com priorização real e limite por categoria.
 */
export async function executeSubcategoryExpansion(options: {
  selectedCategories?: string[];
  categoryTargetLimit?: number;
  perSubcategoryMax?: number;
  onProgress?: (progress: SubcategoryBatchProgress) => void;
  shouldCancel?: () => boolean;
  // Injeção de dependência opcional para testes ou mock sem SocialCrawl
  searchFn?: (params: { query: string; page: number; region: string; forceRefresh: boolean }) => Promise<{
    products: MinedProduct[];
    creditsUsed: number;
    hasMore: boolean;
    totalReceived?: number;
    newProductsCount?: number;
    updatedProductsCount?: number;
  }>;
}): Promise<SubcategoryExpansionResult> {
  const {
    selectedCategories,
    categoryTargetLimit = 500,
    perSubcategoryMax = 60,
    onProgress,
    shouldCancel,
    searchFn = searchTikTokShopProducts,
  } = options;

  const statsBefore = await getCollectorCategoriesStats();
  const plans = buildSubcategoryExpansionPlan({
    categoryStats: statsBefore.categories,
    selectedCategories,
    categoryTargetLimit,
    perSubcategoryMax,
  });

  let initialCoverage = 0;
  for (const cat of statsBefore.categories) {
    initialCoverage += cat.coverageCount;
  }

  let totalProcessed = 0;
  let totalNew = 0;
  let totalUpdated = 0;
  let totalCreditsUsed = 0;
  let categoriesCompleted = 0;
  let subcategoriesConsulted = 0;
  const seenProductIds = new Set<string>();
  const errors: string[] = [];

  for (let catIdx = 0; catIdx < plans.length; catIdx++) {
    if (shouldCancel && shouldCancel()) break;

    const catPlan = plans[catIdx];
    let categoryCollectedCount = 0;

    for (let subIdx = 0; subIdx < catPlan.subcategories.length; subIdx++) {
      if (shouldCancel && shouldCancel()) break;

      const subPlan = catPlan.subcategories[subIdx];
      if (subPlan.allocatedTarget <= 0) continue;

      // Se a categoria já atingiu a meta global nesta execução
      if (categoryCollectedCount >= catPlan.categoryTargetLimit) {
        console.log(`[Subcategory Expansion] Categoria "${catPlan.category}" atingiu a meta de ${catPlan.categoryTargetLimit} produtos. Passando para próxima categoria.`);
        break;
      }

      if (onProgress) {
        onProgress({
          currentCategory: catPlan.category,
          currentSubcategory: subPlan.subcategory,
          categoryIndex: catIdx + 1,
          totalCategories: plans.length,
          subcategoryIndex: subIdx + 1,
          totalSubcategoriesInCategory: catPlan.subcategories.length,
          categoryProductsCollected: categoryCollectedCount,
          categoryTargetLimit: catPlan.categoryTargetLimit,
          totalNewProducts: totalNew,
          totalUpdatedProducts: totalUpdated,
          totalCreditsUsed,
          isCompleted: false,
        });
      }

      const maxPagesForThisSub = subPlan.estimatedPages;
      let subcategoryReceivedThisRun = 0;

      for (let page = 1; page <= maxPagesForThisSub; page++) {
        if (shouldCancel && shouldCancel()) break;

        try {
          // Chamada de aquisição para a subcategoria oficial
          const res = await searchFn({
            query: subPlan.subcategory,
            page,
            region: 'BR',
            forceRefresh: true,
          });

          subcategoriesConsulted++;
          const receivedThisPage = res.totalReceived ?? res.products?.length ?? 0;
          totalProcessed += receivedThisPage;
          subcategoryReceivedThisRun += receivedThisPage;
          categoryCollectedCount += receivedThisPage;
          totalCreditsUsed += (res.creditsUsed || 1);

          totalNew += (res.newProductsCount || 0);
          totalUpdated += (res.updatedProductsCount || 0);

          for (const p of res.products || []) {
            if (p.productId) seenProductIds.add(p.productId);
          }

          // Se a API não retornou itens ou não tem mais páginas, interrompe paginação desta subcategoria
          if (receivedThisPage === 0 || !res.hasMore) {
            break;
          }

          // Se atingiu o limite da subcategoria ou da categoria
          if (subcategoryReceivedThisRun >= subPlan.allocatedTarget || categoryCollectedCount >= catPlan.categoryTargetLimit) {
            break;
          }

          // Pequeno intervalo preventivo de rate limit
          await new Promise((r) => setTimeout(r, 250));
        } catch (err: any) {
          const errMsg = `Erro ao coletar "${catPlan.category} > ${subPlan.subcategory}" (Página ${page}): ${err?.message || err}`;
          console.warn(`[Subcategory Expansion Warning]:`, errMsg);
          errors.push(errMsg);
          break;
        }
      }
    }

    categoriesCompleted++;
  }

  // Notificação final de progresso
  if (onProgress && plans.length > 0) {
    const lastPlan = plans[plans.length - 1];
    onProgress({
      currentCategory: lastPlan.category,
      currentSubcategory: lastPlan.subcategories[lastPlan.subcategories.length - 1]?.subcategory || '',
      categoryIndex: plans.length,
      totalCategories: plans.length,
      subcategoryIndex: lastPlan.subcategories.length,
      totalSubcategoriesInCategory: lastPlan.subcategories.length,
      categoryProductsCollected: 0,
      categoryTargetLimit: lastPlan.categoryTargetLimit,
      totalNewProducts: totalNew,
      totalUpdatedProducts: totalUpdated,
      totalCreditsUsed,
      isCompleted: true,
    });
  }

  const statsAfter = await getCollectorCategoriesStats();
  let finalCoverage = 0;
  for (const cat of statsAfter.categories) {
    finalCoverage += cat.coverageCount;
  }

  return {
    success: errors.length === 0 || totalProcessed > 0,
    totalProcessed,
    totalUnique: seenProductIds.size,
    totalNew,
    totalUpdated,
    totalCreditsUsed,
    categoriesCompleted,
    subcategoriesConsulted,
    subcategoriesCoverageBefore: initialCoverage,
    subcategoriesCoverageAfter: finalCoverage,
    plans,
    errors,
  };
}
