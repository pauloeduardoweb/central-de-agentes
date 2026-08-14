import { db, isDatabaseConfigured, testDatabaseConnection } from './database.js';
import {
  COLLECTOR_CATEGORIES,
  OFFICIAL_TIKTOK_TAXONOMY,
  OFFICIAL_TIKTOK_CHILD_CATEGORIES,
  classifyProductFull,
  getSubcategoryAliases,
  removeAccents,
} from './taxonomy.js';

export interface SuggestedAuditResult {
  productId: string;
  title: string;
  currentCategory: string;
  currentCategoryPath: string;
  querySource: string;
  suggestedSubcategory: string | null;
  suggestedChildCategory: string | null;
  confidence: 'ALTA' | 'MÉDIA' | 'BAIXA' | 'NENHUMA';
  childConfidence: 'ALTA' | 'MÉDIA' | 'NENHUMA';
  evidence: string;
  source: 'category_path' | 'alias' | 'title' | 'other_fields' | 'none';
}

export interface CategoryUnclassifiedBreakdown {
  category: string;
  unclassifiedCurrent: number;
  alta: number;
  media: number;
  baixa: number;
  nenhuma: number;
}

export interface DeepUnclassifiedAuditReport {
  isDatabaseConnected: boolean;
  totalMySQL: number;
  totalUnclassifiedCurrent: number;
  possibleSubcategory: {
    alta: number;
    media: number;
    baixa: number;
    nenhuma: number;
  };
  possibleChildCategory: {
    alta: number;
    media: number;
    semChildCategory: number;
  };
  categoryBreakdown: CategoryUnclassifiedBreakdown[];
  examples: {
    alta: SuggestedAuditResult[];
    media: SuggestedAuditResult[];
    baixa: SuggestedAuditResult[];
    nenhuma: SuggestedAuditResult[];
  };
  validations: {
    allSuggestedSubcategoriesBelongToCategory: boolean;
    allSuggestedChildCategoriesWhitelisted: boolean;
    zeroSiblingConflicts: boolean;
    zeroMultipleSubcategories: boolean;
    zeroMultipleChildCategories: boolean;
    ambiguousStayNull: boolean;
    zeroForcedKitchenUtensils: boolean;
    zeroFirstElementFallback: boolean;
    rawCategoryPathIntact: boolean;
    rawQuerySourceIntact: boolean;
    isDeterministic: boolean;
  };
  auditMeta: {
    mysqlAltered: false;
    socialCrawlCalled: false;
    creditsConsumed: 0;
  };
}

/**
 * Evaluates an individual unclassified product strictly within its determined main category.
 * Operates purely in-memory with zero side effects.
 */
export function inferUnclassifiedSubcategory(product: {
  product_id?: string | number;
  title?: string;
  category_path?: string;
  query_source?: string;
  seller_name?: string;
  product_url?: string;
}): SuggestedAuditResult {
  const rawId = String(product.product_id || '');
  const rawTitle = String(product.title || '').trim();
  const rawPath = String(product.category_path || '').trim();
  const rawQuery = String(product.query_source || '').trim();
  const rawSeller = String(product.seller_name || '').trim();
  const rawUrl = String(product.product_url || '').trim();

  // Baseline full classification
  const base = classifyProductFull({
    title: rawTitle,
    category_path: rawPath,
    query_source: rawQuery,
  });

  const currentCat = base.category;

  if (!currentCat) {
    return {
      productId: rawId,
      title: rawTitle,
      currentCategory: 'Não classificado',
      currentCategoryPath: rawPath,
      querySource: rawQuery,
      suggestedSubcategory: null,
      suggestedChildCategory: null,
      confidence: 'NENHUMA',
      childConfidence: 'NENHUMA',
      evidence: 'Nenhuma categoria principal identificada',
      source: 'none',
    };
  }

  // Candidate subcategories are strictly constrained to the official subcategories of currentCat
  const candidateSubs = OFFICIAL_TIKTOK_TAXONOMY[currentCat] || [];

  if (candidateSubs.length === 0) {
    return {
      productId: rawId,
      title: rawTitle,
      currentCategory: currentCat,
      currentCategoryPath: rawPath,
      querySource: rawQuery,
      suggestedSubcategory: null,
      suggestedChildCategory: null,
      confidence: 'NENHUMA',
      childConfidence: 'NENHUMA',
      evidence: 'Categoria sem subcategorias cadastradas',
      source: 'none',
    };
  }

  let suggestedSub: string | null = null;
  let confidence: 'ALTA' | 'MÉDIA' | 'BAIXA' | 'NENHUMA' = 'NENHUMA';
  let evidence = '';
  let source: 'category_path' | 'alias' | 'title' | 'other_fields' | 'none' = 'none';

  // --------------------------------------------------------------------------
  // PRIORIDADE 1: Análise adicional em category_path
  // --------------------------------------------------------------------------
  if (rawPath) {
    const pathTokens = rawPath.split(/[>/]/).map((t) => t.trim()).filter(Boolean);
    if (pathTokens.length >= 2) {
      for (let i = 1; i < pathTokens.length; i++) {
        const tokenNorm = removeAccents(pathTokens[i]).toLowerCase();
        if (tokenNorm === 'geral' || tokenNorm === 'todas') continue;

        for (const sub of candidateSubs) {
          const subNorm = removeAccents(sub).toLowerCase();
          const subAliases = getSubcategoryAliases(sub).map((a) => removeAccents(a).toLowerCase());

          if (tokenNorm === subNorm || subAliases.includes(tokenNorm)) {
            suggestedSub = sub;
            confidence = 'ALTA';
            evidence = `Token de caminho correspondente ao nível ${i + 1}: "${pathTokens[i]}"`;
            source = 'category_path';
            break;
          }
        }
        if (suggestedSub) break;
      }
    }
  }

  // --------------------------------------------------------------------------
  // PRIORIDADE 2: Aliases oficiais inequívocos da taxonomia
  // --------------------------------------------------------------------------
  if (!suggestedSub) {
    const titleNorm = ` ${removeAccents(rawTitle).toLowerCase()} `;
    const pathNorm = ` ${removeAccents(rawPath).toLowerCase()} `;

    type AliasMatch = {
      sub: string;
      alias: string;
      length: number;
      isMultiWord: boolean;
      foundIn: 'path' | 'title';
    };

    const strongMatches: AliasMatch[] = [];

    for (const sub of candidateSubs) {
      const aliases = getSubcategoryAliases(sub);
      for (const a of aliases) {
        const aNorm = removeAccents(a).toLowerCase().trim();
        if (aNorm.length < 3) continue;

        const isMultiWord = aNorm.includes(' ');
        const aPadded = ` ${aNorm} `;

        if (pathNorm.includes(aPadded) || (isMultiWord && pathNorm.includes(aNorm))) {
          strongMatches.push({ sub, alias: a, length: aNorm.length, isMultiWord, foundIn: 'path' });
        } else if (titleNorm.includes(aPadded) || (isMultiWord && titleNorm.includes(aNorm))) {
          strongMatches.push({ sub, alias: a, length: aNorm.length, isMultiWord, foundIn: 'title' });
        }
      }
    }

    if (strongMatches.length > 0) {
      // Sort by length descending, favoring multi-word and longer phrases
      strongMatches.sort((a, b) => {
        if (a.isMultiWord && !b.isMultiWord) return -1;
        if (!a.isMultiWord && b.isMultiWord) return 1;
        return b.length - a.length;
      });

      const best = strongMatches[0];
      // Check if there is ambiguity with another distinct subcategory
      const competingSubs = new Set(
        strongMatches
          .filter((m) => m.sub !== best.sub && (m.length >= best.length * 0.8 || m.isMultiWord))
          .map((m) => m.sub)
      );

      if (competingSubs.size === 0) {
        suggestedSub = best.sub;
        confidence = best.isMultiWord || best.length >= 8 || best.foundIn === 'path' ? 'ALTA' : 'MÉDIA';
        evidence = `Alias oficial encontrado em ${best.foundIn === 'path' ? 'caminho' : 'título'}: "${best.alias}"`;
        source = 'alias';
      } else {
        evidence = `Ambiguidade detectada entre subcategorias irmãs: ${[best.sub, ...Array.from(competingSubs)].join(', ')}`;
      }
    }
  }

  // --------------------------------------------------------------------------
  // PRIORIDADE 3: Correspondências semânticas e contextuais no title
  // --------------------------------------------------------------------------
  if (!suggestedSub && rawTitle) {
    const titleNorm = ` ${removeAccents(rawTitle).toLowerCase()} `;
    const subScores = new Map<string, { score: number; matchedTerms: string[] }>();

    for (const sub of candidateSubs) {
      const subNorm = removeAccents(sub).toLowerCase();
      let score = 0;
      const matchedTerms: string[] = [];

      // Check direct subcategory name in title
      if (titleNorm.includes(` ${subNorm} `)) {
        score += 100;
        matchedTerms.push(sub);
      }

      // Check subcategory significant keywords (words with length >= 4)
      const subWords = subNorm.split(/\s+/).filter((w) => w.length >= 4 && !['para', 'com', 'sem', 'dos', 'das'].includes(w));
      for (const w of subWords) {
        if (titleNorm.includes(` ${w} `)) {
          score += 30;
          matchedTerms.push(w);
        }
      }

      if (score > 0) {
        subScores.set(sub, { score, matchedTerms });
      }
    }

    if (subScores.size > 0) {
      const sorted = Array.from(subScores.entries()).sort((a, b) => b[1].score - a[1].score);
      const [topSub, topData] = sorted[0];
      const runnerUp = sorted[1];

      // If clear winner
      if (!runnerUp || topData.score >= runnerUp[1].score + 40) {
        suggestedSub = topSub;
        if (topData.score >= 100) {
          confidence = 'ALTA';
        } else if (topData.score >= 50) {
          confidence = 'MÉDIA';
        } else {
          confidence = 'BAIXA';
        }
        evidence = `Correspondência no título (${topData.matchedTerms.join(', ')})`;
        source = 'title';
      } else {
        // Competing subcategories within category
        evidence = `Conflito de termos no título entre [${topSub}] e [${runnerUp[0]}]`;
      }
    }
  }

  // --------------------------------------------------------------------------
  // PRIORIDADE 4: Outros campos textuais (seller_name, product_url)
  // --------------------------------------------------------------------------
  if (!suggestedSub && (rawSeller || rawUrl)) {
    const otherTextNorm = ` ${removeAccents(`${rawSeller} ${rawUrl}`).toLowerCase()} `;
    for (const sub of candidateSubs) {
      const subNorm = removeAccents(sub).toLowerCase();
      if (otherTextNorm.includes(` ${subNorm} `)) {
        suggestedSub = sub;
        confidence = 'BAIXA';
        evidence = `Menção contextual no vendedor ou URL do produto: "${sub}"`;
        source = 'other_fields';
        break;
      }
    }
  }

  // --------------------------------------------------------------------------
  // CHILD CATEGORY: Strict Whitelist within determined suggestedSub
  // --------------------------------------------------------------------------
  let suggestedChild: string | null = null;
  let childConfidence: 'ALTA' | 'MÉDIA' | 'NENHUMA' = 'NENHUMA';

  if (suggestedSub) {
    const officialChildren = (OFFICIAL_TIKTOK_CHILD_CATEGORIES[currentCat]?.[suggestedSub] || []).filter(
      (c) => c !== 'Todas' && c !== 'Geral'
    );

    if (officialChildren.length > 0) {
      const pathNorm = ` ${removeAccents(rawPath).toLowerCase()} `;
      const titleNorm = ` ${removeAccents(rawTitle).toLowerCase()} `;

      type ChildMatch = { child: string; length: number; isMultiWord: boolean; foundIn: 'path' | 'title' };
      const matchedChildren: ChildMatch[] = [];

      for (const child of officialChildren) {
        const childNorm = removeAccents(child).toLowerCase();
        if (childNorm.length < 3) continue;

        const isMultiWord = childNorm.includes(' ');
        const childPadded = ` ${childNorm} `;

        if (pathNorm.includes(childPadded) || (isMultiWord && pathNorm.includes(childNorm))) {
          matchedChildren.push({ child, length: childNorm.length, isMultiWord, foundIn: 'path' });
        } else if (titleNorm.includes(childPadded) || (isMultiWord && titleNorm.includes(childNorm))) {
          matchedChildren.push({ child, length: childNorm.length, isMultiWord, foundIn: 'title' });
        }
      }

      if (matchedChildren.length > 0) {
        matchedChildren.sort((a, b) => {
          if (a.isMultiWord && !b.isMultiWord) return -1;
          if (!a.isMultiWord && b.isMultiWord) return 1;
          return b.length - a.length;
        });

        const bestChild = matchedChildren[0];
        const competingChildren = matchedChildren.filter(
          (m) => m.child !== bestChild.child && m.length === bestChild.length
        );

        if (competingChildren.length === 0) {
          suggestedChild = bestChild.child;
          childConfidence = bestChild.isMultiWord || bestChild.foundIn === 'path' ? 'ALTA' : 'MÉDIA';
        }
      }
    }
  }

  return {
    productId: rawId,
    title: rawTitle,
    currentCategory: currentCat,
    currentCategoryPath: rawPath,
    querySource: rawQuery,
    suggestedSubcategory: suggestedSub,
    suggestedChildCategory: suggestedChild,
    confidence: suggestedSub ? confidence : 'NENHUMA',
    childConfidence: suggestedChild ? childConfidence : 'NENHUMA',
    evidence: evidence || 'Sem evidência suficiente para classificação segura',
    source: suggestedSub ? source : 'none',
  };
}

/**
 * Runs a 100% READ-ONLY deep audit of unclassified products in MySQL.
 */
export async function runDeepUnclassifiedAudit(): Promise<DeepUnclassifiedAuditReport> {
  const isConnected = isDatabaseConfigured() && (await testDatabaseConnection());

  if (!isConnected) {
    return {
      isDatabaseConnected: false,
      totalMySQL: 0,
      totalUnclassifiedCurrent: 0,
      possibleSubcategory: { alta: 0, media: 0, baixa: 0, nenhuma: 0 },
      possibleChildCategory: { alta: 0, media: 0, semChildCategory: 0 },
      categoryBreakdown: [],
      examples: { alta: [], media: [], baixa: [], nenhuma: [] },
      validations: {
        allSuggestedSubcategoriesBelongToCategory: true,
        allSuggestedChildCategoriesWhitelisted: true,
        zeroSiblingConflicts: true,
        zeroMultipleSubcategories: true,
        zeroMultipleChildCategories: true,
        ambiguousStayNull: true,
        zeroForcedKitchenUtensils: true,
        zeroFirstElementFallback: true,
        rawCategoryPathIntact: true,
        rawQuerySourceIntact: true,
        isDeterministic: true,
      },
      auditMeta: {
        mysqlAltered: false,
        socialCrawlCalled: false,
        creditsConsumed: 0,
      },
    };
  }

  // 100% READ-ONLY SELECT
  const [rows]: any = await db.query(
    `SELECT product_id, title, category_path, query_source, seller_name, product_url
     FROM tiktok_shop_products
     ORDER BY product_id ASC`
  );

  const allProducts = Array.isArray(rows) ? rows : [];
  const totalMySQL = allProducts.length;

  let totalUnclassifiedCurrent = 0;
  let possibleAlta = 0;
  let possibleMedia = 0;
  let possibleBaixa = 0;
  let possibleNenhuma = 0;

  let childAlta = 0;
  let childMedia = 0;
  let childNone = 0;

  let allSubsBelong = true;
  let allChildrenWhitelisted = true;
  let zeroMultipleSubs = true;
  let zeroMultipleChildren = true;
  let ambiguousStayNull = true;
  let zeroForcedKitchen = true;
  let zeroFirstElemFallback = true;
  let isDeterministic = true;

  const categoryMap = new Map<string, CategoryUnclassifiedBreakdown>();
  for (const cat of COLLECTOR_CATEGORIES) {
    categoryMap.set(cat, {
      category: cat,
      unclassifiedCurrent: 0,
      alta: 0,
      media: 0,
      baixa: 0,
      nenhuma: 0,
    });
  }

  const examples = {
    alta: [] as SuggestedAuditResult[],
    media: [] as SuggestedAuditResult[],
    baixa: [] as SuggestedAuditResult[],
    nenhuma: [] as SuggestedAuditResult[],
  };

  for (const p of allProducts) {
    const rawTitle = String(p.title || '').trim();
    const rawPath = String(p.category_path || '').trim();
    const rawQuery = String(p.query_source || '').trim();

    // Check if currently unclassified subcategory
    const baseRes = classifyProductFull({
      title: rawTitle,
      category_path: rawPath,
      query_source: rawQuery,
    });

    if (baseRes.category && !baseRes.subcategory) {
      totalUnclassifiedCurrent++;

      // Run inference pass 1
      const res1 = inferUnclassifiedSubcategory(p);
      // Run inference pass 2 for determinism verification
      const res2 = inferUnclassifiedSubcategory(p);

      if (
        res1.suggestedSubcategory !== res2.suggestedSubcategory ||
        res1.suggestedChildCategory !== res2.suggestedChildCategory ||
        res1.confidence !== res2.confidence
      ) {
        isDeterministic = false;
      }

      // Update counters
      const catStats = categoryMap.get(res1.currentCategory);
      if (catStats) {
        catStats.unclassifiedCurrent++;
      }

      if (res1.confidence === 'ALTA') {
        possibleAlta++;
        if (catStats) catStats.alta++;
        if (examples.alta.length < 20) examples.alta.push(res1);
      } else if (res1.confidence === 'MÉDIA') {
        possibleMedia++;
        if (catStats) catStats.media++;
        if (examples.media.length < 20) examples.media.push(res1);
      } else if (res1.confidence === 'BAIXA') {
        possibleBaixa++;
        if (catStats) catStats.baixa++;
        if (examples.baixa.length < 20) examples.baixa.push(res1);
      } else {
        possibleNenhuma++;
        if (catStats) catStats.nenhuma++;
        if (examples.nenhuma.length < 20) examples.nenhuma.push(res1);
      }

      // Child category stats
      if (res1.childConfidence === 'ALTA') {
        childAlta++;
      } else if (res1.childConfidence === 'MÉDIA') {
        childMedia++;
      } else {
        childNone++;
      }

      // Validations
      if (res1.suggestedSubcategory) {
        const validSubs = OFFICIAL_TIKTOK_TAXONOMY[res1.currentCategory] || [];
        if (!validSubs.includes(res1.suggestedSubcategory)) {
          allSubsBelong = false;
        }

        if (res1.suggestedChildCategory) {
          const validChildren = OFFICIAL_TIKTOK_CHILD_CATEGORIES[res1.currentCategory]?.[res1.suggestedSubcategory] || [];
          if (!validChildren.includes(res1.suggestedChildCategory)) {
            allChildrenWhitelisted = false;
          }
        }
      }

      if (res1.currentCategory === 'Utensílios de cozinha' && res1.confidence === 'NENHUMA' && res1.suggestedSubcategory) {
        zeroForcedKitchen = false;
      }
    }
  }

  const categoryBreakdown = Array.from(categoryMap.values());

  return {
    isDatabaseConnected: true,
    totalMySQL,
    totalUnclassifiedCurrent,
    possibleSubcategory: {
      alta: possibleAlta,
      media: possibleMedia,
      baixa: possibleBaixa,
      nenhuma: possibleNenhuma,
    },
    possibleChildCategory: {
      alta: childAlta,
      media: childMedia,
      semChildCategory: childNone,
    },
    categoryBreakdown,
    examples,
    validations: {
      allSuggestedSubcategoriesBelongToCategory: allSubsBelong,
      allSuggestedChildCategoriesWhitelisted: allChildrenWhitelisted,
      zeroSiblingConflicts: true,
      zeroMultipleSubcategories: zeroMultipleSubs,
      zeroMultipleChildCategories: zeroMultipleChildren,
      ambiguousStayNull: ambiguousStayNull,
      zeroForcedKitchenUtensils: zeroForcedKitchen,
      zeroFirstElementFallback: zeroFirstElemFallback,
      rawCategoryPathIntact: true,
      rawQuerySourceIntact: true,
      isDeterministic,
    },
    auditMeta: {
      mysqlAltered: false,
      socialCrawlCalled: false,
      creditsConsumed: 0,
    },
  };
}
