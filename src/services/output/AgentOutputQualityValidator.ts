import { SpeechSanitizer } from '../text/SpeechSanitizer';

export interface QualityValidationResult {
  isValid: boolean;
  issues: string[];
  sanitizedContent: string;
}

export class AgentOutputQualityValidator {
  static validateAndFix(rawOutput: string, productName: string, price?: string): QualityValidationResult {
    const issues: string[] = [];
    let fixed = rawOutput;

    // 1. Check for filename leakage
    if (/1\.jpg|foto\.png|\[Foto Anexada/i.test(fixed)) {
      issues.push('Identificado nome de arquivo nas entregas.');
      fixed = fixed
        .replace(/1\.jpg/gi, productName)
        .replace(/foto\.png/gi, productName)
        .replace(/\[Foto Anexada:? [^\]]+\]/gi, productName)
        .replace(/\[Foto Anexada\]/gi, productName);
    }

    // 2. Check for generic product titles
    if (/Peça de Vestuário|Roupas|Produto Genérico/i.test(fixed) && productName && !productName.includes('Vestuário')) {
      issues.push('Classificação genérica encontrada.');
      fixed = fixed
        .replace(/Peça de Vestuário \/ Roupas/gi, productName)
        .replace(/Peça de Vestuário/gi, productName)
        .replace(/Produto Genérico/gi, productName);
    }

    // 3. Fix Currency Formatting: Convert "129 90" or "129,90" without R$ to "R$ 129,90"
    if (price) {
      const formattedPrice = SpeechSanitizer.formatCurrencyBR(price);
      fixed = fixed.replace(/\b(\d{2,5})\s+(\d{2})\b/g, (m, p1, p2) => `R$ ${p1},${p2}`);
      if (price.includes(' ') || !price.includes('R$')) {
        fixed = fixed.replaceAll(price, formattedPrice);
      }
    }

    // 4. Convert legacy yellow basket references to orange basket
    if (/carrinho amarelo|sacolinha amarela|link amarelo|botão amarelo/i.test(fixed)) {
      issues.push('Termo carrinho amarelo corrigido para carrinho laranja.');
      fixed = fixed
        .replace(/carrinho amarelo/gi, 'carrinho laranja')
        .replace(/sacolinha amarela/gi, 'carrinho laranja')
        .replace(/link amarelo/gi, 'carrinho laranja')
        .replace(/botão amarelo/gi, 'carrinho laranja');
    }

    // 5. Sanitize speech lines (FALA:)
    fixed = fixed.replace(/(FALA:[^\n]+)/gi, (match) => {
      const sanitized = SpeechSanitizer.sanitize(match, productName, price);
      return `FALA:\n"${sanitized}"`;
    });

    // 6. Prohibit visible text, buttons, or graphics in visual/video prompts
    // Make sure visual prompts do NOT ask to render a graphic orange cart on screen
    fixed = fixed.replace(/(VISUAL:[^\n]+)/gi, (match) => {
      let cleanVisual = match;
      if (cleanVisual.includes('carrinho laranja no canto') || cleanVisual.includes('ícone de carrinho')) {
        cleanVisual = cleanVisual.replace(
          /com destaque no carrinho laranja|com clique no carrinho laranja|ícone de carrinho/gi,
          'com a pessoa apontando discretamente para a parte inferior da tela (sem nenhum botão, texto ou elemento gráfico na tela)'
        );
      }
      return cleanVisual;
    });

    // Enforce negative prompt rules in PROMPT DO CENÁRIO & PROMPT DO VÍDEO
    if (fixed.includes('PROMPT DO CENÁRIO:') && !fixed.includes('É proibido gerar qualquer texto visível')) {
      fixed = fixed.replace(
        /(PROMPT DO CENÁRIO:[^\n]+)/g,
        `$1 É proibido gerar qualquer texto visível, legendas, preços, botões, ícones, carrinho laranja gráfico ou elementos de interface dentro da imagem ou do vídeo.`
      );
    }

    if (fixed.includes('PROMPT DO VÍDEO:') && !fixed.includes('Não gerar texto, legenda')) {
      fixed = fixed.replace(
        /(PROMPT DO VÍDEO:[^\n]+)/g,
        `$1 Não gerar texto, legenda, preço, carrinho visível, botão, ícone, imagem gráfica ou qualquer elemento visual adicional.`
      );
    }

    return {
      isValid: issues.length === 0,
      issues,
      sanitizedContent: fixed
    };
  }
}
