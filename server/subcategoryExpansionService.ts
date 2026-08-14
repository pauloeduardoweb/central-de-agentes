import { db, isDatabaseConfigured, ensureProductMinerTables } from './database.js';
import {
  COLLECTOR_CATEGORIES,
  OFFICIAL_TIKTOK_TAXONOMY,
  classifyProductFull,
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

export interface CategoryExecutionSummary {
  category: string;
  initialValidCount: number;
  finalValidCount: number;
  categoryTargetLimit: number;
  validNewProductsForTarget: number;
  offTargetProducts: number;
  unclassifiedProducts: number;
  updatedProducts: number;
  totalReceived: number;
  creditsUsed: number;
  subcategoriesConsulted: number;
  stopReason: 'TARGET_REACHED' | 'MAX_CREDIT_BUDGET' | 'MAX_PAGES' | 'NO_MORE_RESULTS' | 'NO_VALID_RESULTS' | 'ALL_SUBCATEGORIES_EXHAUSTED' | 'CANCELLED';
}

export interface SubcategoryBatchProgress {
  currentCategory: string;
  currentSubcategory: string;
  categoryIndex: number;
  totalCategories: number;
  subcategoryIndex: number;
  totalSubcategoriesInCategory: number;

  // Categoria alvo atual
  categoryTargetLimit: number;
  currentValidTargetCount: number;
  remainingNeeded: number;
  validNewProductsForTarget: number;
  offTargetProducts: number;
  unclassifiedProducts: number;

  // Totais globais
  totalReceived: number;
  totalNewProducts: number;
  totalUpdatedProducts: number;
  totalCreditsUsed: number;
  isCompleted: boolean;
  stopReason?: string;
}

export interface SubcategoryExpansionResult {
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
  categorySummaries: CategoryExecutionSummary[];
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
 * 
 * Regra Estrita da Meta de Categoria:
 * - Um produto novo só reduz o déficit (remainingNeeded) se, após passar pelo classificador oficial (classifyProductFull),
 *   sua categoria final for exatamente igual à categoria-alvo (catPlan.category).
 * - Produtos pertencentes a outras categorias (off-target) ou sem classificação confiável (unclassified)
 *   são salvos no banco normalmente para preservação, mas NÃO reduzem a meta da categoria-alvo.
 * - Produtos com category_path NULL não recebem classificação automática e continuam null se não houver evidência segura no título.
 * - O executor continua consultando as próximas subcategorias ordenadas por prioridade até bater a meta ou esgotar subcategorias/créditos.
 */
export async function executeSubcategoryExpansion(options: {
  selectedCategories?: string[];
  categoryTargetLimit?: number;
  perSubcategoryMax?: number;
  maxCreditBudgetPerCategory?: number;
  categoryStats?: CollectorCategoryStat[];
  plans?: CategoryExpansionPlan[];
  onProgress?: (progress: SubcategoryBatchProgress) => void;
  shouldCancel?: () => boolean;
  // Injeção de dependência opcional para testes ou mock sem SocialCrawl
  searchFn?: (params: {
    query: string;
    page: number;
    region: string;
    forceRefresh: boolean;
    collectionCategory?: string | null;
    collectionSubcategory?: string | null;
  }) => Promise<{
    products: MinedProduct[];
    creditsUsed: number;
    hasMore: boolean;
    totalReceived?: number;
    newProductsCount?: number;
    updatedProductsCount?: number;
    insertedIds?: string[];
  }>;
}): Promise<SubcategoryExpansionResult> {
  const {
    selectedCategories,
    categoryTargetLimit = 500,
    perSubcategoryMax = 60,
    maxCreditBudgetPerCategory,
    categoryStats: customCategoryStats,
    plans: customPlans,
    onProgress,
    shouldCancel,
    searchFn = searchTikTokShopProducts,
  } = options;

  let initialCategories: CollectorCategoryStat[];
  if (customCategoryStats) {
    initialCategories = customCategoryStats;
  } else {
    const statsBefore = await getCollectorCategoriesStats();
    initialCategories = statsBefore.categories;
  }

  const plans = customPlans || buildSubcategoryExpansionPlan({
    categoryStats: initialCategories,
    selectedCategories,
    categoryTargetLimit,
    perSubcategoryMax,
  });

  let initialCoverage = 0;
  for (const cat of initialCategories) {
    initialCoverage += cat.coverageCount || 0;
  }

  let totalProcessed = 0;
  let totalNew = 0;
  let totalUpdated = 0;
  let totalValidNewForTarget = 0;
  let totalOffTarget = 0;
  let totalUnclassified = 0;
  let totalCreditsUsed = 0;
  let categoriesCompleted = 0;
  let subcategoriesConsulted = 0;
  const seenProductIds = new Set<string>();
  const categorySummaries: CategoryExecutionSummary[] = [];
  const errors: string[] = [];

  for (let catIdx = 0; catIdx < plans.length; catIdx++) {
    if (shouldCancel && shouldCancel()) break;

    const catPlan = plans[catIdx];
    const initialValidCount = catPlan.currentProductCount;
    let currentValidTargetCount = initialValidCount;
    let catValidNewCount = 0;
    let catOffTargetCount = 0;
    let catUnclassifiedCount = 0;
    let catUpdatedCount = 0;
    let catTotalReceived = 0;
    let catCreditsUsed = 0;
    let catSubcategoriesConsulted = 0;
    let catStopReason: CategoryExecutionSummary['stopReason'] = 'ALL_SUBCATEGORIES_EXHAUSTED';

    // Orçamento máximo de créditos por categoria (teto de segurança)
    const categoryCreditLimit = maxCreditBudgetPerCategory || Math.max(15, Math.ceil(catPlan.estimatedCredits * 2.5));

    // Se a categoria já atingiu/ultrapassou a meta inicial ou se totalAllocated === 0, ignorar sem gastar créditos
    let remainingNeeded = Math.max(0, catPlan.categoryTargetLimit - currentValidTargetCount);
    if (remainingNeeded <= 0 || catPlan.totalAllocated <= 0) {
      console.log(`[Subcategory Expansion] Categoria "${catPlan.category}" já possui ${initialValidCount} produtos válidos (Meta: ${catPlan.categoryTargetLimit}). 0 novas requisições necessárias.`);
      catStopReason = 'TARGET_REACHED';
      categorySummaries.push({
        category: catPlan.category,
        initialValidCount,
        finalValidCount: currentValidTargetCount,
        categoryTargetLimit: catPlan.categoryTargetLimit,
        validNewProductsForTarget: 0,
        offTargetProducts: 0,
        unclassifiedProducts: 0,
        updatedProducts: 0,
        totalReceived: 0,
        creditsUsed: 0,
        subcategoriesConsulted: 0,
        stopReason: catStopReason,
      });
      categoriesCompleted++;
      continue;
    }

    for (let subIdx = 0; subIdx < catPlan.subcategories.length; subIdx++) {
      if (shouldCancel && shouldCancel()) {
        catStopReason = 'CANCELLED';
        break;
      }

      // Recalcula remainingNeeded antes de iniciar cada subcategoria com base nos produtos VÁLIDOS acumulados
      remainingNeeded = Math.max(0, catPlan.categoryTargetLimit - currentValidTargetCount);
      if (remainingNeeded <= 0) {
        console.log(`[Subcategory Expansion] Categoria "${catPlan.category}" atingiu a meta de ${catPlan.categoryTargetLimit} produtos válidos.`);
        catStopReason = 'TARGET_REACHED';
        break;
      }

      if (catCreditsUsed >= categoryCreditLimit) {
        console.log(`[Subcategory Expansion] Categoria "${catPlan.category}" atingiu o limite de créditos (${catCreditsUsed}/${categoryCreditLimit}).`);
        catStopReason = 'MAX_CREDIT_BUDGET';
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
          categoryTargetLimit: catPlan.categoryTargetLimit,
          currentValidTargetCount,
          remainingNeeded,
          validNewProductsForTarget: catValidNewCount,
          offTargetProducts: catOffTargetCount,
          unclassifiedProducts: catUnclassifiedCount,
          totalReceived: totalProcessed,
          totalNewProducts: totalNew,
          totalUpdatedProducts: totalUpdated,
          totalCreditsUsed,
          isCompleted: false,
        });
      }

      // Limite máximo de páginas para esta subcategoria
      const maxPagesForThisSub = Math.min(4, Math.max(1, Math.ceil(Math.min(subPlan.allocatedTarget, remainingNeeded) / 30)));
      let subcategoryValidNewReceived = 0;
      let consecutiveNoValidPages = 0;

      for (let page = 1; page <= maxPagesForThisSub; page++) {
        if (shouldCancel && shouldCancel()) {
          catStopReason = 'CANCELLED';
          break;
        }

        remainingNeeded = Math.max(0, catPlan.categoryTargetLimit - currentValidTargetCount);
        if (remainingNeeded <= 0) {
          catStopReason = 'TARGET_REACHED';
          break;
        }

        if (catCreditsUsed >= categoryCreditLimit) {
          catStopReason = 'MAX_CREDIT_BUDGET';
          break;
        }

        try {
          // Chamada de aquisição para a subcategoria oficial
          const res = await searchFn({
            query: subPlan.subcategory,
            page,
            region: 'BR',
            forceRefresh: true,
            collectionCategory: catPlan.category,
            collectionSubcategory: subPlan.subcategory,
          });

          catSubcategoriesConsulted++;
          subcategoriesConsulted++;
          const receivedThisPage = res.totalReceived ?? res.products?.length ?? 0;
          const creditsThisCall = res.creditsUsed || 1;

          catCreditsUsed += creditsThisCall;
          totalCreditsUsed += creditsThisCall;
          catTotalReceived += receivedThisPage;
          totalProcessed += receivedThisPage;

          // Conjunto de IDs novos inseridos nesta chamada
          const insertedIdsSet = res.insertedIds ? new Set(res.insertedIds.map(String)) : null;

          let pageValidNew = 0;
          let pageOffTarget = 0;
          let pageUnclassified = 0;
          let pageUpdated = 0;

          for (const p of res.products || []) {
            const pId = p.productId ? String(p.productId) : null;
            const isAlreadySeen = pId ? seenProductIds.has(pId) : false;
            if (pId) seenProductIds.add(pId);

            // Determinar se o produto é novo no banco de dados
            const isNew = insertedIdsSet
              ? (pId ? insertedIdsSet.has(pId) : false)
              : !isAlreadySeen;

            if (!isNew) {
              pageUpdated++;
              continue;
            }

            // Classificar estritamente usando o classificador oficial
            const classified = classifyProductFull({
              category_path: p.category,
              title: p.title,
              query_source: subPlan.subcategory,
              seller_name: p.sellerName,
            });

            if (classified.category === catPlan.category) {
              // Produto NOVO e com categoria oficial IGUAL à categoria-alvo
              pageValidNew++;
            } else if (classified.category !== null) {
              // Produto NOVO mas classificado em outra categoria válida
              pageOffTarget++;
            } else {
              // Produto NOVO com category_path NULL e sem alias seguro no título
              pageUnclassified++;
            }
          }

          // Atualizar contadores
          catValidNewCount += pageValidNew;
          catOffTargetCount += pageOffTarget;
          catUnclassifiedCount += pageUnclassified;
          catUpdatedCount += pageUpdated;
          subcategoryValidNewReceived += pageValidNew;

          const totalNewThisPage = pageValidNew + pageOffTarget + pageUnclassified;
          totalNew += totalNewThisPage;
          totalUpdated += pageUpdated;
          totalValidNewForTarget += pageValidNew;
          totalOffTarget += pageOffTarget;
          totalUnclassified += pageUnclassified;

          // Somente PRODUTOS NOVOS VÁLIDOS incrementam a base da categoria alvo e reduzem o déficit
          currentValidTargetCount += pageValidNew;
          remainingNeeded = Math.max(0, catPlan.categoryTargetLimit - currentValidTargetCount);

          if (onProgress) {
            onProgress({
              currentCategory: catPlan.category,
              currentSubcategory: subPlan.subcategory,
              categoryIndex: catIdx + 1,
              totalCategories: plans.length,
              subcategoryIndex: subIdx + 1,
              totalSubcategoriesInCategory: catPlan.subcategories.length,
              categoryTargetLimit: catPlan.categoryTargetLimit,
              currentValidTargetCount,
              remainingNeeded,
              validNewProductsForTarget: catValidNewCount,
              offTargetProducts: catOffTargetCount,
              unclassifiedProducts: catUnclassifiedCount,
              totalReceived: totalProcessed,
              totalNewProducts: totalNew,
              totalUpdatedProducts: totalUpdated,
              totalCreditsUsed,
              isCompleted: false,
            });
          }

          // Proteção contra busca improdutiva: rastreia páginas sem produtos válidos
          if (pageValidNew === 0) {
            consecutiveNoValidPages++;
            if (consecutiveNoValidPages >= 3) {
              console.log(`[Subcategory Expansion] 3 páginas consecutivas sem produtos válidos da categoria "${catPlan.category}" na subcategoria "${subPlan.subcategory}". Pulando para a próxima subcategoria.`);
              break;
            }
          } else {
            consecutiveNoValidPages = 0;
          }

          // Se a API não retornou itens ou não tem mais páginas, passa para a próxima subcategoria
          if (receivedThisPage === 0 || !res.hasMore) {
            break;
          }

          // Se atingiu a meta da categoria, finaliza
          if (remainingNeeded <= 0) {
            catStopReason = 'TARGET_REACHED';
            break;
          }

          // Pequeno intervalo preventivo de rate limit
          await new Promise((r) => setTimeout(r, 100));
        } catch (err: any) {
          const errMsg = `Erro ao coletar "${catPlan.category} > ${subPlan.subcategory}" (Página ${page}): ${err?.message || err}`;
          console.warn(`[Subcategory Expansion Warning]:`, errMsg);
          errors.push(errMsg);
          break;
        }
      }

      if (remainingNeeded <= 0) {
        catStopReason = 'TARGET_REACHED';
        break;
      }
    }

    if (remainingNeeded <= 0) {
      catStopReason = 'TARGET_REACHED';
    }

    categorySummaries.push({
      category: catPlan.category,
      initialValidCount,
      finalValidCount: currentValidTargetCount,
      categoryTargetLimit: catPlan.categoryTargetLimit,
      validNewProductsForTarget: catValidNewCount,
      offTargetProducts: catOffTargetCount,
      unclassifiedProducts: catUnclassifiedCount,
      updatedProducts: catUpdatedCount,
      totalReceived: catTotalReceived,
      creditsUsed: catCreditsUsed,
      subcategoriesConsulted: catSubcategoriesConsulted,
      stopReason: catStopReason,
    });

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
      categoryTargetLimit: lastPlan.categoryTargetLimit,
      currentValidTargetCount: lastPlan.categoryTargetLimit,
      remainingNeeded: 0,
      validNewProductsForTarget: totalValidNewForTarget,
      offTargetProducts: totalOffTarget,
      unclassifiedProducts: totalUnclassified,
      totalReceived: totalProcessed,
      totalNewProducts: totalNew,
      totalUpdatedProducts: totalUpdated,
      totalCreditsUsed,
      isCompleted: true,
      stopReason: 'COMPLETED',
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
    totalValidNewForTarget,
    totalOffTarget,
    totalUnclassified,
    totalCreditsUsed,
    categoriesCompleted,
    subcategoriesConsulted,
    subcategoriesCoverageBefore: initialCoverage,
    subcategoriesCoverageAfter: finalCoverage,
    categorySummaries,
    plans,
    errors,
  };
}
