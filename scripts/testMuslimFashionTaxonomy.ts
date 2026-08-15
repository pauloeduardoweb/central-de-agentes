import { classifyProductFull } from '../server/taxonomy.js';

const testCases = [
  {
    name: '1. Lenço Hijab Seda Muçulmana',
    input: {
      title: 'Lenço Hijab Seda Muçulmana Estampado',
      category_path: 'Acessórios de moda > Lenços e xales',
      query_source: 'Hijabs',
    },
    expectedCategory: 'Moda muçulmana',
    expectedSubcategory: 'Hijabs',
  },
  {
    name: '2. Vestido Abaya Islâmico',
    input: {
      title: 'Vestido Abaya Islâmico Bordado Dubai Kaftan',
      category_path: 'Roupas femininas e roupas íntimas femininas > Vestidos femininos',
      query_source: 'Roupas islâmicas femininas',
    },
    expectedCategory: 'Moda muçulmana',
    expectedSubcategory: 'Roupas islâmicas femininas',
  },
  {
    name: '3. Balandrau Muçulmano Túnica',
    input: {
      title: 'Balandrau Muçulmano Masculino Túnica Árabe',
      category_path: 'Roupas masculinas e roupas íntimas masculinas > Peças masculinas para parte superior',
      query_source: 'Roupas islâmicas masculinas',
    },
    expectedCategory: 'Moda muçulmana',
    expectedSubcategory: 'Roupas islâmicas masculinas',
  },
  {
    name: '4. Burkini Islâmico Moda Praia Modesta',
    input: {
      title: 'Burkini Islâmico Roupa de Banho Modesta Completa',
      category_path: 'Esportes e lazer ao ar livre > Natação',
      query_source: 'Roupas esportivas islâmicas',
    },
    expectedCategory: 'Moda muçulmana',
    expectedSubcategory: 'Roupas esportivas islâmicas',
  },
  {
    name: '5. Kufi Touca Islâmica para Oração',
    input: {
      title: 'Kufi Touca Islâmica Masculina para Oração',
      category_path: 'Acessórios de moda > Chapéus e bonés',
      query_source: 'Roupas islâmicas masculinas',
    },
    expectedCategory: 'Moda muçulmana',
    expectedSubcategory: 'Roupas islâmicas masculinas',
  },
  {
    name: '6. Tasbih 99 Contas Terço Islâmico',
    input: {
      title: 'Tasbih 99 Contas de Cristal Terço Islâmico para Oração',
      category_path: 'Joias, acessórios e derivados > Terços e rosários',
      query_source: 'Acessórios islâmicos',
    },
    expectedCategory: 'Moda muçulmana',
    expectedSubcategory: 'Acessórios islâmicos',
  },
  {
    name: '7. Tapete de Oração Islâmico',
    input: {
      title: 'Tapete de Oração Islâmico Veludo Macio',
      category_path: 'Têxteis e móveis > Têxteis domésticos',
      query_source: 'Traje e equipamento de oração',
    },
    expectedCategory: 'Moda muçulmana',
    expectedSubcategory: 'Traje e equipamento de oração',
  },
  {
    name: '8. Vestido feminino comum (NÃO PODE IR PARA MODA MUÇULMANA)',
    input: {
      title: 'Vestido Longo Floral Feminino Casual Verão',
      category_path: 'Roupas femininas e roupas íntimas femininas > Vestidos femininos',
      query_source: 'Vestidos femininos',
    },
    expectedCategory: 'Roupas femininas e roupas íntimas femininas',
    expectedSubcategory: 'Vestidos femininos',
  },
  {
    name: '9. Lenço comum estampado (NÃO PODE IR PARA MODA MUÇULMANA)',
    input: {
      title: 'Lenço de Cetim Estampado Animal Print Elegante',
      category_path: 'Acessórios de moda > Acessórios para roupas',
      query_source: 'Acessórios para roupas',
    },
    expectedCategory: 'Acessórios de moda',
  },
  {
    name: '10. Moletom inverno com query_source Agasalhos (NÃO PODE IR PARA MODA MUÇULMANA)',
    input: {
      title: 'Moletom Feminino Capuz Flanelado Inverno Quente',
      category_path: 'Roupas femininas e roupas íntimas femininas > Peças femininas para parte superior',
      query_source: 'Agasalhos',
    },
    expectedCategory: 'Roupas femininas e roupas íntimas femininas',
  },
  {
    name: '11. Sobretudo Modesto Islâmico com query_source Agasalhos',
    input: {
      title: 'Sobretudo Modesto Islâmico Feminino Longo Elegante',
      category_path: 'Roupas femininas e roupas íntimas femininas',
      query_source: 'Agasalhos',
    },
    expectedCategory: 'Moda muçulmana',
    expectedSubcategory: 'Agasalhos',
  },
];

let allPassed = true;
console.log('--- TESTANDO CLASSIFICAÇÃO COM PRECEDÊNCIA DE MODA MUÇULMANA ---');

for (const tc of testCases) {
  const result = classifyProductFull(tc.input);
  const catMatch = result.category === tc.expectedCategory;
  const subMatch = !tc.expectedSubcategory || result.subcategory === tc.expectedSubcategory;
  
  if (catMatch && subMatch) {
    console.log(`✅ [PASS] ${tc.name} -> Cat: "${result.category}" | Sub: "${result.subcategory}"`);
  } else {
    allPassed = false;
    console.error(`❌ [FAIL] ${tc.name}`);
    console.error(`   Expected: Cat: "${tc.expectedCategory}" | Sub: "${tc.expectedSubcategory || 'any'}"`);
    console.error(`   Actual:   Cat: "${result.category}" | Sub: "${result.subcategory}"`);
    console.error(`   Source:   "${result.source}" | Path: "${result.resolvedPath}"`);
  }
}

if (allPassed) {
  console.log('\n🎉 TODOS OS TESTES PASSARAM COM 100% DE PRECISÃO!');
} else {
  console.error('\n❌ ALGUNS TESTES FALHARAM!');
  process.exit(1);
}
