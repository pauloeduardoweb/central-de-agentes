import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  Search, Flame, ShoppingBag, Star, Store, ExternalLink, Play, Eye, Heart,
  MessageCircle, Share2, Bookmark, TrendingUp, Loader2, Database, Zap, RefreshCw,
  Layers, ShieldCheck, AlertCircle, CheckCircle2, X, Sparkles, Home, Shirt, Utensils,
  Cpu, Dumbbell, Baby, Dog, Copy, Check, Video, Download, FileText, BarChart3, Wand2, Filter,
  Trophy, ThumbsUp, SlidersHorizontal, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  BadgeDollarSign, Clock3, Rocket, Clapperboard, Gauge, Target
} from 'lucide-react';
import {
  loadProductRanking,
  ProductMinerProduct,
  ProductRankingMeta,
  ProductRankingSort,
  searchProducts,
  refreshProducts,
  fetchCollectorCategories,
  fetchDailyRefreshStatus,
  runDailyRefresh,
  runBaseReclassification,
  trackProductInteraction,
  type DailyRefreshStatus,
  type CollectorCategoryStat,
  type ProductSearchSource,
  type ReclassificationReport,
} from '../../services/productMinerApi';
import {
  ScriptGeneratorModal,
  VideoAnalysisModal,
  ProductDetailModal,
} from './ProductMinerModals';
import { getProductPriceRange } from '../../utils/priceHelper';

interface ProductMinerPageProps {
  studentCode: string;
  canRefresh?: boolean;
}

const QUICK_SEARCHES = ['beleza', 'casa', 'moda', 'cozinha', 'eletrônicos', 'fitness', 'bebê', 'pet'];

const RANKING_FILTERS: Array<{ id: ProductRankingSort; label: string }> = [
  { id: 'opportunities', label: '🔥 Melhores Oportunidades' },
  { id: 'total', label: 'Mais vendidos' },
  { id: '24h', label: 'Vendas 24h' },
  { id: '7d', label: 'Vendas 7 dias' },
  { id: 'spiking', label: '🔥 Disparando' },
];

export type ClassificationType =
  | 'best_sellers'
  | 'top_rated'
  | 'trending'
  | 'most_searched'
  | 'editors_choice'
  | 'highest_commission'
  | 'sales_24h'
  | 'spiking'
  | 'viral_video';

export interface ClassificationItem {
  id: ClassificationType;
  label: string;
  imgUrl: string;
  spriteIndex?: number;
  fallbackIcon: React.ReactNode;
}

const CLASSIFICATIONS: ClassificationItem[] = [
  // 1-5: TikTok Shop standard navigation
  {
    id: 'best_sellers',
    label: 'Mais vendidos',
    imgUrl: 'https://i.postimg.cc/tg8X1nND/troféu.jpg',
    fallbackIcon: <Trophy className="w-6 h-6 text-amber-500" />,
  },
  {
    id: 'top_rated',
    label: 'Melhores avaliações',
    imgUrl: 'https://i.postimg.cc/JnJRj7p3/Like.jpg',
    fallbackIcon: <ThumbsUp className="w-6 h-6 text-blue-500" />,
  },
  {
    id: 'trending',
    label: 'Tendências',
    imgUrl: 'https://i.postimg.cc/26vCnj0n/Fogo.jpg',
    fallbackIcon: <Flame className="w-6 h-6 text-orange-500" />,
  },
  {
    id: 'most_searched',
    label: 'Mais acessados',
    imgUrl: 'https://i.postimg.cc/PxZd1fSW/Lupa.jpg',
    fallbackIcon: <Search className="w-6 h-6 text-cyan-500" />,
  },
  {
    id: 'editors_choice',
    label: 'Escolha do dia',
    imgUrl: 'https://i.postimg.cc/767qSPKN/coração.jpg',
    fallbackIcon: <Heart className="w-6 h-6 text-rose-500" />,
  },
  // 6-9: Geração Z Pro Exclusive Intelligence
  {
    id: 'highest_commission',
    label: 'Maior Comissão',
    imgUrl: 'https://i.postimg.cc/m1gxft2d/maiorcomissao.png',
    fallbackIcon: <BadgeDollarSign className="w-6 h-6 text-amber-500" />,
  },
  {
    id: 'sales_24h',
    label: 'Vendas 24h',
    imgUrl: 'https://i.postimg.cc/YLCcKhCp/vendas24h.png',
    fallbackIcon: <Clock3 className="w-6 h-6 text-amber-500" />,
  },
  {
    id: 'spiking',
    label: 'Disparando',
    imgUrl: 'https://i.postimg.cc/Zv5ktC5S/disparando.png',
    fallbackIcon: <Rocket className="w-6 h-6 text-amber-500" />,
  },
  {
    id: 'viral_video',
    label: 'Vídeo Viral',
    imgUrl: 'https://i.postimg.cc/H8kGDVkH/videoviral.png',
    fallbackIcon: <Clapperboard className="w-6 h-6 text-amber-500" />,
  },
];

export interface VisualSubcategory {
  name: string;
  imageUrl: string;
  childCategories: string[];
  imageClass?: string;
}

export interface CategoryConfigItem {
  filterKey: string;
  label: string;
  imageUrl: string;
  subcategories: string[];
  visualSubcategories?: VisualSubcategory[];
}

export const CATEGORY_CONFIG: CategoryConfigItem[] = [
  {
    filterKey: 'Acessórios de moda',
    label: 'Acessórios de moda',
    imageUrl: 'https://i.postimg.cc/N5bQfc1f/Acessorios-de-moda.png',
    subcategories: [
      'Todas',
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
    visualSubcategories: [
      {
        name: 'Acessórios para cabelos',
        imageUrl: 'https://i.postimg.cc/NKQPd4k7/Acessorios-para-cabelos.jpg',
        childCategories: [
          'Todas',
          'Grampos e alfinetes de cabelo',
          'Faixas e elásticos de cabelo',
          'Tiaras',
          'Conjuntos de acessórios para cabelo',
          'Acessórios de cabeça e coroas',
          'Modeladores de cabelo',
        ],
      },
      {
        name: 'Acessórios para roupas',
        imageUrl: 'https://i.postimg.cc/sM30Tc47/Acessorios-para-roupas.png',
        childCategories: [
          'Todas',
          'Cintos',
          'Cachecóis e xales',
          'Gravatas e gravatas-borboleta',
          'Luvas',
          'Lenços',
          'Abotoaduras',
          'Protetores de ouvido',
          'Máscaras e acessórios faciais',
          'Conjuntos de acessórios de moda',
        ],
      },
      {
        name: 'Bijuterias e acessórios',
        imageUrl: 'https://i.postimg.cc/Wdsf5nwm/Bijuterias-e-acessorios.jpg',
        childCategories: [
          'Todas',
          'Colares',
          'Chaveiros',
          'Tornozeleiras',
          'Pulseiras e braceletes',
          'Conjuntos de joias',
          'Brincos',
          'Joias corporais',
          'Anéis',
          'Amuletos e pingentes',
          'Ajustadores e protetores de joias',
        ],
      },
      {
        name: 'Chapéus',
        imageUrl: 'https://i.postimg.cc/rDqYfJNW/Chapeus.jpg',
        childCategories: ['Todas'],
      },
      {
        name: 'Coleiras e broches',
        imageUrl: 'https://i.postimg.cc/qzs5cYyc/Coleiras-e-broches.png',
        childCategories: ['Todas', 'Coleiras', 'Broches'],
      },
      {
        name: 'Extensões de cabelo e perucas',
        imageUrl: 'https://i.postimg.cc/yD7rLPy0/Extensoes-de-cabelo-e-perucas.jpg',
        childCategories: [
          'Todas',
          'Extensões de cabelo humano',
          'Extensões sintéticas',
          'Perucas de cabelo humano',
          'Perucas sintéticas',
          'Perucas frontais',
          'Perucas de renda',
          'Perucas para fantasias',
        ],
      },
      {
        name: 'Óculos',
        imageUrl: 'https://i.postimg.cc/RWvbgRLT/Oculos.jpg',
        childCategories: [
          'Todas',
          'Óculos de sol',
          'Armações e óculos',
          'Estojos e acessórios para óculos',
        ],
      },
      {
        name: 'Relógios e acessórios',
        imageUrl: 'https://i.postimg.cc/WhGHmKg8/Relogios-e-acessorios.jpg',
        childCategories: [
          'Todas',
          'Relógios masculinos',
          'Relógios femininos',
          'Relógios unissex',
          'Relógios de casal',
          'Acessórios para relógio',
        ],
      },
      {
        name: 'Tecidos para costura',
        imageUrl: 'https://i.postimg.cc/9rdnPSZp/Tecidos-para-costura.jpg',
        childCategories: [
          'Todas',
          'Veludo',
          'Seda e cetim',
          'Couro',
          'Poliéster',
          'Algodão',
          'Renda',
          'Batik',
          'Tela',
          'Jeans',
          'Lã',
        ],
      },
      {
        name: 'Acessórios para casamento',
        imageUrl: 'https://i.postimg.cc/KRPH7VB5/Wedding-Accessories.jpg',
        childCategories: [
          'Todas',
          'Véus de noiva',
          'Acessórios de cabeça para noiva',
          'Jaquetas e capas para casamento',
          'Luvas de noiva',
          'Cintos de noiva',
          'Corsages de pulso',
          'Boutonnieres',
          'Acessórios para noivo',
        ],
      },
    ],
  },
  {
    filterKey: 'Alimentos e bebidas',
    label: 'Alimentos e bebidas',
    imageUrl: 'https://i.postimg.cc/vcGQsB6d/Alimentos-e-bebidas.png',
    subcategories: [
      'Todas',
      'Comida instantânea',
      'Bebidas',
      'Lanches',
      'Produtos básicos e essenciais para cozinhar',
      'Panificação',
      'Leite e laticínios',
      'Alimentos frescos e congelados',
      'Cerveja, vinho e destilados',
    ],
    visualSubcategories: [
      {
        name: 'Comida instantânea',
        imageUrl: 'https://i.postimg.cc/qgGkVnLf/Comida-instantanea.jpg',
        childCategories: [
          'Todas',
          'Legumes em conserva, picles e chutney',
          'Macarrão instantâneo',
          'Cereais matinais, granola e aveia',
          'Alimentos enlatados, em frascos e embalados',
          'Hot pot instantâneo',
          'Arroz e mingau instantâneos',
        ],
      },
      {
        name: 'Bebidas',
        imageUrl: 'https://i.postimg.cc/23xzRvxs/Bebidas.png',
        childCategories: [
          'Todas',
          'Bebidas esportivas e energéticas',
          'Misturas para bebidas em pó',
          'Chá',
          'Café',
          'Substituição de refeições e bebidas proteicas',
          'Xaropes e concentrados',
          'Sucos e smoothies',
          'Refrigerantes',
          'Refrigerante e água com gás',
          'Coberturas para bebidas',
          'Água e água aromatizada',
          'Bebidas de chocolate e malte',
          'Bebidas sem álcool',
          'Substitutos do café',
          'Substituto do leite',
        ],
      },
      {
        name: 'Lanches',
        imageUrl: 'https://i.postimg.cc/XXgVSFgt/Lanches.png',
        childCategories: [
          'Todas',
          'Chocolate e lanches de chocolate',
          'Goma de mascar e chiclete',
          'Barras',
          'Doces',
          'Biscoitos, cookies e wafers',
          'Batatas fritas e salgadinhos recheados',
          'Snacks secos',
          'Nozes e ervilhas',
          'Sementes',
          'Pipoca',
          'Pudins de creme e geleia',
          'Kits para presente',
          'Bolos e doces para lanche',
          'Algas marinhas',
          'Lanches vegetarianos e com glúten',
        ],
      },
      {
        name: 'Produtos básicos e essenciais para cozinhar',
        imageUrl: 'https://i.postimg.cc/SjGyF8GP/Produtos-basicos-e-essenciais-para-cozinhar.jpg',
        childCategories: [
          'Todas',
          'Ervas, especiarias e temperos',
          'Açúcar e adoçantes',
          'Sal',
          'Molhos de cozinha',
          'Farinha',
          'Compotas, molhos e pastas',
          'Caldo, molho e sopa instantânea',
          'Óleos',
          'Mel e xarope de ácer',
          'Vinagre',
          'Pastas de cozinha e kits de temperos',
          'Intensificadores de sabor',
          'Massa, macarrão e vermicelli',
          'Arroz',
          'Alimentos secos',
          'Feijões e grãos',
          'Vinho para cozinhar',
          'Óleos infusionados',
        ],
      },
      {
        name: 'Panificação',
        imageUrl: 'https://i.postimg.cc/w3k68JkG/Panificacao.jpg',
        childCategories: [
          'Todas',
          'Gordura vegetal',
          'Misturas para panificação',
          'Farinha para panificação',
          'Fermento em pó e bicarbonato de sódio',
          'Marshmallows',
          'Corante alimentar',
          'Cobertura, glacê e decorações',
          'Aromatizantes e extratos de alimentos',
          'Pão ralado e recheio',
          'Bolos e tortas',
          'Pão',
          'Pastelaria',
        ],
      },
      {
        name: 'Leite e laticínios',
        imageUrl: 'https://i.postimg.cc/7bNx87Nt/Leite-e-laticinios.jpg',
        childCategories: [
          'Todas',
          'Leite condensado',
          'Cremes',
          'Queijo e queijo em pó',
          'Manteiga e margarina',
          'Creme',
          'Leite evaporado',
          'Leite em pó',
          'Leite não lácteo',
          'Leite UHT',
          'Sorvete',
        ],
      },
      {
        name: 'Alimentos frescos e congelados',
        imageUrl: 'https://i.postimg.cc/NLxgqTxP/Alimentos-frescos-e-congelados.jpg',
        childCategories: [
          'Todas',
          'Refeições preparadas',
          'Kits de refeições',
          'Tofu',
          'Alternativas à carne para vegetarianos',
          'Pizza e focaccia',
          'Comida congelada',
          'Massas e molhos',
          'Sopas e ensopados',
        ],
      },
      {
        name: 'Cerveja, vinho e destilados',
        imageUrl: 'https://i.postimg.cc/F1x95cxP/Cerveja-vinho-e-destilados.jpg',
        childCategories: [
          'Todas',
          'Bebidas espirituosas',
        ],
      },
    ],
  },
  {
    filterKey: 'Automotivo e moto',
    label: 'Automotivo e moto',
    imageUrl: 'https://i.postimg.cc/N5bQfc1q/Automotivo-e-moto.png',
    subcategories: [
      'Todas',
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
    visualSubcategories: [
      {
        name: 'Acessórios interiores de veículos',
        imageUrl: 'https://i.postimg.cc/JsF8S04k/Acessorios-interiores-de-veiculos.jpg',
        childCategories: [
          'Todas',
          'Fragrâncias para carros',
          'Montagens e suportes',
          'Decorações de veículos',
          'Estufagem e arrumação',
          'Tapetes para veículos',
          'Molduras interiores',
          'Tapetes antiderrapantes',
          'Capas de volante',
          'Adesivos internos',
          'Fechos e clipes',
          'Racks traseiros e acessórios',
          'Almofadas de pescoço',
          'Estojos para chaves de carro',
          'Almofadas de assento',
          'Alavancas de câmbio e pedais',
          'Segurança e travas de volante',
          'Cuidados com interior',
        ],
      },
      {
        name: 'Lavagem e manutenção de carros',
        imageUrl: 'https://i.postimg.cc/18dSbX5N/Lavagem-e-manutencao-de-carros.jpg',
        childCategories: [
          'Todas',
          'Líquidos de limpeza e cuidados',
          'Pistolas de água e lanças de espuma',
          'Acessórios para lavagem de veículos',
          'Cuidados com motor',
          'Reparo de janelas',
          'Lavadores de veículos',
          'Ferramentas de pintura e reparo de janelas',
          'Cuidados com pintura',
          'Máquinas de polir e acessórios',
        ],
      },
      {
        name: 'Ferramentas de reparo de veículos',
        imageUrl: 'https://i.postimg.cc/K1WbCjv3/Ferramentas-de-reparo-de-veiculos.jpg',
        childCategories: [
          'Todas',
          'Ferramentas de escape',
          'Ferramentas de reparo e montagem de pneus',
          'Ferramentas de diagnóstico',
          'Ferramentas de reparo de motores e transmissões',
          'Ferramentas de inspeção de veículos',
          'Ferramentas de montagem e desmontagem',
          'Ferramentas de reparo de carroceria',
          'Ferramentas de reparo de bateria',
          'Leitores e scanners de código',
          'Ferramentas de chapa metálica',
        ],
      },
      {
        name: 'Sistema eletrônico de veículos',
        imageUrl: 'https://i.postimg.cc/LJWSG56Y/Sistema-eletronico-de-veiculos.jpg',
        childCategories: [
          'Todas',
          'Carregadores USB',
          'Reprodutores de vídeo para carros',
          'Videovigilância',
          'Eletrodomésticos para carros',
          'Dispositivos de áudio de veículos',
          'Câmeras para carros',
          'Transmissores FM e Bluetooth',
          'Acessórios eletrônicos',
          'GPS e acessórios',
          'Sistemas inteligentes',
          'Sistemas de alarme e segurança',
        ],
      },
      {
        name: 'Luzes do veículo',
        imageUrl: 'https://i.postimg.cc/k2HCLGXV/Luzes-do-veiculo.png',
        childCategories: [
          'Todas',
          'Luzes decorativas',
          'Barras de luz e luzes de trabalho',
          'Fios',
          'Bases',
        ],
      },
      {
        name: 'Acessórios exteriores de veículos',
        imageUrl: 'https://i.postimg.cc/bZ5P4rNd/Acessorios-exteriores-de-veiculos.jpg',
        childCategories: [
          'Todas',
          'Coberturas',
          'Adesivos de carros',
          'Guarda-sóis',
          'Topos para antenas',
          'Buzinas e acessórios',
          'Películas e proteção solar',
          'Acessórios e acabamentos cromados',
          'Suportes',
          'Faixas refletoras',
          'Decoração',
          'Kits dobráveis para retrovisores laterais',
          'Coberturas e abrigos para veículos',
          'Placas',
          'Suportes para selo/imposto do veículo',
          'Películas para vidros',
          'Palas de lama e protetores contra respingos',
          'Visores e defletores de janela lateral',
        ],
      },
      {
        name: 'Acessórios e peças para motos',
        imageUrl: 'https://i.postimg.cc/QFzDvCxH/Acessorios-e-pecas-para-motos.jpg',
        childCategories: [
          'Todas',
          'Equipamentos de proteção',
          'Travas e segurança',
          'Adesivos e películas para motos',
          'Assentos e capas de assento',
          'Carpetes',
          'Acessórios para motos',
          'Roupas e capas para motos',
          'Caixas e estojos',
          'Jaquetas e capas de chuva',
          'Capacetes',
          'Para-lamas e protetores contra respingos',
          'Transporte e armazenamento',
        ],
      },
      {
        name: 'Quadriciclos, motorhomes e barcos',
        imageUrl: 'https://i.postimg.cc/zyQN4vXy/Quadriciclos-motorhomes-e-barcos.jpg',
        childCategories: [
          'Todas',
          'Peças e acessórios para motorhomes',
        ],
      },
      {
        name: 'Peças de reposição automotivas',
        imageUrl: 'https://i.postimg.cc/k2HCLGXG/Pecas-de-reposicao-automotivas.jpg',
        childCategories: [
          'Todas',
          'Pneus e acessórios',
          'Carroceria, estrutura e para-choques',
          'Limpadores e lavadores de para-brisa',
          'Rodas, aros e acessórios',
          'Amortecedores, suportes e suspensão',
          'Baterias e acessórios',
          'Sistemas de combustível',
          'Radiadores, arrefecimento e climatização',
          'Espelhos e acessórios',
          'Molduras e acessórios',
        ],
      },
      {
        name: 'Peças de motos',
        imageUrl: 'https://i.postimg.cc/DSNhR0yw/Pecas-de-motos.jpg',
        childCategories: [
          'Todas',
          'Rodas, aros e acessórios',
          'Buzinas e acessórios',
          'Amortecedores, suportes e suspensão',
          'Escapes e emissões',
          'Cabos e tubos',
          'Sistemas de frenagem',
          'Luzes do veículo',
          'Baterias e acessórios',
        ],
      },
    ],
  },
  {
    filterKey: 'Bebê e maternidade',
    label: 'Bebê e maternidade',
    imageUrl: 'https://i.postimg.cc/CzJwLgb9/Bebe-e-maternidade.png',
    subcategories: [
      'Todas',
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
    visualSubcategories: [
      {
        name: 'Cuidados com bebê e saúde',
        imageUrl: 'https://i.postimg.cc/dhjRG5RN/Cuidados-com-bebe-e-saude.jpg',
        childCategories: [
          'Todas',
          'Toalhetes e suportes',
          'Cuidados com a pele do bebê',
          'Chupetas, mordedores e alívio de dentição',
          'Detergente para roupa',
          'Banheiras e assentos de banho para bebês',
          'Cuidados nasais e orais',
          'Cuidados com cabelo e sabonete líquido',
          'Ferramentas de beleza e cuidados para bebês',
          'Suprimentos de banho para bebês',
          'Fragrâncias',
          'Tesouras de cabelo para bebês',
          'Fraldas',
          'Balanças',
          'Toalhas e toucas de banho',
          'Desinfetante de mãos para bebês',
          'Distribuidores de remédios',
          'Fabricantes de mãos e pegadas',
          'Esterilizadores de roupas para bebês',
          'Secadores de cabelo para bebês',
          'Dispositivos de medição de altura e circunferência da cabeça',
        ],
      },
      {
        name: 'Roupas e sapatos para bebês',
        imageUrl: 'https://i.postimg.cc/v4t75070/Roupas-e-sapatos-para-bebes.jpg',
        childCategories: [
          'Todas',
          'Kits para presente',
          'Sapatos',
          'Pijamas',
          'Peças para parte superior',
          'Bodys e maiôs',
          'Roupas de banho',
          'Peças para parte inferior',
          'Bloomers, capas de fraldas e roupas íntimas',
          'Jaquetas e casacos',
          'Meias e meia-calças',
          'Fantasias',
          'Vestidos',
          'Moletons e roupas esportivas',
          'Macacões',
        ],
      },
      {
        name: 'Móveis para bebês',
        imageUrl: 'https://i.postimg.cc/87mdLZdy/Moveis-para-bebes.jpg',
        childCategories: [
          'Todas',
          'Bacio e assento de aprendizagem',
          'Cadeirinhas, saltadores e balanços',
          'Berços e camas',
          'Cadeiras de bebê',
          'Andadores',
          'Colchões e roupas de cama',
          'Mesas de troca',
          'Cadeiras altas, assentos e acessórios',
          'Armazenamento',
          'Cercados',
          'Decoração',
          'Mesas e escrivaninhas para bebês',
          'Conjuntos de móveis',
        ],
      },
      {
        name: 'Suprimentos para maternidade',
        imageUrl: 'https://i.postimg.cc/87mdLZdt/Suprimentos-para-maternidade.jpg',
        childCategories: [
          'Todas',
          'Roupas e acessórios para gestantes',
          'Almofadas de maternidade',
          'Cintos de apoio',
          'Vitaminas e suplementos para maternidade',
          'Cintos de segurança e acessórios para gestantes',
          'Roupas íntimas para gestantes',
          'Cuidados com a pele para gestantes',
          'Roupas para amamentação',
        ],
      },
      {
        name: 'Brinquedos para bebês',
        imageUrl: 'https://i.postimg.cc/RWL1wg1G/Brinquedos-para-bebes.jpg',
        childCategories: [
          'Todas',
          'Educação infantil e brinquedos inteligentes',
          'Cercados',
          'Brinquedos de banho',
          'Playgins e tapetes para brincar',
          'Bolas',
          'Bonecas e ursos de pelúcia',
          'Brinquedos sonoros para bebês',
          'Cadeiras de carro e brinquedos para carrinhos de bebê',
          'Esportes para bebês e brincadeiras ao ar livre',
          'Brinquedos elétricos e de controle remoto para bebês',
          'Kits para presente',
          'Escalada em ambiente interno e estruturas para brincar',
          'Figuras e modelos de brinquedos',
          'Brincadeira de bebê',
          'Cavalos e animais de balanço',
          'Espelhos',
          'Brinquedos Roly-Poly',
        ],
      },
      {
        name: 'Segurança de bebês',
        imageUrl: 'https://i.postimg.cc/FYVb0Tbx/Seguranca-de-bebes.jpg',
        childCategories: [
          'Todas',
          'Portões e portas',
          'Monitores',
          'Travas e correias de segurança',
          'Grades e protetores de cama',
          'Mosquiteiro',
          'Protetores de borda e canto',
          'Proteção contra choque elétrico',
        ],
      },
      {
        name: 'Artigos essenciais para viagens de bebês',
        imageUrl: 'https://i.postimg.cc/qNxc21cx/Artigos-essenciais-para-viagens-de-bebes.jpg',
        childCategories: [
          'Todas',
          'Porta-bebês',
          'Carrinhos de bebê',
          'Arnês e rédeas para crianças',
          'Bolsas para fraldas',
          'Acessórios para carrinhos de bebê',
          'Cintos de segurança e acessórios',
          'Assentos de bebê para veículos',
          'Acessórios para cadeirinhas infantis',
        ],
      },
      {
        name: 'Acessórios fashion para bebês',
        imageUrl: 'https://i.postimg.cc/ZWxP6wPP/Acessorios-fashion-para-bebes.jpg',
        childCategories: [
          'Todas',
          'Babadores e panos de arroto',
          'Bolsas de bebê',
          'Chapéus para bebês',
          'Luvas para bebês',
          'Acessórios de cabelo para bebês',
          'Protetores de ouvido para bebês',
          'Óculos de sol',
          'Máscaras faciais para bebês',
          'Lenços para bebês',
          'Bijuterias para bebês',
          'Kits para presente',
        ],
      },
      {
        name: 'Enfermagem e alimentação',
        imageUrl: 'https://i.postimg.cc/pmJQKsQD/Enfermagem-e-alimentacao.jpg',
        childCategories: [
          'Todas',
          'Utensílios para bebês',
          'Aquecedores, refrigeradores e esterilizadores de mamadeiras',
          'Mamadeiras e acessórios',
          'Processadores de alimentos',
          'Limpeza de mamadeiras',
          'Armazenamento e organização de fórmulas e leites',
          'Capas para amamentação',
          'Absorventes para seios',
          'Chupetas',
          'Almofadas de amamentação',
          'Caixas para mamadeira e escorredores',
        ],
      },
    ],
  },
  {
    filterKey: 'Beleza e cuidados pessoais',
    label: 'Beleza e cuidados pessoais',
    imageUrl: 'https://i.postimg.cc/svK3Drpy/Beleza-e-cuidados-pessoais.png',
    subcategories: [
      'Todas',
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
    visualSubcategories: [
      {
        name: 'Cuidados com as mãos e os pés',
        imageUrl: 'https://i.postimg.cc/DWmNkPY4/Cuidados-com-as-Maos-e-os-Pes.jpg',
        childCategories: [
          'Todas',
          'Ferramentas de manicure e pedicure',
          'Tratamentos de unhas',
          'Loções, cremes e esfoliantes para as mãos',
          'Controle de odor nos pés',
          'Acessórios e decoração de unhas',
          'Lavagem das mãos',
          'Kits de arte para unhas',
          'Arte para unhas e esmaltes',
          'Máscaras para mãos e pés',
          'Removedores de esmalte',
          'Desinfetantes para as mãos',
          'Produtos para remoção de cera',
        ],
      },
      {
        name: 'Cuidados com os olhos e ouvidos',
        imageUrl: 'https://i.postimg.cc/KK4WSDsR/Cuidados-com-os-olhos-e-ouvidos.jpg',
        childCategories: [
          'Todas',
          'Máscaras para dormir',
          'Tampões para os ouvidos',
          'Otoscópios eletrônicos',
        ],
      },
      {
        name: 'Itens de cuidados pessoais',
        imageUrl: 'https://i.postimg.cc/bGd5c9Fv/Itens-de-cuidados-pessoais.jpg',
        childCategories: [
          'Todas',
          'Dispositivos de beleza corporal',
          'Modeladores e alisadores de cabelo',
          'Secadores de cabelo',
          'Acessórios',
          'Dispositivos de massagem',
          'Escovas de dentes elétricas',
          'Aparadores e máquinas de cortar cabelo',
          'Dispositivos de remoção de pelos',
          'Barbeadores elétricos',
          'Modeladores elétricos de sobrancelhas',
          'Irrigadores orais',
          'Dispositivos de beleza facial',
          'Aparadores de pelos corporais',
          'Aparadores de pelos de nariz e ouvido',
          'Almofadas térmicas',
          'Cadeiras de massagem',
        ],
      },
      {
        name: 'Maquiagem',
        imageUrl: 'https://i.postimg.cc/xkqZD3F1/Maquiagem.jpg',
        childCategories: [
          'Todas',
          'Delineadores para olhos e lábios',
          'Batons e brilhos labiais',
          'Produtos para sobrancelhas',
          'Maquiagem corporal',
          'Conjuntos de maquiagem',
          'Cílios postiços e adesivos',
          'Sombras',
          'Corretivos e bases',
          'Rímel',
          'Pó',
          'Blush',
          'Pincéis de maquiagem',
          'Utensílios de maquiagem',
          'BB e CC Cream',
          'Tatuagens temporárias',
          'Bronzeadores e iluminadores',
          'Removedores de maquiagem',
          'Spray fixador',
          'Curvadores de cílios',
          'Bases e primers',
          'Esponjas de maquiagem',
          'Espelhos de maquiagem',
          'Hastes flexíveis de algodão',
          'Primers para cílios',
          'Esponjas para pó',
          'Máquinas e kits de tatuagem',
        ],
      },
      {
        name: 'Fragrâncias',
        imageUrl: 'https://i.postimg.cc/p9ySbJc6/Fragrancias.jpg',
        childCategories: [
          'Todas',
          'Perfume masculino',
          'Perfume feminino',
          'Perfume unissex',
          'Kits de perfume',
        ],
      },
      {
        name: 'Cuidados com a pele',
        imageUrl: 'https://i.postimg.cc/sB1Ld40D/Cuidados-com-a-pele.jpg',
        childCategories: [
          'Todas',
          'Tratamentos labiais',
          'Hidratantes e brumas',
          'Ferramentas de cuidados com a pele',
          'Limpadores faciais',
          'Séruns e essências',
          'Kits de cuidados com a pele',
          'Tratamentos para os olhos',
          'Máscaras faciais',
          'Esfoliantes e peelings faciais',
          'Tratamentos para acne',
          'Protetor solar facial',
          'Tônicos',
          'Tratamentos nasais',
          'Cremes de massagem facial',
        ],
      },
      {
        name: 'Cuidados com cabelos e penteados',
        imageUrl: 'https://i.postimg.cc/TyhsMJHd/Cuidados-com-cabelos-e-penteados.jpg',
        childCategories: [
          'Todas',
          'Ferramentas de modelagem sem calor',
          'Shampoo e condicionador',
          'Produtos para queda de cabelo',
          'Pentes e escovas',
          'Tintura para cabelo',
          'Mobiliário para cabeleireiros',
          'Tratamentos para couro cabeludo',
          'Permanentes e texturizadores',
          'Tratamentos contra piolhos',
          'Relaxantes capilares',
          'Mousse e gel',
          'Tratamentos para cabelo e couro cabeludo',
          'Pó modelador para cabelo',
        ],
      },
      {
        name: 'Cuidados nasais e orais',
        imageUrl: 'https://i.postimg.cc/kVDH3vh7/Cuidados-nasais-e-orais.jpg',
        childCategories: [
          'Todas',
          'Limpeza nasal',
          'Pasta de dentes',
          'Clareamento dos dentes',
          'Spray oral',
          'Escovas de dente',
          'Fio dental e palhetas',
          'Limpadores de língua',
          'Enxaguante bucal',
          'Cuidados com dentaduras',
          'Kits de cuidado oral',
          'Protetores contra ranger os dentes',
          'Acessórios ortodônticos',
        ],
      },
      {
        name: 'Banho e cuidados com o corpo',
        imageUrl: 'https://i.postimg.cc/qtgFVxZr/Banho-e-cuidados-com-o-corpo.png',
        childCategories: [
          'Todas',
          'Cremes e loções corporais',
          'Gel de banho e sabonete corporal',
          'Depilação e barbear corporal',
          'Kits de cuidado corporal',
          'Cuidados com o pescoço',
          'Óleo corporal e de massagem',
          'Cuidados pós-tatuagem',
          'Desodorantes e antitranspirantes',
          'Cremes modeladores corporais',
          'Acessórios de banho',
          'Esfoliantes e peelings corporais',
          'Bronzeadores e autobronzeadores',
          'Talco',
          'Protetor solar corporal',
          'Ferramentas manuais de massagem',
          'Máscaras corporais',
          'Cuidados com os seios',
        ],
      },
      {
        name: 'Cuidados pessoais especiais',
        imageUrl: 'https://i.postimg.cc/94zk5YNj/Cuidados-pessoais-especiais.png',
        childCategories: [
          'Todas',
          'Adesivos térmicos',
          'Repelentes de insetos',
          'Bolsas de gelo',
          'Protetores de cama para incontinência',
          'Fraldas para adultos',
        ],
      },
      {
        name: 'Cuidados masculinos',
        imageUrl: 'https://i.postimg.cc/TyhsMJNB/Cuidados-masculinos.jpg',
        childCategories: [
          'Todas',
          'Espuma de barbear e pós-barba',
          'Cuidados com a pele masculina',
          'Cuidados com o cabelo masculino',
          'Banho e corpo masculino',
          'Navalhas',
          'Desodorantes masculinos',
          'Cuidados masculinos',
          'Maquiagem masculina',
          'Conjuntos de barbear',
          'Acessórios de barbear manual',
          'Cuidados íntimos masculinos',
        ],
      },
      {
        name: 'Cuidados femininos',
        imageUrl: 'https://i.postimg.cc/R3qY5Lbx/Cuidados-femininos.png',
        childCategories: [
          'Todas',
          'Higiene feminina',
          'Cremes vaginais',
          'Desodorantes íntimos',
          'Absorventes',
          'Copos menstruais',
          'Tampões',
          'Roupas íntimas menstruais',
        ],
      },
    ],
  },
  {
    filterKey: 'Brinquedos e passatempos',
    label: 'Brinquedos e passatempos',
    imageUrl: 'https://i.postimg.cc/Xpxn7bw0/Brinquedos-e-passatempos.png',
    subcategories: [
      'Todas',
      'Brinquedos clássicos e inovadores',
      'Bonecas e ursos de pelúcia',
      'Jogos e quebra-cabeças',
      'Esportes e brincadeiras ao ar livre',
      'Brinquedos educativos',
      'Bricolage e artesanato',
      'Brinquedos elétricos e de controle remoto',
      'Instrumentos musicais e acessórios',
    ],
    visualSubcategories: [
      {
        name: 'Brinquedos clássicos e inovadores',
        imageUrl: 'https://i.postimg.cc/gnCGbP7H/Brinquedos-classicos-e-inovadores.jpg',
        childCategories: [
          'Todas',
          'Novidades e brinquedos divertidos',
          'Figuras de ação e brinquedos',
          'Modelos e veículos de brinquedo',
          'Brinquedos para aliviar o estresse',
          'Brinquedos de construção',
          'Brinquedos cápsulas',
          'Brinquedos de slime e moles',
          'Jogo de faz de conta',
          'Brinquedos de agitação e dedo',
          'Piões',
          'Fantoches e teatros de fantoches',
          'Ioiôs',
        ],
      },
      {
        name: 'Bonecas e ursos de pelúcia',
        imageUrl: 'https://i.postimg.cc/2VsCNftF/Bonecas-e-ursos-de-pelucia.jpg',
        childCategories: [
          'Todas',
          'Bonecos de pelúcia',
          'Bonecas',
          'Acessórios para bonecas',
          'Casas de bonecas e conjuntos de brinquedos',
        ],
      },
      {
        name: 'Jogos e quebra-cabeças',
        imageUrl: 'https://i.postimg.cc/8j2TgVYd/Jogos-e-quebra-cabecas.jpg',
        childCategories: [
          'Todas',
          'Jogos de empilhar',
          'Jogos de tabuleiro',
          'Jogos de cartas',
          'Dados',
          'Jogos de chão',
          'Quebra-cabeças',
          'Cubos mágicos',
          'Equipamentos de magia e acrobacia',
        ],
      },
      {
        name: 'Esportes e brincadeiras ao ar livre',
        imageUrl: 'https://i.postimg.cc/kB07PdHQ/Esportes-e-brincadeiras-ao-ar-livre.jpg',
        childCategories: [
          'Todas',
          'Brinquedos para piscina, água e areia',
          'Brinquedos de passeio',
          'Bolhas',
          'Detonadores e armas de brinquedo',
          'Brinquedos voadores',
          'Equipamento de parquinho',
          'Brinquedos esportivos',
          'Salas recreativas, tendas e túneis',
          'Espadas e sabres de brinquedo',
          'Brinquedos de exploração da natureza',
          'Pipas e cata-ventos',
          'Jogos de mármore',
        ],
      },
      {
        name: 'Brinquedos educativos',
        imageUrl: 'https://i.postimg.cc/JGfRCWFj/Brinquedos-educativos.jpg',
        childCategories: [
          'Todas',
          'Cartão didático',
          'Brinquedos de ciência e tecnologia',
          'Brinquedos de matemática',
          'Tablets de brinquedo e computadores',
          'Artes e ofícios',
          'Brinquedos de linguagem',
          'Classificadores de formas',
          'Brinquedos musicais',
          'Detetive e espião',
        ],
      },
      {
        name: 'Bricolage e artesanato',
        imageUrl: 'https://i.postimg.cc/rKBq2LHx/Bricolage-e-artesanato.png',
        childCategories: [
          'Todas',
          'Suprimentos especializados faça você mesmo',
          'Fabricação de miçangas e joias',
          'Scrapbooking e estampagem',
          'Faça você mesmo carpintaria',
          'Olaria e cerâmica',
          'Tricô e crochê',
          'Suprimentos para pintura faça você mesmo',
          'Bordado',
          'Artesanato em feltro',
          'Confecção de crachás',
          'Fabricação de velas e sabonetes',
          'Artesanato em couro',
        ],
      },
      {
        name: 'Brinquedos elétricos e de controle remoto',
        imageUrl: 'https://i.postimg.cc/GHWbn1fk/Brinquedos-eletricos-e-de-controle-remoto.png',
        childCategories: [
          'Todas',
          'Carros, caminhões e trens',
          'Aviões e helicópteros',
          'Animais',
          'Tapetes de dança',
          'Máquinas de karaokê',
          'Walkie-talkies',
          'Motos',
          'Animais eletrônicos',
          'Barcos e submarinos',
          'Robôs',
          'Câmeras digitais',
          'Acessórios elétricos para brinquedos',
          'Tanques',
        ],
      },
      {
        name: 'Instrumentos musicais e acessórios',
        imageUrl: 'https://i.postimg.cc/hfzKYG2p/Instrumentos-musicais-e-acessorios.jpg',
        childCategories: [
          'Todas',
          'Instrumentos de vento',
          'Acessórios musicais',
          'Guitarras e instrumentos de cordas',
          'Instrumentos de percussão',
          'Teclados e Pianos',
          'Bolsas e estojos para instrumentos',
          'Sintetizadores eletrônicos',
        ],
      },
    ],
  },
  {
    filterKey: 'Computadores e equipamentos de escritório',
    label: 'Computadores e equipamentos de escritório',
    imageUrl: 'https://i.postimg.cc/QHSjx3cw/Computadores-e-equipamentos-de-escritorio.png',
    subcategories: [
      'Todas',
      'Artigos de papelaria e suprimentos para escritório',
      'Armazenamento de dados e software',
      'Periféricos e acessórios',
      'Equipamentos de escritório',
      'Componentes para desktop e laptop',
      'Componentes de rede',
      'Computadores desktop, laptops e tablets',
    ],
    visualSubcategories: [
      {
        name: 'Artigos de papelaria e suprimentos para escritório',
        imageUrl: 'https://i.postimg.cc/1nKtr0pJ/Artigos-de-papelaria-e-suprimentos-para-escritorio.jpg',
        childCategories: [
          'Todas',
          'Material escolar e educacional',
          'Ferramentas de redação e correção',
          'Cadernos e papel',
          'Etiquetas, divisores de índice e selos',
          'Presentes e embalagens',
          'Crachás e suprimentos de identificação',
          'Calendários e acessórios',
          'Organizadores e acessórios de mesa',
          'Materiais de contabilidade',
          'Materiais de arte',
          'Produtos de arquivamento para escritório',
          'Envelopes e suprimentos postais',
          'Material de corte para escritório',
          'Cartões',
          'Material de medição para escritório',
          'Fita adesiva, adesivos e fixadores',
          'Material de encadernação para escritório',
          'Cofres',
          'Material de apresentação para escritório',
        ],
      },
      {
        name: 'Armazenamento de dados e software',
        imageUrl: 'https://i.postimg.cc/FdvzSCLt/Armazenamento-de-dados-e-software.jpg',
        childCategories: [
          'Todas',
          'Unidades flash e cabos OTG',
          'Discos compactos',
          'SSD',
          'Cartões Micro SD',
          'Discos rígidos',
          'Estojos para discos rígidos e estações de encaixe',
          'Armazenamento conectado à rede',
        ],
      },
      {
        name: 'Periféricos e acessórios',
        imageUrl: 'https://i.postimg.cc/R6mhtpnj/Perifericos-e-acessorios.jpg',
        childCategories: [
          'Todas',
          'Suportes e bandejas para laptop',
          'Carregadores e adaptadores de laptop',
          'Teclados e mouses',
          'Tapetes para mouse',
          'Hubs USB e leitores de cartão',
          'Webcams',
          'Capas para teclado e trackpad',
          'Monitor portátil para computador',
          'Capas e estojos para laptop',
          'Almofadas de resfriamento',
          'Baterias para notebook',
        ],
      },
      {
        name: 'Equipamentos de escritório',
        imageUrl: 'https://i.postimg.cc/Q9DC7YWw/Equipamentos-de-escritorio.jpg',
        childCategories: [
          'Todas',
          'Limpadores para equipamentos de escritório',
          'Suprimentos para impressão 3D',
          'Peças de equipamento de escritório',
          'Impressoras de etiquetas',
          'Contadores de dinheiro',
          'Impressoras e scanners',
          'Cartuchos de tinta e toner',
          'Trituradores de papel',
          'Dispositivos de áudio e vídeo para conferência',
          'Laminadores',
          'Dispositivos de controle de acesso e atendimento',
          'Equipamento de impressão de anúncios',
          'Máquinas de fax',
          'Leitores de código de barras',
          'Máquinas de escrever',
          'Equipamento de varejo inteligente',
        ],
      },
      {
        name: 'Componentes para desktop e laptop',
        imageUrl: 'https://i.postimg.cc/njxrmSQ5/Componentes-para-desktop-e-laptop.jpg',
        childCategories: [
          'Todas',
          'Monitores',
          'Placas de som',
          'Unidades ópticas',
          'Cabos e acessórios',
          'Gabinete',
          'RAM',
          'Placas-mãe',
          'UPS e estabilizadores',
          'Ventiladores e dissipadores de calor',
          'Unidades de alimentação',
          'Placas gráficas',
          'Processadores',
          'Computadores de placa única (SBC)',
        ],
      },
      {
        name: 'Componentes de rede',
        imageUrl: 'https://i.postimg.cc/ftsydq0P/Componentes-de-rede.jpg',
        childCategories: [
          'Todas',
          'Cabos e conectores de rede',
          'Adaptadores sem fio e placas de rede',
          'Repetidores',
          'Modems e roteadores sem fio',
          'Chaves KVM',
          'Switches de rede e PoE',
          'Adaptadores powerline',
          'Servidores de impressão',
        ],
      },
      {
        name: 'Computadores desktop, laptops e tablets',
        imageUrl: 'https://i.postimg.cc/vgyTn26q/Computadores-desktop-laptops-e-tablets.jpg',
        childCategories: [
          'Todas',
          'Laptops',
          'Computadores desktop',
          'Servidores',
          'Computadores All-in-One',
        ],
      },
    ],
  },
  {
    filterKey: 'Eletrodomésticos',
    label: 'Eletrodomésticos',
    imageUrl: 'https://i.postimg.cc/yk7VHd32/Eletrodomesticos.png',
    subcategories: [
      'Todas',
      'Eletrodomésticos',
      'Utensílios de cozinha',
      'Eletrodomésticos grandes',
      'Eletrodomésticos comerciais',
    ],
    visualSubcategories: [
      {
        name: 'Eletrodomésticos',
        imageUrl: 'https://i.postimg.cc/0rpGhhf8/Eletrodomesticos.jpg',
        childCategories: [
          'Todas',
          'Removedores de fiapos',
          'Ventiladores',
          'Peças de eletrodomésticos',
          'Esfregonas elétricas',
          'Aspiradores de pó e robôs varredores',
          'Lavadoras elétricas giratórias',
          'Purificadores de ar',
          'Limpa-vidros elétricos',
          'Umidificadores',
          'Vaporizadores de roupas',
          'Secadores de roupas e sapatos',
          'Esterilizadores domésticos',
          'Mata-mosquitos eletrônicos',
          'Ferros',
          'Cobertores elétricos',
          'Aquecedores',
          'Desumidificadores',
          'Secadores de mãos',
          'Secretárias eletrônicas',
          'Ar-condicionado',
          'Engraxadeiras elétricas',
          'Vapores elétricos',
        ],
      },
      {
        name: 'Utensílios de cozinha',
        imageUrl: 'https://i.postimg.cc/WtMmxxns/Utensilios-de-cozinha.jpg',
        childCategories: [
          'Todas',
          'Peças para utensílios de cozinha',
          'Seladores a vácuo',
          'Processadores de alimentos',
          'Máquinas de café e acessórios',
          'Fritadeiras',
          'Misturadores',
          'Espremedores e liquidificadores',
          'Utensílios de cozinha especiais',
          'Churrasqueiras elétricas',
          'Arroz e panelas de pressão',
          'Refrigeradores e dispensadores de água',
          'Chaleiras elétricas',
          'Filtros de água',
          'Máquinas de fazer pão',
          'Torradeiras',
          'Fornos de bancada',
          'Panelas elétricas',
          'Placas de indução',
          'Micro-ondas',
          'Máquina de fazer refrigerante',
          'Trituradores de resíduos alimentares',
          'Máquina de fazer gelo',
        ],
      },
      {
        name: 'Eletrodomésticos grandes',
        imageUrl: 'https://i.postimg.cc/hh98NNrc/Eletrodomesticos-grandes.jpg',
        childCategories: [
          'Todas',
          'Ar-condicionados',
          'Peças e acessórios para eletrodomésticos grandes',
          'Máquinas de lavar e secadoras',
          'Geladeiras e freezers',
          'Televisores',
          'Aquecedores de água',
          'Máquinas de lavar louça',
          'Dispositivos de streaming de mídia',
          'Fornos, fogões e placas',
          'Exaustores',
          'Ar-condicionados portáteis',
        ],
      },
      {
        name: 'Eletrodomésticos comerciais',
        imageUrl: 'https://i.postimg.cc/mhQ3KKws/Eletrodomesticos-comerciais.jpg',
        childCategories: [
          'Todas',
          'Material de limpeza',
          'Equipamento de refrigeração',
          'Equipamento de ventilação e exaustão',
          'Equipamento de processamento de alimentos',
          'Peças de eletrodomésticos comerciais',
          'Fogões comerciais',
          'Equipamento de lavanderia',
        ],
      },
    ],
  },
  {
    filterKey: 'Esportes e atividades ao ar livre',
    label: 'Esportes e atividades ao ar livre',
    imageUrl: 'https://i.postimg.cc/fJ5MTNxN/Esportes-e-atividades-ao-ar-livre.png',
    subcategories: [
      'Todas',
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
    visualSubcategories: [
      {
        name: 'Acessórios esportivos e para atividades ao ar livre',
        imageUrl: 'https://i.postimg.cc/XGBdbrb8/Acessorios-esportivos-e-para-atividades-ao-ar-livre.jpg',
        childCategories: [
          'Todas',
          'Fitas esportivas',
          'Equipamentos de proteção',
          'Mangas e suportes esportivos',
          'Bonés esportivos',
          'Óculos esportivos',
          'Bolsas esportivas',
          'Coberturas e máscaras faciais',
          'Luvas esportivas',
          'Garrafas esportivas',
          'Troféus, medalhas e prêmios',
          'Meias esportivas',
          'Pulseiras esportivas',
          'Equipamentos para treinadores e árbitros',
          'Tiaras esportivas',
          'Bolsas para sapatos',
          'Toalhas esportivas',
          'Cronômetros e temporizadores',
          'Equipamentos de campo e treinamento',
          'Giz',
          'Toucas de natação',
          'Pedômetros',
          'Equipamentos refletivos',
          'Armazenamento para bolas',
          'Coletes salva-vidas',
          'Protetores atléticos',
        ],
      },
      {
        name: 'Roupas esportivas e para atividades ao ar livre',
        imageUrl: 'https://i.postimg.cc/nj9BJXJ4/Roupas-esportivas-e-para-atividades-ao-ar-livre.jpg',
        childCategories: [
          'Todas',
          'Calções esportivos',
          'Agasalhos',
          'Moletons esportivos',
          'Leggings esportivos',
          'Camisetas esportivas',
          'Coletes esportivos',
          'Macacões esportivos',
          'Vestidos esportivos',
          'Saias esportivas',
          'Sutiãs esportivos',
          'Calças jogger',
          'Camisetas de lycra',
          'Camisas',
          'Roupas esportivas infantis',
          'Roupa de banho infantil',
          'Roupa íntima esportiva',
          'Roupas esportivas impermeáveis',
          'Roupas íntimas esportivas térmicas',
          'Roupas e fantasias de dança',
          'Roupas com proteção solar',
        ],
      },
      {
        name: 'Equipamento de ginástica',
        imageUrl: 'https://i.postimg.cc/sQG7rMrP/Equipamento-de-ginastica.png',
        childCategories: [
          'Todas',
          'Treino com peso',
          'Treino abdominal',
          'Bambolês',
          'Máquinas de ginástica',
          'Barras de puxar',
          'Equipamentos de equilíbrio',
          'Fortalecedores de mãos',
          'Elásticos de resistência',
          'Acessórios para máquinas',
          'Trampolins',
          'Equipamentos de agilidade',
          'Bolas de ginástica',
          'Scooters e andadores',
          'Equipamentos de musculação',
          'Tapetes esportivos',
          'Cordas de pular',
          'Fitas de suspensão',
          'Ginástica aquática',
          'Tecnologia fitness',
          'Cintas de massagem e estimuladores elétricos',
        ],
      },
      {
        name: 'Trajes de banho, surfe e natação',
        imageUrl: 'https://i.postimg.cc/8JfMS7SL/Traje-de-banho-de-surfe-e-de-natacao.jpg',
        childCategories: [
          'Todas',
          'Moda praia',
          'Maiôs',
          'Biquínis',
          'Tanquínis',
          'Calções de banho',
          'Vestidos de natação',
          'Roupas de proteção para surfe',
          'Trajes de natação de alta performance',
          'Cuecas de banho',
          'Roupas de neoprene',
        ],
      },
      {
        name: 'Calçados esportivos',
        imageUrl: 'https://i.postimg.cc/9RwZhDhZ/Calcados-esportivos.jpg',
        childCategories: [
          'Todas',
          'Tênis de treino e academia',
          'Acessórios para calçados esportivos',
          'Sapatos de caminhada',
          'Tênis casual esportivo',
          'Calçados aquáticos',
          'Sapatos de trilha',
          'Sandálias esportivas',
          'Tênis de corrida',
          'Chuteiras',
          'Tênis de skate',
          'Sapatos de dança',
          'Tênis de basquete',
          'Sapatos de golfe',
          'Calçados esportivos infantis',
          'Botas para hipismo',
          'Chuteiras de futsal',
          'Patins',
          'Calçados para boxe',
          'Calçados para futebol americano',
          'Tênis para ciclismo',
          'Tênis de beisebol',
          'Calçados para atletismo',
          'Calçados para luta livre',
          'Calçados para yoga',
          'Tênis de badminton',
          'Calçados de cross-training',
          'Sapatilhas de escalada',
          'Tênis de voleibol',
        ],
      },
      {
        name: 'Equipamentos para acampamento e caminhada',
        imageUrl: 'https://i.postimg.cc/bDSkhZhn/Equipamentos-para-acampamento-e-caminhada.jpg',
        childCategories: [
          'Todas',
          'Binóculos e telescópios',
          'Iluminação para acampamento',
          'Utensílios para acampamento',
          'Purificação e armazenamento de água',
          'Redes',
          'Móveis para acampamento',
          'Kits de sobrevivência',
          'Tapetes e cestas de piquenique',
          'Tendas e acessórios',
          'Sacos de dormir',
          'Higiene para acampamento',
          'Bastões de caminhada',
          'Acendedores de fogo',
          'Equipamentos de segurança e sobrevivência',
          'Abrigos para acampamento',
          'Bolsas e mochilas',
          'Bússolas',
          'Impermeabilização e limpeza',
          'Sacos bivy',
          'Aquecedores de mãos e pés',
          'Carregadores infantis',
        ],
      },
      {
        name: 'Equipamentos para esportes com bola',
        imageUrl: 'https://i.postimg.cc/2bLhD1DZ/Equipamentos-para-esportes-com-bola.png',
        childCategories: [
          'Todas',
          'Golfe',
          'Beisebol',
          'Basquete',
          'Tênis de mesa',
          'Vôlei',
          'Futebol',
          'Tênis',
          'Softball',
          'Squash',
          'Futebol americano',
          'Sinuca',
          'Paddle',
          'Handebol',
          'Hóquei',
          'Lacrosse',
          'Badminton',
          'Rugby',
          'Boliche',
          'Polo',
          'Críquete',
          'Futsal',
          'Netball',
          'Racquetball',
        ],
      },
      {
        name: 'Equipamentos para esportes aquáticos',
        imageUrl: 'https://i.postimg.cc/Kk3B2123/Equipamentos-para-esportes-aquaticos.jpg',
        childCategories: [
          'Todas',
          'Natação',
          'Mergulho',
          'Passeios de barco',
          'Surfe',
          'Kitesurf',
          'Caiaque',
          'Polo aquático',
          'Stand up paddle',
          'Vela',
          'Canoagem',
          'Remo',
          'Windsurf',
          'Esqui aquático e wakeboard',
        ],
      },
      {
        name: 'Lazer e recreação ao ar livre',
        imageUrl: 'https://i.postimg.cc/Fdk34Y4Y/Equipamento-de-lazer-e-recreacao-ao-ar-livre.jpg',
        childCategories: [
          'Todas',
          'Hipismo',
          'Pesca',
          'Ciclismo',
          'Recreação indoor',
          'Yoga e Pilates',
          'Frisbee',
          'Corrida',
          'Ginástica',
          'Boxe e artes marciais',
          'Aeróbico',
          'Caça',
          'Dardos',
          'Skate',
          'Arco e flecha',
          'Alpinismo',
          'Balé e dança',
          'Motociclismo esportivo',
          'Animação de torcida',
          'Luta livre',
          'Esportes eletrônicos',
          'Karatê',
          'Patins',
          'Atletismo',
          'Taekwondo',
          'Paintball',
          'Triatlo',
          'Judô',
          'Esgrima',
        ],
      },
      {
        name: 'Equipamentos para esportes de inverno',
        imageUrl: 'https://i.postimg.cc/gXL8WxWn/Equipamentos-para-esportes-de-inverno.jpg',
        childCategories: ['Todas'],
      },
      {
        name: 'Loja oficial',
        imageUrl: 'https://i.postimg.cc/624nX8Xq/Loja-oficial.jpg',
        childCategories: ['Todas'],
      },
      {
        name: 'Jogos de jardim',
        imageUrl: 'https://i.postimg.cc/bDSkhZhy/Jogos-de-jardim.jpg',
        childCategories: ['Todas'],
      },
    ],
  },
  {
    filterKey: 'Ferramentas e hardware',
    label: 'Ferramentas e hardware',
    imageUrl: 'https://i.postimg.cc/RNGvVBwY/Ferramentas-e-hardware.png',
    subcategories: [
      'Todas',
      'Ferramentas de medição',
      'Ferramentas elétricas',
      'Ferramentas de jardim',
      'Hardware',
      'Equipamento de solda',
      'Ferramentas manuais',
      'Bombas e encanamento',
      'Organizadores de ferramentas',
    ],
    visualSubcategories: [
      {
        name: 'Ferramentas de medição',
        imageUrl: 'https://i.postimg.cc/hhTF646b/Ferramentas-de-medicao.png',
        childCategories: [
          'Todas',
          'Instrumentos de medição física',
          'Instrumentos de medição de temperatura',
          'Ferramentas de medição manual',
          'Instrumentos ópticos',
          'Instrumentos de medição elétrica',
          'Instrumentos de medição de pressão',
        ],
      },
      {
        name: 'Ferramentas elétricas',
        imageUrl: 'https://i.postimg.cc/s17FqfqP/Ferramentas-eletricas.jpg',
        childCategories: [
          'Todas',
          'Acessórios para ferramentas elétricas',
          'Polidores',
          'Furadeiras elétricas',
          'Conjuntos de ferramentas elétricas',
          'Sopradores',
          'Chaves de fenda elétricas',
          'Ferramentas elétricas especiais',
          'Chaves elétricas',
          'Compressores de ar',
          'Serras elétricas',
          'Roteadores de madeira',
          'Pistolas de pintura',
          'Rebarbadoras',
          'Lavadoras de alta pressão',
          'Pistolas de cola',
          'Pistolas de pregos',
          'Armas de calor',
        ],
      },
      {
        name: 'Ferramentas de jardim',
        imageUrl: 'https://i.postimg.cc/V5nypspq/Ferramentas-de-jardim.jpg',
        childCategories: [
          'Todas',
          'Enxadas e ancinhos',
          'Acessórios para ferramentas de jardinagem',
          'Ferramentas de jardim especiais',
          'Ferramentas de limpeza de jardim',
          'Motosserras',
          'Cortadores de grama',
          'Ferramentas de poda',
          'Luvas e equipamentos de proteção para jardinagem',
          'Detectores de metal',
          'Sopradores de folhas e aspiradores',
          'Aparadores de grama',
          'Pás',
          'Garfos e colheres',
          'Ferramentas de remoção de neve',
        ],
      },
      {
        name: 'Hardware',
        imageUrl: 'https://i.postimg.cc/XXdMmNmw/Hardware.png',
        childCategories: [
          'Todas',
          'Adesivos, fitas e selantes',
          'Fechos e ganchos',
          'Ferragens para móveis',
          'Grampos',
          'Cadeados e ferrolhos',
          'Ferragens para porta',
          'Ímãs',
          'Produtos abrasivos e de acabamento',
          'Ferragens para janelas',
          'Cordas, correntes e polias',
          'Hardware mecânico',
        ],
      },
      {
        name: 'Equipamento de solda',
        imageUrl: 'https://i.postimg.cc/dDrMpQpr/Equipamento-de-solda.jpg',
        childCategories: [
          'Todas',
          'Acessórios de soldagem',
          'Soldadores',
          'Ferros de solda elétricos',
          'Estações de solda',
        ],
      },
      {
        name: 'Ferramentas manuais',
        imageUrl: 'https://i.postimg.cc/fkm4pWpX/Ferramentas-manuais.jpg',
        childCategories: [
          'Todas',
          'Alicates',
          'Chaves de fenda',
          'Ferramentas de corte',
          'Kits de ferramentas',
          'Chaves',
          'Multiferramentas e acessórios',
          'Rebitadores manuais',
          'Ferramentas manuais especiais',
          'Ferramentas de alvenaria e ladrilhos',
          'Tesouras',
          'Balanças industriais',
          'Pinças industriais',
          'Serras',
          'Acessórios para ferramentas manuais',
          'Facas',
          'Ferramentas de reparo de relógios',
          'Martelos',
          'Cinzéis',
          'Machados',
        ],
      },
      {
        name: 'Bombas e encanamento',
        imageUrl: 'https://i.postimg.cc/Thg8F2Fb/Bombas-e-encanamento.jpg',
        childCategories: [
          'Todas',
          'Tubos e conexões',
          'Válvulas e peças',
          'Bombas, peças e acessórios',
        ],
      },
      {
        name: 'Organizadores de ferramentas',
        imageUrl: 'https://i.postimg.cc/0rDgF5FM/Organizadores-de-ferramentas.jpg',
        childCategories: [
          'Todas',
          'Bolsas de ferramentas',
          'Estojos e caixas de ferramentas',
          'Racks e barras de ferramentas',
        ],
      },
    ],
  },
  {
    filterKey: 'Joias, acessórios e derivados',
    label: 'Joias, acessórios e derivados',
    imageUrl: 'https://i.postimg.cc/yk7VHd3L/Joias-acessorios-e-derivados.png',
    subcategories: ['Todas'],
  },
  {
    filterKey: 'Livros, revistas e áudios',
    label: 'Livros, revistas e áudios',
    imageUrl: 'https://i.postimg.cc/tY9XjTnL/Livros-revistas-e-audios.png',
    subcategories: ['Todas'],
  },
  {
    filterKey: 'Malas e bolsas',
    label: 'Malas e bolsas',
    imageUrl: 'https://i.postimg.cc/KRQmv2nh/Malas-e-bolsas.png',
    subcategories: [
      'Todas',
      'Bolsas para mulheres',
      'Bolsas para homens',
      'Bolsas funcionais',
      'Malas e bolsas de viagem',
      'Acessórios para bolsas',
    ],
    visualSubcategories: [
      {
        name: 'Bolsas para mulheres',
        imageUrl: 'https://i.postimg.cc/F1rynHfD/Bolsas-para-mulheres.png',
        childCategories: [
          'Todas',
          'Sacolas',
          'Bolsas',
          'Carteiras',
          'Bolsas tiracolo e de ombro',
          'Clutches e pulseiras',
          'Pochetes',
          'Mochilas femininas',
          'Porta-cartões e documentos femininos',
          'Conjuntos de bolsas femininas',
        ],
      },
      {
        name: 'Bolsas para homens',
        imageUrl: 'https://i.postimg.cc/0rkYHy6d/Bolsas-para-homens.jpg',
        childCategories: [
          'Todas',
          'Carteiras',
          'Sacolas',
          'Bolsas tiracolo e de ombro',
          'Pochetes',
          'Clutches',
          'Porta-cartões e documentos masculinos',
          'Pastas',
          'Conjuntos de bolsas masculinas',
          'Mochilas masculinas',
        ],
      },
      {
        name: 'Bolsas funcionais',
        imageUrl: 'https://i.postimg.cc/Z0b8D59x/Bolsas-funcionais.png',
        childCategories: [
          'Todas',
          'Bolsas de maquiagem',
          'Lancheiras',
          'Bolsas para laptop',
          'Mochilas',
          'Bolsas de higiene',
          'Bolsas térmicas',
          'Sacolas de compras',
        ],
      },
      {
        name: 'Malas e bolsas de viagem',
        imageUrl: 'https://i.postimg.cc/pyWf1L9K/Malas-e-bolsas-de-viagem.jpg',
        childCategories: [
          'Todas',
          'Bagagem',
          'Bolsas de viagem',
          'Porta-passaportes e capas',
          'Organizadores de viagem',
          'Acessórios para bagagem',
        ],
      },
      {
        name: 'Acessórios para bolsas',
        imageUrl: 'https://i.postimg.cc/23kQXSqd/Acessorios-para-bolsas.jpg',
        childCategories: [
          'Todas',
          'Organizadores de bolsas',
          'Decorações e lenços',
          'Alças e correntes para bolsas',
          'Cabides de bolsa',
          'Acessórios para bolsas DIY',
          'Limpeza e cuidados',
          'Capas para bolsas',
        ],
      },
    ],
  },
  {
    filterKey: 'Moda muçulmana',
    label: 'Moda muçulmana',
    imageUrl: 'https://i.postimg.cc/hfKSBj7W/Moda-muculmana.png',
    subcategories: ['Todas'],
  },
  {
    filterKey: 'Moda para crianças',
    label: 'Moda para crianças',
    imageUrl: 'https://i.postimg.cc/JGKR4Lbw/Moda-para-criancas.png',
    subcategories: ['Todas'],
  },
  {
    filterKey: 'Móveis',
    label: 'Móveis',
    imageUrl: 'https://i.postimg.cc/VdzY860T/Moveis.png',
    subcategories: ['Todas'],
  },
  {
    filterKey: 'Reformas residenciais',
    label: 'Reformas residenciais',
    imageUrl: 'https://i.postimg.cc/zVqJrBRY/Reformas-residenciais.png',
    subcategories: ['Todas'],
  },
  {
    filterKey: 'Roupas femininas e roupas íntimas femininas',
    label: 'Roupas femininas e roupas íntimas femininas',
    imageUrl: 'https://i.postimg.cc/bsLqNhQv/Roupas-femininas-e-roupas-intimas-femininas.png',
    subcategories: [
      'Todas',
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
    visualSubcategories: [
      {
        name: 'Roupas íntimas femininas',
        imageUrl: 'https://i.postimg.cc/bDW9HFDD/Sutias.jpg',
        childCategories: [
          'Todas',
          'Acessórios de sutiã',
          'Cinta modeladora',
          'Lingerie',
          'Calcinhas',
          'Bralettes',
          'Meias',
          'Meias-calças',
          'Conjuntos de roupas íntimas',
          'Roupas íntimas térmicas',
        ],
      },
      {
        name: 'Ternos e macacões femininos',
        imageUrl: 'https://i.postimg.cc/1n2rcYnp/Ternos-e-macacoes-femininos.jpg',
        childCategories: ['Todas', 'Ternos', 'Macacões'],
      },
      {
        name: 'Vestidos femininos',
        imageUrl: 'https://i.postimg.cc/62gfL123/Vestidos-femininos.jpg',
        childCategories: ['Todas', 'Vestidos casuais', 'Vestidos formais', 'Vestidos de noiva', 'Vestidos de madrinha'],
      },
      {
        name: 'Peças femininas para parte superior',
        imageUrl: 'https://i.postimg.cc/sQq490Q7/Pecas-femininas-para-parte-superior.jpg',
        childCategories: [
          'Todas',
          'Coletes, regatas e tops',
          'Blusas e camisas',
          'Camisetas',
          'Jaquetas e casacos',
          'Malhas',
          'Coletes',
          'Camisas polo',
        ],
      },
      {
        name: 'Moda feminina de dormir e lazer',
        imageUrl: 'https://i.postimg.cc/hz61b3zd/Moda-feminina-de-dormir-e-lazer.jpg',
        childCategories: ['Todas', 'Camisolas', 'Moletons e blusões', 'Pijamas', 'Macacão', 'Roupões de banho'],
      },
      {
        name: 'Peças femininas para parte inferior',
        imageUrl: 'https://i.postimg.cc/8J9mBnJv/Pecas-femininas-para-parte-inferior.jpg',
        childCategories: ['Todas', 'Jeans', 'Shorts', 'Calças', 'Saias', 'Saias-calças e Short-saias'],
      },
      {
        name: 'Roupas especiais para mulheres',
        imageUrl: 'https://i.postimg.cc/ftpfjgtS/Roupas-especiais-para-mulheres.jpg',
        childCategories: ['Todas', 'Vestuário e uniformes', 'Vestido tradicional'],
      },
      {
        name: 'Conjuntos de roupas para família',
        imageUrl: 'https://i.postimg.cc/CBc1XJ3g/Conjuntos-de-roupas-para-familia.jpg',
        childCategories: ['Todas'],
      },
      {
        name: 'Fantasias e acessórios',
        imageUrl: 'https://i.postimg.cc/BLm6kNr4/Fantasias-e-acessorios.png',
        childCategories: ['Todas'],
      },
      {
        name: 'Leggings',
        imageUrl: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=300&q=80',
        childCategories: ['Todas'],
        imageClass: 'object-cover object-center',
      },
    ],
  },
  {
    filterKey: 'Roupas masculinas e roupas íntimas masculinas',
    label: 'Roupas masculinas e roupas íntimas masculinas',
    imageUrl: 'https://i.postimg.cc/hfMKPB9t/Roupas-masculinas-e-roupas-intimas-masculinas.png',
    subcategories: [
      'Todas',
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
    visualSubcategories: [
      {
        name: 'Peças masculinas para parte superior',
        imageUrl: 'https://i.postimg.cc/2VjCZ4Br/Pecas-masculinas-para-parte-superior.png',
        childCategories: [
          'Todas',
          'Camisetas e regatas',
          'Camisetas',
          'Camisas polo',
          'Camisas',
          'Moletons e blusões',
          'Malhas',
          'Jaquetas e casacos',
          'Coletes',
        ],
      },
      {
        name: 'Peças masculinas para parte inferior',
        imageUrl: 'https://i.postimg.cc/xcj9zKbY/Pecas-masculinas-para-parte-inferior.jpg',
        childCategories: ['Todas', 'Shorts', 'Calças', 'Jeans'],
      },
      {
        name: 'Ternos e macacões masculinos',
        imageUrl: 'https://i.postimg.cc/VdszCjbw/Ternos-e-macacoes-masculinos.jpg',
        childCategories: ['Todas', 'Macacões'],
      },
      {
        name: 'Roupas íntimas masculinas',
        imageUrl: 'https://i.postimg.cc/9rXc7Gqh/Roupas-intimas-masculinas.jpg',
        childCategories: [
          'Todas',
          'Roupas íntimas',
          'Roupas íntimas térmicas',
          'Modeladores masculinos',
        ],
      },
      {
        name: 'Moda masculina de dormir e lazer',
        imageUrl: 'https://i.postimg.cc/2VjCZ4Bf/Moda-masculina-de-dormir-e-lazer.jpg',
        childCategories: ['Todas', 'Pijamas', 'Camisas de dormir', 'Macacão'],
      },
      {
        name: 'Roupas especiais masculinas',
        imageUrl: 'https://i.postimg.cc/fJWM9x0Q/Roupas-especiais-masculinas.jpg',
        childCategories: [
          'Todas',
          'Vestuário e uniformes de trabalho',
          'Fantasias e acessórios',
          'Vestido tradicional',
        ],
      },
      {
        name: 'Conjuntos',
        imageUrl: 'https://i.postimg.cc/CzMwqjfT/Conjuntos.jpg',
        childCategories: ['Todas'],
      },
      {
        name: 'Ternos',
        imageUrl: 'https://i.postimg.cc/dLQJy8Zb/Ternos.jpg',
        childCategories: ['Todas'],
      },
      {
        name: 'Meias',
        imageUrl: 'https://i.postimg.cc/bsYqtQSK/Meias.jpg',
        childCategories: ['Todas'],
      },
      {
        name: 'Roupões, robes e macacões',
        imageUrl: 'https://i.postimg.cc/8jkT6hfx/Roupoes-de-banho-e-robes-Macacao.jpg',
        childCategories: ['Todas'],
      },
    ],
  },
  {
    filterKey: 'Sapatos',
    label: 'Sapatos',
    imageUrl: 'https://i.postimg.cc/mtVT2sQ4/Sapatos.png',
    subcategories: ['Todas'],
  },
  {
    filterKey: 'Saúde',
    label: 'Saúde',
    imageUrl: 'https://i.postimg.cc/SJmyhsYP/Saude.png',
    subcategories: ['Todas'],
  },
  {
    filterKey: 'Suprimentos domésticos',
    label: 'Suprimentos domésticos',
    imageUrl: 'https://i.postimg.cc/Vd4zL8jz/Suprimentos-domesticos.png',
    subcategories: [
      'Todas',
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
    visualSubcategories: [
      {
        name: 'Suprimentos para cuidados domésticos',
        imageUrl: 'https://i.postimg.cc/sMjF8y4q/Suprimentos-para-cuidados-domesticos.jpg',
        childCategories: [
          'Todas',
          'Panos de limpeza',
          'Produtos de limpeza domésticos',
          'Rodos',
          'Esfregões',
          'Controle de pragas e ervas daninhas',
          'Fragrância para casa',
          'Espanadores e cabeças de espanador',
          'Rolos e panos de cozinha',
          'Papel higiênico e lenços umedecidos',
          'Esponjas e esfregões',
          'Lixeiras',
          'Protetores de sapato descartáveis',
          'Capas contra poeira',
          'Luvas de limpeza',
          'Protetores contra respingos',
          'Lenços, guardanapos e toalhetes',
          'Vassouras',
          'Sacos de lixo',
          'Aventais',
          'Baldes',
          'Proteção contra traças, mofo e umidade',
          'Removedores de formaldeído',
        ],
      },
      {
        name: 'Suprimentos para banheiro',
        imageUrl: 'https://i.postimg.cc/gxz95dH7/Suprimentos-para-banheiro.jpg',
        childCategories: [
          'Todas',
          'Tapetes de banho',
          'Cortinas e varões de chuveiro',
          'Toucas de banho',
          'Utensílios de banheiro',
          'Escovas de banheiro e desentupidores',
          'Porta-escovas de dentes',
          'Toalhas',
          'Capas para assento sanitário',
          'Dispensadores de sabão',
          'Conjuntos de banheiro',
          'Saboneteiras',
          'Lavatórios e escalda-pés',
          'Copos de banheiro',
        ],
      },
      {
        name: 'Organizadores domésticos',
        imageUrl: 'https://i.postimg.cc/CRhytYsr/Organizadores-domesticos.jpg',
        childCategories: [
          'Todas',
          'Cabides e estacas',
          'Suportes e racks de armazenamento',
          'Ganchos e trilhos',
          'Sacos de armazenamento',
          'Cestas de armazenamento',
          'Caixas e recipientes de armazenamento',
        ],
      },
      {
        name: 'Decoração de casa',
        imageUrl: 'https://i.postimg.cc/cvxqjZBD/Decoracao-de-casa.jpg',
        childCategories: [
          'Todas',
          'Flores, plantas e frutas decorativas',
          'Decoração suspensa',
          'Velas',
          'Estátuas e estatuetas',
          'Placas e sinais',
          'Adesivos decorativos',
          'Ímãs de geladeira',
          'Leques',
          'Espelhos',
          'Ornamentos de Feng Shui',
          'Decorações religiosas',
          'Caixas de música',
          'Molduras de foto',
          'Cofrinhos',
          'Ganchos e prateleiras',
          'Castiçais',
          'Pôsteres e impressões',
          'Álbuns de fotos',
          'Relógios',
          'Tapeçarias',
        ],
      },
      {
        name: 'Artigos festivos e para festas',
        imageUrl: 'https://i.postimg.cc/WdNRKjw5/Artigos-festivos-e-para-festas.jpg',
        childCategories: [
          'Todas',
          'Recortes de papelão',
          'Cenários e banners',
          'Decorações festivas',
          'Bolsas e presentes para festas',
          'Talheres descartáveis',
          'Balões',
          'Chapéus, máscaras e acessórios de festa',
          'Decorações de bolo',
          'Suprimentos para casamento',
          'Sprays, confetes e flâmulas',
          'Lanternas do céu',
        ],
      },
      {
        name: 'Ferramentas e acessórios para lavanderia',
        imageUrl: 'https://i.postimg.cc/K1GXVFDQ/Ferramentas-e-acessorios-para-lavanderia.jpg',
        childCategories: [
          'Todas',
          'Bolas e discos para lavar roupas',
          'Racks de secagem',
          'Sacos de lavagem',
          'Bordas metálicas',
          'Linhas de lavagem',
          'Cestos de lavanderia',
          'Lavatórios',
        ],
      },
      {
        name: 'Garrafas e frascos de armazenamento',
        imageUrl: 'https://i.postimg.cc/tYtQ27Ww/Garrafas-e-frascos-de-armazenamento.jpg',
        childCategories: ['Todas'],
      },
      {
        name: 'Guarda-chuvas',
        imageUrl: 'https://i.postimg.cc/mtNf8hCp/Guarda-chuvas.jpg',
        childCategories: ['Todas'],
      },
      {
        name: 'Vasos e enchimentos',
        imageUrl: 'https://i.postimg.cc/QHkG0V1P/Vasos-e-enchimentos.jpg',
        childCategories: ['Todas'],
      },
      {
        name: 'Variedades para casas',
        imageUrl: 'https://i.postimg.cc/XrrM3LtC/Variedades-para-casas.jpg',
        childCategories: [
          'Todas',
          'Garrafas de água quente',
          'Acessórios para isqueiros',
          'Lonas',
          'Botas Wellington',
          'Capas de chuva',
        ],
      },
    ],
  },
  {
    filterKey: 'Suprimentos para animais de estimação',
    label: 'Suprimentos para animais de estimação',
    imageUrl: 'https://i.postimg.cc/crdsSH8S/Suprimentos-para-animais-de-estimacao.png',
    subcategories: ['Todas'],
  },
  {
    filterKey: 'Telefones e eletrônicos',
    label: 'Telefones e eletrônicos',
    imageUrl: 'https://i.postimg.cc/Xpxn7bwN/Telefones-e-eletronicos.png',
    subcategories: [
      'Todas',
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
    visualSubcategories: [
      {
        name: 'Acessórios para telefone',
        imageUrl: 'https://i.postimg.cc/64WP2pPS/Acessorios-para-telefone.png',
        childCategories: [
          'Todas',
          'Suportes para telefone',
          'Capas e protetores de tela',
          'Baterias portáteis',
          'Cabos, carregadores e adaptadores',
          'Acessórios para selfie',
          'Peças de celular',
          'Baterias de telefone',
          'Alças e charms para telefone',
          'Lentes e flashes móveis',
        ],
      },
      {
        name: 'Áudio e vídeo',
        imageUrl: 'https://i.postimg.cc/JDcgzkTM/Audio-e-video.jpg',
        childCategories: [
          'Todas',
          'Fones de ouvido',
          'Caixas de som',
          'Microfones',
          'Projetores',
          'Amplificadores e mixers',
          'Gravadores de voz',
          'Rádios',
          'Acessórios de áudio e vídeo',
          'Sistemas de cinema em casa',
        ],
      },
      {
        name: 'Dispositivos inteligentes e tecnologia vestível',
        imageUrl: 'https://i.postimg.cc/wycPjmwZ/Dispositivos-inteligentes-e-tecnologia-vestivel.jpg',
        childCategories: [
          'Todas',
          'Smart watches',
          'Smart glasses',
          'Acessórios vestíveis',
          'Dispositivos de realidade virtual',
          'Rastreadores GPS',
          'Tecnologia para esporte',
        ],
      },
      {
        name: 'Câmeras e fotografia',
        imageUrl: 'https://i.postimg.cc/phY7LF0t/Cameras-e-fotografia.jpg',
        childCategories: [
          'Todas',
          'Acessórios para câmeras',
          'Câmeras de vídeo',
          'Câmeras de ação',
          'Drones e acessórios',
          'Câmeras instantâneas',
          'Lentes de câmera',
          'Câmeras sem espelho',
          'DSLRs',
        ],
      },
      {
        name: 'Acessórios universais',
        imageUrl: 'https://i.postimg.cc/gXq52ZMd/Acessorios-universais.jpg',
        childCategories: [
          'Todas',
          'Luzes USB portáteis',
          'Ventiladores USB portáteis',
          'Aspiradores USB',
          'Wi-Fi portátil',
          'Carregamento universal de bateria',
        ],
      },
      {
        name: 'Jogos e consoles',
        imageUrl: 'https://i.postimg.cc/S275xMZh/Jogos-e-consoles.jpg',
        childCategories: [
          'Todas',
          'Consoles de jogos domésticos',
          'Consoles portáteis',
          'Acessórios para console',
          'Videogames',
          'Acessórios para PC Gaming',
        ],
      },
      {
        name: 'Telefones e tablets',
        imageUrl: 'https://i.postimg.cc/ZBFg5dfm/Telefones-e-tablets.jpg',
        childCategories: [
          'Todas',
          'Celulares',
          'Tablets',
          'Capas para tablets',
          'Carregadores para tablets',
          'Canetas stylus',
          'Suportes para tablets',
          'Teclados para tablets',
          'Protetores de tela para tablets',
        ],
      },
      {
        name: 'Acessórios para tablets e computadores',
        imageUrl: 'https://i.postimg.cc/fSzPtRPP/Acessorios-para-tablets-e-computadores.jpg',
        childCategories: [
          'Todas',
          'Capas e estojos',
          'Carregadores e adaptadores',
          'Teclados',
          'Suportes e bases',
          'Peças e acessórios',
        ],
      },
      {
        name: 'Eletrônicos recondicionados',
        imageUrl: 'https://i.postimg.cc/vgLjZVPR/Refurbished-Electronics.jpg',
        childCategories: [
          'Todas',
          'Celulares recondicionados',
          'Tablets recondicionados',
          'Computadores e acessórios recondicionados',
          'Áudio e vídeo recondicionados',
          'Smart devices recondicionados',
        ],
      },
      {
        name: 'Dispositivos de educação',
        imageUrl: 'https://i.postimg.cc/jwQ9S7Mp/Dispositivos-de-educacao.jpg',
        childCategories: [
          'Todas',
          'Dicionários eletrônicos',
          'Dispositivos de aprendizagem',
          'Tablets de escrita',
          'Leitores digitais',
          'Canetas digitais',
          'Cadernos eletrônicos',
        ],
      },
    ],
  },
  {
    filterKey: 'Têxteis e móveis',
    label: 'Têxteis e móveis',
    imageUrl: 'https://i.postimg.cc/vcXGHs5j/Texteis-e-moveis.png',
    subcategories: ['Todas'],
  },
  {
    filterKey: 'Utensílios de cozinha',
    label: 'Utensílios de cozinha',
    imageUrl: 'https://i.postimg.cc/tYD9CjFL/Utensilios-de-cozinha.png',
    subcategories: ['Todas'],
  },
];

const TIKTOK_CATEGORIES = CATEGORY_CONFIG.map((c) => ({ filterKey: c.filterKey, label: c.label }));

function formatMoney(cents: number | null | undefined, symbol = 'R$') {
  if (cents === null || cents === undefined) return '—';
  return `${symbol} ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getCommissionText(product: ProductMinerProduct): string | null {
  const hasAmount = Boolean(product.estimatedCommissionCents && product.estimatedCommissionCents > 0);
  const hasPercent = Boolean(product.commissionRatePercent && product.commissionRatePercent > 0);

  if (!hasAmount && !hasPercent) return null;

  if (hasAmount && hasPercent) {
    const moneyStr = formatMoney(product.estimatedCommissionCents!, product.currencySymbol);
    return `Comissão ${moneyStr} · ${product.commissionRatePercent}%`;
  }
  if (hasAmount) {
    const moneyStr = formatMoney(product.estimatedCommissionCents!, product.currencySymbol);
    return `Comissão ${moneyStr}`;
  }
  return `Comissão ${product.commissionRatePercent}%`;
}

function getOfficialProductUrl(product: { productUrl?: string | null; productId?: string | null }): string | null {
  if (!product) return null;

  const rawUrl = product.productUrl ? String(product.productUrl).trim() : '';

  if (rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
    const isSearchUrl = rawUrl.includes('/search') ||
                        rawUrl.includes('/query') ||
                        rawUrl.includes('/store/search') ||
                        rawUrl.includes('q=') ||
                        rawUrl.includes('search_id=') ||
                        rawUrl.includes('keyword=');
    if (!isSearchUrl) {
      return rawUrl;
    }
  }

  return null;
}

function compactNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

function formatCollectionDate(isoStr: string | null): string {
  if (!isoStr) return 'Sem dados coletados';
  const date = new Date(isoStr);
  if (!Number.isFinite(date.getTime())) return 'Sem dados coletados';

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (isToday) {
    return `Atualizado hoje às ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Atualizado ontem às ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `Atualizado em ${dateStr} às ${timeStr}`;
}

function getCategoryIcon(catName: string) {
  const norm = catName.toLowerCase();
  if (norm.includes('beleza')) return <Sparkles className="w-5 h-5 text-amber-300" />;
  if (norm.includes('casa')) return <Home className="w-5 h-5 text-cyan-300" />;
  if (norm.includes('moda')) return <Shirt className="w-5 h-5 text-fuchsia-300" />;
  if (norm.includes('cozinha')) return <Utensils className="w-5 h-5 text-orange-300" />;
  if (norm.includes('eletrônicos') || norm.includes('eletronicos')) return <Cpu className="w-5 h-5 text-blue-300" />;
  if (norm.includes('fitness')) return <Dumbbell className="w-5 h-5 text-emerald-300" />;
  if (norm.includes('bebê') || norm.includes('bebe') || norm.includes('infantil')) return <Baby className="w-5 h-5 text-pink-300" />;
  if (norm.includes('pet')) return <Dog className="w-5 h-5 text-purple-300" />;
  return <ShoppingBag className="w-5 h-5 text-cyan-300" />;
}

function matchesCategoryFilter(
  productCatRaw: string | null,
  selectedCat: string,
  productTitleRaw?: string | null
): boolean {
  if (!selectedCat || selectedCat === 'Todos' || selectedCat === 'Todas') return true;
  if (!productCatRaw && !productTitleRaw) return false;

  const target = selectedCat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const cat = (productCatRaw || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (cat && (cat === target || cat.includes(target) || target.includes(cat))) {
    return true;
  }

  // Fallback checks for title + category text against legacy or keywords
  const title = (productTitleRaw || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const text = `${cat} ${title}`;

  if (target.includes('saude')) return text.includes('saude') || text.includes('creatina') || text.includes('suplemento') || text.includes('vitamina') || text.includes('health');
  if (target.includes('animais') || target.includes('estima')) return text.includes('pet') || text.includes('cachorro') || text.includes('gato') || text.includes('racao') || text.includes('animais');
  if (target.includes('bebe') && target.includes('maternidade')) return text.includes('bebe') || text.includes('maternidade') || text.includes('fralda') || text.includes('berco');
  if (target.includes('criancas')) return text.includes('infantil') || text.includes('crianca') || text.includes('kids') || text.includes('brinquedo');
  if (target.includes('alimentos') || target.includes('bebidas')) return text.includes('alimento') || text.includes('comida') || text.includes('bebida') || text.includes('snack');
  if (target.includes('beleza') || target.includes('cuidados')) return text.includes('beleza') || text.includes('maquiagem') || text.includes('skincare') || text.includes('cabelo') || text.includes('perfume') || text.includes('corpo');
  if (target.includes('telefones') || target.includes('eletronicos')) return text.includes('eletronico') || text.includes('celular') || text.includes('fone') || text.includes('smartphone') || text.includes('tecnologia');
  if (target.includes('computadores')) return text.includes('computador') || text.includes('notebook') || text.includes('teclado') || text.includes('mouse') || text.includes('escritorio');
  if (target.includes('eletrodomesticos')) return text.includes('eletrodomestico') || text.includes('air fryer') || text.includes('liquidificador') || text.includes('aspirador');
  if (target.includes('automotivo') || target.includes('moto')) return text.includes('automotivo') || text.includes('carro') || text.includes('moto') || text.includes('capacete');
  if (target.includes('esportes') || target.includes('livre')) return text.includes('esporte') || text.includes('fitness') || text.includes('treino') || text.includes('academia') || text.includes('lazer');
  if (target.includes('ferramentas') || target.includes('hardware')) return text.includes('ferramenta') || text.includes('furadeira') || text.includes('alicate') || text.includes('chave');
  if (target.includes('joias')) return text.includes('joia') || text.includes('brinco') || text.includes('colar') || text.includes('anel') || text.includes('pulseira');
  if (target.includes('livros')) return text.includes('livro') || text.includes('revista') || text.includes('kindle') || text.includes('audio');
  if (target.includes('malas') || target.includes('bolsas')) return text.includes('mala') || text.includes('mochila') || text.includes('bolsa') || text.includes('carteira');
  if (target.includes('muculmana')) return text.includes('hijab') || text.includes('abaya') || text.includes('muculmana');
  if (target.includes('moveis')) return text.includes('movel') || text.includes('cadeira') || text.includes('mesa') || text.includes('sofa');
  if (target.includes('reformas')) return text.includes('reforma') || text.includes('construcao') || text.includes('lampada') || text.includes('torneira');
  if (target.includes('femininas')) return text.includes('vestido') || text.includes('saia') || text.includes('lingerie') || text.includes('feminina');
  if (target.includes('masculinas')) return text.includes('camisa') || text.includes('cueca') || text.includes('masculina') || text.includes('bermuda');
  if (target.includes('sapatos')) return text.includes('sapato') || text.includes('tenis') || text.includes('sandalia') || text.includes('calcado') || text.includes('bota');
  if (target.includes('domesticos')) return text.includes('limpeza') || text.includes('sabao') || text.includes('mop') || text.includes('domestico');
  if (target.includes('brinquedos') || target.includes('passatempos')) return text.includes('brinquedo') || text.includes('jogo') || text.includes('boneca') || text.includes('quebra-cabeca');
  if (target.includes('acessorios de moda')) return text.includes('cinto') || text.includes('oculos') || text.includes('relogio') || text.includes('chapeu');
  if (target.includes('texteis')) return text.includes('cama') || text.includes('lencol') || text.includes('toalha') || text.includes('cortina');
  if (target.includes('cozinha')) return text.includes('panela') || text.includes('frigideira') || text.includes('utensilio') || text.includes('copo') || text.includes('prato');

  return false;
}

function matchesSubcategoryFilter(
  productCatRaw: string | null | undefined,
  productTitleRaw: string | null | undefined,
  selectedSubcat: string,
  selectedCat: string
): boolean {
  if (!selectedSubcat || selectedSubcat === 'Todas' || selectedSubcat === 'Todos') {
    return true;
  }

  // 1. MAIN CATEGORY CHECK FIRST (Requirement 6: Never test subcategory on products outside main category)
  if (!matchesCategoryFilter(productCatRaw || null, selectedCat)) {
    return false;
  }

  const catStr = (productCatRaw || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const titleStr = (productTitleRaw || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const sub = selectedSubcat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1b. DIRECT STRUCTURED CATEGORY_PATH MATCH
  if (catStr.includes(`> ${sub}`) || catStr.includes(`>${sub}`) || catStr.endsWith(sub)) {
    return true;
  }

  const catKey = selectedCat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const mapKey = `${catKey}_${sub}`;

  const KEYWORD_MAP: Record<string, string[]> = {
    // Moda
    'acessorios': ['acessorio', 'bijuteria', 'joia', 'relogio', 'oculos', 'chapeu', 'cinto', 'bolsa', 'corrente', 'brinco', 'colar', 'anel'],
    'malas e mochilas': ['mala', 'mochila', 'bagagem', 'pochete', 'carteira', 'necessaire'],
    'moda feminina': ['feminina', 'feminino', 'vestido', 'saia', 'suti', 'lingerie', 'blusa', 'top', 'blazer', 'cropped', 'body'],
    'moda masculina': ['masculina', 'masculino', 'camisa', 'camiseta', 'bermuda', 'cueca', 'jaqueta', 'casaco', 'paleto'],
    'calcados': ['calcado', 'sapato', 'tenis', 'sandalia', 'chinelo', 'bota', 'sapatilha', 'crocs', 'rasteira', 'salto'],

    // Itens para Casa
    'utensilios de cozinha': ['cozinha', 'utensilio', 'panela', 'faca', 'copo', 'prato', 'xicara', 'airfryer', 'air fryer', 'liquidificador', 'pote', 'organizador de cozinha', 'forma', 'assadeira', 'garrafa termica'],
    'moveis': ['moveis', 'movel', 'mesa', 'cadeira', 'sofa', 'estante', 'armario', 'cama', 'rack', 'escrivaninha', 'banqueta'],
    'ferramentas': ['ferramenta', 'furadeira', 'parafusadeira', 'chave', 'alicate', 'trena', 'martelo', 'jogo de chaves', 'broca'],
    'artigos para festas': ['festa', 'balao', 'aniversario', 'decoracao de festa', 'lembrancinha', 'painel de festa'],
    'reforma e construcao': ['reforma', 'construcao', 'torneira', 'piso', 'tinta', 'soquete', 'lampada', 'tomada', 'chuveiro', 'fechadura', 'fita adesiva'],
    'itens para banheiro': ['banheiro', 'toalha de banho', 'chuveiro', 'saboneteira', 'porta escova', 'tapete de banheiro', 'suporte banheiro'],
    'produtos de limpeza': ['limpeza', 'vassoura', 'rodo', 'mop', 'detergente', 'desinfetante', 'pano', 'esponja', 'sabao', 'amaciante', 'aspirador'],
    'decoracao de casa': ['decoracao', 'quadro', 'espelho', 'vela', 'vaso', 'almofada', 'tapete', 'luminaria', 'cortina', 'relogio de parede'],
    'cama, mesa e banho': ['cama', 'mesa e banho', 'lencol', 'travesseiro', 'edredom', 'manta', 'toalha', 'fronha', 'coberdrom'],

    // Eletrônicos
    'celulares e eletronicos': ['celular', 'smartphone', 'capinha', 'pelicula', 'carregador', 'fone', 'headphone', 'bluetooth', 'eletronico', 'smartwatch', 'relogio inteligente'],
    'livros e revistas': ['livro', 'revista', 'hq', 'manga', 'e-book', 'leitura'],
    'automotivo': ['automotivo', 'carro', 'moto', 'suporte celular', 'suporte carro', 'veiculo', 'som automotivo', 'camera re'],
    'computadores e equipamentos': ['computador', 'notebook', 'laptop', 'teclado', 'mouse', 'monitor', 'pc', 'hardware', 'usb', 'hub', 'placa'],
    'dispositivos de higiene': ['higiene', 'escova eletrica', 'barbeador', 'aparador', 'secador', 'prancha', 'chapinha', 'irrigador'],
    'eletrodomesticos': ['eletrodomestico', 'geladeira', 'fogao', 'microondas', 'ventilador', 'ar condicionado', 'aspirador', 'batedeira', 'fritadeira'],
    'livros e audio': ['audio', 'caixa de som', 'soundbar', 'microfone', 'headset', 'speaker', 'amplificador'],

    // Beleza e Cuidados Pessoais
    'cuidados capilares': ['cabelo', 'capilar', 'shampoo', 'condicionador', 'mascara capilar', 'oleo capilar', 'tintura', 'creme de pentear', 'reparador'],
    'perfumes': ['perfume', 'fragrancia', 'colonia', 'body splash', 'eau de parfum', 'decant'],
    'cuidados com o corpo': ['corpo', 'hidratante', 'sabonete', 'desodorante', 'esfoliante', 'locao corporal', 'óleo corporal'],

    // Brinquedos e Pets
    'produtos para pets': ['pet', 'cachorro', 'gato', 'coleira', 'caminha pet', 'racao', 'arranhador', 'brinquedo pet', 'guia'],
    'suprimentos para pets': ['suprimentos para pets', 'tapete higienico', 'comedouro', 'bebedouro', 'shampoo pet', 'caixa de areia', 'eliminador de odores'],

    // Health
    'health nutrition': ['nutrition', 'nutricao', 'suplemento', 'vitamina', 'whey', 'creatina', 'colageno', 'omega 3', 'protein', 'termogenico', 'pre treino'],

    // Roupas femininas e roupas íntimas femininas - Subcategorias
    'roupas intimas femininas': ['sutias', 'sutia', 'lingerie', 'calcinha', 'calcinhas', 'bralette', 'meia', 'meias', 'intima', 'intimas', 'cinta'],
    'ternos e macacoes femininos': ['terno', 'ternos', 'macacao', 'macacoes', 'conjunto', 'blazer'],
    'vestidos femininos': ['vestido', 'vestidos', 'noiva', 'madrinha', 'festa'],
    'pecas femininas para parte superior': ['regata', 'top', 'top', 'blusa', 'blusao', 'camisa', 'camiseta', 'jaqueta', 'casaco', 'malha', 'colete', 'polo', 'cropped'],
    'moda feminina de dormir e lazer': ['camisola', 'moleton', 'moletom', 'pijama', 'pijamas', 'macacao', 'roupao', 'dormir', 'lazer'],
    'pecas femininas para parte inferior': ['jeans', 'short', 'shorts', 'calca', 'calcas', 'saia', 'saias', 'legging', 'leggings', 'short-saia'],
    'roupas especiais para mulheres': ['uniforme', 'uniformes', 'fantasia', 'fantasias', 'tradicional', 'costume'],

    // Roupas femininas - Terceiro Nível
    'acessorios de sutia': ['sutia', 'sutias', 'alca', 'bojo', 'extensor'],
    'cinta modeladora': ['cinta', 'modelador', 'modeladora', 'espartilho', 'corsete'],
    'lingerie': ['lingerie', 'renda', 'espartilho', 'body'],
    'calcinhas': ['calcinha', 'calcinhas', 'tanga', 'fio dental'],
    'bralettes': ['bralette', 'bralettes'],
    'meias': ['meia', 'meias', 'soquete'],
    'meias-calcas': ['meia-calca', 'meias-calcas', 'meia calca', 'meias calcas'],
    'conjuntos de roupas intimas': ['conjunto', 'conjuntos', 'kit lingerie', 'kit calcinha'],
    'roupas intimas termicas': ['termica', 'termicas', 'segunda pele'],
    'conjuntos': ['conjunto', 'conjuntos', 'terninho'],
    'ternos': ['terno', 'ternos', 'blazer', 'paleto'],
    'macacoes': ['macacao', 'macacoes', 'jumpsuit', 'macaquinho'],
    'vestidos casuais': ['casual', 'dia a dia', 'soltinho', 'curto'],
    'vestidos formais': ['formal', 'festa', 'gala', 'longo', 'elegante'],
    'vestidos de noiva': ['noiva', 'casamento', 'bridal'],
    'vestidos de madrinha': ['madrinha', 'madrinhas'],
    'coletes, regatas e tops': ['colete', 'regata', 'top', 'cropped'],
    'blusas e camisas': ['blusa', 'camisa', 'bata'],
    'camisetas': ['camiseta', 't-shirt', 'tshirt'],
    'jaquetas e casacos': ['jaqueta', 'casaco', 'cardigan', 'sobretudo'],
    'malhas': ['malha', 'trico', 'tricot', 'sueter'],
    'coletes': ['colete', 'coletes'],
    'camisas polo': ['polo', 'camisa polo'],
    'camisolas': ['camisola', 'camisolas'],
    'moletons e blusoes': ['moletom', 'moletom', 'blusao', 'hoodie'],
    'pijamas': ['pijama', 'pijamas', 'baby doll', 'babydoll'],
    'macacao': ['macacao', 'pijama macacao'],
    'roupoes de banho': ['roupao', 'roupoes'],
    'jeans': ['jeans', 'denim'],
    'shorts': ['short', 'shorts', 'bermuda'],
    'calcas': ['calca', 'calcas', 'pantalona', 'jogger'],
    'saias': ['saia', 'saias', 'plissada'],
    'leggings': ['legging', 'leggings', 'corsario'],
    'saias-calcas e short-saias': ['short saia', 'short-saia', 'saia calca', 'saia-calca'],
    'vestuario e uniformes': ['vestuario', 'uniforme', 'uniformes', 'trabalho'],
    'vestido tradicional': ['tradicional', 'etnico', 'kimono'],
    'fantasias e acessorios': ['fantasia', 'fantasias', 'cosplay', 'halloween'],
    'conjuntos de roupas para familia': ['conjunto familia', 'familia', 'pai e filho', 'mae e filha', 'pijama familia', 'look familia'],

    // Roupas masculinas - Subcategorias
    'pecas masculinas para parte superior': ['camiseta', 'camisa', 'polo', 'moletom', 'regata', 'jaqueta', 'casaco', 'sueter', 'colete'],
    'pecas masculinas para parte inferior': ['calca', 'bermuda', 'short', 'jeans', 'pantaloes'],
    'ternos e macacoes masculinos': ['terno', 'blazer', 'macacao', 'paleto'],
    'roupas intimas masculinas': ['cueca', 'cuecas', 'boxer', 'slip', 'sunga', 'modelador masculino'],
    'moda masculina de dormir e lazer': ['pijama masculino', 'pijama', 'samba cancao'],
    'roupas especiais masculinas': ['uniforme masculino', 'macacao trabalho', 'traje tradicional'],
    'roupoes, robes e macacoes': ['roupao', 'robe', 'macacao'],

    // Acessórios de moda - Subcategorias
    'acessorios para cabelos': ['presilha', 'tiara', 'chuchu', 'elastico', 'piranha', 'grampo', 'arquinho', 'faixa', 'turbante', 'coroa', 'pente'],
    'acessorios para roupas': ['cinto', 'cachecol', 'xale', 'gravata', 'luva', 'lenco', 'abotoadura', 'protetor de ouvido', 'mascara'],
    'bijuterias e acessorios': ['colar', 'brinco', 'pulseira', 'anel', 'tornozeleira', 'chaveiro', 'pingente', 'broche', 'bijuteria', 'joia'],
    'chapeus': ['chapeu', 'bone', 'boina', 'gorro', 'vizeira', 'panama'],
    'coleiras e broches': ['coleira', 'choker', 'broche', 'pin'],
    'extensoes de cabelo e perucas': ['peruca', 'wig', 'megahair', 'mega hair', 'extensao', 'aplique', 'lace'],
    'oculos': ['oculos', 'oculos de sol', 'armação', 'lente de contato'],
    'relogios e acessorios': ['relogio', 'pulseira relogio', 'passador'],
    'tecidos para costura': ['tecido', 'veludo', 'seda', 'cetim', 'couro', 'poliester', 'algodao', 'renda', 'batik', 'jeans', 'la'],
    'acessorios para casamento': ['veu', 'grinalda', 'noiva', 'coroa noiva', 'luva noiva', 'boutonniere', 'corsage'],

    // Suprimentos domésticos - Subcategorias
    'suprimentos para cuidados domesticos': ['limpeza', 'pano', 'rodo', 'esfregao', 'praga', 'inseticida', 'fragrancia', 'aromatizador', 'espanador', 'papel higienico', 'lixeira', 'vassoura', 'saco de lixo', 'avental', 'balde'],
    'suprimentos para banheiro': ['banheiro', 'tapete banho', 'cortina banho', 'touca banho', 'porta escova', 'toalha', 'dispenser sabao', 'saboneteira', 'escova sanitaria'],
    'organizadores domesticos': ['organizador', 'cabide', 'rack', 'gancho', 'saco organizador', 'cesta organizadora', 'caixa organizadora'],
    'artigos festivos e para festas': ['festa', 'balao', 'bexiga', 'painel', 'banner', 'descartavel', 'decoracao bolo', 'confete'],
    'ferramentas e acessorios para lavanderia': ['lavanderia', 'varal', 'cesto roupa', 'saco lavar roupa', 'pregador'],
    'garrafas e frascos de armazenamento': ['pote', 'frasco', 'pote vidro', 'pote mantimento', 'pote plastico'],
    'guarda-chuvas': ['guarda chuva', 'sombrinha', 'guarda-chuva'],
    'vasos e enchimentos': ['vaso', 'vaso de flor', 'cachepot'],
    'variedades para casas': ['bolsa agua quente', 'isqueiro', 'capa de chuva', 'bota'],

    // Beleza e cuidados pessoais - Subcategorias
    'cuidados com as maos e os pes': ['manicure', 'pedicure', 'esmalte', 'unha', 'creme maos', 'desinfetante maos', 'cera'],
    'cuidados com os olhos e ouvidos': ['mascara dormir', 'tampao ouvido', 'otoscopio', 'ouvido', 'olho'],
    'itens de cuidados pessoais': ['secador', 'prancha', 'barbeador', 'depilador', 'massageador', 'escova eletrica', 'aparador'],
    'maquiagem': ['batom', 'rimel', 'base', 'corretivo', 'pincel', 'sombra', 'blush', 'po', 'delineador', 'primer', 'bb cream', 'cc cream'],
    'fragrancias': ['perfume', 'perfumes', 'fragrancia', 'colonia', 'body splash'],
    'cuidados com a pele': ['skincare', 'serum', 'limpador facial', 'mascara facial', 'protetor solar', 'protetor facial', 'tonico', 'creme facial'],
    'cuidados com cabelos e penteados': ['shampoo', 'condicionador', 'tintura', 'pente', 'escova cabelo', 'mousse', 'gel cabelo', 'couro cabeludo'],
    'cuidados nasais e orais': ['pasta de dente', 'escova de dente', 'fio dental', 'enxaguante', 'clareamento', 'spray oral', 'limpeza nasal'],
    'banho e cuidados com o corpo': ['sabonete', 'gel de banho', 'creme corporal', 'locao', 'desodorante', 'oleo corporal', 'esfoliante corporal'],
    'cuidados pessoais especiais': ['repelente', 'bolsa de gelo', 'fralda adulto', 'adesivo termico'],
    'cuidados masculinos': ['barba', 'pos barba', 'espuma barbear', 'navalha', 'grooming masculino'],
    'cuidados femininos': ['absorvente', 'copo menstrual', 'higiene intima', 'tampon'],

    // Esportes e atividades ao ar livre - Subcategorias
    'acessorios esportivos e para atividades ao ar livre': ['oculos esportivo', 'bolsa esportiva', 'luvas esportivas', 'garrafa esportiva', 'meia esportiva', 'fita esportiva'],
    'roupas esportivas e para atividades ao ar livre': ['calcao esportivo', 'moleton esportivo', 'legging esportivo', 'camiseta esportiva', 'agasalho', 'sutia esportivo'],
    'equipamento de ginastica': ['haltere', 'elastico', 'corda de pular', 'tapete esportivo', 'trampolim', 'bambole', 'musculacao'],
    'trajes de banho, surfe e natacao': ['maio', 'biquini', 'tanquini', 'calcao de banho', 'neoprene', 'traje natacao'],
    'calcados esportivos': ['tenis corrida', 'chuteira', 'tenis basquete', 'patins', 'tenis skate', 'sapatilha escalada'],
    'equipamentos para acampamento e caminhada': ['barraca', 'tenda', 'saco de dormir', 'lanterna', 'binoculo', 'mochila camping', 'bussola'],
    'equipamentos para esportes com bola': ['bola futebol', 'bola basquete', 'bola volei', 'raquete tenis', 'sinuca', 'boliche'],
    'equipamentos para esportes aquaticos': ['caiaque', 'prancha surfe', 'kitesurf', 'stand up paddle', 'mergulho', 'remando'],
    'lazer e recreacao ao ar livre': ['pesca', 'ciclismo', 'skate', 'arco e flecha', 'escalada', 'artes marciais', 'yoga'],
    'equipamentos para esportes de inverno': ['esqui', 'snowboard', 'patins no gelo'],
    'loja oficial': ['oficial', 'oficiais'],
    'jogos de jardim': ['jogo jardim', 'trampolim jardim', 'croquet'],

    // Telefones e eletrônicos - Subcategorias
    'acessorios para telefone': ['capa', 'capinha', 'pelicula', 'carregador', 'suporte celular', 'suporte telefone', 'bateria portatil', 'powerbank', 'cabo usb', 'selfie', 'celular', 'telefone', 'alca celular'],
    'audio e video': ['fone', 'fones', 'headphone', 'headset', 'caixa de som', 'speaker', 'microfone', 'projetor', 'amplificador', 'gravador', 'radio', 'home theater', 'audio', 'video'],
    'dispositivos inteligentes e tecnologia vestivel': ['smartwatch', 'smart watch', 'relogio inteligente', 'smart glass', 'oculos inteligente', 'smartband', 'pulseira inteligente', 'vr', 'realidade virtual', 'gps', 'rastreador'],
    'cameras e fotografia': ['camera', 'camara', 'fotografia', 'tripe', 'filmadora', 'drone', 'gopro', 'lente', 'dslr', 'flash'],
    'acessorios universais': ['luz usb', 'ventilador usb', 'aspirador usb', 'wifi portatil', 'carregador universal'],
    'jogos e consoles': ['game', 'games', 'jogo', 'jogos', 'console', 'playstation', 'xbox', 'nintendo', 'controle', 'joystick', 'gamer'],
    'telefones e tablets': ['celular', 'smartphone', 'telefone', 'tablet', 'ipad', 'galaxy tab', 'caneta stylus', 'capa tablet'],
    'acessorios para tablets e computadores': ['capa notebook', 'case tablet', 'fonte notebook', 'suporte notebook', 'teclado bluetooth', 'mouse', 'hub usb'],
    'eletronicos recondicionados': ['recondicionado', 'refurbished', 'seminovo', 'usado recondicionado', 'revisado'],
    'dispositivos de educacao': ['dicionario eletronico', 'tablet de escrita', 'lousa magica', 'leitor digital', 'kindle', 'caneta digital', 'caderno eletronico'],

    // Telefones e eletrônicos - Terceiro Nível
    'suportes para telefone': ['suporte', 'suporte veicular', 'suporte mesa', 'tripe celular'],
    'capas e protetores de tela': ['capa', 'capinha', 'case', 'pelicula', 'vidro temperado'],
    'baterias portateis': ['bateria portatil', 'powerbank', 'power bank'],
    'cabos, carregadores e adaptadores': ['cabo', 'carregador', 'adaptador', 'type-c', 'lightning', 'fonte'],
    'acessorios para selfie': ['selfie', 'pau de selfie', 'bastao selfie', 'ring light'],
    'pecas de celular': ['tela celular', 'display', 'touch', 'conector carga', 'flex'],
    'baterias de telefone': ['bateria celular', 'bateria iphone', 'bateria samsung'],
    'alcas e charms para telefone': ['alca', 'charm', 'cordinha', 'strap'],
    'lentes e flashes moveis': ['lente celular', 'flash celular', 'fisheye'],
    'fones de ouvido': ['fone', 'fones', 'earphone', 'headphone', 'airpods', 'earbuds', 'headset'],
    'caixas de som': ['caixa de som', 'speaker', 'jbl', 'som bluetooth'],
    'microfones': ['microfone', 'lapela', 'condensador', 'mic'],
    'projetores': ['projetor', 'mini projetor', 'datashow'],
    'amplificadores e mixers': ['amplificador', 'mixer', 'mesa de som'],
    'gravadores de voz': ['gravador', 'dictafone'],
    'radios': ['radio', 'radinho', 'fm', 'am'],
    'acessorios de audio e video': ['cabo hdmi', 'cabo aux', 'adaptador audio', 'placa de captura'],
    'sistemas de cinema em casa': ['home theater', 'soundbar', 'barra de som'],
    'smart watches': ['smartwatch', 'smart watch', 'relogio inteligente', 'apple watch', 'amazfit'],
    'smart glasses': ['smart glasses', 'oculos inteligente', 'oculos bluetooth'],
    'acessorios vestiveis': ['pulseira smartwatch', 'capa smartwatch', 'carregador smartwatch'],
    'dispositivos de realidade virtual': ['vr', 'oculos vr', 'realidade virtual', 'meta quest'],
    'rastreadores gps': ['gps', 'rastreador', 'airtag', 'tag'],
    'tecnologia para esporte': ['fita cardiaca', 'odometro', 'monitor cardiaco'],
    'acessorios para cameras': ['tripe', 'bolsa camera', 'cartao de memoria', 'estabilizador', 'gimbal'],
    'cameras de video': ['filmadora', 'camcorder', 'camera de video'],
    'cameras de acao': ['gopro', 'camera de acao', 'action cam'],
    'drones e acessorios': ['drone', 'quadricoptero', 'helice drone'],
    'cameras instantaneas': ['instax', 'polaroid', 'camera instantanea'],
    'lentes de camera': ['lente camera', 'lente canon', 'lente nikon'],
    'cameras sem espelho': ['mirrorless'],
    'dslrs': ['dslr', 'canon eos', 'nikon d'],
    'luzes usb portateis': ['luz usb', 'luminaria usb', 'led usb'],
    'ventiladores usb portateis': ['ventilador usb', 'mini ventilador usb'],
    'aspiradores usb': ['aspirador usb', 'mini aspirador'],
    'wi-fi portatil': ['wifi portatil', 'mini roteador', 'modem 4g'],
    'carregamento universal de bateria': ['carregador universal', 'carregador de pilha'],
    'consoles de jogos domesticos': ['ps5', 'ps4', 'xbox series', 'xbox one', 'console'],
    'consoles portateis': ['nintendo switch', 'steam deck', 'gameboy', 'console portatil'],
    'acessorios para console': ['controle ps5', 'controle xbox', 'base carregadora', 'skin console'],
    'videogames': ['jogo ps5', 'jogo xbox', 'cartucho switch', 'midia fisica'],
    'acessorios para pc gaming': ['teclado gamer', 'mouse gamer', 'headset gamer', 'mousepad gamer'],
    'celulares': ['celular', 'smartphone', 'iphone', 'galaxy', 'xiaomi'],
    'tablets': ['tablet', 'ipad', 'galaxy tab'],
    'capas para tablets': ['capa tablet', 'case ipad'],
    'carregadores para tablets': ['carregador tablet', 'carregador ipad'],
    'canetas stylus': ['caneta stylus', 'apple pencil', 's pen'],
    'suportes para tablets': ['suporte tablet', 'suporte ipad'],
    'teclados para tablets': ['teclado tablet', 'teclado bluetooth ipad'],
    'protetores de tela para tablets': ['pelicula tablet', 'pelicula ipad'],
    'capas e estojos': ['capa notebook', 'case notebook', 'bolsa notebook'],
    'carregadores e adaptadores': ['fonte notebook', 'carregador notebook', 'adaptador type-c'],
    'teclados': ['teclado', 'teclado sem fio', 'teclado mecanico'],
    'suportes e bases': ['suporte notebook', 'base cooler', 'suporte monitor'],
    'pecas e acessorios': ['hub usb', 'dockstation', 'case hd'],
    'celulares recondicionados': ['iphone recondicionado', 'celular seminovo'],
    'tablets recondicionados': ['ipad recondicionado', 'tablet seminovo'],
    'computadores e acessorios recondicionados': ['notebook recondicionado', 'pc recondicionado'],
    'audio e video recondicionados': ['fone recondicionado', 'speaker recondicionado'],
    'smart devices recondicionados': ['smartwatch recondicionado', 'apple watch recondicionado'],
    'dicionarios eletronicos': ['dicionario eletronico', 'tradutor eletronico'],
    'dispositivos de aprendizagem': ['brinquedo educativo', 'tablet educativo'],
    'tablets de escrita': ['lousa magica', 'lousa digital', 'tablet de escrita'],
    'leitores digitais': ['kindle', 'kobo', 'lev', 'e-reader'],
    'canetas digitais': ['caneta digital', 'mesa digitalizadora'],
    'cadernos eletronicos': ['caderno inteligente', 'caderno digital'],

    // Infantil Specific Keys
    'infantil_bebes': ['bebe', 'bebes', 'baby', 'recem nascido', 'maternidade', 'fralda', 'mamadeira', 'chupeta', 'berco', 'carrinho de bebe', 'ninho'],
    'infantil_moda infantil': ['moda infantil', 'roupa infantil', 'vestido infantil', 'conjunto infantil', 'pijama infantil', 'camisa infantil', 'macacao', 'body', 'roupa bebe', 'pijama bebe', 'romper'],
    'infantil_calcados': ['calcado', 'sapato', 'tenis', 'sandalia', 'chinelo', 'pantufa', 'sapatinho', 'crocs infantil', 'galocha'],
    'infantil_brinquedos': ['brinquedo', 'jogos', 'boneca', 'carrinho', 'pelucia', 'lego', 'quebra cabeca', 'mordedor', 'chocalho', 'tapete de atividades'],
    'infantil_cuidados': ['cuidado', 'higiene', 'banho', 'sabonete bebe', 'shampoo bebe', 'pomada', 'lenco umedecido', 'tesourinha', 'termometro'],
    'infantil_acessorios': ['acessorio', 'laco', 'tiara', 'babador', 'mochila infantil', 'bolsa maternidade', 'copo infantil', 'pratinho', 'talher infantil'],
  };

  const currentKeywords = KEYWORD_MAP[mapKey] || KEYWORD_MAP[sub] || [sub];

  // 2. PRIORITY 1: OFFICIAL CATEGORY TAXONOMY DATA
  // Check if official category string (productCatRaw) explicitly contains the subcategory name or taxonomy terms
  const officialCategoryMatch = currentKeywords.some((kw) => catStr.includes(kw));
  if (officialCategoryMatch) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[SubcategoryFilter Debug]', {
        product: productTitleRaw,
        officialCategory: productCatRaw,
        selectedCategory: selectedCat,
        selectedSubcategory: selectedSubcat,
        matchReason: 'PRIORITY_1_OFFICIAL_CATEGORY_TAXONOMY_MATCH',
      });
    }
    return true;
  }

  // 3. PRIORITY 2: CHECK FOR CONFLICTING OFFICIAL CATEGORY DATA
  // If the product HAS a detailed official category path, check if it belongs to another subcategory of the same main category.
  const activeMainConfig = CATEGORY_CONFIG.find((c) => c.filterKey === selectedCat);
  if (activeMainConfig && catStr.length > 0) {
    for (const sib of activeMainConfig.subcategories) {
      if (sib === 'Todas' || sib === selectedSubcat) continue;
      const sibNorm = sib.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const sibKeywords = KEYWORD_MAP[sibNorm] || [sibNorm];
      const isExplicitSiblingCategory = sibKeywords.some((kw) => catStr.includes(kw));

      if (isExplicitSiblingCategory) {
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[SubcategoryFilter Debug]', {
            product: productTitleRaw,
            officialCategory: productCatRaw,
            selectedCategory: selectedCat,
            selectedSubcategory: selectedSubcat,
            rejectedReason: `PRIORITY_2_CONFLICTING_OFFICIAL_CATEGORY (Official category belongs to sibling subcategory '${sib}')`,
          });
        }
        return false; // Structured data wins over title keyword!
      }
    }
  }

  // 4. PRIORITY 3: DEFENSIVE TITLE KEYWORD FALLBACK
  // Only if official category data didn't explicitly match a sibling or this subcategory, check product title defensively.
  const titleMatch = currentKeywords.some((kw) => {
    if (kw.length <= 3) return false; // Ignore short ambiguous terms
    return titleStr.includes(kw);
  });

  if (titleMatch) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[SubcategoryFilter Debug]', {
        product: productTitleRaw,
        officialCategory: productCatRaw,
        selectedCategory: selectedCat,
        selectedSubcategory: selectedSubcat,
        matchReason: 'PRIORITY_3_DEFENSIVE_TITLE_KEYWORD_FALLBACK',
      });
    }
    return true;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[SubcategoryFilter Debug]', {
      product: productTitleRaw,
      officialCategory: productCatRaw,
      selectedCategory: selectedCat,
      selectedSubcategory: selectedSubcat,
      rejectedReason: 'NO_MATCH_OFFICIAL_OR_TITLE',
    });
  }

  return false;
}

const ClassificationIconComponent: React.FC<{ item: ClassificationItem; isActive: boolean }> = ({ item, isActive }) => {
  const [imgError, setImgError] = useState(false);
  const hasValidImage = Boolean(item.imgUrl) && !imgError;
  const isNewIcon = ['highest_commission', 'sales_24h', 'spiking', 'viral_video'].includes(item.id);

  if (hasValidImage) {
    return (
      <div
        className={`relative w-14 h-14 sm:w-16 sm:h-16 lg:w-16 lg:h-16 xl:w-20 xl:h-20 rounded-full overflow-hidden transition-all flex items-center justify-center shrink-0 border-2 ${
          isActive
            ? 'border-amber-500 bg-gradient-to-br from-amber-400/30 to-orange-400/30 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/60 scale-105'
            : 'border-slate-200 bg-slate-100 hover:border-slate-300 hover:bg-slate-200/80'
        }`}
      >
        <img
          src={item.imgUrl}
          alt={item.label}
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover transition-transform ${isNewIcon ? 'scale-[1.32]' : ''}`}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative w-14 h-14 sm:w-16 sm:h-16 lg:w-16 lg:h-16 xl:w-20 xl:h-20 rounded-full transition-all flex items-center justify-center shrink-0 border-2 ${
        isActive
          ? 'border-amber-500 bg-slate-900 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/60 scale-105'
          : 'border-slate-800 bg-slate-900/95 hover:border-amber-500/50 hover:bg-slate-900'
      }`}
    >
      <div className="text-amber-400 flex items-center justify-center [&>svg]:w-6 [&>svg]:h-6 lg:[&>svg]:w-7 lg:[&>svg]:h-7 xl:[&>svg]:w-8 xl:[&>svg]:h-8">
        {item.fallbackIcon}
      </div>
    </div>
  );
};

/* Compact Mobile Card (TikTok Shop 2-column grid style) */
const MobileProductCard: React.FC<{
  product: ProductMinerProduct;
  position?: number;
  rankingSort?: ProductRankingSort;
  isMentor?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (p: ProductMinerProduct) => void;
  onOpenDetailModal?: (p: ProductMinerProduct) => void;
  onTrackClick?: (p: ProductMinerProduct) => void;
}> = ({
  product,
  position,
  rankingSort,
  isMentor,
  isFavorite = false,
  onToggleFavorite,
  onOpenDetailModal,
  onTrackClick,
}) => {
  const targetProductUrl = getOfficialProductUrl(product);

  return (
    <article
      onClick={() => onOpenDetailModal?.(product)}
      className="group rounded-xl border border-slate-200/90 bg-white shadow-xs hover:shadow-md hover:border-amber-400/60 transition-all flex flex-col h-full relative overflow-hidden text-slate-900 cursor-pointer p-2"
    >
      {/* Product Image Container - 1:1 Aspect ratio with object-contain to prevent cropping */}
      <div className="relative aspect-square w-full rounded-lg bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center p-1">
        {/* Ranking position tag */}
        {position ? (
          <div className="absolute top-1 left-1 z-10 px-1.5 py-0.5 rounded bg-white/95 border border-amber-400/80 text-amber-800 text-[9px] font-black shadow-xs">
            #{position}
          </div>
        ) : null}

        {/* Video Associated Indicator */}
        {product.video?.url ? (
          <div className="absolute bottom-1 left-1 z-10 p-1 rounded-full bg-amber-500 text-white shadow-xs" title="Possui vídeo">
            <Play className="w-2.5 h-2.5 fill-current" />
          </div>
        ) : null}

        {/* Image */}
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <ShoppingBag className="w-8 h-8" />
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col justify-between pt-2 space-y-1">
        <div className="space-y-1">
          {/* Title - Max 2 lines */}
          <h3 className="font-bold text-[11px] text-slate-900 leading-tight line-clamp-2 min-h-[28px]">
            {product.title}
          </h3>

          {/* Vendas & Rating */}
          <div className="flex items-center justify-between gap-1 text-[10px] text-slate-600">
            <span className="font-extrabold text-amber-700 truncate">
              {compactNumber(product.soldCount)} vendidos
            </span>

            {product.rating ? (
              <span className="font-bold text-amber-600 flex items-center gap-0.5 shrink-0">
                <Star className="w-2.5 h-2.5 fill-current text-amber-400" />
                {product.rating}
              </span>
            ) : null}
          </div>

          {/* Real Commission Badge */}
          {(() => {
            const commText = getCommissionText(product);
            if (!commText) return null;
            return (
              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-black max-w-full truncate">
                {commText}
              </div>
            );
          })()}

          {/* Price */}
          {(() => {
            const range = getProductPriceRange(product.priceCents, product.currencySymbol);
            if (!range) {
              return (
                <div className="pt-0.5">
                  <span className="text-xs font-black text-emerald-700">
                    {formatMoney(product.priceCents, product.currencySymbol)}
                  </span>
                </div>
              );
            }
            return (
              <div className="pt-0.5 space-y-0.5 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60 inline-block leading-tight whitespace-nowrap">
                    Faixa estimada
                  </span>
                </div>
                <div className="text-xs font-black text-emerald-700 leading-tight whitespace-nowrap truncate">
                  {range.formattedRange}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Bottom Bar: Seller Name + Heart Favorite & Action Buttons */}
        <div className="pt-1.5 border-t border-slate-100 space-y-1.5 mt-auto">
          <div className="flex items-center justify-between gap-1 text-[10px]">
            <span className="text-[10px] text-slate-500 font-medium flex-1 min-w-0 flex items-center">
              <span className="shrink-0 mr-0.5">Loja:</span>
              <span className="truncate">{product.sellerName || 'TikTok Shop'}</span>
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite?.(product);
              }}
              className={`p-1 rounded-full transition-all shrink-0 hover:scale-110 ${
                isFavorite ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'
              }`}
              title={isFavorite ? 'Remover dos Favoritos' : 'Salvar nos Favoritos'}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current text-rose-500' : ''}`} />
            </button>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetailModal?.(product);
              }}
              className="w-full py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold border border-slate-200/80 text-xs transition-all text-center flex items-center justify-center gap-1 shadow-2xs"
            >
              Mais informações
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

/* Desktop Full Card */
const ProductCard: React.FC<{
  product: ProductMinerProduct;
  position?: number;
  rankingSort?: ProductRankingSort;
  isMentor?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (p: ProductMinerProduct) => void;
  onOpenScriptModal?: (p: ProductMinerProduct) => void;
  onOpenAnalysisModal?: (p: ProductMinerProduct) => void;
  onOpenDownloadModal?: (p: ProductMinerProduct) => void;
  onOpenDetailModal?: (p: ProductMinerProduct) => void;
  onTrackClick?: (p: ProductMinerProduct) => void;
}> = ({
  product,
  position,
  rankingSort,
  isMentor,
  isFavorite = false,
  onToggleFavorite,
  onOpenScriptModal,
  onOpenAnalysisModal,
  onOpenDownloadModal,
  onOpenDetailModal,
  onTrackClick,
}) => {
  const targetProductUrl = getOfficialProductUrl(product);
  const show24h = product.sales24h !== undefined && product.sales24h !== null;
  const show7d = product.sales7d !== undefined && product.sales7d !== null;
  const isSpikingRanking = rankingSort === 'spiking';

  return (
    <article className="group rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-amber-400/70 transition-all flex flex-col h-full text-slate-900 relative">
      <div className="relative aspect-[4/3] bg-slate-50 overflow-hidden shrink-0 border-b border-slate-100 flex items-center justify-center p-2">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite?.(product);
          }}
          className={`absolute top-2 right-2 z-20 p-2 rounded-full bg-white/90 shadow-md transition-all hover:scale-110 ${
            isFavorite ? 'text-rose-500 bg-white' : 'text-slate-400 hover:text-rose-500'
          }`}
          title={isFavorite ? 'Remover dos Favoritos' : 'Salvar nos Favoritos'}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current text-rose-500' : ''}`} />
        </button>

        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <ShoppingBag className="w-10 h-10" />
          </div>
        )}

        {position ? (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-white/95 border border-amber-400 text-amber-700 text-xs font-black shadow-sm">
            #{position}
          </div>
        ) : null}

        {isSpikingRanking && show24h ? (
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-amber-500 text-white text-[11px] font-black flex items-center gap-1 shadow-sm">
            <Flame className="w-3 h-3 fill-current" /> DISPARANDO
          </div>
        ) : product.video?.url ? (
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm">
            <Play className="w-3 h-3 fill-current text-white" /> Vídeo associado
          </div>
        ) : null}
      </div>

      <div className="p-4 space-y-3 flex-1 flex flex-col">
        {product.score !== undefined && product.score !== null ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-normal shadow-xs self-start">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-current" />
            <span>Score Geração Z Pro: <span className="text-amber-950 font-medium">{product.score}</span>/100</span>
          </div>
        ) : null}

        <h3 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2 min-h-[40px]">
          {product.title}
        </h3>

        {/* Ganho Afiliado / Comissão (se disponível) */}
        {(() => {
          const commText = getCommissionText(product);
          if (!commText) return null;
          return (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black self-start">
              {commText}
            </div>
          );
        })()}

        {/* Bloco 1: Faixa Estimada em linha única */}
        {(() => {
          const range = getProductPriceRange(product.priceCents, product.currencySymbol);
          if (!range) {
            return (
              <div className="min-w-0">
                <span className="text-lg font-black text-emerald-700 whitespace-nowrap">
                  {formatMoney(product.priceCents, product.currencySymbol)}
                </span>
              </div>
            );
          }
          return (
            <div className="min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 inline-block leading-none whitespace-nowrap">
                  Faixa estimada
                </span>
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-700 leading-tight whitespace-nowrap">
                {range.formattedRange}
              </div>
            </div>
          );
        })()}

        {/* Bloco 2: Vendas Totais + Avaliação lado a lado abaixo da faixa */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Vendas totais:</span>
            <span className="font-black text-amber-700">{compactNumber(product.soldCount)}</span>
          </div>

          {product.rating ? (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50/80 border border-amber-200/60 text-amber-800 text-xs font-extrabold shrink-0 shadow-2xs">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
              <span>{product.rating}</span>
            </div>
          ) : null}
        </div>

        {(show24h || show7d) ? (
          <div className="grid grid-cols-2 gap-2">
            <div
              className={`rounded-lg border px-2.5 py-2 ${
                rankingSort === '24h' || rankingSort === 'spiking'
                  ? 'border-emerald-300 bg-emerald-50/80'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="text-[10px] text-slate-500">≈ 24 horas</div>
              <div className="text-xs font-black text-emerald-700">
                {show24h ? `+${compactNumber(product.sales24h)}` : 'Coletando'}
              </div>
              {show24h ? (
                <div className="text-[10px] text-emerald-600">
                  {formatPercent(product.growth24hPercent)}
                </div>
              ) : null}
            </div>

            <div
              className={`rounded-lg border px-2.5 py-2 ${
                rankingSort === '7d'
                  ? 'border-amber-300 bg-amber-50/80'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="text-[10px] text-slate-500">≈ 7 dias</div>
              <div className="text-xs font-black text-slate-800">
                {show7d ? `+${compactNumber(product.sales7d)}` : 'Coletando'}
              </div>
              {show7d ? (
                <div className="text-[10px] text-amber-700 font-semibold">
                  {formatPercent(product.growth7dPercent)}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-2 text-slate-700 flex items-center gap-2 min-w-0 font-medium">
          <Store className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs text-slate-700 font-medium truncate flex-1 min-w-0" title={product.sellerName || 'TikTok Shop'}>
            <span className="text-slate-500 mr-1">Loja:</span>
            <span className="font-bold text-slate-800">{product.sellerName || 'TikTok Shop'}</span>
          </span>
        </div>

        {product.video ? (
          <div className="rounded-xl border border-amber-200/60 bg-amber-50/20 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-900 truncate">
                @{product.video.author || 'creator'}
              </span>

              {product.video.authorFollowers !== null &&
              product.video.authorFollowers !== undefined ? (
                <span className="text-[10px] text-slate-500">
                  {compactNumber(product.video.authorFollowers)} seguidores
                </span>
              ) : null}
            </div>

            <div className="grid grid-cols-5 gap-1 text-center text-[10px] text-slate-600 font-semibold">
              <span title="Views">
                <Eye className="w-3.5 h-3.5 mx-auto mb-1 text-slate-600" />
                {compactNumber(product.video.views)}
              </span>

              <span title="Likes">
                <Heart className="w-3.5 h-3.5 mx-auto mb-1 text-rose-500" />
                {compactNumber(product.video.likes)}
              </span>

              <span title="Comentários">
                <MessageCircle className="w-3.5 h-3.5 mx-auto mb-1 text-sky-600" />
                {compactNumber(product.video.comments)}
              </span>

              <span title="Compartilhamentos">
                <Share2 className="w-3.5 h-3.5 mx-auto mb-1 text-emerald-600" />
                {compactNumber(product.video.shares)}
              </span>

              <span title="Salvos">
                <Bookmark className="w-3.5 h-3.5 mx-auto mb-1 text-amber-600" />
                {compactNumber(product.video.saves)}
              </span>
            </div>

            {/* Video Action Buttons Area */}
            <div className="pt-2 border-t border-amber-200/40 space-y-1.5">
              <div className={`grid ${product.video.url ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5 text-[10px]`}>
                <button
                  type="button"
                  onClick={() => onOpenAnalysisModal?.(product)}
                  className="w-full py-1.5 px-2 rounded-lg bg-white border border-amber-200 text-slate-800 hover:bg-amber-50 font-bold flex items-center justify-center gap-1 transition-all shadow-xs"
                >
                  <BarChart3 className="w-3 h-3 text-amber-600" />
                  🔍 Analisar
                </button>

                {product.video.url ? (
                  <a
                    href={product.video.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => onTrackClick?.(product)}
                    className="w-full py-1.5 px-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-amber-900 hover:border-amber-300 font-bold flex items-center justify-center gap-1 transition-all shadow-xs"
                  >
                    <Play className="w-3 h-3 text-amber-600 fill-amber-500/20" />
                    Assistir Vídeo
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 min-h-[78px] flex items-center justify-center text-center">
            <span className="text-xs text-slate-400 font-medium">
              Sem vídeo associado
            </span>
          </div>
        )}

        <div className="flex gap-2 mt-auto pt-1">
          <button
            type="button"
            onClick={() => onOpenDetailModal?.(product)}
            className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 px-2.5 py-2 text-xs font-bold transition-all"
          >
            Detalhes
          </button>

          {targetProductUrl ? (
            <a
              href={targetProductUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => onTrackClick?.(product)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-3 py-2 text-xs font-bold shadow-sm"
            >
              Produto <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
};


function useDragToScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const isMouseDownRef = useRef(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const onMouseDown = useCallback((e: React.MouseEvent<T>) => {
    if (e.button !== 0 || !ref.current) return;
    isMouseDownRef.current = true;
    isDraggingRef.current = false;
    startXRef.current = e.pageX - ref.current.offsetLeft;
    scrollLeftRef.current = ref.current.scrollLeft;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent<T>) => {
    if (!isMouseDownRef.current || !ref.current) return;
    const x = e.pageX - ref.current.offsetLeft;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 5) {
      if (!isDraggingRef.current) {
        isDraggingRef.current = true;
        setIsDragging(true);
      }
      e.preventDefault();
      ref.current.scrollLeft = scrollLeftRef.current - walk;
    }
  }, []);

  const onMouseUp = useCallback(() => {
    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    setTimeout(() => {
      isDraggingRef.current = false;
      setIsDragging(false);
    }, 50);
  }, []);

  const onClickCapture = useCallback((e: React.MouseEvent<T>) => {
    if (isDraggingRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);

  return {
    ref,
    isDragging,
    bind: {
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave: onMouseUp,
      onClickCapture,
    },
  };
}

export const ProductMinerPage: React.FC<ProductMinerPageProps> = ({
  studentCode,
  canRefresh = false,
}) => {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<ProductMinerProduct[]>([]);
  const [ranking, setRanking] = useState<ProductMinerProduct[]>([]);
  const [rankingMeta, setRankingMeta] = useState<ProductRankingMeta | null>(null);
  const [rankingSort, setRankingSort] = useState<ProductRankingSort>('opportunities');

  const [selectedClassification, setSelectedClassification] = useState<ClassificationType | null>(null);

  const [favorites, setFavorites] = useState<ProductMinerProduct[]>(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('gzp_miner_favorites');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const toggleFavorite = (product: ProductMinerProduct) => {
    setFavorites((prev) => {
      const exists = prev.some((p) => p.productId === product.productId);
      let updated: ProductMinerProduct[];
      if (exists) {
        updated = prev.filter((p) => p.productId !== product.productId);
      } else {
        updated = [product, ...prev];
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('gzp_miner_favorites', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const isFavorited = (productId: string) => {
    return favorites.some((p) => p.productId === productId);
  };

  const [mode, setModeState] = useState<'search' | 'collector' | 'favorites'>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('gzp_miner_mode');
      if (saved === 'search' || saved === 'collector' || saved === 'favorites') {
        return saved;
      }
    }
    return 'search';
  });

  const setMode = (newMode: 'search' | 'collector' | 'favorites') => {
    setModeState(newMode);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('gzp_miner_mode', newMode);
    }
  };

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [error, setError] = useState('');

  const [credits, setCredits] = useState<{
    used: number;
    remaining: number | null;
    fromCache: boolean;
    source: ProductSearchSource;
    needsRefresh: boolean;
  } | null>(null);

  // Coletor state
  const [collectorCategories, setCollectorCategories] = useState<CollectorCategoryStat[]>([]);
  const [collectorLoading, setCollectorLoading] = useState(false);
  const [refreshingCategory, setRefreshingCategory] = useState<string | null>(null);
  const [confirmModalCategory, setConfirmModalCategory] = useState<string | null>(null);
  const [collectorNotice, setCollectorNotice] = useState<string | null>(null);

  const [isReclassifying, setIsReclassifying] = useState(false);
  const [reclassifyReport, setReclassifyReport] = useState<ReclassificationReport | null>(null);

  const handleReclassifyBase = async () => {
    setIsReclassifying(true);
    setCollectorNotice(null);
    try {
      const report = await runBaseReclassification(studentCode);
      setReclassifyReport(report);
      const stats = await fetchCollectorCategories(studentCode);
      setCollectorCategories(stats);
      setCollectorNotice(`✨ ${report.totalClassified} de ${report.totalAnalyzed} produtos foram distribuídos nas 8 categorias com sucesso (0 créditos SocialCrawl consumidos)!`);
    } catch (err: any) {
      alert(`Erro ao reclassificar base: ${err?.message || 'Falha ao reclassificar'}`);
    } finally {
      setIsReclassifying(false);
    }
  };

  // Adquirir Produtos (Collector Expansion) State
  const [collectorSubTab, setCollectorSubTab] = useState<'expand' | 'update'>('expand');
  const [expansionTargetCount, setExpansionTargetCount] = useState<number>(300);
  const [selectedExpansionCategories, setSelectedExpansionCategories] = useState<string[]>([
    'Moda',
    'Itens para Casa',
    'Eletrônicos',
    'Beleza e Cuidados Pessoais',
    'Esportes e Lazer',
    'Brinquedos e Pets',
    'Health',
  ]);
  const [selectedSubcategoriesMap, setSelectedSubcategoriesMap] = useState<Record<string, string[]>>({});
  const [openCategoryDrawers, setOpenCategoryDrawers] = useState<Record<string, boolean>>({});

  // Batch Execution Modal and Progress State
  const [showBatchConfirmModal, setShowBatchConfirmModal] = useState<boolean>(false);
  const [isBatchExecuting, setIsBatchExecuting] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{
    currentCategory: string;
    currentSubcategory?: string;
    processedCategories: number;
    totalCategories: number;
    newProductsCount: number;
    updatedProductsCount: number;
    creditsUsed: number;
  } | null>(null);
  const [batchSummaryModal, setBatchSummaryModal] = useState<{
    open: boolean;
    totalProducts: number;
    newProducts: number;
    updatedProducts: number;
    creditsUsed: number;
    categoriesProcessed: number;
  } | null>(null);

  const toggleSelectCategory = (catName: string) => {
    setSelectedExpansionCategories((prev) =>
      prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]
    );
  };

  const toggleSelectAllCategories = () => {
    const allCats = CATEGORY_CONFIG.map((c) => c.filterKey);
    if (selectedExpansionCategories.length === allCats.length) {
      setSelectedExpansionCategories([]);
    } else {
      setSelectedExpansionCategories(allCats);
    }
  };

  const toggleSelectSubcategory = (catName: string, subName: string) => {
    setSelectedSubcategoriesMap((prev) => {
      const current = prev[catName] || [];
      const updated = current.includes(subName)
        ? current.filter((s) => s !== subName)
        : [...current, subName];
      return { ...prev, [catName]: updated };
    });
  };

  const toggleCategoryDrawer = (catName: string) => {
    setOpenCategoryDrawers((prev) => ({ ...prev, [catName]: !prev[catName] }));
  };

  const handleExecuteBatchExpansion = async () => {
    setShowBatchConfirmModal(false);
    setIsBatchExecuting(true);
    setError('');
    setCollectorNotice(null);

    const categoriesToProcess = selectedExpansionCategories.length > 0
      ? selectedExpansionCategories
      : CATEGORY_CONFIG.map((c) => c.filterKey);

    let totalNewCount = 0;
    let totalCreditsUsed = 0;
    let processedCats = 0;

    for (const cat of categoriesToProcess) {
      setBatchProgress({
        currentCategory: cat,
        processedCategories: processedCats,
        totalCategories: categoriesToProcess.length,
        newProductsCount: totalNewCount,
        updatedProductsCount: 0,
        creditsUsed: totalCreditsUsed,
      });

      try {
        const selectedSubs = selectedSubcategoriesMap[cat] || [];
        if (selectedSubs.length > 0) {
          for (const sub of selectedSubs) {
            setBatchProgress((prev) => prev ? { ...prev, currentSubcategory: sub } : null);
            const res = await refreshProducts(studentCode, sub, Math.min(150, expansionTargetCount));
            totalNewCount += res.uniqueProductsCount ?? res.products?.length ?? 0;
            totalCreditsUsed += res.creditsUsed ?? 1;
          }
        } else {
          const res = await refreshProducts(studentCode, cat, expansionTargetCount);
          totalNewCount += res.uniqueProductsCount ?? res.products?.length ?? 0;
          totalCreditsUsed += res.creditsUsed ?? Math.ceil(expansionTargetCount / 30);
        }
      } catch (err: any) {
        console.warn(`[Batch Expansion Warning for ${cat}]:`, err?.message || err);
      }

      processedCats++;
    }

    setIsBatchExecuting(false);
    loadCategories();

    setBatchSummaryModal({
      open: true,
      totalProducts: totalNewCount,
      newProducts: totalNewCount,
      updatedProducts: 0,
      creditsUsed: totalCreditsUsed,
      categoriesProcessed: processedCats,
    });
  };

  // Atualização Diária da Base State
  const [dailyStatus, setDailyStatus] = useState<DailyRefreshStatus | null>(null);
  const [isDailyRefreshing, setIsDailyRefreshing] = useState(false);
  const [showDailyConfirmModal, setShowDailyConfirmModal] = useState(false);

  // Coletor multipágina
  const [selectedMaxProducts, setSelectedMaxProducts] = useState<number>(90);

  // Local Ranking Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('Todas');
  const [selectedChildCategory, setSelectedChildCategory] = useState<string>('Todas');
  const [hasVideoOnly, setHasVideoOnly] = useState<boolean>(false);
  const [viralVideoOnly, setViralVideoOnly] = useState<boolean>(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  const catDrag = useDragToScroll<HTMLDivElement>();
  const subcatDrag = useDragToScroll<HTMLDivElement>();
  const visSubDrag = useDragToScroll<HTMLDivElement>();
  const childSubDrag = useDragToScroll<HTMLDivElement>();

  const categoriesScrollRef = catDrag.ref;
  const subcatScrollRef = subcatDrag.ref;
  const visualSubScrollRef = visSubDrag.ref;
  const childSubScrollRef = childSubDrag.ref;
  const scrollContainer = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      ref.current.scrollBy({
        left: direction === 'left' ? -240 : 240,
        behavior: 'smooth',
      });
    }
  };

  const activeCategoryConfig = useMemo(
    () => CATEGORY_CONFIG.find((c) => c.filterKey === selectedCategory),
    [selectedCategory]
  );

  const availableSubcategories = useMemo(() => {
    if (!activeCategoryConfig) return ['Todas'];
    return activeCategoryConfig.subcategories;
  }, [activeCategoryConfig]);

  useEffect(() => {
    if (selectedSubcategory && selectedSubcategory !== 'Todas' && !availableSubcategories.includes(selectedSubcategory)) {
      setSelectedSubcategory('Todas');
      setSelectedChildCategory('Todas');
    }
  }, [availableSubcategories, selectedSubcategory]);

  // Ranking Pagination State
  const [rankingPage, setRankingPage] = useState<number>(1);

  // Reset ranking page and search page whenever any filter, subcategory, child category, classification, sort, or mode changes
  useEffect(() => {
    setRankingPage(1);
    setPage(1);
  }, [selectedCategory, selectedSubcategory, selectedChildCategory, hasVideoOnly, viralVideoOnly, selectedClassification, rankingSort, mode]);

  // Modals state
  const [scriptModalProduct, setScriptModalProduct] = useState<ProductMinerProduct | null>(null);
  const [analysisModalProduct, setAnalysisModalProduct] = useState<ProductMinerProduct | null>(null);
  const [detailModalProduct, setDetailModalProduct] = useState<ProductMinerProduct | null>(null);

  const handleOpenDetailModal = useCallback(
    (p: ProductMinerProduct | null) => {
      setDetailModalProduct(p);
      if (p?.productId && studentCode) {
        trackProductInteraction(studentCode, {
          productId: p.productId,
          eventType: 'product_open',
          query,
          category: selectedCategory,
          subcategory: selectedSubcategory,
          childCategory: selectedChildCategory,
        });
      }
    },
    [studentCode, query, selectedCategory, selectedSubcategory, selectedChildCategory]
  );

  const handleOpenAnalysisModal = useCallback(
    (p: ProductMinerProduct | null) => {
      setAnalysisModalProduct(p);
      if (p?.productId && studentCode) {
        trackProductInteraction(studentCode, {
          productId: p.productId,
          eventType: 'product_open',
          query,
          category: selectedCategory,
          subcategory: selectedSubcategory,
          childCategory: selectedChildCategory,
        });
      }
    },
    [studentCode, query, selectedCategory, selectedSubcategory, selectedChildCategory]
  );

  const handleTrackProductClick = useCallback(
    (p: ProductMinerProduct) => {
      if (p?.productId && studentCode) {
        trackProductInteraction(studentCode, {
          productId: p.productId,
          eventType: 'product_click',
          query,
          category: selectedCategory,
          subcategory: selectedSubcategory,
          childCategory: selectedChildCategory,
        });
      }
    },
    [studentCode, query, selectedCategory, selectedSubcategory, selectedChildCategory]
  );

  useEffect(() => {
    if (mode !== 'ranking') return;

    let active = true;
    setRankingLoading(true);

    console.log('[ProductMiner] Solicitando ranking:', {
      mode,
      rankingSort,
      selectedCategory,
      selectedClassification,
      timestamp: new Date().toISOString(),
    });

    loadProductRanking(studentCode, 150, rankingSort)
      .then((data) => {
        if (!active) return;
        setRanking(data.products || []);
        setRankingMeta(data.meta || null);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        const msg = err?.message || 'Não foi possível carregar o ranking no momento. Tente novamente.';
        console.error('[ProductMiner Ranking Error]', {
          error: msg,
          rawError: err,
          rankingSort,
          timestamp: new Date().toISOString(),
        });
        setError(msg);
      })
      .finally(() => {
        if (active) {
          setRankingLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [mode, rankingSort, studentCode]);

  /* Unified Display List applying Category Filter + Subcategory Filter + Classification Order */
  const displayProducts = useMemo(() => {
    let list = mode === 'favorites' ? favorites : products;

    if (mode === 'favorites') {
      // 0. Filter by text search query (dynamic search on current base)
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        list = list.filter((p) => {
          const titleMatch = p.title ? p.title.toLowerCase().includes(q) : false;
          const categoryMatch = p.category ? p.category.toLowerCase().includes(q) : false;
          const sellerMatch = p.sellerName ? p.sellerName.toLowerCase().includes(q) : false;
          const idMatch = p.productId ? p.productId.toLowerCase().includes(q) : false;
          return titleMatch || categoryMatch || sellerMatch || idMatch;
        });
      }

      // 1. Filter by TikTok main category
      list = list.filter((p) => matchesCategoryFilter(p.category, selectedCategory, p.title));
    }

    // 1b. Filter by subcategory (applies to search and favorites)
    if (selectedSubcategory && selectedSubcategory !== 'Todas' && selectedSubcategory !== 'Todos') {
      list = list.filter((p) => matchesSubcategoryFilter(p.category, p.title, selectedSubcategory, selectedCategory));
    }

    // 1c. Filter by third level child category
    if (selectedChildCategory && selectedChildCategory !== 'Todas' && selectedChildCategory !== 'Todos') {
      list = list.filter((p) => matchesSubcategoryFilter(p.category, p.title, selectedChildCategory, selectedCategory));
    }

    // 2. Filter by video options
    if (hasVideoOnly) {
      list = list.filter((p) => Boolean(p.video?.url));
    }
    if (viralVideoOnly) {
      list = list.filter((p) => Boolean(p.video && (p.video.views ?? 0) >= 1000000));
    }

    // 3. Sort by classification choice (ONLY when in 'favorites' mode, since in 'search' mode the database query has already returned products in the exact classification order)
    if (mode === 'favorites' && selectedClassification) {
      const copy = [...list];
      if (selectedClassification === 'best_sellers') {
        copy.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
      } else if (selectedClassification === 'top_rated') {
        copy.sort((a, b) => {
          const rateDiff = (b.rating || 0) - (a.rating || 0);
          if (Math.abs(rateDiff) > 0.01) return rateDiff;
          return (b.soldCount || 0) - (a.soldCount || 0);
        });
      } else if (selectedClassification === 'highest_commission') {
        copy.sort((a, b) => {
          const commB = b.estimatedCommissionCents ?? (b.commissionRatePercent && b.priceCents ? Math.round((b.priceCents * b.commissionRatePercent) / 100) : 0);
          const commA = a.estimatedCommissionCents ?? (a.commissionRatePercent && a.priceCents ? Math.round((a.priceCents * a.commissionRatePercent) / 100) : 0);
          const rateB = b.commissionRatePercent ?? 0;
          const rateA = a.commissionRatePercent ?? 0;
          const hasB = (commB > 0 || rateB > 0) ? 1 : 0;
          const hasA = (commA > 0 || rateA > 0) ? 1 : 0;
          if (hasB !== hasA) return hasB - hasA;
          if (commB !== commA) return commB - commA;
          if (rateB !== rateA) return rateB - rateA;
          return (b.soldCount || 0) - (a.soldCount || 0);
        });
      } else if (selectedClassification === 'sales_24h') {
        copy.sort((a, b) => (b.sales24h ?? 0) - (a.sales24h ?? 0) || (b.soldCount || 0) - (a.soldCount || 0));
      } else if (selectedClassification === 'spiking') {
        copy.sort((a, b) => (b.trendScore ?? 0) - (a.trendScore ?? 0) || (b.sales24h ?? 0) - (a.sales24h ?? 0) || (b.soldCount || 0) - (a.soldCount || 0));
      } else if (selectedClassification === 'trending') {
        copy.sort((a, b) => (b.growth24hPercent ?? 0) - (a.growth24hPercent ?? 0) || (b.sales24h ?? 0) - (a.sales24h ?? 0) || (b.soldCount || 0) - (a.soldCount || 0));
      } else if (selectedClassification === 'most_searched') {
        copy.sort((a, b) => (b.trendScore || 0) - (a.trendScore || 0) || (b.soldCount || 0) - (a.soldCount || 0));
      } else if (selectedClassification === 'editors_choice') {
        copy.sort((a, b) => {
          const scoreB = Math.log10(1 + (b.soldCount || 0)) * 20 + Math.log10(1 + (b.sales24h || 0)) * 25 + (b.rating || 4) * 10;
          const scoreA = Math.log10(1 + (a.soldCount || 0)) * 20 + Math.log10(1 + (a.sales24h || 0)) * 25 + (a.rating || 4) * 10;
          return scoreB - scoreA;
        });
      } else if (selectedClassification === 'viral_video') {
        copy.sort((a, b) => (b.video?.views ?? 0) - (a.video?.views ?? 0) || (b.soldCount || 0) - (a.soldCount || 0));
      }
      return copy;
    }

    return list;
  }, [products, ranking, favorites, mode, selectedCategory, selectedSubcategory, selectedChildCategory, hasVideoOnly, viralVideoOnly, selectedClassification, query]);

  const totalRankingPages = useMemo(() => {
    if (mode !== 'ranking') return 1;
    return Math.max(1, Math.ceil(displayProducts.length / 30));
  }, [displayProducts.length, mode]);

  const safeRankingPage = useMemo(() => {
    if (rankingPage > totalRankingPages) return 1;
    return Math.max(1, rankingPage);
  }, [rankingPage, totalRankingPages]);

  useEffect(() => {
    if (rankingPage > totalRankingPages) {
      setRankingPage(1);
    }
  }, [rankingPage, totalRankingPages]);

  const currentRenderProducts = displayProducts;

  const loadDailyStatus = async () => {
    if (!canRefresh) return;
    try {
      const st = await fetchDailyRefreshStatus(studentCode);
      setDailyStatus(st);
      if (st?.isCurrentlyRunning) {
        setIsDailyRefreshing(true);
      } else {
        setIsDailyRefreshing(false);
      }
    } catch {
      // ignore
    }
  };

  const loadCategories = () => {
    if (!canRefresh) return;

    setCollectorLoading(true);

    fetchCollectorCategories(studentCode)
      .then((cats) => setCollectorCategories(cats))
      .catch((err) => setError(err?.message || 'Falha ao carregar categorias do coletor.'))
      .finally(() => setCollectorLoading(false));

    loadDailyStatus();
  };

  useEffect(() => {
    if (mode === 'collector' && canRefresh) {
      loadCategories();
    }
  }, [mode, canRefresh, studentCode]);

  useEffect(() => {
    if (!isDailyRefreshing || !canRefresh) return;
    const interval = setInterval(() => {
      loadDailyStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [isDailyRefreshing, canRefresh, studentCode]);

  const handleStartDailyRefresh = async () => {
    setShowDailyConfirmModal(false);
    setIsDailyRefreshing(true);
    setError('');
    setCollectorNotice(null);

    try {
      const result = await runDailyRefresh(studentCode, false);
      setDailyStatus(result);
      setIsDailyRefreshing(false);

      if (result.status === 'cooldown') {
        setCollectorNotice('Base já atualizada nas últimas 24 horas. Nenhuma nova consulta foi realizada.');
      } else {
        const notice = `Atualização Diária concluída! ${result.categoriesProcessed} de ${result.totalCategories} categorias processadas (${result.uniqueProductsCount} produtos únicos, ${result.creditsUsed} créditos utilizados).`;
        setCollectorNotice(notice);
      }
      loadCategories();
    } catch (err: any) {
      setIsDailyRefreshing(false);
      setError(err?.message || 'Falha ao executar atualização diária da base.');
      loadDailyStatus();
    }
  };

  const handleConfirmCategoryCollect = async () => {
    if (!confirmModalCategory) return;

    const cat = confirmModalCategory;

    setRefreshingCategory(cat);
    setError('');
    setCollectorNotice(null);

    try {
      const res = await refreshProducts(
        studentCode,
        cat,
        selectedMaxProducts,
      );

      const count =
        res.uniqueProductsCount ??
        res.products?.length ??
        0;

      const pages =
        res.pagesConsulted ??
        Math.ceil(selectedMaxProducts / 30);

      const creditsUsed =
        res.creditsUsed ??
        pages;

      let notice =
        `Coleta concluída para ${cat}! ` +
        `${count} produtos únicos coletados em ${pages} ` +
        `${pages === 1 ? 'página' : 'páginas'} ` +
        `(${creditsUsed} ${creditsUsed === 1 ? 'crédito utilizado' : 'créditos utilizados'}).`;

      if (res.partialError) {
        notice += ` (Aviso: ${res.partialError})`;
      }

      setCollectorNotice(notice);
      setConfirmModalCategory(null);
      loadCategories();
    } catch (err: any) {
      setError(
        err?.message ||
          `Falha ao coletar produtos da categoria ${cat}.`,
      );
    } finally {
      setRefreshingCategory(null);
    }
  };

  const runSearch = async (
    targetQuery = query,
    targetPage = page,
    refresh = false,
    targetCategory = selectedCategory,
    targetSubcategory = selectedSubcategory,
    targetChildCategory = selectedChildCategory,
    targetClassification = selectedClassification
  ) => {
    const clean = targetQuery.trim();

    if (clean.length === 1) return;

    setMode('search');
    setLoading(true);
    setError('');

    try {
      const data = refresh
        ? await refreshProducts(studentCode, clean, targetPage)
        : await searchProducts(
            studentCode,
            clean,
            targetPage,
            targetCategory,
            targetSubcategory,
            targetChildCategory,
            targetClassification
          );

      setQuery(clean);
      setProducts(data.products || []);
      setPage(targetPage);
      setHasMore(Boolean(data.hasMore));

      setCredits({
        used: data.creditsUsed,
        remaining: data.creditsRemaining,
        fromCache: data.fromCache,
        source: data.source,
        needsRefresh: Boolean(data.needsRefresh),
      });
    } catch (err: any) {
      setError(
        err?.message ||
          'Não foi possível buscar produtos agora.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'search') {
      runSearch(
        query,
        page,
        false,
        selectedCategory,
        selectedSubcategory,
        selectedChildCategory,
        selectedClassification
      );
    }
  }, [mode, selectedCategory, selectedSubcategory, selectedChildCategory, selectedClassification, page]);

  const activeFilterCount =
    (selectedCategory !== 'Todos' ? 1 : 0) +
    (selectedSubcategory !== 'Todas' ? 1 : 0) +
    (hasVideoOnly ? 1 : 0) +
    (viralVideoOnly ? 1 : 0);

  return (
    <section className="space-y-2 sm:space-y-4 pb-12 rounded-2xl sm:rounded-3xl bg-slate-50 border border-slate-200/80 p-3 sm:p-6 shadow-xl text-slate-900 transition-all">
      {/* ================================================== */}
      {/* 1 — CLASSIFICAÇÕES DE PRODUTOS (9 CLASSIFICATIONS)  */}
      {/* ================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm md:text-base font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
            Classificações de Produtos
          </span>
        </div>

        {/* Horizontal scrollable row on mobile/tablet, 9-column full-width grid on desktop */}
        <div
          className="w-full overflow-x-auto lg:overflow-x-visible overflow-y-hidden scrollbar-none pb-2 pt-1"
          onWheel={(e) => {
            if (e.deltaY !== 0 && e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
        >
          <div className="flex w-max min-w-max items-start gap-3 sm:gap-4 pr-6 lg:pr-0 lg:w-full lg:min-w-0 lg:grid lg:grid-cols-9 lg:gap-2 lg:justify-items-center">
            {CLASSIFICATIONS.map((c) => {
              const isActive = selectedClassification === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    if (selectedClassification === c.id) {
                      setSelectedClassification(null);
                    } else {
                      setSelectedClassification(c.id);
                    }
                    setMode('search');
                    setPage(1);
                  }}
                  className="flex flex-col items-center shrink-0 w-[80px] sm:w-[92px] lg:w-full group focus:outline-none"
                >
                  <ClassificationIconComponent item={c} isActive={isActive} />
                  <span
                    className={`text-[11px] sm:text-xs lg:text-xs xl:text-sm font-bold text-center mt-1.5 lg:mt-2 leading-tight max-w-[84px] sm:max-w-[92px] lg:max-w-none transition-colors ${
                      isActive ? 'text-amber-700 font-black' : 'text-slate-600 group-hover:text-slate-900'
                    }`}
                  >
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 2 — CATEGORIAS E SUBCATEGORIAS TIKTOK SHOP          */}
      {/* ================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs md:text-sm font-bold text-slate-600">Categorias:</span>
          {selectedCategory && selectedCategory !== 'Todos' ? (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('Todos');
                setSelectedSubcategory('Todas');
              }}
              className="text-[10px] sm:text-xs font-bold text-rose-600 hover:underline"
            >
              Limpar filtro
            </button>
          ) : null}
        </div>

        {/* Categories Icon Cards Bar */}
        <div className="relative group/catnav pt-2.5 pb-1">
          {/* Desktop Scroll Left Arrow */}
          <button
            type="button"
            onClick={() => scrollContainer(categoriesScrollRef, 'left')}
            className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-amber-600 hover:border-amber-400 shadow-md items-center justify-center transition-all opacity-90 hover:opacity-100"
            title="Rolar categorias para esquerda"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={categoriesScrollRef}
            {...catDrag.bind}
            className={`w-full min-w-0 overflow-x-auto overflow-y-hidden scrollbar-none pb-2 pt-1 touch-pan-x select-none ${
              catDrag.isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            onWheel={(e) => {
              if (e.deltaY !== 0 && e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
          >
            <div className="flex w-max min-w-max items-start gap-3 sm:gap-4 md:gap-5 px-0 md:px-10 flex-nowrap pt-1.5">
              {CATEGORY_CONFIG.map((cat) => {
                const isActive = selectedCategory === cat.filterKey;
                return (
                  <button
                    key={cat.filterKey}
                    type="button"
                    onClick={() => {
                      if (isActive) {
                        setSelectedCategory('Todos');
                        setSelectedSubcategory('Todas');
                        setSelectedChildCategory('Todas');
                      } else {
                        setSelectedCategory(cat.filterKey);
                        setSelectedSubcategory('Todas');
                        setSelectedChildCategory('Todas');
                      }
                    }}
                    className="flex flex-col items-center shrink-0 w-[82px] sm:w-[92px] md:w-[100px] group focus:outline-none"
                  >
                    <div
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 md:w-20 md:h-20 lg:w-20 lg:h-20 rounded-2xl overflow-hidden transition-all flex items-center justify-center shrink-0 border-2 p-1.5 ${
                        isActive
                          ? 'border-amber-500 bg-amber-50/90 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/60 scale-105'
                          : 'border-slate-200 bg-slate-50 group-hover:border-amber-300 group-hover:bg-amber-50/40'
                      }`}
                    >
                      {cat.imageUrl ? (
                        <img
                          src={cat.imageUrl}
                          alt={cat.label}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain transition-transform group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="text-slate-400 font-bold text-xs">{cat.label.slice(0, 2)}</div>
                      )}
                    </div>

                    <span
                      className={`text-[11px] sm:text-xs md:text-xs font-bold text-center mt-1.5 leading-tight max-w-[82px] sm:max-w-[92px] md:max-w-[100px] line-clamp-2 transition-colors ${
                        isActive ? 'text-amber-700 font-black' : 'text-slate-600 group-hover:text-slate-900'
                      }`}
                    >
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop Scroll Right Arrow */}
          <button
            type="button"
            onClick={() => scrollContainer(categoriesScrollRef, 'right')}
            className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-amber-600 hover:border-amber-400 shadow-md items-center justify-center transition-all opacity-90 hover:opacity-100"
            title="Rolar categorias para direita"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Subcategories Horizontal Scroll Row (Renders when a main category is selected) */}
        {activeCategoryConfig ? (
          activeCategoryConfig.visualSubcategories && activeCategoryConfig.visualSubcategories.length > 0 ? (
            <div className="pt-2 border-t border-slate-100 space-y-2 animate-fade-in">
              {/* Level 2 Header */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs md:text-xs font-bold uppercase tracking-wider text-slate-500">
                  Subcategorias de <span className="font-black text-slate-800">{activeCategoryConfig.label}</span>:
                </span>
                {selectedSubcategory && selectedSubcategory !== 'Todas' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubcategory('Todas');
                      setSelectedChildCategory('Todas');
                    }}
                    className="text-[10px] sm:text-xs font-bold text-amber-700 hover:underline"
                  >
                    Ver todas
                  </button>
                ) : null}
              </div>

              {/* Level 2 Visual Cards Strip */}
              {(() => {
                const subCount = activeCategoryConfig.visualSubcategories.length;
                const showDesktopArrows = subCount > 10;
                const arrowClass = showDesktopArrows ? 'flex' : 'flex md:hidden';

                return (
                  <div className="relative group/subnav py-1">
                    {/* Scroll Left Arrow */}
                    <button
                      type="button"
                      onClick={() => scrollContainer(visualSubScrollRef, 'left')}
                      className={`${arrowClass} absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-amber-600 hover:border-amber-400 shadow-md items-center justify-center transition-all opacity-90 hover:opacity-100`}
                      title="Rolar para esquerda"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div
                      ref={visualSubScrollRef}
                      {...visSubDrag.bind}
                      className={`w-full min-w-0 overflow-x-auto overflow-y-hidden scrollbar-none pb-2 pt-1 touch-pan-x select-none ${
                        visSubDrag.isDragging ? 'cursor-grabbing' : 'cursor-grab'
                      }`}
                      onWheel={(e) => {
                        if (e.deltaY !== 0 && e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
                          e.currentTarget.scrollLeft += e.deltaY;
                        }
                      }}
                    >
                      <div
                        className={`flex w-max min-w-max items-start gap-3 sm:gap-4 flex-nowrap pt-1 ${
                          showDesktopArrows
                            ? 'px-8 sm:px-10'
                            : 'px-8 sm:px-10 md:px-0 md:w-auto md:min-w-0 md:justify-start md:gap-5 lg:gap-6'
                        }`}
                      >
                        {activeCategoryConfig.visualSubcategories.map((sub) => {
                          const isSubActive = selectedSubcategory === sub.name;
                          return (
                            <button
                              key={sub.name}
                              type="button"
                              onClick={() => {
                                if (isSubActive) {
                                  setSelectedSubcategory('Todas');
                                  setSelectedChildCategory('Todas');
                                } else {
                                  setSelectedSubcategory(sub.name);
                                  setSelectedChildCategory('Todas');
                                }
                              }}
                              className="flex flex-col items-center shrink-0 w-[78px] sm:w-[92px] group focus:outline-none"
                            >
                              <div
                                className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden transition-all flex items-center justify-center shrink-0 border-2 ${
                                  isSubActive
                                    ? 'border-amber-500 bg-amber-50/90 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/60 scale-105'
                                    : 'border-slate-200 bg-slate-50 group-hover:border-amber-300 group-hover:bg-amber-50/40'
                                }`}
                              >
                                <img
                                  src={sub.imageUrl}
                                  alt={sub.name}
                                  referrerPolicy="no-referrer"
                                  className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${sub.imageClass || ''}`}
                                  loading="lazy"
                                  decoding="async"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              </div>

                              <span
                                className={`text-[10px] sm:text-xs font-bold text-center mt-1.5 leading-tight max-w-[78px] sm:max-w-[92px] line-clamp-2 transition-colors ${
                                  isSubActive ? 'text-amber-700 font-black' : 'text-slate-600 group-hover:text-slate-900'
                                }`}
                              >
                                {sub.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Scroll Right Arrow */}
                    <button
                      type="button"
                      onClick={() => scrollContainer(visualSubScrollRef, 'right')}
                      className={`${arrowClass} absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-amber-600 hover:border-amber-400 shadow-md items-center justify-center transition-all opacity-90 hover:opacity-100`}
                      title="Rolar para direita"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })()}

              {/* Level 3 Text-Only Chips Bar */}
              {(() => {
                if (selectedSubcategory === 'Todas') return null;
                const activeVisualSub = activeCategoryConfig.visualSubcategories.find((v) => v.name === selectedSubcategory);
                if (!activeVisualSub || !activeVisualSub.childCategories) return null;
                const nonTodasChildren = activeVisualSub.childCategories.filter((c) => c !== 'Todas');
                if (nonTodasChildren.length === 0) return null;

                return (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] sm:text-xs md:text-xs font-bold uppercase tracking-wider text-slate-500">
                        Filtrar <span className="font-black text-slate-800">{activeVisualSub.name}</span>:
                      </span>
                      {selectedChildCategory && selectedChildCategory !== 'Todas' ? (
                        <button
                          type="button"
                          onClick={() => setSelectedChildCategory('Todas')}
                          className="text-[10px] sm:text-xs font-bold text-amber-700 hover:underline"
                        >
                          Limpar filtro de {activeVisualSub.name}
                        </button>
                      ) : null}
                    </div>

                    <div className="relative group/childnav">
                      {/* Desktop Scroll Left Arrow */}
                      <button
                        type="button"
                        onClick={() => scrollContainer(childSubScrollRef, 'left')}
                        className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-amber-600 hover:border-amber-400 shadow-md items-center justify-center transition-all opacity-90 hover:opacity-100"
                        title="Rolar para esquerda"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      <div
                        ref={childSubScrollRef}
                        {...childSubDrag.bind}
                        className={`w-full min-w-0 overflow-x-auto overflow-y-hidden scrollbar-none pb-1 touch-pan-x select-none ${
                          childSubDrag.isDragging ? 'cursor-grabbing' : 'cursor-grab'
                        }`}
                        onWheel={(e) => {
                          if (e.deltaY !== 0 && e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
                            e.currentTarget.scrollLeft += e.deltaY;
                          }
                        }}
                      >
                        <div className="flex w-max min-w-max items-center gap-1.5 px-8 sm:px-10 flex-nowrap">
                          {activeVisualSub.childCategories.map((chip) => {
                            const isChildActive = selectedChildCategory === chip;
                            return (
                              <button
                                key={chip}
                                type="button"
                                onClick={() => setSelectedChildCategory(chip)}
                                className={`px-3 py-1 rounded-lg text-xs sm:text-xs md:text-sm font-bold shrink-0 border transition-all whitespace-nowrap ${
                                  isChildActive
                                    ? 'border-amber-500 bg-amber-500/15 text-amber-900 font-black shadow-xs ring-1 ring-amber-400/50'
                                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300'
                                }`}
                              >
                                {chip}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Desktop Scroll Right Arrow */}
                      <button
                        type="button"
                        onClick={() => scrollContainer(childSubScrollRef, 'right')}
                        className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-amber-600 hover:border-amber-400 shadow-md items-center justify-center transition-all opacity-90 hover:opacity-100"
                        title="Rolar para direita"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-100 space-y-1.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs md:text-xs font-bold uppercase tracking-wider text-slate-500">
                  Subcategorias de <span className="font-black text-slate-800">{activeCategoryConfig.label}</span>:
                </span>
                {selectedSubcategory && selectedSubcategory !== 'Todas' ? (
                  <button
                    type="button"
                    onClick={() => setSelectedSubcategory('Todas')}
                    className="text-[10px] sm:text-xs font-bold text-amber-700 hover:underline"
                  >
                    Ver todas
                  </button>
                ) : null}
              </div>
              <div className="relative group/subnav">
                {/* Desktop Scroll Left Arrow */}
                <button
                  type="button"
                  onClick={() => scrollContainer(subcatScrollRef, 'left')}
                  className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-amber-600 hover:border-amber-400 shadow-md items-center justify-center transition-all opacity-90 hover:opacity-100"
                  title="Rolar para esquerda"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div
                  ref={subcatScrollRef}
                  {...subcatDrag.bind}
                  className={`w-full min-w-0 overflow-x-auto overflow-y-hidden scrollbar-none pb-1 touch-pan-x select-none ${
                    subcatDrag.isDragging ? 'cursor-grabbing' : 'cursor-grab'
                  }`}
                  onWheel={(e) => {
                    if (e.deltaY !== 0 && e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
                      e.currentTarget.scrollLeft += e.deltaY;
                    }
                  }}
                >
                  <div className="flex w-max min-w-max items-center gap-1.5 px-8 sm:px-10 flex-nowrap">
                    {availableSubcategories.map((subcat) => {
                      const isSubActive = selectedSubcategory === subcat;
                      return (
                        <button
                          key={subcat}
                          type="button"
                          onClick={() => setSelectedSubcategory(subcat)}
                          className={`px-3 py-1 rounded-lg text-xs sm:text-xs md:text-sm font-bold shrink-0 border transition-all whitespace-nowrap ${
                            isSubActive
                              ? 'border-amber-500 bg-amber-500/15 text-amber-900 font-black shadow-xs ring-1 ring-amber-400/50'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          {subcat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Desktop Scroll Right Arrow */}
                <button
                  type="button"
                  onClick={() => scrollContainer(subcatScrollRef, 'right')}
                  className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-amber-600 hover:border-amber-400 shadow-md items-center justify-center transition-all opacity-90 hover:opacity-100"
                  title="Rolar para direita"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        ) : null}
      </div>

      {/* ================================================== */}
      {/* 3 — MODES & ADVANCED FILTERS BAR                   */}
      {/* ================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Superior group: Pesquisa & Meus Favoritos */}
        <div className="inline-flex p-1 rounded-xl border border-slate-200 bg-white shadow-xs self-start items-center gap-1">
          <button
            onClick={() => setMode('search')}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              mode === 'search'
                ? 'bg-amber-500/15 text-amber-800 font-black border border-amber-300/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Pesquisa
          </button>

          <button
            onClick={() => setMode('favorites')}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              mode === 'favorites'
                ? 'bg-rose-500/15 text-rose-800 font-black border border-rose-300/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${favorites.length > 0 ? 'text-rose-500 fill-current' : 'text-slate-500'}`} />
            Meus Favoritos
            {favorites.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-black">
                {favorites.length}
              </span>
            )}
          </button>
        </div>

        {/* Action group: Filtros Avançados & Adquirir Produtos */}
        <div className="flex flex-row items-center gap-2 flex-nowrap">
          {/* Advanced Filters Toggle Button */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl border text-xs sm:text-xs md:text-sm font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0 whitespace-nowrap ${
              showAdvancedFilters || activeFilterCount > 0
                ? 'border-amber-400 bg-amber-50 text-amber-800 font-black'
                : 'border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtros Avançados</span>
            {activeFilterCount > 0 ? (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            ) : null}
            {showAdvancedFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {canRefresh ? (
            <button
              type="button"
              onClick={() => setMode('collector')}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl border text-xs sm:text-xs md:text-sm font-bold flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0 whitespace-nowrap ${
                mode === 'collector'
                  ? 'bg-amber-500/15 text-amber-800 font-black border border-amber-300/60'
                  : 'border-slate-200 bg-white text-slate-700 hover:text-slate-900 hover:border-amber-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>Adquirir Produtos</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* ================================================== */}
      {/* 4 — CAMPO DE PESQUISA (SOMENTE NA ABA PESQUISA)     */}
      {/* ================================================== */}
      {mode === 'search' && (
        <div className="relative w-full animate-fade-in">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                runSearch(query, 1, false);
              }
            }}
            placeholder="Pesquisar produtos..."
            className="w-full h-10 sm:h-11 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 pl-10 pr-10 text-xs sm:text-sm text-slate-900 outline-none shadow-xs transition-all"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              title="Limpar pesquisa"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      )}

      {/* Advanced Filters Drawer Panel */}
      {showAdvancedFilters ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-md animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-amber-500" /> Filtros de Vídeo e Desempenho
            </span>
            <button
              onClick={() => {
                setSelectedCategory('Todos');
                setSelectedSubcategory('Todas');
                setHasVideoOnly(false);
                setViralVideoOnly(false);
                if (rankingSort === '7d') setRankingSort('opportunities');
              }}
              className="text-[11px] text-rose-600 hover:underline font-bold"
            >
              Limpar Filtros
            </button>
          </div>

          <div className="flex gap-2 flex-wrap pt-1">
            <button
              type="button"
              onClick={() => setHasVideoOnly((p) => !p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                hasVideoOnly
                  ? 'border-amber-400 bg-amber-50 text-amber-900 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Play className="w-3 h-3 text-amber-600 fill-current" />
              Apenas com vídeo
            </button>

            <button
              type="button"
              onClick={() => setViralVideoOnly((p) => !p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                viralVideoOnly
                  ? 'border-amber-400 bg-amber-50 text-amber-900 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Flame className="w-3 h-3 text-amber-500 fill-current" />
              Vídeo viral (1M+ views)
            </button>

            <button
              type="button"
              onClick={() => {
                if (rankingSort === '7d') {
                  setRankingSort('opportunities');
                } else {
                  setRankingSort('7d');
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                rankingSort === '7d'
                  ? 'border-amber-400 bg-amber-50 text-amber-900 shadow-xs'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <TrendingUp className="w-3 h-3 text-amber-600" />
              Vendas 7 dias
            </button>
          </div>
        </div>
      ) : null}

      {/* ================================================== */}
      {/* 4 — LISTA / FEED DE PRODUTOS                       */}
      {/* ================================================== */}
      {mode === 'search' || mode === 'favorites' ? (
        <>
          {(loading || rankingLoading) ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : null}

          {/* Banner discreto para aviso de falha de atualização quando já existem produtos armazenados */}
          {error && displayProducts.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 flex items-center justify-between gap-3 shadow-sm mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Exibindo dados em cache. {error.includes('_') ? 'Não foi possível atualizar o ranking agora.' : error}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  if (mode === 'ranking') {
                    setRankingLoading(true);
                    loadProductRanking(studentCode, 150, rankingSort)
                      .then((data) => {
                        setRanking(data.products || []);
                        setRankingMeta(data.meta || null);
                      })
                      .catch((err) => setError(err?.message || 'Não foi possível carregar o ranking.'))
                      .finally(() => setRankingLoading(false));
                  } else {
                    runSearch(query, page, false);
                  }
                }}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 font-bold transition-all text-[11px]"
              >
                Tentar atualizar
              </button>
            </div>
          ) : null}

          {/* Estado de Falha Real sem Produtos */}
          {!(loading || rankingLoading) && error && displayProducts.length === 0 ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 py-12 px-5 text-center space-y-3 my-4">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <h2 className="font-bold text-rose-900 text-base">
                Não foi possível carregar os produtos agora.
              </h2>
              <p className="text-xs text-rose-700 max-w-md mx-auto">
                {error.includes('_') ? 'Tente novamente em alguns instantes.' : error}
              </p>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  if (mode === 'ranking') {
                    setRankingLoading(true);
                    loadProductRanking(studentCode, 150, rankingSort)
                      .then((data) => {
                        setRanking(data.products || []);
                        setRankingMeta(data.meta || null);
                      })
                      .catch((err) => setError(err?.message || 'Não foi possível carregar o ranking agora. Tente novamente.'))
                      .finally(() => setRankingLoading(false));
                  } else {
                    runSearch(query, page, false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Tentar novamente
              </button>
            </div>
          ) : null}

          {/* Estado de Meus Favoritos Vazio */}
          {mode === 'favorites' && displayProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-rose-300 bg-rose-50/40 py-16 px-5 text-center space-y-2">
              <Heart className="w-10 h-10 text-rose-400 mx-auto" />
              <h2 className="font-bold text-slate-800 text-base">
                Você ainda não possui produtos em Meus Favoritos.
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Navegue pela Pesquisa e clique no ícone de coração nos cards dos produtos para salvá-los aqui para fácil acesso posterior.
              </p>
            </div>
          ) : null}

          {/* Estado de Lista Vazia por Filtros (Somente quando NÃO houver Erro) */}
          {mode !== 'favorites' && !(loading || rankingLoading) && !error && displayProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 px-5 text-center space-y-2">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
              <h2 className="font-bold text-slate-700">
                Nenhum produto encontrado com os filtros atuais.
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Tente selecionar outra categoria ou classificação, ou realize uma pesquisa diferente no campo acima.
              </p>
              {(selectedCategory !== 'Todos' || selectedSubcategory !== 'Todas' || hasVideoOnly || viralVideoOnly) ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('Todos');
                    setSelectedSubcategory('Todas');
                    setHasVideoOnly(false);
                    setViralVideoOnly(false);
                  }}
                  className="mt-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold"
                >
                  Remover Filtros
                </button>
              ) : null}
            </div>
          ) : null}

          {!(loading || rankingLoading) && displayProducts.length > 0 ? (
            <>
              {/* Mobile View: 2-Column Grid (TikTok Shop style) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:hidden items-stretch">
                {currentRenderProducts.map((product, index) => {
                  const globalPos = index + 1;
                  return (
                    <MobileProductCard
                      key={product.productId}
                      product={product}
                      position={globalPos}
                      rankingSort={rankingSort}
                      isMentor={canRefresh}
                      isFavorite={isFavorited(product.productId)}
                      onToggleFavorite={toggleFavorite}
                      onOpenDetailModal={handleOpenDetailModal}
                      onTrackClick={handleTrackProductClick}
                    />
                  );
                })}
              </div>

              {/* Desktop View: Full Rich Grid */}
              <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {currentRenderProducts.map((product, index) => {
                  const globalPos = index + 1;
                  return (
                    <ProductCard
                      key={product.productId}
                      product={product}
                      position={globalPos}
                      rankingSort={rankingSort}
                      isMentor={canRefresh}
                      isFavorite={isFavorited(product.productId)}
                      onToggleFavorite={toggleFavorite}
                      onOpenScriptModal={(p) => setScriptModalProduct(p)}
                      onOpenAnalysisModal={handleOpenAnalysisModal}
                      onOpenDetailModal={handleOpenDetailModal}
                      onTrackClick={handleTrackProductClick}
                    />
                  );
                })}
              </div>

              {/* Pagination controls for Search mode */}
              {mode === 'search' ? (
                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    disabled={page <= 1}
                    onClick={() => {
                      runSearch(query, page - 1, false);
                      window.scrollTo({ top: 350, behavior: 'smooth' });
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 shadow-sm transition-all"
                  >
                    Anterior
                  </button>

                  <span className="text-xs text-slate-600 font-semibold bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm">
                    Página {page}
                  </span>

                  <button
                    disabled={!hasMore}
                    onClick={() => {
                      runSearch(query, page + 1, false);
                      window.scrollTo({ top: 350, behavior: 'smooth' });
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 shadow-sm transition-all"
                  >
                    Próxima
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </>
      ) : mode === 'collector' && canRefresh ? (
        /* PAINEL ADQUIRIR PRODUTOS (BASE GERAÇÃO Z PRO) */
        <div className="space-y-6">
          {/* Main Top Control Header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-amber-700 text-xs font-black uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Módulo Mentor • Gestão de Base
                </div>

                <h2 className="mt-1 text-xl md:text-2xl font-black text-slate-900">
                  Adquirir Produtos — Base de Inteligência
                </h2>

                <p className="mt-1 text-xs md:text-sm text-slate-600 max-w-2xl">
                  Expanda a cobertura por subcategoria ou execute a reciclagem contínua dos produtos do Geração Z Pro. Alunos consultam esta base sem consumir seus próprios créditos.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs shrink-0">
                <span className="px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 font-extrabold flex items-center gap-1.5 shadow-sm">
                  <Layers className="w-4 h-4 text-amber-600" />
                  {CATEGORY_CONFIG.length} Categorias do Minerador
                </span>
              </div>
            </div>

            {/* Mode Switcher: Expandir Base vs Atualizar Base */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCollectorSubTab('expand')}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
                  collectorSubTab === 'expand'
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Rocket className="w-4 h-4" />
                <span>🚀 Expandir Base (Captar Novos Produtos)</span>
              </button>

              <button
                type="button"
                onClick={() => setCollectorSubTab('update')}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
                  collectorSubTab === 'update'
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                <span>🔄 Atualizar Base (Reciclar {CATEGORY_CONFIG.length} Categorias)</span>
              </button>
            </div>
          </div>

          {/* TAB 1: EXPANDIR BASE */}
          {collectorSubTab === 'expand' && (
            <div className="space-y-5 animate-fade-in">
              {/* Reclassify Existing Base Banner (Mentor Tool - Zero SocialCrawl Credits) */}
              <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
                    <Database className="w-4 h-4 text-amber-600" />
                    <span>Organização Automática da Base Existente (~1.495 produtos)</span>
                  </div>
                  <p className="text-xs text-amber-800/80 mt-1 max-w-2xl">
                    Sua base possui produtos armazenados no MySQL. Clique para reclassificá-los e distribuí-los automaticamente entre as {CATEGORY_CONFIG.length} categorias e subcategorias sem chamar o SocialCrawl (<strong>0 créditos consumidos</strong>).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleReclassifyBase}
                  disabled={isReclassifying || isBatchExecuting || isDailyRefreshing}
                  className="px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-600/20 shrink-0 transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  {isReclassifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Classificando base...</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4" />
                      <span>📦 Reclassificar Base Existente</span>
                    </>
                  )}
                </button>
              </div>

              {reclassifyReport && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-2 animate-fade-in text-xs text-emerald-950 shadow-sm">
                  <div className="flex items-center justify-between font-black text-emerald-900 text-sm">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                      Relatório de Reclassificação da Base
                    </span>
                    <button
                      type="button"
                      onClick={() => setReclassifyReport(null)}
                      className="text-emerald-700 hover:text-emerald-950 font-extrabold text-xs px-2 py-1 rounded-lg hover:bg-emerald-100"
                    >
                      ✕ Fechar
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-emerald-200/80 font-medium">
                    <div className="bg-white/80 p-2 rounded-xl border border-emerald-200">
                      <div className="text-[10px] text-emerald-700 font-bold">Total Analisado</div>
                      <div className="font-black text-slate-900 text-sm">{reclassifyReport.totalAnalyzed} prods</div>
                    </div>

                    <div className="bg-white/80 p-2 rounded-xl border border-emerald-200">
                      <div className="text-[10px] text-emerald-700 font-bold">Classificados com Sucesso</div>
                      <div className="font-black text-emerald-800 text-sm">{reclassifyReport.totalClassified} prods</div>
                    </div>

                    <div className="bg-white/80 p-2 rounded-xl border border-emerald-200">
                      <div className="text-[10px] text-emerald-700 font-bold">Chamada SocialCrawl</div>
                      <div className="font-black text-emerald-800 text-sm">NÃO (0 créditos)</div>
                    </div>

                    <div className="bg-white/80 p-2 rounded-xl border border-emerald-200">
                      <div className="text-[10px] text-emerald-700 font-bold">Distribuição por Categoria</div>
                      <div className="font-extrabold text-slate-800 text-[11px] truncate">
                        {Object.keys(reclassifyReport.categoryCounts).length} categorias
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Card 1: Volume Target Selection */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-600" /> 1. Meta de Expansão por Categoria
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Escolha a profundidade de busca (múltiplas páginas por categoria)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { count: 100, label: '100 produtos', desc: '~4 págs / 20 crs por cat', tag: 'Rápido' },
                    { count: 300, label: '300 produtos', desc: '~10 págs / 50 crs por cat', tag: '✨ Recomendado' },
                    { count: 500, label: '500 produtos', desc: '~17 págs / 85 crs por cat', tag: 'Aprofundado' },
                    { count: 1000, label: '1.000 produtos', desc: '~34 págs / 170 crs por cat', tag: 'Avançado' },
                  ].map((opt) => (
                    <button
                      key={opt.count}
                      type="button"
                      onClick={() => setExpansionTargetCount(opt.count)}
                      disabled={isBatchExecuting || isDailyRefreshing}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        expansionTargetCount === opt.count
                          ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-400/30 text-amber-950 shadow-sm'
                          : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-sm">{opt.label}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          {opt.tag}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Card 2: Select Categories & Subcategories (Single Source of Truth) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-600" /> 2. Avanço e Cobertura das {CATEGORY_CONFIG.length} Categorias do Minerador
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Monitore a quantidade armazenada, cobertura de subcategorias e selecione os escopos para expansão
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={toggleSelectAllCategories}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold shrink-0"
                  >
                    {selectedExpansionCategories.length === CATEGORY_CONFIG.length
                      ? 'Desmarcar Todas'
                      : `Selecionar Todas (${CATEGORY_CONFIG.length})`}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CATEGORY_CONFIG.map((catConfig) => {
                    const isCatSelected = selectedExpansionCategories.includes(catConfig.filterKey);
                    const isDrawerOpen = Boolean(openCategoryDrawers[catConfig.filterKey]);
                    const selectedSubs = selectedSubcategoriesMap[catConfig.filterKey] || [];
                    const stat = collectorCategories.find((c) => c.category === catConfig.filterKey);
                    const subtotalFromSubs = stat?.subcategories?.reduce((acc, s) => acc + (s.productCount || 0), 0) || 0;
                    const productCount = Math.max(stat?.productCount ?? 0, subtotalFromSubs);
                    const activeSubCount = stat?.subcategories?.filter((s) => (s.productCount || 0) > 0).length || 0;
                    const coverageCount = Math.max(stat?.coverageCount ?? 0, activeSubCount);
                    const isActive = productCount > 0 || stat?.status === 'Ativa';

                    return (
                      <div
                        key={catConfig.filterKey}
                        className={`rounded-2xl border transition-all p-4 space-y-3 ${
                          isCatSelected
                            ? 'border-amber-300 bg-amber-50/30'
                            : 'border-slate-200 bg-slate-50/30 opacity-80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isCatSelected}
                              onChange={() => toggleSelectCategory(catConfig.filterKey)}
                              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 shrink-0"
                            />

                            <div className="flex items-center gap-2.5 min-w-0">
                              {catConfig.imageUrl ? (
                                <img
                                  src={catConfig.imageUrl}
                                  alt={catConfig.filterKey}
                                  referrerPolicy="no-referrer"
                                  className="w-7 h-7 rounded-lg object-contain bg-white p-0.5 shrink-0 border border-slate-200"
                                  loading="lazy"
                                  decoding="async"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="p-1.5 rounded-lg bg-white border border-slate-200 shrink-0">
                                  {getCategoryIcon(catConfig.filterKey)}
                                </div>
                              )}
                              <span className="font-extrabold text-sm text-slate-900 truncate">
                                {catConfig.filterKey}
                              </span>
                            </div>
                          </label>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                                isActive
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                  : 'border-amber-200 bg-amber-50 text-amber-800'
                              }`}
                            >
                              {isActive ? 'Base Ativa ✅' : 'Pendente ⚠️'}
                            </span>

                            <button
                              type="button"
                              onClick={() => toggleCategoryDrawer(catConfig.filterKey)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-amber-700 text-[11px] font-bold flex items-center gap-1"
                            >
                              <span>Subcats ({catConfig.subcategories.length})</span>
                              {isDrawerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Status bar */}
                        <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                          <span>Armazenados: <strong className="text-slate-900 font-extrabold">{productCount} prods</strong></span>
                          <span>
                            Cobertura: <strong className="text-amber-700 font-extrabold">{coverageCount}/{catConfig.subcategories.length} subcats</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => setConfirmModalCategory(catConfig.filterKey)}
                            disabled={refreshingCategory === catConfig.filterKey}
                            className="text-amber-700 hover:text-amber-900 font-bold hover:underline text-[10px] flex items-center gap-1 disabled:opacity-50"
                          >
                            {refreshingCategory === catConfig.filterKey ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            <span>Atualizar</span>
                          </button>
                        </div>

                        {/* Subcategories Accordion Drawer */}
                        {isDrawerOpen && (
                          <div className="pt-2 border-t border-slate-200/80 space-y-2 animate-fade-in">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Subcategorias de {catConfig.filterKey}:
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                              {catConfig.subcategories.map((subName) => {
                                const isSubChecked = selectedSubs.includes(subName);
                                const subStat = stat?.subcategories?.find((s) => s.subcategory === subName || (s as any).name === subName);
                                const count = subStat?.productCount ?? 0;

                                return (
                                  <label
                                    key={subName}
                                    className={`flex items-center justify-between p-2 rounded-lg border text-[11px] cursor-pointer transition-all ${
                                      isSubChecked
                                        ? 'border-amber-400 bg-amber-100/60 font-bold text-amber-950'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 truncate pr-1">
                                      <input
                                        type="checkbox"
                                        checked={isSubChecked}
                                        onChange={() => toggleSelectSubcategory(catConfig.filterKey, subName)}
                                        className="w-3 h-3 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                                      />
                                      <span className="truncate">{subName}</span>
                                    </div>

                                    {count < 15 ? (
                                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 shrink-0">
                                        ⚠️ {count}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold text-emerald-700 shrink-0">
                                        ✅ {count}
                                      </span>
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card 3: Execution Estimation & Trigger Panel */}
              {(() => {
                const totalCats = selectedExpansionCategories.length;
                const pagesPerCat = Math.ceil(expansionTargetCount / 30);
                const estimatedCreditsTotal = totalCats * pagesPerCat * 5;
                const totalTargetProducts = totalCats * expansionTargetCount;

                return (
                  <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-amber-50/80 p-5 md:p-6 shadow-md space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-amber-800 text-xs font-black uppercase tracking-wider">
                          <Gauge className="w-4 h-4 text-amber-600" />
                          Estimativa Pré-Execução de Expansão
                        </div>
                        <h3 className="mt-1 text-lg font-black text-slate-900">
                          Resumo da Operação de Aquisição
                        </h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowBatchConfirmModal(true)}
                        disabled={isBatchExecuting || totalCats === 0}
                        className="px-6 py-3.5 rounded-xl font-black text-xs md:text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-2.5 disabled:opacity-50"
                      >
                        <Rocket className="w-4.5 h-4.5" />
                        <span>🚀 Iniciar Expansão da Base ({estimatedCreditsTotal} crs)</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-amber-200/60 text-xs">
                      <div className="rounded-xl bg-white/80 border border-amber-200 p-3">
                        <div className="text-[11px] text-slate-500 font-medium">Categorias Ativas</div>
                        <div className="font-black text-amber-900 text-sm mt-0.5">
                          {totalCats} de {CATEGORY_CONFIG.length} selecionadas
                        </div>
                      </div>

                      <div className="rounded-xl bg-white/80 border border-amber-200 p-3">
                        <div className="text-[11px] text-slate-500 font-medium">Meta Total de Produtos</div>
                        <div className="font-black text-amber-900 text-sm mt-0.5">
                          ~{totalTargetProducts.toLocaleString('pt-BR')} prods
                        </div>
                      </div>

                      <div className="rounded-xl bg-white/80 border border-amber-200 p-3">
                        <div className="text-[11px] text-slate-500 font-medium">Créditos SocialCrawl Estimados</div>
                        <div className="font-black text-amber-900 text-sm mt-0.5">
                          ~{estimatedCreditsTotal} créditos
                        </div>
                      </div>

                      <div className="rounded-xl bg-white/80 border border-amber-200 p-3">
                        <div className="text-[11px] text-slate-500 font-medium">Saldo Disponível na Conta</div>
                        <div className="font-black text-emerald-700 text-sm mt-0.5">
                          {credits?.remaining !== null && credits?.remaining !== undefined
                            ? `${credits.remaining} créditos`
                            : 'Ativo via SocialCrawl'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 2: ATUALIZAR BASE */}
          {collectorSubTab === 'update' && (
            <div className="space-y-5 animate-fade-in">
              <div className="rounded-2xl border border-amber-200 bg-white p-5 md:p-6 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-amber-700 text-xs font-black uppercase tracking-wider">
                      <RefreshCw className={`w-4 h-4 text-amber-600 ${isDailyRefreshing ? 'animate-spin' : ''}`} />
                      Atualização Diária da Base • {CATEGORY_CONFIG.length} Categorias
                    </div>
                    <h3 className="mt-1 text-lg font-black text-slate-900">
                      Atualizar Todas as Categorias em Sequência
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 max-w-2xl">
                      Varre e recicla as {CATEGORY_CONFIG.length} categorias do Minerador no TikTok Shop em lote, mantendo ranking, score e ordenações atualizados.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDailyConfirmModal(true)}
                    disabled={isDailyRefreshing || Boolean(dailyStatus?.isCooldownActive) || Boolean(refreshingCategory)}
                    className={`px-5 py-3.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all shrink-0 ${
                      isDailyRefreshing
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 cursor-wait'
                        : dailyStatus?.isCooldownActive
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 opacity-90'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20 hover:scale-[1.02]'
                    }`}
                  >
                    {isDailyRefreshing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Atualizando base ({dailyStatus?.categoriesProcessed ?? 0}/{CATEGORY_CONFIG.length})...</span>
                      </>
                    ) : dailyStatus?.isCooldownActive ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Base atualizada hoje ✅</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>🔄 Atualizar {CATEGORY_CONFIG.length} Categorias Diárias (~80 créditos)</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
                    <div className="text-[11px] text-slate-500">Última atualização geral</div>
                    <div className="font-bold text-slate-800 mt-0.5 truncate">
                      {dailyStatus?.completedAt || dailyStatus?.startedAt
                        ? formatCollectionDate(dailyStatus.completedAt || dailyStatus.startedAt)
                        : 'Nenhuma realizada'}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
                    <div className="text-[11px] text-slate-500">Categorias processadas</div>
                    <div className="font-extrabold text-amber-700 mt-0.5">
                      {dailyStatus ? `${dailyStatus.categoriesProcessed} / ${dailyStatus.totalCategories}` : '0 / 8'}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
                    <div className="text-[11px] text-slate-500">Próxima recomendada</div>
                    <div className="font-bold text-slate-800 mt-0.5 truncate">
                      {dailyStatus?.isCooldownActive && dailyStatus.cooldownRemainingSeconds > 0
                        ? `Em ~${Math.ceil(dailyStatus.cooldownRemainingSeconds / 3600)} horas`
                        : 'Pronta para atualizar'}
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
                    <div className="text-[11px] text-slate-500">Status atual</div>
                    <div className="font-bold mt-0.5 truncate">
                      {isDailyRefreshing ? (
                        <span className="text-amber-700 animate-pulse">🔄 Em andamento ({dailyStatus?.currentCategory || 'processando'})</span>
                      ) : dailyStatus?.status === 'COMPLETED' ? (
                        <span className="text-emerald-700">Base Ativa ✅</span>
                      ) : dailyStatus?.status === 'PARTIAL_FAILED' ? (
                        <span className="text-amber-700">Atualização Parcial ⚠️</span>
                      ) : (
                        <span className="text-slate-600">Pronta para atualização</span>
                      )}
                    </div>
                  </div>
                </div>

                {dailyStatus?.isCooldownActive ? (
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>A base de dados já passou pela atualização diária recomendada. A proteção de 24 horas está ativa no backend.</span>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {collectorNotice ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{collectorNotice}</span>
              </div>

              <button
                type="button"
                onClick={() => setCollectorNotice(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : null}

          {/* SINGLE SOURCE OF TRUTH CATEGORY CONTROL IS CARD 2 ABOVE */}
        </div>
      ) : null}

      {/* MODAL 1: BATCH EXPANSION CONFIRMATION */}
      {showBatchConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
                  <Rocket className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">
                    Confirmar Expansão da Base
                  </h3>
                  <p className="text-xs text-amber-700 font-bold">
                    Operação em Lote • Geração Z Pro
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowBatchConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-3 text-xs">
              <div className="font-extrabold text-amber-950 text-sm">
                Resumo da Chamada SocialCrawl:
              </div>

              <div className="space-y-1 text-slate-700">
                <div>• Categorias Selecionadas: <strong className="text-slate-900">{selectedExpansionCategories.join(', ')}</strong></div>
                <div>• Meta por Categoria: <strong className="text-slate-900">{expansionTargetCount} produtos</strong></div>
                <div>• Total de Produtos Alvo: <strong className="text-slate-900">~{(selectedExpansionCategories.length * expansionTargetCount).toLocaleString('pt-BR')} produtos</strong></div>
                <div>• Estimativa de Consumo: <strong className="text-slate-900">~{selectedExpansionCategories.length * Math.ceil(expansionTargetCount / 30)} créditos</strong></div>
              </div>

              <p className="text-slate-600 text-[11px] leading-relaxed pt-1 border-t border-amber-200/60">
                A operação fará buscas sequenciais na SocialCrawl para alimentar o banco do Geração Z Pro. Todos os novos produtos serão gravados com score e métricas completas.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowBatchConfirmModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleExecuteBatchExpansion}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
              >
                <Rocket className="w-4 h-4" />
                Confirmar e Iniciar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: BATCH EXECUTION PROGRESS OVERLAY */}
      {isBatchExecuting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-amber-300 bg-white p-6 shadow-2xl text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>

            <div>
              <h3 className="font-black text-xl text-slate-900">
                Expandindo Base de Produtos...
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Aguarde enquanto buscamos e processamos os produtos na SocialCrawl
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3 text-left">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Processando Categoria:</span>
                <span className="text-amber-700">{batchProgress?.currentCategory}</span>
              </div>

              {batchProgress?.currentSubcategory && (
                <div className="flex items-center justify-between text-[11px] text-slate-600">
                  <span>Subcategoria:</span>
                  <span className="font-semibold text-slate-900">{batchProgress.currentSubcategory}</span>
                </div>
              )}

              {/* Progress bar */}
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round(((batchProgress?.processedCategories || 0) / (batchProgress?.totalCategories || 1)) * 100)}%`,
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Progresso: {batchProgress?.processedCategories} de {batchProgress?.totalCategories} categorias</span>
                <span>Créditos: {batchProgress?.creditsUsed}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: BATCH SUMMARY MODAL */}
      {batchSummaryModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-black text-xl text-slate-900">
                Expansão Concluída! 🎉
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                A base do Geração Z Pro foi atualizada com sucesso
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500">Categorias Processadas</div>
                <div className="font-black text-slate-900 text-sm mt-0.5">{batchSummaryModal.categoriesProcessed} de {CATEGORY_CONFIG.length}</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500">Produtos Adquiridos</div>
                <div className="font-black text-amber-700 text-sm mt-0.5">+{batchSummaryModal.totalProducts} prods</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 col-span-2">
                <div className="text-[11px] text-slate-500">Créditos SocialCrawl Consumidos</div>
                <div className="font-black text-slate-900 text-sm mt-0.5">{batchSummaryModal.creditsUsed} créditos</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setBatchSummaryModal(null);
                loadCategories();
              }}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md shadow-amber-500/20"
            >
              Fechar e Ver Base Atualizada
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Individual Category Collection */}
      {confirmModalCategory ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
                  <AlertCircle className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">
                    Confirmar Coleta
                  </h3>

                  <p className="text-xs text-amber-700 font-medium">
                    Categoria: {confirmModalCategory}
                  </p>
                </div>
              </div>

              <button
                onClick={() => !refreshingCategory && setConfirmModalCategory(null)}
                disabled={Boolean(refreshingCategory)}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
              <p className="text-sm font-bold text-amber-900 leading-snug">
                Esta coleta buscará até {selectedMaxProducts} produtos da TikTok Shop Brasil e poderá consumir até {Math.ceil(selectedMaxProducts / 30)} {Math.ceil(selectedMaxProducts / 30) === 1 ? 'crédito' : 'créditos'} da SocialCrawl. Continuar?
              </p>

              <p className="text-xs text-slate-600 leading-normal">
                A requisição consultará sequencialmente até {Math.ceil(selectedMaxProducts / 30)} {Math.ceil(selectedMaxProducts / 30) === 1 ? 'página' : 'páginas'} de resultados para a categoria <strong className="text-slate-900">{confirmModalCategory}</strong> na região <strong className="text-slate-900">BR</strong> e atualizará o banco de dados do Geração Z Pro.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setConfirmModalCategory(null)}
                disabled={Boolean(refreshingCategory)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold disabled:opacity-30"
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirmCategoryCollect}
                disabled={Boolean(refreshingCategory)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 disabled:opacity-50"
              >
                {refreshingCategory ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Coletando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Confirmar e Atualizar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Confirmation Modal for Daily Refresh */}
      {showDailyConfirmModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
                  <AlertCircle className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">
                    Confirmar Atualização Diária
                  </h3>
                  <p className="text-xs text-amber-700 font-medium">
                    Coleta sequencial das 8 categorias
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDailyConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
              <p className="text-sm font-bold text-amber-900 leading-snug">
                Esta ação atualizará as 8 categorias oficiais do Geração Z Pro, utilizando até 90 produtos por categoria e podendo consumir até 24 créditos SocialCrawl. As categorias serão processadas uma por vez. Continuar?
              </p>

              <div className="text-xs text-slate-700 space-y-1.5 pt-2 border-t border-amber-200">
                <div>• <strong>Categorias:</strong> Beleza, Casa, Moda, Cozinha, Eletrônicos, Fitness, Bebê e Pet.</div>
                <div>• <strong>Profundidade:</strong> Até 90 produtos (3 páginas de 30) por categoria.</div>
                <div>• <strong>Consumo Máximo:</strong> Até 24 créditos (3 por categoria).</div>
                <div>• <strong>Proteção:</strong> Execução sequencial com progresso em tempo real e proteção de 24 horas no backend.</div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setShowDailyConfirmModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold"
              >
                Cancelar
              </button>

              <button
                onClick={handleStartDailyRefresh}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-amber-500/20"
              >
                <RefreshCw className="w-4 h-4" />
                Confirmar Atualização
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Video & AI Modals */}
      <ScriptGeneratorModal
        isOpen={Boolean(scriptModalProduct)}
        onClose={() => setScriptModalProduct(null)}
        product={scriptModalProduct}
        studentCode={studentCode}
      />

      <VideoAnalysisModal
        isOpen={Boolean(analysisModalProduct)}
        onClose={() => setAnalysisModalProduct(null)}
        product={analysisModalProduct}
        onOpenScriptModal={(p) => setScriptModalProduct(p)}
      />

      <ProductDetailModal
        isOpen={Boolean(detailModalProduct)}
        onClose={() => setDetailModalProduct(null)}
        product={detailModalProduct}
        isFavorite={detailModalProduct ? isFavorited(detailModalProduct.productId) : false}
        onToggleFavorite={toggleFavorite}
        onOpenScriptModal={(p) => setScriptModalProduct(p)}
        onOpenAnalysisModal={handleOpenAnalysisModal}
        onTrackClick={handleTrackProductClick}
      />
    </section>
  );
};
