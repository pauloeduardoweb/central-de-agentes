import { useState, useEffect, useCallback } from 'react';
import { GameEngine, GameEngineState, globalGameEngine } from '../services/GameEngine';

export function useGameEngine(engineInstance: GameEngine = globalGameEngine) {
  const [engineState, setEngineState] = useState<GameEngineState>(() => engineInstance.getState());

  useEffect(() => {
    const unsubscribe = engineInstance.subscribe((newState) => {
      setEngineState(newState);
    });
    return () => unsubscribe();
  }, [engineInstance]);

  // Initial round start if not already loaded or in progress
  useEffect(() => {
    if (!engineState.currentChallenge && engineState.isLoading) {
      engineInstance.prepareNewRound();
    }
  }, [engineInstance, engineState.currentChallenge, engineState.isLoading]);

  const selectCard = useCallback(
    (cardId: number) => {
      engineInstance.handleCardSelection(cardId);
    },
    [engineInstance]
  );

  const nextRound = useCallback(() => {
    engineInstance.nextRound();
  }, [engineInstance]);

  const restartRound = useCallback(() => {
    engineInstance.restartRound();
  }, [engineInstance]);

  const dismissLevelUp = useCallback(() => {
    engineInstance.dismissLevelUpModal();
  }, [engineInstance]);

  const popAchievement = useCallback(() => {
    engineInstance.popUnlockedAchievement();
  }, [engineInstance]);

  return {
    ...engineState,
    selectCard,
    nextRound,
    restartRound,
    dismissLevelUp,
    popAchievement,
  };
}
