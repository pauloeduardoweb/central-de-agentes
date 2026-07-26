import React from 'react';
import { Bot, Heart, Sparkles, MessageSquare, MessageCircle, Globe, ExternalLink, PlusCircle } from 'lucide-react';
import { Agent } from '../types';

const ChatGPTIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    fill="currentColor"
  >
    <path d="M22.28 10.12a5.9 5.9 0 0 0-.52-4.82 6 6 0 0 0-6.73-2.82A6 6 0 0 0 10.2 1a6 6 0 0 0-5.7 4.1 6 6 0 0 0-3.92 3.8 6 6 0 0 0 .7 6.18 5.9 5.9 0 0 0 .52 4.82 6 6 0 0 0 6.73 2.82A6 6 0 0 0 13.8 23a6 6 0 0 0 5.7-4.1 6 6 0 0 0 3.92-3.8 6 6 0 0 0-.7-6.18ZM12 18a6 6 0 0 1-3.23-.94l.15-.09 3.2-1.85a.75.75 0 0 0 .38-.65V9.93l1.35.78a.74.74 0 0 0 .75 0l3.87-2.23.01.12a6 6 0 0 1-6.48 9.4Zm-7.1-3.41a6 6 0 0 1 .45-6.6l.12.07 3.2 1.85a.75.75 0 0 0 .75 0l3.93-2.27V6.08a.74.74 0 0 0-.37-.65L9.1 3.2l.1-.06a6 6 0 0 1 8.8 4.22 6 6 0 0 1-.45 6.6l-.12-.07-3.2-1.85a.75.75 0 0 0-.75 0l-3.93 2.27v1.56a.74.74 0 0 0 .37.65l3.88 2.24-.1.06a6 6 0 0 1-8.8-4.22ZM12 6a6 6 0 0 1 3.23.94l-.15.09-3.2 1.85a.75.75 0 0 0-.38.65v4.54l-1.35-.78a.74.74 0 0 0-.75 0L5.53 15.52l-.01-.12A6 6 0 0 1 12 6Z"/>
  </svg>
);

interface StatsBarProps {
  agents: Agent[];
  activeCategory?: string;
  onOpenOfficialAgent?: () => void;
  onOpenSiteModal?: () => void;
  onOpenCreate?: () => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  agents,
  onOpenOfficialAgent,
  onOpenSiteModal,
  onOpenCreate,
}) => {
  const totalAgents = agents.filter((a) => a.category !== 'Suporte').length;
  const favoriteAgents = agents.filter((a) => a.isFavorite).length;
  const customAgents = agents.filter((a) => a.isCustom).length;
  const totalExecutions = agents.reduce((acc, curr) => acc + (curr.usageCount || 0), 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 my-6">
      
      {/* 1. Total de Agentes */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 border border-cyan-500/40 shadow-xl shadow-cyan-950/40 flex items-center space-x-3.5 backdrop-blur-md relative overflow-hidden group">
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative overflow-hidden w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 text-white border border-cyan-300/80 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/40">
          <img 
            src="https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png" 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay pointer-events-none"
            referrerPolicy="no-referrer"
          />
          <ChatGPTIcon className="w-5 h-5 text-white relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
        </div>
        <div className="overflow-hidden relative z-10">
          <p className="text-[11px] font-bold text-cyan-300/90 truncate">Total de Agentes</p>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-lg font-black text-white">{totalAgents}</span>
            <span className="text-[11px] font-semibold text-cyan-200/70">({customAgents} criados)</span>
          </div>
        </div>
      </div>

      {/* 2. Favoritos */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 border border-cyan-500/40 shadow-xl shadow-cyan-950/40 flex items-center space-x-3.5 backdrop-blur-md relative overflow-hidden group">
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative overflow-hidden w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 via-red-600 to-rose-700 text-white border border-rose-300/80 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/30">
          <img 
            src="https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png" 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay pointer-events-none"
            referrerPolicy="no-referrer"
          />
          <Heart className="w-5 h-5 text-white fill-white relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
        </div>
        <div className="overflow-hidden relative z-10">
          <p className="text-[11px] font-bold text-cyan-300/90 truncate">Favoritos</p>
          <p className="text-lg font-black text-white">{favoriteAgents}</p>
        </div>
      </div>

      {/* 3. Interações de Chat */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 border border-cyan-500/40 shadow-xl shadow-cyan-950/40 flex items-center space-x-3.5 backdrop-blur-md relative overflow-hidden group">
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative overflow-hidden w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-600 text-white border border-indigo-300/80 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
          <img 
            src="https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png" 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay pointer-events-none"
            referrerPolicy="no-referrer"
          />
          <MessageCircle className="w-5 h-5 text-white relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
        </div>
        <div className="overflow-hidden relative z-10">
          <p className="text-[11px] font-bold text-cyan-300/90 truncate">Interações de Chat</p>
          <p className="text-lg font-black text-white">{totalExecutions}</p>
        </div>
      </div>

      {/* 4. Modelo AI Ativo */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 border border-cyan-500/40 shadow-xl shadow-cyan-950/40 flex items-center space-x-3.5 backdrop-blur-md relative overflow-hidden group">
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative overflow-hidden w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-indigo-600 to-blue-700 text-white border border-purple-300/80 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30">
          <img 
            src="https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png" 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay pointer-events-none"
            referrerPolicy="no-referrer"
          />
          <Sparkles className="w-5 h-5 text-white relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
        </div>
        <div className="overflow-hidden relative z-10">
          <p className="text-[11px] font-bold text-cyan-300/90 truncate">Modelo AI Ativo</p>
          <p className="text-xs font-black text-white mt-0.5 truncate">Gemini 3.6 Flash</p>
        </div>
      </div>

      {/* 5. Conversar com Assistente Oficial */}
      <button
        onClick={onOpenOfficialAgent}
        className="p-4 rounded-2xl bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 hover:border-emerald-400 border border-emerald-500/50 shadow-xl shadow-cyan-950/40 flex items-center space-x-3.5 backdrop-blur-md relative overflow-hidden group transition-all cursor-pointer text-left hover:scale-[1.02] active:scale-95"
      >
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative overflow-hidden w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 text-slate-950 border border-emerald-300 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/30">
          <img 
            src="https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png" 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay pointer-events-none"
            referrerPolicy="no-referrer"
          />
          <Bot className="w-5 h-5 text-slate-950 relative z-10" />
        </div>
        <div className="overflow-hidden relative z-10">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 truncate">Agente IA</p>
          <p className="text-xs font-black text-white truncate">Assistente Oficial</p>
        </div>
      </button>

      {/* 6. Detalhes do Site */}
      <button
        onClick={onOpenSiteModal}
        className="p-4 rounded-2xl bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 hover:border-cyan-400 border border-cyan-500/40 shadow-xl shadow-cyan-950/40 flex items-center space-x-3.5 backdrop-blur-md relative overflow-hidden group transition-all cursor-pointer text-left hover:scale-[1.02] active:scale-95"
      >
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative overflow-hidden w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 text-white border border-cyan-300/80 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/30">
          <img 
            src="https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png" 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay pointer-events-none"
            referrerPolicy="no-referrer"
          />
          <Globe className="w-5 h-5 text-white relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
        </div>
        <div className="overflow-hidden relative z-10">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-300/90 truncate">Plataforma</p>
          <p className="text-xs font-black text-white truncate">Detalhes do Site</p>
        </div>
      </button>

      {/* 7. Visitar Site */}
      <a
        href="https://geracaozpro.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="p-4 rounded-2xl bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 hover:border-cyan-400 border border-cyan-500/40 shadow-xl shadow-cyan-950/40 flex items-center space-x-3.5 backdrop-blur-md relative overflow-hidden group transition-all cursor-pointer text-left hover:scale-[1.02] active:scale-95"
      >
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative overflow-hidden w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 text-white border border-cyan-300/80 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/30">
          <img 
            src="https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png" 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay pointer-events-none"
            referrerPolicy="no-referrer"
          />
          <span className="font-black text-xl text-white relative z-10 leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] select-none">Z</span>
        </div>
        <div className="overflow-hidden relative z-10">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-300/90 truncate">geracaozpro.com</p>
          <p className="text-xs font-black text-white flex items-center space-x-1 truncate">
            <span>Visitar Site</span>
            <ExternalLink className="w-3 h-3 text-cyan-300 shrink-0 ml-0.5" />
          </p>
        </div>
      </a>

      {/* 8. Criar Novo Agente */}
      <button
        onClick={onOpenCreate}
        className="p-4 rounded-2xl bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 hover:border-pink-400 border border-pink-500/40 shadow-xl shadow-cyan-950/40 flex items-center space-x-3.5 backdrop-blur-md relative overflow-hidden group transition-all cursor-pointer text-left hover:scale-[1.02] active:scale-95"
      >
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative overflow-hidden w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 via-rose-600 to-purple-700 text-white border border-pink-300/80 flex items-center justify-center shrink-0 shadow-lg shadow-pink-500/30">
          <img 
            src="https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png" 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay pointer-events-none"
            referrerPolicy="no-referrer"
          />
          <PlusCircle className="w-5 h-5 text-white relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
        </div>
        <div className="overflow-hidden relative z-10">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-pink-300 truncate">Personalizar IA</p>
          <p className="text-xs font-black text-white truncate">Criar Novo Agente</p>
        </div>
      </button>

    </div>
  );
};



