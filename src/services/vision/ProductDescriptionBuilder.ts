export class ProductDescriptionBuilder {
  static sanitizeProductName(rawTitle?: string, fallbackName: string = 'Produto Destaque'): string {
    if (!rawTitle || !rawTitle.trim()) return fallbackName;

    const trimmed = rawTitle.trim();

    // Block file names or attachment labels
    if (
      /\.(jpg|jpeg|png|webp|gif)$/i.test(trimmed) ||
      trimmed.includes('[Foto') ||
      trimmed.includes('foto.png') ||
      trimmed === '1.jpg'
    ) {
      return fallbackName;
    }

    // Block generic categorization titles
    if (
      /^(Peça de Vestuário|Roupas|Produto Genérico|Objeto|Item|Acessório|Cosmético|Embalagem)$/i.test(trimmed) ||
      trimmed.includes('Peça de Vestuário')
    ) {
      return fallbackName;
    }

    // Clean marketplace noise & excess symbols
    const cleaned = trimmed
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\[OFICIAL\]/gi, '')
      .replace(/(frete grátis|promoção|oferta|desconto|original|pronta entrega|envio rápido|novo|kit \d+)/gi, '')
      .replace(/[\/\\#\*\[\]\{\}\(\)>_~`]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.length < 2) return fallbackName;

    // Capitalize properly
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
}
