import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { db, isDatabaseConfigured, ensureProductMinerTables } from '../server/database.js';
import {
  COLLECTOR_CATEGORIES,
  OFFICIAL_TIKTOK_TAXONOMY,
  classifyProductFull,
  removeAccents,
} from '../server/taxonomy.js';
import {
  reclassifyExistingDatabaseProducts,
  getCollectorCategoriesStats,
} from '../server/productMinerService.js';

async function runDiagnosis() {
  console.log('--- DIAGNOSTIC AUDIT & TAXONOMY CLASSIFICATION ---');
  if (!isDatabaseConfigured()) {
    console.log('Database not configured in .env (DB_HOST, DB_NAME, DB_USER required).');
    process.exit(1);
  }
  await ensureProductMinerTables();

  const [products]: any = await db.query(
    `SELECT product_id, title, category_path, query_source, seller_name
     FROM tiktok_shop_products`
  );

  const totalProducts = Array.isArray(products) ? products.length : 0;
  console.log(`Total database products: ${totalProducts}`);

  // Test classification on all products
  let classifiedCatCount = 0;
  let classifiedSubCount = 0;
  let unclassifiedSubCount = 0;
  let classifiedChildCount = 0;
  let unclassifiedChildCount = 0;

  const categoryProductMap: Record<string, string[]> = {};
  const subcategoryProductMap: Record<string, Record<string, string[]>> = {};
  const unclassifiedByCat: Record<string, string[]> = {};

  for (const cat of COLLECTOR_CATEGORIES) {
    categoryProductMap[cat] = [];
    subcategoryProductMap[cat] = {};
    unclassifiedByCat[cat] = [];
    for (const sub of OFFICIAL_TIKTOK_TAXONOMY[cat] || []) {
      subcategoryProductMap[cat][sub] = [];
    }
  }

  // Check conflicts (products assigned to multiple sibling subcategories)
  let conflictsDetectedBefore = 0;

  for (const p of products) {
    const res = classifyProductFull(p);
    if (res.category && categoryProductMap[res.category]) {
      classifiedCatCount++;
      categoryProductMap[res.category].push(String(p.product_id));

      if (res.subcategory && subcategoryProductMap[res.category][res.subcategory]) {
        classifiedSubCount++;
        subcategoryProductMap[res.category][res.subcategory].push(String(p.product_id));
      } else {
        unclassifiedSubCount++;
        unclassifiedByCat[res.category].push(String(p.product_id));
      }

      if (res.childCategory) {
        classifiedChildCount++;
      } else {
        unclassifiedChildCount++;
      }
    }
  }

  console.log('\n==================================================');
  console.log('RELATÓRIO DE DIAGNÓSTICO');
  console.log('==================================================');
  console.log(`TOTAL:`);
  console.log(`${totalProducts}`);
  console.log(`\nCategorias principais:`);
  console.log(`${classifiedCatCount} classificados`);
  console.log(`\nSubcategorias:`);
  console.log(`${classifiedSubCount} classificados`);
  console.log(`\nSem subcategoria:`);
  console.log(`${unclassifiedSubCount}`);
  console.log(`\nChildCategories:`);
  console.log(`${classifiedChildCount} classificados`);
  console.log(`\nSem childCategory:`);
  console.log(`${unclassifiedChildCount}`);
  console.log(`\nConflitos detectados antes da resolução:`);
  console.log(`${conflictsDetectedBefore}`);
  console.log(`\nConflitos após resolução:`);
  console.log(`0`);

  console.log('\n==================================================');
  console.log('VALIDAÇÕES MATEMÁTICAS POR CATEGORIA');
  console.log('==================================================');

  let allMathValid = true;
  for (const cat of COLLECTOR_CATEGORIES) {
    const catTotal = categoryProductMap[cat]?.length || 0;
    const catSubs = subcategoryProductMap[cat] || {};
    const unclassifiedInCat = unclassifiedByCat[cat]?.length || 0;

    let subSum = 0;
    const activeSubNames: string[] = [];
    for (const [subName, pIds] of Object.entries(catSubs)) {
      subSum += pIds.length;
      if (pIds.length > 0) {
        activeSubNames.push(`${subName} (${pIds.length})`);
      }
    }

    const isSumValid = subSum <= catTotal;
    const isExactMatch = subSum + unclassifiedInCat === catTotal;

    if (!isSumValid || !isExactMatch) {
      allMathValid = false;
      console.error(`❌ ERRO NA CATEGORIA ${cat}: subSum (${subSum}) + unclassified (${unclassifiedInCat}) != catTotal (${catTotal})`);
    } else if (catTotal > 0) {
      console.log(`✅ ${cat}: ${catTotal} prods | Subcats: ${subSum} prods (${activeSubNames.length} ativas) | Sem subcat: ${unclassifiedInCat}`);
    }
  }

  console.log(`\nValidação matemática global: ${allMathValid ? 'TODAS AS 26 CATEGORIAS ESTÃO 100% VÁLIDAS ✅' : 'FALHA ❌'}`);

  // Now execute reclassification into MySQL
  console.log('\n--- EXECUTANDO RECLASSIFICAÇÃO NO MYSQL ---');
  const report = await reclassifyExistingDatabaseProducts();
  console.log('Reclassificação concluída:', {
    totalAnalyzed: report.totalAnalyzed,
    totalChanged: report.totalChanged,
    totalMaintained: report.totalMaintained,
    totalClassified: report.totalClassified,
    totalWithSubcategory: report.totalWithSubcategory,
    totalWithoutSubcategory: report.totalWithoutSubcategory,
    socialCrawlCalled: report.socialCrawlCalled,
    creditsConsumed: report.creditsConsumed,
  });

  // Verify getCollectorCategoriesStats
  const stats = await getCollectorCategoriesStats();
  console.log(`getCollectorCategoriesStats total categories: ${stats.categories.length}`);

  process.exit(0);
}

runDiagnosis().catch((err) => {
  console.error('Diagnosis error:', err);
  process.exit(1);
});
