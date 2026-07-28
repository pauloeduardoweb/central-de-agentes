import { PlayerStats, Achievement, MysteryCardChallenge } from '../types/challenge';
import { PlayerService, LevelInfo, PlayerProgressRecordOutput } from './PlayerService';

export type { LevelInfo };

export function calculateLevelInfo(totalXp: number): LevelInfo {
  return PlayerService.calculateLevelInfo(totalXp);
}

export function getStoredPlayerStats(): PlayerStats {
  return PlayerService.getPlayerStats();
}

export function savePlayerStats(stats: PlayerStats): void {
  PlayerService.savePlayerStats(stats);
}

export interface RecordRoundOutput {
  updatedStats: PlayerStats;
  xpGained: number;
  streakBonus: number;
  firstOfDayBonus: number;
  newlyUnlockedAchievements: Achievement[];
  didLevelUp: boolean;
  previousLevel: number;
  newLevel: number;
}

export function recordChallengeRoundResult(
  challenge: MysteryCardChallenge,
  isCorrect: boolean
): RecordRoundOutput {
  const result: PlayerProgressRecordOutput = PlayerService.recordRoundOutcome(challenge, isCorrect);
  return {
    updatedStats: result.updatedStats,
    xpGained: result.xpGained,
    streakBonus: result.streakBonus,
    firstOfDayBonus: result.firstOfDayBonus,
    newlyUnlockedAchievements: result.newlyUnlockedAchievements,
    didLevelUp: result.didLevelUp,
    previousLevel: result.previousLevel,
    newLevel: result.newLevel,
  };
}
