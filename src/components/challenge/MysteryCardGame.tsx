import React, { useState, useEffect } from 'react';
import { useGameEngine } from '../../hooks/useGameEngine';
import { ProductChallengePanel } from './ProductChallengePanel';
import { MysteryCard } from './MysteryCard';
import { ChallengeResult } from './ChallengeResult';
import { PlayerStatsPanel } from './PlayerStatsPanel';
import { AchievementModal } from './AchievementModal';
import { LevelUpModal } from './LevelUpModal';
import { HowItWorksModal } from './HowItWorksModal';
import { CreateProfileModal } from './CreateProfileModal';
import { AcademiaEmBreveCard } from './AcademiaEmBreveCard';
import { SoundToggle } from './SoundToggle';
import { AffiliatePowerupsBar, PowerupCounts } from './AffiliatePowerupsBar';
import { MentorBigodeModal } from './MentorBigodeModal';
import { StudentProfileService } from '../../services/StudentProfileService';
import { ACADEMIA_DESAFIOS_LIBERADA } from '../../config/featureFlags';
import { isMasterKey } from '../../data/studentCodes';
import { playCardFlipSound, playPowerupSound, playCorrectSound, playWrongSound } from '../../utils/soundEffects';
import {
  HelpCircle,
  Sparkles,
  Lightbulb,
  Zap,
  Trophy,
  Loader2,
  CheckCircle2,
  Eye,
  Flame,
} from 'lucide-react';

interface MysteryCardGameProps {
  onBackToMainTab?: () => void;
}

export const MysteryCardGame: React.FC<MysteryCardGameProps> = ({ onBackToMainTab }) => {
  const studentCode = localStorage.getItem('user_student_access_code') || '';
  const isMaster = isMasterKey(studentCode);

  if (!ACADEMIA_DESAFIOS_LIBERADA && !isMaster) {
    return <AcademiaEmBreveCard onBackToMainTab={onBackToMainTab} />;
  }

  const {
    currentChallenge,
    cards,
    isRevealed,
    roundResult,
    playerStats,
    roundNumber,
    isLoading,
    unlockedAchievementsQueue,
    levelUpModalLevel,
    selectCard,
    nextRound,
    restartRound,
    dismissLevelUp,
    popAchievement,
  } = useGameEngine();

  // Local card flip & selection tracking before confirmation
  const [flippedCardIds, setFlippedCardIds] = useState<number[]>([]);
  const [selectedCardIdState, setSelectedCardIdState] = useState<number | null>(null);

  // Powerups State Management
  const [powerups, setPowerups] = useState<PowerupCounts>({
    consultTikTok: 1,
    eliminatedHooks: 2,
    mentorBigode: 2,
    skipMission: 1,
    secondChance: 1,
    doubleXp: 1,
  });

  const [isDoubleXpActive, setIsDoubleXpActive] = useState<boolean>(false);
  const [isSecondChanceActive, setIsSecondChanceActive] = useState<boolean>(false);
  const [eliminatedCardIds, setEliminatedCardIds] = useState<number[]>([]);
  const [tikTokHintCardId, setTikTokHintCardId] = useState<number | null>(null);
  const [showMentorBigodeModal, setShowMentorBigodeModal] = useState<boolean>(false);
  const [isTimerPaused, setIsTimerPaused] = useState<boolean>(false);

  // Modals state for tutorial & profile
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false);
  const [isFirstAccessModal, setIsFirstAccessModal] = useState<boolean>(false);
  const [studentUsername, setStudentUsername] = useState<string>('');
  const [showCreateProfileModal, setShowCreateProfileModal] = useState<boolean>(false);

  // Reset local card flips & powerup round states when challenge or round changes
  useEffect(() => {
    setFlippedCardIds([]);
    setSelectedCardIdState(null);
    setEliminatedCardIds([]);
    setTikTokHintCardId(null);
    setIsDoubleXpActive(false);
    setIsSecondChanceActive(false);
    setIsTimerPaused(false);
  }, [currentChallenge, roundNumber]);

  // Pause timer when revealed
  useEffect(() => {
    if (isRevealed) {
      setIsTimerPaused(true);
    }
  }, [isRevealed]);

  // Check student profile & tutorial on mount
  useEffect(() => {
    const checkProfileAndTutorial = async () => {
      const profileRes = await StudentProfileService.getProfile();
      if (!profileRes.profileCreated && !profileRes.isMaster) {
        setShowCreateProfileModal(true);
      } else if (profileRes.username) {
        setStudentUsername(profileRes.username);
      }

      const hasSeenTutorial = localStorage.getItem('geracaoz_challenge_has_seen_tutorial');
      if (!hasSeenTutorial) {
        setIsFirstAccessModal(true);
        setShowHowItWorks(true);
        localStorage.setItem('geracaoz_challenge_has_seen_tutorial', 'true');
      }
    };

    checkProfileAndTutorial();
  }, []);

  const handleProfileCreated = (username: string) => {
    setStudentUsername(username);
    setShowCreateProfileModal(false);
  };

  // Timer Timeout Handler
  const handleTimerOut = () => {
    if (isRevealed || !currentChallenge) return;
    const correctCard = cards.find((c) => c.isCorrect);
    if (correctCard) {
      selectCard(correctCard.id);
    }
  };

  // Click card handler: flips card open and sets it as the selected answer
  const handleCardClick = (cardId: number) => {
    if (isRevealed || eliminatedCardIds.includes(cardId)) return;

    playCardFlipSound();

    if (!flippedCardIds.includes(cardId)) {
      setFlippedCardIds((prev) => [...prev, cardId]);
    }

    setSelectedCardIdState(cardId);
  };

  // Toggle reveal all cards before answering
  const handleRevealAll = () => {
    if (isRevealed) return;
    playCardFlipSound();
    setFlippedCardIds(cards.map((c) => c.id));
  };

  // Submit/Confirm answer
  const handleConfirmAnswer = () => {
    if (selectedCardIdState === null || isRevealed) return;

    const chosenCard = cards.find((c) => c.id === selectedCardIdState);

    // Second Chance logic check
    if (isSecondChanceActive && chosenCard && !chosenCard.isCorrect) {
      playWrongSound();
      setIsSecondChanceActive(false);
      setEliminatedCardIds((prev) => [...prev, selectedCardIdState]);
      setSelectedCardIdState(null);
      return;
    }

    selectCard(selectedCardIdState);
  };

  // Powerup 1: Consultar TikTok
  const handleUseConsultTikTok = () => {
    if (powerups.consultTikTok <= 0 || isRevealed) return;
    const correct = cards.find((c) => c.isCorrect);
    if (correct) {
      setTikTokHintCardId(correct.id);
      setPowerups((prev) => ({ ...prev, consultTikTok: prev.consultTikTok - 1 }));
    }
  };

  // Powerup 2: Eliminar 2 Ganchos
  const handleUseEliminateTwo = () => {
    if (powerups.eliminatedHooks <= 0 || isRevealed) return;
    const wrongCards = cards.filter((c) => !c.isCorrect);
    if (wrongCards.length >= 2) {
      // Pick 2 wrong cards
      const toEliminate = wrongCards.slice(0, 2).map((c) => c.id);
      setEliminatedCardIds((prev) => Array.from(new Set([...prev, ...toEliminate])));
      setPowerups((prev) => ({ ...prev, eliminatedHooks: prev.eliminatedHooks - 1 }));
    }
  };

  // Powerup 3: Mentor Bigode IA
  const handleUseMentorBigode = () => {
    if (powerups.mentorBigode <= 0 || isRevealed) return;
    setShowMentorBigodeModal(true);
    setPowerups((prev) => ({ ...prev, mentorBigode: prev.mentorBigode - 1 }));
  };

  // Powerup 4: Pular Missão
  const handleUseSkipMission = () => {
    if (powerups.skipMission <= 0 || isRevealed) return;
    setPowerups((prev) => ({ ...prev, skipMission: prev.skipMission - 1 }));
    restartRound();
  };

  // Powerup 5: Segunda Chance
  const handleUseSecondChance = () => {
    if (powerups.secondChance <= 0 || isSecondChanceActive || isRevealed) return;
    setIsSecondChanceActive(true);
    setPowerups((prev) => ({ ...prev, secondChance: prev.secondChance - 1 }));
  };

  // Powerup 6: Dobrar XP
  const handleUseDoubleXp = () => {
    if (powerups.doubleXp <= 0 || isDoubleXpActive || isRevealed) return;
    setIsDoubleXpActive(true);
    setPowerups((prev) => ({ ...prev, doubleXp: prev.doubleXp - 1 }));
  };

  return (
    <div className="relative space-y-6">
      {/* Background Cyber Ambient Glow */}
      <div className="absolute -top-12 -left-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute top-1/2 -right-12 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />

      {/* Top Header Bar */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-[#0a1b2e] via-[#091524] to-[#040d1a] border-2 border-cyan-500/50 shadow-[0_0_25px_rgba(34,211,238,0.2)] text-white backdrop-blur-xl overflow-hidden">
        {/* Background Cyber Lines */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#00f2ff_1px,transparent_1px)] [background-size:16px_16px]" />

        <div className="relative z-10 flex items-center space-x-3.5">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-teal-500/10 to-amber-500/20 border-2 border-cyan-400/60 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.4)]">
            <Trophy className="w-6 h-6 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300 bg-cyan-950/90 px-2.5 py-0.5 rounded-full border border-cyan-400/50 shadow-[0_0_8px_rgba(34,211,238,0.3)]">
                GERAÇÃO Z PRO
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-950/90 px-2.5 py-0.5 rounded-full border border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.3)] flex items-center space-x-1">
                <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>NÍVEL {playerStats.level}</span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-300 tracking-tight">
              O DESAFIO DO AFILIADO — ACADEMIA DE DESAFIOS V2
            </h2>
            <p className="text-xs text-slate-300 font-medium">
              Adivinhe o Gancho Viral campeão antes que o tempo acabe!
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <SoundToggle />

          <button
            onClick={() => {
              setIsFirstAccessModal(false);
              setShowHowItWorks(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border-2 border-cyan-500/40 hover:border-cyan-300 text-cyan-300 hover:text-white font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.2)]"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>Como funciona?</span>
          </button>
        </div>
      </div>

      {/* Main Grid Layout: Left Cards Arena (8 cols) + Right Stats Sidebar (4 cols) */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Arena Column */}
        <div className="lg:col-span-8 space-y-6">
          {isLoading || !currentChallenge ? (
            <div className="p-12 rounded-3xl bg-slate-900/90 border-2 border-cyan-500/40 text-center flex flex-col items-center justify-center space-y-3 shadow-2xl">
              <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
              <p className="text-sm font-bold text-cyan-300">Carregando Missão do Afiliado...</p>
            </div>
          ) : (
            <>
              {/* Product Challenge Panel with 60s Circular Timer & Streak */}
              <ProductChallengePanel
                challenge={currentChallenge}
                roundNumber={roundNumber}
                totalRounds={10}
                isTimerPaused={isTimerPaused}
                onTimerOut={handleTimerOut}
                streakCount={playerStats.currentStreak}
              />

              {/* PODERES DO AFILIADO POWERUP BAR */}
              {!isRevealed && (
                <AffiliatePowerupsBar
                  powerups={powerups}
                  isDoubleXpActive={isDoubleXpActive}
                  isSecondChanceActive={isSecondChanceActive}
                  isRevealed={isRevealed}
                  onUseConsultTikTok={handleUseConsultTikTok}
                  onUseEliminateTwo={handleUseEliminateTwo}
                  onUseMentorBigode={handleUseMentorBigode}
                  onUseSkipMission={handleUseSkipMission}
                  onUseSecondChance={handleUseSecondChance}
                  onUseDoubleXp={handleUseDoubleXp}
                />
              )}

              {/* Auxiliary Bar: Reveal All Button (before answering) */}
              {!isRevealed && (
                <div className="flex items-center justify-between px-2">
                  <p className="text-xs text-slate-300 font-bold flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>Selecione uma Carta Misteriosa para revelar a resposta:</span>
                  </p>

                  <button
                    onClick={handleRevealAll}
                    className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 text-[11px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow"
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Revelar todas</span>
                  </button>
                </div>
              )}

              {/* Cards Grid (4 Cards in 2 cols on mobile, 4 cols on desktop) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
                {cards.map((card) => {
                  const isCardFlipped = isRevealed || flippedCardIds.includes(card.id);
                  const isCardSelected = selectedCardIdState === card.id;
                  const isEliminated = eliminatedCardIds.includes(card.id);
                  const tikTokHint = tikTokHintCardId === card.id;

                  return (
                    <MysteryCard
                      key={card.id}
                      card={card}
                      cardNumber={card.id}
                      isFlipped={isCardFlipped}
                      isSelected={isCardSelected}
                      isConfirmed={isRevealed}
                      isDisabled={isRevealed}
                      isEliminated={isEliminated}
                      tikTokHint={tikTokHint}
                      onSelect={handleCardClick}
                    />
                  );
                })}
              </div>

              {/* CONFIRMAR RESPOSTA BUTTON AREA */}
              {!isRevealed && (
                <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-cyan-500/40 flex flex-col items-center justify-center space-y-3 shadow-xl backdrop-blur-xl">
                  {selectedCardIdState !== null ? (
                    <>
                      <button
                        onClick={handleConfirmAnswer}
                        className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-black text-sm uppercase tracking-widest flex items-center space-x-3 shadow-[0_0_30px_rgba(34,211,238,0.5)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                        <span>CONFIRMAR RESPOSTA</span>
                      </button>

                      <p className="text-xs text-cyan-300 font-bold text-center">
                        Você selecionou a <strong className="text-white">Opção #{selectedCardIdState}</strong>. Clique acima para confirmar!
                      </p>
                    </>
                  ) : (
                    <div className="text-center py-2 text-xs text-slate-300 font-bold flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      <span>Toque em uma carta para escolher sua resposta</span>
                    </div>
                  )}
                </div>
              )}

              {/* Hint Banner (HUD Style) */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900/90 to-cyan-950/60 border-2 border-cyan-500/40 flex items-center space-x-3 text-cyan-100 text-xs font-semibold backdrop-blur-md shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-5 h-5 text-amber-400 animate-pulse" />
                </div>
                <span className="leading-relaxed">
                  <strong className="text-cyan-400 font-black tracking-wider uppercase">DICA DE JOGO:</strong> O melhor gancho gera curiosidade imediata, quebra expectativas e faz a pessoa querer assistir até o fim!
                </span>
              </div>

              {/* Round Result Panel (Visible when revealed) */}
              {isRevealed && roundResult && (
                <ChallengeResult
                  result={{
                    ...roundResult,
                    xpGained: isDoubleXpActive && roundResult.isCorrect ? roundResult.xpGained * 2 : roundResult.xpGained,
                  }}
                  challenge={currentChallenge}
                  cards={cards}
                  onNextChallenge={nextRound}
                  onRestartProduct={restartRound}
                  onBackToAcademy={() => {
                    if (onBackToMainTab) onBackToMainTab();
                  }}
                />
              )}
            </>
          )}

          {/* PRÊMIOS POSSÍVEIS BAR */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0a1b2d] via-[#081524] to-[#040d1a] border-2 border-cyan-500/40 shadow-2xl text-white backdrop-blur-xl relative overflow-hidden">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <h4 className="text-xs font-black uppercase tracking-widest text-cyan-300 text-center">
                PRÊMIOS POSSÍVEIS NESSA RODADA
              </h4>
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-slate-900/90 border-2 border-slate-700/80 hover:border-slate-500 transition-all shadow-md">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block mb-0.5">Comum</span>
                <span className="text-sm font-black text-slate-200 block">+25 XP</span>
                <span className="text-[10px] text-slate-400 font-medium">Acerto Simples</span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-950/40 border-2 border-emerald-500/50 hover:border-emerald-400 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 block mb-0.5">Raro</span>
                <span className="text-sm font-black text-emerald-300 block">+50 XP</span>
                <span className="text-[10px] text-emerald-200/80 font-medium">Gancho Raro</span>
              </div>

              <div className="p-3 rounded-2xl bg-cyan-950/40 border-2 border-cyan-400/60 hover:border-cyan-300 transition-all shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                <span className="text-[10px] uppercase font-black tracking-wider text-cyan-400 block mb-0.5">Épico</span>
                <span className="text-sm font-black text-cyan-300 block">+750 XP</span>
                <span className="text-[10px] text-cyan-200/80 font-medium">Gancho Épico</span>
              </div>

              <div className="p-3 rounded-2xl bg-purple-950/40 border-2 border-purple-500/60 hover:border-purple-400 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                <span className="text-[10px] uppercase font-black tracking-wider text-purple-400 block mb-0.5">Lendário</span>
                <span className="text-sm font-black text-purple-300 block">+1000 XP</span>
                <span className="text-[10px] text-purple-200/80 font-medium">Gancho Viral</span>
              </div>

              <div className="p-3 rounded-2xl bg-amber-950/40 border-2 border-amber-400/70 hover:border-amber-300 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 block mb-0.5">Místico</span>
                <span className="text-sm font-black text-amber-300 block">Carta Mística</span>
                <span className="text-[10px] text-amber-200/80 font-medium">Especial Z</span>
              </div>
            </div>
          </div>
        </div>

        {/* Player Stats Sidebar Column */}
        <div className="lg:col-span-4">
          <PlayerStatsPanel
            stats={playerStats}
            onOpenHowItWorks={() => setShowHowItWorks(true)}
            studentUsername={studentUsername}
            onUsernameUpdated={(newUsername) => setStudentUsername(newUsername)}
          />
        </div>
      </div>

      {/* Mentor Bigode IA Strategic Advice Modal */}
      {showMentorBigodeModal && currentChallenge && (
        <MentorBigodeModal
          isOpen={showMentorBigodeModal}
          productName={currentChallenge.productName}
          category={currentChallenge.productCategory}
          onClose={() => setShowMentorBigodeModal(false)}
        />
      )}

      {/* Mandatory Create Profile Modal for first-time students */}
      {showCreateProfileModal && (
        <CreateProfileModal onProfileCreated={handleProfileCreated} />
      )}

      {/* Modals */}
      {showHowItWorks && !showCreateProfileModal && (
        <HowItWorksModal
          isFirstAccess={isFirstAccessModal}
          onClose={() => setShowHowItWorks(false)}
        />
      )}

      {levelUpModalLevel !== null && (
        <LevelUpModal
          newLevel={levelUpModalLevel}
          onClose={dismissLevelUp}
        />
      )}

      {unlockedAchievementsQueue.length > 0 && (
        <AchievementModal
          achievement={unlockedAchievementsQueue[0]}
          onClose={popAchievement}
        />
      )}
    </div>
  );
};

