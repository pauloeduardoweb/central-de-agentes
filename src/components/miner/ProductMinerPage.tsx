import React, { useEffect, useMemo, useState } from 'react';
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
  type DailyRefreshStatus,
  type CollectorCategoryStat,
  type ProductSearchSource,
} from '../../services/productMinerApi';
import {
  ScriptGeneratorModal,
  VideoAnalysisModal,
  ProductDetailModal,
} from './ProductMinerModals';

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
    label: 'Mais pesquisados',
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

export interface CategoryConfigItem {
  filterKey: string;
  label: string;
  subcategories: string[];
}

export const CATEGORY_CONFIG: CategoryConfigItem[] = [
  {
    filterKey: 'Moda',
    label: 'Moda',
    subcategories: [
      'Todas',
      'Acessórios',
      'Malas e Mochilas',
      'Moda Feminina',
      'Moda Masculina',
      'Calçados',
    ],
  },
  {
    filterKey: 'Itens para Casa',
    label: 'Itens para Casa',
    subcategories: [
      'Todas',
      'Utensílios de Cozinha',
      'Móveis',
      'Ferramentas',
      'Artigos para Festas',
      'Reforma e Construção',
      'Itens para Banheiro',
      'Produtos de Limpeza',
      'Decoração de Casa',
      'Cama, Mesa e Banho',
    ],
  },
  {
    filterKey: 'Eletrônicos',
    label: 'Eletrônicos',
    subcategories: [
      'Todas',
      'Celulares e Eletrônicos',
      'Livros e Revistas',
      'Automotivo',
      'Computadores e Equipamentos',
      'Dispositivos de Higiene',
      'Eletrodomésticos',
      'Livros e Áudio',
    ],
  },
  {
    filterKey: 'Beleza e Cuidados Pessoais',
    label: 'Beleza e Cuidados Pessoais',
    subcategories: [
      'Todas',
      'Maquiagem',
      'Cuidados Capilares',
      'Perfumes',
      'Cuidados com o Corpo',
      'Cuidados Masculinos',
      'Cuidados com a Pele',
    ],
  },
  {
    filterKey: 'Esportes e Lazer',
    label: 'Esportes e Lazer',
    subcategories: [
      'Todas',
      'Fitness',
      'Equipamentos para Lazer',
      'Roupas Esportivas',
      'Acessórios para Esportes',
      'Calçados Esportivos',
    ],
  },
  {
    filterKey: 'Brinquedos e Pets',
    label: 'Brinquedos e Pets',
    subcategories: [
      'Todas',
      'Produtos para Pets',
      'Suprimentos para Pets',
    ],
  },
  {
    filterKey: 'Health',
    label: 'Health',
    subcategories: [
      'Todas',
      'Health Nutrition',
    ],
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
  const cleanId = product.productId ? String(product.productId).trim() : '';

  const isSearchUrl = Boolean(
    rawUrl && (
      rawUrl.includes('/search') ||
      rawUrl.includes('/query') ||
      rawUrl.includes('/store/search') ||
      rawUrl.includes('q=') ||
      rawUrl.includes('search_id=') ||
      rawUrl.includes('keyword=')
    )
  );

  if (rawUrl && !isSearchUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
    return rawUrl;
  }

  if (cleanId.length > 0 && /^[a-zA-Z0-9_-]+$/.test(cleanId)) {
    return `https://shop.tiktok.com/view/product/${cleanId}`;
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
  if (norm.includes('bebê') || norm.includes('bebe')) return <Baby className="w-5 h-5 text-pink-300" />;
  if (norm.includes('pet')) return <Dog className="w-5 h-5 text-purple-300" />;
  return <ShoppingBag className="w-5 h-5 text-cyan-300" />;
}

function matchesCategoryFilter(productCatRaw: string | null, selectedCat: string): boolean {
  if (!selectedCat || selectedCat === 'Todos') return true;
  if (!productCatRaw) return false;

  const cat = productCatRaw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const target = selectedCat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (target === 'moda') {
    return cat.includes('moda') || cat.includes('vestuario') || cat.includes('roupa') || cat.includes('calçado');
  }
  if (target.includes('casa')) {
    return cat.includes('casa') || cat.includes('cozinha') || cat.includes('lar') || cat.includes('decoracao');
  }
  if (target.includes('eletronicos')) {
    return cat.includes('eletronico') || cat.includes('tecnologia') || cat.includes('gadget') || cat.includes('celular') || cat.includes('fone');
  }
  if (target.includes('beleza')) {
    return cat.includes('beleza') || cat.includes('pessoal') || cat.includes('cosmetico') || cat.includes('skincare') || cat.includes('cabelo') || cat.includes('maquiagem');
  }
  if (target.includes('esporte')) {
    return cat.includes('esporte') || cat.includes('fitness') || cat.includes('lazer') || cat.includes('treino') || cat.includes('academia');
  }
  if (target.includes('brinquedos') || target.includes('pets')) {
    return cat.includes('pet') || cat.includes('brinquedo') || cat.includes('bebe') || cat.includes('infantil') || cat.includes('animais');
  }
  if (target.includes('health')) {
    return cat.includes('health') || cat.includes('saude') || cat.includes('suplemento') || cat.includes('vitamina');
  }

  return cat.includes(target);
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
    'maquiagem': ['maquiagem', 'batom', 'base', 'corretivo', 'rimel', 'pincel', 'sombra', 'gloss', 'delineador', 'blush', 'iluminador'],
    'cuidados capilares': ['cabelo', 'capilar', 'shampoo', 'condicionador', 'mascara capilar', 'oleo capilar', 'tintura', 'creme de pentear', 'reparador'],
    'perfumes': ['perfume', 'fragrancia', 'colonia', 'body splash', 'eau de parfum', 'decant'],
    'cuidados com o corpo': ['corpo', 'hidratante', 'sabonete', 'desodorante', 'esfoliante', 'locao corporal', 'óleo corporal'],
    'cuidados masculinos': ['masculinos', 'masculino', 'barba', 'pos barba', 'locao', 'gel de barbear', 'pomada capilar', 'balm'],
    'cuidados com a pele': ['pele', 'skincare', 'protetor solar', 'serum', 'retinol', 'hidratante facial', 'vitamina c', 'sabonete facial', 'tonico'],

    // Esportes e Lazer
    'fitness': ['fitness', 'academia', 'haltere', 'elastico', 'corda', 'colchonete', 'whey', 'suplemento', 'halter', 'faixa elastica', 'pesos'],
    'equipamentos para lazer': ['lazer', 'camping', 'barraca', 'pesca', 'piscina', 'patins', 'skate', 'boia', 'lanterna'],
    'roupas esportivas': ['roupas esportivas', 'roupa esportiva', 'top esportivo', 'legging', 'bermuda treino', 'dry fit', 'regata treino', 'conjunto fitness'],
    'acessorios para esportes': ['acessorios para esportes', 'garrafa', 'squeeze', 'luva academia', 'joelheira', 'bolsa academia', 'caneleira'],
    'calcados esportivos': ['calcados esportivos', 'tenis corrida', 'chuteira', 'tenis treino', 'tenis academia'],

    // Brinquedos e Pets
    'produtos para pets': ['pet', 'cachorro', 'gato', 'coleira', 'caminha pet', 'racao', 'arranhador', 'brinquedo pet', 'guia'],
    'suprimentos para pets': ['suprimentos para pets', 'tapete higienico', 'comedouro', 'bebedouro', 'shampoo pet', 'caixa de areia', 'eliminador de odores'],

    // Health
    'health nutrition': ['nutrition', 'nutricao', 'suplemento', 'vitamina', 'whey', 'creatina', 'colageno', 'omega 3', 'protein', 'termogenico', 'pre treino'],
  };

  const currentKeywords = KEYWORD_MAP[sub] || [sub];

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
}> = ({
  product,
  position,
  rankingSort,
  isMentor,
  isFavorite = false,
  onToggleFavorite,
  onOpenDetailModal,
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
          <div className="pt-0.5 space-y-0.5">
            <span className="text-[10px] text-slate-500 font-medium block leading-none">
              A partir de
            </span>
            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-xs font-black text-emerald-700">
                {formatMoney(product.priceCents, product.currencySymbol)}
              </span>
              {product.originalPriceCents && product.originalPriceCents > (product.priceCents || 0) ? (
                <span className="text-[9px] text-slate-400 line-through">
                  {formatMoney(product.originalPriceCents, product.currencySymbol)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Bottom Bar: Seller Name + Heart Favorite & Action Buttons */}
        <div className="pt-1.5 border-t border-slate-100 space-y-1.5 mt-auto">
          <div className="flex items-center justify-between gap-1 text-[10px]">
            <span className="truncate text-[10px] text-slate-500 font-medium flex-1">
              {product.sellerName || 'TikTok Shop'}
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
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-normal self-start shadow-sm">
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

        <div className="flex items-end justify-between gap-3">
          <div>
            <span className="text-[11px] text-slate-500 font-medium block leading-none mb-0.5">
              A partir de
            </span>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-lg font-black text-emerald-700">
                {formatMoney(product.priceCents, product.currencySymbol)}
              </span>

              {product.originalPriceCents && product.originalPriceCents > (product.priceCents || 0) ? (
                <span className="text-[11px] text-slate-400 line-through">
                  {formatMoney(product.originalPriceCents, product.currencySymbol)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-500">Vendas totais</div>
            <div className="font-black text-amber-700">{compactNumber(product.soldCount)}</div>
          </div>
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

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-2 text-slate-700 flex items-center gap-1.5 font-medium">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
            {product.rating ?? '—'}
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200/80 px-2.5 py-2 text-slate-700 flex items-center gap-1.5 min-w-0 font-medium">
            <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="truncate">{product.sellerName || 'Loja'}</span>
          </div>
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


export const ProductMinerPage: React.FC<ProductMinerPageProps> = ({
  studentCode,
  canRefresh = false,
}) => {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<ProductMinerProduct[]>([]);
  const [ranking, setRanking] = useState<ProductMinerProduct[]>([]);
  const [rankingMeta, setRankingMeta] = useState<ProductRankingMeta | null>(null);
  const [rankingSort, setRankingSort] = useState<ProductRankingSort>('opportunities');

  const [selectedClassification, setSelectedClassification] = useState<ClassificationType>('best_sellers');

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
  const [hasVideoOnly, setHasVideoOnly] = useState<boolean>(false);
  const [viralVideoOnly, setViralVideoOnly] = useState<boolean>(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

  const subcatScrollRef = React.useRef<HTMLDivElement>(null);
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

  // Ranking Pagination State
  const [rankingPage, setRankingPage] = useState<number>(1);

  // Reset ranking page and search page whenever any filter, subcategory, classification, sort, or mode changes
  useEffect(() => {
    setRankingPage(1);
    setPage(1);
  }, [selectedCategory, selectedSubcategory, hasVideoOnly, viralVideoOnly, selectedClassification, rankingSort, mode]);

  // Modals state
  const [scriptModalProduct, setScriptModalProduct] = useState<ProductMinerProduct | null>(null);
  const [analysisModalProduct, setAnalysisModalProduct] = useState<ProductMinerProduct | null>(null);
  const [detailModalProduct, setDetailModalProduct] = useState<ProductMinerProduct | null>(null);

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
    list = list.filter((p) => matchesCategoryFilter(p.category, selectedCategory));

    // 1b. Filter by subcategory
    if (selectedSubcategory && selectedSubcategory !== 'Todas' && selectedSubcategory !== 'Todos') {
      list = list.filter((p) => matchesSubcategoryFilter(p.category, p.title, selectedSubcategory, selectedCategory));
    }

    // 2. Filter by video options
    if (hasVideoOnly) {
      list = list.filter((p) => Boolean(p.video?.url));
    }
    if (viralVideoOnly) {
      list = list.filter((p) => Boolean(p.video && (p.video.views ?? 0) >= 1000000));
    }

    // 3. Sort by classification choice
    const copy = [...list];
    if (selectedClassification === 'best_sellers') {
      copy.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
    } else if (selectedClassification === 'top_rated') {
      copy.sort((a, b) => {
        const rateDiff = (b.rating || 0) - (a.rating || 0);
        if (Math.abs(rateDiff) > 0.01) return rateDiff;
        return (b.soldCount || 0) - (a.soldCount || 0);
      });
    } else if (selectedClassification === 'trending') {
      copy.sort((a, b) => {
        const g24b = b.growth24hPercent ?? b.sales24h ?? 0;
        const g24a = a.growth24hPercent ?? a.sales24h ?? 0;
        if (g24b !== g24a) return g24b - g24a;
        return (b.soldCount || 0) - (a.soldCount || 0);
      });
    } else if (selectedClassification === 'most_searched') {
      copy.sort((a, b) => {
        const aScore = (a.trendScore || 0) + (a.video?.views ? Math.log10(a.video.views) : 0);
        const bScore = (b.trendScore || 0) + (b.video?.views ? Math.log10(b.video.views) : 0);
        if (bScore !== aScore) return bScore - aScore;
        return (b.soldCount || 0) - (a.soldCount || 0);
      });
    } else if (selectedClassification === 'editors_choice') {
      copy.sort((a, b) => {
        const scoreDiff = (b.score || 0) - (a.score || 0);
        if (scoreDiff !== 0) return scoreDiff;
        return (b.soldCount || 0) - (a.soldCount || 0);
      });
    } else if (selectedClassification === 'highest_commission') {
      copy.sort((a, b) => {
        const commB = b.estimatedCommissionCents ?? (b.commissionRatePercent && b.priceCents ? Math.round((b.priceCents * b.commissionRatePercent) / 100) : 0);
        const commA = a.estimatedCommissionCents ?? (a.commissionRatePercent && a.priceCents ? Math.round((a.priceCents * a.commissionRatePercent) / 100) : 0);
        if (commB !== commA) return commB - commA;
        return (b.soldCount || 0) - (a.soldCount || 0);
      });
    } else if (selectedClassification === 'sales_24h') {
      copy.sort((a, b) => {
        const s24b = b.sales24h ?? 0;
        const s24a = a.sales24h ?? 0;
        if (s24b !== s24a) return s24b - s24a;
        return (b.soldCount || 0) - (a.soldCount || 0);
      });
    } else if (selectedClassification === 'spiking') {
      copy.sort((a, b) => {
        const spikeB = (b.growth24hPercent ?? 0) * 100 + (b.sales24h ?? 0);
        const spikeA = (a.growth24hPercent ?? 0) * 100 + (a.sales24h ?? 0);
        if (spikeB !== spikeA) return spikeB - spikeA;
        return (b.soldCount || 0) - (a.soldCount || 0);
      });
    } else if (selectedClassification === 'viral_video') {
      copy.sort((a, b) => {
        const vB = b.video?.views ?? (b.video?.url ? 1 : 0);
        const vA = a.video?.views ?? (a.video?.url ? 1 : 0);
        if (vB !== vA) return vB - vA;
        return (b.soldCount || 0) - (a.soldCount || 0);
      });
    }

    return copy;
  }, [products, ranking, favorites, mode, selectedCategory, selectedSubcategory, hasVideoOnly, viralVideoOnly, selectedClassification, query]);

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
      const result = await runDailyRefresh(studentCode);
      setDailyStatus(result);
      setIsDailyRefreshing(false);

      const notice = `Atualização Diária concluída! ${result.categoriesProcessed} de ${result.totalCategories} categorias processadas (${result.uniqueProductsCount} produtos únicos, ${result.creditsUsed} créditos utilizados).`;
      setCollectorNotice(notice);
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
    targetPage = 1,
    refresh = false,
  ) => {
    const clean = targetQuery.trim();

    if (clean.length === 1) return;

    setMode('search');
    setLoading(true);
    setError('');

    try {
      const data = refresh
        ? await refreshProducts(studentCode, clean, targetPage)
        : await searchProducts(studentCode, clean, targetPage);

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
    if (mode === 'search' && products.length === 0 && !loading) {
      runSearch('', 1, false);
    }
  }, [mode]);

  const activeFilterCount =
    (selectedCategory !== 'Todos' ? 1 : 0) +
    (selectedSubcategory !== 'Todas' ? 1 : 0) +
    (hasVideoOnly ? 1 : 0) +
    (viralVideoOnly ? 1 : 0);

  return (
    <section className="space-y-4 pb-12 rounded-2xl sm:rounded-3xl bg-slate-50 border border-slate-200/80 p-3 sm:p-6 shadow-xl text-slate-900 transition-all">
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
                    setSelectedClassification(c.id);
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

        {/* Categories Pills Bar */}
        <div
          className="w-full overflow-x-auto overflow-y-hidden scrollbar-none pb-1"
          onWheel={(e) => {
            if (e.deltaY !== 0 && e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
        >
          <div className="flex w-max min-w-max items-center gap-1.5 pr-6">
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
                    } else {
                      setSelectedCategory(cat.filterKey);
                      setSelectedSubcategory('Todas');
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-xs md:text-sm font-bold shrink-0 border transition-all whitespace-nowrap ${
                    isActive
                      ? 'border-amber-500 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/20 font-black'
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:text-slate-900 hover:border-slate-300 hover:bg-slate-200/80'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Subcategories Horizontal Scroll Row (Renders when a main category is selected) */}
        {activeCategoryConfig ? (
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
                  Ver todas de {activeCategoryConfig.label}
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
                className="w-full min-w-0 overflow-x-auto overflow-y-hidden scrollbar-none pb-1"
                onWheel={(e) => {
                  if (e.deltaY !== 0 && e.currentTarget.scrollWidth > e.currentTarget.clientWidth) {
                    e.currentTarget.scrollLeft += e.deltaY;
                  }
                }}
              >
                <div className="flex w-max min-w-max items-center gap-1.5 pr-12 sm:pr-24">
                  {activeCategoryConfig.subcategories.map((subcat) => {
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
        ) : null}
      </div>

      {/* ================================================== */}
      {/* 3 — MODES & ADVANCED FILTERS BAR                   */}
      {/* ================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-xl border border-slate-200 bg-white shadow-sm self-start flex-wrap gap-1">
          <button
            onClick={() => setMode('search')}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all ${
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
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all ${
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

          {canRefresh ? (
            <button
              onClick={() => setMode('collector')}
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all ${
                mode === 'collector'
                  ? 'bg-amber-500/15 text-amber-800 font-black border border-amber-300/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              Adquirir Produtos
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {/* Advanced Filters Toggle Button */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs sm:text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all ${
              showAdvancedFilters || activeFilterCount > 0
                ? 'border-amber-400 bg-amber-50 text-amber-800'
                : 'border-slate-200 bg-white text-slate-700 hover:text-slate-900'
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
                      onOpenDetailModal={(p) => setDetailModalProduct(p)}
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
                      onOpenAnalysisModal={(p) => setAnalysisModalProduct(p)}
                      onOpenDetailModal={(p) => setDetailModalProduct(p)}
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
                  7 Categorias Oficiais
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
                <span>🔄 Atualizar Base (Reciclar 7 Categorias)</span>
              </button>
            </div>
          </div>

          {/* TAB 1: EXPANDIR BASE */}
          {collectorSubTab === 'expand' && (
            <div className="space-y-5 animate-fade-in">
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

              {/* Card 2: Select Categories & Subcategories */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-600" /> 2. Selecionar Escopo de Categorias (7 Oficiais)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Marque as categorias que deseja expandir ou abra o menu de subcategorias para direcionar o foco
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={toggleSelectAllCategories}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold shrink-0"
                  >
                    {selectedExpansionCategories.length === CATEGORY_CONFIG.length
                      ? 'Desmarcar Todas'
                      : 'Selecionar Todas (7)'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CATEGORY_CONFIG.map((catConfig) => {
                    const isCatSelected = selectedExpansionCategories.includes(catConfig.filterKey);
                    const isDrawerOpen = Boolean(openCategoryDrawers[catConfig.filterKey]);
                    const selectedSubs = selectedSubcategoriesMap[catConfig.filterKey] || [];
                    const stat = collectorCategories.find((c) => c.category === catConfig.filterKey);

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

                            <div className="flex items-center gap-2 min-w-0">
                              <div className="p-1.5 rounded-lg bg-white border border-slate-200 shrink-0">
                                {getCategoryIcon(catConfig.filterKey)}
                              </div>
                              <span className="font-extrabold text-sm text-slate-900 truncate">
                                {catConfig.filterKey}
                              </span>
                            </div>
                          </label>

                          <button
                            type="button"
                            onClick={() => toggleCategoryDrawer(catConfig.filterKey)}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-amber-700 text-[11px] font-bold flex items-center gap-1 shrink-0"
                          >
                            <span>Subcategorias ({catConfig.subcategories.length})</span>
                            {isDrawerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Status bar */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                          <span>Armazenados: <strong className="text-slate-800">{stat?.productCount ?? 0} prods</strong></span>
                          <span>
                            Cobertura: <strong className="text-amber-700">{stat?.coverageCount ?? 0}/{catConfig.subcategories.length} subcats</strong>
                          </span>
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
                                const subStat = stat?.subcategories?.find((s) => s.name === subName);
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
                          {totalCats} de 7 selecionadas
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
                      Atualização Diária da Base • 7 Categorias
                    </div>
                    <h3 className="mt-1 text-lg font-black text-slate-900">
                      Atualizar Todas as Categorias em Sequência
                    </h3>
                    <p className="mt-1 text-xs text-slate-600 max-w-2xl">
                      Varre e recicla as 7 categorias oficiais do TikTok Shop em lote (Moda, Itens para Casa, Eletrônicos, Beleza e Cuidados Pessoais, Esportes e Lazer, Brinquedos e Pets, Health), mantendo ranking, score e ordenações atualizados.
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
                        <span>Atualizando base ({dailyStatus?.categoriesProcessed ?? 0}/7)...</span>
                      </>
                    ) : dailyStatus?.isCooldownActive ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Base atualizada hoje ✅</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>🔄 Atualizar 7 Categorias Diárias (~70 créditos)</span>
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
                      {dailyStatus ? `${dailyStatus.categoriesProcessed} / ${dailyStatus.totalCategories}` : '0 / 7'}
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

          {/* SECTION 3: CATEGORY COVERAGE BREAKDOWN GRID */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-600" /> Status e Cobertura por Categoria (7 Categorias Oficiais)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Acompanhe a distribuição de produtos e subcategorias armazenadas no banco
                </p>
              </div>
            </div>

            {collectorLoading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {collectorCategories.map((cat) => {
                  const isDrawerOpen = Boolean(openCategoryDrawers[cat.category]);
                  const catConfig = CATEGORY_CONFIG.find((c) => c.filterKey === cat.category);
                  const totalSubCount = catConfig?.subcategories.length || cat.totalSubcategories || 0;

                  return (
                    <div
                      key={cat.category}
                      className="rounded-2xl border border-slate-200 bg-white p-4 flex flex-col justify-between space-y-4 hover:border-amber-300 shadow-sm transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 shrink-0">
                              {getCategoryIcon(cat.category)}
                            </div>

                            <h3 className="font-extrabold text-sm text-slate-900 truncate">
                              {cat.category}
                            </h3>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border shrink-0 ${
                              cat.status === 'Ativa'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                : 'border-amber-200 bg-amber-50 text-amber-800'
                            }`}
                          >
                            {cat.status === 'Ativa' ? 'Base Ativa' : 'Pendente'}
                          </span>
                        </div>

                        <div className="space-y-1 bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                          <div className="text-xs text-slate-900 font-extrabold">
                            {cat.productCount} {cat.productCount === 1 ? 'produto armazenado' : 'produtos armazenados'}
                          </div>

                          <div className="text-[11px] text-amber-800 font-bold">
                            Cobertura: {cat.coverageCount || 0} de {totalSubCount} subcategorias
                          </div>

                          <div className="text-[10px] text-slate-400 font-medium">
                            {formatCollectionDate(cat.lastCollectedAt)}
                          </div>
                        </div>

                        {/* Subcategories Accordion Button */}
                        <button
                          type="button"
                          onClick={() => toggleCategoryDrawer(cat.category)}
                          className="w-full py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center justify-between transition-all"
                        >
                          <span>Ver Subcategorias ({totalSubCount})</span>
                          {isDrawerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        {/* Drawer content */}
                        {isDrawerOpen && (
                          <div className="space-y-1.5 pt-1 border-t border-slate-100 animate-fade-in max-h-40 overflow-y-auto pr-1">
                            {catConfig?.subcategories.map((subName) => {
                              const subStat = cat.subcategories?.find((s) => s.name === subName);
                              const subCount = subStat?.productCount ?? 0;

                              return (
                                <div
                                  key={subName}
                                  className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-slate-50 border border-slate-200/60"
                                >
                                  <span className="truncate pr-1 text-slate-700 font-medium">{subName}</span>
                                  {subCount < 15 ? (
                                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 shrink-0">
                                      ⚠️ {subCount} prods
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold text-emerald-700 shrink-0">
                                      ✅ {subCount} prods
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setConfirmModalCategory(cat.category)}
                          disabled={refreshingCategory === cat.category}
                          className="py-2 px-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-black flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                        >
                          {refreshingCategory === cat.category ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                          <span>Atualizar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedExpansionCategories([cat.category]);
                            setCollectorSubTab('expand');
                          }}
                          className="py-2 px-2 rounded-xl border border-amber-500 bg-amber-500 text-white hover:bg-amber-600 text-[11px] font-black flex items-center justify-center gap-1 transition-all"
                        >
                          <Rocket className="w-3 h-3" />
                          <span>Expandir</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
                <div className="font-black text-slate-900 text-sm mt-0.5">{batchSummaryModal.categoriesProcessed} de 7</div>
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
        onOpenAnalysisModal={(p) => setAnalysisModalProduct(p)}
      />
    </section>
  );
};
