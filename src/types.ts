export type CategoryType = 'Tiktok 2K' | 'Tiktok Shop' | 'Recurso Anti-Violação' | 'Suporte' | 'Grupo de Network' | 'Flow Ultra' | 'Todas';

export interface AgentCapabilities {
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
  category: CategoryType;
  iconName: string; // Lucide icon name string
  colorTheme: string; // Tailwind color name e.g. "emerald", "indigo", "violet", "amber", "rose", "cyan"
  systemInstruction: string;
  conversationStarters: string[];
  capabilities: AgentCapabilities;
  temperature: number;
  model?: string;
  avatarUrl?: string;
  coverImage?: string;
  chatBackgroundImage?: string;
  posterSlug?: 'casquinha-animal' | 'frutas-em-crise' | 'homem-da-roca' | 'mulher-da-roca' | 'babybola-viral' | 'dama-vidente' | 'mensageiro-de-deus' | 'anti-violacao' | string;
  chatGptUrl?: string;
  geminiUrl?: string;
  exampleVideoUrl?: string;
  exampleVideoUrls?: string[];
  isFavorite?: boolean;
  isCustom?: boolean;
  usageCount?: number;
  lastUsedAt?: string;
  knowledgeSnippets?: string[];
  createdAt?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: string;
  timestamp: string;
}

export interface ChatSession {
  agentId: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export interface TeamGroup {
  id: string;
  name: string;
  description: string;
  agentIds: string[];
  createdAt: string;
}
