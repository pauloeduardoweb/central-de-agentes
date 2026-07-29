import { LanguageValidator } from './LanguageValidator';

export class SpeechSanitizer {
  /**
   * Formats prices strictly into standard Brazilian Real format: R$ XX,YY
   * Example: "129 90" -> "R$ 129,90", "53.29" -> "R$ 53,29", "129" -> "R$ 129,00"
   */
  static formatCurrencyBR(rawPrice?: string | number): string {
    if (!rawPrice) return '';
    const str = String(rawPrice).trim();
    if (!str) return '';

    // If already correctly formatted as "R$ 129,90", return directly
    if (/^R\$\s\d+(?:\.\d{3})*,\d{2}$/.test(str)) {
      return str;
    }

    // Check for "129 90" pattern
    const spaceMatch = str.match(/^(\d+)\s+(\d{1,2})$/);
    if (spaceMatch) {
      const intPart = spaceMatch[1];
      const decPart = spaceMatch[2].padEnd(2, '0');
      return `R$ ${intPart},${decPart}`;
    }

    // Check for "129,90" or "1.290,90"
    if (str.includes(',')) {
      const parts = str.split(',');
      const intPart = parts[0].replace(/\D/g, '');
      const decPart = (parts[1] || '00').replace(/\D/g, '').padEnd(2, '0').slice(0, 2);
      if (intPart) return `R$ ${intPart},${decPart}`;
    }

    // Check for "53.29" or "129.9"
    if (str.includes('.')) {
      const parts = str.split('.');
      if (parts.length === 2 && parts[1].length <= 2) {
        const intPart = parts[0].replace(/\D/g, '');
        const decPart = parts[1].replace(/\D/g, '').padEnd(2, '0').slice(0, 2);
        if (intPart) return `R$ ${intPart},${decPart}`;
      }
    }

    // Pure digits "129"
    const digits = str.replace(/\D/g, '');
    if (digits) {
      return `R$ ${digits},00`;
    }

    return str;
  }

  /**
   * Cleans speech text for seamless influencer reading & TTS engines.
   * STRICT CHARACTERS ALLOWED: Letters, Numbers, Spaces, Commas, Periods, Exclamation, Question marks, R$ symbol.
   * STRICTLY BANNED: Em dashes (—), hyphens (-), slashes (/), markdown, emojis, technical labels, quotes, etc.
   */
  static sanitize(rawSpeech: string, productName: string, price?: string): string {
    if (!rawSpeech) return '';

    let clean = rawSpeech;

    // 1. Remove technical prefix like "FALA Homem jovem:", "FALA:", "FALA:", etc.
    clean = clean.replace(/^FALA(?:\s+[^:\n]+)?:/gi, '');
    clean = clean.replace(/^(CENA|SCENE)\s*\d+[^:\n]*:/gi, '');

    // 2. Ensure speech is in Portuguese
    clean = LanguageValidator.ensurePortuguese(clean);

    // 3. Replace marketplace & legacy yellow basket terms
    clean = clean
      .replace(/carrinho amarelo/gi, 'carrinho laranja')
      .replace(/sacolinha amarela/gi, 'carrinho laranja')
      .replace(/link amarelo/gi, 'carrinho laranja')
      .replace(/botão amarelo/gi, 'carrinho laranja');

    // 4. Format any price tokens inside the speech
    if (price) {
      const formattedPrice = SpeechSanitizer.formatCurrencyBR(price);
      clean = clean.replace(/\[VALOR\]/gi, formattedPrice);
      // Replace raw numbers following R$ or price numbers
      clean = clean.replace(/\b(\d+(?:[.,\s]\d+)?)\s*(reais|BRL)\b/gi, formattedPrice);
    }

    // Replace standalone price references like "129 90" or "129,90" if they look like prices
    clean = clean.replace(/\b(\d{2,5})\s+(\d{2})\b/g, (m, p1, p2) => `R$ ${p1},${p2}`);

    // 5. Replace forbidden punctuation with clean text equivalents
    // Replace em dashes (—) and hyphens (-) with commas or periods
    clean = clean
      .replace(/—/g, ', ')
      .replace(/\s+-\s+/g, ', ')
      .replace(/\b-\b/g, ' ')
      .replace(/[\/\\#\*\[\]\{\}\(\)>_~`":;@]/g, ' ');

    // 6. Ensure product name interpolation is clean
    if (productName && clean.includes('[PRODUTO]')) {
      clean = clean.replaceAll('[PRODUTO]', productName);
    }

    // 7. Remove any remaining disallowed characters
    // Allowed: A-Z, a-z, Portuguese accents, 0-9, spaces, comma, period, exclamation, question mark, R$
    clean = clean.replace(/[^a-zA-Z0-9\s.,!?áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇR\$]/g, '');

    // 8. Normalize whitespace and double punctuation
    clean = clean
      .replace(/\s+/g, ' ')
      .replace(/,\s*,/g, ',')
      .replace(/\.\s*\./g, '.')
      .replace(/!\s*!/g, '!')
      .replace(/\s+([.,!?])/g, '$1')
      .trim();

    // Remove quotes
    clean = clean.replace(/^["'\s]+|["'\s]+$/g, '');

    // 9. Capitalize first letter
    if (clean.length > 0) {
      clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    }

    // 10. Ensure sentence terminates with punctuation
    if (clean.length > 0 && !/[.!?]$/.test(clean)) {
      clean += '.';
    }

    return clean;
  }

  /**
   * Validates if a speech string contains any forbidden characters
   */
  static validateSpeechCharacters(speech: string): { isValid: boolean; invalidChars: string[] } {
    const forbiddenRegex = /[^a-zA-Z0-9\s.,!?áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇR\$]/g;
    const matches = speech.match(forbiddenRegex);
    if (!matches) return { isValid: true, invalidChars: [] };
    const unique = Array.from(new Set(matches));
    return { isValid: false, invalidChars: unique };
  }

  static normalizeSpeechNumbers(text: string): string {
    return text
      .replace(/\b2\.0\b/g, 'dois ponto zero')
      .replace(/\b1\.0\b/g, 'um ponto zero')
      .replace(/\b3\.0\b/g, 'três ponto zero');
  }
}
