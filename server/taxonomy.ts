// Official TikTok Shop 26 Categories, Subcategories & Child Categories Taxonomy
// Synchronized with frontend CATEGORY_CONFIG (Source of Truth)

export const COLLECTOR_CATEGORIES = [
  'Acessórios de moda',
  'Alimentos e bebidas',
  'Automotivo e moto',
  'Bebê e maternidade',
  'Beleza e cuidados pessoais',
  'Brinquedos e passatempos',
  'Computadores e equipamentos de escritório',
  'Eletrodomésticos',
  'Esportes e atividades ao ar livre',
  'Ferramentas e hardware',
  'Joias, acessórios e derivados',
  'Livros, revistas e áudios',
  'Malas e bolsas',
  'Moda muçulmana',
  'Moda para crianças',
  'Móveis',
  'Reformas residenciais',
  'Roupas femininas e roupas íntimas femininas',
  'Roupas masculinas e roupas íntimas masculinas',
  'Sapatos',
  'Saúde',
  'Suprimentos domésticos',
  'Suprimentos para animais de estimação',
  'Telefones e eletrônicos',
  'Têxteis e móveis',
  'Utensílios de cozinha',
] as const;

export type CollectorCategoryName = (typeof COLLECTOR_CATEGORIES)[number];

export { OFFICIAL_TIKTOK_CHILD_CATEGORIES } from './childTaxonomyData.js';
import { OFFICIAL_TIKTOK_CHILD_CATEGORIES } from './childTaxonomyData.js';

export const OFFICIAL_TIKTOK_TAXONOMY: Record<string, string[]> = {
  'Acessórios de moda': [
    'Acessórios para cabelos',
    'Acessórios para roupas',
    'Bijuterias e acessórios',
    'Chapéus',
    'Coleiras e broches',
    'Extensões de cabelo e perucas',
    'Óculos',
    'Relógios e acessórios',
    'Tecidos para costura',
    'Acessórios para casamento',
  ],
  'Alimentos e bebidas': [
    'Comida instantânea',
    'Bebidas',
    'Lanches',
    'Produtos básicos e essenciais para cozinhar',
    'Panificação',
    'Leite e laticínios',
    'Alimentos frescos e congelados',
    'Cerveja, vinho e destilados',
  ],
  'Automotivo e moto': [
    'Acessórios interiores de veículos',
    'Lavagem e manutenção de carros',
    'Ferramentas de reparo de veículos',
    'Sistema eletrônico de veículos',
    'Luzes do veículo',
    'Acessórios exteriores de veículos',
    'Acessórios e peças para motos',
    'Quadriciclos, motorhomes e barcos',
    'Peças de reposição automotivas',
    'Peças de motos',
  ],
  'Bebê e maternidade': [
    'Cuidados com bebê e saúde',
    'Roupas e sapatos para bebês',
    'Móveis para bebês',
    'Suprimentos para maternidade',
    'Brinquedos para bebês',
    'Segurança de bebês',
    'Artigos essenciais para viagens de bebês',
    'Acessórios fashion para bebês',
    'Enfermagem e alimentação',
  ],
  'Beleza e cuidados pessoais': [
    'Cuidados com as mãos e os pés',
    'Cuidados com os olhos e ouvidos',
    'Itens de cuidados pessoais',
    'Maquiagem',
    'Fragrâncias',
    'Cuidados com a pele',
    'Cuidados com cabelos e penteados',
    'Cuidados nasais e orais',
    'Banho e cuidados com o corpo',
    'Cuidados pessoais especiais',
    'Cuidados masculinos',
    'Cuidados femininos',
  ],
  'Brinquedos e passatempos': [
    'Brinquedos clássicos e inovadores',
    'Bonecas e ursos de pelúcia',
    'Jogos e quebra-cabeças',
    'Esportes e brincadeiras ao ar livre',
    'Brinquedos educativos',
    'Bricolage e artesanato',
    'Brinquedos elétricos e de controle remoto',
    'Instrumentos musicais e acessórios',
  ],
  'Computadores e equipamentos de escritório': [
    'Artigos de papelaria e suprimentos para escritório',
    'Armazenamento de dados e software',
    'Periféricos e acessórios',
    'Equipamentos de escritório',
    'Componentes para desktop e laptop',
    'Componentes de rede',
    'Computadores desktop, laptops e tablets',
  ],
  'Eletrodomésticos': [
    'Eletrodomésticos',
    'Utensílios de cozinha',
    'Eletrodomésticos grandes',
    'Eletrodomésticos comerciais',
  ],
  'Esportes e atividades ao ar livre': [
    'Acessórios esportivos e para atividades ao ar livre',
    'Roupas esportivas e para atividades ao ar livre',
    'Equipamento de ginástica',
    'Trajes de banho, surfe e natação',
    'Calçados esportivos',
    'Equipamentos para acampamento e caminhada',
    'Equipamentos para esportes com bola',
    'Equipamentos para esportes aquáticos',
    'Lazer e recreação ao ar livre',
    'Equipamentos para esportes de inverno',
    'Loja oficial',
    'Jogos de jardim',
  ],
  'Ferramentas e hardware': [
    'Ferramentas de medição',
    'Ferramentas elétricas',
    'Ferramentas de jardim',
    'Hardware',
    'Equipamento de solda',
    'Ferramentas manuais',
    'Bombas e encanamento',
    'Organizadores de ferramentas',
  ],
  'Joias, acessórios e derivados': [
    'Cristal natural',
    'Pedras preciosas artificiais',
    'Platina e ouro quilate',
    'Prata',
    'Cristal artificial',
    'Jade',
    'Pedras semipreciosas',
    'Pérola',
    'Âmbar',
    'Ouro',
    'Diamante',
    'Rubi, safira e esmeralda',
  ],
  'Livros, revistas e áudios': [
    'Ciências humanas e sociais',
    'Estilo de vida e hobbies',
    'Literatura e arte',
    'Educação e escolarização',
    'Livros para bebês e infantis',
    'Economia e gestão',
    'Ciências e tecnologia',
    'Revistas e jornais',
    'Vídeo e música',
  ],
  'Malas e bolsas': [
    'Bolsas para mulheres',
    'Bolsas para homens',
    'Bolsas funcionais',
    'Malas e bolsas de viagem',
    'Acessórios para bolsas',
  ],
  'Moda muçulmana': [
    'Hijabs',
    'Roupas islâmicas femininas',
    'Roupas islâmicas masculinas',
    'Acessórios islâmicos',
    'Traje e equipamento de oração',
    'Roupas esportivas islâmicas',
    'Agasalhos',
    'Roupas islâmicas infantis',
    'Equipamento para umra',
  ],
  'Moda para crianças': [
    'Calçados para meninas',
    'Roupas para meninos',
    'Roupas para meninas',
    'Acessórios de moda infantil',
    'Calçados para meninos',
  ],
  'Móveis': [
    'Móveis comerciais',
    'Móveis para ambientes externos',
    'Móveis para ambientes internos',
    'Móveis para crianças',
  ],
  'Reformas residenciais': [
    'Acessórios de banheiro',
    'Artigos de jardinagem',
    'Luzes e Iluminação',
    'Materiais de construção',
    'Acessórios de cozinha',
    'Equipamentos e suprimentos elétricos',
    'Segurança e proteção',
    'Sistemas domésticos inteligentes',
    'Energia solar e eólica',
  ],
  'Roupas femininas e roupas íntimas femininas': [
    'Roupas íntimas femininas',
    'Ternos e macacões femininos',
    'Vestidos femininos',
    'Peças femininas para parte superior',
    'Moda feminina de dormir e lazer',
    'Peças femininas para parte inferior',
    'Roupas especiais para mulheres',
    'Conjuntos de roupas para família',
    'Fantasias e acessórios',
    'Leggings',
  ],
  'Roupas masculinas e roupas íntimas masculinas': [
    'Peças masculinas para parte superior',
    'Peças masculinas para parte inferior',
    'Ternos e macacões masculinos',
    'Roupas íntimas masculinas',
    'Moda masculina de dormir e lazer',
    'Roupas especiais masculinas',
    'Conjuntos',
    'Ternos',
    'Meias',
    'Roupões, robes e macacões',
  ],
  'Sapatos': [
    'Acessórios para sapatos',
    'Sapatos femininos',
    'Sapatos masculinos',
  ],
  'Saúde': [
    'Suplementos alimentares',
    'Medicamentos e tratamentos alternativos',
    'Suprimentos médicos',
  ],
  'Suprimentos domésticos': [
    'Suprimentos para cuidados domésticos',
    'Suprimentos para banheiro',
    'Organizadores domésticos',
    'Decoração de casa',
    'Artigos festivos e para festas',
    'Ferramentas e acessórios para lavanderia',
    'Garrafas e frascos de armazenamento',
    'Guarda-chuvas',
    'Vasos e enchimentos',
    'Variedades para casas',
  ],
  'Suprimentos para animais de estimação': [
    'Adestramento de cães e gatos',
    'Areia para cães e gatos',
    'Acessórios para cães e gatos',
    'Peixes e suprimentos aquáticos',
    'Saúde para cães e gatos',
    'Suprimentos para animais pequenos',
    'Roupas para cães e gatos',
    'Comida para cães e gatos',
    'Suprimentos para animais de fazenda e aves',
    'Móveis para cães e gatos',
    'Suprimentos para pássaros',
    'Suprimentos para répteis e anfíbios',
  ],
  'Telefones e eletrônicos': [
    'Acessórios para telefone',
    'Áudio e vídeo',
    'Dispositivos inteligentes e tecnologia vestível',
    'Câmeras e fotografia',
    'Acessórios universais',
    'Jogos e consoles',
    'Telefones e tablets',
    'Acessórios para tablets e computadores',
    'Eletrônicos recondicionados',
    'Dispositivos de educação',
  ],
  'Têxteis e móveis': [
    'Roupas de cama',
    'Têxteis domésticos',
    'Tecidos e suprimentos de costura',
  ],
  'Utensílios de cozinha': [
    'Utensílios para bebidas',
    'Utensílios e aparelhos de cozinha',
    'Utensílios para forno',
    'Facas de cozinha',
    'Utensílios para cozinhar',
    'Utensílios para bares e vinhos',
    'Talheres e serviços de mesa',
    'Churrasco',
    'Utensílios para chá e café',
  ],
};

export const CATEGORY_ALIASES_MAP: Record<string, string[]> = {
  'Acessórios de moda': ['Fashion Accessories', 'Fashion Accessories & Jewelry', 'Acessorios de moda', 'Acessórios'],
  'Alimentos e bebidas': ['Food & Beverages', 'Food & Drinks', 'Alimentos', 'Bebidas e Alimentos'],
  'Automotivo e moto': ['Automotive & Motorcycle', 'Automotive & Motor', 'Auto & Moto', 'Automotivo', 'Veículos'],
  'Bebê e maternidade': ['Baby & Maternity', 'Baby & Mother', 'Bebê', 'Maternidade', 'Infantil e Bebê'],
  'Beleza e cuidados pessoais': ['Beauty & Personal Care', 'Beauty', 'Personal Care', 'Beleza', 'Cuidados Pessoais', 'Cosméticos'],
  'Brinquedos e passatempos': ['Toys & Hobbies', 'Toys & Games', 'Brinquedos', 'Passatempos', 'Jogos'],
  'Computadores e equipamentos de escritório': ['Computers & Office Equipment', 'Computers & Office', 'Informática', 'Escritório', 'TI'],
  'Eletrodomésticos': ['Home Appliances', 'Appliances', 'Eletros', 'Linha Branca'],
  'Esportes e atividades ao ar livre': ['Sports & Outdoors', 'Sports & Outdoor', 'Esportes', 'Fitness', 'Academia'],
  'Ferramentas e hardware': ['Tools & Hardware', 'Tools', 'Hardware', 'Ferramentas'],
  'Joias, acessórios e derivados': ['Jewelry & Accessories', 'Jewelry, Accessories & Derivatives', 'Joias', 'Semi Joias', 'Semijoias', 'Joias e Acessórios'],
  'Livros, revistas e áudios': ['Books, Magazines & Audio', 'Books & Audio', 'Livros', 'Revistas', 'Educação'],
  'Malas e bolsas': ['Luggage & Bags', 'Bags & Luggage', 'Bolsas', 'Malas', 'Mochilas'],
  'Moda muçulmana': [
    'Moda Muçulmana',
    'Moda Muculmana',
    'Moda Islâmica',
    'Moda Islamica',
    'Muslim Fashion',
    'Islamic Fashion',
    'Moda Modesta',
    'Modest Fashion',
    'Roupas Islâmicas',
    'Roupas Islamicas',
    'Roupas Muçulmanas',
    'Roupas Muculmanas',
    'Vestimenta Islâmica',
    'Vestimenta Islamica',
    'Artigos Islâmicos',
    'Artigos Islamicos',
    'Hijab',
    'Abaya',
    'Balandrau',
    'Burkini',
    'Kaftan',
    'Thobe',
    'Kufi',
    'Tasbih',
    'Jilbab',
    'Khimar',
    'Niqab',
    'Ihram',
    'Misbaha',
    'Kandura',
    'Jubba',
    'Shayla',
  ],
  'Moda para crianças': ["Kids' Fashion", 'Children Fashion', 'Moda Infantil', 'Roupas Infantis', 'Infantil'],
  'Móveis': ['Furniture', 'Home Furniture', 'Moveis', 'Decoração de Móveis'],
  'Reformas residenciais': ['Home Improvement', 'Home Renovations', 'Construção', 'Reformas'],
  'Roupas femininas e roupas íntimas femininas': ["Women's Clothing & Underwear", "Women's Apparel", "Women's Fashion", 'Moda Feminina', 'Roupas Femininas', 'Lingerie'],
  'Roupas masculinas e roupas íntimas masculinas': ["Men's Clothing & Underwear", "Men's Apparel", "Men's Fashion", 'Moda Masculina', 'Roupas Masculinas'],
  'Sapatos': ['Shoes', 'Footwear', 'Calçados', 'Calcados', 'Tênis e Calçados'],
  'Saúde': ['Health', 'Health & Wellness', 'Saude', 'Suplementos e Saúde'],
  'Suprimentos domésticos': ['Home Supplies', 'Household Supplies', 'Casa e Limpeza', 'Utilidades Domésticas', 'Utilidades'],
  'Suprimentos para animais de estimação': ['Pet Supplies', 'Pet Care', 'Pets', 'Pet Shop', 'Animais de Estimação'],
  'Telefones e eletrônicos': ['Phones & Electronics', 'Consumer Electronics', 'Eletrônicos', 'Eletronicos', 'Celulares'],
  'Têxteis e móveis': ['Textiles & Soft Furnishings', 'Home Textiles', 'Cama Mesa e Banho', 'Têxteis', 'Texteis'],
  'Utensílios de cozinha': ['Kitchenware', 'Kitchen Utensils', 'Cozinha', 'Utensilios de Cozinha'],
};

export const SUBCATEGORY_ALIASES_MAP: Record<string, string[]> = {
  // Acessórios de moda
  'Acessórios para cabelos': ['Hair Accessories', 'Hair Ties', 'Headbands', 'Presilha', 'Tiara', 'Elástico de cabelo', 'Piranha de cabelo', 'Faixa de cabelo', 'Prendedor de cabelo'],
  'Acessórios para roupas': ['Clothing Accessories', 'Belts', 'Cintos', 'Lenços', 'Cachecol', 'Suspensório', 'Cinto feminino', 'Cinto masculino'],
  'Bijuterias e acessórios': ['Fashion Jewelry', 'Bijuterias', 'Brincos', 'Colares', 'Pulseiras', 'Anéis bijuteria', 'Tornozeleira'],
  'Chapéus': ['Hats & Caps', 'Hats', 'Caps', 'Boné', 'Chapéu', 'Gorro', 'Viseira', 'Bucket hat', 'Boina'],
  'Coleiras e broches': ['Brooches & Pins', 'Broches', 'Pins', 'Broche'],
  'Extensões de cabelo e perucas': ['Hair Extensions & Wigs', 'Wigs', 'Perucas', 'Aplique de cabelo', 'Mega hair', 'Cabelo bio vegetal', 'Lace'],
  'Óculos': ['Eyewear', 'Sunglasses', 'Óculos de sol', 'Armação de óculos', 'Óculos de grau', 'Oculos escuros', 'Oculos anti luz azul'],
  'Relógios e acessórios': ['Watches & Accessories', 'Watches', 'Relógio de pulso', 'Pulseira de relógio', 'Relógio analógico', 'Relógio digital', 'Relogio'],
  'Tecidos para costura': ['Sewing Fabrics', 'Tecidos', 'Tecido'],
  'Acessórios para casamento': ['Wedding Accessories', 'Grinalda', 'Véu de noiva', 'Véu', 'Coroa de noiva'],

  // Alimentos e bebidas
  'Comida instantânea': ['Instant Food', 'Miojo', 'Macarrão instantâneo', 'Sopa instantânea', 'Ramen', 'Lámen'],
  'Bebidas': ['Beverages', 'Drinks', 'Refrigerante', 'Suco', 'Energético', 'Água mineral', 'Chá pronto', 'Isotônico', 'Kombucha'],
  'Lanches': ['Snacks', 'Salgadinho', 'Biscoito', 'Bolacha', 'Chips', 'Chocolate', 'Doces', 'Balas', 'Pipoca', 'Castanhas', 'Amendoim'],
  'Produtos básicos e essenciais para cozinhar': ['Cooking Essentials', 'Azeite', 'Óleo de cozinha', 'Arroz', 'Feijão', 'Temperos', 'Sal', 'Açúcar', 'Molho de tomate', 'Especiarias', 'Vinagre'],
  'Panificação': ['Bakery', 'Pães', 'Torradas', 'Mistura para bolo', 'Farinha', 'Fermento'],
  'Leite e laticínios': ['Dairy & Milk', 'Milk & Dairy', 'Leite', 'Queijo', 'Iogurte', 'Manteiga', 'Requeijão', 'Leite condensado'],
  'Alimentos frescos e congelados': ['Fresh & Frozen Food', 'Congelados', 'Carnes', 'Polpa de frutas', 'Frango'],
  'Cerveja, vinho e destilados': ['Beer, Wine & Spirits', 'Cerveja', 'Vinho', 'Whisky', 'Gin', 'Vodka', 'Cachaça', 'Licor', 'Espumante'],

  // Automotivo e moto
  'Acessórios interiores de veículos': ['Car Interior Accessories', 'Interior Accessories', 'Suporte celular veicular', 'Capa de volante', 'Tapete automotivo', 'Aromatizante carro', 'Organizador veicular', 'Cheirinho carro', 'Almofada de pescoço carro'],
  'Lavagem e manutenção de carros': ['Car Wash & Maintenance', 'Shampoo automotivo', 'Cera automotiva', 'Pretinho pneu', 'Microfibra automotiva', 'Lavagem a seco', 'Polidor automotivo', 'Desengraxante automotivo'],
  'Ferramentas de reparo de veículos': ['Vehicle Repair Tools', 'Macaco hidráulico', 'Chave de roda', 'Scanner automotivo OBD2', 'Kit reparo pneu', 'Compressor de ar portátil'],
  'Sistema eletrônico de veículos': ['Vehicle Electronics', 'Car Electronics', 'Som automotivo', 'Câmera de ré', 'Sensor de estacionamento', 'Rastreador GPS', 'Carregador veicular rápido', 'Central multimídia', 'Transmissor FM bluetooth'],
  'Luzes do veículo': ['Vehicle Lights', 'Car Lights', 'Lâmpada LED automotiva', 'Farol de milha', 'Fita LED carro', 'Super branca automotiva', 'Lanterna traseira'],
  'Acessórios exteriores de veículos': ['Car Exterior Accessories', 'Exterior Accessories', 'Capa para carro', 'Palheta limpador', 'Calha de chuva', 'Protetor de para-choque', 'Adesivo automotivo'],
  'Acessórios e peças para motos': ['Motorcycle Accessories & Parts', 'Capacete moto', 'Luva motoqueiro', 'Capa de moto', 'Baú moto', 'Suporte moto', 'Capa de chuva motoqueiro', 'Mochila motoboy'],
  'Quadriciclos, motorhomes e barcos': ['ATVs, RVs & Boats', 'Quadriciclos', 'Barcos', 'Jet ski'],
  'Peças de reposição automotivas': ['Automotive Replacement Parts', 'Filtro de óleo', 'Pastilha de freio', 'Vela de ignição', 'Amortecedor', 'Filtro de ar automotivo'],
  'Peças de motos': ['Motorcycle Parts', 'Pastilha moto', 'Relação moto', 'Retrovisor moto', 'Manete moto', 'Escapamento moto'],

  // Bebê e maternidade
  'Cuidados com bebê e saúde': ['Baby Care & Health', 'Baby Care', 'Fralda descartável', 'Fraldas', 'Lenço umedecido bebê', 'Pomada assadura', 'Aspirador nasal bebê', 'Termômetro bebê', 'Shampoo bebê', 'Colônia bebê'],
  'Roupas e sapatos para bebês': ['Baby Clothing & Shoes', 'Baby Clothes', 'Body bebê', 'Macacão bebê', 'Sapatinho bebê', 'Mijão bebê', 'Conjunto bebê', 'Romper bebê', 'Touca bebê'],
  'Móveis para bebês': ['Baby Furniture', 'Berço', 'Cômoda bebê', 'Trocador', 'Cadeira de alimentação', 'Poltrona de amamentação', 'Cercado bebê'],
  'Suprimentos para maternidade': ['Maternity Supplies', 'Maternity', 'Sutiã amamentação', 'Cinta pós-parto', 'Bolsa maternidade', 'Almofada de amamentação', 'Absorvente pós-parto', 'Concha de amamentação'],
  'Brinquedos para bebês': ['Baby Toys', 'Mordedor', 'Chocalho', 'Tapete de atividades bebê', 'Móbile berço', 'Brinquedo de banho bebê', 'Livro de pano bebê'],
  'Segurança de bebês': ['Baby Safety', 'Babá eletrônica', 'Grade de cama', 'Protetor de quina', 'Trava gaveta', 'Portão de segurança bebê'],
  'Artigos essenciais para viagens de bebês': ['Baby Travel Essentials', 'Carrinho de bebê', 'Bebê conforto', 'Cadeirinha auto', 'Mochila maternidade', 'Canguru bebê', 'Carregador ergonômico'],
  'Acessórios fashion para bebês': ['Baby Fashion Accessories', 'Laço bebê', 'Faixa de cabelo bebê', 'Babador bandana', 'Óculos bebê', 'Turbante bebê'],
  'Enfermagem e alimentação': ['Nursing & Feeding', 'Mamadeira', 'Chupeta', 'Bomba tira-leite', 'Copo de transição', 'Pratinho bebê', 'Babador silicone', 'Porta leite em pó', 'Esterilizador mamadeira'],

  // Beleza e cuidados pessoais
  'Cuidados com as mãos e os pés': ['Hands & Feet Care', 'Manicure', 'Pedicure', 'Lixa de unha', 'Esmalte', 'Cabine LED unhas', 'Alicate cutícula', 'Unhas postiças', 'Gel para unhas', 'Removedor de esmalte'],
  'Cuidados com os olhos e ouvidos': ['Eye & Ear Care', 'Colírio', 'Protetor auricular', 'Lentes de contato', 'Limpador de ouvido'],
  'Itens de cuidados pessoais': ['Personal Care Items', 'Algodão', 'Cotonete', 'Lenço umedecido', 'Desodorante', 'Antitranspirante', 'Gilete', 'Cera depilatória'],
  'Maquiagem': ['Makeup', 'Batom', 'Base facial', 'Rímel', 'Sombra', 'Pó compacto', 'Corretivo', 'Gloss', 'Delineador', 'Blush', 'Pincel de maquiagem', 'Iluminador', 'Contorno facial', 'Paleta de sombras', 'Bruma fixadora'],
  'Fragrâncias': ['Fragrances', 'Perfume', 'Perfumes', 'Body Splash', 'Colônia', 'Deo Parfum', 'Eau de Parfum', 'Perfume feminino', 'Perfume masculino', 'Decant'],
  'Cuidados com a pele': ['Skincare', 'Sérum', 'Protetor solar', 'Hidratante facial', 'Tônico facial', 'Sabonete facial', 'Ácido hialurônico', 'Vitamina C facial', 'Anti-idade', 'Argila facial', 'Máscara facial', 'Água micelar', 'Retinol'],
  'Cuidados com cabelos e penteados': ['Hair Care & Styling', 'Shampoo', 'Condicionador', 'Máscara capilar', 'Óleo capilar', 'Secador', 'Prancha', 'Babyliss', 'Escova secadora', 'Tonalizante', 'Tinta de cabelo', 'Reparador de pontas', 'Leave-in', 'Gelatina capilar', 'Acidificante capilar'],
  'Cuidados nasais e orais': ['Oral & Nasal Care', 'Escova de dentes', 'Pasta de dente', 'Fio dental', 'Enxaguante bucal', 'Irrigador oral', 'Clareador dental', 'Escova elétrica', 'Limpador de língua'],
  'Banho e cuidados com o corpo': ['Bath & Body Care', 'Sabonete líquido', 'Esfoliante corporal', 'Hidratante corporal', 'Óleo corporal', 'Esponja de banho', 'Creme corporal', 'Manteiga corporal'],
  'Cuidados pessoais especiais': ['Special Personal Care', 'Cuidados especiais'],
  'Cuidados masculinos': ["Men's Grooming", 'Pomada modeladora', 'Óleo para barba', 'Balm barba', 'Shampoo masculino', 'Barbeador elétrico', 'Navalhete', 'Pente para barba'],
  'Cuidados femininos': ["Women's Care", 'Absorvente', 'Sabonete íntimo', 'Coletor menstrual', 'Absorvente noturno', 'Protetor diário'],

  // Brinquedos e passatempos
  'Brinquedos clássicos e inovadores': ['Classic & Novelty Toys', 'Action figures', 'Fidget toys', 'Pop it', 'Carrinho de brinquedo', 'Massinha de modelar', 'Pista de carrinhos', 'Bonecos de ação', 'Beyblade', 'Ioiô'],
  'Bonecas e ursos de pelúcia': ['Dolls & Stuffed Toys', 'Boneca Barbie', 'Boneca reborn', 'Urso de pelúcia', 'Pelúcia', 'Bonecas', 'Bebê reborn', 'Polvo do humor'],
  'Jogos e quebra-cabeças': ['Games & Puzzles', 'Jogos de tabuleiro', 'Quebra-cabeça', 'Jogo de cartas', 'Uno', 'Dominó', 'Banco imobiliário', 'Cubo mágico', 'Baralho'],
  'Esportes e brincadeiras ao ar livre': ['Outdoor Sports & Play', 'Pipa', 'Lança bolhas', 'Bolas infantis', 'Pula pula', 'Cama elástica infantil', 'Pistola de água'],
  'Brinquedos educativos': ['Educational Toys', 'Blocos de montar', 'Lego', 'Brinquedo montessori', 'Brinquedo sensorial', 'Kit ciências infantil', 'Brinquedo pedagógico', 'Ábaco'],
  'Bricolage e artesanato': ['DIY & Crafts', 'Kit pintura infantil', 'Slime', 'Miçangas', 'Kit pulseiras', 'Massinha de biscuit', 'Telas para pintura'],
  'Brinquedos elétricos e de controle remoto': ['RC & Electric Toys', 'Carrinho controle remoto', 'Drone brinquedo', 'Robô de brinquedo', 'Helicóptero controle remoto', 'Barco controle remoto'],
  'Instrumentos musicais e acessórios': ['Musical Instruments & Accessories', 'Teclado musical infantil', 'Violão infantil', 'Flauta', 'Bateria infantil', 'Ukulele infantil', 'Xilofone'],

  // Computadores e equipamentos de escritório
  'Artigos de papelaria e suprimentos para escritório': ['Stationery & Office Supplies', 'Papelaria', 'Canetas', 'Cadernos', 'Post-it', 'Grampeador', 'Organizador de mesa', 'Marca texto', 'Estojo', 'Fita corretiva', 'Bloco de notas'],
  'Armazenamento de dados e software': ['Data Storage & Software', 'SSD', 'Pendrive', 'HD externo', 'Cartão de memória MicroSD', 'SSD NVMe', 'Pen drive 64gb'],
  'Periféricos e acessórios': ['Peripherals & Accessories', 'Teclado mecânico', 'Mouse gamer', 'Mousepad grande', 'Headset gamer', 'Webcam', 'Microfone USB', 'Suporte notebook', 'Teclado sem fio', 'Mouse sem fio'],
  'Equipamentos de escritório': ['Office Equipment', 'Impressora', 'Calculadora', 'Fragmentadora de papel', 'Plastificadora', 'Impressora térmica', 'Etiquetadora'],
  'Componentes para desktop e laptop': ['Desktop & Laptop Components', 'Placa de vídeo', 'Memória RAM', 'Processador', 'Cooler', 'Fonte PC', 'Gabinete', 'Pasta térmica'],
  'Componentes de rede': ['Networking Components', 'Roteador Wi-Fi', 'Repetidor Wi-Fi', 'Switch de rede', 'Cabo de rede RJ45', 'Adaptador Wi-Fi USB', 'Antena Wi-Fi'],
  'Computadores desktop, laptops e tablets': ['Desktops, Laptops & Tablets', 'Computers & Tablets', 'Notebook', 'MacBook', 'Tablet', 'Computador completo', 'All in one', 'PC Gamer'],

  // Eletrodomésticos
  'Eletrodomésticos': ['Small Appliances', 'Air Fryer', 'Fritadeira sem óleo', 'Liquidificador', 'Batedeira', 'Sanduicheira', 'Mixer', 'Aspirador de pó', 'Robô aspirador', 'Ferro de passar', 'Ventilador', 'Umidificador de ar', 'Cafeteira elétrica', 'Chaleira elétrica', 'Microondas'],
  'Utensílios de cozinha': ['Kitchen Appliances', 'Pipoqueira elétrica', 'Processador de alimentos', 'Panela elétrica', 'Panela de arroz elétrica', 'Moedor de café elétrico', 'Torradeira'],
  'Eletrodomésticos grandes': ['Major Appliances', 'Geladeira', 'Máquina de lavar', 'Fogão', 'Ar condicionado', 'Lava-louças', 'Freezer', 'Cooktop', 'Forno de embutir'],
  'Eletrodomésticos comerciais': ['Commercial Appliances', 'Fritadeira industrial', 'Chapa comercial', 'Liquidificador industrial', 'Forno industrial'],

  // Esportes e atividades ao ar livre
  'Acessórios esportivos e para atividades ao ar livre': ['Sports Accessories', 'Garrafa squeeze', 'Mochila hidratação', 'Munhequeira', 'Joelheira', 'Braçadeira celular', 'Luva academia', 'Faixa elástica', 'Cinta abdominal esportiva'],
  'Roupas esportivas e para atividades ao ar livre': ['Activewear', 'Sportswear', 'Camiseta dry fit', 'Short corrida', 'Top esportivo', 'Calça legging academia', 'Conjunto academia', 'Regata academia', 'Bermuda compressão'],
  'Equipamento de ginástica': ['Fitness Equipment', 'Gym Equipment', 'Halteres', 'Elástico extensor', 'Kettlebell', 'Corda de pular', 'Colchonete yoga', 'Roda abdominal', 'Barra fixa', 'Hand grip', 'Faixas mini band'],
  'Trajes de banho, surfe e natação': ['Swimwear & Surfing', 'Natação', 'Óculos natação', 'Touca natação', 'Maiô natação', 'Sunga', 'Roupa de mergulho', 'Biquíni esportivo'],
  'Calçados esportivos': ['Athletic Shoes', 'Running Shoes', 'Tênis de corrida', 'Tênis academia', 'Chuteira campo', 'Chuteira futsal', 'Chuteira society', 'Tênis crossfit'],
  'Equipamentos para acampamento e caminhada': ['Camping & Hiking', 'Barraca camping', 'Saco de dormir', 'Lanterna tática', 'Isolante térmico', 'Canivete tático', 'Bússola', 'Fogareiro portátil'],
  'Equipamentos para esportes com bola': ['Ball Sports', 'Bola de futebol', 'Bola de basquete', 'Bola de vôlei', 'Raquete de beach tennis', 'Beach tennis', 'Raqueteira', 'Bomba de encher bola', 'Bola de handebol'],
  'Equipamentos para esportes aquáticos': ['Water Sports', 'Prancha stand up paddle', 'Máscara mergulho', 'Nadadeira', 'Colete salva-vidas', 'Snorkel'],
  'Lazer e recreação ao ar livre': ['Outdoor Recreation', 'Skate', 'Patinete', 'Patins', 'Bicicleta', 'Acessórios bike', 'Capacete bike', 'Luz bike', 'Bolsa de quadro bike'],
  'Equipamentos para esportes de inverno': ['Winter Sports', 'Esqui', 'Snowboard'],
  'Loja oficial': ['Official Sports Shop'],
  'Jogos de jardim': ['Lawn Games', 'Frescolobol', 'Peteca', 'Boccia'],

  // Ferramentas e hardware
  'Ferramentas de medição': ['Measurement & Analysis Instruments', 'Trena', 'Paquímetro', 'Nível laser', 'Multímetro digital', 'Termômetro infravermelho', 'Alicate amperímetro', 'Esquadro'],
  'Ferramentas elétricas': ['Power Tools', 'Furadeira', 'Parafusadeira', 'Esmerilhadeira', 'Serra tico-tico', 'Lixadeira', 'Tupia', 'Soprador térmico', 'Martelete', 'Serra circular'],
  'Ferramentas de jardim': ['Garden Tools', 'Cortador de grama', 'Tesoura de poda', 'Aparador de cerca', 'Motosserra', 'Roçadeira', 'Mangueira', 'Pá de jardim'],
  'Hardware': ['Hardware', 'Parafusos', 'Porcas', 'Dobradiças', 'Fechos', 'Bucha de fixação', 'Trilhos', 'Ganchos', 'Rebites'],
  'Equipamento de solda': ['Welding Equipment', 'Ferro de solda', 'Máquina de solda inversora', 'Estanho de solda', 'Máscara de solda', 'Eletrodo', 'Pasta de solda'],
  'Ferramentas manuais': ['Hand Tools', 'Chave de fenda', 'Alicate universal', 'Martelo', 'Jogo de chaves combinadas', 'Chave inglesa', 'Chave philips', 'Chave torx', 'Chave allen', 'Estilete profissional'],
  'Bombas e encanamento': ['Pumps & Plumbing', 'Bomba d água', 'Conexões PVC', 'Válvulas', 'Pressurizador', 'Torneira boia', 'Sifão'],
  'Organizadores de ferramentas': ['Tool Organizers', 'Maleta de ferramentas', 'Caixa de ferramentas', 'Bolsa para ferramentas', 'Painel de ferramentas', 'Cinto porta ferramentas'],

  // Joias, acessórios e derivados
  'Cristal natural': ['Natural Crystal', 'Quartzo', 'Ametista natural', 'Cristal bruto', 'Pedra da lua'],
  'Pedras preciosas artificiais': ['Lab-Grown Gemstones', 'Zircônia', 'Moissanite', 'Pedra sintética'],
  'Platina e ouro quilate': ['Platinum & Karat Gold', 'Ouro 18k', 'Joias em ouro', 'Platina', 'Cordão 18k'],
  'Prata': ['Silver', 'Silver Jewelry', 'Prata 925', 'Colar de prata', 'Pulseira de prata', 'Brinco de prata', 'Anel de prata 925', 'Corrente prata'],
  'Cristal artificial': ['Synthetic Crystal', 'Cristais sintéticos', 'Strass'],
  'Jade': ['Jade Jewelry', 'Pedra jade', 'Gua sha jade'],
  'Pedras semipreciosas': ['Semiprecious Stones', 'Pedras naturais', 'Turmalina', 'Ágata', 'Olho de tigre', 'Citrino'],
  'Pérola': ['Pearl', 'Colar de pérolas', 'Brinco de pérola', 'Pérola de água doce'],
  'Âmbar': ['Amber', 'Colar de âmbar báltico'],
  'Ouro': ['Gold', 'Cordão de ouro', 'Anel de ouro', 'Brinco de ouro', 'Pulseira de ouro'],
  'Diamante': ['Diamond', 'Aliança de diamante', 'Solitário diamante'],
  'Rubi, safira e esmeralda': ['Ruby, Sapphire & Emerald', 'Esmeralda', 'Safira', 'Rubi'],

  // Livros, revistas e áudios
  'Ciências humanas e sociais': ['Humanities & Social Sciences', 'História', 'Filosofia', 'Sociologia', 'Psicologia', 'Antropologia', 'Política'],
  'Estilo de vida e hobbies': ['Lifestyle & Hobbies', 'Autoajuda', 'Culinária livro', 'Desenho livro', 'Espiritualidade', 'Jardinagem livro', 'Mindfulness'],
  'Literatura e arte': ['Literature & Art', 'Romances', 'Ficção', 'Poesia', 'Clássicos da literatura', 'Contos', 'Livro de fantasia'],
  'Educação e escolarização': ['Education & Schooling', 'Livros didáticos', 'Gramática', 'Dicionário', 'Concursos', 'Apostila', 'ENEM'],
  'Livros para bebês e infantis': ["Baby & Children's Books", 'Livros infantis', 'Livro de colorir', 'Historinhas para dormir', 'Livro pop-up', 'Livro sensorial infantil'],
  'Economia e gestão': ['Economics & Management', 'Finanças pessoais', 'Investimentos livro', 'Empreendedorismo', 'Administração', 'Marketing livro'],
  'Ciências e tecnologia': ['Science & Technology', 'Programação livro', 'Engenharia', 'Medicina livro', 'Física', 'Química'],
  'Revistas e jornais': ['Magazines & Newspapers', 'Revistas', 'HQs', 'Gibis', 'Mangás'],
  'Vídeo e música': ['Video & Music', 'CDs', 'DVDs', 'Vinil', 'Partituras'],

  // Malas e bolsas
  'Bolsas para mulheres': ["Women's Bags", 'Bolsa feminina', 'Bolsa tiracolo', 'Bolsa transversal', 'Bolsa de ombro', 'Clutch', 'Bolsa tote', 'Bolsa sacola', 'Bolsa baú'],
  'Bolsas para homens': ["Men's Bags", 'Bolsa masculina', 'Shoulder bag masculina', 'Pochete masculina', 'Pasta executiva', 'Bolsa carteiro'],
  'Bolsas funcionais': ['Functional Bags', 'Mochila executiva', 'Mochila antifurto', 'Mochila para notebook', 'Pochete', 'Shoulder bag', 'Mochila impermeável'],
  'Malas e bolsas de viagem': ['Luggage & Travel Bags', 'Mala de viagem', 'Mala de bordo', 'Mochila de viagem', 'Necessaire de viagem', 'Bolsa de viagem dobrável', 'Frasqueira'],
  'Acessórios para bolsas': ['Bag Accessories', 'Alça para bolsa', 'Organizador de bolsa', 'Cadeado para mala', 'Tag de mala', 'Capa para mala'],

  // Moda muçulmana
  'Hijabs': [
    'Hijabs',
    'Hijab',
    'Lenço hijab',
    'Lenco hijab',
    'Turban',
    'Turbante hijab',
    'Véu islâmico',
    'Veu islamico',
    'Véu muçulmano',
    'Veu muculmano',
    'Shayla',
    'Khimar',
    'Niqab',
    'Lenço muçulmano',
    'Lenco muculmano',
    'Touca hijab',
    'Hijabe',
  ],
  'Roupas islâmicas femininas': [
    "Women's Islamic Clothing",
    'Abaya',
    'Abayas',
    'Vestido islâmico',
    'Vestido islamico',
    'Vestido muçulmano',
    'Vestido muculmano',
    'Túnica islâmica',
    'Tunica islamica',
    'Kaftan',
    'Kaftan árabe',
    'Kaftan arabe',
    'Jilbab',
    'Jalabiya',
    'Roupas modestas femininas',
    'Vestimenta islâmica feminina',
  ],
  'Roupas islâmicas masculinas': [
    "Men's Islamic Clothing",
    'Thobe',
    'Thobes',
    'Kandura',
    'Jubba',
    'Balandrau',
    'Balandrau muçulmano',
    'Balandrau muculmano',
    'Túnica masculina muçulmana',
    'Tunica masculina muculmana',
    'Kufi',
    'Touca islâmica masculina',
    'Dishdasha',
    'Roupas islâmicas masculinas',
  ],
  'Acessórios islâmicos': [
    'Islamic Accessories',
    'Tasbih',
    'Tasbi',
    'Terço islâmico',
    'Terco islamico',
    'Misbaha',
    'Rosário islâmico',
    'Rosario islamico',
    'Contas de oração islâmica',
    'Alfinete hijab',
    'Broche hijab',
    'Pins hijab',
  ],
  'Traje e equipamento de oração': [
    'Prayer Attire & Equipment',
    'Tapete de oração',
    'Tapete de oracao',
    'Tapete islâmico',
    'Tapete islamico',
    'Tapete de oração muçulmano',
    'Tapete de oracao muculmano',
    'Vestimenta de oração',
    'Vestimenta de oracao',
    'Roupa de oração',
    'Roupa de oracao',
    'Kit oração islâmica',
  ],
  'Roupas esportivas islâmicas': [
    'Islamic Sportswear',
    'Burkini',
    'Burkinis',
    'Burkini islâmico',
    'Burkini islamico',
    'Maiô modesto',
    'Maio modesto',
    'Maiô islâmico',
    'Maio islamico',
    'Burkine',
    'Moda praia modesta',
    'Roupa de banho modesta',
  ],
  'Agasalhos': [
    'Outerwear',
    'Sobretudo modesto',
    'Casaco modesto',
    'Cardigan modesto',
    'Sobretudo islâmico',
    'Sobretudo islamico',
  ],
  'Roupas islâmicas infantis': [
    "Kids' Islamic Clothing",
    'Abaya infantil',
    'Hijab infantil',
    'Thobe infantil',
    'Roupas islâmicas infantis',
    'Roupas islamicas para criancas',
  ],
  'Equipamento para umra': [
    'Umrah Equipment',
    'Equipamento para umra',
    'Equipamento para hajj',
    'Ihram',
    'Kit umra',
    'Kit umrah',
    'Roupa para hajj',
    'Roupa para umra',
    'Cinto de ihram',
    'Toalha de ihram',
  ],

  // Moda para crianças
  'Calçados para meninas': ["Girls' Shoes", 'Sandália infantil menina', 'Tênis menina', 'Sapatilha menina', 'Bota infantil menina', 'Chinelo menina', 'Galocha infantil'],
  'Roupas para meninos': ["Boys' Clothing", 'Conjunto menino', 'Camiseta menino', 'Bermuda menino', 'Calça infantil menino', 'Camisa polo infantil menino', 'Moletom menino'],
  'Roupas para meninas': ["Girls' Clothing", 'Vestido infantil', 'Conjunto menina', 'Blusa menina', 'Saia infantil', 'Shorts menina', 'Macacão infantil menina'],
  'Acessórios de moda infantil': ["Kids' Fashion Accessories", 'Laços de cabelo infantil', 'Bolsinha infantil', 'Óculos infantil', 'Boné infantil', 'Tiara infantil', 'Cinto infantil'],
  'Calçados para meninos': ["Boys' Shoes", 'Tênis menino', 'Sandália menino', 'Chinelo infantil menino', 'Chuteira infantil', 'Bota menino', 'Mocassim infantil'],

  // Móveis
  'Móveis comerciais': ['Commercial Furniture', 'Cadeira de escritório ergonômica', 'Mesa de escritório', 'Cadeira gamer', 'Armário de escritório', 'Gaveteiro'],
  'Móveis para ambientes externos': ['Outdoor Furniture', 'Móveis de jardim', 'Conjunto varanda', 'Espreguiçadeira', 'Ombrelone', 'Banco de jardim'],
  'Móveis para ambientes internos': ['Indoor Furniture', 'Home Furniture', 'Sofá', 'Mesa de jantar', 'Rack para TV', 'Painel de TV', 'Guarda-roupa', 'Cama box', 'Cômoda', 'Mesa de centro', 'Aparador', 'Estante', 'Poltrona', 'Puff', 'Sapateira'],
  'Móveis para crianças': ["Kids' Furniture", 'Berço montessoriano', 'Cama infantil', 'Mesa infantil de estudos', 'Armário infantil', 'Organizador de brinquedos'],

  // Reformas residenciais
  'Acessórios de banheiro': ['Bathroom Fixtures', 'Chuveiro elétrico', 'Ducha higiênica', 'Torneira banheiro', 'Porta toalha', 'Ralo inteligente', 'Kit banheiro', 'Papeleira'],
  'Artigos de jardinagem': ['Gardening Supplies', 'Mangueira de jardim mágica', 'Vaso de planta', 'Regador', 'Adubo', 'Pulverizador', 'Suporte para plantas'],
  'Luzes e Iluminação': ['Lights & Lighting', 'Lâmpada LED', 'Fita LED RGB', 'Lustre pendente', 'Plafon LED', 'Refletor LED', 'Arandela', 'Spot LED', 'Luminária de mesa', 'Luminária de teto'],
  'Materiais de construção': ['Building Materials', 'Fita veda rosca', 'Silicone selante', 'Fita dupla face', 'Argamassa', 'Impermeabilizante', 'Tinta de parede', 'Rolo de pintura'],
  'Acessórios de cozinha': ['Kitchen Fixtures', 'Torneira gourmet', 'Cuba inox', 'Pia de cozinha', 'Triturador de alimentos', 'Dispenser detergente embutir', 'Válvula de pia'],
  'Equipamentos e suprimentos elétricos': ['Electrical Equipment & Supplies', 'Tomada 3 pinos', 'Interruptor touch', 'Disjuntor', 'Fios e cabos', 'Fita isolante', 'Extensão elétrica', 'Filtro de linha', 'Adaptador Benjamin'],
  'Segurança e proteção': ['Safety & Security', 'Câmera de segurança Wi-Fi', 'Fechadura digital eletrônica', 'Alarme residencial', 'Sensor de presença', 'Interfone com câmera', 'Câmera lâmpada'],
  'Sistemas domésticos inteligentes': ['Smart Home Systems', 'Interruptor inteligente Wi-Fi', 'Lâmpada inteligente Wi-Fi', 'Tomada inteligente', 'Controle universal inteligente IR', 'Sensor de porta e janela smart'],
  'Energia solar e eólica': ['Solar & Wind Energy', 'Luminária solar de parede', 'Refletor solar', 'Placa solar portátil', 'Inversor solar', 'Poste solar LED'],

  // Roupas femininas e roupas íntimas femininas
  'Roupas íntimas femininas': ["Women's Underwear", 'Calcinha', 'Sutiã', 'Conjunto lingerie', 'Lingerie', 'Baby doll', 'Cinta modeladora', 'Body rendado', 'Top sem costura', 'Calcinha sem costura', 'Sutiã push up'],
  'Ternos e macacões femininos': ["Women's Suits & Overalls", 'Macacão feminino', 'Macaquinho feminino', 'Blazer feminino', 'Terno feminino', 'Jardineira feminina'],
  'Vestidos femininos': ["Women's Dresses", 'Vestido longo', 'Vestido curto', 'Vestido midi', 'Vestido casual', 'Vestido canelado', 'Vestido estampado', 'Vestido de festa', 'Vestido tubinho'],
  'Peças femininas para parte superior': ["Women's Tops", 'Blusa feminina', 'Camiseta feminina', 'Cropped', 'Camisa feminina', 'Regata feminina', 'Cardigan', 'Suéter feminino', 'Moletom feminino', 'Body feminino', 'T-shirt feminina'],
  'Moda feminina de dormir e lazer': ["Women's Sleepwear & Loungewear", 'Pijama feminino', 'Camisola', 'Roupão feminino', 'Pijama de cetim', 'Pijama curto', 'Short doll'],
  'Peças femininas para parte inferior': ["Women's Bottoms", 'Calça jeans feminina', 'Calça pantalona', 'Short feminino', 'Saia feminina', 'Calça alfaiataria feminina', 'Short jeans', 'Saia jeans', 'Bermuda ciclista'],
  'Roupas especiais para mulheres': ["Women's Special Clothing", 'Roupas gestante', 'Roupas plus size femininas'],
  'Conjuntos de roupas para família': ['Family Matching Outfits', 'Conjunto mãe e filha', 'Look família'],
  'Fantasias e acessórios': ['Costumes & Accessories', 'Fantasia feminina', 'Cosplay'],
  'Leggings': ['Leggings', 'Calça legging', 'Legging suplex', 'Legging térmica', 'Calça montaria', 'Legging cós alto', 'Legging academia feminina'],

  // Roupas masculinas e roupas íntimas masculinas
  'Peças masculinas para parte superior': ["Men's Tops", 'Camisa masculina', 'Camiseta masculina', 'Camisa polo', 'Regata masculina', 'Moletom masculino', 'Jaqueta masculina', 'Casaco masculino', 'Blusa de frio masculina', 'Camisa social masculina', 'Camiseta oversized masculina'],
  'Peças masculinas para parte inferior': ["Men's Bottoms", 'Calça jeans masculina', 'Calça cargo masculina', 'Calça moletom masculina', 'Bermuda masculina', 'Bermuda jeans masculina', 'Short tactel masculino', 'Calça sarja', 'Short praia masculino'],
  'Ternos e macacões masculinos': ["Men's Suits & Overalls", 'Smoking masculino', 'Jardineira masculina', 'Macacão masculino'],
  'Roupas íntimas masculinas': ["Men's Underwear", 'Cueca boxer', 'Cueca slip', 'Kit cuecas', 'Cueca sem costura', 'Cuecas', 'Sunga masculina'],
  'Moda masculina de dormir e lazer': ["Men's Sleepwear & Loungewear", 'Pijama masculino', 'Samba canção', 'Pijama longo masculino'],
  'Roupas especiais masculinas': ["Men's Special Clothing", 'Uniformes profissionais masculinos', 'Roupas plus size masculinas'],
  'Conjuntos': ["Men's Sets", 'Conjunto moletom masculino', 'Conjunto bermuda e camiseta', 'Kit camisa e bermuda', 'Conjunto masculino'],
  'Ternos': ['Suits', 'Terno masculino', 'Blazer masculino', 'Costume masculino', 'Paletó'],
  'Meias': ['Socks', 'Meias masculinas', 'Kit meias', 'Meia cano longo', 'Meia cano curto', 'Meia sapatilha', 'Meia esportiva', 'Meias'],
  'Roupões, robes e macacões': ['Robes & Jumpsuits', 'Roupão masculino', 'Robe masculino'],

  // Sapatos
  'Acessórios para sapatos': ['Shoe Accessories', 'Palmilha ortopédica', 'Cadarço', 'Calçadeira', 'Graxa para sapatos', 'Protetor de calcanhar', 'Limpador de tênis'],
  'Sapatos femininos': ["Women's Shoes", 'Sandália feminina', 'Tênis feminino', 'Scarpin', 'Bota feminina', 'Mocassim feminino', 'Rasteirinha', 'Tamanco', 'Sapatilha feminina', 'Salto alto', 'Papete feminina', 'Mule feminino'],
  'Sapatos masculinos': ["Men's Shoes", 'Tênis masculino', 'Sapato social masculino', 'Bota masculina', 'Sapatênis', 'Mocassim masculino', 'Chinelo masculino', 'Sandália masculina', 'Coturno masculino', 'Slide masculino'],

  // Saúde
  'Suplementos alimentares': ['Food Supplements', 'Dietary Supplements', 'Creatina', 'Whey Protein', 'Multivitamínico', 'Colágeno', 'Ômega 3', 'Magnésio', 'Melatonina', 'BCAA', 'Glutamina', 'Pré treino', 'Coenzima Q10', 'Vitamina D3', 'Spirulina', 'Termogênico', 'Suplemento'],
  'Medicamentos e tratamentos alternativos': ['Alternative Medicine & Treatments', 'Óleo essencial', 'Homeopatia', 'Fitoterápicos', 'Florais', 'Pomada para alívio muscular', 'Bálsamo', 'Óleo de massagem relaxante'],
  'Suprimentos médicos': ['Medical Supplies', 'Medidor de pressão digital', 'Termômetro digital', 'Inalador nebulizador', 'Oxímetro de pulso', 'Glicosímetro', 'Tornozeleira ortopédica', 'Faixa lombar', 'Corretor postural', 'Máscaras cirúrgicas', 'Curativos'],

  // Suprimentos domésticos
  'Suprimentos para cuidados domésticos': ['Household Cleaning Supplies', 'Mop giratório', 'Rodo mágico', 'Panos de microfibra', 'Escova de limpeza elétrica', 'Detergente concentrado', 'Desinfetante', 'Esponja de limpeza', 'Limpador multiuso', 'Tira manchas', 'Lustra móveis'],
  'Suprimentos para banheiro': ['Bathroom Supplies', 'Porta escova de dentes', 'Dispenser sabonete', 'Lixeira banheiro', 'Escova sanitária', 'Tapete de banheiro absorvente', 'Cortina de box', 'Saboneteira'],
  'Organizadores domésticos': ['Home Organizers', 'Organizador de gaveta', 'Caixa organizadora', 'Cabides', 'Colmeia organizadora', 'Saco a vácuo para roupas', 'Sapateira vertical', 'Organizador de maquiagem', 'Cesto organizador'],
  'Decoração de casa': ['Home Decor', 'Quadro decorativo', 'Relógio de parede', 'Almofada decorativa', 'Velas aromáticas', 'Difusor de aromas', 'Espelho decorativo', 'Tapete sala', 'Estatueta', 'Porta retrato'],
  'Artigos festivos e para festas': ['Festive & Party Supplies', 'Balões de festa', 'Enfeites de aniversário', 'Artigos descartáveis para festa', 'Painel de festa', 'Lembrancinhas', 'Vela de aniversário', 'Topo de bolo'],
  'Ferramentas e acessórios para lavanderia': ['Laundry Tools & Accessories', 'Varal retrátil', 'Varal de chão', 'Prendedor de roupas', 'Saco para lavar roupas na máquina', 'Cesto de roupas sujas', 'Tábua de passar', 'Bolinha para máquina de lavar'],
  'Garrafas e frascos de armazenamento': ['Storage Bottles & Jars', 'Potes herméticos', 'Potes de vidro mantimentos', 'Frasco porta temperos', 'Bandeja organizadora', 'Porta condimentos', 'Garrafa de vidro'],
  'Guarda-chuvas': ['Umbrellas', 'Guarda-chuva automático', 'Sombrinha', 'Guarda-chuva reforçado', 'Guarda-chuva invertido'],
  'Vasos e enchimentos': ['Vases & Fillers', 'Vaso de cerâmica', 'Flores artificiais', 'Planta artificial decorativa', 'Vaso de vidro', 'Pedras decorativas'],
  'Variedades para casas': ['Sundries', 'Utilidades domésticas em geral', 'Protetor de tomada', 'Fita veda fresta', 'Feltro para pés de cadeira'],

  // Suprimentos para animais de estimação
  'Adestramento de cães e gatos': ['Dog & Cat Grooming & Training', 'Grooming', 'Training', 'Máquina de tosa pet', 'Rasqueadeira pet', 'Cortador de unha pet', 'Escova tira pelos pet', 'Apito adestramento', 'Clicker', 'Luva tira pelos pet'],
  'Areia para cães e gatos': ['Cat & Dog Litter', 'Litter & Housebreaking', 'Areia sanitária para gatos', 'Pá para areia', 'Caixa de areia para gatos', 'Banheiro de gato fechado', 'Tapete higiênico para cães', 'Sanitário canino', 'Granulado sanitário'],
  'Acessórios para cães e gatos': ['Cat & Dog Accessories', 'Coleira antipulgas', 'Peitoral para cachorro', 'Guia retrátil', 'Comedouro inox', 'Bebedouro fonte para gatos', 'Brinquedo mordedor cães', 'Bolinha para pet', 'Laser brinquedo gato', 'Bebedouro automático pet', 'Tag identificação pet'],
  'Peixes e suprimentos aquáticos': ['Fish & Aquatic Supplies', 'Filtro para aquário', 'Termostato aquário', 'Ração para peixes', 'Bomba de ar aquário', 'Enfeite para aquário', 'Aquário de vidro'],
  'Saúde para cães e gatos': ['Cat & Dog Health Care', 'Vermífugo pet', 'Antipulgas e carrapatos pet', 'Shampoo pet bactericida', 'Suplemento vitamínico pet', 'Limpador de ouvidos pet', 'Pasta de dente pet', 'Spray cicatrizante pet'],
  'Suprimentos para animais pequenos': ['Small Animal Supplies', 'Gaiola para hamster', 'Ração para coelho', 'Bebedouro para roedores', 'Serragem para hamster', 'Roda para hamster'],
  'Roupas para cães e gatos': ['Cat & Dog Apparel', 'Roupa para cachorro', 'Capa de chuva pet', 'Moletom pet', 'Vestido para cachorrinha', 'Bandana pet', 'Sapatinho pet'],
  'Comida para cães e gatos': ['Cat & Dog Food', 'Ração seca cachorro', 'Ração úmida sachê', 'Petisco pet biscoito', 'Bifinho para cães', 'Churu para gatos', 'Ração para gatos', 'Patê pet'],
  'Suprimentos para animais de fazenda e aves': ['Farm Animal & Poultry Supplies', 'Bebedouro aves', 'Comedouro frangos'],
  'Móveis para cães e gatos': ['Cat & Dog Furniture', 'Caminha para cachorro', 'Cama nuvem pet', 'Arranhador para gatos com casinha', 'Toca para gatos', 'Casinha de cachorro', 'Rede para gatos'],
  'Suprimentos para pássaros': ['Bird Supplies', 'Gaiola para passarinhos', 'Ração para calopsita', 'Brinquedo para pássaros', 'Poleiro', 'Banheira para pássaros'],
  'Suprimentos para répteis e anfíbios': ['Reptile & Amphibian Supplies', 'Lâmpada aquecimento répteis', 'Terrário', 'Termômetro terrário'],

  // Telefones e eletrônicos
  'Acessórios para telefone': ['Phone Accessories', 'Capa celular', 'Capinha iPhone', 'Película de vidro 3D', 'Carregador iPhone turbo', 'Cabo Tipo C rápido', 'Suporte de celular para mesa', 'Suporte magnético', 'Carregador por indução', 'Cabo lightning', 'Película de privacidade', 'Adaptador fone celular'],
  'Áudio e vídeo': ['Audio & Video', 'Fone de ouvido bluetooth sem fio', 'AirPods', 'Caixa de som bluetooth potente', 'Headset over-ear', 'Microfone de lapela sem fio', 'Fone in-ear', 'Soundbar'],
  'Dispositivos inteligentes e tecnologia vestível': ['Smart Devices & Wearables', 'Smartwatch unissex', 'Pulseira inteligente smartband', 'Relógio inteligente fitness', 'Smart band', 'Rastreador inteligente'],
  'Câmeras e fotografia': ['Cameras & Photography', 'Ring light de mesa com tripé', 'Tripé para celular articulado', 'Mini impressora térmica fotográfica', 'Luz selfie', 'Gimbal estabilizador celular', 'Lente para celular'],
  'Acessórios universais': ['Universal Accessories', 'Power Bank bateria portátil', 'Adaptador de tomada universal', 'Hub USB Tipo C 7 em 1', 'Carregador veicular turbo', 'Organizador de cabos'],
  'Jogos e consoles': ['Gaming & Consoles', 'Controle sem fio para celular/PC', 'Console portátil retro games', 'Gatilhos para celular Free Fire', 'Joystick', 'Controle bluetooth'],
  'Telefones e tablets': ['Phones & Tablets', 'Smartphone Android', 'Celular Xiaomi', 'iPhone', 'Tablet Android', 'iPad'],
  'Acessórios para tablets e computadores': ['Tablet & Computer Accessories', 'Capa com teclado para tablet', 'Caneta stylus touch pen', 'Suporte articulado para tablet/notebook', 'Película para tablet', 'Capa para iPad'],
  'Eletrônicos recondicionados': ['Refurbished Electronics'],
  'Dispositivos de educação': ['Educational Devices', 'Tablet infantil educativo', 'Lousa mágica digital LCD', 'Calculadora gráfica'],

  // Têxteis e móveis
  'Roupas de cama': ['Bedding', 'Jogo de lençol casal', 'Lençol queen', 'Edredom casal', 'Travesseiro ortopédico NASA', 'Fronha de cetim', 'Cobre leito', 'Protetor de colchão impermeável', 'Manta microfibra', 'Saia para cama box', 'Travesseiro'],
  'Têxteis domésticos': ['Home Textiles', 'Cortina blackout sala', 'Toalha de banho gigante', 'Jogo de toalhas banho', 'Toalha de mesa impermeável', 'Capa de almofada decorativa', 'Tapete felpudo', 'Pano de prato atoalhado', 'Toalha de rosto'],
  'Tecidos e suprimentos de costura': ['Fabrics & Sewing Supplies', 'Máquina de costura portátil', 'Kit linhas de costura', 'Fita métrica costura', 'Tecido tricoline', 'Tesoura de costura', 'Agulhas de costura'],

  // Utensílios de cozinha
  'Utensílios para bebidas': ['Drinkware', 'Copo térmico Stanley', 'Garrafa térmica inox', 'Caneca de cerâmica', 'Xícara de café', 'Taça de vinho/champanhe', 'Garrafa squeeze água', 'Canudo inox', 'Jarra de vidro', 'Copo de vidro', 'Caneca térmica'],
  'Utensílios e aparelhos de cozinha': ['Kitchen Tools & Gadgets', 'Descascador de legumes', 'Ralador de queijo inox', 'Espátula de silicone resistente', 'Pegador de alimentos inox', 'Balança digital de cozinha', 'Timer de cozinha', 'Escorredor de louça/macarrão', 'Abridor de latas multifuncional', 'Porta temperos giratório', 'Tábua de corte antibacteriana', 'Potes organizadores de geladeira', 'Lancheira térmica', 'Triturador manual de alho/cebola', 'Cortador de legumes'],
  'Utensílios para forno': ['Bakeware', 'Forma de bolo de silicone', 'Forma de pizza antiaderente', 'Assadeira de vidro marinex', 'Forma para pão/cupcake', 'Tapete culinário de silicone', 'Assadeira antiaderente', 'Forma de silicone'],
  'Facas de cozinha': ['Kitchen Knives', 'Jogo de facas de chef aço inox', 'Faca do chef japonesa', 'Faca de pão serrilhada', 'Afiador de facas diamantado', 'Chaira de afiar', 'Tesoura culinária multifunção', 'Cepilho facas'],
  'Utensílios para cozinhar': ['Cookware', 'Jogo de panelas antiaderente cerâmica', 'Frigideira antiaderente teflon', 'Panela de pressão fechamento externo', 'Panela Wok', 'Caçarola de ferro fundido', 'Fervedor leiteira', 'Panela antiaderente'],
  'Utensílios para bares e vinhos': ['Bar & Wine Utensils', 'Coqueteleira inox profissional', 'Abridor saca-rolhas elétrico', 'Dosador de bebidas duplo', 'Balde de gelo térmico', 'Bico dosador garrafas', 'Kit barman', 'Forma de gelo esfera/silicone'],
  'Talheres e serviços de mesa': ['Cutlery & Tableware', 'Jogo de talheres inox 24 peças', 'Faqueiro completo inox', 'Aparelho de jantar porcelana', 'Pratos rasos/fundos', 'Sousplat decorativo', 'Bowl tigela cerâmica', 'Molheira', 'Colher inox', 'Garfo inox', 'Faca de mesa'],
  'Churrasco': ['Barbecue', 'BBQ', 'Kit churrasco inox com maleta', 'Grelha moeda inox para churrasqueira', 'Espetos giratórios churrasco', 'Pegador de carne churrasco', 'Garfo trinchante churrasco', 'Tábua rústica churrasco', 'Acendedor de carvão elétrico', 'Soprador de churrasqueira'],
  'Utensílios para chá e café': ['Tea & Coffee Ware', 'Prensa francesa vidro/inox', 'Cafeteira italiana moka', 'Chaleira de bico fino inox', 'Moedor manual de grãos de café', 'Filtro coador de café permanente inox', 'Bule térmico café', 'Espumador de leite mixer manual', 'Xícara de chá'],
};

export const HIGH_PRECISION_CATEGORY_TERMS: Record<string, string[]> = {
  'Moda muçulmana': [
    'hijab',
    'hijabs',
    'hijabe',
    'hijabes',
    'abaya',
    'abayas',
    'balandrau',
    'balandraus',
    'burkini',
    'burkinis',
    'burkine',
    'kaftan',
    'kaftans',
    'caftan',
    'caftans',
    'thobe',
    'thobes',
    'thob',
    'kufi',
    'kufis',
    'tasbih',
    'tasbi',
    'tasbeeh',
    'misbaha',
    'jilbab',
    'jilbabs',
    'djellaba',
    'khimar',
    'khimars',
    'niqab',
    'niqabs',
    'ihram',
    'kandura',
    'kanduras',
    'jubba',
    'jubbah',
    'jubbas',
    'shayla',
    'shaylas',
    'dishdasha',
    'dishdashas',
    'mukena',
    'mukenas',
    'peci',
    'umra',
    'umrah',
    'hajj',
    'muculmana',
    'muculmano',
    'muculmanas',
    'muculmanos',
    'muçulmana',
    'muçulmano',
    'muçulmanas',
    'muçulmanos',
    'islamica',
    'islamico',
    'islamicas',
    'islamicos',
    'islâmica',
    'islâmico',
    'islâmicas',
    'islâmicos',
    'moda modesta',
    'modest fashion',
    'roupa modesta',
    'vestimenta modesta',
    'moda muculmana',
    'moda muçulmana',
    'moda islamica',
    'moda islâmica',
    'vestimenta islamica',
    'vestimenta islâmica',
    'vestimenta muculmana',
    'vestimenta muçulmana',
    'artigos islamicos',
    'artigos islâmicos',
    'acessorios islamicos',
    'acessórios islâmicos',
    'oracao islamica',
    'oração islâmica',
    'tapete de oracao',
    'tapete de oração',
    'lenco hijab',
    'lenço hijab',
    'veu islamico',
    'véu islâmico',
    'vestido islamico',
    'vestido islâmico',
    'vestido muculmano',
    'vestido muçulmano',
    'tunica islamica',
    'tunica islâmica',
    'tunica muculmana',
    'tunica muçulmana',
    'jalabiya',
  ],
};

const GENERIC_EXCLUSION_TERMS_FOR_MUSLIM = [
  'camiseta basica',
  'camiseta masculina',
  'camiseta feminina',
  'macacao fitness',
  'macacao esportivo',
  'joelheira',
  'cotoveleira',
  'calca jogger',
  'calca jeans',
  'calca legging',
  'top fitness',
  'top academia',
  'short corrida',
  'bermuda tactel',
  'cueca boxer',
  'sutia',
  'cropped',
  'regata fitness',
  'meia compressao',
  'luva academia',
];

export function hasHighConfidenceMuslimEvidence(rawTitle: string, rawPath: string): boolean {
  const tNorm = removeAccents(rawTitle || '').toLowerCase().trim();
  const pNorm = removeAccents(rawPath || '').toLowerCase().trim();

  // 1. Explicit high-precision terms in TITLE always win
  const terms = HIGH_PRECISION_CATEGORY_TERMS['Moda muçulmana'] || [];
  for (const term of terms) {
    if (containsWordOrPhrase(tNorm, term)) return true;
  }

  // 2. If title contains clearly generic clothing/fitness terms without explicit Muslim terms, reject
  for (const genTerm of GENERIC_EXCLUSION_TERMS_FOR_MUSLIM) {
    if (containsWordOrPhrase(tNorm, genTerm)) {
      return false;
    }
  }

  // 3. For rawPath, require specific subcategories (e.g. hijabs, abaya, burkini, oracao, hajj) not merely generic strings
  const specificPathEvidence = [
    'hijab',
    'abaya',
    'burkini',
    'jilbab',
    'khimar',
    'niqab',
    'thobe',
    'ihram',
    'tasbih',
    'oracao',
    'umra',
    'hajj',
  ];
  for (const sp of specificPathEvidence) {
    if (pNorm && containsWordOrPhrase(pNorm, sp)) return true;
  }

  return false;
}

export const GENERIC_AMBIGUOUS_SUBCATEGORIES = new Set<string>([
  'agasalhos',
  'outerwear',
  'conjuntos',
  'geral',
]);

export function containsWordOrPhrase(text: string, phrase: string): boolean {
  if (!text || !phrase) return false;
  const pNorm = removeAccents(phrase).toLowerCase().trim();
  const tNorm = removeAccents(text).toLowerCase().trim();
  if (pNorm.length === 0 || tNorm.length === 0) return false;

  if (pNorm.includes(' ')) {
    // Multi-word phrase: match directly as substring
    return tNorm.includes(pNorm);
  }
  // Single word: ensure word boundary so it won't match partial words
  const padded = ` ${tNorm.replace(/[^a-z0-9]/g, ' ')} `;
  return padded.includes(` ${pNorm} `);
}

export function removeAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getSubcategoryAliases(subName: string): string[] {
  const custom = SUBCATEGORY_ALIASES_MAP[subName] || [];
  return Array.from(new Set([subName, ...custom]));
}

export function getCategoryAliases(catName: string): string[] {
  const custom = CATEGORY_ALIASES_MAP[catName] || [];
  return Array.from(new Set([catName, ...custom]));
}

/**
 * Strict single-winner classification engine.
 * Guarantees:
 * 1. At most 1 Category (out of the 26 official categories, or null if unclassifiable)
 * 2. At most 1 Subcategory (strictly belonging to the Category, or null)
 * 3. At most 1 Child Category (strictly belonging to the Subcategory from OFFICIAL_TIKTOK_CHILD_CATEGORIES, or null)
 * 4. Zero overlap across sibling subcategories.
 * 5. Zero arbitrary fallbacks (no forced fallback to Utensílios de cozinha).
 * 6. Specificity precedence for high-precision niche domains over generic apparel/accessory terms.
 */
export function classifyProductFull(product: {
  title?: string;
  category_path?: string;
  categoryPath?: string;
  query_source?: string;
  querySource?: string;
  seller_name?: string;
}): {
  category: string | null;
  subcategory: string | null;
  childCategory: string | null;
  resolvedPath: string;
  source: 'category_path' | 'alias' | 'title' | 'none';
} {
  const rawPath = String(product.category_path || product.categoryPath || '').trim();
  const rawQuery = String(product.query_source || product.querySource || '').trim();
  const rawTitle = String(product.title || '').trim();

  let resolvedCat: string | null = null;
  let resolvedSub: string | null = null;
  let resolvedChild: string | null = null;
  let resolutionSource: 'category_path' | 'alias' | 'title' | 'none' = 'none';

  // ----------------------------------------------------
  // STEP 1: RESOLVE MAIN CATEGORY
  //
  // PRECEDENCE BY SPECIFICITY:
  // 1. High precision niche domain terms in Title or Path (e.g. Abaya, Hijab, Balandrau, Burkini, Tasbih)
  //    These are unequivocal domain terms that override generic terms ("vestido", "lenço").
  // 2. Exact first token of category_path matching official category or canonical alias.
  // 3. query_source matching official category or strong/specific subcategory.
  //    (Generic subcategories like "Agasalhos" are NOT standalone proof).
  // 4. category_path contains alias.
  // 5. title contains aliases (evaluated by specificity & phrase length descending).
  // ----------------------------------------------------

  // 1.1 High-precision domain terms check in title or path
  for (const [catName, highPrecisionTerms] of Object.entries(HIGH_PRECISION_CATEGORY_TERMS)) {
    for (const term of highPrecisionTerms) {
      if (containsWordOrPhrase(rawTitle, term)) {
        resolvedCat = catName;
        resolutionSource = 'title';
        break;
      }
      if (rawPath && containsWordOrPhrase(rawPath, term)) {
        resolvedCat = catName;
        resolutionSource = 'alias';
        break;
      }
    }
    if (resolvedCat) break;
  }

  // 1.2 Exact first token of category_path
  if (!resolvedCat && rawPath) {
    const firstToken = rawPath.split(/[>/]/)[0]?.trim();
    if (firstToken) {
      const firstTokenNorm = removeAccents(firstToken);
      for (const cat of COLLECTOR_CATEGORIES) {
        if (cat === 'Moda muçulmana' && !hasHighConfidenceMuslimEvidence(rawTitle, rawPath)) {
          continue;
        }
        const catAliases = getCategoryAliases(cat).map(removeAccents);
        if (catAliases.includes(firstTokenNorm)) {
          resolvedCat = cat;
          resolutionSource = 'category_path';
          break;
        }
      }
    }
  }

  // 1.3 query_source evaluation (with distinction between strong and generic subcategories)
  if (!resolvedCat && rawQuery) {
    const rawQueryNorm = removeAccents(rawQuery);
    
    // Check if query_source matches a main category name/alias directly
    for (const cat of COLLECTOR_CATEGORIES) {
      if (cat === 'Moda muçulmana' && !hasHighConfidenceMuslimEvidence(rawTitle, rawPath)) {
        continue;
      }
      const catAliases = getCategoryAliases(cat).map(removeAccents);
      if (catAliases.includes(rawQueryNorm)) {
        resolvedCat = cat;
        resolutionSource = 'alias';
        break;
      }
    }

    // Check if query_source matches a specific, non-generic subcategory
    if (!resolvedCat && !GENERIC_AMBIGUOUS_SUBCATEGORIES.has(rawQueryNorm)) {
      for (const [cat, subList] of Object.entries(OFFICIAL_TIKTOK_TAXONOMY)) {
        if (cat === 'Moda muçulmana' && !hasHighConfidenceMuslimEvidence(rawTitle, rawPath)) {
          continue;
        }
        for (const sub of subList) {
          const subNorm = removeAccents(sub);
          if (subNorm === rawQueryNorm && !GENERIC_AMBIGUOUS_SUBCATEGORIES.has(subNorm)) {
            // Require that the title does not explicitly belong to a conflicting different category
            resolvedCat = cat;
            resolutionSource = 'alias';
            break;
          }
        }
        if (resolvedCat) break;
      }
    }
  }

  // 1.4 category_path contains alias
  if (!resolvedCat && rawPath) {
    const pathNorm = removeAccents(rawPath);
    for (const cat of COLLECTOR_CATEGORIES) {
      if (cat === 'Moda muçulmana' && !hasHighConfidenceMuslimEvidence(rawTitle, rawPath)) {
        continue;
      }
      const catAliases = getCategoryAliases(cat).map(removeAccents);
      if (catAliases.some((a) => pathNorm.includes(a))) {
        resolvedCat = cat;
        resolutionSource = 'alias';
        break;
      }
    }
  }

  // 1.5 title contains alias (scored by specificity and phrase length to prevent single generic word capture)
  if (!resolvedCat && rawTitle) {
    type CatScore = { cat: string; score: number; matchedAlias: string };
    const candidates: CatScore[] = [];

    for (const cat of COLLECTOR_CATEGORIES) {
      if (cat === 'Moda muçulmana' && !hasHighConfidenceMuslimEvidence(rawTitle, rawPath)) {
        continue;
      }
      const catAliases = getCategoryAliases(cat);
      for (const alias of catAliases) {
        const aliasNorm = removeAccents(alias).toLowerCase().trim();
        if (aliasNorm.length < 3) continue;

        if (containsWordOrPhrase(rawTitle, aliasNorm)) {
          const isMultiWord = aliasNorm.includes(' ');
          // Score: multi-word phrases get significant bonus, longer aliases get more weight
          const score = (isMultiWord ? 50 : 0) + aliasNorm.length;
          candidates.push({ cat, score, matchedAlias: alias });
        }
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.score - a.score);
      resolvedCat = candidates[0].cat;
      resolutionSource = 'title';
    }
  }

  // Final check: if resolvedCat is Moda muçulmana, enforce strict evidence
  if (resolvedCat === 'Moda muçulmana' && !hasHighConfidenceMuslimEvidence(rawTitle, rawPath)) {
    resolvedCat = null;
    resolutionSource = 'none';
  }

  // If category cannot be determined with confidence, return all nulls
  if (!resolvedCat) {
    return {
      category: null,
      subcategory: null,
      childCategory: null,
      resolvedPath: '',
      source: 'none',
    };
  }

  // ----------------------------------------------------
  // STEP 2: RESOLVE SUBCATEGORY (Strict Winner within resolved category)
  // Priority 1: Exact 2nd level token in category_path matching official subcategory or exact alias
  // Priority 2: 2nd level token normalized alias match
  // Priority 3: Contextual alias match in subsequent category_path tokens
  // Priority 4: Title keyword/alias match (sorted by length descending for precision)
  // Priority 5: query_source fallback if it is a valid non-generic subcategory of resolvedCat
  // ----------------------------------------------------
  const officialSubs = OFFICIAL_TIKTOK_TAXONOMY[resolvedCat] || [];

  if (rawPath) {
    const pathTokens = rawPath.split(/[>/]/).map((t) => t.trim()).filter(Boolean);
    
    // Priority 1 & 2: Evaluate 2nd token
    if (pathTokens.length >= 2) {
      const secondTokenNorm = removeAccents(pathTokens[1]);
      if (secondTokenNorm !== 'geral' && secondTokenNorm !== 'todas') {
        for (const sub of officialSubs) {
          const subAliases = getSubcategoryAliases(sub).map(removeAccents);
          if (subAliases.includes(secondTokenNorm)) {
            resolvedSub = sub;
            resolutionSource = 'category_path';
            break;
          }
        }
      }
    }

    // Priority 3: Check remaining path tokens or full path against aliases
    if (!resolvedSub) {
      const pathNorm = removeAccents(rawPath);
      // Sort subcategories to match the longest alias match first
      let bestSubMatch: { sub: string; aliasLen: number } | null = null;
      for (const sub of officialSubs) {
        const subAliases = getSubcategoryAliases(sub).map(removeAccents);
        for (const a of subAliases) {
          if (pathNorm.includes(a) && (!bestSubMatch || a.length > bestSubMatch.aliasLen)) {
            bestSubMatch = { sub, aliasLen: a.length };
          }
        }
      }
      if (bestSubMatch) {
        resolvedSub = bestSubMatch.sub;
        resolutionSource = 'alias';
      }
    }
  }

  // Priority 4: Title search within the subcategories of resolvedCat
  if (!resolvedSub && rawTitle) {
    type SubMatch = { sub: string; aliasLen: number; isMultiWord: boolean };
    const matches: SubMatch[] = [];

    for (const sub of officialSubs) {
      const subAliases = getSubcategoryAliases(sub);
      for (const a of subAliases) {
        const aNorm = removeAccents(a).toLowerCase().trim();
        if (aNorm.length >= 3 && containsWordOrPhrase(rawTitle, aNorm)) {
          matches.push({
            sub,
            aliasLen: aNorm.length,
            isMultiWord: aNorm.includes(' '),
          });
        }
      }
    }

    if (matches.length > 0) {
      matches.sort((a, b) => {
        if (a.isMultiWord && !b.isMultiWord) return -1;
        if (!a.isMultiWord && b.isMultiWord) return 1;
        return b.aliasLen - a.aliasLen;
      });
      resolvedSub = matches[0].sub;
      resolutionSource = 'title';
    }
  }

  // Priority 5: Fallback to query_source if it strictly belongs to resolvedCat and is not generic
  if (!resolvedSub && rawQuery) {
    const rawQueryNorm = removeAccents(rawQuery);
    if (!GENERIC_AMBIGUOUS_SUBCATEGORIES.has(rawQueryNorm)) {
      for (const sub of officialSubs) {
        const subNorm = removeAccents(sub);
        const subAliases = getSubcategoryAliases(sub).map(removeAccents);
        if (subNorm === rawQueryNorm || subAliases.includes(rawQueryNorm)) {
          resolvedSub = sub;
          resolutionSource = 'alias';
          break;
        }
      }
    }
  }

  // ----------------------------------------------------
  // STEP 3: RESOLVE CHILD CATEGORY (3rd Level Filter - Whitelisted Child of resolvedSub)
  // Whitelist rule: Must exist in OFFICIAL_TIKTOK_CHILD_CATEGORIES[resolvedCat][resolvedSub]
  // ----------------------------------------------------
  if (resolvedSub) {
    const officialChildren = (OFFICIAL_TIKTOK_CHILD_CATEGORIES[resolvedCat]?.[resolvedSub] || []).filter(
      (c) => c !== 'Todas'
    );

    if (officialChildren.length > 0) {
      // 3.1: Check 3rd level token from category_path
      if (rawPath) {
        const pathTokens = rawPath.split(/[>/]/).map((t) => t.trim()).filter(Boolean);
        if (pathTokens.length >= 3) {
          const thirdToken = pathTokens[2].trim();
          const thirdTokenNorm = removeAccents(thirdToken);
          if (thirdTokenNorm !== 'geral' && thirdTokenNorm !== 'todas') {
            // Check exact or normalized match against official children
            for (const child of officialChildren) {
              if (removeAccents(child) === thirdTokenNorm) {
                resolvedChild = child;
                break;
              }
            }
          }
        }

        // 3.2: Check subsequent tokens or full path against official children
        if (!resolvedChild && pathTokens.length > 3) {
          for (let i = 3; i < pathTokens.length; i++) {
            const tokNorm = removeAccents(pathTokens[i]);
            for (const child of officialChildren) {
              if (removeAccents(child) === tokNorm) {
                resolvedChild = child;
                break;
              }
            }
            if (resolvedChild) break;
          }
        }
      }

      // 3.3: Textual search in title ONLY within the official children of the winning subcategory
      if (!resolvedChild && rawTitle) {
        let bestChildMatch: { child: string; len: number } | null = null;
        for (const child of officialChildren) {
          const childNorm = removeAccents(child).toLowerCase().trim();
          if (childNorm.length >= 3 && containsWordOrPhrase(rawTitle, childNorm)) {
            if (!bestChildMatch || childNorm.length > bestChildMatch.len) {
              bestChildMatch = { child, len: childNorm.length };
            }
          }
        }
        if (bestChildMatch) {
          resolvedChild = bestChildMatch.child;
        }
      }
    }
  }

  // Format the resolved category_path
  let resolvedPath = resolvedCat;
  if (resolvedSub) {
    resolvedPath = resolvedChild ? `${resolvedCat} > ${resolvedSub} > ${resolvedChild}` : `${resolvedCat} > ${resolvedSub}`;
  }

  return {
    category: resolvedCat,
    subcategory: resolvedSub,
    childCategory: resolvedChild,
    resolvedPath,
    source: resolutionSource,
  };
}
