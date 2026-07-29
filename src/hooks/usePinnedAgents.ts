import { useState, useEffect, useCallback } from 'react';
import { PinnedAgentsService, PinnedAgent, MAX_PINNED_AGENTS } from '../services/agents/pinnedAgentsService';

export function usePinnedAgents() {
  const [pinnedList, setPinnedList] = useState<PinnedAgent[]>([]);
  const [pinnedLimitMessage, setPinnedLimitMessage] = useState<string | null>(null);

  const refreshPinned = useCallback(() => {
    setPinnedList(PinnedAgentsService.getPinnedAgents());
  }, []);

  const clearLimitMessage = useCallback(() => {
    setPinnedLimitMessage(null);
  }, []);

  useEffect(() => {
    refreshPinned();

    // Listen for storage changes across tabs or custom events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'generation_z_pro_pinned_agents') {
        refreshPinned();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [refreshPinned]);

  const isPinned = useCallback(
    (agentId: string) => {
      return pinnedList.some((item) => item.agentId === agentId);
    },
    [pinnedList]
  );

  const pinAgent = useCallback(
    (agentId: string) => {
      const result = PinnedAgentsService.pinAgent(agentId);
      if (result.success) {
        setPinnedLimitMessage(null);
        refreshPinned();
      } else if (result.message) {
        setPinnedLimitMessage(result.message);
      }
      return result;
    },
    [refreshPinned]
  );

  const unpinAgent = useCallback(
    (agentId: string) => {
      const result = PinnedAgentsService.unpinAgent(agentId);
      if (result.success) {
        setPinnedLimitMessage(null);
        refreshPinned();
      }
      return result;
    },
    [refreshPinned]
  );

  const togglePinned = useCallback(
    (agentId: string) => {
      const result = PinnedAgentsService.togglePinned(agentId);
      if (!result.success && result.message) {
        setPinnedLimitMessage(result.message);
      } else {
        setPinnedLimitMessage(null);
      }
      refreshPinned();
      return result;
    },
    [refreshPinned]
  );

  const pinnedAgentIds = pinnedList.map((item) => item.agentId);
  const pinnedCount = pinnedList.length;
  const canPinMore = pinnedCount < MAX_PINNED_AGENTS;

  return {
    pinnedAgents: pinnedList,
    pinnedAgentIds,
    isPinned,
    pinAgent,
    unpinAgent,
    togglePinned,
    canPinMore,
    pinnedCount,
    maxLimit: MAX_PINNED_AGENTS,
    pinnedLimitMessage,
    clearLimitMessage,
    refreshPinned,
  };
}
