import { AgentStep, AgentOption, AgentImage } from '../agents/agentTypes';
import { LocalVisionEngine } from './vision/LocalVisionEngine';
import { ProductDescriptionBuilder } from './vision/ProductDescriptionBuilder';
import { ProductContext, ProductVisionResult } from './vision/visionTypes';

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
  matchedOption?: AgentOption;
  sanitizedValue?: string;
  imageNotice?: string;
  productContext?: ProductContext;
  visionResult?: ProductVisionResult;
}

export class AgentResponseValidator {
  static async validate(
    step: AgentStep,
    textInput: string,
    attachedImage: AgentImage | null
  ): Promise<ValidationResult> {
    const rawText = textInput.trim();

    // 1. Image-based validation checks
    if (step.type === 'image' || (step.validation && step.validation.requireImage)) {
      if (!attachedImage) {
        return {
          isValid: false,
          errorMessage: 'Anexe a foto solicitada para continuar.'
        };
      }

      const { visionResult, productContext } = await LocalVisionEngine.analyzeImageAndTitle(
        attachedImage.data,
        rawText,
        attachedImage.name
      );

      return {
        isValid: true,
        sanitizedValue: productContext.productName,
        imageNotice: `Foto analisada localmente: ${productContext.productName}`,
        productContext,
        visionResult
      };
    }

    // 2. Text or Allow-Image-Only validation (Usually Step 0)
    if (step.type === 'text') {
      if (step.required && !rawText && !attachedImage) {
        return {
          isValid: false,
          errorMessage: step.validation?.customError || 'Responda à etapa atual para continuarmos.'
        };
      }

      let productCtx: ProductContext | undefined = undefined;
      let visRes: ProductVisionResult | undefined = undefined;

      if (attachedImage || rawText) {
        const result = await LocalVisionEngine.analyzeImageAndTitle(
          attachedImage?.data || null,
          rawText,
          attachedImage?.name || 'foto.png'
        );
        productCtx = result.productContext;
        visRes = result.visionResult;
      }

      const sanitizedName = productCtx
        ? productCtx.productName
        : ProductDescriptionBuilder.sanitizeProductName(rawText, 'Produto Destaque');

      let notice: string | undefined = undefined;
      if (attachedImage) {
        notice = `Foto recebida e vinculada ao projeto. Produto identificado: "${sanitizedName}".`;
      }

      return {
        isValid: true,
        sanitizedValue: sanitizedName,
        imageNotice: notice,
        productContext: productCtx,
        visionResult: visRes
      };
    }

    // 3. Single Choice & Multiple Choice validation
    if (step.type === 'single-choice' || step.type === 'multiple-choice') {
      if (!step.options || step.options.length === 0) {
        return { isValid: true, sanitizedValue: rawText || 'Ok' };
      }

      // Check if text input matches an option ID, label, digit, or emoji
      const normalizedInput = rawText.toLowerCase().replace(/[^\w\d]/g, '');

      const matched = step.options.find((opt) => {
        const optId = opt.id.toLowerCase();
        const optVal = opt.value.toLowerCase();
        const optLabel = opt.label.toLowerCase();

        if (rawText.trim() === opt.id) return true;
        if (rawText.trim() === opt.label) return true;
        if (rawText.trim() === opt.value) return true;

        if (normalizedInput.length > 0) {
          if (optId === normalizedInput) return true;
          if (optLabel.replace(/[^\w\d]/g, '').includes(normalizedInput)) return true;
          if (optVal.replace(/[^\w\d]/g, '').includes(normalizedInput)) return true;
        }

        return false;
      });

      if (!matched) {
        let err = 'Essa resposta não corresponde às opções da etapa atual. Escolha uma das opções apresentadas.';
        if (attachedImage && !rawText) {
          err = 'Foto recebida e vinculada ao projeto. Agora escolha uma das opções apresentadas.';
        }
        return {
          isValid: false,
          errorMessage: err
        };
      }

      return {
        isValid: true,
        matchedOption: matched,
        sanitizedValue: matched.value
      };
    }

    // Default fallback
    if (step.required && !rawText && !attachedImage) {
      return {
        isValid: false,
        errorMessage: 'Responda à etapa atual para continuarmos.'
      };
    }

    return {
      isValid: true,
      sanitizedValue: rawText || 'Ok'
    };
  }
}
