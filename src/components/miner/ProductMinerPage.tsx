import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Flame, ShoppingBag, Star, Store, ExternalLink, Play, Eye, Heart,
  MessageCircle, Share2, Bookmark, TrendingUp, Loader2, Database, Zap, RefreshCw,
  Layers, ShieldCheck, AlertCircle, CheckCircle2, X, Sparkles, Home, Shirt, Utensils,
  Cpu, Dumbbell, Baby, Dog, Copy, Check, Video, Download, FileText, BarChart3, Wand2, Filter,
  Trophy, ThumbsUp, SlidersHorizontal, ChevronDown, ChevronUp
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
  VideoDownloadModal,
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

export type ClassificationType = 'best_sellers' | 'top_rated' | 'trending' | 'most_searched' | 'editors_choice';

export interface ClassificationItem {
  id: ClassificationType;
  label: string;
  imgUrl: string;
  fallbackIcon: React.ReactNode;
}

const CLASSIFICATIONS: ClassificationItem[] = [
  {
    id: 'best_sellers',
    label: 'Mais vendidos',
    imgUrl: 'https://i.postimg.cc/tg8X1nND/troféu.jpg',
    fallbackIcon: <Trophy className="w-6 h-6 text-amber-400" />,
  },
  {
    id: 'top_rated',
    label: 'Melhores avaliações',
    imgUrl: 'https://i.postimg.cc/JnJRj7p3/Like.jpg',
    fallbackIcon: <ThumbsUp className="w-6 h-6 text-blue-400" />,
  },
  {
    id: 'trending',
    label: 'Tendências',
    imgUrl: 'https://i.postimg.cc/26vCnj0n/Fogo.jpg',
    fallbackIcon: <Flame className="w-6 h-6 text-orange-400" />,
  },
  {
    id: 'most_searched',
    label: 'Mais pesquisados',
    imgUrl: 'https://i.postimg.cc/PxZd1fSW/Lupa.jpg',
    fallbackIcon: <Search className="w-6 h-6 text-cyan-400" />,
  },
  {
    id: 'editors_choice',
    label: 'Escolha do dia',
    imgUrl: 'https://i.postimg.cc/767qSPKN/coração.jpg',
    fallbackIcon: <Heart className="w-6 h-6 text-rose-400" />,
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

  const catStr = (productCatRaw || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const titleStr = (productTitleRaw || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const fullText = `${catStr} ${titleStr}`;

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
    'cuidados capilares': ['cabelo', 'shampoo', 'condicionador', 'mascara capilar', 'oleo capilar', 'tintura', 'creme de pentear', 'reparador'],
    'perfumes': ['perfume', 'fragrancia', 'colonia', 'body splash', 'eau de parfum', 'decant'],
    'cuidados com o corpo': ['corpo', 'hidratante', 'sabonete', 'desodorante', 'esfoliante', 'locao corporal', 'óleo corporal'],
    'cuidados masculinos': ['masculinos', 'masculino', 'barba', 'pos barba', 'locao', 'gel de barbear', 'pomada capilar', 'balm'],
    'cuidados com a pele': ['pele', 'skincare', 'protetor solar', 'serum', 'retinol', 'hidratante facial', 'vitamina c', 'sabonete facial', 'tonico'],

    // Esportes e Lazer
    'fitness': ['fitness', 'academia', 'haltere', 'elastico', 'corda', 'colchonete', 'whey', 'suplemento', 'halter', 'faixa elastica', 'pesos'],
    'equipamentos para lazer': ['lazer', 'camping', 'barraca', 'pesca', 'piscina', 'patins', 'skate', 'boia', 'lanterna'],
    'roupas esportivas': ['roupas esportivas', 'roupa esportiva', 'top esportivo', 'legging', 'bermuda treino', 'dry fit', 'regata treino', 'conjunto fitness'],
    'acessorios para esportes': ['acessorios para esportes', 'garrafa', 'squeeze', 'luva academia', 'faixa', 'joelheira', 'bolsa academia', 'caneleira'],
    'calcados esportivos': ['calcados esportivos', 'tenis corrida', 'chuteira', 'tenis treino', 'tenis academia'],

    // Brinquedos e Pets
    'produtos para pets': ['pet', 'cachorro', 'gato', 'coleira', 'caminha pet', 'racao', 'arranhador', 'brinquedo pet', 'guia'],
    'suprimentos para pets': ['suprimentos para pets', 'tapete higienico', 'comedouro', 'bebedouro', 'shampoo pet', 'caixa de areia', 'eliminador de odores'],

    // Health
    'health nutrition': ['nutrition', 'nutricao', 'suplemento', 'vitamina', 'whey', 'creatina', 'colageno', 'omega 3', 'protein', 'termogenico', 'pre treino'],
  };

  const keywords = KEYWORD_MAP[sub];
  if (keywords && keywords.length > 0) {
    const hasMatch = keywords.some((kw) => fullText.includes(kw));
    if (hasMatch) return true;
  }

  const subWords = sub.split(/\s+/).filter((w) => w.length > 3 && w !== 'para' && w !== 'com');
  if (subWords.length > 0) {
    return subWords.some((word) => fullText.includes(word));
  }

  return fullText.includes(sub);
}

const ClassificationIconComponent: React.FC<{ item: ClassificationItem; isActive: boolean }> = ({ item, isActive }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden transition-all flex items-center justify-center shrink-0 border-2 ${
        isActive
          ? 'border-amber-500 bg-gradient-to-br from-amber-400/30 to-orange-400/30 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/60 scale-105'
          : 'border-slate-200 bg-slate-100 hover:border-slate-300 hover:bg-slate-200/80'
      }`}
    >
      {!imgError ? (
        <img
          src={item.imgUrl}
          alt={item.label}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        item.fallbackIcon
      )}
    </div>
  );
};

/* Compact Mobile Card (TikTok Shop list style) */
const MobileProductCard: React.FC<{
  product: ProductMinerProduct;
  position?: number;
  rankingSort?: ProductRankingSort;
  isMentor?: boolean;
  onOpenScriptModal?: (p: ProductMinerProduct) => void;
  onOpenAnalysisModal?: (p: ProductMinerProduct) => void;
  onOpenDownloadModal?: (p: ProductMinerProduct) => void;
}> = ({
  product,
  position,
  rankingSort,
  isMentor,
  onOpenScriptModal,
  onOpenAnalysisModal,
  onOpenDownloadModal,
}) => {
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyVideoLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.video?.url) {
      navigator.clipboard.writeText(product.video.url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  return (
    <article className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm hover:shadow-md hover:border-amber-400/60 transition-all flex gap-3 relative overflow-hidden text-slate-900">
      {/* Ranking position tag */}
      {position ? (
        <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded-md bg-white/95 border border-amber-400/70 text-amber-700 text-[10px] font-black shadow-sm">
          #{position}
        </div>
      ) : null}

      {/* Product Image */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            <ShoppingBag className="w-8 h-8" />
          </div>
        )}

        {product.discountPercent ? (
          <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black">
            -{product.discountPercent}%
          </div>
        ) : null}

        {product.video?.url ? (
          <div className="absolute top-1 right-1 p-1 rounded-full bg-amber-500 text-white shadow" title="Possui vídeo">
            <Play className="w-2.5 h-2.5 fill-current" />
          </div>
        ) : null}
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0 flex flex-col justify-between space-y-1">
        <div>
          {/* Title */}
          <h3 className="font-extrabold text-xs text-slate-900 leading-snug line-clamp-2">
            {product.title}
          </h3>

          {/* Vendas & Rating */}
          <div className="flex items-center gap-2 mt-1 text-[11px] flex-wrap">
            <span className="font-black text-amber-700">
              {compactNumber(product.soldCount)} vendidos
            </span>

            {product.rating ? (
              <span className="font-bold text-amber-600 flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-current text-amber-400" />
                {product.rating}
              </span>
            ) : null}
          </div>

          {/* Ganho Afiliado / Comissão */}
          {product.estimatedCommissionCents ? (
            <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-black">
              Ganhe {formatMoney(product.estimatedCommissionCents, product.currencySymbol)}
            </div>
          ) : product.commissionRatePercent ? (
            <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-black">
              Comissão {product.commissionRatePercent}%
            </div>
          ) : null}

          {/* Price & Score Geração Z Pro */}
          <div className="flex items-center justify-between gap-2 mt-1 flex-wrap">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-black text-emerald-700">
                {formatMoney(product.priceCents, product.currencySymbol)}
              </span>
              {product.originalPriceCents && product.originalPriceCents > (product.priceCents || 0) ? (
                <span className="text-[10px] text-slate-400 line-through">
                  {formatMoney(product.originalPriceCents, product.currencySymbol)}
                </span>
              ) : null}
            </div>

            {product.score !== undefined && product.score !== null ? (
              <span className="text-[10px] font-medium text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-amber-500 fill-current" />
                Score: {product.score}
              </span>
            ) : null}
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1 text-[10px]">
          <div className="truncate max-w-[90px] text-[10px] text-slate-500">
            {product.sellerName || 'TikTok Shop'}
          </div>

          <div className="flex items-center gap-1">
            {product.video ? (
              <>
                <button
                  type="button"
                  onClick={() => onOpenScriptModal?.(product)}
                  className="px-2 py-1 rounded bg-white text-amber-800 font-bold border border-slate-200 hover:bg-slate-50 shadow-sm flex items-center gap-1"
                  title="Gerar Roteiro"
                >
                  <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                  Roteiro
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAnalysisModal?.(product)}
                  className="px-2 py-1 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200 hover:bg-amber-100"
                  title="Analisar"
                >
                  Analisar
                </button>
              </>
            ) : null}

            {product.productUrl ? (
              <a
                href={product.productUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2 py-1 rounded bg-slate-100 text-slate-700 hover:text-slate-900 font-bold border border-slate-200 flex items-center gap-0.5"
              >
                Ver <ExternalLink className="w-2.5 h-2.5" />
              </a>
            ) : null}
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
  onOpenScriptModal?: (p: ProductMinerProduct) => void;
  onOpenAnalysisModal?: (p: ProductMinerProduct) => void;
  onOpenDownloadModal?: (p: ProductMinerProduct) => void;
}> = ({
  product,
  position,
  rankingSort,
  isMentor,
  onOpenScriptModal,
  onOpenAnalysisModal,
  onOpenDownloadModal,
}) => {
  const [linkCopied, setLinkCopied] = useState(false);
  const show24h = product.sales24h !== undefined && product.sales24h !== null;
  const show7d = product.sales7d !== undefined && product.sales7d !== null;
  const isSpikingRanking = rankingSort === 'spiking';
  const isVideoPrepared = Boolean(product.videoDownload?.isPrepared);

  const handleCopyVideoLink = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.video?.url) {
      navigator.clipboard.writeText(product.video.url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  return (
    <article className="group rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-amber-400/70 transition-all flex flex-col h-full text-slate-900">
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden shrink-0 border-b border-slate-100">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
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

        {product.discountPercent ? (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-rose-600 text-white text-xs font-black shadow-sm">
            -{product.discountPercent}%
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
        {product.estimatedCommissionCents ? (
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black self-start">
            Ganhe {formatMoney(product.estimatedCommissionCents, product.currencySymbol)} por venda
          </div>
        ) : product.commissionRatePercent ? (
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black self-start">
            Comissão {product.commissionRatePercent}%
          </div>
        ) : null}

        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-lg font-black text-emerald-700">
              {formatMoney(product.priceCents, product.currencySymbol)}
            </div>

            {product.originalPriceCents && product.originalPriceCents > (product.priceCents || 0) ? (
              <div className="text-[11px] text-slate-400 line-through">
                {formatMoney(product.originalPriceCents, product.currencySymbol)}
              </div>
            ) : null}
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
              <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => onOpenScriptModal?.(product)}
                  className="py-1.5 px-2 rounded-lg bg-white border border-slate-200 text-amber-800 hover:bg-slate-50 font-bold flex items-center justify-center gap-1 transition-all shadow-sm"
                >
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  ✨ Gerar Roteiro
                </button>

                <button
                  type="button"
                  onClick={() => onOpenAnalysisModal?.(product)}
                  className="py-1.5 px-2 rounded-lg bg-white border border-amber-200 text-slate-800 hover:bg-amber-50 font-bold flex items-center justify-center gap-1 transition-all"
                >
                  <BarChart3 className="w-3 h-3 text-amber-600" />
                  🔍 Analisar
                </button>
              </div>

              <div className={`grid ${isMentor ? 'grid-cols-3' : 'grid-cols-2'} gap-1 text-[10px]`}>
                {product.video.url ? (
                  <a
                    href={product.video.url}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1 px-1.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:text-slate-900 font-bold flex items-center justify-center gap-1 truncate"
                  >
                    <Play className="w-3 h-3 text-amber-600" />
                    Assistir
                  </a>
                ) : null}

                <button
                  type="button"
                  onClick={handleCopyVideoLink}
                  className="py-1 px-1.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:text-slate-900 font-bold flex items-center justify-center gap-1 truncate"
                >
                  {linkCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                  {linkCopied ? 'Copiado' : 'Copiar'}
                </button>

                {isMentor ? (
                  <button
                    type="button"
                    onClick={() => onOpenDownloadModal?.(product)}
                    className={`py-1 px-1.5 rounded-md border font-bold flex items-center justify-center gap-1 truncate transition-all ${
                      isVideoPrepared
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900'
                    }`}
                    title={
                      isVideoPrepared
                        ? 'Baixar vídeo (.mp4)'
                        : 'Preparar download do vídeo'
                    }
                  >
                    <Download className={`w-3 h-3 ${isVideoPrepared ? 'text-emerald-600' : 'text-amber-600'}`} />
                    {isVideoPrepared ? 'Baixar' : 'Preparar'}
                  </button>
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
          {product.productUrl ? (
            <a
              href={product.productUrl}
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

  const [mode, setModeState] = useState<'search' | 'ranking' | 'collector'>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('gzp_miner_mode');
      if (saved === 'search' || saved === 'ranking' || saved === 'collector') {
        return saved;
      }
    }
    return 'search';
  });

  const setMode = (newMode: 'search' | 'ranking' | 'collector') => {
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
  const [downloadModalProduct, setDownloadModalProduct] = useState<ProductMinerProduct | null>(null);

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
    let list = mode === 'ranking' ? ranking : products;

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
    }

    return copy;
  }, [products, ranking, mode, selectedCategory, selectedSubcategory, hasVideoOnly, viralVideoOnly, selectedClassification]);

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

  const currentRenderProducts = useMemo(() => {
    if (mode === 'ranking') {
      const start = (safeRankingPage - 1) * 30;
      return displayProducts.slice(start, start + 30);
    }
    return displayProducts;
  }, [displayProducts, mode, safeRankingPage]);

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
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900">
              Minerar Produtos TikTok Shop
            </h1>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold">
              🇧🇷 Região BR
            </span>
          </div>
        </div>

        {/* Search Input Bar */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) =>
                e.key === 'Enter' &&
                runSearch(query, 1, false)
              }
              placeholder="Ex.: beleza, air fryer, vestido, relógio..."
              className="w-full h-10 sm:h-11 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white focus:bg-white pl-10 pr-4 text-xs sm:text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-sm transition-all"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => runSearch(query, 1, false)}
              disabled={loading || query.trim().length === 1}
              className="flex-1 sm:flex-none h-10 sm:h-11 px-5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
              ) : (
                <Database className="w-4 h-4 text-amber-600" />
              )}
              Pesquisar
            </button>

            {canRefresh ? (
              <button
                onClick={() => runSearch(query, 1, true)}
                disabled={loading || query.trim().length < 2}
                className="h-10 sm:h-11 px-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-xs font-black disabled:opacity-50 flex items-center justify-center gap-1.5 hover:bg-amber-100 transition-all"
                title="Esta ação consulta a SocialCrawl e pode consumir 1 crédito."
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    loading ? 'animate-spin' : ''
                  }`}
                />
                <span className="hidden md:inline">SocialCrawl • 1 crédito</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* ================================================== */}
      {/* 1 — CLASSIFICAÇÕES DE PRODUTOS (TIKTOK SHOP STYLE) */}
      {/* ================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Classificações de Produtos
          </span>
        </div>

        {/* Horizontal scrollable row of classification icons (~4 visible on mobile + peek of 5th) */}
        <div className="flex items-start justify-between sm:justify-start gap-2 sm:gap-5 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x">
          {CLASSIFICATIONS.map((c) => {
            const isActive = selectedClassification === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedClassification(c.id)}
                className="flex flex-col items-center shrink-0 w-[78px] sm:w-[90px] md:w-auto group focus:outline-none snap-start"
              >
                <ClassificationIconComponent item={c} isActive={isActive} />
                <span
                  className={`text-[11px] font-bold text-center mt-1.5 leading-tight max-w-[80px] transition-colors ${
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

      {/* ================================================== */}
      {/* 2 — CATEGORIAS E SUBCATEGORIAS TIKTOK SHOP          */}
      {/* ================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-600">Categorias:</span>
          {selectedCategory && selectedCategory !== 'Todos' ? (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('Todos');
                setSelectedSubcategory('Todas');
              }}
              className="text-[10px] font-bold text-rose-600 hover:underline"
            >
              Limpar filtro
            </button>
          ) : null}
        </div>

        {/* Categories Pills Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x">
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 border transition-all snap-start whitespace-nowrap ${
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

        {/* Subcategories Horizontal Scroll Row (Renders when a main category is selected) */}
        {activeCategoryConfig ? (
          <div className="pt-2 border-t border-slate-100 space-y-1.5 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Subcategorias de <span className="font-black text-slate-800">{activeCategoryConfig.label}</span>:
              </span>
              {selectedSubcategory && selectedSubcategory !== 'Todas' ? (
                <button
                  type="button"
                  onClick={() => setSelectedSubcategory('Todas')}
                  className="text-[10px] font-bold text-amber-700 hover:underline"
                >
                  Ver todas de {activeCategoryConfig.label}
                </button>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x">
              {activeCategoryConfig.subcategories.map((subcat) => {
                const isSubActive = selectedSubcategory === subcat;
                return (
                  <button
                    key={subcat}
                    type="button"
                    onClick={() => setSelectedSubcategory(subcat)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold shrink-0 border transition-all snap-start whitespace-nowrap ${
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
        ) : null}
      </div>

      {/* ================================================== */}
      {/* 3 — MODES & ADVANCED FILTERS BAR                   */}
      {/* ================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-xl border border-slate-200 bg-white shadow-sm self-start">
          <button
            onClick={() => setMode('search')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              mode === 'search'
                ? 'bg-amber-500/15 text-amber-800 font-black border border-amber-300/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Pesquisa
          </button>

          <button
            onClick={() => setMode('ranking')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              mode === 'ranking'
                ? 'bg-amber-500/15 text-amber-800 font-black border border-amber-300/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Ranking
          </button>

          {canRefresh ? (
            <button
              onClick={() => setMode('collector')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                mode === 'collector'
                  ? 'bg-amber-500/15 text-amber-800 font-black border border-amber-300/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              Coletor
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {/* Advanced Filters Toggle Button */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
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

          {credits && mode === 'search' ? (
            <span className="text-[11px] text-slate-500 hidden md:inline">
              {credits.source === 'provider' ? `${credits.used} crédito` : '0 crédito'}
            </span>
          ) : null}
        </div>
      </div>

      {/* Advanced Filters Drawer Panel */}
      {showAdvancedFilters ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-md animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-amber-500" /> Filtros e Métricas Adicionais
            </span>
            <button
              onClick={() => {
                setSelectedCategory('Todos');
                setSelectedSubcategory('Todas');
                setHasVideoOnly(false);
                setViralVideoOnly(false);
              }}
              className="text-[11px] text-rose-600 hover:underline font-bold"
            >
              Limpar Todos
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sort mode selector for ranking */}
            {mode === 'ranking' ? (
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-600 font-bold">Métrica do Ranking:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {RANKING_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setRankingSort(f.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                        rankingSort === f.id
                          ? 'border-amber-400 bg-amber-50 text-amber-800'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Video filters */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-600 font-bold">Filtros de Vídeo:</span>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setHasVideoOnly((p) => !p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                    hasVideoOnly
                      ? 'border-amber-300 bg-amber-50 text-amber-900'
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
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Flame className="w-3 h-3 text-amber-500 fill-current" />
                  Vídeo viral (1M+ views)
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ================================================== */}
      {/* 4 — LISTA / FEED DE PRODUTOS                       */}
      {/* ================================================== */}
      {mode === 'search' || mode === 'ranking' ? (
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

          {/* Estado de Lista Vazia por Filtros (Somente quando NÃO houver Erro) */}
          {!(loading || rankingLoading) && !error && displayProducts.length === 0 ? (
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
              {/* Mobile View: Compact Vertical List (TikTok Shop inspired layout) */}
              <div className="block sm:hidden space-y-2.5">
                {currentRenderProducts.map((product, index) => {
                  const globalPos = mode === 'ranking' ? (rankingPage - 1) * 30 + index + 1 : index + 1;
                  return (
                    <MobileProductCard
                      key={product.productId}
                      product={product}
                      position={globalPos}
                      rankingSort={rankingSort}
                      isMentor={canRefresh}
                      onOpenScriptModal={(p) => setScriptModalProduct(p)}
                      onOpenAnalysisModal={(p) => setAnalysisModalProduct(p)}
                      onOpenDownloadModal={(p) => setDownloadModalProduct(p)}
                    />
                  );
                })}
              </div>

              {/* Desktop View: Full Rich Grid */}
              <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {currentRenderProducts.map((product, index) => {
                  const globalPos = mode === 'ranking' ? (rankingPage - 1) * 30 + index + 1 : index + 1;
                  return (
                    <ProductCard
                      key={product.productId}
                      product={product}
                      position={globalPos}
                      rankingSort={rankingSort}
                      isMentor={canRefresh}
                      onOpenScriptModal={(p) => setScriptModalProduct(p)}
                      onOpenAnalysisModal={(p) => setAnalysisModalProduct(p)}
                      onOpenDownloadModal={(p) => setDownloadModalProduct(p)}
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

              {/* Pagination controls for Ranking mode */}
              {mode === 'ranking' && totalRankingPages > 1 ? (
                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    disabled={rankingPage <= 1}
                    onClick={() => {
                      setRankingPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 350, behavior: 'smooth' });
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-50 shadow-sm transition-all"
                  >
                    Anterior
                  </button>

                  <span className="text-xs text-slate-600 font-semibold bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm">
                    Página {rankingPage} de {totalRankingPages}
                  </span>

                  <button
                    disabled={rankingPage >= totalRankingPages}
                    onClick={() => {
                      setRankingPage((p) => Math.min(totalRankingPages, p + 1));
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
        /* PAINEL DO COLETOR (MENTOR ONLY) */
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-amber-700 text-xs font-black uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Painel do Coletor • Mentor
                </div>

                <h2 className="mt-1 text-xl md:text-2xl font-black text-slate-900">
                  Base Geração Z Pro
                </h2>

                <p className="mt-1 text-xs md:text-sm text-slate-600">
                  Os alunos consultam estes dados sem consumir créditos.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 font-bold">
                  8 Categorias Monitoradas
                </span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-700">
                Quantidade por Categoria (Individual):
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { count: 30, credits: 'até 1 crédito' },
                  { count: 90, credits: 'até 3 créditos' },
                  { count: 150, credits: 'até 5 créditos' },
                  { count: 300, credits: 'até 10 créditos' },
                ].map((opt) => (
                  <button
                    key={opt.count}
                    onClick={() => setSelectedMaxProducts(opt.count)}
                    disabled={Boolean(refreshingCategory) || isDailyRefreshing}
                    className={`px-3 py-2 rounded-xl text-xs font-black border transition-all text-center ${
                      selectedMaxProducts === opt.count
                        ? 'border-amber-400 bg-amber-50 text-amber-900 shadow-sm font-black'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <div>{opt.count} produtos</div>
                    <div className="text-[10px] font-normal opacity-80">
                      {opt.credits}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card Especial: Atualização Diária da Base */}
          <div className="rounded-2xl border border-amber-200 bg-white p-5 md:p-6 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-amber-700 text-xs font-black uppercase tracking-wider">
                  <RefreshCw className={`w-4 h-4 text-amber-600 ${isDailyRefreshing ? 'animate-spin' : ''}`} />
                  Atualização Diária da Base • 8 Categorias
                </div>
                <h3 className="mt-1 text-lg font-black text-slate-900">
                  Atualizar Todas as Categorias em Sequência
                </h3>
                <p className="mt-1 text-xs text-slate-600 max-w-2xl">
                  Atualiza as 8 categorias oficiais (Beleza, Casa, Moda, Cozinha, Eletrônicos, Fitness, Bebê, Pet) em lote, coletando até 90 produtos por categoria (3 páginas por categoria) e consumindo até 24 créditos SocialCrawl.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDailyConfirmModal(true)}
                disabled={isDailyRefreshing || Boolean(dailyStatus?.isCooldownActive) || Boolean(refreshingCategory)}
                className={`px-5 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all ${
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
                    <span>Atualizando base ({dailyStatus?.categoriesProcessed ?? 0}/8)...</span>
                  </>
                ) : dailyStatus?.isCooldownActive ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Base atualizada hoje ✅</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>🔄 Atualizar todas as categorias • até 24 créditos</span>
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

          {collectorNotice ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{collectorNotice}</span>
              </div>

              <button
                onClick={() => setCollectorNotice(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : null}

          {collectorLoading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {collectorCategories.map((cat) => (
                <div
                  key={cat.category}
                  className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4 hover:border-amber-300 shadow-sm transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700">
                          {getCategoryIcon(cat.category)}
                        </div>

                        <h3 className="font-extrabold text-base text-slate-900">
                          {cat.category}
                        </h3>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${
                          cat.status === 'Ativa'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}
                      >
                        {cat.status === 'Ativa'
                          ? 'Base Ativa'
                          : 'Pendente'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-slate-800 font-bold">
                        {cat.productCount}{' '}
                        {cat.productCount === 1
                          ? 'produto armazenado'
                          : 'produtos armazenados'}
                      </div>

                      <div className="text-[11px] text-slate-500 font-medium">
                        {formatCollectionDate(cat.lastCollectedAt)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setConfirmModalCategory(cat.category)}
                    disabled={refreshingCategory === cat.category}
                    className="w-full py-2.5 px-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-black flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {refreshingCategory === cat.category ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Coletando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        Atualizar até {selectedMaxProducts} • máx.{' '}
                        {selectedMaxProducts === 30
                          ? '1 crédito'
                          : `${Math.ceil(selectedMaxProducts / 30)} créditos`}
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

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

      <VideoDownloadModal
        isOpen={Boolean(downloadModalProduct)}
        onClose={() => setDownloadModalProduct(null)}
        product={downloadModalProduct}
        studentCode={studentCode}
        isMentor={canRefresh}
        onVideoPrepared={(productId, directUrl) => {
          setProducts((prev) =>
            prev.map((p) =>
              p.productId === productId
                ? { ...p, videoDownload: { isPrepared: true, directMediaUrl: directUrl, status: 'COMPLETED' } }
                : p
            )
          );
          setRanking((prev) =>
            prev.map((p) =>
              p.productId === productId
                ? { ...p, videoDownload: { isPrepared: true, directMediaUrl: directUrl, status: 'COMPLETED' } }
                : p
            )
          );
        }}
      />
    </section>
  );
};
