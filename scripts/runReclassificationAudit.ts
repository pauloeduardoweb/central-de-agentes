import { db, isDatabaseConfigured, testDatabaseConnection } from '../server/database.js';
import { reclassifyExistingDatabaseProducts } from '../server/productMinerService.js';
import { OFFICIAL_TIKTOK_TAXONOMY } from '../server/taxonomy.js';

async function main() {
  console.log('===============================================================');
  console.log('RECLASSIFICAÇÃO REAL DE PRODUTOS EXISTENTES NO BANCO DE DADOS');
  console.log('===============================================================');

  if (!isDatabaseConfigured()) {
    console.error('❌ ERRO: O banco de dados não está configurado no ambiente local de build.');
    console.log('Em produção (Cloud Run), o banco de dados é conectado via credenciais de ambiente gerenciadas.');
    console.log('A rotina de reclassificação segura `/api/product-miner/admin/reclassify` foi atualizada e está pronta.');
    return;
  }

  const isConnected = await testDatabaseConnection();
  if (!isConnected) {
    console.error('❌ ERRO: Não foi possível estabelecer conexão com o MySQL de produção.');
    return;
  }

  console.log('⚡ Conexão com o banco de dados estabelecida. Iniciando reclassificação em lote...');

  // Executa reclassificação segura (0 chamadas SocialCrawl, 0 créditos)
  const report = await reclassifyExistingDatabaseProducts();

  console.log('\n--- RESULTADO DA RECLASSIFICAÇÃO EM LOTE ---');
  console.log(`Total de produtos reavaliados: ${report.totalAnalyzed}`);
  console.log(`Total com classificação modificada: ${report.totalChanged}`);
  console.log(`Total com classificação mantida: ${report.totalMaintained}`);
  console.log(`Total classificados: ${report.totalClassified}`);
  console.log(`Total não classificados: ${report.totalUnclassified}`);
  console.log(`Chamadas SocialCrawl: ${report.socialCrawlCalled ? 'SIM (ERRO)' : '0'}`);
  console.log(`Créditos consumidos: ${report.creditsConsumed}`);

  // Consulta detalhada de Moda Muçulmana
  const [muslimProducts]: any = await db.query(`
    SELECT product_id, title, category_path, query_source,
           classified_category, classified_subcategory, classified_child_category, classification_source
    FROM tiktok_shop_products
    WHERE classified_category = 'Moda muçulmana'
  `);

  const list = Array.isArray(muslimProducts) ? muslimProducts : [];
  console.log(`\n--- CONTAGEM DE MODA MUÇULMANA NO BANCO ---`);
  console.log(`Total de produtos em "Moda muçulmana": ${list.length}`);

  const officialSubs = OFFICIAL_TIKTOK_TAXONOMY['Moda muçulmana'] || [];
  const subCounts: Record<string, number> = {};
  for (const s of officialSubs) subCounts[s] = 0;

  for (const p of list) {
    const sub = p.classified_subcategory;
    if (sub && subCounts[sub] !== undefined) {
      subCounts[sub]++;
    }
  }

  console.log('\n--- DISTRIBUIÇÃO PELAS 9 SUBCATEGORIAS OFICIAIS ---');
  let activeSubCount = 0;
  for (const s of officialSubs) {
    const count = subCounts[s] || 0;
    if (count > 0) activeSubCount++;
    console.log(`- ${s}: ${count} produtos ${count > 0 ? '✅' : '⚪ (0)'}`);
  }

  const coveragePercent = ((activeSubCount / officialSubs.length) * 100).toFixed(1);
  console.log(`\nSubcategorias com productCount > 0: ${activeSubCount} de ${officialSubs.length} (${coveragePercent}%)`);

  console.log('\n--- AMOSTRA DE PRODUTOS CLASSIFICADOS COMO MODA MUÇULMANA ---');
  const sample = list.slice(0, 15);
  for (const p of sample) {
    console.log(`ID: ${p.product_id} | Sub: ${p.classified_subcategory} | Source: ${p.classification_source}`);
    console.log(`  Title: "${p.title}"`);
    console.log(`  Path:  "${p.category_path}"`);
    console.log(`  Query: "${p.query_source}"`);
    console.log('---------------------------------------------------------------');
  }
}

main().catch((err) => {
  console.error('Fatal error during reclassification:', err);
});
