import { useState, useEffect, useCallback } from 'react';
import {
  PinnedAgentsService,
  PinnedAgent,
  MAX_PINNED_AGENTS,
  getPinnedAgentsStorageKey,
} from '../services/agents/pinnedAgentsService';

export function usePinnedAgents(userIdentifier?: string) {
  const [pinnedList, setPinnedList] = useState<PinnedAgent[]>([]);
  const [pinnedLimitMessage, setPinnedLimitMessage] = useState<string | null>(null);

  const refreshPinned = useCallback(() => {
    setPinnedList(PinnedAgentsService.getPinnedAgents(userIdentifier));
  }, [userIdentifier]);

  const clearLimitMessage = useCallback(() => {
    setPinnedLimitMessage(null);
  }, []);

  useEffect(() => {
    setPinnedLimitMessage(null);
    setPinnedList(PinnedAgentsService.getPinnedAgents(userIdentifier));

    const storageKey = getPinnedAgentsStorageKey(userIdentifier);

    // Listen for storage changes across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (storageKey && e.key === storageKey) {
        refreshPinned();
      }
    };

    // Listen for custom event in the same tab
    const handleCustomEvent = () => {
      refreshPinned();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('pinned_agents_updated', handleCustomEvent);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('pinned_agents_updated', handleCustomEvent);
    };
  }, [userIdentifier, refreshPinned]);

  const isPinned = useCallback(
    (agentId: string) => {
      return pinnedList.some((item) => item.agentId === agentId);
    },
    [pinnedList]
  );

  const pinAgent = useCallback(
    (agentId: string) => {
      const result = PinnedAgentsService.pinAgent(userIdentifier, agentId);
      if (result.success) {
        setPinnedLimitMessage(null);
        refreshPinned();
      } else if (result.message) {
        setPinnedLimitMessage(result.message);
      }
      return result;
    },
    [userIdentifier, refreshPinned]
  );

  const unpinAgent = useCallback(
    (agentId: string) => {
      const result = PinnedAgentsService.unpinAgent(userIdentifier, agentId);
      if (result.success) {
        setPinnedLimitMessage(null);
        refreshPinned();
      }
      return result;
    },
    [userIdentifier, refreshPinned]
  );

  const togglePinned = useCallback(
    (agentId: string) => {
      const result = PinnedAgentsService.togglePinned(userIdentifier, agentId);
      if (!result.success && result.message) {
        setPinnedLimitMessage(result.message);
      } else {
        setPinnedLimitMessage(null);
      }
      refreshPinned();
      return result;
    },
    [userIdentifier, refreshPinned]
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

