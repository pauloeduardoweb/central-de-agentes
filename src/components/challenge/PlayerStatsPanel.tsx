import React, { useEffect, useState } from 'react';
import { PlayerStats, Achievement } from '../../types/challenge';
import { PlayerService } from '../../services/PlayerService';
import { RankingService, RankingItem, UserRankingStats } from '../../services/RankingService';
import { isMasterKey } from '../../data/studentCodes';
import { EditProfileModal } from './EditProfileModal';
import { UserAvatar } from '../common/UserAvatar';
import { ACHIEVEMENTS } from '../../data/achievements';
import { Trophy, Award, TrendingUp, Users, Flame, RefreshCw, Edit3, ShieldCheck, Crown, Sparkles } from 'lucide-react';

interface PlayerStatsPanelProps {
  stats: PlayerStats;
  onOpenHowItWorks: () => void;
  studentUsername?: string;
  studentAvatar?: string | null;
  onUsernameUpdated?: (newUsername: string, newAvatar?: string | null) => void;
}

export const PlayerStatsPanel: React.FC<PlayerStatsPanelProps> = ({
  stats,
  onOpenHowItWorks,
  studentUsername: initialUsername,
  studentAvatar: initialAvatar = null,
  onUsernameUpdated,
}) => {
  const currentCode = localStorage.getItem('user_student_access_code') || '';
  const isMaster = isMasterKey(currentCode);

  const levelInfo = PlayerService.calculateLevelInfo(stats.totalXp);

  const [leaderboard, setLeaderboard] = useState<RankingItem[]>([]);
  const [userStats, setUserStats] = useState<UserRankingStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [username, setUsername] = useState<string>(initialUsername || '');
  const [avatar, setAvatar] = useState<string | null>(initialAvatar || null);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);

  useEffect(() => {
    if (initialUsername) {
      setUsername(initialUsername);
    }
  }, [initialUsername]);

  useEffect(() => {
    if (initialAvatar !== undefined) {
      setAvatar(initialAvatar);
    }
  }, [initialAvatar]);

  const loadRankingData = async () => {
    setIsLoading(true);
    try {
      const [ranking, userRanking] = await Promise.all([
        RankingService.getGlobalRanking(),
        RankingService.getUserRankingStats(),
      ]);
      setLeaderboard(ranking);
      setUserStats(userRanking);
    } catch (err) {
      console.warn('PlayerStatsPanel: Error loading ranking data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRankingData();
  }, [stats.totalXp, stats.gamesPlayed]);

  const handleUpdateProfile = (newUsername: string, newAvatar?: string | null) => {
    setUsername(newUsername);
    if (newAvatar !== undefined) {
      setAvatar(newAvatar);
    }
    if (onUsernameUpdated) {
      onUsernameUpdated(newUsername, newAvatar);
    }
    loadRankingData();
  };

  // Find recent achievement only if user has unlocked achievements
  const recentAchievement: Achievement | undefined =
    stats.unlockedAchievementIds.length > 0
      ? ACHIEVEMENTS.find(
          (a) => a.id === stats.unlockedAchievementIds[stats.unlockedAchievementIds.length - 1]
        )
      : undefined;

  return (
    <div className="space-y-6">
      
      {/* PAINEL MASTER OU PAINEL DO ALUNO */}
      {isMaster ? (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#12243d] via-[#0b1b30] to-[#051122] border-2 border-amber-500/60 shadow-[0_0_30px_rgba(245,158,11,0.25)] text-white relative overflow-hidden backdrop-blur-xl">
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center space-x-3.5 border-b border-slate-800/90 pb-4 mb-4 relative z-10">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-amber-500/25 via-amber-600/10 to-yellow-500/20 border-2 border-amber-400/60 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
              <Crown className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-amber-950/90 text-amber-300 border border-amber-400/50 text-[10px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                <span>ADMINISTRADOR TOTAL</span>
              </div>
              <h3 className="text-lg font-black text-white mt-0.5">
                Mentor Bigode
              </h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200/90 leading-relaxed space-y-1.5 relative z-10 backdrop-blur-md">
            <p className="font-bold flex items-center space-x-1.5 text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Conta Administradora Ativa (MASTER)</span>
            </p>
            <p className="text-[11px] text-slate-300">
              Contas Master possuem acesso administrativo completo à plataforma e não acumulam XP nem participam do ranking de alunos.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0a1b2d] via-[#081524] to-[#030e1a] border-2 border-cyan-500/50 shadow-2xl shadow-cyan-950/60 text-white relative overflow-hidden backdrop-blur-xl">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div className="flex items-center space-x-3">
              <UserAvatar username={username || 'Aluno'} avatarUrl={avatar} size="lg" />
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300 bg-cyan-950 px-2.5 py-0.5 rounded-full border border-cyan-400/40 shadow-[0_0_8px_rgba(34,211,238,0.3)]">
                  {isMaster ? 'PERFIL MENTOR' : 'PERFIL DO ALUNO'}
                </span>
                <h3 className="text-base font-black text-white truncate max-w-[170px]">
                  {username || (isMaster ? 'Mentor Bigode' : 'Aluno Geração Z')}
                </h3>
              </div>
            </div>

            {!isMaster && (
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 hover:text-white text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow"
                title="Editar perfil e foto"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Editar</span>
              </button>
            )}
          </div>

          {/* Stats Summary Grid */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">XP Total</span>
              <span className="text-base font-black text-cyan-300">{stats.totalXp.toLocaleString('pt-BR')} XP</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Nível</span>
              <span className="text-base font-black text-teal-300">Nível {levelInfo.level}</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Posição</span>
              <span className="text-xs font-black text-amber-300 truncate">
                {userStats?.rank ? `${userStats.rank}º Lugar` : 'Sem rank'}
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Taxa de Acerto</span>
              <span className="text-base font-black text-emerald-400">{stats.accuracyRate}%</span>
            </div>
          </div>

          {/* Level Progress Bar */}
          <div className="space-y-1.5 text-left mt-4 pt-3 border-t border-slate-800/80">
            <div className="flex justify-between text-[11px] font-bold text-slate-300">
              <span>Progresso do Nível {levelInfo.level}</span>
              <span>Meta: {levelInfo.nextLevelXpRequirement.toLocaleString('pt-BR')} XP</span>
            </div>

            <div className="w-full h-2.5 rounded-full bg-slate-900 border border-cyan-500/30 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500 shadow-md shadow-cyan-500/50"
                style={{ width: `${levelInfo.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Mini Stats Row */}
          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-xs">
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60 text-center">
              <span className="text-[10px] text-slate-400 font-bold block">Sequência Atual</span>
              <span className="text-xs font-black text-amber-400 flex items-center justify-center space-x-1 mt-0.5">
                <Flame className="w-3.5 h-3.5 fill-amber-400" />
                <span>{stats.currentStreak} seguidos</span>
              </span>
            </div>

            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800/60 text-center">
              <span className="text-[10px] text-slate-400 font-bold block">Desafios Jogados</span>
              <span className="text-xs font-black text-cyan-300 flex items-center justify-center space-x-1 mt-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{stats.gamesPlayed} jogos</span>
              </span>
            </div>
          </div>

        </div>
      )}

      {/* RANKING GERAL */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0a1b2d] via-[#081524] to-[#040d1a] border-2 border-cyan-500/40 shadow-2xl text-white space-y-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-black text-cyan-300 uppercase tracking-widest">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>RANKING GERAL</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadRankingData}
              title="Atualizar ranking"
              className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/40 transition-all cursor-pointer shadow"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              onClick={onOpenHowItWorks}
              className="text-[10px] text-cyan-300/90 hover:text-cyan-200 underline font-bold cursor-pointer"
            >
              Ver regras
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-xs text-cyan-300 font-semibold space-y-2">
            <div className="w-5 h-5 mx-auto border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span>Carregando ranking em tempo real...</span>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-300 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2 shadow-inner">
            <Trophy className="w-8 h-8 text-amber-400/80 mx-auto animate-bounce" />
            <p className="font-bold text-slate-200">
              Ainda não há participantes no ranking. Conclua o primeiro desafio e seja o primeiro colocado!
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
            {leaderboard.map((item) => (
              <div
                key={item.rank}
                className={`p-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition-all ${
                  item.isUser
                    ? 'bg-cyan-950/90 border border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900/80 border border-slate-800/90 text-slate-300 hover:bg-slate-800/90'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    item.rank === 1 ? 'bg-amber-400 text-slate-950 shadow-[0_0_8px_rgba(251,191,36,0.6)]' :
                    item.rank === 2 ? 'bg-slate-300 text-slate-950' :
                    item.rank === 3 ? 'bg-amber-700 text-white' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {item.rank}
                  </span>
                  
                  <UserAvatar
                    username={item.username || item.name}
                    avatarUrl={item.avatar}
                    size="xs"
                  />

                  <span className="font-mono truncate max-w-[140px]">{item.name}</span>
                </div>
                <span className="font-mono text-cyan-400 shrink-0">{item.xpFormatted}</span>
              </div>
            ))}
          </div>
        )}

        {userStats && (
          <p className="text-[11px] text-slate-400 text-center pt-2 font-medium border-t border-slate-800/80">
            Sua posição: <span className="text-cyan-300 font-bold">{userStats.rankText}</span>
          </p>
        )}
      </div>

      {/* CONQUISTA RECENTE */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0a192f] via-[#081220] to-[#040a14] border border-amber-500/40 shadow-xl text-white space-y-3">
        <div className="flex items-center space-x-2 text-xs font-black text-amber-400 uppercase tracking-wider">
          <Award className="w-4 h-4" />
          <span>CONQUISTA RECENTE</span>
        </div>

        {recentAchievement ? (
          <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Trophy className="w-6 h-6" />
            </div>

            <div>
              <h5 className="text-xs font-black text-amber-300">{recentAchievement.title}</h5>
              <p className="text-[11px] text-slate-300 line-clamp-1">{recentAchievement.description}</p>
              <span className="text-[10px] font-mono text-amber-400 font-bold">+{recentAchievement.bonusXp} XP</span>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
            <span>Complete desafios para desbloquear sua primeira conquista!</span>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          currentUsername={username}
          currentAvatar={avatar}
          onClose={() => setShowEditModal(false)}
          onProfileUpdated={handleUpdateProfile}
        />
      )}

    </div>
  );
};


