import { Achievement } from '../types/challenge';

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_win',
    title: 'Primeiro Acerto',
    description: 'Concluiu seu primeiro desafio com sucesso na Academia!',
    iconName: 'Target',
    bonusXp: 50,
  },
  {
    id: 'hook_hunter',
    title: 'Caçador de Ganchos',
    description: 'Acertou 10 desafios de ganchos virais do TikTok Shop.',
    iconName: 'Award',
    bonusXp: 150,
  },
  {
    id: 'curiosity_master',
    title: 'Mestre da Curiosidade',
    description: 'Acertou 10 desafios na categoria Curiosidade.',
    iconName: 'Sparkles',
    bonusXp: 200,
  },
  {
    id: 'fire_streak',
    title: 'Sequência de Fogo',
    description: 'Alcançou uma sequência incrível de 5 acertos consecutivos!',
    iconName: 'Flame',
    bonusXp: 250,
  },
  {
    id: 'unbeatable_copy',
    title: 'Copy Imbatível',
    description: 'Meteu 10 acertos seguidos sem cometer nenhum erro!',
    iconName: 'Zap',
    bonusXp: 500,
  },
  {
    id: 'dedicated_student',
    title: 'Aluno Dedicado',
    description: 'Treinou seus ganchos na Academia em 3 dias diferentes.',
    iconName: 'CalendarCheck',
    bonusXp: 300,
  },
  {
    id: 'master_of_hooks',
    title: 'Mestre do Gancho',
    description: 'Lenda do TikTok Shop! Alcançou a marca histórica de 100 acertos.',
    iconName: 'Trophy',
    bonusXp: 1000,
  },
];
