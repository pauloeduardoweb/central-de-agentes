export type IdentificationSource = 'local-vision' | 'title' | 'combined' | 'manual';

export interface ProductVisionResult {
  detectedProduct: string;
  detectedCategory: string;
  visualAttributes: string[];
  dominantObjects: string[];
  possibleUseCases: string[];
  confidence: number;
  source: IdentificationSource;
  needsConfirmation: boolean;
}

export interface ProductContext {
  productName: string;
  productCategory: string;
  productSubcategory?: string;
  visualDescription: string;
  confirmedAttributes: string[];
  unconfirmedAttributes: string[];
  targetAudience?: string;
  titleProvided?: string;
  imageReferenceId?: string;
  imageOriginalName?: string; // Internal technical reference only
  identificationSource: IdentificationSource;
  confidence: number;
}

export interface SceneContinuityContext {
  productName: string;
  colorTheme: string;
  settingLocation: string;
  modelPresenter: string;
  lightingStyle: string;
}
