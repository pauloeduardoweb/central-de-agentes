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

  // TEST 12: Respeito ao meta-limit da categoria
  console.log('\n--- TESTE 12: RESPEITO ESTRITO AO META-LIMIT DA CATEGORIA ---');
  const targetLimit = 100;
  const plansWithLimit = buildSubcategoryExpansionPlan({
    categoryStats: mockStats,
    selectedCategories: ['Acessórios de moda'],
    categoryTargetLimit: targetLimit,
    perSubcategoryMax: 40,
  });

  const totalAllocated = plansWithLimit[0].totalAllocated;
  assert(
    totalAllocated <= targetLimit,
    `Total alocado (${totalAllocated}) não ultrapassa a meta da categoria (${targetLimit})`
  );

  // TEST 13: Execução simulada com Mock Runner (Sem SocialCrawl, sem mutação, com deduplicação)
  console.log('\n--- TESTE 13: EXECUÇÃO CONTROLADA COM MOCK RUNNER & DEDUPLICAÇÃO ---');
  const { executeSubcategoryExpansion } = await import('../server/subcategoryExpansionService.js');
  let mockApiCallCount = 0;
  const mockSearchFn = async (params: { query: string; page: number }) => {
    mockApiCallCount++;
    return {
      products: [
        {
          productId: `mock_${params.query}_1`,
          title: `Produto Mock 1 de ${params.query}`,
          category: 'Acessórios de moda',
          priceCents: 1990,
          originalPriceCents: 2990,
          currencySymbol: 'R$',
          soldCount: 50,
          rating: 4.8,
          sellerId: 's1',
          sellerName: 'Loja Teste',
          productUrl: 'https://tiktok.com/prod/1',
          imageUrl: 'https://img.test/1.jpg',
          video: null,
        },
      ],
      creditsUsed: 1,
      hasMore: false,
      totalReceived: 1,
      newProductsCount: 1,
      updatedProductsCount: 0,
    };
  };

  const execRes = await (executeSubcategoryExpansion as any)({
    selectedCategories: ['Acessórios de moda'],
    categoryTargetLimit: 60,
    perSubcategoryMax: 30,
    searchFn: mockSearchFn,
  });

  assert(execRes.success === true, 'Execução controlada concluída com sucesso');
  assert(mockApiCallCount > 0, `Chamadas mock executadas corretamente (${mockApiCallCount})`);
  assert(execRes.totalUnique > 0, `Produtos únicos identificados: ${execRes.totalUnique}`);

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
