export interface ProductPriceRange {
  minCents: number;
  maxCents: number;
  formattedRange: string;
  isEstimated: boolean;
  auxiliaryText: string;
}

export function formatMoney(cents: number | null | undefined, symbol = 'R$'): string {
  if (cents === null || cents === undefined || isNaN(cents)) return `${symbol} 0,00`;
  const value = cents / 100;
  return `${symbol} ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Retorna a faixa de preço temporária do produto.
 * Regra:
 * - minCents = priceCents
 * - maxCents = priceCents + 3000 (+ R$ 30,00) para produtos válidos (>0)
 * - originalPriceCents NÃO participa do cálculo nem é exibido
 * - Nenhum valor estimado é salvo no banco
 */
export function getProductPriceRange(priceCents: number | null | undefined, symbol = 'R$'): ProductPriceRange | null {
  if (!priceCents || priceCents <= 0) {
    return null;
  }

  const minCents = priceCents;
  const maxCents = priceCents + 3000;

  const minFormatted = formatMoney(minCents, symbol);
  const maxFormatted = formatMoney(maxCents, symbol);

  return {
    minCents,
    maxCents,
    formattedRange: `${minFormatted} – ${maxFormatted}`,
    isEstimated: true,
    auxiliaryText: 'Preço pode variar por opção/promoção',
  };
}
