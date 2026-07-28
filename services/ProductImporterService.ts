import { RemoteProduct } from './MediaService';

export interface ImportedProduct {
  id: string;
  folderName: string;
  nome: string;
  productName: string;
  categoria: string;
  productCategory: string;
  imagem: string;
  image: string;
  ativo: boolean;
  nivel: string;
  difficulty: string;
  xp: number;
}

const BASE_LIBRARY_URL = 'https://midia.geracaozpro.com/produtos/';
const OFFICIAL_JSON_URL = 'https://midia.geracaozpro.com/produtos/produtos.json';
const LOCAL_STORAGE_CATALOG_KEY = 'geracaoz_produtos_dynamic_json_v1';

// Pre-indexed active library folders from Geração Z Pro server
const DEFAULT_PRODUCT_FOLDERS = [
  { folder: 'bolsa-feminina-elegante', name: 'Bolsa Feminina Elegante', cat: 'Moda e Acessórios' },
  { folder: 'escova-secadora-multifuncional', name: 'Escova Secadora Multifuncional', cat: 'Beleza e Cuidados' },
  { folder: 'mini-processador-eletrico', name: 'Mini Processador Elétrico', cat: 'Casa e Cozinha' },
  { folder: 'smartwatch-ultra-series', name: 'Smartwatch Ultra Series', cat: 'Eletrônicos e Gadgets' },
  { folder: 'luminaria-sunset-led', name: 'Luminária Sunset LED', cat: 'Decoração e Casa' },
  { folder: 'fones-bluetooth-pro', name: 'Fones Bluetooth Pro Noise Canceling', cat: 'Eletrônicos e Gadgets' },
  { folder: 'massageador-facial-lifting', name: 'Massageador Facial Lifting', cat: 'Beleza e Cuidados' },
  { folder: 'garrafa-termica-digital', name: 'Garrafa Térmica Digital com Sensor', cat: 'Casa e Cozinha' },
  { folder: 'humidificador-ar-flame', name: 'Umidificador de Ar Flame LED', cat: 'Decoração e Casa' },
  { folder: 'depilador-laser-portatil', name: 'Depilador Laser Portátil IPL', cat: 'Beleza e Cuidados' },
  { folder: 'copo-termico-stanley-style', name: 'Copo Térmico Inox Pro', cat: 'Casa e Cozinha' },
  { folder: 'oculos-sol-vintage-steampunk', name: 'Óculos de Sol Vintage Steampunk', cat: 'Moda e Acessórios' },
];

export class ProductImporterService {
  /**
   * Helper to format a folder slug into a clean Product Name (e.g., 'bolsa-feminina' -> 'Bolsa Feminina')
   */
  public static formatProductNameFromSlug(folderName: string): string {
    return folderName
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Helper to infer Category from product name keywords
   */
  public static inferCategoryFromName(name: string): string {
    const lower = name.toLowerCase();

    if (/bolsa|oculos|óculos|carteira|relogio|relógio|corrente|sapato|tenis|tênis|vestido|jaqueta|moda|joia|brinco/.test(lower)) {
      return 'Moda e Acessórios';
    }
    if (/escova|serum|sérum|maquiagem|massageador|lip|skincare|cabelo|batom|creme|depilador|estetica|estética|barba/.test(lower)) {
      return 'Beleza e Cuidados';
    }
    if (/mini|processador|garrafa|panela|copo|cozinha|fita|lampada|lâmpada|organizador|limpeza|pote|faca/.test(lower)) {
      return 'Casa e Cozinha';
    }
    if (/fone|smartwatch|carregador|suporte|camera|câmera|led|projetor|gadget|bluetooth|teclado|mouse/.test(lower)) {
      return 'Eletrônicos e Gadgets';
    }
    if (/luminaria|luminária|umidificador|humidificador|decoracao|decoração|quadro/.test(lower)) {
      return 'Decoração e Casa';
    }
    if (/pet|coleira|racao|ração/.test(lower)) {
      return 'Mundo Pet';
    }

    return 'Produtos Pro';
  }

  /**
   * Converts a folder name into a standard RemoteProduct object with image "1.jpg"
   */
  public static buildProductFromFolder(folderName: string, customName?: string, customCategory?: string): RemoteProduct {
    const cleanFolder = folderName.trim().replace(/^\/+|\/+$/g, '');
    const formattedName = customName || ProductImporterService.formatProductNameFromSlug(cleanFolder);
    const category = customCategory || ProductImporterService.inferCategoryFromName(formattedName);
    const imageUrl = `${BASE_LIBRARY_URL}${cleanFolder}/1.jpg`;

    return {
      id: `prod_${cleanFolder}`,
      nome: formattedName,
      productName: formattedName,
      categoria: category,
      productCategory: category,
      imagem: imageUrl,
      image: imageUrl,
      ativo: true,
      nivel: 'facil',
      difficulty: 'facil',
      xp: 25,
    };
  }

  /**
   * Main Automatic Importer:
   * 1. Fetches official `produtos.json` if available
   * 2. Scrapes/parses folder structure from `https://midia.geracaozpro.com/produtos/`
   * 3. Combines discovered product folders with default library folders
   * 4. Ensures all image URLs point to `1.jpg` in each product folder
   * 5. Returns dynamic product catalog array
   */
  public static async autoImportLibrary(): Promise<RemoteProduct[]> {
    const importedProductsMap = new Map<string, RemoteProduct>();

    // Step 1: Add default pre-indexed Geração Z Pro folders with 1.jpg covers
    for (const item of DEFAULT_PRODUCT_FOLDERS) {
      const prod = ProductImporterService.buildProductFromFolder(item.folder, item.name, item.cat);
      importedProductsMap.set(String(prod.id), prod);
    }

    // Step 2: Attempt to fetch official remote produtos.json
    try {
      const response = await fetch(OFFICIAL_JSON_URL, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        const rawList: any[] = Array.isArray(data) ? data : data.produtos || data.products || [];

        for (const item of rawList) {
          const folder = item.pasta || item.folder || item.id || 'produto';
          const name = item.nome || item.productName || ProductImporterService.formatProductNameFromSlug(String(folder));
          const cat = item.categoria || item.productCategory || ProductImporterService.inferCategoryFromName(name);
          
          // Guarantee 1.jpg image path if image is relative or missing
          let imageUrl = item.imagem || item.image;
          if (!imageUrl || !imageUrl.startsWith('http')) {
            imageUrl = `${BASE_LIBRARY_URL}${folder}/1.jpg`;
          }

          const prodObj: RemoteProduct = {
            id: item.id || `prod_${folder}`,
            nome: name,
            productName: name,
            categoria: cat,
            productCategory: cat,
            imagem: imageUrl,
            image: imageUrl,
            ativo: item.ativo !== false,
            nivel: item.nivel || item.difficulty || 'facil',
            difficulty: item.difficulty || item.nivel || 'facil',
            xp: typeof item.xp === 'number' ? item.xp : 25,
          };

          if (prodObj.ativo) {
            importedProductsMap.set(String(prodObj.id), prodObj);
          }
        }
      }
    } catch (e) {
      console.info('ProductImporterService: Remote produtos.json fetch skipped or offline, parsing folders.', e);
    }

    // Step 3: Attempt to fetch directory listing from https://midia.geracaozpro.com/produtos/
    try {
      const dirResponse = await fetch(BASE_LIBRARY_URL, { method: 'GET' });
      if (dirResponse.ok) {
        const htmlText = await dirResponse.text();
        // Regex to extract folder links <a href="folder-name/">
        const folderMatches = htmlText.match(/href=["']([a-zA-Z0-9\-_]+)\/?["']/g);

        if (folderMatches) {
          for (const match of folderMatches) {
            const rawHref = match.replace(/href=["']/, '').replace(/["']$/, '').replace(/\/$/, '');
            // Filter out system links or parent directory links
            if (rawHref && !['.', '..', 'produtos', 'index.html', 'produtos.json'].includes(rawHref) && !rawHref.includes('.')) {
              const prod = ProductImporterService.buildProductFromFolder(rawHref);
              if (!importedProductsMap.has(String(prod.id))) {
                importedProductsMap.set(String(prod.id), prod);
              }
            }
          }
        }
      }
    } catch (e) {
      console.info('ProductImporterService: Direct directory listing parse skipped (CORS/Permissions).', e);
    }

    const finalCatalog = Array.from(importedProductsMap.values()).filter((p) => p.ativo !== false);

    // Save generated dynamic produtos.json in localStorage for global access
    try {
      localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(finalCatalog));
    } catch (e) {
      console.warn('ProductImporterService: Could not cache dynamic produtos.json', e);
    }

    return finalCatalog;
  }

  /**
   * Retrieves the dynamic cached catalog or runs auto-import
   */
  public static getCachedCatalog(): RemoteProduct[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_CATALOG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}

    return [];
  }
}
