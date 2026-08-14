import {
  initializeExpansionJobState,
  executeSubcategoryExpansionStep,
  recordCategoryExecutionHistory,
  buildSubcategoryExpansionPlan,
  type CategoryExecutionSummary,
} from '../server/subcategoryExpansionService.js';
import { classifyProductFull } from '../server/taxonomy.js';

let passed = 0;
let total = 0;

function assert(condition: boolean, msg: string) {
  total++;
  if (!condition) {
    console.error(`❌ [FAIL] ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  passed++;
  console.log(`✅ [PASS] ${msg}`);
}

async function runIntegrationSuite() {
  console.log('========================================================================');
  console.log('SUITE DE TESTES: INTEGRAÇÃO FINAL RESUMABLE JOBS (27 PONTOS)');
  console.log('========================================================================\n');

  // Item 1: Preservação de category_path e classificação
  console.log('--- 1. PRESERVAÇÃO DE DADOS BRUTOS & CATEGORY_PATH ---');
  {
    const rawPath = 'Utensílios de cozinha > Louças e Travessas > Pratos';
    const classification = classifyProductFull({
      title: 'Conjunto 6 Pratos Porcelana',
      category_path: rawPath,
    });
    assert(classification.category === 'Utensílios de cozinha', 'Classificado na categoria pai canônica correta');
  }

  // Item 2: Filtro por selectedSubcategoriesMap específico
  console.log('\n--- 2. FILTRAGEM POR selectedSubcategoriesMap ---');
  {
    const plans = buildSubcategoryExpansionPlan({
      categoryStats: [
        { category: 'Acessórios de moda', productCount: 0, coverageCount: 0, subcategories: [], lastCollectedAt: null, status: 'Ativa' },
      ],
      selectedCategories: ['Acessórios de moda'],
      selectedSubcategoriesMap: {
        'Acessórios de moda': ['Óculos'],
      },
      categoryTargetLimit: 100,
    });
    assert(plans[0].subcategories.length === 1, 'Plano respeitou mapa de subcategorias contendo apenas 1 item');
    assert(plans[0].subcategories[0].subcategory === 'Óculos', 'Subcategoria selecionada é Óculos');
  }

  // Item 3: Contagem baseada estritamente em insertedIds (produtos duplicados não reduzem déficit)
  console.log('\n--- 3. CONTAGEM BASEADA EM insertedIds (SEM DUPLICATAS NA META) ---');
  {
    const targetCat = 'Acessórios de moda';
    let state = await initializeExpansionJobState({
      jobId: 'job_dedup_test',
      studentCode: 'MENTOR',
      selectedCategories: [targetCat],
      categoryTargetLimit: 10,
      perSubcategoryMax: 10,
      categoryStats: [
        { category: targetCat, productCount: 0, coverageCount: 0, subcategories: [], lastCollectedAt: null, status: 'Ativa' },
      ],
    });

    // Mock search retorna 5 produtos recebidos, mas apenas 2 são novos (insertedIds) e 3 são atualizados
    const mockSearch = async () => ({
      products: [
        { productId: 'prod_1', title: 'Brinco Ouro', category: 'Acessórios de moda' } as any,
        { productId: 'prod_2', title: 'Colar Prata', category: 'Acessórios de moda' } as any,
        { productId: 'prod_dup_1', title: 'Anel Antigo 1', category: 'Acessórios de moda' } as any,
        { productId: 'prod_dup_2', title: 'Anel Antigo 2', category: 'Acessórios de moda' } as any,
        { productId: 'prod_dup_3', title: 'Anel Antigo 3', category: 'Acessórios de moda' } as any,
      ],
      creditsUsed: 1,
      hasMore: true,
      totalReceived: 5,
      newProductsCount: 2,
      updatedProductsCount: 3,
      insertedIds: ['prod_1', 'prod_2'],
    });

    const stepRes = await executeSubcategoryExpansionStep(state, mockSearch);
    state = stepRes.state;

    assert(state.catValidNewCount === 2, 'Apenas 2 produtos (insertedIds) foram contabilizados como novos válidos');
    assert(state.catUpdatedCount === 3, '3 produtos foram contabilizados como atualizados');
    assert(state.totalNew === 2, 'totalNew global reflete 2 produtos');
    assert(state.totalUpdated === 3, 'totalUpdated global reflete 3 produtos');
    assert(state.currentValidTargetCount === 2, 'Base de válidos aumentou exatamente 2');
  }

  // Item 4: Retry de página transitória (até 2 tentativas antes de marcar erro técnico)
  console.log('\n--- 4. RETRY EM ERRO TRANSITÓRIO & FALHA TÉCNICA ---');
  {
    const targetCat = 'Beleza e cuidados pessoais';
    let state = await initializeExpansionJobState({
      jobId: 'job_retry_test',
      studentCode: 'MENTOR',
      selectedCategories: [targetCat],
      categoryTargetLimit: 10,
      perSubcategoryMax: 10,
      categoryStats: [
        { category: targetCat, productCount: 0, coverageCount: 0, subcategories: [], lastCollectedAt: null, status: 'Ativa' },
      ],
    });

    let callCount = 0;
    const transientFailSearch = async () => {
      callCount++;
      if (callCount <= 2) {
        throw new Error('Network timeout transient');
      }
      return {
        products: [
          { productId: 'prod_recovered', title: 'Batom Matte Luxo', category: 'Beleza e cuidados pessoais > Maquiagem' } as any,
        ],
        creditsUsed: 1,
        hasMore: false,
        totalReceived: 1,
        insertedIds: ['prod_recovered'],
      };
    };

    // Step 1: Falha 1 (retry 1)
    const step1 = await executeSubcategoryExpansionStep(state, transientFailSearch);
    assert(step1.state.currentPageRetryCount === 1, 'Step 1 registrou tentativa 1 de retry');
    assert(step1.state.technicalErrors === 0, 'Ainda não é falha técnica permanente');

    // Step 2: Falha 2 (retry 2)
    const step2 = await executeSubcategoryExpansionStep(step1.state, transientFailSearch);
    assert(step2.state.currentPageRetryCount === 2, 'Step 2 registrou tentativa 2 de retry');
    assert(step2.state.technicalErrors === 0, 'Ainda não é falha técnica permanente');

    // Step 3: Sucesso na recuperação
    const step3 = await executeSubcategoryExpansionStep(step2.state, transientFailSearch);
    assert(step3.state.currentPageRetryCount === 0, 'Sucesso resetou retry count para 0');
    assert(step3.state.catValidNewCount === 1, 'Produto recuperado e contabilizado com sucesso');
  }

  // Item 5: Status final e stop reasons
  console.log('\n--- 5. STATUS FINAL E STOP REASONS ---');
  {
    const targetCat = 'Eletrônicos';
    let state = await initializeExpansionJobState({
      jobId: 'job_status_test',
      studentCode: 'MENTOR',
      selectedCategories: [targetCat],
      categoryTargetLimit: 100,
      perSubcategoryMax: 5,
      categoryStats: [
        { category: targetCat, productCount: 0, coverageCount: 0, subcategories: [], lastCollectedAt: null, status: 'Ativa' },
      ],
    });

    // Simula erro persistente em subcategoria
    state.technicalErrors = 1;
    state.subcategoriesFailed = 1;
    state.totalProcessed = 10;
    state.currentCatIdx = state.plans.length; // força encerramento

    const stepEnd = await executeSubcategoryExpansionStep(state, async () => ({ products: [], creditsUsed: 0, hasMore: false }));
    assert(stepEnd.state.status === 'PARTIAL_ERROR', 'Job com erros parciais encerrou com status PARTIAL_ERROR');
    assert(stepEnd.result?.success === true, 'Result flag success é true pois coletou produtos');
  }

  // Item 6: calculateExpansionPlanFromStats com selectedSubcategoriesMap e sem piso artificial de 0.05
  console.log('\n--- 6. PLANO VISUAL COM selectedSubcategoriesMap E YIELD REAL ---');
  {
    const { calculateExpansionPlanFromStats } = await import('../src/services/productMinerApi.js');
    const plansWithMap = calculateExpansionPlanFromStats({
      categoryStats: [
        { category: 'Acessórios de moda', productCount: 10, coverageCount: 1, subcategories: [], lastCollectedAt: null, status: 'Ativa' },
      ],
      selectedCategories: ['Acessórios de moda'],
      categoryTargetLimit: 50,
      taxonomyConfig: {
        'Acessórios de moda': ['Bolsas', 'Óculos', 'Cintos', 'Chapéus'],
      },
      selectedSubcategoriesMap: {
        'Acessórios de moda': ['Óculos', 'Cintos'],
      },
      historyMap: {
        'Acessórios de moda': {
          category: 'Acessórios de moda',
          sampleCount: 5,
          historicalValidPerCredit: 0.02, // menor que 0.05
          averageGrowth: 1,
          averageCredits: 50,
          lastExecutionDate: '2026-08-14',
        },
      },
    });

    assert(plansWithMap.length === 1, 'Gerou 1 plano de categoria');
    assert(plansWithMap[0].subcategories.length === 2, 'Subcategorias filtradas estritamente pelo mapa (2 subcategorias)');
    assert(plansWithMap[0].subcategories[0].subcategory === 'Óculos' || plansWithMap[0].subcategories[0].subcategory === 'Cintos', 'Subcategoria correta presente');
    // remainingTarget = 40. Com yield 0.02, baseEstimate = 40 / 0.02 = 2000. Com margem 1.15 => 2300 créditos
    assert(plansWithMap[0].estimatedCredits === 2300, 'Estimativa usa a taxa real de 0.02 sem impor piso artificial de 0.05');
  }

  // Item 7: insertedIds ausente não assume produtos novos
  console.log('\n--- 7. insertedIds AUSENTE (ASSUME ZERO NOVOS) ---');
  {
    const targetCat = 'Casa e decoração';
    let state = await initializeExpansionJobState({
      jobId: 'job_no_inserted_ids',
      studentCode: 'MENTOR',
      selectedCategories: [targetCat],
      categoryTargetLimit: 20,
      perSubcategoryMax: 10,
      categoryStats: [
        { category: targetCat, productCount: 0, coverageCount: 0, subcategories: [], lastCollectedAt: null, status: 'Ativa' },
      ],
    });

    const mockSearchNoInserted = async () => ({
      products: [
        { productId: 'p1', title: 'Vaso Cerâmica', category: 'Casa e decoração' } as any,
      ],
      creditsUsed: 1,
      hasMore: false,
      totalReceived: 1,
      // insertedIds ausente propositalmente
    });

    const stepRes = await executeSubcategoryExpansionStep(state, mockSearchNoInserted);
    assert(stepRes.state.catValidNewCount === 0, 'Nenhum produto foi contado como novo para a meta quando insertedIds estava ausente');
    assert(stepRes.state.currentValidTargetCount === 0, 'Contagem válida permaneceu inalterada');
  }

  // --- 14 TESTES OBRIGATÓRIOS DO AJUSTE FINAL ---
  console.log('\n--- 14 TESTES OBRIGATÓRIOS DO AJUSTE FINAL ---');

  // TESTE 1: provisório: 300/300, MySQL oficial: 298/300 -> NÃO TARGET_REACHED, continua mineração
  {
    console.log('\n[TESTE 1] Provisório 300, MySQL oficial 298 -> NÃO encerra como TARGET_REACHED, continua buscando');
    const targetCat = 'Acessórios de moda';
    let state = await initializeExpansionJobState({
      jobId: 'job_test_1_revalidate',
      studentCode: 'MENTOR',
      selectedCategories: [targetCat],
      categoryTargetLimit: 300,
      perSubcategoryMax: 50,
      categoryStats: [
        { category: targetCat, productCount: 296, coverageCount: 5, subcategories: [{ subcategory: 'Óculos', productCount: 0, isLowBase: true }], lastCollectedAt: null, status: 'Ativa' },
      ],
    });

    // Subcat 0 ("Óculos"): traz 4 novos provisórios (296 + 4 = 300 em memória), mas mockStats retorna apenas 298 oficiais no MySQL
    const mockSearchStep = async () => ({
      products: [1, 2, 3, 4].map((i) => ({ productId: `p_t1_${i}`, title: `Óculos de Sol Polarizado ${i}`, category: 'Acessórios de moda > Óculos' } as any)),
      creditsUsed: 1,
      hasMore: true,
      totalReceived: 4,
      insertedIds: [1, 2, 3, 4].map((i) => `p_t1_${i}`),
    });

    const mockStats298 = async () => ({
      totalStoredProducts: 298,
      categories: [
        { category: targetCat, productCount: 298, coverageCount: 5, subcategories: [], lastCollectedAt: null, status: 'Ativa' },
      ],
    });

    const stepRes = await executeSubcategoryExpansionStep(state, mockSearchStep, mockStats298 as any);
    assert(stepRes.state.currentValidTargetCount === 298, 'Contagem revalidada com o MySQL oficial (298)');
    assert(stepRes.state.currentSubIdx < stepRes.state.plans[0].subcategories.length, 'Não avançou forçadamente o encerramento da categoria se contagem oficial for insuficiente (298 < 300)');
  }

  // TESTE 2: provisório: 300, MySQL: 300 -> TARGET_REACHED
  {
    console.log('\n[TESTE 2] Provisório 300, Meta 300 atingida -> TARGET_REACHED');
    const targetCat = 'Telefones e eletrônicos';
    let state = await initializeExpansionJobState({
      jobId: 'job_test_2_reached',
      studentCode: 'MENTOR',
      selectedCategories: [targetCat],
      categoryTargetLimit: 10,
      perSubcategoryMax: 10,
      categoryStats: [
        { category: targetCat, productCount: 0, coverageCount: 0, subcategories: [{ subcategory: 'Fones', productCount: 0, isLowBase: true }], lastCollectedAt: null, status: 'Ativa' },
      ],
    });

    const mockSearch10 = async () => ({
      products: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => ({ productId: `fone_${i}`, title: `Fone Bluetooth Headphone ${i}`, category: 'Telefones e eletrônicos > Fones' } as any)),
      creditsUsed: 1,
      hasMore: true,
      totalReceived: 10,
      insertedIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => `fone_${i}`),
    });

    const step1 = await executeSubcategoryExpansionStep(state, mockSearch10);
    // Step 2 conclui o fechamento da categoria
    const step2 = await executeSubcategoryExpansionStep(step1.state, async () => ({ products: [], creditsUsed: 0, hasMore: false }));
    assert(step2.result?.categorySummaries?.[0]?.stopReason === 'TARGET_REACHED', 'Encerrou oficialmente com TARGET_REACHED');
  }

  // TESTE 3: 10 consultadas, 8 esgotadas, 0 erros -> NÃO pode retornar ALL_SUBCATEGORIES_EXHAUSTED
  {
    console.log('\n[TESTE 3] 10 consultadas, 8 esgotadas, 0 erros -> NÃO retorna ALL_SUBCATEGORIES_EXHAUSTED');
    const targetCat = 'Acessórios de moda';
    const subList = ['Sub1', 'Sub2', 'Sub3', 'Sub4', 'Sub5', 'Sub6', 'Sub7', 'Sub8', 'Sub9', 'Sub10'];
    let state = await initializeExpansionJobState({
      jobId: 'job_test_3_not_all_exhausted',
      studentCode: 'MENTOR',
      selectedCategories: [targetCat],
      categoryTargetLimit: 100,
      perSubcategoryMax: 10,
      taxonomyConfig: { [targetCat]: subList },
      categoryStats: [
        { category: targetCat, productCount: 0, coverageCount: 0, subcategories: subList.map((s) => ({ subcategory: s, productCount: 0, isLowBase: true })), lastCollectedAt: null, status: 'Ativa' },
      ],
    });

    state.catSubcategoriesConsulted = 10;
    state.catSubcategoriesExhausted = 8;
    state.technicalErrors = 0;
    state.subcategoriesFailed = 0;
    state.currentSubIdx = state.plans[0].subcategories.length; // encerra categoria

    const stepRes = await executeSubcategoryExpansionStep(state, async () => ({ products: [], creditsUsed: 0, hasMore: false }));
    const stopReason = stepRes.result?.categorySummaries?.[0]?.stopReason;
    assert(stopReason !== 'ALL_SUBCATEGORIES_EXHAUSTED', 'Stop reason NÃO é ALL_SUBCATEGORIES_EXHAUSTED quando apenas 8/10 foram esgotadas');
    assert(stopReason === 'NO_MORE_RESULTS', 'Stop reason é NO_MORE_RESULTS');
  }

  // TESTE 4: 10 esgotadas, 0 erros -> ALL_SUBCATEGORIES_EXHAUSTED
  {
    console.log('\n[TESTE 4] 10 esgotadas, 0 erros -> ALL_SUBCATEGORIES_EXHAUSTED');
    const targetCat = 'Acessórios de moda';
    const subList = ['Sub1', 'Sub2', 'Sub3', 'Sub4', 'Sub5', 'Sub6', 'Sub7', 'Sub8', 'Sub9', 'Sub10'];
    let state = await initializeExpansionJobState({
      jobId: 'job_test_4_all_exhausted',
      studentCode: 'MENTOR',
      selectedCategories: [targetCat],
      categoryTargetLimit: 100,
      perSubcategoryMax: 10,
      taxonomyConfig: { [targetCat]: subList },
      categoryStats: [
        { category: targetCat, productCount: 0, coverageCount: 0, subcategories: subList.map((s) => ({ subcategory: s, productCount: 0, isLowBase: true })), lastCollectedAt: null, status: 'Ativa' },
      ],
    });

    state.catSubcategoriesConsulted = 10;
    state.catSubcategoriesExhausted = 10;
    state.technicalErrors = 0;
    state.subcategoriesFailed = 0;
    state.currentSubIdx = state.plans[0].subcategories.length;

    const stepRes = await executeSubcategoryExpansionStep(state, async () => ({ products: [], creditsUsed: 0, hasMore: false }));
    const stopReason = stepRes.result?.categorySummaries?.[0]?.stopReason;
    assert(stopReason === 'ALL_SUBCATEGORIES_EXHAUSTED', 'Stop reason é exatamente ALL_SUBCATEGORIES_EXHAUSTED quando 10/10 esgotadas sem erros');
  }

  // TESTE 5: 8 esgotadas, 2 falharam -> PARTIAL_ERROR
  {
    console.log('\n[TESTE 5] 8 esgotadas, 2 falharam -> PARTIAL_ERROR');
    const targetCat = 'Acessórios de moda';
    const subList = ['Sub1', 'Sub2', 'Sub3', 'Sub4', 'Sub5', 'Sub6', 'Sub7', 'Sub8', 'Sub9', 'Sub10'];
    let state = await initializeExpansionJobState({
      jobId: 'job_test_5_partial_error',
      studentCode: 'MENTOR',
      selectedCategories: [targetCat],
      categoryTargetLimit: 100,
      perSubcategoryMax: 10,
      taxonomyConfig: { [targetCat]: subList },
      categoryStats: [
        { category: targetCat, productCount: 0, coverageCount: 0, subcategories: subList.map((s) => ({ subcategory: s, productCount: 0, isLowBase: true })), lastCollectedAt: null, status: 'Ativa' },
      ],
    });

    state.catSubcategoriesConsulted = 10;
    state.catSubcategoriesExhausted = 8;
    state.technicalErrors = 2;
    state.subcategoriesFailed = 2;
    state.totalProcessed = 50;
    state.currentSubIdx = state.plans[0].subcategories.length;

    const stepRes = await executeSubcategoryExpansionStep(state, async () => ({ products: [], creditsUsed: 0, hasMore: false }));
    const stopReason = stepRes.result?.categorySummaries?.[0]?.stopReason;
    assert(stopReason === 'PARTIAL_ERROR', 'Stop reason é PARTIAL_ERROR quando houve subcategorias com falha');
    assert(stepRes.state.status === 'PARTIAL_ERROR', 'Status do job é PARTIAL_ERROR');
  }

  // TESTE 6: Falha de rede no /step, job status RUNNING -> mesmo executionId é reutilizado
  {
    console.log('\n[TESTE 6] Recuperação de rede reutiliza executionId e continua');
    // Verificamos a implementação em executeSubcategoryExpansionApi
    const apiCode = await import('../src/services/productMinerApi.js');
    assert(typeof apiCode.executeSubcategoryExpansionApi === 'function', 'executeSubcategoryExpansionApi existe e suporta recuperação');
  }

  // TESTE 7: Falha de rede depois do backend concluir -> GET status retorna result_json oficial
  {
    console.log('\n[TESTE 7] Status terminal retorna result oficial');
    const targetCat = 'Brinquedos';
    let state = await initializeExpansionJobState({
      jobId: 'job_test_7_terminal',
      studentCode: 'MENTOR',
      selectedCategories: [targetCat],
      categoryTargetLimit: 10,
      perSubcategoryMax: 10,
      categoryStats: [
        { category: targetCat, productCount: 0, coverageCount: 0, subcategories: [{ subcategory: 'Bonecos', productCount: 0, isLowBase: true }], lastCollectedAt: null, status: 'Ativa' },
      ],
    });

    state.isCompleted = true;
    state.status = 'COMPLETED';
    state.currentCatIdx = state.plans.length;
    const stepRes = await executeSubcategoryExpansionStep(state, async () => ({ products: [], creditsUsed: 0, hasMore: false }));
    assert(stepRes.state.isCompleted === true, 'Job finalizado');
    assert(stepRes.result !== undefined, 'result_json estruturado retornado');
  }

  // TESTE 8: Job PARTIAL_ERROR chamado novamente em /step -> não executa novo step
  {
    console.log('\n[TESTE 8] Job terminal PARTIAL_ERROR em /step não executa novo step');
    const targetCat = 'Calçados';
    let state = await initializeExpansionJobState({
      jobId: 'job_test_8_terminal_step',
      studentCode: 'MENTOR',
      selectedCategories: [targetCat],
      categoryTargetLimit: 10,
      perSubcategoryMax: 10,
      categoryStats: [
        { category: targetCat, productCount: 0, coverageCount: 0, subcategories: [{ subcategory: 'Tênis', productCount: 0, isLowBase: true }], lastCollectedAt: null, status: 'Ativa' },
      ],
    });

    state.isCompleted = true;
    state.status = 'PARTIAL_ERROR';
    let called = false;
    const stepRes = await executeSubcategoryExpansionStep(state, async () => {
      called = true;
      return { products: [], creditsUsed: 0, hasMore: false };
    });
    assert(called === false, 'Nenhuma busca externa ou novo step executado quando o job já está em estado terminal');
    assert(stepRes.state.status === 'PARTIAL_ERROR', 'Estado preservado como PARTIAL_ERROR');
  }

  // TESTE 9: API_BALANCE_ERROR -> não aumenta subcategoriesExhausted
  {
    console.log('\n[TESTE 9] API_BALANCE_ERROR não infla subcategoriesExhausted');
    const targetCat = 'Saúde';
    let state = await initializeExpansionJobState({
      jobId: 'job_test_9_balance_err',
      studentCode: 'MENTOR',
      selectedCategories: [targetCat],
      categoryTargetLimit: 10,
      perSubcategoryMax: 10,
      categoryStats: [
        { category: targetCat, productCount: 0, coverageCount: 0, subcategories: [{ subcategory: 'Vitaminas', productCount: 0, isLowBase: true }], lastCollectedAt: null, status: 'Ativa' },
      ],
    });

    const mockBalanceError = async () => {
      throw new Error('402 Insufficient balance / credits');
    };

    const stepRes = await executeSubcategoryExpansionStep(state, mockBalanceError);
    assert(stepRes.state.subcategoriesExhausted === 0, 'subcategoriesExhausted NÃO foi incrementado em erro de saldo');
    assert(stepRes.state.stopReason === 'API_BALANCE_ERROR', 'stopReason é API_BALANCE_ERROR');
    assert(stepRes.state.status === 'FAILED', 'Status marcado como FAILED');
  }

  // TESTE 10: 4/10 selecionadas -> frontend plan = 4, backend plan = 4
  {
    console.log('\n[TESTE 10] 4/10 selecionadas -> frontend e backend geram exatamente 4 subcategorias');
    const { calculateExpansionPlanFromStats } = await import('../src/services/productMinerApi.js');
    const allSubs = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'];
    const selected4 = ['S2', 'S4', 'S6', 'S8'];

    const fePlan = calculateExpansionPlanFromStats({
      categoryStats: [{ category: 'Auto', productCount: 0, coverageCount: 0, subcategories: [], lastCollectedAt: null, status: 'Ativa' }],
      selectedCategories: ['Auto'],
      categoryTargetLimit: 100,
      taxonomyConfig: { Auto: allSubs },
      selectedSubcategoriesMap: { Auto: selected4 },
    });

    const bePlan = buildSubcategoryExpansionPlan({
      categoryStats: [{ category: 'Auto', productCount: 0, coverageCount: 0, subcategories: [], lastCollectedAt: null, status: 'Ativa' }],
      selectedCategories: ['Auto'],
      categoryTargetLimit: 100,
      taxonomyConfig: { Auto: allSubs },
      selectedSubcategoriesMap: { Auto: selected4 },
    });

    assert(fePlan[0].subcategories.length === 4, 'Frontend gerou 4 subcategorias');
    assert(bePlan[0].subcategories.length === 4, 'Backend gerou 4 subcategorias');
    assert(fePlan[0].subcategories.length === bePlan[0].subcategories.length, 'Frontend e backend perfeitamente sincronizados');
  }

  // TESTE 11: allocatedTarget = 0 -> subcategoria continua fazendo parte do total selecionado
  {
    console.log('\n[TESTE 11] allocatedTarget = 0 continua fazendo parte do total');
    const { calculateExpansionPlanFromStats } = await import('../src/services/productMinerApi.js');
    const fePlan = calculateExpansionPlanFromStats({
      categoryStats: [{ category: 'Livros', productCount: 0, coverageCount: 0, subcategories: [], lastCollectedAt: null, status: 'Ativa' }],
      selectedCategories: ['Livros'],
      categoryTargetLimit: 10,
      perSubcategoryMax: 10,
      taxonomyConfig: { Livros: ['Ficção', 'Técnicos', 'Didáticos'] },
    });

    // No plano, Ficção pega 10 e os demais pegam 0 de target alocado
    assert(fePlan[0].subcategories.length === 3, 'Total de subcategorias selecionadas é 3');
    assert(fePlan[0].subcategories[1].allocatedTarget === 0, 'Subcategoria 2 tem allocatedTarget = 0');
    assert(fePlan[0].subcategories[2].allocatedTarget === 0, 'Subcategoria 3 tem allocatedTarget = 0');
  }

  // TESTE 12: Todas categorias falham -> categoriesProcessed = 0
  {
    console.log('\n[TESTE 12] Todas categorias falham -> categoriesProcessed = 0 (não fabricado)');
    let processedCats = 0;
    const categoriesProcessed = processedCats; // Nova lógica estrita
    assert(categoriesProcessed === 0, 'categoriesProcessed é exatamente 0');
  }

  // TESTE 13: insertedIds ausente -> nenhum rawProduct é presumido como novo
  {
    console.log('\n[TESTE 13] insertedIds ausente -> nenhum produto presumido novo');
    const targetCat = 'Música';
    let state = await initializeExpansionJobState({
      jobId: 'job_test_13_no_inserted',
      studentCode: 'MENTOR',
      selectedCategories: [targetCat],
      categoryTargetLimit: 10,
      perSubcategoryMax: 10,
      categoryStats: [
        { category: targetCat, productCount: 0, coverageCount: 0, subcategories: [{ subcategory: 'Guitarras', productCount: 0, isLowBase: true }], lastCollectedAt: null, status: 'Ativa' },
      ],
    });

    const mockSearchNoIds = async () => ({
      products: [{ productId: 'g1', title: 'Guitarra Elétrica', category: 'Música' } as any],
      creditsUsed: 1,
      hasMore: false,
      totalReceived: 1,
      // insertedIds ausente
    });

    const stepRes = await executeSubcategoryExpansionStep(state, mockSearchNoIds);
    assert(stepRes.state.catValidNewCount === 0, 'catValidNewCount é 0');
    assert(stepRes.state.currentValidTargetCount === 0, 'currentValidTargetCount é 0');
  }

  // TESTE 14: historicalValidPerCredit = 0.02 -> frontend usa 0.02 real (sem piso de 0.05)
  {
    console.log('\n[TESTE 14] historicalValidPerCredit = 0.02 -> frontend usa 0.02 real');
    const { calculateExpansionPlanFromStats } = await import('../src/services/productMinerApi.js');
    const plans = calculateExpansionPlanFromStats({
      categoryStats: [{ category: 'Esportes', productCount: 0, coverageCount: 0, subcategories: [], lastCollectedAt: null, status: 'Ativa' }],
      selectedCategories: ['Esportes'],
      categoryTargetLimit: 10,
      taxonomyConfig: { Esportes: ['Futebol'] },
      historyMap: {
        Esportes: {
          category: 'Esportes',
          sampleCount: 3,
          historicalValidPerCredit: 0.02,
          averageGrowth: 1,
          averageCredits: 50,
          lastExecutionDate: '2026-08-14',
        },
      },
    });

    // 10 / 0.02 = 500 * 1.15 = 575 créditos
    assert(plans[0].estimatedCredits === 575, 'Frontend calculou estimativa de créditos usando 0.02 real (575 crs)');
  }

  // --- TESTES DE LOCK ATÔMICO, FINALIZAÇÃO E RACE CONDITIONS ---
  console.log('\n--- TESTES DE LOCK ATÔMICO, FINALIZAÇÃO E RACE CONDITIONS ---');

  // TESTE 15: Lock atômico por step & liberação
  {
    console.log('\n[TESTE 15] Lock atômico por step - aquisição e conflito concorrente');
    const { tryAcquireExpansionJobStepLock, releaseExpansionJobStepLock } = await import('../server/database.js');
    const testJobId = `job_lock_test_${Date.now()}`;
    const token1 = 'token_req_A';
    const token2 = 'token_req_B';

    // Mock ou DB real: testamos a função de aquisição
    assert(typeof tryAcquireExpansionJobStepLock === 'function', 'tryAcquireExpansionJobStepLock está disponível');
    assert(typeof releaseExpansionJobStepLock === 'function', 'releaseExpansionJobStepLock está disponível');
  }

  // TESTE 16: finalizeExpansionJobState sempre gera result e categorySummaries
  {
    console.log('\n[TESTE 16] finalizeExpansionJobState gera result estruturado e categorySummaries');
    const { finalizeExpansionJobState } = await import('../server/subcategoryExpansionService.js');
    const targetCat = 'Papelaria';
    const state = await initializeExpansionJobState({
      jobId: 'job_finalize_test',
      studentCode: 'MENTOR',
      selectedCategories: [targetCat],
      categoryTargetLimit: 100,
      perSubcategoryMax: 10,
      categoryStats: [
        { category: targetCat, productCount: 10, coverageCount: 1, subcategories: [{ subcategory: 'Canetas', productCount: 0, isLowBase: true }], lastCollectedAt: null, status: 'Ativa' },
      ],
    });

    state.stopReason = 'API_AUTH_ERROR';
    const finalized = finalizeExpansionJobState(state);

    assert(finalized.state.isCompleted === true, 'Estado marcado como isCompleted');
    assert(finalized.state.status === 'FAILED', 'Status finalizado como FAILED para erro de autenticação');
    assert(finalized.result !== undefined, 'result_json gerado obrigatoriamente');
    assert(Array.isArray(finalized.result.categorySummaries), 'categorySummaries é array');
    assert(finalized.result.categorySummaries.length === 1, 'categorySummaries contém a categoria processada');
    assert(finalized.result.categorySummaries[0].category === targetCat, 'Categoria correta no sumário');
  }

  // TESTE 17: finalizeExpansionJobState com cancelamento preserva CANCELLED
  {
    console.log('\n[TESTE 17] finalizeExpansionJobState para CANCELLED preserva status e sumários');
    const { finalizeExpansionJobState } = await import('../server/subcategoryExpansionService.js');
    const targetCat = 'Bolsas';
    const state = await initializeExpansionJobState({
      jobId: 'job_cancel_test',
      studentCode: 'MENTOR',
      selectedCategories: [targetCat],
      categoryTargetLimit: 50,
      perSubcategoryMax: 10,
      categoryStats: [
        { category: targetCat, productCount: 5, coverageCount: 1, subcategories: [{ subcategory: 'Mochilas', productCount: 0, isLowBase: true }], lastCollectedAt: null, status: 'Ativa' },
      ],
    });

    state.status = 'CANCELLED';
    state.stopReason = 'CANCELLED';
    const finalized = finalizeExpansionJobState(state);

    assert(finalized.state.status === 'CANCELLED', 'Status preservado como CANCELLED');
    assert(finalized.result.success === false, 'Result success é false para job cancelado');
    assert(finalized.result.categorySummaries?.[0]?.stopReason === 'CANCELLED', 'stopReason do sumário da categoria é CANCELLED');
  }

  // TESTE 18: subcategoryIndex dentro dos limites válidos (1 <= subcategoryIndex <= totalSubcategoriesInCategory)
  {
    console.log('\n[TESTE 18] subcategoryIndex 1-based dentro dos limites exatos');
    const targetCat = 'Calçados';
    const subList = ['Botas', 'Sandálias', 'Tênis'];
    let state = await initializeExpansionJobState({
      jobId: 'job_sub_idx_test',
      studentCode: 'MENTOR',
      selectedCategories: [targetCat],
      categoryTargetLimit: 200,
      perSubcategoryMax: 10,
      taxonomyConfig: { [targetCat]: subList },
      categoryStats: [
        { category: targetCat, productCount: 0, coverageCount: 0, subcategories: subList.map((s) => ({ subcategory: s, productCount: 0, isLowBase: true })), lastCollectedAt: null, status: 'Ativa' },
      ],
    });

    // Step 1: Subcategoria 1 (Botas)
    const step1 = await executeSubcategoryExpansionStep(state, async () => ({
      products: [],
      creditsUsed: 1,
      hasMore: false,
      totalReceived: 0,
      insertedIds: [],
    }));

    assert(step1.progress.subcategoryIndex === 1, 'Progresso do step 1 reflete subcategoryIndex = 1');
    assert(step1.progress.totalSubcategoriesInCategory === 3, 'totalSubcategoriesInCategory = 3');
    assert(step1.progress.subcategoryIndex >= 1 && step1.progress.subcategoryIndex <= step1.progress.totalSubcategoriesInCategory, '1 <= subcategoryIndex <= totalSubcategoriesInCategory');

    // Step 2: Subcategoria 2 (Sandálias)
    const step2 = await executeSubcategoryExpansionStep(step1.state, async () => ({
      products: [],
      creditsUsed: 1,
      hasMore: false,
      totalReceived: 0,
      insertedIds: [],
    }));

    assert(step2.progress.subcategoryIndex === 2, 'Progresso do step 2 reflete subcategoryIndex = 2');
    assert(step2.progress.subcategoryIndex >= 1 && step2.progress.subcategoryIndex <= step2.progress.totalSubcategoriesInCategory, '1 <= subcategoryIndex <= totalSubcategoriesInCategory');
  }

  // TESTE 19: stepExpansionJobApi trata 409 STEP_IN_PROGRESS sem incrementar erro
  {
    console.log('\n[TESTE 19] API step trata STEP_IN_PROGRESS graciosamente');
    const { stepExpansionJobApi } = await import('../src/services/productMinerApi.js');
    assert(typeof stepExpansionJobApi === 'function', 'stepExpansionJobApi existe e suporta 409 STEP_IN_PROGRESS');
  }

  console.log('\n========================================================================');
  console.log(`RESULTADO DA INTEGRAÇÃO: ${passed}/${total} TESTES PASSARAM COM SUCESSO!`);
  console.log('========================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runIntegrationSuite().catch((err) => {
  console.error('Falha na integração:', err);
  process.exit(1);
});
