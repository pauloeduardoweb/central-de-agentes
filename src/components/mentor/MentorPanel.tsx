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
} from 'lucide-react';
import { ProductLibrary } from './ProductLibrary';
import { MentorStudentsList } from './MentorStudentsList';
import { MentorOnlineMonitoring } from './MentorOnlineMonitoring';
import { MentorChallenges } from './MentorChallenges';
import { MentorAccessCodes } from './MentorAccessCodes';
import { MentorStats } from './MentorStats';

interface MentorPanelProps {
  studentCode: string;
  onBackToHub?: () => void;
  onTabChange?: (tab: string) => void;
}

export const MentorPanel: React.FC<MentorPanelProps> = ({ studentCode, onBackToHub, onTabChange }) => {
  const [activeTab, setActiveTab] = useState<'products' | 'challenges' | 'students' | 'codes' | 'sessions' | 'stats'>('products');

  useEffect(() => {
    if (onTabChange) {
      onTabChange(activeTab);
    }
  }, [activeTab, onTabChange]);

  const mentorCards = [
    {
      id: 'products',
      title: 'Biblioteca de Produtos',
      description: 'Gerenciamento completo do catálogo de produtos, categorias e imagens.',
      icon: Package,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'challenges',
      title: 'Criar Desafios',
      description: 'Crie e edite desafios e ganchos virais para a Academia de Desafios.',
      icon: Trophy,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'students',
      title: 'Alunos',
      description: 'Acompanhe o progresso, nível, perfil e estatísticas dos alunos.',
      icon: Users,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'codes',
      title: 'Códigos de Acesso',
      description: 'Gerenciamento de chaves de alunos e liberação de novas licenças.',
      icon: Key,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'sessions',
      title: 'Sessões Ativas & Membros',
      description: 'Monitoramento em tempo real de alunos online, conexões, páginas e IP.',
      icon: Activity,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
    {
      id: 'stats',
      title: 'Estatísticas',
      description: 'Métricas avançadas de uso de agentes, desafios concluídos e acessos.',
      icon: BarChart3,
      badge: 'Ativo',
      badgeColor: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
      isAvailable: true,
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6 animate-in fade-in duration-300">
      
      {/* Mentor Hero Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#031d2e] via-[#02131c] to-[#042133] border border-cyan-500/30 p-4 sm:p-6 md:p-8 shadow-2xl shadow-cyan-500/10 overflow-hidden">
        
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3.5 md:gap-6">
          
          <div className="space-y-1.5 md:space-y-2">
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
              <span className="px-2.5 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 flex items-center space-x-1 shadow-md">
                <Crown className="w-3 h-3 md:w-3.5 md:h-3.5 text-amber-400" />
                <span>Painel do Mentor</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] md:text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                Acesso Mestre
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
              Área Administrativa Exclusiva
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed line-clamp-2 md:line-clamp-none">
              Bem-vindo ao Painel do Mentor. Gerencie produtos, métricas e conteúdos com autorização de nível mestre no ecossistema Geração Z Pro.
            </p>
          </div>

          {onBackToHub && (
            <button
              onClick={onBackToHub}
              className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-cyan-300 hover:text-white border border-cyan-500/30 text-xs font-bold flex items-center justify-center space-x-2 transition-all shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar à Central de Agentes</span>
            </button>
          )}

        </div>
      </div>

      {/* 6 Mentor Cards Navigation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
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
              className={`relative group p-3.5 sm:p-4 md:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                card.isAvailable
                  ? isSelected
                    ? 'bg-[#031d2e] border-cyan-400 shadow-xl shadow-cyan-500/10 cursor-pointer ring-1 ring-cyan-400'
                    : 'bg-[#020d14]/80 border-cyan-500/30 hover:border-cyan-400/80 hover:bg-[#02131c] cursor-pointer'
                  : 'bg-[#020d14]/40 border-slate-800/80 opacity-70 cursor-not-allowed'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`p-2 md:p-3 rounded-xl border ${
                        card.isAvailable
                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                          : 'bg-slate-800/50 border-slate-700 text-slate-500'
                      }`}
                    >
                      <Icon className="w-4 h-4 md:w-6 md:h-6" />
                    </div>

                    <h3 className="font-bold text-sm md:text-base text-white group-hover:text-cyan-200 transition-colors sm:hidden">
                      {card.title}
                    </h3>
                  </div>

                  <span className={`px-2 py-0.5 md:px-2.5 rounded-full text-[9px] md:text-[10px] font-bold border ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                </div>

                <h3 className="hidden sm:block font-bold text-sm md:text-base text-white group-hover:text-cyan-200 transition-colors">
                  {card.title}
                </h3>
                <p className="text-[11px] md:text-xs text-slate-400 mt-1 md:mt-1.5 leading-relaxed line-clamp-2">
                  {card.description}
                </p>
              </div>

              {card.isAvailable && (
                <div className="mt-3 md:mt-4 pt-2 md:pt-3 border-t border-cyan-500/20 flex items-center justify-between text-[11px] md:text-xs font-bold text-cyan-400">
                  <span>{isSelected ? 'Aba Ativa' : 'Acessar Painel'}</span>
                  <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4" />
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
      </div>


    </div>
  );
};
