export type DifficultyLevel = 'facil' | 'medio' | 'dificil';

export type HookCategory = 
  | 'Curiosidade'
  | 'Polêmica'
  | 'Choque'
  | 'Mistério'
  | 'Benefício'
  | 'Comparação'
  | 'Economia'
  | 'Prova social'
  | 'Problema e solução'
  | 'Urgência'
  | 'Escassez'
  | 'Descoberta'
  | 'Erro comum'
  | 'Quebra de padrão'
  | 'História curta';

export interface WrongHookOption {
  text: string;
  explanation: string;
}

export interface MysteryCardChallenge {
  id: string;
  productName: string;
  productCategory: string;
  image?: string;
  hookCategory: HookCategory;
  difficulty: DifficultyLevel;
  xp: number;
  correctHook: string;
  wrongHooks: WrongHookOption[];
  correctExplanation: string;
  techniques: string[];
}

export interface CardOption {
  id: number; // 1, 2, 3, 4
  text: string;
  isCorrect: boolean;
  explanation: string;
}

export interface PlayerStats {
  totalXp: number;
  level: number;
  gamesPlayed: number;
  correctCount: number;
  wrongCount: number;
  accuracyRate: number;
  currentStreak: number;
  bestStreak: number;
  answeredChallengeIds: string[];
  lastCompletedDate?: string;
  unlockedAchievementIds: string[];
  categoryCounts: Record<string, number>;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  bonusXp: number;
}

export interface RoundResult {
  isCorrect: boolean;
  selectedCardId: number;
  correctCardId: number;
  xpGained: number;
  streakBonus: number;
  firstOfDayBonus: number;
  isStreakUp: boolean;
  explanation: string;
  chosenExplanation?: string;
}
