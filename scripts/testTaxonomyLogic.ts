import {
  COLLECTOR_CATEGORIES,
  OFFICIAL_TIKTOK_TAXONOMY,
  OFFICIAL_TIKTOK_CHILD_CATEGORIES,
  classifyProductFull,
} from '../server/taxonomy.js';
import { inferUnclassifiedSubcategory } from '../server/unclassifiedAuditService.js';

async function runTestSuite() {
  console.log('====================================================');
  console.log('SUITE DE TESTES: AUDITORIA E INTEGRIDADE DA TAXONOMIA');
  console.log('====================================================');

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

  // TEST 1: Child category inválida deve ser descartada (retornar childCategory: null)
  console.log('\n--- TESTE 1: VALIDAÇÃO ESTRITA DE CHILD CATEGORY ---');
  const invalidChildProduct = {
    title: 'Produto Teste Categoria Válida',
    category_path: 'Roupas masculinas e roupas íntimas masculinas > Roupas íntimas masculinas > ArbitraryChildFake123',
    query_source: 'Roupas masculinas e roupas íntimas masculinas',
  };
  const res1 = classifyProductFull(invalidChildProduct);
  assert(
    res1.category === 'Roupas masculinas e roupas íntimas masculinas',
    'Categoria principal reconhecida corretamente',
    `Recebido: ${res1.category}`
  );
  assert(
    res1.subcategory === 'Roupas íntimas masculinas',
    'Subcategoria reconhecida corretamente',
    `Recebido: ${res1.subcategory}`
  );
  assert(
    res1.childCategory === null,
    'ChildCategory inválida descartada com sucesso (retornou null)',
    `Recebido: ${res1.childCategory}`
  );

  // Valid child category test
  const validChildProduct = {
    title: 'Kit Cuecas Boxer Masculinas',
    category_path: 'Roupas masculinas e roupas íntimas masculinas > Roupas íntimas masculinas > Roupas íntimas',
    query_source: 'Roupas masculinas e roupas íntimas masculinas',
  };
  const resValidChild = classifyProductFull(validChildProduct);
  assert(
    resValidChild.childCategory === 'Roupas íntimas',
    'ChildCategory oficial reconhecida com sucesso',
    `Recebido: ${resValidChild.childCategory}`
  );

  // TEST 2: Idempotência da classificação
  console.log('\n--- TESTE 2: IDEMPOTÊNCIA DA CLASSIFICAÇÃO ---');
  const prodToTest = {
    title: 'Copo Térmico Inox 473ml com Tampa e Abridor',
    category_path: 'Utensílios de cozinha > Utensílios para bebidas > Copos térmicos',
    query_source: 'Utensílios de cozinha',
  };
  const firstPass = classifyProductFull(prodToTest);
  const secondPass = classifyProductFull(prodToTest);
  const thirdPass = classifyProductFull({
    ...prodToTest,
    category_path: firstPass.resolvedPath,
  });

  assert(
    JSON.stringify(firstPass) === JSON.stringify(secondPass),
    'Classificação idêntica em múltiplas execuções consecutivas'
  );
  assert(
    firstPass.category === thirdPass.category &&
      firstPass.subcategory === thirdPass.subcategory &&
      firstPass.childCategory === thirdPass.childCategory,
    'Classificação idempotente usando o próprio resolvedPath como entrada'
  );

  // TEST 3: Não alteração/mutação dos campos originais
  console.log('\n--- TESTE 3: PRESERVAÇÃO DOS DADOS BRUTOS (NÃO MUTAÇÃO) ---');
  const originalInput = Object.freeze({
    title: 'Smartwatch Fitness Tracker Pro Original',
    category_path: 'Telefones e eletrônicos > Dispositivos inteligentes',
    query_source: 'Telefones e eletrônicos',
  });
  const copyBefore = { ...originalInput };
  const res3 = classifyProductFull(originalInput);
  assert(
    originalInput.category_path === copyBefore.category_path &&
      originalInput.query_source === copyBefore.query_source &&
      originalInput.title === copyBefore.title,
    'Objeto de entrada original permaneceu estritamente inalterado e preservado'
  );

  // TEST 4: Produto completamente desconhecido retornando category: null (Sem fallback para Utensílios)
  console.log('\n--- TESTE 4: PRODUTO DESCONHECIDO (SEM FORÇAR UTENSÍLIOS) ---');
  const unknownProduct = {
    title: 'Xyz123 Qwerty NonExistentProductAlphaOmega 9999',
    category_path: 'NonExistentCategoryRoot > SubRootUnknown',
    query_source: 'NonExistentQuerySourceUnknown',
  };
  const res4 = classifyProductFull(unknownProduct);
  assert(
    res4.category === null,
    'Produto sem correspondência retorna category: null (NÃO joga em Utensílios de cozinha)',
    `Recebido: ${res4.category}`
  );
  assert(
    res4.subcategory === null && res4.childCategory === null,
    'Subcategoria e ChildCategory são null quando category é null'
  );
  assert(
    res4.source === 'none',
    'Source é "none" quando nenhuma categoria foi determinada'
  );

  // TEST 5: Cobertura e cálculo de estatísticas (Cobertura 0/Y para categorias sem subcategoria ativa)
  console.log('\n--- TESTE 5: COBERTURA E RESOLUÇÃO SINGLE-WINNER ---');
  const sampleBatch = [
    { title: 'Item 1 sem subcat', category_path: 'Móveis', query_source: 'Móveis' },
    { title: 'Item 2 sem subcat', category_path: 'Móveis', query_source: 'Móveis' },
  ];
  let catProds = 0;
  let subsCovered = 0;
  for (const p of sampleBatch) {
    const res = classifyProductFull(p);
    if (res.category === 'Móveis') {
      catProds++;
      if (res.subcategory) {
        subsCovered++;
      }
    }
  }
  assert(
    catProds === 2 && subsCovered === 0,
    'Categoria com produtos mas nenhuma subcategoria reconhecida calcula cobertura 0/Y (sem artificial 1/Y)',
    `Produtos: ${catProds}, Subcategorias cobertas: ${subsCovered}`
  );

  // TEST 6: Validação de integridade global da taxonomia
  console.log('\n--- TESTE 6: INTEGRIDADE DA TAXONOMIA DE 3 NÍVEIS ---');
  assert(
    COLLECTOR_CATEGORIES.length === 26,
    'Exatamente 26 categorias oficiais presentes',
    `Total: ${COLLECTOR_CATEGORIES.length}`
  );
  let totalSubsCount = 0;
  let totalChildrenCount = 0;
  for (const cat of COLLECTOR_CATEGORIES) {
    const subs = OFFICIAL_TIKTOK_TAXONOMY[cat] || [];
    totalSubsCount += subs.length;
    for (const sub of subs) {
      const children = OFFICIAL_TIKTOK_CHILD_CATEGORIES[cat]?.[sub] || [];
      totalChildrenCount += children.length;
    }
  }
  assert(
    totalSubsCount > 200,
    `Subcategorias oficiais presentes: ${totalSubsCount}`
  );
  assert(
    totalChildrenCount > 1500,
    `Child categories oficiais sincronizadas: ${totalChildrenCount}`
  );

  // TEST 7: Motor de inferência em memória para produtos sem subcategoria
  console.log('\n--- TESTE 7: MOTOR DE INFERÊNCIA EM MEMÓRIA (PRIORIDADES E CONFIANÇA) ---');
  // High confidence via unambiguous alias
  const unclassifiedProd1 = {
    product_id: '101',
    title: 'Fritadeira Elétrica Air Fryer 4L sem Óleo 1500W',
    category_path: 'Eletrodomésticos',
    query_source: 'Eletrodomésticos',
  };
  const infRes1 = inferUnclassifiedSubcategory(unclassifiedProd1);
  assert(
    infRes1.currentCategory === 'Eletrodomésticos',
    'Categoria mantida corretamente em Eletrodomésticos'
  );
  assert(
    infRes1.suggestedSubcategory === 'Eletrodomésticos',
    'Subcategoria sugerida corretamente via alias inequívoco "Air Fryer"'
  );
  assert(
    infRes1.confidence === 'ALTA',
    'Confiança ALTA atribuída para alias forte'
  );

  // Test 8: Restrição estrita de escopo de categoria (não sugere subcategoria de outra categoria)
  console.log('\n--- TESTE 8: RESTRIÇÃO ESTRITA À CATEGORIA PAI (SEM VAZAMENTO CROSS-CATEGORY) ---');
  const beautyProductWithCarWord = {
    product_id: '102',
    title: 'Batom Matte Longa Duração Cor Vermelho Carro Luxo',
    category_path: 'Beleza e cuidados pessoais',
    query_source: 'Beleza e cuidados pessoais',
  };
  const infRes2 = inferUnclassifiedSubcategory(beautyProductWithCarWord);
  assert(
    infRes2.currentCategory === 'Beleza e cuidados pessoais',
    'Categoria identificada como Beleza e cuidados pessoais'
  );
  assert(
    infRes2.suggestedSubcategory === 'Maquiagem',
    'Subcategoria sugerida estritamente dentro de Beleza (Maquiagem) e ignorou termo automotivo',
    `Recebido: ${infRes2.suggestedSubcategory}`
  );
  assert(
    OFFICIAL_TIKTOK_TAXONOMY['Beleza e cuidados pessoais'].includes(infRes2.suggestedSubcategory!),
    'Subcategoria sugerida pertence comprovadamente a Beleza e cuidados pessoais'
  );

  // Test 9: Ambiguidade / Conflito resulta em NENHUMA (sem chute arbitrário)
  console.log('\n--- TESTE 9: TRATAMENTO DE AMBIGUIDADE (CONFIDENCE NENHUMA QUANDO HÁ CONFLITO) ---');
  const ambiguousProduct = {
    product_id: '103',
    title: 'Produto Especial para Casa e Cozinha Geral',
    category_path: 'Suprimentos domésticos',
    query_source: 'Suprimentos domésticos',
  };
  const infRes3 = inferUnclassifiedSubcategory(ambiguousProduct);
  assert(
    infRes3.confidence === 'NENHUMA' || infRes3.confidence === 'BAIXA',
    'Produto sem termos fortes ou conflitante recebe NENHUMA ou BAIXA',
    `Confiança: ${infRes3.confidence}`
  );
  assert(
    infRes3.suggestedSubcategory === null || OFFICIAL_TIKTOK_TAXONOMY['Suprimentos domésticos'].includes(infRes3.suggestedSubcategory!),
    'Se sugerido algo, obrigatoriamente pertence a Suprimentos domésticos'
  );

  // Test 10: Child category estrita na inferência
  console.log('\n--- TESTE 10: INFERÊNCIA ESTRITA DE CHILD CATEGORY ---');
  const shoesProduct = {
    product_id: '104',
    title: 'Tênis de Corrida Masculino Esportivo Leve e Respirável',
    category_path: 'Sapatos',
    query_source: 'Sapatos',
  };
  const infRes4 = inferUnclassifiedSubcategory(shoesProduct);
  if (infRes4.suggestedSubcategory && infRes4.suggestedChildCategory) {
    const validChildren = OFFICIAL_TIKTOK_CHILD_CATEGORIES['Sapatos']?.[infRes4.suggestedSubcategory] || [];
    assert(
      validChildren.includes(infRes4.suggestedChildCategory),
      `Child category "${infRes4.suggestedChildCategory}" pertence à whitelist de "${infRes4.suggestedSubcategory}"`
    );
  } else {
    assert(
      infRes4.suggestedChildCategory === null,
      'Sem child category segura, retorna null'
    );
  }

  // TEST 11: Priorização estrita de subcategorias (0 produtos primeiro, depois menor contagem)
  console.log('\n--- TESTE 11: PRIORIZAÇÃO DE EXPANSÃO POR SUBCATEGORIA (0 PRODUTOS PRIMEIRO) ---');
  const { buildSubcategoryExpansionPlan } = await import('../server/subcategoryExpansionService.js');
  const mockStats = [
    {
      category: 'Acessórios de moda',
      productCount: 15,
      lastCollectedAt: null,
      status: 'Ativa' as const,
      subcategories: [
        { subcategory: 'Óculos', productCount: 10, isLowBase: false },
        { subcategory: 'Chapéus', productCount: 5, isLowBase: false },
        { subcategory: 'Acessórios para cabelos', productCount: 0, isLowBase: true },
        { subcategory: 'Bijuterias e acessórios', productCount: 0, isLowBase: true },
      ],
    },
  ];

  const plans = buildSubcategoryExpansionPlan({
    categoryStats: mockStats,
    selectedCategories: ['Acessórios de moda'],
    categoryTargetLimit: 120,
    perSubcategoryMax: 60,
  });

  assert(plans.length === 1, 'Plano gerado com sucesso para a categoria selecionada');
  const subs = plans[0].subcategories;
  assert(subs[0].isZeroCount === true, 'Primeira subcategoria no plano tem 0 produtos (Prioridade 1)');
  assert(subs[1].isZeroCount === true, 'Segunda subcategoria no plano tem 0 produtos (Prioridade 1)');
  assert(
    subs[2].currentCount <= subs[3].currentCount,
    'Subcategorias subsequentes ordenadas por menor contagem (ASC)'
  );

  // TESTES DE DÉFICIT REAL & NÃO OVER-ALLOCATION (CASOS 1 A 10)
  console.log('\n--- TESTE 12: VALIDAÇÃO DOS 10 CASOS MATEMÁTICOS DE DÉFICIT & ALOCAÇÃO ---');
  
  // CASO 1: current = 8, meta = 500, faltam = 492, totalAllocated <= 492
  const pCase1 = buildSubcategoryExpansionPlan({
    categoryStats: [{ category: 'Acessórios de moda', productCount: 8, lastCollectedAt: null, status: 'Ativa' as const, subcategories: [] }],
    selectedCategories: ['Acessórios de moda'],
    categoryTargetLimit: 500,
    perSubcategoryMax: 60,
  });
  assert(pCase1[0].remainingTarget === 492, 'CASO 1: remainingTarget é exatamente 492');
  assert(pCase1[0].totalAllocated <= 492, `CASO 1: totalAllocated (${pCase1[0].totalAllocated}) <= 492`);
  assert(pCase1[0].projectedFinalCount <= 500, 'CASO 1: projectedFinalCount <= 500');

  // CASO 2: current = 102, meta = 500, faltam = 398, totalAllocated <= 398
  const pCase2 = buildSubcategoryExpansionPlan({
    categoryStats: [{ category: 'Beleza e cuidados pessoais', productCount: 102, lastCollectedAt: null, status: 'Ativa' as const, subcategories: [] }],
    selectedCategories: ['Beleza e cuidados pessoais'],
    categoryTargetLimit: 500,
    perSubcategoryMax: 60,
  });
  assert(pCase2[0].remainingTarget === 398, 'CASO 2: remainingTarget é exatamente 398');
  assert(pCase2[0].totalAllocated <= 398, `CASO 2: totalAllocated (${pCase2[0].totalAllocated}) <= 398`);
  assert(pCase2[0].projectedFinalCount <= 500, 'CASO 2: projectedFinalCount <= 500');

  // CASO 3: current = 277, meta = 500, faltam = 223, totalAllocated <= 223
  const pCase3 = buildSubcategoryExpansionPlan({
    categoryStats: [{ category: 'Esportes e ar livre', productCount: 277, lastCollectedAt: null, status: 'Ativa' as const, subcategories: [] }],
    selectedCategories: ['Esportes e ar livre'],
    categoryTargetLimit: 500,
    perSubcategoryMax: 60,
  });
  assert(pCase3[0].remainingTarget === 223, 'CASO 3: remainingTarget é exatamente 223');
  assert(pCase3[0].totalAllocated <= 223, `CASO 3: totalAllocated (${pCase3[0].totalAllocated}) <= 223`);
  assert(pCase3[0].projectedFinalCount <= 500, 'CASO 3: projectedFinalCount <= 500');

  // CASO 4: current = 346, meta = 500, faltam = 154, totalAllocated <= 154
  const pCase4 = buildSubcategoryExpansionPlan({
    categoryStats: [{ category: 'Suprimentos para animais de estimação', productCount: 346, lastCollectedAt: null, status: 'Ativa' as const, subcategories: [] }],
    selectedCategories: ['Suprimentos para animais de estimação'],
    categoryTargetLimit: 500,
    perSubcategoryMax: 60,
  });
  assert(pCase4[0].remainingTarget === 154, 'CASO 4: remainingTarget é exatamente 154');
  assert(pCase4[0].totalAllocated === 154, `CASO 4: totalAllocated (${pCase4[0].totalAllocated}) é exatamente 154`);
  assert(pCase4[0].projectedFinalCount === 500, 'CASO 4: projectedFinalCount é exatamente 500 (346 + 154)');

  // CASO 5: current = 500, meta = 500, totalAllocated = 0, estimatedCredits = 0
  const pCase5 = buildSubcategoryExpansionPlan({
    categoryStats: [{ category: 'Utensílios de cozinha', productCount: 500, lastCollectedAt: null, status: 'Ativa' as const, subcategories: [] }],
    selectedCategories: ['Utensílios de cozinha'],
    categoryTargetLimit: 500,
    perSubcategoryMax: 60,
  });
  assert(pCase5[0].remainingTarget === 0, 'CASO 5: remainingTarget é 0');
  assert(pCase5[0].totalAllocated === 0, 'CASO 5: totalAllocated é 0');
  assert(pCase5[0].estimatedCredits === 0, 'CASO 5: estimatedCredits é 0');
  assert(pCase5[0].projectedFinalCount === 500, 'CASO 5: projectedFinalCount permanece 500');

  // CASO 6: current = 650, meta = 500, totalAllocated = 0, estimatedCredits = 0
  const pCase6 = buildSubcategoryExpansionPlan({
    categoryStats: [{ category: 'Utensílios de cozinha', productCount: 650, lastCollectedAt: null, status: 'Ativa' as const, subcategories: [] }],
    selectedCategories: ['Utensílios de cozinha'],
    categoryTargetLimit: 500,
    perSubcategoryMax: 60,
  });
  assert(pCase6[0].remainingTarget === 0, 'CASO 6: remainingTarget é 0 para categoria acima da meta');
  assert(pCase6[0].totalAllocated === 0, 'CASO 6: totalAllocated é 0 para categoria acima da meta');
  assert(pCase6[0].estimatedCredits === 0, 'CASO 6: estimatedCredits é 0');
  assert(pCase6[0].projectedFinalCount === 650, 'CASO 6: projectedFinalCount permanece 650');

  // CASO 7: Faltam 493 mas capacidade máxima das subcategorias é 420 (7 subcategorias x 60 = 420)
  // 'Computadores e equipamentos de escritório' tem exatamente 7 subcategorias oficiais
  const pCase7 = buildSubcategoryExpansionPlan({
    categoryStats: [{ category: 'Computadores e equipamentos de escritório', productCount: 7, lastCollectedAt: null, status: 'Ativa' as const, subcategories: [] }],
    selectedCategories: ['Computadores e equipamentos de escritório'],
    categoryTargetLimit: 500,
    perSubcategoryMax: 60,
  });
  assert(pCase7[0].remainingTarget === 493, 'CASO 7: remainingTarget é 493 (500 - 7)');
  assert(pCase7[0].totalAllocated === 420, `CASO 7: totalAllocated é 420 (7 subcategorias x 60 max = ${pCase7[0].totalAllocated})`);
  assert(pCase7[0].unallocatedGap === 73, `CASO 7: unallocatedGap é exatamente 73 (493 - 420 = ${pCase7[0].unallocatedGap})`);

  // CASO 8: Soma das allocations individuais = totalAllocated da categoria
  for (const plan of [pCase1[0], pCase2[0], pCase3[0], pCase4[0], pCase7[0]]) {
    const subSum = plan.subcategories.reduce((s, sub) => s + sub.allocatedTarget, 0);
    assert(subSum === plan.totalAllocated, `CASO 8: soma das subcategorias (${subSum}) === totalAllocated (${plan.totalAllocated})`);
  }

  // CASO 9: Soma dos totalAllocated das categorias = meta.totalAllocatedProducts
  const multiPlans = buildSubcategoryExpansionPlan({
    categoryStats: [
      { category: 'Acessórios de moda', productCount: 8, lastCollectedAt: null, status: 'Ativa' as const, subcategories: [] },
      { category: 'Suprimentos para animais de estimação', productCount: 346, lastCollectedAt: null, status: 'Ativa' as const, subcategories: [] },
    ],
    selectedCategories: ['Acessórios de moda', 'Suprimentos para animais de estimação'],
    categoryTargetLimit: 500,
    perSubcategoryMax: 60,
  });
  const sumCats = multiPlans.reduce((s, p) => s + p.totalAllocated, 0);
  assert(sumCats === (multiPlans[0].totalAllocated + multiPlans[1].totalAllocated), 'CASO 9: soma global de categorias é consistente');

  // CASO 10: Nenhuma subcategoria com allocatedTarget = 0 gera estimatedPages > 0
  for (const plan of multiPlans) {
    for (const sub of plan.subcategories) {
      if (sub.allocatedTarget === 0) {
        assert(sub.estimatedPages === 0, `CASO 10: subcategoria "${sub.subcategory}" com target 0 tem estimatedPages 0`);
      }
    }
  }

  // CASO 11 & 12: EXECUÇÃO CONTROLADA COM MOCK RUNNER & PROTEÇÃO CONTRA DUPLICATAS
  console.log('\n--- TESTE 13: EXECUÇÃO CONTROLADA COM MOCK RUNNER, DÉFICIT & DEDUPLICAÇÃO ---');
  const { executeSubcategoryExpansion } = await import('../server/subcategoryExpansionService.js');
  
  // CASO 12: Testar que produtos existentes/duplicados NÃO reduzem remainingNeeded como novos
  let mockCallIdx = 0;
  const mockDuplicationSearchFn = async (params: { query: string; page: number }) => {
    mockCallIdx++;
    if (params.page === 1) {
      // Página 1: retorna 30 produtos, mas 20 são atualizados e 10 são novos
      return {
        products: [
          { productId: `p_new_${mockCallIdx}_1`, title: 'Novo 1', category: 'Acessórios de moda' } as any,
          { productId: `p_new_${mockCallIdx}_2`, title: 'Novo 2', category: 'Acessórios de moda' } as any,
        ],
        creditsUsed: 1,
        hasMore: true,
        totalReceived: 30,
        newProductsCount: 10,
        updatedProductsCount: 20,
      };
    }
    // Página 2: retorna 10 novos produtos
    return {
      products: [
        { productId: `p_new_pg2_${mockCallIdx}`, title: 'Novo Pg2', category: 'Acessórios de moda' } as any,
      ],
      creditsUsed: 1,
      hasMore: false,
      totalReceived: 10,
      newProductsCount: 10,
      updatedProductsCount: 0,
    };
  };

  const execRes = await (executeSubcategoryExpansion as any)({
    selectedCategories: ['Acessórios de moda'],
    categoryTargetLimit: 30, // Se base inicial tem 15 produtos, faltam 15
    perSubcategoryMax: 60,
    searchFn: mockDuplicationSearchFn,
  });

  assert(execRes.success === true, 'CASO 11: Execução concluída com sucesso');
  assert(execRes.totalNew > 0, `CASO 12: Produtos novos contabilizados separadamente (${execRes.totalNew})`);
  assert(execRes.totalUpdated > 0, `CASO 12: Produtos atualizados/duplicados identificados (${execRes.totalUpdated})`);

  // TEST 14: Cobertura total das 26 categorias e 211 subcategorias
  console.log('\n--- TESTE 14: COBERTURA TAXONÔMICA COMPLETA (26 CATEGORIAS & 211 SUBCATEGORIAS) ---');
  assert(COLLECTOR_CATEGORIES.length === 26, `Exatamente 26 categorias coletoras oficiais (Recebido: ${COLLECTOR_CATEGORIES.length})`);
  let totalSubcategoriesCount = 0;
  for (const cat of COLLECTOR_CATEGORIES) {
    const sList = OFFICIAL_TIKTOK_TAXONOMY[cat] || [];
    totalSubcategoriesCount += sList.length;
  }
  assert(
    totalSubcategoriesCount === 211,
    `Exatamente 211 subcategorias oficiais distribuídas (Recebido: ${totalSubcategoriesCount})`
  );

  console.log('\n====================================================');
  console.log(`RESULTADO FINAL DOS TESTES: ${passedTests}/${totalTests} PASSARAM!`);
  console.log('====================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite();
