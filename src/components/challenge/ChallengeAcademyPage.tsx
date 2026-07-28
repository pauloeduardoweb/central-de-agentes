import React, { useState } from 'react';
import { MysteryCardGame } from './MysteryCardGame';
import { AcademiaEmBreveCard } from './AcademiaEmBreveCard';
import { ACADEMIA_DESAFIOS_LIBERADA } from '../../config/featureFlags';
import { isMasterKey } from '../../data/studentCodes';
import { Trophy, ArrowLeft, Sparkles, Flame, Shield, Award, Layers } from 'lucide-react';

interface ChallengeAcademyPageProps {
  onBackToMainTab?: () => void;
}

export const ChallengeAcademyPage: React.FC<ChallengeAcademyPageProps> = ({ onBackToMainTab }) => {
  const [activeSubTab, setActiveSubTab] = useState<string>('carta_misteriosa');

  const studentCode = localStorage.getItem('user_student_access_code') || '';
  const isMaster = isMasterKey(studentCode);

  // Se a academia não estiver liberada globalmente e o usuário não for chave mestra, mostra o card "Em breve"
  if (!ACADEMIA_DESAFIOS_LIBERADA && !isMaster) {
    return <AcademiaEmBreveCard onBackToMainTab={onBackToMainTab} />;
  }

  const subTabs = [
    { id: 'carta_misteriosa', label: 'Carta Misteriosa', isNew: true, active: true },
    { id: 'continue_roteiro', label: 'Continue o Roteiro', isNew: false, active: false },
    { id: 'gancho_5_seg', label: 'Gancho em 5 Segundos', isNew: false, active: false },
    { id: 'mestre_cta', label: 'Mestre do CTA', isNew: false, active: false },
    { id: 'qual_thumbnail', label: 'Qual Thumbnail Vende Mais?', isNew: false, active: false },
    { id: 'batalha_copy', label: 'Batalha de Copy', isNew: false, active: false },
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Navigation & Subtabs Bar */}
      <div className="p-4 rounded-3xl bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 border border-cyan-500/50 shadow-2xl shadow-cyan-950/60 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-lg shadow-amber-500/20">
              <Trophy className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                  TREINAMENTO GAMIFICADO
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white">
                ACADEMIA DE DESAFIOS
              </h1>
            </div>
          </div>

          {onBackToMainTab && (
            <button
              onClick={onBackToMainTab}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer self-start md:self-auto"
            >
              <ArrowLeft className="w-4 h-4 text-cyan-400" />
              <span>Voltar ao Painel Principal</span>
            </button>
          )}

        </div>

        {/* Subtabs horizontal navigation */}
        <div className="flex items-center space-x-2 overflow-x-auto pt-4 pb-1 scrollbar-none">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.active) setActiveSubTab(tab.id);
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap flex items-center space-x-2 transition-all ${
                activeSubTab === tab.id
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-slate-950 shadow-lg shadow-cyan-500/30 scale-105'
                  : tab.active
                  ? 'bg-slate-900/80 text-cyan-300 hover:bg-slate-800 border border-cyan-500/30 cursor-pointer'
                  : 'bg-slate-950/40 text-slate-500 border border-slate-800/60 opacity-60 cursor-not-allowed'
              }`}
            >
              <span>{tab.label}</span>
              {tab.isNew && (
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-cyan-950 text-cyan-300 border border-cyan-400">
                  NOVO
                </span>
              )}
              {!tab.active && (
                <span className="text-[9px] font-normal text-slate-500">
                  (Em Breve)
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Module Content */}
      {activeSubTab === 'carta_misteriosa' && (
        <MysteryCardGame onBackToMainTab={onBackToMainTab} />
      )}

    </div>
  );
};
