import { normalizeAccessCode, isMasterKey } from '../../data/studentCodes';

export const OLD_GLOBAL_FAVORITES_KEY = 'generation_z_pro_favorites';
export const AGENTS_STORAGE_KEY = 'gpt_central_agents_v15';
export const FAVORITES_STORAGE_PREFIX = 'generation_z_pro_favorites_';

/**
 * Generate a localStorage key based on user identifier for favorites.
 * - MASTER -> generation_z_pro_favorites_MASTER
 * - STUDENT -> generation_z_pro_favorites_<NORMALIZED_CODE>
 * - Unauthenticated / empty -> null
 */
export function getFavoritesStorageKey(userIdentifier?: string): string | null {
  if (!userIdentifier) return null;
  const normalized = normalizeAccessCode(userIdentifier);
  if (!normalized) return null;

  if (normalized === 'MASTER' || isMasterKey(normalized)) {
    return `${FAVORITES_STORAGE_PREFIX}MASTER`;
  }

  return `${FAVORITES_STORAGE_PREFIX}${normalized}`;
}

export class FavoritesService {
  /**
   * Get list of favorite agent IDs from localStorage for a specific user.
   * Performs legacy migration ONLY for MASTER.
   */
  static getFavorites(userIdentifier?: string): string[] {
    const key = getFavoritesStorageKey(userIdentifier);
    if (!key) return [];

    try {
      // Migration logic strictly for MASTER account
      if (key === `${FAVORITES_STORAGE_PREFIX}MASTER`) {
        const masterData = localStorage.getItem(key);
        if (!masterData) {
          const migratedFavorites: string[] = [];

          // 1. Check if old dedicated key exists
          const oldGlobalData = localStorage.getItem(OLD_GLOBAL_FAVORITES_KEY);
          if (oldGlobalData) {
            try {
              const parsed = JSON.parse(oldGlobalData);
              if (Array.isArray(parsed)) {
                for (const item of parsed) {
                  if (typeof item === 'string' && !migratedFavorites.includes(item)) {
                    migratedFavorites.push(item);
                  }
                }
              }
            } catch (e) {
              console.error('[FavoritesService] Error reading old global favorites:', e);
            }
          }

          // 2. Check if old agents storage key (gpt_central_agents_v15) has agents with isFavorite === true
          const agentsRaw = localStorage.getItem(AGENTS_STORAGE_KEY);
          if (agentsRaw) {
            try {
              const agents = JSON.parse(agentsRaw);
              if (Array.isArray(agents)) {
                const legacyFavIds = agents
                  .filter((a: any) => a && a.isFavorite === true)
                  .map((a: any) => a.id);

                for (const favId of legacyFavIds) {
                  if (typeof favId === 'string' && !migratedFavorites.includes(favId)) {
                    migratedFavorites.push(favId);
                  }
                }

                // Clean up isFavorite from global agents storage so it doesn't leak to other accounts
                const cleanedAgents = agents.map((a: any) => ({ ...a, isFavorite: false }));
                localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(cleanedAgents));
              }
            } catch (e) {
              console.error('[FavoritesService] Error migrating from gpt_central_agents_v15:', e);
            }
          }

          if (migratedFavorites.length > 0) {
            localStorage.setItem(key, JSON.stringify(migratedFavorites));
          }

          if (oldGlobalData) {
            localStorage.removeItem(OLD_GLOBAL_FAVORITES_KEY);
          }
        }
      }

      const data = localStorage.getItem(key);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter((id) => typeof id === 'string');
      }
      return [];
    } catch (e) {
      console.error('[FavoritesService] Error parsing favorites:', e);
      return [];
    }
  }

  /**
   * Save array of favorite agent IDs for a specific user
   */
  static saveFavorites(userIdentifier: string | undefined, favorites: string[]): void {
    const key = getFavoritesStorageKey(userIdentifier);
    if (!key) return;

    try {
      localStorage.setItem(key, JSON.stringify(favorites));
    } catch (e) {
      console.error('[FavoritesService] Error saving favorites:', e);
    }
  }

  /**
   * Check if an agent ID is favorited by a user
   */
  static isFavorite(userIdentifier: string | undefined, agentId: string): boolean {
    if (!userIdentifier) return false;
    const favorites = this.getFavorites(userIdentifier);
    return favorites.includes(agentId);
  }

  /**
   * Add an agent to user's favorites
   */
  static addFavorite(userIdentifier: string | undefined, agentId: string): void {
    if (!userIdentifier) return;
    const favorites = this.getFavorites(userIdentifier);
    if (!favorites.includes(agentId)) {
      const updated = [...favorites, agentId];
      this.saveFavorites(userIdentifier, updated);
    }
  }

  /**
   * Remove an agent from user's favorites
   */
  static removeFavorite(userIdentifier: string | undefined, agentId: string): void {
    if (!userIdentifier) return;
    const favorites = this.getFavorites(userIdentifier);
    const updated = favorites.filter((id) => id !== agentId);
    this.saveFavorites(userIdentifier, updated);
  }

  /**
   * Toggle favorite status for an agent for a user
   */
  static toggleFavorite(userIdentifier: string | undefined, agentId: string): { success: boolean; isFavorite: boolean } {
    if (!userIdentifier) {
      return { success: false, isFavorite: false };
    }
    const current = this.isFavorite(userIdentifier, agentId);
    if (current) {
      this.removeFavorite(userIdentifier, agentId);
      return { success: true, isFavorite: false };
    } else {
      this.addFavorite(userIdentifier, agentId);
      return { success: true, isFavorite: true };
    }
  }

  /**
   * Clear favorites for a user
   */
  static clearFavorites(userIdentifier?: string): void {
    const key = getFavoritesStorageKey(userIdentifier);
    if (!key) return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('[FavoritesService] Error clearing favorites:', e);
    }
  }
}
