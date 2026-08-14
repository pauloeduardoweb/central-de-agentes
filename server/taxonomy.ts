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

export const OFFICIAL_TIKTOK_CHILD_CATEGORIES: Record<string, Record<string, string[]>> = {};

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

export function removeAccents(str: string): string {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Category English/Variant Aliases
export const CATEGORY_ALIASES_MAP: Record<string, string[]> = {
  'Acessórios de moda': ['Fashion Accessories', 'Fashion Acc', 'Accessories'],
  'Alimentos e bebidas': ['Food & Beverages', 'Food and Beverages', 'Food & Drinks', 'Food & Drink', 'Groceries', 'Food'],
  'Automotivo e moto': ['Automotive & Motorcycle', 'Automotive and Motorcycle', 'Automotive & Moto', 'Auto & Moto', 'Automotive', 'Motorcycle'],
  'Bebê e maternidade': ['Baby & Maternity', 'Baby and Maternity', 'Baby & Kids Care', 'Baby Care', 'Maternity', 'Baby'],
  'Beleza e cuidados pessoais': ['Beauty & Personal Care', 'Beauty and Personal Care', 'Personal Care', 'Beauty', 'Skincare & Makeup'],
  'Brinquedos e passatempos': ['Toys & Hobbies', 'Toys and Hobbies', 'Toys & Games', 'Toys', 'Hobbies'],
  'Computadores e equipamentos de escritório': ['Computers & Office Equipment', 'Computers & Office', 'Computers and Office', 'Office Equipment', 'Computers'],
  'Eletrodomésticos': ['Appliances', 'Home Appliances', 'Small Appliances', 'Major Appliances', 'Kitchen Appliances'],
  'Esportes e atividades ao ar livre': ['Sports & Outdoor', 'Sports and Outdoor', 'Sports & Outdoors', 'Sports and Outdoors', 'Outdoor & Sports', 'Sports', 'Fitness'],
  'Ferramentas e hardware': ['Tools & Hardware', 'Tools and Hardware', 'Hardware & Tools', 'Tools', 'Hardware'],
  'Joias, acessórios e derivados': ['Jewelry, Accessories & Derivatives', 'Jewelry & Accessories', 'Fine Jewelry', 'Jewelry', 'Fashion Jewelry'],
  'Livros, revistas e áudios': ['Books, Magazines & Audio', 'Books & Media', 'Books and Magazines', 'Books', 'Audiobooks'],
  'Malas e bolsas': ['Luggage & Bags', 'Luggage and Bags', 'Bags & Luggage', 'Bags and Luggage', 'Bags', 'Luggage'],
  'Moda muçulmana': ['Muslim Fashion', 'Islamic Fashion', 'Muslim Wear', 'Islamic Clothing'],
  'Moda para crianças': ["Kids' Fashion", "Children's Fashion", 'Kids Fashion', 'Children Fashion', 'Kids Clothing', 'Children Clothing', 'Infantil'],
  'Móveis': ['Furniture', 'Home Furniture', 'Office Furniture', 'Outdoor Furniture'],
  'Reformas residenciais': ['Home Improvement', 'Home Renovations', 'Home Improvement & Tools', 'Home Renovation'],
  'Roupas femininas e roupas íntimas femininas': ["Womenswear & Underwear", "Women's Clothing & Underwear", "Women's Fashion", 'Womenswear', 'Women Fashion', 'Roupas Femininas'],
  'Roupas masculinas e roupas íntimas masculinas': ["Menswear & Underwear", "Men's Clothing & Underwear", "Men's Fashion", 'Menswear', 'Men Fashion', 'Roupas Masculinas'],
  'Sapatos': ['Shoes', 'Footwear', 'Men and Women Shoes', 'Sapatos e Calçados', 'Calçados'],
  'Saúde': ['Health', 'Health & Wellness', 'Healthcare', 'Health Care', 'Medical & Health', 'Saude'],
  'Suprimentos domésticos': ['Home Supplies', 'Household Supplies', 'Home Care', 'Cleaning Supplies', 'Houseware'],
  'Suprimentos para animais de estimação': ['Pet Supplies', 'Pet Care', 'Pets', 'Pet'],
  'Telefones e eletrônicos': ['Phones & Electronics', 'Phones and Electronics', 'Consumer Electronics', 'Electronics & Phones', 'Electronics', 'Phones'],
  'Têxteis e móveis': ['Textiles & Soft Furnishings', 'Home Textiles', 'Bedding & Textiles', 'Textiles'],
  'Utensílios de cozinha': ['Kitchenware', 'Kitchen Utensils', 'Kitchenware & Tableware', 'Kitchenware and Tableware', 'Cookware & Kitchenware', 'Kitchen'],
};

export function getCategoryAliases(category: string): string[] {
  const norm = removeAccents(category);
  const aliases = new Set<string>([category]);

  for (const [officialCat, list] of Object.entries(CATEGORY_ALIASES_MAP)) {
    if (removeAccents(officialCat) === norm) {
      aliases.add(officialCat);
      for (const a of list) aliases.add(a);
    }
  }

  return Array.from(aliases);
}

// Subcategory Aliases
export const SUBCATEGORY_ALIASES_MAP: Record<string, string[]> = {
  // Utensílios de cozinha
  'utensilios para bebidas': ['Drinkware', 'Beverage Utensils', 'Drink Utensils', 'Copos', 'Canecas', 'Garrafas térmicas', 'Xícaras', 'Tumbler', 'Garrafa termica', 'Copo termico', 'Caneca'],
  'utensilios e aparelhos de cozinha': ['Kitchen Tools & Gadgets', 'Kitchen Utensils & Gadgets', 'Kitchen Tools and Gadgets', 'Kitchen Gadgets', 'Utensílios de cozinha', 'Descascador', 'Ralador', 'Espatula', 'Pegador'],
  'utensilios para forno': ['Bakeware', 'Ovenware', 'Formas de bolo', 'Assadeiras', 'Forma de silicone', 'Forma', 'Assadeira'],
  'facas de cozinha': ['Kitchen Knives', 'Kitchen Cutlery', 'Facas de cozinha e acessórios', 'Facas e tábuas', 'Faca de chef', 'Jogo de facas', 'Afiador de facas', 'Faca'],
  'utensilios para cozinhar': ['Cookware', 'Cooking Utensils', 'Panelas', 'Frigideiras', 'Panela de pressão', 'Wok', 'Cacarola', 'Jogo de panelas', 'Panela', 'Frigideira'],
  'utensilios para bares e vinhos': ['Bar & Wine Utensils', 'Bar and Wine Utensils', 'Barware', 'Abridor de vinho', 'Coqueteleira', 'Saca rolhas', 'Dosador', 'Vinho'],
  'talheres e servicos de mesa': ['Cutlery & Tableware', 'Cutlery and Tableware', 'Tableware & Flatware', 'Tableware', 'Talheres', 'Aparelho de jantar', 'Pratos', 'Jogo de talheres', 'Sousplat', 'Prato', 'Garfo', 'Colher'],
  'churrasco': ['Barbecue', 'BBQ', 'Barbecue & Grill', 'Grelha', 'Espeto', 'Acessórios churrasco', 'Pegador churrasco', 'Faca churrasco', 'Churrasqueira'],
  'utensilios para cha e cafe': ['Tea & Coffee Ware', 'Tea and Coffee Ware', 'Coffee & Tea Ware', 'Prensa francesa', 'Cafeteira italiana', 'Bule', 'Chaleira', 'Filtro de cafe', 'Moedor de cafe', 'Cafe', 'Cha'],

  // Saúde
  'suplementos alimentares': ['Food Supplements', 'Dietary Supplements', 'Supplements', 'Suplementos', 'Creatina', 'Whey Protein', 'Vitaminas', 'Colágeno', 'Ômega 3', 'Magnésio', 'Melatonina', 'BCAA', 'Glutamina', 'Pre treino', 'Creatine', 'Whey', 'Multivitaminico'],
  'medicamentos e tratamentos alternativos': ['Alternative Medicine & Treatments', 'Alternative Medicine', 'Óleos essenciais', 'Homeopatia', 'Fitoterápicos', 'Florais', 'Pomadas', 'Oleo essencial'],
  'suprimentos medicos': ['Medical Supplies', 'Medidor de pressão', 'Termômetro', 'Inalador', 'Nebulizador', 'Oxímetro', 'Máscaras', 'Ortopédico', 'Faixas', 'Curativos', 'Glicosimetro'],

  // Móveis
  'moveis comerciais': ['Commercial Furniture', 'Cadeiras de escritório', 'Mesas comerciais', 'Balcões'],
  'moveis para ambientes externos': ['Outdoor Furniture', 'Patio Furniture', 'Móveis de jardim', 'Varanda', 'Espreguiçadeira'],
  'moveis para ambientes internos': ['Indoor Furniture', 'Home Furniture', 'Sofá', 'Mesa de centro', 'Estante', 'Rack', 'Guarda-roupa', 'Cama', 'Cômoda', 'Mesa', 'Cadeira'],
  'moveis para criancas': ["Kids' Furniture", "Children's Furniture", 'Móveis infantis', 'Berço', 'Cama infantil'],

  // Reformas residenciais
  'acessorios de banheiro': ['Bathroom Fixtures', 'Bathroom Accessories', 'Chuveiro', 'Ducha', 'Torneira banheiro', 'Porta toalha'],
  'artigos de jardinagem': ['Gardening Supplies', 'Lawn & Garden', 'Gardening', 'Mangueira', 'Vaso', 'Pá de jardim'],
  'luzes e iluminacao': ['Lights & Lighting', 'Lighting', 'Lâmpada LED', 'Fita LED', 'Lustre', 'Plafon', 'Refletor', 'Led', 'Lampada'],
  'materiais de construcao': ['Building Materials', 'Cimento', 'Argamassa', 'Tinta', 'Piso', 'Revestimento'],
  'acessorios de cozinha': ['Kitchen Fixtures', 'Kitchen Accessories', 'Torneira cozinha', 'Cuba', 'Pia'],
  'equipamentos e suprimentos eletricos': ['Electrical Equipment & Supplies', 'Electrical Equipment', 'Electrical Supplies', 'Tomada', 'Interruptor', 'Disjuntor', 'Fios e cabos'],
  'seguranca e protecao': ['Safety & Security', 'Security & Protection', 'Câmera segurança', 'Fechadura digital', 'Alarme', 'Sensor de presença'],
  'sistemas domesticos inteligentes': ['Smart Home Systems', 'Smart Home', 'Automação residencial', 'Interruptor inteligente', 'Lâmpada inteligente'],
  'energia solar e eolica': ['Solar & Wind Energy', 'Solar and Wind Energy', 'Placa solar', 'Inversor solar', 'Luminária solar'],

  // Suprimentos para animais de estimação
  'adestramento de caes e gatos': ['Dog & Cat Grooming', 'Cat & Dog Grooming', 'Grooming & Training', 'Grooming', 'Training', 'Tosa', 'Banho e tosa', 'Rasqueadeira'],
  'areia para caes e gatos': ['Cat & Dog Litter & Housebreaking', 'Cat Litter', 'Litter & Housebreaking', 'Dog & Cat Litter & Housebreaking', 'Tapete higiênico', 'Caixa de areia', 'Areia sanitária'],
  'acessorios para caes e gatos': ['Cat & Dog Accessories', 'Dog & Cat Accessories', 'Coleira', 'Guia', 'Peitoral', 'Brinquedo pet', 'Comedouro', 'Bebedouro pet'],
  'peixes e suprimentos aquaticos': ['Fish & Aquatic Supplies', 'Aquatic Supplies', 'Aquário', 'Filtro aquário', 'Ração peixe'],
  'saude para caes e gatos': ['Cat & Dog Health Care', 'Dog & Cat Health Care', 'Cat & Dog Health', 'Vermífugo pet', 'Antipulgas', 'Shampoo pet', 'Vitaminas pet'],
  'suprimentos para animais pequenos': ['Small Animal Supplies', 'Gaiola hamster', 'Ração coelho'],
  'roupas para caes e gatos': ['Cat & Dog Apparel', 'Dog & Cat Apparel', 'Dog & Cat Clothing', 'Roupa pet', 'Capa de chuva pet', 'Vestido pet'],
  'comida para caes e gatos': ['Cat & Dog Food', 'Dog & Cat Food', 'Ração cachorro', 'Ração gato', 'Petisco pet', 'Sachê pet', 'Racao'],
  'suprimentos para animais de fazenda e aves': ['Farm Animal & Poultry Supplies', 'Farm Animal Supplies'],
  'moveis para caes e gatos': ['Cat & Dog Furniture', 'Dog & Cat Furniture', 'Caminha pet', 'Arranhador gato', 'Casinha cachorro'],
  'suprimentos para passaros': ['Bird Supplies', 'Gaiola passarinho', 'Ração pássaros'],
  'suprimentos para repteis e anfibios': ['Reptile & Amphibian Supplies', 'Reptile Supplies', 'Terrário'],

  // Esportes e atividades ao ar livre
  'acessorios esportivos e para atividades ao ar livre': ['Sports Accessories', 'Garrafa squeeze', 'Mochila hidratação', 'Munhequeira', 'Joelheira'],
  'roupas esportivas e para atividades ao ar livre': ['Activewear', 'Sportswear', 'Camiseta dry fit', 'Short corrida', 'Top esportivo'],
  'equipamento de ginastica': ['Fitness Equipment', 'Gym Equipment', 'Halteres', 'Elástico extensor', 'Kettlebell', 'Corda de pular', 'Colchonete yoga'],
  'trajes de banho, surfe e natacao': ['Swimwear & Surfing', 'Natação', 'Óculos natação', 'Touca natação', 'Maiô natação', 'Sunga'],
  'calcados esportivos': ['Athletic Shoes', 'Running Shoes', 'Tênis de corrida', 'Tênis academia', 'Chuteira'],
  'equipamentos para acampamento e caminhada': ['Camping & Hiking', 'Barraca camping', 'Saco de dormir', 'Lanterna tática', 'Isolante térmico'],
  'equipamentos para esportes com bola': ['Ball Sports', 'Bola de futebol', 'Bola de basquete', 'Bola de vôlei', 'Raquete de beach tennis', 'Beach tennis'],
  'equipamentos para esportes aquaticos': ['Water Sports', 'Prancha stand up', 'Máscara mergulho', 'Nadadeira'],
  'lazer e recreacao ao ar livre': ['Outdoor Recreation', 'Skate', 'Patinete', 'Patins', 'Bicicleta', 'Acessórios bike'],
  'equipamentos para esportes de inverno': ['Winter Sports'],
  'loja oficial': ['Official Sports Shop'],
  'jogos de jardim': ['Lawn Games'],

  // Computadores e equipamentos de escritório
  'artigos de papelaria e suprimentos para escritorio': ['Stationery & Office Supplies', 'Office Supplies', 'Papelaria', 'Canetas', 'Cadernos'],
  'armazenamento de dados e software': ['Data Storage & Software', 'SSD', 'Pendrive', 'HD externo', 'Cartão de memória'],
  'perifericos e acessorios': ['Peripherals & Accessories', 'Teclado', 'Mouse', 'Mousepad', 'Headset gamer', 'Webcam'],
  'equipamentos de escritorio': ['Office Equipment', 'Impressora', 'Calculadora', 'Fragmentadora'],
  'componentes para desktop e laptop': ['Desktop & Laptop Components', 'Placa de vídeo', 'Memória RAM', 'Processador', 'Cooler'],
  'componentes de rede': ['Networking Components', 'Roteador', 'Repetidor Wi-Fi', 'Switch de rede', 'Cabo de rede'],
  'computadores desktop, laptops e tablets': ['Desktops, Laptops & Tablets', 'Computers & Tablets', 'Notebook', 'MacBook', 'Tablet', 'Computador'],

  // Ferramentas e hardware
  'ferramentas de medicao': ['Measurement & Analysis Instruments', 'Measuring Tools', 'Measurement Instruments', 'Trena', 'Paquímetro', 'Nível laser'],
  'ferramentas eletricas': ['Power Tools', 'Furadeira', 'Parafusadeira', 'Esmerilhadeira', 'Serra tico-tico'],
  'ferramentas de jardim': ['Garden Tools', 'Gardening Tools', 'Cortador de grama', 'Tesoura de poda', 'Aparador'],
  'hardware': ['Hardware', 'Parafusos', 'Porcas', 'Dobradiças', 'Fechos'],
  'equipamento de solda': ['Welding Equipment', 'Welding & Soldering Supplies', 'Ferro de solda', 'Máquina de solda'],
  'ferramentas manuais': ['Hand Tools', 'Chave de fenda', 'Alicate', 'Martelo', 'Jogo de chaves'],
  'bombas e encanamento': ['Pumps & Plumbing', 'Bomba d água', 'Conexões PVC', 'Válvulas'],
  'organizadores de ferramentas': ['Tool Organizers', 'Maleta de ferramentas', 'Caixa de ferramentas'],

  // Beleza e cuidados pessoais
  'cuidados com as maos e os pes': ['Hands & Feet Care', 'Manicure', 'Pedicure', 'Lixa de unha', 'Esmalte'],
  'cuidados com os olhos e ouvidos': ['Eye & Ear Care', 'Colírio', 'Protetor auricular'],
  'itens de cuidados pessoais': ['Personal Care Items', 'Algodão', 'Cotonete', 'Lenço umedecido'],
  'maquiagem': ['Makeup', 'Batom', 'Base facial', 'Rímel', 'Sombra', 'Pó compacto', 'Corretivo', 'Gloss'],
  'fragrancias': ['Fragrances', 'Perfume', 'Perfumes', 'Body Splash', 'Colônia', 'Deo Parfum', 'Eau de Parfum'],
  'cuidados com a pele': ['Skincare', 'Sérum', 'Protetor solar', 'Hidratante facial', 'Tônico facial', 'Sabonete facial', 'Ácido hialurônico'],
  'cuidados com cabelos e penteados': ['Hair Care & Styling', 'Shampoo', 'Condicionador', 'Máscara capilar', 'Óleo capilar', 'Secador', 'Prancha', 'Babyliss'],
  'cuidados nasais e orais': ['Oral & Nasal Care', 'Escova de dentes', 'Pasta de dente', 'Fio dental', 'Enxaguante bucal'],
  'banho e cuidados com o corpo': ['Bath & Body Care', 'Sabonete líquido', 'Esfoliante corporal', 'Hidratante corporal', 'Óleo corporal'],
  'cuidados pessoais especiais': ['Special Personal Care'],
  'cuidados masculinos': ["Men's Grooming", 'Pomada modeladora', 'Óleo para barba', 'Balm barba', 'Shampoo masculino'],
  'cuidados femininos': ["Women's Care", 'Absorvente', 'Sabonete íntimo'],

  // Telefones e eletrônicos
  'acessorios para telefone': ['Phone Accessories', 'Capinha celular', 'Película celular', 'Carregador celular', 'Cabo iPhone', 'Cabo Tipo C', 'Suporte celular'],
  'audio e video': ['Audio & Video', 'Fone bluetooth', 'Caixa de som bluetooth', 'Headphone', 'Microfone lapela'],
  'dispositivos inteligentes e tecnologia vestivel': ['Smart Devices & Wearables', 'Smartwatch', 'Pulseira inteligente', 'Smartband'],
  'cameras e fotografia': ['Cameras & Photography', 'Ring light', 'Tripé', 'Câmera digital', 'Lente celular'],
  'acessorios universais': ['Universal Accessories', 'Power bank', 'Adaptador de tomada', 'Carregador veicular'],
  'jogos e consoles': ['Gaming & Consoles', 'Controle videogame', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Console retro'],
  'telefones e tablets': ['Phones & Tablets', 'Smartphone', 'Celular', 'iPhone', 'Tablet'],
  'acessorios para tablets e computadores': ['Tablet & Computer Accessories', 'Capa tablet', 'Teclado bluetooth tablet', 'Caneta touch'],
  'eletronicos recondicionados': ['Refurbished Electronics'],
  'dispositivos de educacao': ['Educational Devices'],

  // Eletrodomésticos
  'eletrodomesticos': ['Small Appliances', 'Air Fryer', 'Fritadeira sem óleo', 'Liquidificador', 'Batedeira', 'Sanduicheira', 'Mixer', 'Aspirador de pó', 'Robô aspirador', 'Ferro de passar'],
  'eletrodomesticos grandes': ['Major Appliances', 'Geladeira', 'Máquina de lavar', 'Fogão', 'Ar condicionado'],
  'eletrodomesticos comerciais': ['Commercial Appliances'],
};

export function getSubcategoryAliases(sub: string): string[] {
  const norm = removeAccents(sub);
  if (!norm || norm === 'todas' || norm === 'todos') return [sub];

  const aliases = new Set<string>([sub]);
  if (SUBCATEGORY_ALIASES_MAP[norm]) {
    for (const a of SUBCATEGORY_ALIASES_MAP[norm]) aliases.add(a);
  }

  return Array.from(aliases);
}

// Classification Engine
export function classifyProductFull(product: {
  title?: string;
  category_path?: string;
  query_source?: string;
  seller_name?: string;
}): {
  category: string;
  subcategory: string | null;
  childCategory: string | null;
  resolvedPath: string;
} {
  const rawPath = String(product.category_path || '').trim();
  const rawQuery = String(product.query_source || '').trim();
  const rawTitle = String(product.title || '').trim();

  let resolvedCat: string | null = null;
  let resolvedSub: string | null = null;
  let resolvedChild: string | null = null;

  // ----------------------------------------------------
  // STEP 1: RESOLVE CATEGORY
  // Priority 1: category_path first token
  // Priority 2: query_source
  // Priority 3: category aliases in path / title
  // ----------------------------------------------------
  if (rawPath) {
    const pathTokens = rawPath.split(/[>/]/).map((t) => t.trim()).filter(Boolean);
    if (pathTokens.length > 0) {
      const firstTokenNorm = removeAccents(pathTokens[0]);
      for (const cat of COLLECTOR_CATEGORIES) {
        const catAliases = getCategoryAliases(cat).map(removeAccents);
        if (catAliases.includes(firstTokenNorm)) {
          resolvedCat = cat;
          break;
        }
      }
    }
  }

  if (!resolvedCat && rawQuery) {
    const queryNorm = removeAccents(rawQuery);
    for (const cat of COLLECTOR_CATEGORIES) {
      const catAliases = getCategoryAliases(cat).map(removeAccents);
      if (catAliases.includes(queryNorm)) {
        resolvedCat = cat;
        break;
      }
    }
  }

  if (!resolvedCat && rawPath) {
    const pathNorm = removeAccents(rawPath);
    for (const cat of COLLECTOR_CATEGORIES) {
      const catAliases = getCategoryAliases(cat).map(removeAccents);
      if (catAliases.some((a) => pathNorm.includes(a))) {
        resolvedCat = cat;
        break;
      }
    }
  }

  if (!resolvedCat) {
    // Fallback category detection via title keywords
    const titleNorm = removeAccents(rawTitle);
    for (const cat of COLLECTOR_CATEGORIES) {
      const catAliases = getCategoryAliases(cat).map(removeAccents);
      if (catAliases.some((a) => titleNorm.includes(a))) {
        resolvedCat = cat;
        break;
      }
    }
  }

  if (!resolvedCat) {
    resolvedCat = rawQuery || 'Utensílios de cozinha';
    if (!COLLECTOR_CATEGORIES.includes(resolvedCat as any)) {
      resolvedCat = 'Utensílios de cozinha';
    }
  }

  // ----------------------------------------------------
  // STEP 2: RESOLVE SUBCATEGORY (Within resolved category)
  // Priority 1: category_path second token
  // Priority 2: category_path aliases match
  // Priority 3: title fallback match
  // ----------------------------------------------------
  const officialSubs = OFFICIAL_TIKTOK_TAXONOMY[resolvedCat] || [];

  if (rawPath) {
    const pathTokens = rawPath.split(/[>/]/).map((t) => t.trim()).filter(Boolean);
    if (pathTokens.length >= 2) {
      const secondTokenNorm = removeAccents(pathTokens[1]);
      if (secondTokenNorm !== 'geral' && secondTokenNorm !== 'todas') {
        for (const sub of officialSubs) {
          const subAliases = getSubcategoryAliases(sub).map(removeAccents);
          if (subAliases.includes(secondTokenNorm)) {
            resolvedSub = sub;
            break;
          }
        }
      }
    }

    if (!resolvedSub) {
      const pathNorm = removeAccents(rawPath);
      for (const sub of officialSubs) {
        const subAliases = getSubcategoryAliases(sub).map(removeAccents);
        if (subAliases.some((a) => pathNorm.includes(a))) {
          resolvedSub = sub;
          break;
        }
      }
    }
  }

  // Fallback: title search ONLY if subcategory was not found from path/aliases
  if (!resolvedSub) {
    const titleNorm = removeAccents(rawTitle);
    for (const sub of officialSubs) {
      const subAliases = getSubcategoryAliases(sub).map(removeAccents);
      if (subAliases.some((a) => titleNorm.includes(a))) {
        resolvedSub = sub;
        break;
      }
    }
  }

  // ----------------------------------------------------
  // STEP 3: RESOLVE CHILD CATEGORY (3rd Level Filter)
  // ----------------------------------------------------
  if (resolvedSub && rawPath) {
    const pathTokens = rawPath.split(/[>/]/).map((t) => t.trim()).filter(Boolean);
    if (pathTokens.length >= 3) {
      const thirdTokenNorm = removeAccents(pathTokens[2]);
      if (thirdTokenNorm !== 'geral' && thirdTokenNorm !== 'todas') {
        resolvedChild = pathTokens[2];
      }
    }
  }

  let resolvedPath = resolvedCat;
  if (resolvedSub) {
    resolvedPath = resolvedChild ? `${resolvedCat} > ${resolvedSub} > ${resolvedChild}` : `${resolvedCat} > ${resolvedSub}`;
  }

  return {
    category: resolvedCat,
    subcategory: resolvedSub,
    childCategory: resolvedChild,
    resolvedPath,
  };
}
