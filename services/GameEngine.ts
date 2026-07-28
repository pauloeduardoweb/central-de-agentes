import { MysteryCardChallenge, CardOption, RoundResult, PlayerStats, Achievement } from '../types/challenge';
import { MediaService, RemoteProduct } from './MediaService';
import { ChallengeService } from './ChallengeService';
import { getStoredPlayerStats, recordChallengeRoundResult, RecordRoundOutput } from './challengeProgressService';
import {
  playCardFlipSound,
  playCorrectSound,
  playWrongSound,
  playLevelUpSound,
  playAchievementSound,
} from '../utils/soundEffects';

export interface RoundHistoryItem {
  id: string;
  roundNumber: number;
  productId?: string | number;
  productName: string;
  productCategory: string;
  challengeId: string;
  isCorrect: boolean;
  selectedCardId: number;
  correctCardId: number;
  xpGained: number;
  selectedCardText: string;
  correctCardText: string;
  explanation: string;
  timestamp: string;
}

export interface GameEngineState {
  currentProduct: RemoteProduct | null;
  currentChallenge: MysteryCardChallenge | null;
  cards: CardOption[];
  isRevealed: boolean;
  selectedCardId: number | null;
  roundResult: RoundResult | null;
  playerStats: PlayerStats;
  roundNumber: number;
  isLoading: boolean;
  history: RoundHistoryItem[];
  unlockedAchievementsQueue: Achievement[];
  levelUpModalLevel: number | null;
}

export class GameEngine {
  private state: GameEngineState;
  private listeners: Array<(state: GameEngineState) => void> = [];

  constructor() {
    this.state = {
      currentProduct: null,
      currentChallenge: null,
      cards: [],
      isRevealed: false,
      selectedCardId: null,
      roundResult: null,
      playerStats: getStoredPlayerStats(),
      roundNumber: 1,
      isLoading: true,
      history: [],
      unlockedAchievementsQueue: [],
      levelUpModalLevel: null,
    };
  }

  /**
   * Returns current state snapshot of the Game Engine
   */
  public getState(): GameEngineState {
    return { ...this.state };
  }

  /**
   * Subscribe to state updates
   */
  public subscribe(listener: (state: GameEngineState) => void): () => void {
    this.listeners.push(listener);
    // Immediately publish initial state
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  /**
   * Refreshes stats from local storage
   */
  public refreshPlayerStats(): void {
    this.state.playerStats = getStoredPlayerStats();
    this.notify();
  }

  /**
   * Step 1 - 3: Starts or prepares a new round
   * 1. Fetches a random active product from MediaService
   * 2. Fetches matching/dynamic challenge from ChallengeService
   * 3. Shuffles 4 mystery cards
   */
  public async prepareNewRound(): Promise<void> {
    this.state.isLoading = true;
    this.state.isRevealed = false;
    this.state.selectedCardId = null;
    this.state.roundResult = null;
    this.notify();

    try {
      // Step 1 & 2: Get product and challenge round from services
      const roundData = await ChallengeService.getNextChallengeRound();

      this.state.currentProduct = roundData.product;
      this.state.currentChallenge = roundData.challenge;
      this.state.cards = roundData.shuffledCards;
      this.state.isLoading = false;
    } catch (error) {
      console.error('GameEngine: Error preparing new round:', error);
      this.state.isLoading = false;
    }

    this.notify();
  }

  /**
   * Step 5 - 11: Process player's card choice
   * 5. Wait for player choice
   * 6. Reveal cards
   * 7. Highlight correct answer & winning hook explanation
   * 8. Explain weak options
   * 9 - 10. Update XP & record result
   * 11. Register round history
   */
  public handleCardSelection(cardId: number): void {
    if (this.state.isRevealed || !this.state.currentChallenge || this.state.isLoading) {
      return;
    }

    // Step 6: Reveal cards
    playCardFlipSound();
    this.state.selectedCardId = cardId;
    this.state.isRevealed = true;

    const chosenCard = this.state.cards.find((c) => c.id === cardId);
    const correctCard = this.state.cards.find((c) => c.isCorrect);
    const isCorrect = Boolean(chosenCard?.isCorrect);

    // Step 9 & 10: Record challenge round result and update XP / stats
    const recordOutput: RecordRoundOutput = recordChallengeRoundResult(
      this.state.currentChallenge,
      isCorrect
    );

    this.state.playerStats = recordOutput.updatedStats;

    const resultObj: RoundResult = {
      isCorrect,
      selectedCardId: cardId,
      correctCardId: correctCard?.id || 1,
      xpGained: recordOutput.xpGained,
      streakBonus: recordOutput.streakBonus,
      firstOfDayBonus: recordOutput.firstOfDayBonus,
      isStreakUp: isCorrect && recordOutput.updatedStats.currentStreak > 1,
      explanation: this.state.currentChallenge.correctExplanation,
      chosenExplanation: chosenCard?.explanation,
    };

    this.state.roundResult = resultObj;

    // Step 11: Register round history item
    const historyItem: RoundHistoryItem = {
      id: `hist_${Date.now()}_${Math.random()}`,
      roundNumber: this.state.roundNumber,
      productId: this.state.currentProduct?.id,
      productName: this.state.currentChallenge.productName,
      productCategory: this.state.currentChallenge.productCategory,
      challengeId: this.state.currentChallenge.id,
      isCorrect,
      selectedCardId: cardId,
      correctCardId: correctCard?.id || 1,
      xpGained: recordOutput.xpGained,
      selectedCardText: chosenCard?.text || '',
      correctCardText: correctCard?.text || '',
      explanation: this.state.currentChallenge.correctExplanation,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    this.state.history.unshift(historyItem);
    this.notify();

    // Trigger audio feedback & achievement / level-up modals
    setTimeout(() => {
      if (isCorrect) {
        playCorrectSound();
      } else {
        playWrongSound();
      }

      if (recordOutput.didLevelUp) {
        setTimeout(() => {
          playLevelUpSound();
          this.state.levelUpModalLevel = recordOutput.newLevel;
          this.notify();
        }, 500);
      }

      if (recordOutput.newlyUnlockedAchievements.length > 0) {
        setTimeout(() => {
          playAchievementSound();
          this.state.unlockedAchievementsQueue = [
            ...this.state.unlockedAchievementsQueue,
            ...recordOutput.newlyUnlockedAchievements,
          ];
          this.notify();
        }, 800);
      }
    }, 400);
  }

  /**
   * Step 12: Prepare next round
   */
  public async nextRound(): Promise<void> {
    this.state.roundNumber += 1;
    await this.prepareNewRound();
  }

  /**
   * Restart/reload product round
   */
  public async restartRound(): Promise<void> {
    await this.prepareNewRound();
  }

  public dismissLevelUpModal(): void {
    this.state.levelUpModalLevel = null;
    this.notify();
  }

  public popUnlockedAchievement(): void {
    this.state.unlockedAchievementsQueue = this.state.unlockedAchievementsQueue.slice(1);
    this.notify();
  }
}

// Global instance for game engine
export const globalGameEngine = new GameEngine();
