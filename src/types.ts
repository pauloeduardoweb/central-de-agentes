export interface Capabilities {
  codeInterpreter: boolean;
  webSearch: boolean;
  imageGeneration: boolean;
  jsonOutput: boolean;
}

export interface Agent {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  iconName: string;
  colorTheme: string;
  systemInstruction: string;
  conversationStarters: string[];
  capabilities: Capabilities;
  temperature: number;
  isFavorite: boolean;
  isCustom: boolean;
  usageCount: number;
  createdAt: string;
  lastUsedAt?: string;
}
