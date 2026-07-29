export class VisualTemplates {
  static getDetailedVisual(
    productName: string,
    environment: string = 'loja física',
    supportStyle: string = 'cabide/prateleira',
    actionStyle: string = 'demonstração frontal em POV'
  ): string {
    return `Cena vertical 9:16 em primeira pessoa (POV), gravada em ambiente de ${environment}. O produto "${productName}" é apresentado centralizado e em destaque principal em ${supportStyle}. A câmera está posicionada na altura do peito, mantendo um enquadramento frontal perfeito e estável. Uma mão limpa segura a peça de forma firme e natural, permitindo visualizar com total clareza todas as costuras, logos, texturas e detalhes do acabamento. Ao fundo, o cenário exibe elementos da loja com suave desfoque cinematográfico (depth of field), transmitindo um ambiente comercial autêntico e profissional. A iluminação é comercial, uniforme e branca, sem sombras duras. Nenhuma mão extra, celular, câmera, ring light ou texto digital interfere na cena.`;
  }
}
