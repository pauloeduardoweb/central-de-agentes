import { PlayerStats, Achievement, MysteryCardChallenge } from '../types/challenge';
import { ACHIEVEMENTS } from '../data/achievements';

const PLAYER_STORAGE_KEY = 'geracaoz_challenge_player_stats_v1';

export interface LevelInfo {
  level: number;
  currentLevelXpStart: number;
  nextLevelXpRequirement: number;
  xpProgressInLevel: number;
  xpNeededForNextLevel: number;
  progressPercent: number;
}

export interface PlayerProgressRecordOutput {
  updatedStats: PlayerStats;
  xpGained: number;
  streakBonus: number;
  firstOfDayBonus: number;
  newlyUnlockedAchievements: Achievement[];
  didLevelUp: boolean;
  previousLevel: number;
  newLevel: number;
}

export class PlayerService {
  /**
   * Calculates Level progression curve based on total XP.
   * Level 1 = 0 to 200 XP, Level 2 = 200 to 550 XP (+350), etc.
   */
  public static calculateLevelInfo(totalXp: number): LevelInfo {
    let level = 1;
    let currentStart = 0;
    let levelCost = 200;

    while (totalXp >= currentStart + levelCost) {
      currentStart += levelCost;
      level++;
      levelCost = 200 + (level - 1) * 150;
    }

    const xpProgressInLevel = totalXp - currentStart;
    const progressPercent = Math.min(100, Math.round((xpProgressInLevel / levelCost) * 100));

    return {
      level,
      currentLevelXpStart: currentStart,
      nextLevelXpRequirement: currentStart + levelCost,
      xpProgressInLevel,
      xpNeededForNextLevel: levelCost,
      progressPercent,
    };
  }

  /**
   * Retrieves player stats from LocalStorage or returns initial defaults.
   */
  public static getPlayerStats(): PlayerStats {
    const defaultStats: PlayerStats = {
      totalXp: 0,
      level: 1,
      gamesPlayed: 0,
      correctCount: 0,
      wrongCount: 0,
      accuracyRate: 0,
      currentStreak: 0,
      bestStreak: 0,
      answeredChallengeIds: [],
      unlockedAchievementIds: [],
      categoryCounts: {},
      lastCompletedDate: undefined,
    };

    try {
      const raw = localStorage.getItem(PLAYER_STORAGE_KEY);
      if (!raw) return defaultStats;

      const parsed = JSON.parse(raw);
      const levelInfo = PlayerService.calculateLevelInfo(parsed.totalXp || 0);

      const correct = parsed.correctCount || 0;
      const games = parsed.gamesPlayed || 0;
      const accuracy = games > 0 ? Math.round((correct / games) * 100) : 0;

      return {
        ...defaultStats,
        ...parsed,
        level: levelInfo.level,
        accuracyRate: accuracy,
      };
    } catch (error) {
      console.error('PlayerService: Failed to parse stats from localStorage', error);
      return defaultStats;
    }
  }

  /**
   * Saves updated player stats to LocalStorage.
   */
  public static savePlayerStats(stats: PlayerStats): void {
    try {
      const levelInfo = PlayerService.calculateLevelInfo(stats.totalXp);
      const updatedStats = {
        ...stats,
        level: levelInfo.level,
      };
      localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(updatedStats));
    } catch (error) {
      console.error('PlayerService: Failed to save stats to localStorage', error);
    }
  }

  /**
   * Centralized evolution engine:
   * - Correct answer: adds challenge XP + bonuses + increments streak
   * - Wrong answer: 0 XP gained, resets current streak to 0 (does not remove XP)
   * - Automatically checks level up threshold
   * - Automatically checks achievement unlocks
   * - Persists progress in LocalStorage
   */
  public static recordRoundOutcome(
    challenge: MysteryCardChallenge,
    isCorrect: boolean
  ): PlayerProgressRecordOutput {
    const currentStats = PlayerService.getPlayerStats();
    const prevLevelInfo = PlayerService.calculateLevelInfo(currentStats.totalXp);
    const previousLevel = prevLevelInfo.level;

    let xpGained = 0;
    let streakBonus = 0;
    let firstOfDayBonus = 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const isFirstOfToday = currentStats.lastCompletedDate !== todayStr;

    // Active days tracking
    const activeDaysKey = 'geracaoz_active_days_set';
    let activeDaysSet: string[] = [];
    try {
      activeDaysSet = JSON.parse(localStorage.getItem(activeDaysKey) || '[]');
    } catch (e) {}

    if (!activeDaysSet.includes(todayStr)) {
      activeDaysSet.push(todayStr);
      localStorage.setItem(activeDaysKey, JSON.stringify(activeDaysSet));
    }

    let newCurrentStreak = currentStats.currentStreak;
    let newBestStreak = currentStats.bestStreak;
    let newCorrectCount = currentStats.correctCount;
    let newWrongCount = currentStats.wrongCount;

    if (isCorrect) {
      // 1. Add challenge XP
      xpGained += challenge.xp;

      // 2. Increment streak & best streak
      newCurrentStreak += 1;
      if (newCurrentStreak > newBestStreak) {
        newBestStreak = newCurrentStreak;
      }

      // 3. Streak Milestone Bonuses
      if (newCurrentStreak === 5) {
        streakBonus = 50;
      } else if (newCurrentStreak === 10) {
        streakBonus = 150;
      }

      // 4. First challenge of the day bonus
      if (isFirstOfToday) {
        firstOfDayBonus = 25;
      }

      newCorrectCount += 1;
    } else {
      // Rule: Each error does not remove XP, only ends current streak
      newCurrentStreak = 0;
      newWrongCount += 1;
    }

    const totalGainedThisRound = xpGained + streakBonus + firstOfDayBonus;
    const newTotalXp = currentStats.totalXp + totalGainedThisRound;
    const newGamesPlayed = currentStats.gamesPlayed + 1;
    const newAccuracyRate = Math.round((newCorrectCount / newGamesPlayed) * 100);

    // Track category counts
    const newCatCounts = { ...currentStats.categoryCounts };
    if (isCorrect) {
      const cat = challenge.hookCategory;
      newCatCounts[cat] = (newCatCounts[cat] || 0) + 1;
    }

    const newAnsweredIds = Array.from(new Set([...currentStats.answeredChallengeIds, challenge.id]));

    // Check level up
    const levelInfoBeforeAch = PlayerService.calculateLevelInfo(newTotalXp);

    // Check Achievements
    const newlyUnlockedAchievements: Achievement[] = [];
    const currentUnlocked = new Set(currentStats.unlockedAchievementIds);

    const checkAndUnlock = (achId: string, condition: boolean) => {
      if (condition && !currentUnlocked.has(achId)) {
        const ach = ACHIEVEMENTS.find((a) => a.id === achId);
        if (ach) {
          currentUnlocked.add(achId);
          newlyUnlockedAchievements.push(ach);
        }
      }
    };

    checkAndUnlock('first_win', isCorrect && newCorrectCount >= 1);
    checkAndUnlock('hook_hunter', newCorrectCount >= 10);
    checkAndUnlock('curiosity_master', (newCatCounts['Curiosidade'] || 0) >= 10);
    checkAndUnlock('fire_streak', newBestStreak >= 5);
    checkAndUnlock('unbeatable_copy', newBestStreak >= 10);
    checkAndUnlock('dedicated_student', activeDaysSet.length >= 3);
    checkAndUnlock('master_of_hooks', newCorrectCount >= 100);

    // Add bonus XP from newly unlocked achievements
    let achievementBonusXp = 0;
    newlyUnlockedAchievements.forEach((ach) => {
      achievementBonusXp += ach.bonusXp;
    });

    const finalTotalXp = newTotalXp + achievementBonusXp;
    const finalLevelInfo = PlayerService.calculateLevelInfo(finalTotalXp);
    const didLevelUp = finalLevelInfo.level > previousLevel;

    const updatedStats: PlayerStats = {
      totalXp: finalTotalXp,
      level: finalLevelInfo.level,
      gamesPlayed: newGamesPlayed,
      correctCount: newCorrectCount,
      wrongCount: newWrongCount,
      accuracyRate: newAccuracyRate,
      currentStreak: newCurrentStreak,
      bestStreak: newBestStreak,
      answeredChallengeIds: newAnsweredIds,
      lastCompletedDate: todayStr,
      unlockedAchievementIds: Array.from(currentUnlocked),
      categoryCounts: newCatCounts,
    };

    // Save to LocalStorage
    PlayerService.savePlayerStats(updatedStats);

    // Trigger async sync with backend DB (if available)
    PlayerService.syncWithDatabase(updatedStats).catch((e) => {
      console.warn('PlayerService: MySQL sync deferred or offline.', e);
    });

    return {
      updatedStats,
      xpGained: totalGainedThisRound + achievementBonusXp,
      streakBonus,
      firstOfDayBonus,
      newlyUnlockedAchievements,
      didLevelUp,
      previousLevel,
      newLevel: finalLevelInfo.level,
    };
  }

  /**
   * Synchronizes player progress with external database (MySQL backend endpoint).
   */
  public static async syncWithDatabase(stats: PlayerStats): Promise<boolean> {
    try {
      const studentCode = typeof window !== 'undefined' ? localStorage.getItem('user_student_access_code') || '' : '';
      if (!studentCode) return false;

      const res = await fetch('/api/player/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
          'x-student-access-code': studentCode,
        },
        body: JSON.stringify({
          accessCode: studentCode,
          totalXp: stats.totalXp,
          correctCount: stats.correctCount,
          gamesPlayed: stats.gamesPlayed,
          currentStreak: stats.currentStreak,
          bestStreak: stats.bestStreak,
        }),
      });
      return res.ok;
    } catch (err) {
      console.warn('PlayerService: Cloud DB sync failed or offline', err);
    }
    return false;
  }
}
