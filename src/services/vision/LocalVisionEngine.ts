import { ImagePreprocessor } from './ImagePreprocessor';
import { ProductClassifier } from './ProductClassifier';
import { ProductVisionResult, ProductContext, IdentificationSource } from './visionTypes';

export class ProductDescriptionBuilder {
  static sanitizeProductName(rawTitle?: string, fallbackName: string = 'Produto Destaque'): string {
    if (!rawTitle || !rawTitle.trim()) return fallbackName;

    // Filter out file names, .jpg, .png, [Foto Anexada], etc.
    if (
      /\.(jpg|jpeg|png|webp|gif)$/i.test(rawTitle) ||
      rawTitle.includes('[Foto') ||
      rawTitle.includes('foto.png') ||
      rawTitle.includes('1.jpg')
    ) {
      return fallbackName;
    }

    // Clean marketplace noise
    const cleaned = rawTitle
      ? rawTitle
          .replace(/https?:\/\/\S+/g, '')
          .replace(/(frete grátis|promoção|oferta|desconto|original|pronta entrega|envio rápido|novo|kit \d+)/gi, '')
          .replace(/[^\w\s\u00C0-\u00FF-]/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      : fallbackName;

    if (cleaned.length < 2) return fallbackName;

    // Capitalize properly
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
}

export class VisionConfidence {
  static evaluate(score: number): {
    needsConfirmation: boolean;
    recommendationMessage: string;
  } {
    if (score >= 80) {
      return {
        needsConfirmation: false,
        recommendationMessage: 'Produto identificado com alta precisão.',
      };
    } else if (score >= 50) {
      return {
        needsConfirmation: true,
        recommendationMessage: 'Produto identificado. Confirme se o nome está correto.',
      };
    } else {
      return {
        needsConfirmation: true,
        recommendationMessage: 'Não foi possível identificar o produto com segurança. Digite o nome do produto para continuar.',
      };
    }
  }
}

export class LocalVisionEngine {
  static async analyzeImageAndTitle(
    imageDataUrl?: string | null,
    rawUserTitle?: string,
    originalFileName?: string
  ): Promise<{ visionResult: ProductVisionResult; productContext: ProductContext }> {
    let features = {
      width: 300,
      height: 300,
      aspectRatio: 1,
      dominantColors: ['neutro'],
      brightness: 128,
      isBright: true,
      isWhiteOrNeutralBg: true,
    };

    if (imageDataUrl) {
      features = await ImagePreprocessor.preprocess(imageDataUrl);
    }

    const classification = ProductClassifier.classify(features, rawUserTitle);
    const sanitizedTitle = ProductDescriptionBuilder.sanitizeProductName(
      rawUserTitle,
      classification.detectedName
    );

    const confidenceEval = VisionConfidence.evaluate(classification.confidenceScore);

    let source: IdentificationSource = 'local-vision';
    if (imageDataUrl && rawUserTitle) source = 'combined';
    else if (rawUserTitle) source = 'title';

    const visionResult: ProductVisionResult = {
      detectedProduct: sanitizedTitle,
      detectedCategory: classification.category,
      visualAttributes: classification.attributes,
      dominantObjects: [classification.subcategory],
      possibleUseCases: ['TikTok Shop', 'Demonstração de produto', 'Conteúdo viral'],
      confidence: classification.confidenceScore,
      source,
      needsConfirmation: confidenceEval.needsConfirmation,
    };

    // Never place file names like 1.jpg into productName
    const finalProductName = sanitizedTitle;

    const productContext: ProductContext = {
      productName: finalProductName,
      productCategory: classification.category,
      productSubcategory: classification.subcategory,
      visualDescription: `Item ${finalProductName} com enquadramento frontal, detalhes visíveis e iluminação comercial.`,
      confirmedAttributes: classification.attributes,
      unconfirmedAttributes: [],
      titleProvided: rawUserTitle,
      imageOriginalName: originalFileName || 'foto.png',
      identificationSource: source,
      confidence: classification.confidenceScore,
    };

    return { visionResult, productContext };
  }
}
