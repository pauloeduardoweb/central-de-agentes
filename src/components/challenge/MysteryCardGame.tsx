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
import { StudentProfileService } from '../../services/StudentProfileService';
import { ACADEMIA_DESAFIOS_LIBERADA } from '../../config/featureFlags';
import { isMasterKey } from '../../data/studentCodes';
import { HelpCircle, Sparkles, Lightbulb, Zap, ArrowLeft, Trophy, Loader2 } from 'lucide-react';

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
    selectedCardId,
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

  // Modals state for tutorial & profile
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false);
  const [isFirstAccessModal, setIsFirstAccessModal] = useState<boolean>(false);
  const [studentUsername, setStudentUsername] = useState<string>('');
  const [showCreateProfileModal, setShowCreateProfileModal] = useState<boolean>(false);

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

  return (
    <div className="space-y-6">
      
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-3xl bg-gradient-to-br from-[#0a192f] via-[#091322] to-[#040d1a] border border-cyan-500/40 shadow-xl text-white">
        
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Trophy className="w-6 h-6 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                GERAÇÃO Z PRO
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-950 px-2 py-0.5 rounded-full border border-amber-500/30">
                NÍVEL {playerStats.level}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-300">
              CARTA MISTERIOSA
            </h2>
            <p className="text-xs text-slate-300 font-medium">
              Escolha uma carta e descubra o Gancho Viral do Dia!
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SoundToggle />

          <button
            onClick={() => {
              setIsFirstAccessModal(false);
              setShowHowItWorks(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer shadow-md"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span>Como funciona?</span>
          </button>
        </div>

      </div>

      {/* Main Grid Layout: Left Cards Arena (8 cols) + Right Stats Sidebar (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Arena Column */}
        <div className="lg:col-span-8 space-y-6">
          
          {isLoading || !currentChallenge ? (
            <div className="p-12 rounded-3xl bg-slate-900/90 border border-cyan-500/40 text-center flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
              <p className="text-sm font-bold text-cyan-300">GameEngine: Inicializando nova rodada...</p>
            </div>
          ) : (
            <>
              {/* Product Challenge Panel */}
              <ProductChallengePanel challenge={currentChallenge} roundNumber={roundNumber} />

              {/* Cards Grid (4 Big Cards) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
                {cards.map((card) => (
                  <MysteryCard
                    key={card.id}
                    card={card}
                    cardNumber={card.id}
                    isFlipped={isRevealed}
                    isSelected={selectedCardId === card.id}
                    isDisabled={isRevealed}
                    onSelect={selectCard}
                  />
                ))}
              </div>

              {/* Hint Banner */}
              <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center space-x-3 text-cyan-200 text-xs font-semibold backdrop-blur-sm">
                <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
                <span>
                  <strong className="text-cyan-400 font-black">DICA:</strong> O melhor gancho gera curiosidade, quebra expectativa e faz a pessoa querer assistir até o fim!
                </span>
              </div>

              {/* Round Result Panel (Visible when revealed) */}
              {isRevealed && roundResult && (
                <ChallengeResult
                  result={roundResult}
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
          <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0a192f] via-[#081220] to-[#040a14] border border-cyan-500/40 shadow-xl text-white">
            <h4 className="text-xs font-black uppercase tracking-wider text-cyan-400 text-center mb-4">
              PRÊMIOS POSSÍVEIS NESSA RODADA
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-amber-500/30">
                <span className="text-xs font-black text-amber-400 block">+25 XP</span>
                <span className="text-[10px] text-slate-400 font-bold">Acerto Comum</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-emerald-500/30">
                <span className="text-xs font-black text-emerald-400 block">+50 XP</span>
                <span className="text-[10px] text-slate-400 font-bold">Acerto Raro</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-cyan-500/30">
                <span className="text-xs font-black text-cyan-400 block">+750 XP</span>
                <span className="text-[10px] text-slate-400 font-bold">Acerto Épico</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-purple-500/30">
                <span className="text-xs font-black text-purple-400 block">+1000 XP</span>
                <span className="text-[10px] text-slate-400 font-bold">Acerto Lendário</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-slate-900/80 border border-amber-400/50 col-span-2 sm:col-span-1">
                <span className="text-xs font-black text-amber-300 block">Carta Mística</span>
                <span className="text-[10px] text-slate-400 font-bold">Gancho Premium</span>
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

