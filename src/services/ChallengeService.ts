import { MysteryCardChallenge, CardOption, DifficultyLevel, HookCategory, WrongHookOption } from '../types/challenge';
import { MediaService, RemoteProduct } from './MediaService';
import { MYSTERY_CARD_CHALLENGES } from '../data/challenges/mysteryCardChallenges';

export interface RemoteChallengeItem {
  id?: string | number;
  produtoId?: string | number;
  productId?: string | number;
  produto_id?: string | number;
  hookCategory?: string;
  categoriaHook?: string;
  difficulty?: string;
  nivel?: string;
  xp?: number;
  correctHook?: string;
  ganchoCorreto?: string;
  correctExplanation?: string;
  explicacaoCorreta?: string;
  wrongHooks?: Array<{ text?: string; texto?: string; explanation?: string; explicacao?: string }>;
  ganchosIncorretos?: Array<{ text?: string; texto?: string; explanation?: string; explicacao?: string }>;
  techniques?: string[];
  tecnicas?: string[];
}

const DESAFIOS_JSON_URL = 'https://midia.geracaozpro.com/desafios.json';
let cachedRemoteChallenges: RemoteChallengeItem[] | null = null;

export class ChallengeService {
  /**
   * Fetches challenges dynamically from the official challenges JSON endpoint.
   */
  public static async fetchRemoteChallenges(): Promise<RemoteChallengeItem[]> {
    if (cachedRemoteChallenges && cachedRemoteChallenges.length > 0) {
      return cachedRemoteChallenges;
    }

    try {
      const response = await fetch(DESAFIOS_JSON_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error fetching challenges: ${response.status}`);
      }

      const data = await response.json();
      const rawList: RemoteChallengeItem[] = Array.isArray(data)
        ? data
        : data.desafios || data.challenges || [];

      if (rawList.length > 0) {
        cachedRemoteChallenges = rawList;
        return rawList;
      }
    } catch (error) {
      console.warn('ChallengeService: Could not fetch remote challenges from JSON, using local dataset.', error);
    }

    return [];
  }

  /**
   * Dynamically generates/retrieves a complete challenge round based on an active product from MediaService.
   * Matches product by produtoId, or selects/adapts a challenge dynamically.
   */
  public static async getNextChallengeRound(): Promise<{
    challenge: MysteryCardChallenge;
    shuffledCards: CardOption[];
    product: RemoteProduct | null;
  }> {
    // 1. Pick a random active product from MediaService
    const product = await MediaService.getRandomActiveProduct();

    // 2. Fetch remote challenges from desafios.json
    const remoteChallenges = await ChallengeService.fetchRemoteChallenges();

    let matchedChallengeItem: RemoteChallengeItem | null = null;

    if (product && remoteChallenges.length > 0) {
      // Find all challenges with produtoId equal to selected product's ID
      const matchingForProduct = remoteChallenges.filter((item) => {
        const itemPid = String(item.produtoId ?? item.productId ?? item.produto_id ?? '');
        const pId = String(product.id ?? '');
        return itemPid !== '' && pId !== '' && itemPid === pId;
      });

      if (matchingForProduct.length > 0) {
        // Pick random challenge among matches for this product
        const randIdx = Math.floor(Math.random() * matchingForProduct.length);
        matchedChallengeItem = matchingForProduct[randIdx];
      } else {
        // Pick a random challenge from the overall JSON list
        const randIdx = Math.floor(Math.random() * remoteChallenges.length);
        matchedChallengeItem = remoteChallenges[randIdx];
      }
    }

    // Convert matched remote challenge or fallback local challenge into standard MysteryCardChallenge
    let baseChallenge: MysteryCardChallenge;

    if (matchedChallengeItem) {
      const correctHook = matchedChallengeItem.correctHook || matchedChallengeItem.ganchoCorreto || 'Confira este segredo agora!';
      const correctExplanation = matchedChallengeItem.correctExplanation || matchedChallengeItem.explicacaoCorreta || 'Este gancho gera extrema curiosidade e retenção nos primeiros 3 segundos.';
      
      const rawWrong = matchedChallengeItem.wrongHooks || matchedChallengeItem.ganchosIncorretos || [];
      const wrongHooks: WrongHookOption[] = rawWrong.map((w) => ({
        text: w.text || w.texto || 'Compre agora mesmo com desconto!',
        explanation: w.explanation || w.explicacao || 'Propaganda direta demais afasta a atenção no início do vídeo.',
      }));

      // Ensure we have at least 3 wrong hooks
      while (wrongHooks.length < 3) {
        wrongHooks.push({
          text: `Aprenda tudo sobre esse produto de forma simples e rápida!`,
          explanation: 'Promessa genérica demais sem gatilho de urgência ou curiosidade.',
        });
      }

      baseChallenge = {
        id: String(matchedChallengeItem.id || `chal_${Date.now()}`),
        productName: product?.nome || product?.productName || 'Produto Premium TikTok',
        productCategory: product?.categoria || product?.productCategory || 'Geral',
        image: product?.imagem || product?.image,
        hookCategory: (matchedChallengeItem.hookCategory || matchedChallengeItem.categoriaHook || 'Curiosidade') as HookCategory,
        difficulty: ChallengeService.parseDifficulty(matchedChallengeItem.difficulty || matchedChallengeItem.nivel || product?.nivel || product?.difficulty),
        xp: typeof matchedChallengeItem.xp === 'number' && matchedChallengeItem.xp > 0 ? matchedChallengeItem.xp : (product?.xp || 25),
        correctHook,
        wrongHooks: wrongHooks.slice(0, 3),
        correctExplanation,
        techniques: matchedChallengeItem.techniques || matchedChallengeItem.tecnicas || ['Quebra de Padrão', 'Curiosidade'],
      };
    } else {
      // Pick random from local fallback
      const randomLocalIdx = Math.floor(Math.random() * MYSTERY_CARD_CHALLENGES.length);
      const localChal = MYSTERY_CARD_CHALLENGES[randomLocalIdx];

      baseChallenge = {
        ...localChal,
        id: `chal_${Date.now()}_${Math.random()}`,
        productName: product?.nome || product?.productName || localChal.productName,
        productCategory: product?.categoria || product?.productCategory || localChal.productCategory,
        image: product?.imagem || product?.image || localChal.image,
        difficulty: ChallengeService.parseDifficulty(product?.nivel || product?.difficulty || localChal.difficulty),
        xp: typeof product?.xp === 'number' && product.xp > 0 ? product.xp : localChal.xp,
      };
    }

    // Shuffle the 4 cards
    const shuffledCards = ChallengeService.shuffleCards(baseChallenge);

    return {
      challenge: baseChallenge,
      shuffledCards,
      product,
    };
  }

  /**
   * Shuffles 1 correct hook and 3 wrong hooks randomly into 4 CardOption items.
   */
  public static shuffleCards(challenge: MysteryCardChallenge): CardOption[] {
    const rawOptions = [
      {
        text: challenge.correctHook,
        isCorrect: true,
        explanation: challenge.correctExplanation,
      },
      ...challenge.wrongHooks.map((w) => ({
        text: w.text,
        isCorrect: false,
        explanation: w.explanation,
      })),
    ];

    // Fisher-Yates Shuffle
    const shuffled = [...rawOptions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.map((opt, idx) => ({
      id: idx + 1,
      text: opt.text,
      isCorrect: opt.isCorrect,
      explanation: opt.explanation,
    }));
  }

  private static parseDifficulty(diffRaw?: string): DifficultyLevel {
    if (!diffRaw) return 'facil';
    const d = diffRaw.toLowerCase();
    if (d.includes('facil') || d.includes('fácil')) return 'facil';
    if (d.includes('medio') || d.includes('médio')) return 'medio';
    if (d.includes('dificil') || d.includes('difícil')) return 'dificil';
    return 'facil';
  }
}
