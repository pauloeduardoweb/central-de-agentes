import { AgentConfig, AgentSession } from '../agents/agentTypes';
import { VisualTemplates } from '../agents/templates/visualTemplates';
import { AmbientSoundTemplates, ScenarioPromptTemplates, VideoPromptTemplates } from '../agents/templates/ambientSoundTemplates';
import { SpeechSanitizer } from './text/SpeechSanitizer';
import { ProductDescriptionBuilder } from './vision/ProductDescriptionBuilder';
import { AgentOutputQualityValidator } from './output/AgentOutputQualityValidator';

export interface FinalOutputBlock {
  id: string;
  title: string;
  content: string;
}

export class AgentOutputGenerator {
  static generateOutputs(config: AgentConfig, session: AgentSession): FinalOutputBlock[] {
    const blocks: FinalOutputBlock[] = [];
    const answers = session.answers || {};

    // 1. Resolve clean product name without filenames or generic labels
    let rawProductName = answers['productName'] || answers['step-0'] || answers['produto'] || 'Produto Destaque';
    if (
      rawProductName.includes('.jpg') ||
      rawProductName.includes('.png') ||
      rawProductName.includes('[Foto') ||
      rawProductName.includes('foto.png') ||
      rawProductName === '1.jpg' ||
      rawProductName.includes('Peça de Vestuário')
    ) {
      rawProductName = answers['step-1'] || answers['category'] || 'Produto Destaque';
    }

    const cleanProductName = ProductDescriptionBuilder.sanitizeProductName(
      rawProductName,
      'Produto Destaque'
    );

    const category = answers['step-1'] || answers['category'] || 'TikTok Shop';
    const environment = answers['step-2'] || answers['environment'] || 'Loja Física e Estúdio Comercial';
    const price = answers['step-3'] || answers['price'] || '';
    const formattedPrice = SpeechSanitizer.formatCurrencyBR(price);

    // Build map of placeholders
    const placeholderMap: Record<string, string> = {
      '[PRODUTO]': cleanProductName,
      '[CATEGORIA]': category,
      '[AMBIENTE]': environment,
      '[VALOR]': formattedPrice ? formattedPrice : 'Valor Promocional do Carrinho Laranja',
      '[ANIMAL]': cleanProductName,
      '[CENÁRIO]': environment,
    };

    config.outputs.forEach((outTemplate) => {
      let finalContent = outTemplate.template;

      // Replace step keys [step-0], [step-1], etc.
      Object.keys(answers).forEach((stepId) => {
        let val = String(answers[stepId] || '');
        if (val.includes('.jpg') || val.includes('[Foto')) {
          val = cleanProductName;
        }
        finalContent = finalContent.replaceAll(`[${stepId}]`, val);
      });

      // Replace named placeholders
      Object.keys(placeholderMap).forEach((key) => {
        if (key.startsWith('[')) {
          finalContent = finalContent.replaceAll(key, placeholderMap[key]);
        }
      });

      // Sanitize speech lines
      finalContent = SpeechSanitizer.sanitize(finalContent, cleanProductName, price);

      // Enhance outputs with structured robust scene details if template is basic
      if (!finalContent.includes('🎬 CENA 1') && !config.id.includes('anti-violacao')) {
        const visual1 = VisualTemplates.getDetailedVisual(cleanProductName, environment, 'embalagem/suporte', 'apresentação frontal');
        const visual2 = VisualTemplates.getDetailedVisual(cleanProductName, environment, 'ângulo aproximado', 'demonstração de qualidade');
        const visual3 = VisualTemplates.getDetailedVisual(cleanProductName, environment, 'mão segurando o produto e apontando discretamente para a parte inferior', 'chamada para ação sem elementos gráficos');

        const sound = AmbientSoundTemplates.getDetailedSound(environment);
        const scenarioPrompt = ScenarioPromptTemplates.getRobustScenarioPrompt(cleanProductName, environment);
        const videoPrompt = VideoPromptTemplates.getRobustVideoPrompt(cleanProductName, environment);

        const speechLine1 = SpeechSanitizer.sanitize(
          `Gente, olha só esse ${cleanProductName} que eu encontrei!`,
          cleanProductName,
          price
        );

        const speechLine2 = price
          ? SpeechSanitizer.sanitize(`Na loja física ele custa ${formattedPrice}. Mas no TikTok Shop o valor está muito mais interessante!`, cleanProductName, price)
          : SpeechSanitizer.sanitize(`Olha a qualidade do ${cleanProductName}. O acabamento é impecável e vale muito a pena conferir!`, cleanProductName, price);

        const speechLine3 = SpeechSanitizer.sanitize(
          `Confere o valor no carrinho laranja antes que o anúncio saia do ar!`,
          cleanProductName,
          price
        );

        const robustSceneContent = `
ROTEIRO VITRINE REALISTA — ${config.name.toUpperCase()}

PRODUTO: ${cleanProductName}
LOCUÇÃO: Homem com voz masculina jovem e dinâmica
CENÁRIO: ${environment}
VALOR NA LOJA FÍSICA: ${formattedPrice || 'Valor Promocional'}
DURAÇÃO: 16 a 25 segundos
QUANTIDADE DE CENAS: 3

🎬 CENA 1 — GANCHO DE 0 A 3 SEGUNDOS

VISUAL:
${visual1}

SOM AMBIENTE:
${sound}

FALA:
"${speechLine1}"

PROMPT DO CENÁRIO:
${scenarioPrompt}

PROMPT DO VÍDEO:
${videoPrompt}

🎬 CENA 2 — DEMONSTRAÇÃO E PROVA DE QUALIDADE (3 A 15 SEGUNDOS)

VISUAL:
${visual2}

SOM AMBIENTE:
${sound}

FALA:
"${speechLine2}"

PROMPT DO CENÁRIO:
${scenarioPrompt}

PROMPT DO VÍDEO:
${videoPrompt}

🎬 CENA 3 — CHAMADA PARA AÇÃO E FECHAMENTO (15 A 25 SEGUNDOS)

VISUAL:
${visual3}

SOM AMBIENTE:
${sound}

FALA:
"${speechLine3}"

PROMPT DO CENÁRIO:
${scenarioPrompt}

PROMPT DO VÍDEO:
${videoPrompt}
`.trim();

        finalContent = `${finalContent}\n\n${robustSceneContent}`;
      }

      // Run Quality Validation & Fixes
      const validation = AgentOutputQualityValidator.validateAndFix(finalContent, cleanProductName, price);

      blocks.push({
        id: outTemplate.id,
        title: outTemplate.title,
        content: validation.sanitizedContent
      });
    });

    return blocks;
  }
}
