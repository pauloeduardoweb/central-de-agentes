export class AmbientSoundTemplates {
  static getDetailedSound(location: string = 'loja de varejo'): string {
    return `Som natural e discreto do ambiente de ${location}, com passos leves ao fundo, movimento suave de araras/produtos e conversas distantes quase imperceptíveis. A voz da locução permanece limpa, próxima e perfeitamente legível. Sem ruídos de estúdio, eco artificial, aplausos ou música exagerada.`;
  }
}

export class SpeechTemplates {
  static sanitizeSpeech(speech: string, productName: string, price?: string): string {
    let result = speech
      .replace(/\[PRODUTO\]/g, productName)
      .replace(/carrinho amarelo/gi, 'carrinho laranja')
      .replace(/sacolinha amarela/gi, 'carrinho laranja')
      .replace(/carrinho/gi, 'carrinho laranja');

    if (price) {
      result = result.replace(/\[VALOR\]/g, price);
    }
    return result;
  }
}

export class ScenarioPromptTemplates {
  static getRobustScenarioPrompt(
    productName: string,
    environment: string,
    support: string = 'prateleira ou cabide'
  ): string {
    return `Utilize obrigatoriamente a imagem anexada como referência visual principal do produto "${productName}". Crie uma cena vertical 9:16, extremamente realista, em ambiente de ${environment}, com iluminação comercial branca, suave e uniforme. O produto "${productName}" deve permanecer exatamente igual à referência, preservando cor, formato, gola, mangas, símbolos, estampas, costuras, proporções e todos os detalhes visíveis. Uma pessoa aparece de frente para a câmera segurando a peça em ${support} na altura do peito, com o item totalmente aberto e visível do colarinho até a barra, sem cortes ou obstruções. O produto deve ocupar aproximadamente 45% a 60% da altura da imagem e permanecer como elemento principal. Ao fundo, incluir o cenário organizado de forma natural com leve desfoque de profundidade. Não adicionar textos, legendas, preços, etiquetas digitais, marcas inexistentes, mãos extras, dedos deformados, celular, câmera, microfone, ring light ou tripé.`;
  }
}

export class VideoPromptTemplates {
  static getRobustVideoPrompt(
    productName: string,
    environment: string,
    actionDuration: string = '24 segundos (3 cenas)'
  ): string {
    return `Animação hiper-realista em formato vertical 9:16 com duração de ${actionDuration}. A cena mantém continuidade estrita com a imagem de referência do produto "${productName}". A câmera em primeira pessoa (POV) realiza um movimento suave e contínuo aproximando e mostrando os detalhes e acabamento do produto "${productName}" em ${environment}. Sincronia labial perfeita com a locução em português brasileiro direcionada ao carrinho laranja. Sem artefatos visuais, sem mãos extras, sem distorção do produto.`;
  }
}

export class RestrictionTemplates {
  static getPOVRestrictions(): string[] {
    return [
      'Máximo de duas mãos visíveis na cena (POV autêntico).',
      'Nenhum celular, câmera ou equipamento visível no reflexo.',
      'Sempre direcionar o usuário para o carrinho laranja.',
      'Proibida qualquer deformação de proporção ou logotipo do produto.',
      'Proibido usar o nome do arquivo ou referências genéricas como [Foto Anexada].'
    ];
  }
}

export class ContinuityTemplates {
  static getSceneContinuity(productName: string, environment: string): string {
    return `Consistência total de produto: "${productName}" deve manter exatamente a mesma cor, estampas, logos, tecido e proporções em todas as cenas dentro de ${environment}.`;
  }
}
