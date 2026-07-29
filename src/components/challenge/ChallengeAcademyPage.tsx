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
      
      {/* Top Navigation & Subtabs Bar - Exactly as in reference photo */}
      <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 border border-cyan-500/50 shadow-2xl shadow-cyan-950/60 backdrop-blur-md flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 overflow-x-auto py-1 scrollbar-none w-full">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.active) setActiveSubTab(tab.id);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap flex items-center space-x-2 transition-all shrink-0 ${
                activeSubTab === tab.id
                  ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/30 scale-102 font-extrabold'
                  : tab.active
                  ? 'bg-slate-900/80 text-cyan-300 hover:bg-slate-800 border border-cyan-500/30 cursor-pointer'
                  : 'bg-slate-950/40 text-slate-500 border border-slate-800/60 opacity-60 cursor-not-allowed'
              }`}
            >
              <span>{tab.label}</span>
              {tab.isNew && (
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${activeSubTab === tab.id ? 'bg-slate-950 text-cyan-300' : 'bg-cyan-950 text-cyan-300 border border-cyan-400'}`}>
                  NOVO
                </span>
              )}
              {!tab.active && (
                <span className="text-[10px] font-normal text-slate-500">
                  (EM BREVE)
                </span>
              )}
            </button>
          ))}
        </div>

        {onBackToMainTab && (
          <button
            onClick={onBackToMainTab}
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ml-auto"
            title="Voltar ao Painel Principal"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Voltar</span>
          </button>
        )}
      </div>

      {/* Module Content */}
      {activeSubTab === 'carta_misteriosa' && (
        <MysteryCardGame onBackToMainTab={onBackToMainTab} />
      )}

    </div>
  );
};
