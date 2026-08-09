import React, { useState, useEffect } from 'react';
import {
  Package,
  Trophy,
  Users,
  Key,
  Activity,
  BarChart3,
  ArrowLeft,
  Crown,
  Video,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { ProductLibrary } from './ProductLibrary';
import { MentorStudentsList } from './MentorStudentsList';
import { MentorOnlineMonitoring } from './MentorOnlineMonitoring';
import { MentorChallenges } from './MentorChallenges';
import { MentorAccessCodes } from './MentorAccessCodes';
import { MentorStats } from './MentorStats';
import { TikTokIntegration } from './TikTokIntegration';

interface MentorPanelProps {
  studentCode: string;
  onBackToHub?: () => void;
  onTabChange?: (tab: string) => void;
  initialTab?: string;
}

export const MentorPanel: React.FC<MentorPanelProps> = ({ studentCode, onBackToHub, onTabChange, initialTab }) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab && initialTab !== 'products' ? initialTab : 'challenges');
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!studentCode) return;
    fetch('/api/chat/profile', {
      headers: {
        'x-student-access-code': studentCode,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.profile) {
          setProfile(data.profile);
        }
      })
      .catch(() => {});
  }, [studentCode]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (onTabChange) {
      onTabChange(activeTab);
    }
  }, [activeTab, onTabChange]);

  // If viewing TikTok Integration, completely unmount the Dashboard header & grid
  if (activeTab === 'tiktok') {
    return (
      <div className="animate-in fade-in duration-300 w-full">
        <TikTokIntegration
          studentCode={studentCode}
          onBackToMentor={() => setActiveTab('challenges')}
        />
      </div>
    );
  }

  const adminName = profile?.nickname ? `${profile.nickname} — ADM` : 'Bigode — ADM';

  const mentorCards = [
    {
      id: 'challenges',
      title: 'Criar Desafios',
      shortDescription: 'Ganchos Virais & Desafios',
      description: 'Gestão de desafios virais e ganchos de alta conversão.',
      icon: Trophy,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'students',
      title: 'Alunos',
      shortDescription: 'Métricas e Progresso dos Alunos',
      description: 'Acompanhamento, estatísticas e progresso dos alunos.',
      icon: Users,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'codes',
      title: 'Códigos de Acesso',
      shortDescription: 'Gestão de Chaves e Licenças',
      description: 'Gestão de chaves, licenças e permissões de acesso.',
      icon: Key,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'sessions',
      title: 'Sessões & Membros',
      shortDescription: 'Membros Online em Tempo Real',
      description: 'Monitoramento em tempo real de membros online e atividade.',
      icon: Activity,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'stats',
      title: 'Estatísticas',
      shortDescription: 'Métricas Globais de Uso',
      description: 'Métricas globais de uso, interações e engajamento.',
      icon: BarChart3,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'tiktok',
      title: 'Integração TikTok',
      shortDescription: 'Conexão Oficial Login Kit OAuth 2.0',
      description: 'Conexão e autorização oficial via Login Kit OAuth 2.0.',
      icon: Video,
      badge: 'Novo',
      badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
      isAvailable: true,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      
      {/* Mentor Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 border border-cyan-500/40 p-4 sm:p-6 md:p-7 shadow-2xl shadow-cyan-950/60 overflow-hidden group">
        {/* Futuristic Background Texture */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none group-hover:opacity-25 transition-opacity duration-300"
          style={{
            backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Cyber Radial Glow Effects */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-cyan-950/90 text-cyan-300 border border-cyan-500/50 flex items-center space-x-1.5 shadow-lg shadow-cyan-950/50">
                <Crown className="w-3.5 h-3.5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                <span>Painel do Mentor</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 shadow-md">
                {adminName}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400 tracking-tight leading-tight">
              Área Administrativa Exclusiva
            </h1>
            <p className="text-xs sm:text-sm text-cyan-100/90 max-w-2xl leading-relaxed font-medium">
              Gerencie produtos, desafios, métricas de alunos e integrações com autorização de nível mestre.
            </p>
          </div>

          {onBackToHub && (
            <button
              onClick={onBackToHub}
              className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-300 hover:text-white border border-cyan-500/50 hover:border-cyan-400 text-xs font-bold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-cyan-950/50 hover:scale-[1.02] active:scale-95 shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar à Central de Agentes</span>
            </button>
          )}
        </div>
      </div>

      {/* Mentor Cards Navigation Grid - Premium SaaS Admin Layout */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 md:gap-5">
        {mentorCards.map((card) => {
          const Icon = card.icon;
          const isSelected = activeTab === card.id;

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                if (card.isAvailable) {
                  setActiveTab(card.id as any);
                }
              }}
              className={`relative group p-4 sm:p-5 md:p-6 min-h-[155px] sm:min-h-[170px] md:min-h-[180px] rounded-2xl bg-gradient-to-br from-[#0a192f] via-[#091322] to-[#040d1a] border shadow-xl flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer w-full overflow-hidden hover:scale-[1.02] active:scale-95 ${
                isSelected
                  ? 'border-cyan-400 bg-gradient-to-br from-[#0c2242] via-[#091b33] to-[#051326] ring-1 ring-cyan-400/80 shadow-[0_0_22px_rgba(6,182,212,0.3)]'
                  : 'border-cyan-500/40 hover:border-cyan-300 shadow-cyan-950/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)]'
              }`}
            >
              {/* Futuristic Background Texture */}
              <div 
                className="absolute inset-0 w-full h-full opacity-15 group-hover:opacity-25 pointer-events-none transition-opacity duration-300"
                style={{
                  backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />

              {/* Darkening Scrim Overlay for High Text Contrast */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#040d1a]/30 to-[#040d1a]/60 pointer-events-none" />

              {/* Light Sweep Reflection Effect on Hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none overflow-hidden transition-opacity duration-300">
                <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-[350%] transition-transform duration-1000 ease-in-out" />
              </div>

              {/* Standardized Status Badge in Top Right Corner */}
              <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-10">
                <span
                  className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider border flex items-center gap-1 sm:gap-1.5 transition-all shadow-md shrink-0 ${
                    isSelected
                      ? 'bg-cyan-950/90 text-cyan-300 border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                      : card.id === 'tiktok'
                      ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-cyan-950/50'
                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-emerald-950/50'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-cyan-400 animate-pulse' : 'bg-emerald-400'}`} />
                  <span>{isSelected ? 'ATIVO' : card.badge || 'ATIVO'}</span>
                </span>
              </div>

              {/* Standardized Icon Container with Uniform Cyan Glow */}
              <div
                className={`w-13 h-13 sm:w-15 sm:h-15 rounded-2xl border flex items-center justify-center shrink-0 mb-2.5 sm:mb-3 relative z-10 transition-all duration-200 group-hover:scale-105 ${
                  isSelected
                    ? 'bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 border-cyan-200 text-white shadow-[0_0_18px_rgba(6,182,212,0.4)]'
                    : 'bg-gradient-to-br from-cyan-500/20 via-blue-600/20 to-indigo-700/20 border-cyan-500/40 text-cyan-300 group-hover:border-cyan-300 group-hover:text-cyan-100 group-hover:bg-gradient-to-br group-hover:from-cyan-500/30 group-hover:to-blue-600/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                }`}
              >
                <Icon className="w-6 h-6 sm:w-7 sm:h-7 drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)]" />
              </div>

              {/* Title - Fully Readable, High Contrast, Wrapped Line-Clamp-2 */}
              <h3 className={`text-xs sm:text-sm md:text-base font-bold tracking-tight leading-snug max-w-[98%] line-clamp-2 relative z-10 transition-colors ${
                isSelected ? 'text-white font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]' : 'text-white group-hover:text-cyan-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]'
              }`}>
                {card.title}
              </h3>
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      <div className="pt-2">
        {activeTab === 'products' && (
          <ProductLibrary studentCode={studentCode} />
        )}
        {activeTab === 'challenges' && (
          <MentorChallenges studentCode={studentCode} />
        )}
        {activeTab === 'students' && (
          <MentorStudentsList />
        )}
        {activeTab === 'codes' && (
          <MentorAccessCodes studentCode={studentCode} />
        )}
        {activeTab === 'sessions' && (
          <MentorOnlineMonitoring studentCode={studentCode} />
        )}
        {activeTab === 'stats' && (
          <MentorStats studentCode={studentCode} />
        )}
      </div>

    </div>
  );
};
