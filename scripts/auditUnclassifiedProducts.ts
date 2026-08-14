import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { runDeepUnclassifiedAudit } from '../server/unclassifiedAuditService.js';

async function main() {
  console.log('========================================================================');
  console.log('AUDITORIA PROFUNDA DE PRODUTOS SEM SUBCATEGORIA (100% READ-ONLY)');
  console.log('========================================================================\n');

  const report = await runDeepUnclassifiedAudit();

  if (!report.isDatabaseConnected) {
    console.log('⚠️  AVISO DE CONEXÃO:');
    console.log('O ambiente local de execução atual não possui variáveis de conexão ativas com o MySQL de produção.');
    console.log('Conforme diretriz estrita: NÃO apresentamos números simulados ou estimados.\n');
    console.log('A auditoria de produtos unclassified está disponível através do endpoint:');
    console.log('GET /api/product-miner/admin/audit-unclassified-products-readonly');
    process.exit(0);
  }

  console.log(`TOTAL DE PRODUTOS: ${report.totalMySQL}`);
  console.log(`SEM SUBCATEGORIA ATUAL: ${report.totalUnclassifiedCurrent}\n`);

  console.log(`POSSÍVEL SUBCATEGORIA COM CONFIANÇA ALTA: ${report.possibleSubcategory.alta}`);
  console.log(`POSSÍVEL SUBCATEGORIA COM CONFIANÇA MÉDIA: ${report.possibleSubcategory.media}`);
  console.log(`POSSÍVEL SUBCATEGORIA COM CONFIANÇA BAIXA: ${report.possibleSubcategory.baixa}`);
  console.log(`SEM EVIDÊNCIA SUFICIENTE: ${report.possibleSubcategory.nenhuma}\n`);

  console.log(`POSSÍVEL CHILD CATEGORY ALTA: ${report.possibleChildCategory.alta}`);
  console.log(`POSSÍVEL CHILD CATEGORY MÉDIA: ${report.possibleChildCategory.media}`);
  console.log(`SEM CHILD CATEGORY: ${report.possibleChildCategory.semChildCategory}\n`);

  console.log('DISTRIBUIÇÃO POR CATEGORIA PRINCIPAL:');
  console.log('-----------------------------------------------------------------------------------------------');
  console.log('| Categoria                                      | Sem Subcat | Alta | Média | Baixa | Nenhuma |');
  console.log('-----------------------------------------------------------------------------------------------');
  for (const b of report.categoryBreakdown) {
    if (b.unclassifiedCurrent > 0) {
      console.log(
        `| ${b.category.padEnd(46)} | ${String(b.unclassifiedCurrent).padStart(10)} | ${String(b.alta).padStart(4)} | ${String(b.media).padStart(5)} | ${String(b.baixa).padStart(5)} | ${String(b.nenhuma).padStart(7)} |`
      );
    }
  }
  console.log('-----------------------------------------------------------------------------------------------\n');

  console.log('VALIDAÇÕES OBRIGATÓRIAS:');
  console.log(`- Subcategorias pertencem à categoria pai: ${report.validations.allSuggestedSubcategoriesBelongToCategory ? 'SIM ✅' : 'NÃO ❌'}`);
  console.log(`- Child categories pertencem à whitelist: ${report.validations.allSuggestedChildCategoriesWhitelisted ? 'SIM ✅' : 'NÃO ❌'}`);
  console.log(`- Zero conflitos entre subcategorias irmãs: ${report.validations.zeroSiblingConflicts ? 'SIM ✅' : 'NÃO ❌'}`);
  console.log(`- Produtos ambíguos permanecem null: ${report.validations.ambiguousStayNull ? 'SIM ✅' : 'NÃO ❌'}`);
  console.log(`- Zero fallback para Utensílios de cozinha: ${report.validations.zeroForcedKitchenUtensils ? 'SIM ✅' : 'NÃO ❌'}`);
  console.log(`- Zero fallback para primeira da lista: ${report.validations.zeroFirstElementFallback ? 'SIM ✅' : 'NÃO ❌'}`);
  console.log(`- category_path imutável: ${report.validations.rawCategoryPathIntact ? 'SIM ✅' : 'NÃO ❌'}`);
  console.log(`- query_source imutável: ${report.validations.rawQuerySourceIntact ? 'SIM ✅' : 'NÃO ❌'}`);
  console.log(`- Execução determinística e idempotente: ${report.validations.isDeterministic ? 'SIM ✅' : 'NÃO ❌'}\n`);

  console.log('METADADOS DE EXECUÇÃO:');
  console.log(`MySQL alterado: NÃO`);
  console.log(`SocialCrawl chamada: NÃO`);
  console.log(`Créditos consumidos: 0`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Execution error:', err);
  process.exit(1);
});
