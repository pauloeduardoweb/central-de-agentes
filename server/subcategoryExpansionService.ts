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
  remainingTarget: number;
  totalAllocated: number;
  projectedFinalCount: number;
  unallocatedGap: number;
  estimatedCredits: number;
  subcategories: SubcategoryTargetPlan[];
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
  remainingNeeded: number;
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
 * 
 * Regra Absoluta da Meta:
 * - categoryTargetLimit = META FINAL APROXIMADA DA CATEGORIA (ex: 500 produtos únicos).
 * - remainingTarget = Math.max(0, categoryTargetLimit - currentProductCount).
 * - totalAllocated <= remainingTarget.
 * - projectedFinalCount = currentProductCount + totalAllocated (obrigatoriamente <= categoryTargetLimit, exceto se já estava acima).
 * - unallocatedGap = Math.max(0, remainingTarget - totalAllocated).
 * 
 * Regras estritas de priorização:
 * 1. Prioridade 1: Subcategorias com 0 produtos na base (isZeroCount: true).
 * 2. Prioridade 2: Subcategorias com menor contagem existente (ordem crescente).
 * 3. Prioridade 3 (Desempate): Nome da subcategoria em ordem alfabética determinística.
 * 4. Orçamento: Cota alocada reduz o remainingBudget até 0 e então PARA.
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

    // Déficit real necessário para a categoria atingir a meta final
    const remainingTarget = Math.max(0, categoryTargetLimit - currentProductCount);

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

    // Alocar cotas respeitando estritamente o orçamento restante da categoria
    let remainingBudget = remainingTarget;
    let rank = 1;
    const subPlans: SubcategoryTargetPlan[] = [];

    for (const subItem of rawSubList) {
      if (remainingBudget <= 0) {
        // Se a meta da categoria já foi preenchida pela cota das anteriores ou se remainingTarget === 0
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

      // Aloca até perSubcategoryMax ou o que resta do orçamento da categoria
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

/**
 * Executa a expansão iterando pelas subcategorias oficiais com priorização real e limite por categoria.
 * Proteção dupla:
 * - remainingNeeded baseado no déficit real (categoryTargetLimit - total acumulado).
 * - Apenas PRODUTOS NOVOS reduzem o remainingNeeded (produtos já existentes/duplicados não reduzem o déficit).
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
    const initialCategoryCount = catPlan.currentProductCount;
    let categoryNewProductsCount = 0;

    // Se a categoria já atingiu/ultrapassou a meta ou se totalAllocated === 0, ignorar sem gastar créditos
    let remainingNeeded = Math.max(0, catPlan.categoryTargetLimit - (initialCategoryCount + categoryNewProductsCount));
    if (remainingNeeded <= 0 || catPlan.totalAllocated <= 0) {
      console.log(`[Subcategory Expansion] Categoria "${catPlan.category}" já possui ${initialCategoryCount} produtos (Meta: ${catPlan.categoryTargetLimit}). 0 novas requisições necessárias.`);
      categoriesCompleted++;
      continue;
    }

    for (let subIdx = 0; subIdx < catPlan.subcategories.length; subIdx++) {
      if (shouldCancel && shouldCancel()) break;

      // Recalcula remainingNeeded antes de iniciar cada subcategoria
      remainingNeeded = Math.max(0, catPlan.categoryTargetLimit - (initialCategoryCount + categoryNewProductsCount));
      if (remainingNeeded <= 0) {
        console.log(`[Subcategory Expansion] Categoria "${catPlan.category}" atingiu a meta de ${catPlan.categoryTargetLimit} produtos únicos.`);
        break;
      }

      const subPlan = catPlan.subcategories[subIdx];
      if (subPlan.allocatedTarget <= 0) continue;

      if (onProgress) {
        onProgress({
          currentCategory: catPlan.category,
          currentSubcategory: subPlan.subcategory,
          categoryIndex: catIdx + 1,
          totalCategories: plans.length,
          subcategoryIndex: subIdx + 1,
          totalSubcategoriesInCategory: catPlan.subcategories.length,
          categoryProductsCollected: categoryNewProductsCount,
          categoryTargetLimit: catPlan.categoryTargetLimit,
          remainingNeeded,
          totalNewProducts: totalNew,
          totalUpdatedProducts: totalUpdated,
          totalCreditsUsed,
          isCompleted: false,
        });
      }

      const subTarget = Math.min(subPlan.allocatedTarget, remainingNeeded);
      const maxPagesForThisSub = Math.max(1, Math.ceil(subTarget / 30));
      let subcategoryNewReceived = 0;

      for (let page = 1; page <= maxPagesForThisSub; page++) {
        if (shouldCancel && shouldCancel()) break;

        remainingNeeded = Math.max(0, catPlan.categoryTargetLimit - (initialCategoryCount + categoryNewProductsCount));
        if (remainingNeeded <= 0 || subcategoryNewReceived >= subTarget) {
          break;
        }

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
          const newInPage = res.newProductsCount ?? 0;
          const updatedInPage = res.updatedProductsCount ?? 0;

          totalProcessed += receivedThisPage;
          totalNew += newInPage;
          totalUpdated += updatedInPage;
          totalCreditsUsed += (res.creditsUsed || 1);

          // Apenas produtos NOVOS únicos reduzem o déficit restante para a meta
          categoryNewProductsCount += newInPage;
          subcategoryNewReceived += newInPage;
          remainingNeeded = Math.max(0, catPlan.categoryTargetLimit - (initialCategoryCount + categoryNewProductsCount));

          for (const p of res.products || []) {
            if (p.productId) seenProductIds.add(p.productId);
          }

          // Se a API não retornou itens ou não tem mais páginas, interrompe paginação desta subcategoria
          if (receivedThisPage === 0 || !res.hasMore) {
            break;
          }

          // Se atingiu o limite da subcategoria ou a meta da categoria
          if (subcategoryNewReceived >= subTarget || remainingNeeded <= 0) {
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
      categoryProductsCollected: totalNew,
      categoryTargetLimit: lastPlan.categoryTargetLimit,
      remainingNeeded: 0,
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
