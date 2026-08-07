import { Agent, ChatMessage, ChatSession, TeamGroup, AgentStepState } from '../types';
import { DEFAULT_AGENTS } from '../data/defaultAgents';

const AGENTS_STORAGE_KEY = 'gpt_central_agents_v15';
const CHAT_SESSIONS_STORAGE_KEY = 'gpt_central_chats_v1';
const TEAMS_STORAGE_KEY = 'gpt_central_teams_v1';

export function getStoredAgents(): Agent[] {
  try {
    const raw = localStorage.getItem(AGENTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(DEFAULT_AGENTS));
      return DEFAULT_AGENTS;
    }
    const parsed: Agent[] = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const defaultMap = new Map(DEFAULT_AGENTS.map((d) => [d.id, d]));
      const storedMap = new Map(parsed.map((a) => [a.id, a]));

      // Preserve default agent order and ensure all properties are updated to match DEFAULT_AGENTS
      const updatedDefaults = DEFAULT_AGENTS.map((def) => {
        const stored = storedMap.get(def.id);
        if (stored) {
          return {
            ...def,
            isFavorite: Boolean(stored.isFavorite),
            usageCount: stored.usageCount || def.usageCount,
            lastUsedAt: stored.lastUsedAt || def.lastUsedAt,
          };
        }
        return def;
      });

      // Preserve user created custom agents
      const customAgents = parsed.filter((agent) => agent.isCustom);

      const finalList = [...updatedDefaults, ...customAgents];
      localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(finalList));
      return finalList;
    }
    return DEFAULT_AGENTS;
  } catch (err) {
    console.error('Error reading stored agents:', err);
    return DEFAULT_AGENTS;
  }
}

export function saveAgents(agents: Agent[]): void {
  try {
    localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
  } catch (err) {
    console.error('Error saving agents:', err);
  }
}

export function resetAgentsToDefault(): Agent[] {
  localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(DEFAULT_AGENTS));
  return DEFAULT_AGENTS;
}

export function getStoredChatSession(agentId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const sessions: Record<string, ChatSession> = JSON.parse(raw);
    return sessions[agentId]?.messages || [];
  } catch (err) {
    console.error('Error reading chat session:', err);
    return [];
  }
}

export function getStoredChatSessionFull(agentId: string): { messages: ChatMessage[]; localState?: AgentStepState } {
  try {
    const raw = localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
    if (!raw) return { messages: [] };
    const sessions: Record<string, ChatSession> = JSON.parse(raw);
    const session = sessions[agentId];
    return {
      messages: session?.messages || [],
      localState: session?.localState,
    };
  } catch (err) {
    console.error('Error reading full chat session:', err);
    return { messages: [] };
  }
}

export function saveChatSession(agentId: string, messages: ChatMessage[], localState?: AgentStepState): void {
  try {
    const raw = localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
    const sessions: Record<string, ChatSession> = raw ? JSON.parse(raw) : {};
    sessions[agentId] = {
      agentId,
      messages,
      localState,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error('Error saving chat session:', err);
  }
}

export function clearChatSession(agentId: string): void {
  try {
    const raw = localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
    if (!raw) return;
    const sessions: Record<string, ChatSession> = JSON.parse(raw);
    delete sessions[agentId];
    localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error('Error clearing chat session:', err);
  }
}

export function getStoredTeams(): TeamGroup[] {
  try {
    const raw = localStorage.getItem(TEAMS_STORAGE_KEY);
    if (!raw) {
      const defaultTeam: TeamGroup = {
        id: 'team-growth-squad',
        name: 'Esquadrão de Growth & Produto',
        description: 'Estratégia de negócios, copywriting e design UX em conjunto.',
        agentIds: ['agent-business-strategist', 'agent-copywriter-pro', 'agent-ux-design-critique'],
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify([defaultTeam]));
      return [defaultTeam];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error getting teams:', err);
    return [];
  }
}

export function saveTeams(teams: TeamGroup[]): void {
  try {
    localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify(teams));
  } catch (err) {
    console.error('Error saving teams:', err);
  }
}
