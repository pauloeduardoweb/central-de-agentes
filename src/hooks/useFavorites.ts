import { useState, useEffect, useCallback } from 'react';
import {
  FavoritesService,
  getFavoritesStorageKey,
} from '../services/agents/favoritesService';

export function useFavorites(userIdentifier?: string) {
  const [favoriteAgentIds, setFavoriteAgentIds] = useState<string[]>([]);

  const refreshFavorites = useCallback(() => {
    if (!userIdentifier) {
      setFavoriteAgentIds([]);
      return;
    }
    setFavoriteAgentIds(FavoritesService.getFavorites(userIdentifier));
  }, [userIdentifier]);

  useEffect(() => {
    // When userIdentifier changes, immediately update visual state
    if (!userIdentifier) {
      setFavoriteAgentIds([]);
    } else {
      setFavoriteAgentIds(FavoritesService.getFavorites(userIdentifier));
    }

    const storageKey = getFavoritesStorageKey(userIdentifier);

    // Listen for storage changes across tabs or custom events
    const handleStorageChange = (e: StorageEvent) => {
      if (storageKey && e.key === storageKey) {
        refreshFavorites();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [userIdentifier, refreshFavorites]);

  const isFavorite = useCallback(
    (agentId: string) => {
      if (!userIdentifier) return false;
      return favoriteAgentIds.includes(agentId);
    },
    [userIdentifier, favoriteAgentIds]
  );

  const toggleFavorite = useCallback(
    (agentId: string) => {
      if (!userIdentifier) {
        return { success: false, isFavorite: false };
      }
      const result = FavoritesService.toggleFavorite(userIdentifier, agentId);
      refreshFavorites();
      return result;
    },
    [userIdentifier, refreshFavorites]
  );

  return {
    favoriteAgentIds,
    favoriteCount: favoriteAgentIds.length,
    isFavorite,
    toggleFavorite,
    refreshFavorites,
  };
}
