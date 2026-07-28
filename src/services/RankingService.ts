export interface RankingItem {
  rank: number;
  codigo: string;
  codigoMascarado: string;
  username?: string;
  avatar?: string | null;
  name: string;
  xp: number;
  xpFormatted: string;
  nivel: number;
  desafiosJogados: number;
  desafiosCorretos: number;
  taxaAcerto: number;
  sequenciaAtual: number;
  maiorSequencia: number;
  isUser: boolean;
}

export interface UserRankingStats {
  isMasterKey: boolean;
  rank: number | null;
  rankText: string;
  totalParticipants: number;
  totalXp: number;
  nivel: number;
  desafiosJogados: number;
  desafiosCorretos: number;
  taxaAcerto: number;
  sequenciaAtual: number;
  maiorSequencia: number;
  unlockedAchievements: string[];
}

export class RankingService {
  public static async getGlobalRanking(): Promise<RankingItem[]> {
    try {
      const studentCode = typeof window !== 'undefined' ? localStorage.getItem('user_student_access_code') || '' : '';
      const res = await fetch('/api/ranking', {
        headers: {
          'x-access-code': studentCode,
          'x-student-access-code': studentCode,
        },
      });

      if (!res.ok) return [];

      const data = await res.json();
      if (data && Array.isArray(data.ranking)) {
        return data.ranking;
      }
      return [];
    } catch (err) {
      console.warn('RankingService: Error fetching global ranking', err);
      return [];
    }
  }

  public static async getUserRankingStats(): Promise<UserRankingStats | null> {
    try {
      const studentCode = typeof window !== 'undefined' ? localStorage.getItem('user_student_access_code') || '' : '';
      if (!studentCode) return null;

      const res = await fetch('/api/ranking/me', {
        headers: {
          'x-access-code': studentCode,
          'x-student-access-code': studentCode,
        },
      });

      if (!res.ok) return null;

      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('RankingService: Error fetching user ranking stats', err);
      return null;
    }
  }
}
