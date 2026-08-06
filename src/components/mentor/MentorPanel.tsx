import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Package,
  Trophy,
  Users,
  Key,
  Activity,
  BarChart3,
  Clock,
  Sparkles,
  ArrowLeft,
  Crown,
  Video,
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
    if (onTabChange) {
      onTabChange(activeTab);
    }
  }, [activeTab, onTabChange]);

  const adminName = profile?.nickname ? `${profile.nickname} — ADM` : 'Bigode — ADM';

  const mentorCards = [
    {
      id: 'products',
      title: 'Biblioteca de Produtos',
      description: 'Gerenciamento do catálogo de produtos e mídias.',
      icon: Package,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'challenges',
      title: 'Criar Desafios',
      description: 'Gestão de desafios e ganchos virais.',
      icon: Trophy,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'students',
      title: 'Alunos',
      description: 'Acompanhamento e estatísticas de alunos.',
      icon: Users,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'codes',
      title: 'Códigos de Acesso',
      description: 'Gestão de chaves e licenças ativas.',
      icon: Key,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'sessions',
      title: 'Sessões & Membros',
      description: 'Monitoramento em tempo real de membros online.',
      icon: Activity,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'stats',
      title: 'Estatísticas',
      description: 'Métricas globais de uso e engajamento.',
      icon: BarChart3,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'tiktok',
      title: 'Integração TikTok',
      description: 'Conexão oficial via Login Kit OAuth 2.0.',
      icon: Video,
      badge: 'Novo',
      badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40',
      isAvailable: true,
    },
  ];

  return (
    <div className="space-y-3.5 md:space-y-5 animate-in fade-in duration-300">
      
      {/* Mentor Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#031d2e] via-[#02131c] to-[#042133] border border-cyan-500/30 p-3.5 sm:p-5 md:p-6 shadow-2xl shadow-cyan-500/10 overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-6">
          
          <div className="space-y-1 md:space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 flex items-center space-x-1 shadow-md">
                <Crown className="w-3 h-3 text-amber-400" />
                <span>Painel do Mentor</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                {adminName}
              </span>
            </div>

            <h1 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight leading-tight">
              Área Administrativa Exclusiva
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed line-clamp-2">
              Bem-vindo ao Painel do Mentor ({adminName}). Gerencie produtos, métricas e conteúdos com autorização de nível mestre.
            </p>
          </div>

          {onBackToHub && (
            <button
              onClick={onBackToHub}
              className="w-full md:w-auto px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar à Central de Agentes</span>
            </button>
          )}

        </div>
      </div>

      {/* 6 Mentor Cards Navigation - Grade Compacta 2 colunas x 3 linhas */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
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
              className={`relative group p-2.5 sm:p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                card.isAvailable
                  ? isSelected
                    ? 'bg-[#031d2e] border-cyan-400 shadow-lg shadow-cyan-500/10 cursor-pointer ring-1 ring-cyan-400'
                    : 'bg-[#020d14]/80 border-cyan-500/30 hover:border-cyan-400/80 hover:bg-[#02131c] cursor-pointer'
                  : 'bg-[#020d14]/40 border-slate-800/80 opacity-70 cursor-not-allowed'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <div
                      className={`p-1.5 sm:p-2 rounded-lg border shrink-0 ${
                        card.isAvailable
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                          : 'bg-slate-800/50 border-slate-700 text-slate-500'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>

                    <h3 className="font-bold text-xs sm:text-sm text-white group-hover:text-cyan-200 transition-colors truncate">
                      {card.title}
                    </h3>
                  </div>

                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                </div>

                <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight line-clamp-1">
                  {card.description}
                </p>
              </div>

              {card.isAvailable && (
                <div className="mt-2 pt-1.5 border-t border-cyan-500/20 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-cyan-400">
                  <span>{isSelected ? 'Aba Ativa' : 'Acessar'}</span>
                  <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </div>
              )}
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
        {activeTab === 'tiktok' && (
          <TikTokIntegration studentCode={studentCode} />
        )}
      </div>


    </div>
  );
};
