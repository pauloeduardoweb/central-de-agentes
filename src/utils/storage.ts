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
      let hasUpdates = false;

      // Filter out deleted non-custom default agents
      const validParsed = parsed.filter((agent) => agent.isCustom || defaultMap.has(agent.id));
      if (validParsed.length !== parsed.length) {
        hasUpdates = true;
      }

      const mergedList = validParsed.map((agent) => {
        const def = defaultMap.get(agent.id);
        if (def) {
          if (
            (def.name !== undefined && agent.name !== def.name) ||
            (def.chatGptUrl !== undefined && agent.chatGptUrl !== def.chatGptUrl) ||
            (def.geminiUrl !== undefined && agent.geminiUrl !== def.geminiUrl) ||
            (def.exampleVideoUrl !== undefined && agent.exampleVideoUrl !== def.exampleVideoUrl) ||
            (def.exampleVideoUrls !== undefined && JSON.stringify(agent.exampleVideoUrls) !== JSON.stringify(def.exampleVideoUrls)) ||
            (def.posterSlug !== undefined && agent.posterSlug !== def.posterSlug) ||
            (def.coverImage !== undefined && agent.coverImage !== def.coverImage) ||
            (def.chatBackgroundImage !== undefined && agent.chatBackgroundImage !== def.chatBackgroundImage) ||
            (def.tagline !== undefined && agent.tagline !== def.tagline) ||
            (def.description !== undefined && agent.description !== def.description) ||
            (def.systemInstruction !== undefined && agent.systemInstruction !== def.systemInstruction)
          ) {
            hasUpdates = true;
            return {
              ...agent,
              name: def.name,
              chatGptUrl: def.chatGptUrl,
              geminiUrl: def.geminiUrl,
              exampleVideoUrl: def.exampleVideoUrl,
              exampleVideoUrls: def.exampleVideoUrls,
              posterSlug: def.posterSlug,
              coverImage: def.coverImage,
              chatBackgroundImage: def.chatBackgroundImage,
              tagline: def.tagline,
              description: def.description,
              systemInstruction: def.systemInstruction,
              conversationStarters: def.conversationStarters || agent.conversationStarters,
            };
          }
        }
        return agent;
      });

      const existingIds = new Set(mergedList.map((a) => a.id));
      const missingDefaults = DEFAULT_AGENTS.filter((def) => !existingIds.has(def.id));
      if (missingDefaults.length > 0 || hasUpdates) {
        const finalList = [...missingDefaults, ...mergedList];
        localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(finalList));
        return finalList;
      }
      return mergedList;
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
