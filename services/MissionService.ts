import { MysteryCardChallenge } from '../types/challenge';

export interface Mission {
  missionNumber: number;
  missionCode: string;
  category: string;
  productName: string;
  difficultyLabel: string;
  difficultyRaw: string;
  rewardXp: number;
  objective: string;
  image?: string;
  hookCategory?: string;
}

const MISSION_OBJECTIVES = [
  'Descubra qual gancho possui maior potencial para prender a atenção do público nos primeiros segundos do vídeo.',
  'Descubra qual gancho faria esse vídeo viralizar nas redes sociais.',
  'Escolha a frase de abertura que gera mais curiosidade e retenção imediata.',
  'Encontre o melhor gancho viral para os três primeiros segundos da gravação.',
  'Qual frase faria o público parar instantaneamente de rolar o feed ao ver esse produto?',
  'Qual abertura possui maior potencial de retenção e taxa de engajamento?',
  'Descubra qual copy e gancho de curiosidade provavelmente venderia mais este produto.',
  'Identifique o gatilho emocional de alta conversão para os primeiros 3 segundos.',
  'Escolha a quebra de padrão que atrai a atenção dos compradores mais qualificados.',
];

export class MissionService {
  /**
   * Generates a dynamic structured Mission based on a challenge and round number.
   */
  public static generateMission(
    challenge: MysteryCardChallenge,
    roundNumber: number = 1,
    baseOffset: number = 140
  ): Mission {
    // Calculate mission number (e.g. #141, #142...)
    const missionNumber = baseOffset + roundNumber;

    // Pick objective variation dynamically
    const objIndex = (roundNumber + challenge.productName.length) % MISSION_OBJECTIVES.length;
    const objective = MISSION_OBJECTIVES[objIndex];

    const difficultyMap: Record<string, string> = {
      facil: 'Fácil',
      medio: 'Médio',
      dificil: 'Difícil',
    };

    const difficultyLabel = difficultyMap[challenge.difficulty] || 'Fácil';

    return {
      missionNumber,
      missionCode: `MISSÃO #${missionNumber}`,
      category: challenge.productCategory || 'Geral',
      productName: challenge.productName || 'Produto Premium',
      difficultyLabel,
      difficultyRaw: challenge.difficulty,
      rewardXp: challenge.xp || 25,
      objective,
      image: challenge.image,
      hookCategory: challenge.hookCategory,
    };
  }
}
