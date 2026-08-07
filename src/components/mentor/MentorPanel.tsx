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
  const [activeTab, setActiveTab] = useState<string>(initialTab || 'products');
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
          onBackToMentor={() => setActiveTab('products')}
        />
      </div>
    );
  }

  const adminName = profile?.nickname ? `${profile.nickname} — ADM` : 'Bigode — ADM';

  const mentorCards = [
    {
      id: 'products',
      title: 'Biblioteca de Produtos',
      description: 'Gerenciamento do catálogo de produtos, imagens e mídias.',
      icon: Package,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'challenges',
      title: 'Criar Desafios',
      description: 'Gestão de desafios virais e ganchos de alta conversão.',
      icon: Trophy,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'students',
      title: 'Alunos',
      description: 'Acompanhamento, estatísticas e progresso dos alunos.',
      icon: Users,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'codes',
      title: 'Códigos de Acesso',
      description: 'Gestão de chaves, licenças e permissões de acesso.',
      icon: Key,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'sessions',
      title: 'Sessões & Membros',
      description: 'Monitoramento em tempo real de membros online e atividade.',
      icon: Activity,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'stats',
      title: 'Estatísticas',
      description: 'Métricas globais de uso, interações e engajamento.',
      icon: BarChart3,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'tiktok',
      title: 'Integração TikTok',
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

      {/* Mentor Cards Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {mentorCards.map((card) => {
          const Icon = card.icon;
          const isSelected = activeTab === card.id;

          return (
            <div
              key={card.id}
              onClick={() => {
                if (card.isAvailable) {
                  setActiveTab(card.id as any);
                }
              }}
              className={`relative group p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden min-w-0 ${
                card.isAvailable
                  ? isSelected
                    ? 'bg-gradient-to-br from-[#0c2242] via-[#091b33] to-[#051326] border-cyan-400 shadow-xl shadow-cyan-500/20 ring-1 ring-cyan-400/80 -translate-y-1 cursor-pointer'
                    : 'bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 border-cyan-500/40 hover:border-cyan-300/80 shadow-xl shadow-cyan-950/40 hover:shadow-cyan-500/20 hover:-translate-y-1 cursor-pointer'
                  : 'bg-[#020d14]/40 border-slate-800/80 opacity-60 cursor-not-allowed'
              }`}
            >
              {/* Futuristic Background Texture */}
              <div 
                className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
                  isSelected ? 'opacity-25' : 'opacity-15 group-hover:opacity-25'
                }`}
                style={{
                  backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />

              {/* Active Ambient Glow */}
              {isSelected && (
                <div className="absolute inset-0 bg-cyan-500/10 pointer-events-none blur-xl" />
              )}

              <div className="relative z-10 space-y-3">
                {/* Header Row: Icon + Title + Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-lg transition-transform duration-200 ${
                        isSelected
                          ? 'bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 border-cyan-200 text-white shadow-cyan-500/50 scale-105'
                          : 'bg-gradient-to-br from-cyan-500/20 via-blue-600/20 to-indigo-700/20 border-cyan-500/40 text-cyan-300 group-hover:border-cyan-300 group-hover:bg-cyan-500/30 group-hover:scale-105 shadow-cyan-950/40'
                      }`}
                    >
                      <Icon className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className={`font-black text-sm transition-colors truncate ${
                        isSelected ? 'text-white' : 'text-white group-hover:text-cyan-200'
                      }`}>
                        {card.title}
                      </h3>
                      <p className="text-[11px] text-cyan-200/70 leading-tight line-clamp-2 mt-0.5 font-medium">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Row: Active Status or Action Link */}
              <div className="relative z-10 mt-3.5 pt-2.5 border-t border-cyan-500/20 flex items-center justify-between text-[11px]">
                {isSelected ? (
                  <span className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 text-[10px] font-black uppercase tracking-wider shadow-sm shadow-cyan-500/30">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>Aba Ativa</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 text-cyan-400/90 group-hover:text-cyan-200 font-extrabold text-[11px] transition-colors">
                    <span>Abrir módulo</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}

                {card.badge && (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border shrink-0 uppercase tracking-wider ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                )}
              </div>
            </div>
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
