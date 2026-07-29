export class LanguageValidator {
  /**
   * Translates common English fallback phrases to natural Brazilian Portuguese
   */
  static ensurePortuguese(text: string): string {
    if (!text) return '';

    let pt = text;

    // Common English phrase translations
    const englishToPtMap: Record<string, string> = {
      'check out this': 'olha só esse',
      'this product is': 'esse produto é',
      'this watch looks amazing': 'esse relógio é incrível',
      'click the link below': 'confere no carrinho laranja',
      'buy now': 'garanta já o seu',
      'don\'t miss out': 'não perca essa oportunidade',
      'limited time offer': 'oferta por tempo limitado',
      'high quality': 'altíssima qualidade',
      'best price': 'melhor valor',
      'free shipping': 'frete grátis',
      'order today': 'peça hoje mesmo',
      'special discount': 'desconto especial',
      'amazing quality': 'qualidade incrível',
      'must have': 'item indispensável',
    };

    Object.keys(englishToPtMap).forEach((eng) => {
      const regex = new RegExp(`\\b${eng}\\b`, 'gi');
      pt = pt.replace(regex, englishToPtMap[eng]);
    });

    return pt;
  }
}
