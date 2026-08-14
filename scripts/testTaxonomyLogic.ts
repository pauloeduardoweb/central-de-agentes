import {
  COLLECTOR_CATEGORIES,
  OFFICIAL_TIKTOK_TAXONOMY,
  classifyProductFull,
  removeAccents,
  getSubcategoryAliases,
  getCategoryAliases,
} from '../server/taxonomy.js';

// Test dataset representing real TikTok Shop products across various categories
const sampleProducts = [
  // Roupas masculinas e roupas íntimas masculinas
  { title: 'Kit 10 Cuecas Boxer Sem Costura Masculina Microfibra', category_path: 'Roupas masculinas e roupas íntimas masculinas > Roupas íntimas masculinas > Cuecas', query_source: 'Roupas masculinas e roupas íntimas masculinas' },
  { title: 'Camiseta Masculina Básica Algodão Premium Slim Fit', category_path: 'Roupas masculinas e roupas íntimas masculinas > Peças masculinas para parte superior', query_source: 'Roupas masculinas e roupas íntimas masculinas' },
  { title: 'Calça Jeans Masculina Skinny Rasgada Estilosa', category_path: 'Roupas masculinas e roupas íntimas masculinas > Peças masculinas para parte inferior', query_source: 'Roupas masculinas e roupas íntimas masculinas' },
  { title: 'Blazer Masculino Slim Fit Alfaiataria Terno', category_path: 'Roupas masculinas e roupas íntimas masculinas > Ternos', query_source: 'Roupas masculinas e roupas íntimas masculinas' },
  { title: 'Kit 12 Pares de Meias Cano Curto Soquete Masculina', category_path: 'Roupas masculinas e roupas íntimas masculinas > Meias', query_source: 'Roupas masculinas e roupas íntimas masculinas' },
  { title: 'Conjunto Moletom Masculino Casaco com Capuz e Calça', category_path: 'Roupas masculinas e roupas íntimas masculinas > Conjuntos', query_source: 'Roupas masculinas e roupas íntimas masculinas' },
  
  // Utensílios de cozinha
  { title: 'Copo Térmico Com Tampa e Abridor Inox 473ml', category_path: 'Utensílios de cozinha > Utensílios para bebidas > Copos térmicos', query_source: 'Utensílios de cozinha' },
  { title: 'Processador e Triturador Manual de Alimentos Alho Legumes', category_path: 'Utensílios de cozinha > Utensílios e aparelhos de cozinha', query_source: 'Utensílios de cozinha' },
  { title: 'Jogo 6 Facas Inox Antiaderente Chef Cozinha com Descascador', category_path: 'Utensílios de cozinha > Facas de cozinha', query_source: 'Utensílios de cozinha' },
  { title: 'Forma de Silicone para Airfryer Redonda Antiaderente Reutilizável', category_path: 'Utensílios de cozinha > Utensílios para forno', query_source: 'Utensílios de cozinha' },
  { title: 'Frigideira Antiaderente Cerâmica Wok com Tampa', category_path: 'Utensílios de cozinha > Utensílios para cozinhar', query_source: 'Utensílios de cozinha' },
  { title: 'Kit Churrasco Inox 3 Peças Faca Garfo Pegador na Maleta', category_path: 'Utensílios de cozinha > Churrasco', query_source: 'Utensílios de cozinha' },
  { title: 'Prensa Francesa Cafeteira de Vidro e Inox 600ml', category_path: 'Utensílios de cozinha > Utensílios para chá e café', query_source: 'Utensílios de cozinha' },
  
  // Saúde
  { title: 'Creatina Monohidratada 100% Pura 300g Max Titanium', category_path: 'Saúde > Suplementos alimentares', query_source: 'Saúde' },
  { title: 'Óleo Essencial de Lavanda 100% Puro e Natural 10ml', category_path: 'Saúde > Medicamentos e tratamentos alternativos', query_source: 'Saúde' },
  { title: 'Medidor de Pressão Arterial Digital de Braço Automático', category_path: 'Saúde > Suprimentos médicos', query_source: 'Saúde' },

  // Beleza e cuidados pessoais
  { title: 'Batom Líquido Matte Longa Duração Alta Pigmentação', category_path: 'Beleza e cuidados pessoais > Maquiagem', query_source: 'Beleza e cuidados pessoais' },
  { title: 'Perfume Feminino Body Splash Doce Encanto 200ml', category_path: 'Beleza e cuidados pessoais > Fragrâncias', query_source: 'Beleza e cuidados pessoais' },
  { title: 'Sérum Facial Ácido Hialurônico Hidratação Profunda', category_path: 'Beleza e cuidados pessoais > Cuidados com a pele', query_source: 'Beleza e cuidados pessoais' },
  { title: 'Kit Shampoo e Condicionador Reconstrução Capilar Óleo de Argan', category_path: 'Beleza e cuidados pessoais > Cuidados com cabelos e penteados', query_source: 'Beleza e cuidados pessoais' },

  // Generic / Unclassified edge cases
  { title: 'Produto Sem Categoria Específica Teste 1', category_path: 'Utensílios de cozinha', query_source: 'Utensílios de cozinha' },
  { title: 'Item Genérico Não Mapeado Teste 2', category_path: 'Saúde', query_source: 'Saúde' },
];

function runTests() {
  console.log('=== TESTE DE TAXONOMIA E CLASSIFICAÇÃO ÚNICA ===');

  let passed = 0;
  let total = sampleProducts.length;

  for (const p of sampleProducts) {
    const res = classifyProductFull(p);
    
    // Invariant 1: Exactly 1 valid Category
    const isValidCategory = COLLECTOR_CATEGORIES.includes(res.category as any);
    
    // Invariant 2: Subcategory is either null or strictly belongs to the Category
    const validSubs = OFFICIAL_TIKTOK_TAXONOMY[res.category] || [];
    const isValidSub = res.subcategory === null || validSubs.includes(res.subcategory);

    // Invariant 3: Single winner (cannot return an array or overlapping values)
    const isSingleWinner = typeof res.category === 'string' && (res.subcategory === null || typeof res.subcategory === 'string');

    if (isValidCategory && isValidSub && isSingleWinner) {
      passed++;
      console.log(`[PASS] "${p.title.slice(0, 45)}..." -> [${res.category}] > [${res.subcategory || 'SEM SUBCAT'}] (Src: ${res.source})`);
    } else {
      console.error(`[FAIL] "${p.title}" -> ${JSON.stringify(res)}`);
    }
  }

  console.log(`\nTaxonomy Engine: ${passed}/${total} testes aprovados com sucesso!`);
}

runTests();
