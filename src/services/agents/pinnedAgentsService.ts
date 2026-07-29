export interface PinnedAgent {
  agentId: string;
  pinnedAt: string;
}

const STORAGE_KEY = 'generation_z_pro_pinned_agents';
export const MAX_PINNED_AGENTS = 4;

export class PinnedAgentsService {
  /**
   * Get list of pinned agents from localStorage
   */
  static getPinnedAgents(): PinnedAgent[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
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
   * Save array of pinned agents to localStorage
   */
  static savePinnedAgents(pinned: PinnedAgent[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pinned));
    } catch (e) {
      console.error('[PinnedAgentsService] Error saving pinned agents:', e);
    }
  }

  /**
   * Check if an agent ID is currently pinned
   */
  static isPinned(agentId: string): boolean {
    const current = this.getPinnedAgents();
    return current.some((item) => item.agentId === agentId);
  }

  /**
   * Pin an agent if limit not reached
   */
  static pinAgent(agentId: string): { success: boolean; message: string } {
    const current = this.getPinnedAgents();

    if (current.some((item) => item.agentId === agentId)) {
      return { success: true, message: 'Agente já está fixado.' };
    }

    if (current.length >= MAX_PINNED_AGENTS) {
      return {
        success: false,
        message: 'Você já fixou o limite máximo de 4 agentes. Desafixe um agente para fixar outro.',
      };
    }

    const updated: PinnedAgent[] = [
      ...current,
      { agentId, pinnedAt: new Date().toISOString() },
    ];

    this.savePinnedAgents(updated);
    return { success: true, message: 'Agente fixado com sucesso.' };
  }

  /**
   * Unpin an agent
   */
  static unpinAgent(agentId: string): { success: boolean; message: string } {
    const current = this.getPinnedAgents();
    const updated = current.filter((item) => item.agentId !== agentId);
    this.savePinnedAgents(updated);
    return { success: true, message: 'Agente removido dos fixados.' };
  }

  /**
   * Toggle pin state for an agent
   */
  static togglePinned(agentId: string): { success: boolean; isPinned: boolean; message: string } {
    if (this.isPinned(agentId)) {
      const res = this.unpinAgent(agentId);
      return { success: res.success, isPinned: false, message: res.message };
    } else {
      const res = this.pinAgent(agentId);
      return { success: res.success, isPinned: res.success, message: res.message };
    }
  }
}
