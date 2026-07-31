import { normalizeAccessCode, isMasterKey } from '../../data/studentCodes';

export interface PinnedAgent {
  agentId: string;
  pinnedAt: string;
}

export const OLD_GLOBAL_STORAGE_KEY = 'generation_z_pro_pinned_agents';
export const PINNED_STORAGE_PREFIX = 'generation_z_pro_pinned_agents_';
export const MAX_PINNED_AGENTS = 5;

/**
 * Generate a localStorage key based on user identifier.
 * - MASTER -> generation_z_pro_pinned_agents_MASTER
 * - STUDENT -> generation_z_pro_pinned_agents_<NORMALIZED_CODE>
 * - Unauthenticated / empty -> null
 */
export function getPinnedAgentsStorageKey(userIdentifier?: string): string | null {
  if (!userIdentifier) return null;
  const normalized = normalizeAccessCode(userIdentifier);
  if (!normalized) return null;

  if (normalized === 'MASTER' || isMasterKey(normalized)) {
    return `${PINNED_STORAGE_PREFIX}MASTER`;
  }

  return `${PINNED_STORAGE_PREFIX}${normalized}`;
}

export class PinnedAgentsService {
  /**
   * Get list of pinned agents from localStorage for a specific user
   */
  static getPinnedAgents(userIdentifier?: string): PinnedAgent[] {
    const key = getPinnedAgentsStorageKey(userIdentifier);
    if (!key) return [];

    try {
      // Migration logic for MASTER account
      if (key === `${PINNED_STORAGE_PREFIX}MASTER`) {
        const oldData = localStorage.getItem(OLD_GLOBAL_STORAGE_KEY);
        const masterData = localStorage.getItem(key);
        if (oldData && !masterData) {
          localStorage.setItem(key, oldData);
          localStorage.removeItem(OLD_GLOBAL_STORAGE_KEY);
        }
      }

      const data = localStorage.getItem(key);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => item && typeof item.agentId === 'string');
      }
      return [];
    } catch (e) {
      console.error('[PinnedAgentsService] Error parsing pinned agents:', e);
      return [];
    }
  }

  /**
   * Save array of pinned agents to localStorage for a specific user
   */
  static savePinnedAgents(userIdentifier: string | undefined, pinned: PinnedAgent[]): void {
    const key = getPinnedAgentsStorageKey(userIdentifier);
    if (!key) return;

    try {
      localStorage.setItem(key, JSON.stringify(pinned));
    } catch (e) {
      console.error('[PinnedAgentsService] Error saving pinned agents:', e);
    }
  }

  /**
   * Check if an agent ID is currently pinned for a user
   */
  static isPinned(userIdentifier: string | undefined, agentId: string): boolean {
    const current = this.getPinnedAgents(userIdentifier);
    return current.some((item) => item.agentId === agentId);
  }

  /**
   * Pin an agent if limit not reached for a user
   */
  static pinAgent(userIdentifier: string | undefined, agentId: string): { success: boolean; message: string } {
    if (!userIdentifier) {
      return { success: false, message: 'Usuário não autenticado.' };
    }

    const current = this.getPinnedAgents(userIdentifier);

    if (current.some((item) => item.agentId === agentId)) {
      return { success: true, message: 'Agente já está fixado.' };
    }

    if (current.length >= MAX_PINNED_AGENTS) {
      return {
        success: false,
        message: 'Você já fixou o limite máximo de 5 agentes. Desafixe um agente para fixar outro.',
      };
    }

    const updated: PinnedAgent[] = [
      ...current,
      { agentId, pinnedAt: new Date().toISOString() },
    ];

    this.savePinnedAgents(userIdentifier, updated);
    return { success: true, message: 'Agente fixado com sucesso.' };
  }

  /**
   * Unpin an agent for a user
   */
  static unpinAgent(userIdentifier: string | undefined, agentId: string): { success: boolean; message: string } {
    if (!userIdentifier) {
      return { success: false, message: 'Usuário não autenticado.' };
    }

    const current = this.getPinnedAgents(userIdentifier);
    const updated = current.filter((item) => item.agentId !== agentId);
    this.savePinnedAgents(userIdentifier, updated);
    return { success: true, message: 'Agente removido dos fixados.' };
  }

  /**
   * Toggle pin state for an agent for a user
   */
  static togglePinned(userIdentifier: string | undefined, agentId: string): { success: boolean; isPinned: boolean; message: string } {
    if (this.isPinned(userIdentifier, agentId)) {
      const res = this.unpinAgent(userIdentifier, agentId);
      return { success: res.success, isPinned: false, message: res.message };
    } else {
      const res = this.pinAgent(userIdentifier, agentId);
      return { success: res.success, isPinned: res.success, message: res.message };
    }
  }

  /**
   * Clear pinned agents for a user
   */
  static clearPinnedAgents(userIdentifier?: string): void {
    const key = getPinnedAgentsStorageKey(userIdentifier);
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('[PinnedAgentsService] Error clearing pinned agents:', e);
    }
  }
}

