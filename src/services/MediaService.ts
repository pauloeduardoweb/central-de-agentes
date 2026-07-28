import { MysteryCardChallenge, DifficultyLevel, HookCategory } from '../types/challenge';
import { ProductImporterService } from './ProductImporterService';

export interface RemoteProduct {
  id: string | number;
  nome?: string;
  productName?: string;
  categoria?: string;
  productCategory?: string;
  imagem?: string;
  image?: string;
  ativo?: boolean;
  nivel?: string;
  difficulty?: string;
  xp?: number;
  hookCategory?: string;
  correctHook?: string;
  wrongHooks?: Array<{ text: string; explanation: string }>;
  correctExplanation?: string;
  techniques?: string[];
}

let cachedProducts: RemoteProduct[] | null = null;

export class MediaService {
  /**
   * Automatically imports and returns active products from the Geração Z Pro library.
   * Utilizes folder discovery and 1.jpg main image resolution.
   */
  public static async fetchActiveProducts(): Promise<RemoteProduct[]> {
    if (cachedProducts && cachedProducts.length > 0) {
      return cachedProducts;
    }

    // 1. Try loading from GET /api/products (MySQL API)
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped: RemoteProduct[] = data.map((item: any) => ({
            id: item.id,
            nome: item.nome,
            productName: item.nome,
            categoria: item.categoria,
            productCategory: item.categoria,
            imagem: item.imagem || item.imagem_principal,
            image: item.imagem || item.imagem_principal,
            nivel: item.nivel || 'Facil',
            difficulty: item.nivel || 'Facil',
            xp: item.xp || 25,
            ativo: true,
          }));
          cachedProducts = mapped;
          return mapped;
        }
      }
    } catch (error) {
      console.warn('MediaService: Falha ao carregar /api/products. Tentando fallback local...', error);
    }

    // 2. Transition fallback: try ProductImporterService if API fails
    try {
      const products = await ProductImporterService.autoImportLibrary();
      if (products && products.length > 0) {
        cachedProducts = products;
        return products;
      }
    } catch (error) {
      console.warn('MediaService: Fallback de biblioteca também falhou.', error);
    }

    const fallbackCatalog = ProductImporterService.getCachedCatalog();
    if (fallbackCatalog.length > 0) {
      cachedProducts = fallbackCatalog;
      return fallbackCatalog;
    }

    console.error('Não foi possível carregar a Biblioteca de Produtos.');
    return [];
  }

  /**
   * Returns a random active product from the library.
   */
  public static async getRandomActiveProduct(): Promise<RemoteProduct | null> {
    const products = await MediaService.fetchActiveProducts();
    if (!products || products.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * products.length);
    return products[randomIndex];
  }

  /**
   * Hydrates a local challenge with dynamic product information from the MediaService JSON.
   */
  public static async getHydratedChallenge(baseChallenge: MysteryCardChallenge): Promise<MysteryCardChallenge> {
    const remoteProduct = await MediaService.getRandomActiveProduct();

    if (!remoteProduct) {
      return baseChallenge;
    }

    const name = remoteProduct.nome || remoteProduct.productName || baseChallenge.productName;
    const category = remoteProduct.categoria || remoteProduct.productCategory || baseChallenge.productCategory;
    const image = remoteProduct.imagem || remoteProduct.image || baseChallenge.image;
    const difficultyRaw = (remoteProduct.nivel || remoteProduct.difficulty || baseChallenge.difficulty).toLowerCase();
    
    let difficulty: DifficultyLevel = baseChallenge.difficulty;
    if (difficultyRaw.includes('facil') || difficultyRaw.includes('fácil')) difficulty = 'facil';
    else if (difficultyRaw.includes('medio') || difficultyRaw.includes('médio')) difficulty = 'medio';
    else if (difficultyRaw.includes('dificil') || difficultyRaw.includes('difícil')) difficulty = 'dificil';

    const xp = typeof remoteProduct.xp === 'number' && remoteProduct.xp > 0 ? remoteProduct.xp : baseChallenge.xp;

    return {
      ...baseChallenge,
      productName: name,
      productCategory: category,
      image: image,
      difficulty: difficulty,
      xp: xp,
    };
  }
}

