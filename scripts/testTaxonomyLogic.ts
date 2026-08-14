import {
  COLLECTOR_CATEGORIES,
  OFFICIAL_TIKTOK_TAXONOMY,
  OFFICIAL_TIKTOK_CHILD_CATEGORIES,
  classifyProductFull,
} from '../server/taxonomy.js';

function runTestSuite() {
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

  console.log('\n====================================================');
  console.log(`RESULTADO FINAL DOS TESTES: ${passedTests}/${totalTests} PASSARAM!`);
  console.log('====================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite();
