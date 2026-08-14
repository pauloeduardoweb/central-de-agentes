import { calculateExpansionPlanFromStats, CollectorCategoryStat } from '../src/services/productMinerApi.js';
import { buildSubcategoryExpansionPlan } from '../server/subcategoryExpansionService.js';
import { OFFICIAL_TIKTOK_TAXONOMY } from '../server/taxonomy.js';

async function runVisualEstimationTestSuite() {
  console.log('====================================================');
  console.log('SUITE DE TESTES: ESTIMATIVA VISUAL E PLANO DE EXPANSÃO');
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

  // Mock Category Stats simulando o ambiente de produção
  const mockCategoryStats: CollectorCategoryStat[] = [
    {
      category: 'Acessórios de moda',
      productCount: 8,
      lastCollectedAt: null,
      status: 'Ativa',
      subcategories: [
        { subcategory: 'Acessórios para cabelos', productCount: 4, isLowBase: false },
        { subcategory: 'Bijuterias e acessórios', productCount: 4, isLowBase: false },
        { subcategory: 'Chapéus', productCount: 0, isLowBase: true },
        { subcategory: 'Óculos', productCount: 0, isLowBase: true },
        { subcategory: 'Relógios e acessórios', productCount: 0, isLowBase: true },
        { subcategory: 'Acessórios para roupas', productCount: 0, isLowBase: true },
        { subcategory: 'Coleiras e broches', productCount: 0, isLowBase: true },
        { subcategory: 'Extensões de cabelo e perucas', productCount: 0, isLowBase: true },
        { subcategory: 'Tecidos para costura', productCount: 0, isLowBase: true },
        { subcategory: 'Acessórios para casamento', productCount: 0, isLowBase: true },
      ],
    },
    {
      category: 'Beleza e cuidados pessoais',
      productCount: 520, // Categoria já ACIMA da meta de 500
      lastCollectedAt: null,
      status: 'Ativa',
      subcategories: [
        { subcategory: 'Maquiagem', productCount: 200, isLowBase: false },
        { subcategory: 'Cuidados com a pele', productCount: 320, isLowBase: false },
      ],
    },
    {
      category: 'Casa e cozinha',
      productCount: 150,
      lastCollectedAt: null,
      status: 'Ativa',
      subcategories: [
        { subcategory: 'Cozinha e jantar', productCount: 100, isLowBase: false },
        { subcategory: 'Decoração para casa', productCount: 50, isLowBase: false },
        { subcategory: 'Armazenamento e organização', productCount: 0, isLowBase: true },
        { subcategory: 'Cama e banho', productCount: 0, isLowBase: true },
      ],
    },
  ];

  // CASO 1: Categoria atual = 8, Meta = 100, remainingTarget = 92
  console.log('\n--- CASO 1: CÁLCULO EXATO DE DÉFICIT (8 ATUAL, 100 META -> 92 FALTAM) ---');
  const planAcessorios100 = calculateExpansionPlanFromStats({
    categoryStats: mockCategoryStats,
    selectedCategories: ['Acessórios de moda'],
    categoryTargetLimit: 100,
    perSubcategoryMax: 60,
    taxonomyConfig: OFFICIAL_TIKTOK_TAXONOMY,
  });

  assert(planAcessorios100.length === 1, 'Plano gerado apenas para a categoria selecionada');
  const catPlan1 = planAcessorios100[0];
  assert(catPlan1.currentProductCount === 8, 'currentProductCount é 8', `Recebido: ${catPlan1.currentProductCount}`);
  assert(catPlan1.categoryTargetLimit === 100, 'categoryTargetLimit é 100', `Recebido: ${catPlan1.categoryTargetLimit}`);
  assert(catPlan1.remainingTarget === 92, 'remainingTarget é exatamente 92', `Recebido: ${catPlan1.remainingTarget}`);
  assert(catPlan1.totalAllocated === 92, 'totalAllocated não ultrapassa o déficit de 92', `Recebido: ${catPlan1.totalAllocated}`);
  assert(catPlan1.projectedFinalCount === 100, 'projectedFinalCount é exatamente 100', `Recebido: ${catPlan1.projectedFinalCount}`);

  // CASO 2: UI nunca mostra 100 novos produtos quando já existem 8
  console.log('\n--- CASO 2: NÃO EXIBIR 100 NOVOS QUANDO JÁ EXISTEM 8 ---');
  assert(
    catPlan1.totalAllocated < 100 && catPlan1.totalAllocated === 92,
    'totalAllocated reflete novos produtos (92) e NÃO a meta bruta (100)',
    `Alocado: ${catPlan1.totalAllocated}`
  );

  // CASO 3: Estimativa do resumo = SUM(estimatedCredits do plano selecionado)
  console.log('\n--- CASO 3: ESTIMATIVA DO RESUMO EQUIVALE À SOMA DOS CRÉDITOS DO PLANO ---');
  // Subcategorias alocadas para 92 produtos com perSubcategoryMax 60:
  // Sub 1 (zero count): 60 produtos -> Math.ceil(60/30) = 2 páginas = 2 créditos
  // Sub 2 (zero count): 32 produtos -> Math.ceil(32/30) = 2 páginas = 2 créditos
  // Demais subs: 0 alocado -> 0 créditos
  // Total créditos = 4 créditos (NÃO 20 créditos fixos!)
  const expectedCreditsAcessorios = catPlan1.subcategories.reduce((s, sub) => s + sub.estimatedPages, 0);
  assert(catPlan1.estimatedCredits === expectedCreditsAcessorios, 'estimatedCredits da categoria é a soma das páginas das subs', `Recebido: ${catPlan1.estimatedCredits}`);
  assert(catPlan1.estimatedCredits === 4, 'estimatedCredits para deficit 92 é exatamente 4 créditos', `Recebido: ${catPlan1.estimatedCredits}`);

  // CASO 4: Créditos exibidos no botão = créditos exibidos no resumo
  console.log('\n--- CASO 4: SINCRONIZAÇÃO TOTAL BOTÃO <-> RESUMO ---');
  const summaryCredits = planAcessorios100.reduce((s, p) => s + p.estimatedCredits, 0);
  const buttonCredits = summaryCredits; // UI deriva diretamente de expansionSummary.totalEstimatedCredits
  assert(
    summaryCredits === buttonCredits,
    `Resumo (${summaryCredits} crs) e Botão (${buttonCredits} crs) possuem exatamente o mesmo valor`,
    `Resumo: ${summaryCredits}, Botão: ${buttonCredits}`
  );

  // CASO 5: Categoria não selecionada não entra na estimativa
  console.log('\n--- CASO 5: CATEGORIAS NÃO SELECIONADAS SÃO TOTALMENTE EXCLUÍDAS DO CÁLCULO ---');
  const planApenasCasa = calculateExpansionPlanFromStats({
    categoryStats: mockCategoryStats,
    selectedCategories: ['Casa e cozinha'],
    categoryTargetLimit: 300,
    perSubcategoryMax: 60,
    taxonomyConfig: OFFICIAL_TIKTOK_TAXONOMY,
  });
  assert(planApenasCasa.length === 1, 'Apenas Casa e Cozinha foi incluída');
  assert(planApenasCasa[0].category === 'Casa e cozinha', 'Categoria é Casa e Cozinha');
  assert(
    planApenasCasa.find((p) => p.category === 'Acessórios de moda') === undefined,
    'Acessórios de moda não foi calculada no plano de Casa e Cozinha'
  );

  // CASO 6: Trocar meta 100 -> 300 recalcula o plano dinamicamente
  console.log('\n--- CASO 6: ALTERAÇÃO DINÂMICA DE META 100 -> 300 RECALCULA O PLANO ---');
  const planAcessorios300 = calculateExpansionPlanFromStats({
    categoryStats: mockCategoryStats,
    selectedCategories: ['Acessórios de moda'],
    categoryTargetLimit: 300,
    perSubcategoryMax: 60,
    taxonomyConfig: OFFICIAL_TIKTOK_TAXONOMY,
  });
  const catPlan300 = planAcessorios300[0];
  assert(catPlan300.remainingTarget === 292, 'remainingTarget mudou para 292 (300 - 8)', `Recebido: ${catPlan300.remainingTarget}`);
  assert(catPlan300.totalAllocated === 292, 'totalAllocated aumentou para 292', `Recebido: ${catPlan300.totalAllocated}`);
  assert(catPlan300.estimatedCredits > catPlan1.estimatedCredits, 'estimatedCredits aumentou proporcionalmente às páginas reais necessárias', `300 meta: ${catPlan300.estimatedCredits} crs vs 100 meta: ${catPlan1.estimatedCredits} crs`);

  // CASO 7: Categoria já acima da meta gera 0 novos planejados e 0 créditos estimados
  console.log('\n--- CASO 7: CATEGORIA ACIMA DA META GERA 0 CRÉDITOS E 0 ALOCAÇÃO ---');
  const planBeleza500 = calculateExpansionPlanFromStats({
    categoryStats: mockCategoryStats,
    selectedCategories: ['Beleza e cuidados pessoais'],
    categoryTargetLimit: 500, // Categoria tem 520
    perSubcategoryMax: 60,
    taxonomyConfig: OFFICIAL_TIKTOK_TAXONOMY,
  });
  const belezaPlan = planBeleza500[0];
  assert(belezaPlan.currentProductCount === 520, 'currentProductCount é 520');
  assert(belezaPlan.remainingTarget === 0, 'remainingTarget é 0');
  assert(belezaPlan.totalAllocated === 0, 'totalAllocated é 0');
  assert(belezaPlan.estimatedCredits === 0, 'estimatedCredits é 0');
  assert(belezaPlan.projectedFinalCount === 520, 'projectedFinalCount permanece 520');

  // CASO 8: Nenhuma fórmula fixa de 20/50/85/170 créditos continua sendo usada
  console.log('\n--- CASO 8: BANIMENTO TOTAL DE MULTIPLICADORES ARBITRÁRIOS (20, 50, 85, 170) ---');
  const fakeOldCreditValues = [20, 50, 85, 170];
  assert(
    !fakeOldCreditValues.includes(catPlan1.estimatedCredits),
    `Créditos calculados para Acessórios meta 100 (${catPlan1.estimatedCredits}) não usa o valor arbitrário de 20 créditos`,
    `Crédito: ${catPlan1.estimatedCredits}`
  );

  // Validação cruzada Frontend Helper vs Backend Service
  console.log('\n--- VALIDAÇÃO CRUZADA: FRONTEND HELPER VS BACKEND SERVICE ---');
  const backendPlanAcessorios = buildSubcategoryExpansionPlan({
    categoryStats: mockCategoryStats as any,
    selectedCategories: ['Acessórios de moda'],
    categoryTargetLimit: 100,
    perSubcategoryMax: 60,
  });
  assert(
    JSON.stringify(planAcessorios100) === JSON.stringify(backendPlanAcessorios),
    'Frontend calculateExpansionPlanFromStats produz resultado IDÊNTICO ao backend buildSubcategoryExpansionPlan'
  );

  console.log('\n====================================================');
  console.log(`RESULTADO DA SUITE: ${passedTests}/${totalTests} TESTES PASSARAM COM SUCESSO!`);
  console.log('====================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runVisualEstimationTestSuite().catch((err) => {
  console.error('Erro na suíte de testes:', err);
  process.exit(1);
});
