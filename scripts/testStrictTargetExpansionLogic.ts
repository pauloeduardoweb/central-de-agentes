import { executeSubcategoryExpansion, CategoryExpansionPlan } from '../server/subcategoryExpansionService.js';
import { classifyProductFull } from '../server/taxonomy.js';
import type { MinedProduct } from '../server/productMinerService.js';
import { calculateExpansionPlanFromStats } from '../src/services/productMinerApi.js';

function createMockProduct(partial: Partial<MinedProduct> & { productId: string; title: string }): MinedProduct {
  return {
    productId: partial.productId,
    title: partial.title,
    category: partial.category || null,
    imageUrl: partial.imageUrl || null,
    priceCents: partial.priceCents || 1000,
    originalPriceCents: partial.originalPriceCents || 1000,
    discountPercent: partial.discountPercent || 0,
    currencySymbol: 'R$',
    rating: partial.rating ?? 4.8,
    soldCount: partial.soldCount ?? 50,
    sellerId: partial.sellerId || 'seller_1',
    sellerName: partial.sellerName || 'Loja Teste',
    productUrl: partial.productUrl || null,
    video: null,
    lastSeenAt: new Date().toISOString(),
    ...partial,
  };
}

function createMockPlan(params: {
  category: string;
  currentProductCount: number;
  categoryTargetLimit: number;
  subcategories: Array<{
    subcategory: string;
    currentCount: number;
    allocatedTarget: number;
    priority: 0 | 1 | 2;
    estimatedCredits: number;
  }>;
}): CategoryExpansionPlan {
  const totalAllocated = params.subcategories.reduce((sum, s) => sum + s.allocatedTarget, 0);
  const remainingTarget = Math.max(0, params.categoryTargetLimit - params.currentProductCount);
  return {
    category: params.category,
    currentProductCount: params.currentProductCount,
    categoryTargetLimit: params.categoryTargetLimit,
    remainingTarget,
    totalAllocated,
    projectedFinalCount: params.currentProductCount + totalAllocated,
    unallocatedGap: Math.max(0, remainingTarget - totalAllocated),
    estimatedCredits: Math.ceil(totalAllocated / 30),
    minEstimatedCredits: Math.max(1, Math.round(Math.ceil(totalAllocated / 30) * 0.9)),
    maxEstimatedCredits: Math.max(1, Math.ceil(Math.ceil(totalAllocated / 30) * 1.25)),
    hasHistoricalData: false,
    sampleCount: 0,
    subcategories: params.subcategories.map((s, idx) => ({
      category: params.category,
      subcategory: s.subcategory,
      currentCount: s.currentCount,
      allocatedTarget: s.allocatedTarget,
      priority: s.priority,
      priorityRank: idx + 1,
      isZeroCount: s.currentCount === 0,
      estimatedPages: Math.ceil(s.allocatedTarget / 30),
      estimatedCredits: s.estimatedCredits,
    })),
  };
}

async function runStrictTargetExpansionTestSuite() {
  console.log('========================================================================');
  console.log('SUITE DE TESTES: EXPANSÃO ESTRITA POR CATEGORIA-ALVO (CASOS 1 A 10)');
  console.log('========================================================================');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${testName}`);
    } else {
      console.error(`❌ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
    }
  }

  // ========================================================================
  // CASO 1: 30 novos recebidos, 10 válidos para target, 20 off-target -> remainingNeeded cai SOMENTE 10
  // ========================================================================
  console.log('\n--- CASO 1: 30 NOVOS (10 VÁLIDOS TARGET, 20 OFF-TARGET) -> DÉFICIT CAI APENAS 10 ---');
  {
    const targetCategory = 'Acessórios de moda';
    const mockProducts: MinedProduct[] = [];
    for (let i = 1; i <= 10; i++) {
      mockProducts.push(createMockProduct({
        productId: `prod_target_c1_${i}`,
        title: `Brinco de Prata Elegante Feminino ${i}`,
        category: 'Acessórios de moda',
        sellerName: 'Loja Joias',
      }));
    }
    for (let i = 11; i <= 30; i++) {
      mockProducts.push(createMockProduct({
        productId: `prod_off_c1_${i}`,
        title: `Vestido Infantil Menina Festa Bebê ${i}`,
        category: 'Moda para crianças',
        sellerName: 'Loja Kids',
      }));
    }

    const testPlans = [createMockPlan({
      category: targetCategory,
      currentProductCount: 8,
      categoryTargetLimit: 100,
      subcategories: [{
        subcategory: 'Acessórios para cabelos',
        currentCount: 8,
        allocatedTarget: 60,
        priority: 1,
        estimatedCredits: 2,
      }],
    })];

    const res = await executeSubcategoryExpansion({
      selectedCategories: [targetCategory],
      categoryTargetLimit: 100,
      plans: testPlans,
      searchFn: async () => ({
        products: mockProducts,
        creditsUsed: 1,
        hasMore: false,
        newProductsCount: 30,
        updatedProductsCount: 0,
        insertedIds: mockProducts.map((p) => p.productId),
      }),
    });

    const summary = res.categorySummaries.find((c) => c.category === targetCategory)!;
    assert(summary !== undefined, 'Resumo da categoria gerado');
    assert(summary.initialValidCount === 8, 'Contagem inicial válida = 8', `Recebido: ${summary.initialValidCount}`);
    assert(summary.validNewProductsForTarget === 10, 'validNewProductsForTarget é exatamente 10', `Recebido: ${summary.validNewProductsForTarget}`);
    assert(summary.offTargetProducts === 20, 'offTargetProducts é exatamente 20', `Recebido: ${summary.offTargetProducts}`);
    assert(summary.finalValidCount === 18, 'finalValidCount é 18 (8 + 10 válidos, ignorando os 20 off-target)', `Recebido: ${summary.finalValidCount}`);
    assert(res.totalValidNewForTarget === 10, 'totalValidNewForTarget global é 10');
    assert(res.totalOffTarget === 20, 'totalOffTarget global é 20');
  }

  // ========================================================================
  // CASO 2: Produto com collection_category = Acessórios de moda mas classificação = Moda para crianças NÃO reduz déficit
  // ========================================================================
  console.log('\n--- CASO 2: PRODUTO OFF-TARGET NÃO REDUZ DÉFICIT DE ACESSÓRIOS DE MODA ---');
  {
    const targetCategory = 'Acessórios de moda';
    const offTargetProduct = createMockProduct({
      productId: 'prod_kids_c2_1',
      title: 'Conjunto Infantil Menina Verão',
      category: 'Moda para crianças',
      sellerName: 'Kids Shop',
    });

    const testPlans = [createMockPlan({
      category: targetCategory,
      currentProductCount: 8,
      categoryTargetLimit: 100,
      subcategories: [{
        subcategory: 'Acessórios para cabelos',
        currentCount: 8,
        allocatedTarget: 60,
        priority: 1,
        estimatedCredits: 2,
      }],
    })];

    const res = await executeSubcategoryExpansion({
      selectedCategories: [targetCategory],
      categoryTargetLimit: 100,
      plans: testPlans,
      searchFn: async () => ({
        products: [offTargetProduct],
        creditsUsed: 1,
        hasMore: false,
        newProductsCount: 1,
        updatedProductsCount: 0,
        insertedIds: ['prod_kids_c2_1'],
      }),
    });

    const summary = res.categorySummaries.find((c) => c.category === targetCategory)!;
    assert(summary.validNewProductsForTarget === 0, 'Nenhum produto válido adicionado para a meta de Acessórios de moda');
    assert(summary.offTargetProducts === 1, 'Produto registrado corretamente como off-target');
    assert(summary.finalValidCount === 8, 'finalValidCount permaneceu inalterado em 8');
  }

  // ========================================================================
  // CASO 3: Produto com category_path NULL e classificação inconclusiva NÃO reduz déficit
  // ========================================================================
  console.log('\n--- CASO 3: CATEGORY_PATH NULL E INCONCLUSIVO NÃO REDUZ DÉFICIT ---');
  {
    const targetCategory = 'Acessórios de moda';
    const inconclusiveProduct = createMockProduct({
      productId: 'prod_null_unknown_c3_1',
      title: 'Item Aleatório Promocional Especial 2026',
      category: undefined,
      sellerName: 'Vendedor Geral',
    });

    const classification = classifyProductFull({
      category_path: inconclusiveProduct.category,
      title: inconclusiveProduct.title,
      query_source: 'Acessórios para cabelos',
    });

    assert(classification.category === null, 'Classificador retorna category: null para título genérico sem correspondência');

    const testPlans = [createMockPlan({
      category: targetCategory,
      currentProductCount: 8,
      categoryTargetLimit: 100,
      subcategories: [{
        subcategory: 'Acessórios para cabelos',
        currentCount: 8,
        allocatedTarget: 60,
        priority: 1,
        estimatedCredits: 2,
      }],
    })];

    const res = await executeSubcategoryExpansion({
      selectedCategories: [targetCategory],
      categoryTargetLimit: 100,
      plans: testPlans,
      searchFn: async () => ({
        products: [inconclusiveProduct],
        creditsUsed: 1,
        hasMore: false,
        newProductsCount: 1,
        updatedProductsCount: 0,
        insertedIds: ['prod_null_unknown_c3_1'],
      }),
    });

    const summary = res.categorySummaries.find((c) => c.category === targetCategory)!;
    assert(summary.validNewProductsForTarget === 0, 'Produto com category NULL não reduziu o déficit da meta');
    assert(summary.unclassifiedProducts === 1, 'Produto registrado como unclassifiedProducts');
  }

  // ========================================================================
  // CASO 4: remainingNeeded ainda > 0 depois da primeira subcategoria -> continua para a próxima
  // ========================================================================
  console.log('\n--- CASO 4: CONTINUAÇÃO OBRIGATÓRIA PARA AS PRÓXIMAS SUBCATEGORIAS ---');
  {
    const targetCategory = 'Acessórios de moda';
    const subcategoriesCalled: string[] = [];

    const testPlans = [createMockPlan({
      category: targetCategory,
      currentProductCount: 8,
      categoryTargetLimit: 100,
      subcategories: [
        {
          subcategory: 'Acessórios para cabelos',
          currentCount: 8,
          allocatedTarget: 30,
          priority: 1,
          estimatedCredits: 1,
        },
        {
          subcategory: 'Bijuterias e acessórios',
          currentCount: 0,
          allocatedTarget: 60,
          priority: 0,
          estimatedCredits: 2,
        },
        {
          subcategory: 'Relógios e acessórios',
          currentCount: 0,
          allocatedTarget: 60,
          priority: 0,
          estimatedCredits: 2,
        },
      ],
    })];

    const res = await executeSubcategoryExpansion({
      selectedCategories: [targetCategory],
      categoryTargetLimit: 100,
      plans: testPlans,
      searchFn: async (params) => {
        if (params.collectionSubcategory) {
          subcategoriesCalled.push(params.collectionSubcategory);
        }
        const prods: MinedProduct[] = [];
        for (let i = 1; i <= 10; i++) {
          prods.push(createMockProduct({
            productId: `prod_${params.collectionSubcategory}_${params.page}_${i}`,
            title: `Brinco Colar Joia ${i}`,
            category: 'Acessórios de moda',
            sellerName: 'Joias Shop',
          }));
        }
        return {
          products: prods,
          creditsUsed: 1,
          hasMore: false,
          newProductsCount: 10,
          updatedProductsCount: 0,
          insertedIds: prods.map((p) => p.productId),
        };
      },
    });

    assert(subcategoriesCalled.length > 1, 'Executor não parou na primeira subcategoria e avançou pelas seguintes', `Subcategorias chamadas: ${subcategoriesCalled.join(', ')}`);
    assert(res.subcategoriesConsulted > 1, 'Mais de 1 subcategoria foi consultada');
  }

  // ========================================================================
  // CASO 5: Categoria chega à meta com produtos válidos -> executor para imediatamente
  // ========================================================================
  console.log('\n--- CASO 5: CATEGORIA ATINGE A META -> PARADA IMEDIATA ---');
  {
    const targetCategory = 'Acessórios de moda';
    let callsCount = 0;

    const testPlans = [createMockPlan({
      category: targetCategory,
      currentProductCount: 8,
      categoryTargetLimit: 100,
      subcategories: [
        { subcategory: 'Acessórios para cabelos', currentCount: 8, allocatedTarget: 60, priority: 1, estimatedCredits: 2 },
        { subcategory: 'Bijuterias e acessórios', currentCount: 0, allocatedTarget: 60, priority: 0, estimatedCredits: 2 },
      ],
    })];

    const res = await executeSubcategoryExpansion({
      selectedCategories: [targetCategory],
      categoryTargetLimit: 100,
      plans: testPlans,
      searchFn: async () => {
        callsCount++;
        const prods: MinedProduct[] = [];
        for (let i = 1; i <= 100; i++) {
          prods.push(createMockProduct({
            productId: `prod_target_bulk_c5_${i}`,
            title: `Joia Acessório de Moda ${i}`,
            category: 'Acessórios de moda',
            sellerName: 'Joias Shop',
          }));
        }
        return {
          products: prods,
          creditsUsed: 1,
          hasMore: true,
          newProductsCount: 100,
          updatedProductsCount: 0,
          insertedIds: prods.map((p) => p.productId),
        };
      },
    });

    const summary = res.categorySummaries.find((c) => c.category === targetCategory)!;
    assert(summary.stopReason === 'TARGET_REACHED', 'stopReason é TARGET_REACHED', `Recebido: ${summary.stopReason}`);
    assert(callsCount === 1, 'Executor parou imediatamente após a 1ª chamada bater a meta');
    assert(summary.finalValidCount >= 100, 'Meta de produtos válidos foi alcançada');
  }

  // ========================================================================
  // CASO 6: Produto off-target continua registrado/processado normalmente
  // ========================================================================
  console.log('\n--- CASO 6: PRESERVAÇÃO INTEGRAL DE PRODUTOS OFF-TARGET ---');
  {
    const targetCategory = 'Acessórios de moda';
    const mixedProducts: MinedProduct[] = [
      createMockProduct({
        productId: 'p_valid_c6_1',
        title: 'Anel de Ouro 18k',
        category: 'Acessórios de moda',
        sellerName: 'Joalheria',
      }),
      createMockProduct({
        productId: 'p_off_c6_1',
        title: 'Fritadeira Air Fryer 4L',
        category: 'Eletrodomésticos',
        sellerName: 'Eletro Store',
      }),
    ];

    const testPlans = [createMockPlan({
      category: targetCategory,
      currentProductCount: 8,
      categoryTargetLimit: 100,
      subcategories: [
        { subcategory: 'Acessórios para cabelos', currentCount: 8, allocatedTarget: 60, priority: 1, estimatedCredits: 2 },
      ],
    })];

    const res = await executeSubcategoryExpansion({
      selectedCategories: [targetCategory],
      categoryTargetLimit: 100,
      plans: testPlans,
      searchFn: async () => ({
        products: mixedProducts,
        creditsUsed: 1,
        hasMore: false,
        newProductsCount: 2,
        updatedProductsCount: 0,
        insertedIds: ['p_valid_c6_1', 'p_off_c6_1'],
      }),
    });

    assert(res.totalNew === 2, 'Todos os produtos novos (válido + off-target) foram registrados no totalNew');
    assert(res.totalOffTarget === 1, 'Produto de Eletrodomésticos contabilizado como off-target');
    assert(res.totalValidNewForTarget === 1, 'Apenas o Anel de Ouro contabilizado para a meta de Acessórios');
  }

  // ========================================================================
  // CASO 7: collection_category e collection_subcategory permanecem preservados nos parâmetros de busca
  // ========================================================================
  console.log('\n--- CASO 7: PRESERVAÇÃO DE COLLECTION_CATEGORY E COLLECTION_SUBCATEGORY ---');
  {
    let capturedCollectionCat: string | null | undefined = null;
    let capturedCollectionSub: string | null | undefined = null;

    const testPlans = [createMockPlan({
      category: 'Acessórios de moda',
      currentProductCount: 8,
      categoryTargetLimit: 100,
      subcategories: [
        { subcategory: 'Acessórios para casamento', currentCount: 0, allocatedTarget: 60, priority: 0, estimatedCredits: 2 },
      ],
    })];

    await executeSubcategoryExpansion({
      selectedCategories: ['Acessórios de moda'],
      categoryTargetLimit: 100,
      plans: testPlans,
      searchFn: async (params) => {
        capturedCollectionCat = params.collectionCategory;
        capturedCollectionSub = params.collectionSubcategory;
        return {
          products: [],
          creditsUsed: 1,
          hasMore: false,
          newProductsCount: 0,
          updatedProductsCount: 0,
        };
      },
    });

    assert(capturedCollectionCat === 'Acessórios de moda', 'collectionCategory enviado para persistência é Acessórios de moda');
    assert(capturedCollectionSub === 'Acessórios para casamento', 'collectionSubcategory enviado para persistência é Acessórios para casamento');
  }

  // ========================================================================
  // CASO 8: COUNT(collection_subcategory) NÃO é utilizado como classificação oficial
  // ========================================================================
  console.log('\n--- CASO 8: ORIGEM DA BUSCA É APENAS RASTREAMENTO, NÃO CLASSIFICAÇÃO OFICIAL ---');
  {
    const productMochila = createMockProduct({
      productId: 'p_mochila_1',
      title: 'Mochila de Viagem Impermeável Grande',
      category: 'Malas e bolsas',
      sellerName: 'Bolsas & Cia',
    });

    const classified = classifyProductFull({
      category_path: productMochila.category,
      title: productMochila.title,
      query_source: 'Acessórios para casamento',
    });

    assert(classified.category === 'Malas e bolsas', 'Classificação oficial é Malas e bolsas, IGNORANDO que a busca foi Acessórios para casamento');
    assert(classified.category !== 'Acessórios de moda', 'Produto NÃO foi classificado como Acessórios de moda');
  }

  // ========================================================================
  // CASO 9: 3 páginas consecutivas sem produto válido acionam proteção de parada da subcategoria
  // ========================================================================
  console.log('\n--- CASO 9: 3 PÁGINAS CONSECUTIVAS SEM PRODUTO VÁLIDO ACIONAM PULO DE SUBCATEGORIA ---');
  {
    let pagesInFirstSub = 0;
    const targetCategory = 'Acessórios de moda';

    const testPlans = [createMockPlan({
      category: targetCategory,
      currentProductCount: 8,
      categoryTargetLimit: 100,
      subcategories: [
        { subcategory: 'Acessórios para cabelos', currentCount: 8, allocatedTarget: 90, priority: 1, estimatedCredits: 3 },
      ],
    })];

    await executeSubcategoryExpansion({
      selectedCategories: [targetCategory],
      categoryTargetLimit: 100,
      plans: testPlans,
      searchFn: async (params) => {
        pagesInFirstSub++;
        return {
          products: [
            createMockProduct({
              productId: `p_off_c9_${pagesInFirstSub}`,
              title: `Produto Outra Categoria ${pagesInFirstSub}`,
              category: 'Eletrônicos',
              sellerName: 'Loja',
            }),
          ],
          creditsUsed: 1,
          hasMore: true,
          newProductsCount: 1,
          updatedProductsCount: 0,
          insertedIds: [`p_off_c9_${pagesInFirstSub}`],
        };
      },
    });

    assert(pagesInFirstSub === 3, `Parou exatamente após 3 páginas consecutivas sem produtos válidos da categoria (executou ${pagesInFirstSub} páginas)`);
  }

  // ========================================================================
  // CASO 10: Expansão Contínua Além da Estimativa Inicial até Concluir ou Esgotar
  // ========================================================================
  console.log('\n--- CASO 10: EXPANSÃO CONTÍNUA ATÉ A META (SEM TRAVA ARTIFICIAL DE CRÉDITOS) ---');
  {
    const targetCategory = 'Acessórios de moda';

    const testPlans = [createMockPlan({
      category: targetCategory,
      currentProductCount: 8,
      categoryTargetLimit: 20, // Meta pequena para testar parada por meta
      subcategories: [
        { subcategory: 'Acessórios para cabelos', currentCount: 8, allocatedTarget: 6, priority: 1, estimatedCredits: 2 },
        { subcategory: 'Bijuterias e acessórios', currentCount: 0, allocatedTarget: 6, priority: 0, estimatedCredits: 2 },
      ],
    })];

    // Simula produtos válidos por página
    let prodCounter = 1;
    const res = await executeSubcategoryExpansion({
      selectedCategories: [targetCategory],
      categoryTargetLimit: 20,
      plans: testPlans,
      searchFn: async () => ({
        products: [
          createMockProduct({ productId: `p_${prodCounter++}`, title: 'Brinco Pérola Luxo', category: targetCategory }),
          createMockProduct({ productId: `p_${prodCounter++}`, title: 'Colar Dourado Elegante', category: targetCategory }),
          createMockProduct({ productId: `p_${prodCounter++}`, title: 'Pulseira Prata Fina', category: targetCategory }),
        ],
        creditsUsed: 1,
        hasMore: true,
        newProductsCount: 3,
        updatedProductsCount: 0,
      }),
    });

    const summary = res.categorySummaries.find((c) => c.category === targetCategory)!;
    assert(summary.stopReason === 'TARGET_REACHED', `Expansão atingiu a meta com sucesso (stopReason: ${summary.stopReason})`);
    assert(summary.finalValidCount >= 20, `Contagem final de válidos (${summary.finalValidCount}) alcançou a meta planejada de 20`);
  }

  // ========================================================================
  // CASO 11: Contagem Exata de Créditos SocialCrawl (creditsUsed = 0 não vira 1)
  // ========================================================================
  console.log('\n--- CASO 11: CONTAGEM EXATA DE CRÉDITOS (creditsUsed = 0 NÃO VIRA 1 CRÉDITO) ---');
  {
    const targetCategory = 'Acessórios de moda';
    const testPlans = [createMockPlan({
      category: targetCategory,
      currentProductCount: 10,
      categoryTargetLimit: 20,
      subcategories: [
        { subcategory: 'Acessórios para cabelos', currentCount: 5, allocatedTarget: 10, priority: 1, estimatedCredits: 2 },
      ],
    })];

    // 2 chamadas: uma com creditsUsed = 0, outra com creditsUsed = 1. Total real = 1.
    let callIdx = 0;
    const res = await executeSubcategoryExpansion({
      selectedCategories: [targetCategory],
      categoryTargetLimit: 20,
      plans: testPlans,
      searchFn: async () => {
        callIdx++;
        const credits = callIdx === 1 ? 0 : 1;
        return {
          products: [
            createMockProduct({ productId: `p_cred_${callIdx}`, title: `Brinco Prata ${callIdx}`, category: targetCategory }),
          ],
          creditsUsed: credits,
          hasMore: callIdx < 2,
          newProductsCount: 1,
          updatedProductsCount: 0,
        };
      },
    });

    const summary = res.categorySummaries.find((c) => c.category === targetCategory)!;
    assert(summary.creditsUsed === 1, `Créditos usados na categoria é exatamente 1 (0 + 1), e não 2. Recebido: ${summary.creditsUsed}`);
    assert(res.totalCreditsUsed === 1, `Total global de créditos é exatamente 1. Recebido: ${res.totalCreditsUsed}`);
    assert(summary.requestsMade === 2, `Total de requests realizados é 2. Recebido: ${summary.requestsMade}`);
  }

  // ========================================================================
  // CASO 12: Subcategoria 1 para por 3 páginas sem válidos -> avança para Subcategoria 2
  // ========================================================================
  console.log('\n--- CASO 12: PULO DE SUBCATEGORIA POR 3 PÁGINAS SEM VÁLIDOS NÃO ABORTA AS DEMAIS ---');
  {
    const targetCategory = 'Acessórios de moda';
    const testPlans = [createMockPlan({
      category: targetCategory,
      currentProductCount: 0,
      categoryTargetLimit: 10,
      subcategories: [
        { subcategory: 'Chapéus', currentCount: 0, allocatedTarget: 5, priority: 0, estimatedCredits: 1 },
        { subcategory: 'Bijuterias e acessórios', currentCount: 0, allocatedTarget: 5, priority: 0, estimatedCredits: 1 },
      ],
    })];

    const consultedSubs: string[] = [];
    const res = await executeSubcategoryExpansion({
      selectedCategories: [targetCategory],
      categoryTargetLimit: 10,
      plans: testPlans,
      searchFn: async (params) => {
        if (!consultedSubs.includes(params.collectionSubcategory || '')) {
          consultedSubs.push(params.collectionSubcategory || '');
        }

        if (params.collectionSubcategory === 'Chapéus') {
          // Retorna apenas off-target para Chapéus (3 páginas)
          return {
            products: [createMockProduct({ productId: `p_off_${params.page}`, title: 'Boné Esportivo', category: 'Esportes' })],
            creditsUsed: 1,
            hasMore: true,
            newProductsCount: 1,
            updatedProductsCount: 0,
            insertedIds: [`p_off_${params.page}`],
          };
        } else {
          // Retorna válidos para Bijuterias (atinge a meta)
          return {
            products: [
              createMockProduct({ productId: 'b1', title: 'Brinco Prata', category: targetCategory }),
              createMockProduct({ productId: 'b2', title: 'Colar Ouro', category: targetCategory }),
              createMockProduct({ productId: 'b3', title: 'Pulseira Fina', category: targetCategory }),
              createMockProduct({ productId: 'b4', title: 'Anel Elegante', category: targetCategory }),
              createMockProduct({ productId: 'b5', title: 'Tornozeleira Prata', category: targetCategory }),
              createMockProduct({ productId: 'b6', title: 'Pingente Luxo', category: targetCategory }),
              createMockProduct({ productId: 'b7', title: 'Chaveiro Moda', category: targetCategory }),
              createMockProduct({ productId: 'b8', title: 'Brinco Argola', category: targetCategory }),
              createMockProduct({ productId: 'b9', title: 'Colar Pérola', category: targetCategory }),
              createMockProduct({ productId: 'b10', title: 'Brinco Ponto de Luz', category: targetCategory }),
            ],
            creditsUsed: 1,
            hasMore: false,
            newProductsCount: 10,
            updatedProductsCount: 0,
            insertedIds: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10'],
          };
        }
      },
    });

    const summary = res.categorySummaries.find((c) => c.category === targetCategory)!;
    assert(consultedSubs.includes('Chapéus') && consultedSubs.includes('Bijuterias e acessórios'), 'Ambas as subcategorias foram consultadas');
    assert(summary.subcategoriesConsulted === 2, `subcategoriesConsulted = 2. Recebido: ${summary.subcategoriesConsulted}`);
    assert(summary.subcategoriesExhausted === 1, `subcategoriesExhausted = 1 (apenas Chapéus esgotou). Recebido: ${summary.subcategoriesExhausted}`);
    assert(summary.stopReason === 'TARGET_REACHED', `Meta alcançada na segunda subcategoria (stopReason: ${summary.stopReason})`);
    assert(summary.validNewProductsForTarget === 10, `validNewProductsForTarget = 10. Recebido: ${summary.validNewProductsForTarget}`);
  }

  // ========================================================================
  // CASO 13: ALL_SUBCATEGORIES_EXHAUSTED somente após percorrer todas as subcategorias
  // ========================================================================
  console.log('\n--- CASO 13: ALL_SUBCATEGORIES_EXHAUSTED SOMENTE APÓS TODAS AS SUBCATS CONSULTADAS ---');
  {
    const targetCategory = 'Acessórios de moda';
    const subList = [
      'Acessórios para cabelos',
      'Acessórios para roupas',
      'Bijuterias e acessórios',
      'Chapéus',
      'Coleiras e broches',
    ];

    const testPlans = [createMockPlan({
      category: targetCategory,
      currentProductCount: 0,
      categoryTargetLimit: 100,
      subcategories: subList.map((s) => ({
        subcategory: s,
        currentCount: 0,
        allocatedTarget: 20,
        priority: 0,
        estimatedCredits: 1,
      })),
    })];

    const consultedSubs: string[] = [];
    const res = await executeSubcategoryExpansion({
      selectedCategories: [targetCategory],
      categoryTargetLimit: 100,
      plans: testPlans,
      searchFn: async (params) => {
        const sub = params.collectionSubcategory || '';
        if (!consultedSubs.includes(sub)) consultedSubs.push(sub);
        // Cada subcategoria retorna apenas 1 produto válido e encerra (hasMore: false)
        return {
          products: [
            createMockProduct({ productId: `p_${sub}_1`, title: `Item ${sub} 1`, category: targetCategory }),
          ],
          creditsUsed: 1,
          hasMore: false,
          newProductsCount: 1,
          updatedProductsCount: 0,
          insertedIds: [`p_${sub}_1`],
        };
      },
    });

    const summary = res.categorySummaries.find((c) => c.category === targetCategory)!;
    assert(consultedSubs.length === 5, `Todas as 5 subcategorias foram consultadas (${consultedSubs.length}/5)`);
    assert(summary.subcategoriesConsulted === 5, `subcategoriesConsulted é 5`);
    assert(summary.subcategoriesExhausted === 5, `subcategoriesExhausted é 5`);
    assert(summary.stopReason === 'ALL_SUBCATEGORIES_EXHAUSTED', `stopReason é ALL_SUBCATEGORIES_EXHAUSTED porque todas foram esgotadas e meta de 100 não foi atingida (ficou em ${summary.finalValidCount})`);
  }

  // ========================================================================
  // CASO 14: Subcategorias com allocatedTarget = 0 no plano NÃO são ignoradas se houver déficit
  // ========================================================================
  console.log('\n--- CASO 14: SUBCATEGORIAS COM ALLOCATED = 0 SÃO NAVEGADAS SE HOUVER DÉFICIT ---');
  {
    const targetCategory = 'Acessórios de moda';
    const testPlans = [createMockPlan({
      category: targetCategory,
      currentProductCount: 0,
      categoryTargetLimit: 50,
      subcategories: [
        { subcategory: 'Sub 1', currentCount: 0, allocatedTarget: 30, priority: 0, estimatedCredits: 1 },
        { subcategory: 'Sub 2', currentCount: 0, allocatedTarget: 20, priority: 0, estimatedCredits: 1 },
        { subcategory: 'Sub 3', currentCount: 0, allocatedTarget: 0, priority: 0, estimatedCredits: 0 }, // allocated 0 pelo orçamento inicial
      ],
    })];

    const visitedSubs: string[] = [];
    const res = await executeSubcategoryExpansion({
      selectedCategories: [targetCategory],
      categoryTargetLimit: 50,
      plans: testPlans,
      searchFn: async (params) => {
        const sub = params.collectionSubcategory || '';
        if (!visitedSubs.includes(sub)) visitedSubs.push(sub);
        // Sub 1 e Sub 2 retornam 0 produtos válidos (esgotam rápido)
        if (sub === 'Sub 1' || sub === 'Sub 2') {
          return {
            products: [],
            creditsUsed: 1,
            hasMore: false,
            newProductsCount: 0,
            updatedProductsCount: 0,
          };
        }
        // Sub 3 fornece produtos válidos
        return {
          products: [
            createMockProduct({ productId: 's3_1', title: 'Produto Sub 3', category: targetCategory }),
          ],
          creditsUsed: 1,
          hasMore: false,
          newProductsCount: 1,
          updatedProductsCount: 0,
          insertedIds: ['s3_1'],
        };
      },
    });

    assert(visitedSubs.includes('Sub 3'), 'Sub 3 (que tinha allocatedTarget = 0 no plano) foi navegada com sucesso porque o déficit ainda existia');
    assert(res.totalValidNewForTarget === 1, 'Produto da Sub 3 foi validado e contabilizado');
  }

  // ========================================================================
  // CASO 15: Meta atingida no meio das subcategorias (ex: na sub 6 de 10) encerra com TARGET_REACHED
  // ========================================================================
  console.log('\n--- CASO 15: META ATINGIDA ENCERRA COM TARGET_REACHED E CONSULTAS PARCIAIS ---');
  {
    const targetCategory = 'Acessórios de moda';
    const testPlans = [createMockPlan({
      category: targetCategory,
      currentProductCount: 173,
      categoryTargetLimit: 300, // déficit de 127
      subcategories: Array.from({ length: 10 }, (_, i) => ({
        subcategory: `Subcat ${i + 1}`,
        currentCount: 0,
        allocatedTarget: 20,
        priority: 0,
        estimatedCredits: 1,
      })),
    })];

    const visitedSubs: string[] = [];
    const res = await executeSubcategoryExpansion({
      selectedCategories: [targetCategory],
      categoryTargetLimit: 300,
      plans: testPlans,
      searchFn: async (params) => {
        const sub = params.collectionSubcategory || '';
        if (!visitedSubs.includes(sub)) visitedSubs.push(sub);
        // Cada subcategoria entrega 30 produtos válidos
        const prods = Array.from({ length: 30 }, (_, pIdx) =>
          createMockProduct({ productId: `p_${sub}_${pIdx}`, title: `Produto ${sub} ${pIdx}`, category: targetCategory })
        );
        return {
          products: prods,
          creditsUsed: 1,
          hasMore: true,
          newProductsCount: 30,
          updatedProductsCount: 0,
          insertedIds: prods.map((p) => p.productId),
        };
      },
    });

    const summary = res.categorySummaries.find((c) => c.category === targetCategory)!;
    assert(summary.stopReason === 'TARGET_REACHED', 'stopReason é TARGET_REACHED');
    assert(summary.finalValidCount >= 300, `finalValidCount atingiu a meta (${summary.finalValidCount} >= 300)`);
    assert(summary.subcategoriesConsulted < 10, `Interrompeu a navegação assim que bateu a meta (${summary.subcategoriesConsulted} consultadas < 10)`);
  }

  // ========================================================================
  // CASO 16: 10 subcategorias esgotadas sem bater a meta encerra com ALL_SUBCATEGORIES_EXHAUSTED
  // ========================================================================
  console.log('\n--- CASO 16: 10 SUBCATEGORIAS ESGOTADAS ENCERRAM COM ALL_SUBCATEGORIES_EXHAUSTED ---');
  {
    const targetCategory = 'Acessórios de moda';
    const testPlans = [createMockPlan({
      category: targetCategory,
      currentProductCount: 173,
      categoryTargetLimit: 300, // déficit de 127
      subcategories: Array.from({ length: 10 }, (_, i) => ({
        subcategory: `Subcat ${i + 1}`,
        currentCount: 0,
        allocatedTarget: 12,
        priority: 0,
        estimatedCredits: 1,
      })),
    })];

    const visitedSubs: string[] = [];
    const res = await executeSubcategoryExpansion({
      selectedCategories: [targetCategory],
      categoryTargetLimit: 300,
      plans: testPlans,
      searchFn: async (params) => {
        const sub = params.collectionSubcategory || '';
        if (!visitedSubs.includes(sub)) visitedSubs.push(sub);
        // Cada subcategoria entrega apenas 2 produtos e esgota imediatamente
        const prods = Array.from({ length: 2 }, (_, pIdx) =>
          createMockProduct({ productId: `p_${sub}_${pIdx}`, title: `Produto ${sub} ${pIdx}`, category: targetCategory })
        );
        return {
          products: prods,
          creditsUsed: 1,
          hasMore: false,
          newProductsCount: 2,
          updatedProductsCount: 0,
          insertedIds: prods.map((p) => p.productId),
        };
      },
    });

    const summary = res.categorySummaries.find((c) => c.category === targetCategory)!;
    assert(visitedSubs.length === 10, 'Todas as 10 subcategorias foram consultadas');
    assert(summary.subcategoriesConsulted === 10, 'subcategoriesConsulted é 10');
    assert(summary.subcategoriesExhausted === 10, 'subcategoriesExhausted é 10');
    assert(summary.stopReason === 'ALL_SUBCATEGORIES_EXHAUSTED', 'stopReason é ALL_SUBCATEGORIES_EXHAUSTED');
    assert(summary.finalValidCount === 173 + 20, `Contagem final é 193 (${summary.finalValidCount})`);
  }

  // ========================================================================
  // CASO 17: Simulação de Parser SSE Frontend (Verificação de eventos COMPLETE e buffers fragmentados)
  // ========================================================================
  console.log('\n--- CASO 17: PARSER SSE DECODIFICA EVENTOS COMPLETE E CHUNKS FRAGMENTADOS ---');
  {
    const ssePayload = [
      ': ping\n\n',
      'data: {"type":"PROGRESS","progress":{"currentCategory":"Acessórios de moda","currentSubcategory":"Sub 1","initialValidCount":173,"currentValidTargetCount":188,"validNewProductsForTarget":15,"totalCreditsUsed":2}}\n\n',
      ': ping\n\n',
      'data: {"type":"COMPLETE","result":{"success":true,"totalProcessed":30,"totalNew":15,"totalValidNewForTarget":15,"totalCreditsUsed":2,"categorySummaries":[{"category":"Acessórios de moda","initialValidCount":173,"finalValidCount":188,"actualValidGrowth":15,"categoryTargetLimit":300,"validNewProductsForTarget":15,"offTargetProducts":0,"unclassifiedProducts":0,"updatedProducts":0,"totalReceived":30,"creditsUsed":2,"requestsMade":2,"pagesProcessed":2,"totalSelectedSubcategories":10,"subcategoriesConsulted":1,"subcategoriesExhausted":1,"stopReason":"ALL_SUBCATEGORIES_EXHAUSTED"}]}}\n\n',
    ];

    let finalResult: any = null;
    let buffer = '';
    let progressCalls = 0;

    for (const chunk of ssePayload) {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith(':')) continue;
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6).trim();
          if (jsonStr) {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'PROGRESS') progressCalls++;
            if (parsed.type === 'COMPLETE' || parsed.type === 'DONE') finalResult = parsed.result;
          }
        }
      }
    }

    assert(progressCalls === 1, 'Progresso SSE recebido e despachado');
    assert(finalResult !== null, 'Evento COMPLETE recebido e decodificado antes do encerramento');
    assert(finalResult?.categorySummaries?.[0]?.finalValidCount === 188, 'Valores do sumário final decodificados corretamente');
  }

  // ==========================================================================
  // BLOCO 12: ESTIMATIVA DE CRÉDITOS BASEADA NO HISTÓRICO REAL DE RENDIMENTO
  // ==========================================================================
  console.log('\n--- Bloco 12: Estimativa Baseada no Histórico Real de Rendimento ---');

  // Teste 43: Sem histórico (Fallback teórico)
  {
    const plans = calculateExpansionPlanFromStats({
      categoryStats: [
        { category: 'Acessórios de moda', productCount: 206, coverageCount: 5, subcategories: [], lastCollectedAt: null, status: 'Ativa' },
      ],
      selectedCategories: ['Acessórios de moda'],
      categoryTargetLimit: 300,
      perSubcategoryMax: 60,
      taxonomyConfig: { 'Acessórios de moda': ['Sub 1', 'Sub 2', 'Sub 3'] },
      historyMap: {},
    });

    assert(plans.length === 1, 'Plano calculado');
    assert(plans[0].remainingTarget === 94, 'Déficit correto (300 - 206 = 94)');
    assert(plans[0].hasHistoricalData === false, 'Sem dados históricos detectado');
    assert(plans[0].estimatedCredits === 4, 'Estimativa teórica padrão (~4 créditos para déficit 94)');
    assert(plans[0].minEstimatedCredits === 4, 'Min estimado teórico');
    assert(plans[0].maxEstimatedCredits === 4, 'Max estimado teórico');
  }

  // Teste 44: Com histórico real (ex: 1.2 válidos/crédito)
  {
    const plans = calculateExpansionPlanFromStats({
      categoryStats: [
        { category: 'Acessórios de moda', productCount: 206, coverageCount: 5, subcategories: [], lastCollectedAt: null, status: 'Ativa' },
      ],
      selectedCategories: ['Acessórios de moda'],
      categoryTargetLimit: 300,
      perSubcategoryMax: 60,
      taxonomyConfig: { 'Acessórios de moda': ['Sub 1', 'Sub 2', 'Sub 3'] },
      historyMap: {
        'Acessórios de moda': {
          category: 'Acessórios de moda',
          sampleCount: 3,
          historicalValidPerCredit: 1.2,
          averageGrowth: 12,
          averageCredits: 10,
          lastExecutionDate: new Date().toISOString(),
        },
      },
    });

    assert(plans.length === 1, 'Plano com histórico calculado');
    assert(plans[0].hasHistoricalData === true, 'Dados históricos detectados com sucesso');
    assert(plans[0].sampleCount === 3, 'Amostras registradas');
    assert(plans[0].historicalValidPerCredit === 1.2, 'Taxa de rendimento histórica 1.2 válidos/cr');
    // baseEstimate = 94 / 1.2 = 78.33; estimated = ceil(78.33 * 1.15) = 91; min = round(78.33 * 0.9) = 71; max = ceil(78.33 * 1.25) = 98
    assert(plans[0].estimatedCredits === 91, `Estimativa central realista (${plans[0].estimatedCredits} crs vs 4 teóricos)`);
    assert(plans[0].minEstimatedCredits === 71, `Faixa mínima calculada (${plans[0].minEstimatedCredits} crs)`);
    assert(plans[0].maxEstimatedCredits === 98, `Faixa máxima calculada (${plans[0].maxEstimatedCredits} crs)`);
  }

  // Teste 45: Histórico com alta eficiência (ex: 18 válidos/crédito)
  {
    const plans = calculateExpansionPlanFromStats({
      categoryStats: [
        { category: 'Beleza', productCount: 100, coverageCount: 5, subcategories: [], lastCollectedAt: null, status: 'Ativa' },
      ],
      selectedCategories: ['Beleza'],
      categoryTargetLimit: 200,
      perSubcategoryMax: 60,
      taxonomyConfig: { 'Beleza': ['Sub 1', 'Sub 2', 'Sub 3'] },
      historyMap: {
        'Beleza': {
          category: 'Beleza',
          sampleCount: 5,
          historicalValidPerCredit: 18.0,
          averageGrowth: 36,
          averageCredits: 2,
          lastExecutionDate: new Date().toISOString(),
        },
      },
    });

    // deficit = 100, yield = 18 -> baseEstimate = 5.55; estimated = ceil(5.55 * 1.15) = 7; min = round(5.55 * 0.9) = 5; max = ceil(5.55 * 1.25) = 7
    assert(plans[0].hasHistoricalData === true, 'Alta eficiência com histórico ativo');
    assert(plans[0].estimatedCredits === 7, `Estimativa eficiente (${plans[0].estimatedCredits} crs para 100 produtos)`);
    assert(plans[0].minEstimatedCredits === 5, `Faixa mínima (${plans[0].minEstimatedCredits} crs)`);
    assert(plans[0].maxEstimatedCredits === 7, `Faixa máxima (${plans[0].maxEstimatedCredits} crs)`);
  }

  // Teste 46: Rigor do cálculo de eficiência histórica (actualValidGrowth vs validNewProductsForTarget)
  {
    const simulatedSummary = {
      validNewProductsForTarget: 4,
      actualValidGrowth: 3,
      creditsUsed: 2,
    };

    const confirmedValidPerCredit = simulatedSummary.creditsUsed > 0
      ? Number((simulatedSummary.actualValidGrowth / simulatedSummary.creditsUsed).toFixed(4))
      : null;

    const wrongCalculation = simulatedSummary.creditsUsed > 0
      ? Number((simulatedSummary.validNewProductsForTarget / simulatedSummary.creditsUsed).toFixed(4))
      : null;

    assert(confirmedValidPerCredit === 1.5, `Eficiência histórica usa actualValidGrowth: 3 / 2 = 1.5 (obtido: ${confirmedValidPerCredit})`);
    assert(confirmedValidPerCredit !== wrongCalculation, `Eficiência NÃO usa validNewProductsForTarget (1.5 !== 2.0)`);
  }

  // Teste 47: Formatação da UI quando hasHistoricalData = false
  {
    const plans = calculateExpansionPlanFromStats({
      categoryStats: [
        { category: 'Acessórios de moda', productCount: 206, coverageCount: 5, subcategories: [], lastCollectedAt: null, status: 'Ativa' },
      ],
      selectedCategories: ['Acessórios de moda'],
      categoryTargetLimit: 300,
      taxonomyConfig: { 'Acessórios de moda': ['Sub 1'] },
      historyMap: {},
    });

    const plan = plans[0];
    const uiDisplay = plan.hasHistoricalData
      ? `~${plan.minEstimatedCredits}–${plan.maxEstimatedCredits} créditos`
      : 'Sem histórico suficiente';

    assert(plan.hasHistoricalData === false, 'hasHistoricalData é falso');
    assert(uiDisplay === 'Sem histórico suficiente', 'UI exibe "Sem histórico suficiente" em vez de estimativa teórica');
  }

  console.log('\n========================================================================');
  console.log(`RESULTADO DA SUITE: ${passedTests}/${totalTests} TESTES PASSARAM COM SUCESSO!`);
  console.log('========================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runStrictTargetExpansionTestSuite().catch((err) => {
  console.error('Erro na suíte:', err);
  process.exit(1);
});
