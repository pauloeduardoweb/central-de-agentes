/**
 * Intelligent product deduplication utility for the Product Miner.
 *
 * Normalizes product titles to identify identical products from different sellers/sources
 * while strictly preserving distinct variants (e.g. capacities 256GB vs 512GB, kit sizes kit 3 vs kit 5, volumes 50ml vs 100ml, model generations iPhone 15 vs iPhone 16).
 *
 * Chooses the best representative product based on:
 * 1. soldCount (DESC)
 * 2. rating (DESC)
 * 3. Video presence / views (DESC)
 * 4. Data completeness (DESC)
 * 5. lastSeenAt (DESC)
 */

const COMMERCIAL_NOISE_WORDS = [
  'promocao',
  'promocoes',
  'promocional',
  'oferta',
  'ofertas',
  'super oferta',
  'original oficial',
  '100 original',
  '100% original',
  'original',
  'oficial',
  'envio imediato',
  'pronta entrega',
  'entrega rapida',
  'frete gratis',
  'frete gratuito',
  'queima de estoque',
  'lancamento',
  'novo',
  'nova',
  'novos',
  'novas',
  'barato',
  'barata',
  'compre 1 leve 2',
  'compre 2 leve 3',
  'compre um leve dois',
  'imperdivel',
  'liquidacao',
  'garantia',
  'qualidade premium',
  'alta qualidade',
  'super qualidade',
  'brinde',
  'combo',
  'compre ja',
  'exclusivo',
  'tendencia',
  'viral',
  'tiktok',
  'atacado',
  'varejo',
  'direto da fabrica',
];

/**
 * Normalizes a string: removes accents, lowers case, trims extra whitespace
 */
export function normalizeTextForDedup(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Generates a canonical deduplication key for a product title.
 * Preserves key specs (GB, TB, kit numbers, ml, kg, model numbers) while stripping commercial noise.
 */
export function getProductCanonicalKey(title: string, sellerId?: string | null): string {
  if (!title) return '';

  let norm = normalizeTextForDedup(title);

  // Replace common punctuation with spaces
  norm = norm.replace(/[-_.,/|()[\]{}:;!?"'+*&#]/g, ' ');

  // Standardize common unit formats to preserve them uniformly
  norm = norm.replace(/\b(\d+)\s*(gb|tb|mb|g|kg|ml|l|cm|mm|m|w|v|mah|fps|hz)\b/gi, '$1$2');
  norm = norm.replace(/\bkit\s*(\d+)\b/gi, 'kit$1');
  norm = norm.replace(/\b(\d+)\s*unidades?\b/gi, 'kit$1');
  norm = norm.replace(/\b(\d+)\s*pecas?\b/gi, 'kit$1');
  norm = norm.replace(/\b(\d+)\s*pcs?\b/gi, 'kit$1');

  // Tokenize
  const tokens = norm.split(/\s+/).filter(Boolean);

  // Filter out commercial noise words while preserving numeric models and specs
  const filteredTokens: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const twoWord = i < tokens.length - 1 ? `${token} ${tokens[i + 1]}` : '';

    if (COMMERCIAL_NOISE_WORDS.includes(twoWord)) {
      i++; // Skip next token too
      continue;
    }

    if (COMMERCIAL_NOISE_WORDS.includes(token)) {
      continue;
    }

    // Keep token
    filteredTokens.push(token);
  }

  const finalKey = filteredTokens.join(' ').trim();
  return finalKey.length >= 3 ? finalKey : norm;
}

export interface DedupableProduct {
  productId?: string;
  id?: string;
  title: string;
  soldCount?: number | null;
  rating?: number | null;
  priceCents?: number | null;
  imageUrl?: string | null;
  sellerId?: string | null;
  sellerName?: string | null;
  lastSeenAt?: string | null;
  video?: {
    url?: string | null;
    id?: string | null;
    views?: number | null;
  } | null;
  associatedVideos?: Array<{
    url?: string | null;
    id?: string | null;
    views?: number | null;
  }>;
}

/**
 * Computes a quality/priority score to pick the best representative among duplicate products.
 */
function getProductRepresentativeScore(p: DedupableProduct): number {
  let score = 0;

  // 1. Sales volume (primary weight)
  const sales = Number(p.soldCount || 0);
  score += sales * 10;

  // 2. Rating (secondary weight)
  const rating = Number(p.rating || 0);
  score += rating * 100;

  // 3. Video presence and views
  const hasVideo = Boolean(
    p.video?.url ||
    p.video?.id ||
    (p.associatedVideos && p.associatedVideos.length > 0)
  );
  if (hasVideo) score += 500;

  const topViews = Math.max(
    Number(p.video?.views || 0),
    ...(p.associatedVideos || []).map((v) => Number(v.views || 0))
  );
  score += Math.min(topViews / 1000, 1000); // capped views bonus

  // 4. Data completeness
  if (p.imageUrl) score += 50;
  if (p.priceCents && p.priceCents > 0) score += 50;
  if (p.sellerName) score += 20;

  // 5. Freshness
  if (p.lastSeenAt) {
    const timestamp = new Date(p.lastSeenAt).getTime();
    if (!isNaN(timestamp)) {
      // Add up to 50 points for recency in last 30 days
      const daysOld = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
      score += Math.max(0, 50 - daysOld);
    }
  }

  return score;
}

/**
 * Deduplicates an array of products by grouping on canonical title key and selecting the best representative.
 * Retains the original list order based on the position of the first or highest scoring item in each group.
 */
export function deduplicateProducts<T extends DedupableProduct>(
  products: T[],
  options?: { preserveOriginalOrder?: boolean }
): T[] {
  if (!Array.isArray(products) || products.length <= 1) {
    return products || [];
  }

  const groups = new Map<string, T[]>();
  const firstIndexMap = new Map<string, number>();

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const key = getProductCanonicalKey(p.title || '', p.sellerId);

    if (!groups.has(key)) {
      groups.set(key, []);
      firstIndexMap.set(key, i);
    }
    groups.get(key)!.push(p);
  }

  const deduped: T[] = [];

  for (const [key, group] of groups.entries()) {
    if (group.length === 1) {
      deduped.push(group[0]);
    } else {
      // Pick best representative
      let best = group[0];
      let bestScore = getProductRepresentativeScore(best);

      for (let j = 1; j < group.length; j++) {
        const candidate = group[j];
        const score = getProductRepresentativeScore(candidate);
        if (score > bestScore) {
          best = candidate;
          bestScore = score;
        }
      }

      // Merge associated videos from all duplicates to give the user the best enriched experience
      const allVideos = [
        ...(best.associatedVideos || []),
        ...(best.video ? [best.video] : []),
      ];
      for (const item of group) {
        if (item === best) continue;
        if (item.video && !allVideos.some((v) => v.id === item.video?.id || v.url === item.video?.url)) {
          allVideos.push(item.video);
        }
        if (item.associatedVideos) {
          for (const av of item.associatedVideos) {
            if (!allVideos.some((v) => v.id === av.id || v.url === av.url)) {
              allVideos.push(av);
            }
          }
        }
      }

      const mergedBest = {
        ...best,
        associatedVideos: allVideos.length > 0 ? allVideos : best.associatedVideos,
      };

      deduped.push(mergedBest as T);
    }
  }

  if (options?.preserveOriginalOrder !== false) {
    // Preserve the original ordering index of the representative's group
    deduped.sort((a, b) => {
      const keyA = getProductCanonicalKey(a.title || '', a.sellerId);
      const keyB = getProductCanonicalKey(b.title || '', b.sellerId);
      return (firstIndexMap.get(keyA) ?? 0) - (firstIndexMap.get(keyB) ?? 0);
    });
  }

  return deduped;
}
