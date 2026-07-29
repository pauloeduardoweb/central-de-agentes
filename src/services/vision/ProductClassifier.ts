import { ImageFeatures } from './ImagePreprocessor';

export interface ClassificationResult {
  category: string;
  subcategory: string;
  detectedName: string;
  attributes: string[];
  confidenceScore: number;
}

export class ProductClassifier {
  static classify(features: ImageFeatures, rawUserTitle?: string): ClassificationResult {
    const titleLower = (rawUserTitle || '').toLowerCase();

    let category = 'Geral / Utilidades';
    let subcategory = 'Produto Promocional';
    let detectedName = 'Produto Destaque';
    const attributes: string[] = [];
    let confidenceScore = 65;

    // Attribute detection from visual features
    if (features.dominantColors.includes('branca / clara')) {
      attributes.push('cor clara/branca');
    } else if (features.dominantColors.includes('escura / preta')) {
      attributes.push('cor preta/escura');
    }
    if (features.isWhiteOrNeutralBg) {
      attributes.push('fundo neutro comercial');
    }
    if (features.aspectRatio > 1.2) {
      attributes.push('formato horizontal/amplo');
    } else if (features.aspectRatio < 0.8) {
      attributes.push('formato vertical/detalhes de produto');
    }

    // Specific product recognition from title + vision clues
    if (titleLower.includes('lanbena') || titleLower.includes('máscara') || titleLower.includes('mascara') || titleLower.includes('carvão')) {
      category = 'Beleza & Cuidados Pessoais';
      subcategory = 'Máscara Facial Cosmética';
      detectedName = 'Máscara Facial LANBENA Versão 2.0 com Carvão de Bambu';
      attributes.push('embalagem cosmética', 'pote/bisnaga', 'cuidados com a pele');
      confidenceScore = 95;
    } else if (titleLower.includes('camisa') || titleLower.includes('polo') || titleLower.includes('camiseta') || titleLower.includes('futebol')) {
      category = 'Moda Masculina / Esportiva';
      subcategory = 'Vestuário Esportivo';
      if (titleLower.includes('polo')) {
        detectedName = 'Camisa Polo Masculina';
      } else if (titleLower.includes('futebol')) {
        detectedName = 'Camisa de Futebol Esportiva';
      } else {
        detectedName = 'Camiseta Masculina Esportiva';
      }
      attributes.push('gola/mangas curtas', 'tecido esportivo', 'acabamento premium');
      confidenceScore = 92;
    } else if (titleLower.includes('bolsa') || titleLower.includes('mochila') || titleLower.includes('carteira')) {
      category = 'Acessórios & Moda';
      subcategory = 'Bolsas & Marcenaria';
      detectedName = 'Bolsa de Couro Elegante';
      attributes.push('alça reforçada', 'design sofisticado', 'compartimentos internos');
      confidenceScore = 90;
    } else if (titleLower.includes('tênis') || titleLower.includes('tenis') || titleLower.includes('sapato')) {
      category = 'Calçados';
      subcategory = 'Tênis Casual Esportivo';
      detectedName = 'Tênis Esportivo Confortável';
      attributes.push('solado macio', 'design anatômico', 'alta durabilidade');
      confidenceScore = 91;
    } else if (titleLower.length > 2) {
      // Clean user typed title
      const cleanTitle = rawUserTitle
        ? rawUserTitle
            .replace(/https?:\/\/\S+/g, '')
            .replace(/[^\w\s\u00C0-\u00FF-]/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        : 'Produto Destaque';

      detectedName = cleanTitle.slice(0, 50);
      confidenceScore = 88;
    } else {
      // Pure visual fallback
      if (features.aspectRatio < 0.85) {
        category = 'Moda & Vestuário';
        subcategory = 'Vestuário';
        detectedName = 'Peça de Moda Destaque';
      } else {
        category = 'Cosméticos & Acessórios';
        subcategory = 'Item Promocional';
        detectedName = 'Produto Promocional TikTok';
      }
      confidenceScore = 60;
    }

    return {
      category,
      subcategory,
      detectedName,
      attributes,
      confidenceScore,
    };
  }
}
