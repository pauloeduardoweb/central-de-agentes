import { Agent } from '../types';

const STORAGE_KEY = 'geracaozpro_agents';

export const initialAgents: Agent[] = [
  {
    id: 'agent-geracaozpro-oficial',
    name: 'Geração Z Pro Oficial',
    tagline: 'Assistente Estratégico',
    description: 'Agente oficial de suporte e estratégias da comunidade Geração Z Pro.',
    category: 'Suporte',
    iconName: 'Zap',
    colorTheme: 'emerald',
    systemInstruction: 'Você é o assistente oficial da Geração Z Pro. Ajude o usuário com estratégias de conteúdo, monetização e crescimento no TikTok.',
    conversationStarters: ['Como posso monetizar meu TikTok?', 'Qual a melhor estratégia para o TikTok 2K?'],
    capabilities: { codeInterpreter: true, webSearch: true, imageGeneration: true, jsonOutput: false },
    temperature: 0.7,
    isFavorite: true,
    isCustom: false,
    usageCount: 0,
    createdAt: new Date().toISOString(),
  }
];

export const getStoredAgents = (): Agent[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : initialAgents;
  } catch (e) {
    console.error('Erro ao carregar agentes do localStorage', e);
    return initialAgents;
  }
};

export const saveAgents = (agents: Agent[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
  } catch (e) {
    console.error('Erro ao salvar agentes no localStorage', e);
  }
};

export const resetAgentsToDefault = (): Agent[] => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Erro ao resetar agentes', e);
  }
  return initialAgents;
};
