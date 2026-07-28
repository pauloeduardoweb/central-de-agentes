import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Heart, UserCheck, Sparkles, FolderOpen, Flame, Zap, ShoppingBag, ShieldAlert, Headphones, Layers, HelpCircle, TrendingUp, MessageCircle, Users, ExternalLink, Copy, Check, Cpu, Clock, Trophy, Target, Award, Compass, Rocket } from 'lucide-react';
import { Agent, CategoryType } from '../types';
import { AgentCard } from './AgentCard';
import { TikTokPosterCard } from './TikTokPosterCard';
import { ChallengeAcademyPage } from './challenge/ChallengeAcademyPage';

interface AgentGridProps {
  agents: Agent[];
  onSelectChat: (agent: Agent) => void;
  onToggleFavorite: (id: string) => void;
  onEdit: (agent: Agent) => void;
  onDuplicate: (agent: Agent) => void;
  onDelete: (id: string) => void;
  onCopyPrompt: (agent: Agent) => void;
  onOpenCreate: () => void;
}

interface CategoryMenuItem {
  id: CategoryType;
  label: string;
  tag: string;
  icon: React.ElementType;
  gradient: string;
  activeBorder: string;
  textGlow: string;
}

const CATEGORY_MENU: CategoryMenuItem[] = [
  {
    id: 'Tiktok 2K',
    label: 'TIKTOK 2K',
    tag: 'Conteúdos Dark Virais',
    icon: Flame,
    gradient: 'from-cyan-500 via-blue-600 to-indigo-600',
    activeBorder: 'border-cyan-400/80 shadow-cyan-500/20',
    textGlow: 'text-cyan-400',
  },
  {
    id: 'Tiktok Shop',
    label: 'TIKTOK SHOP',
    tag: 'Formatos Virais',
    icon: ShoppingBag,
    gradient: 'from-emerald-500 via-teal-600 to-green-600',
    activeBorder: 'border-emerald-400/80 shadow-emerald-500/20',
    textGlow: 'text-emerald-400',
  },
  {
    id: 'Recurso Anti-Violação',
    label: 'RECURSO ANTI-VIOLAÇÃO',
    tag: 'Proteção & Defesa',
    icon: ShieldAlert,
    gradient: 'from-rose-500 via-red-600 to-amber-600',
    activeBorder: 'border-rose-400/80 shadow-rose-500/20',
    textGlow: 'text-rose-400',
  },
  {
    id: 'Suporte',
    label: 'SUPORTE',
    tag: 'Ajuda & WhatsApp',
    icon: Headphones,
    gradient: 'from-violet-500 via-purple-600 to-indigo-600',
    activeBorder: 'border-violet-400/80 shadow-violet-500/20',
    textGlow: 'text-violet-400',
  },
  {
    id: 'Grupo de Network',
    label: 'GRUPO DE NETWORK',
    tag: 'Comunidade VIP',
    icon: MessageCircle,
    gradient: 'from-emerald-500 via-teal-600 to-green-600',
    activeBorder: 'border-emerald-400/80 shadow-emerald-500/20',
    textGlow: 'text-emerald-400',
  },
  {
    id: 'Flow Ultra',
    label: 'FLOW ULTRA',
    tag: 'IA & Automação',
    icon: Zap,
    gradient: 'from-cyan-500 via-blue-600 to-indigo-600',
    activeBorder: 'border-cyan-400/80 shadow-cyan-500/20',
    textGlow: 'text-cyan-400',
  },
  {
    id: 'Academia de Desafios',
    label: 'ACADEMIA DE DESAFIOS',
    tag: 'Treinamentos & Missões',
    icon: Trophy,
    gradient: 'from-amber-500 via-orange-600 to-red-600',
    activeBorder: 'border-amber-400/80 shadow-amber-500/20',
    textGlow: 'text-amber-400',
  },
];

export const AgentGrid: React.FC<AgentGridProps> = ({
  agents,
  onSelectChat,
  onToggleFavorite,
  onEdit,
  onDuplicate,
  onDelete,
  onCopyPrompt,
  onOpenCreate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('Tiktok 2K');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyCustom, setOnlyCustom] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'name' | 'recent'>('popular');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(url);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const filteredAgents = useMemo(() => {
    return agents
      .filter((agent) => {
        // Exclude specific removed names from TikTok Shop if present
        if (agent.category === 'Tiktok Shop') {
          const nameLower = agent.name.toLowerCase();
          if (
            nameLower.includes('roteirista tiktok shop') ||
            nameLower.includes('copywriter afiliado tiktok shop') ||
            nameLower.includes('estrategista tiktok shop') ||
            nameLower.includes('achadinhos')
          ) {
            return false;
          }
        }

        // Category filter: Recurso Anti-Violação should strictly show Anti-Violação Geração Z Pro
        if (selectedCategory === 'Recurso Anti-Violação') {
          if (agent.category !== 'Recurso Anti-Violação') return false;
          if (agent.id !== 'agent-recurso-anti-violacao-geracaozpro' && !agent.name.toLowerCase().includes('anti-violação geração z pro')) {
            return false;
          }
        } else if (selectedCategory === 'Grupo de Network') {
          if (agent.category !== 'Grupo de Network') return false;
        } else if (selectedCategory === 'Flow Ultra') {
          if (agent.category !== 'Flow Ultra') return false;
        } else if (selectedCategory !== 'Todas') {
          if (agent.category !== selectedCategory) {
            return false;
          }
        }

        // Favorite filter
        if (onlyFavorites && !agent.isFavorite) {
          return false;
        }
        // Custom filter
        if (onlyCustom && !agent.isCustom) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = agent.name.toLowerCase().includes(q);
          const matchesTagline = agent.tagline.toLowerCase().includes(q);
          const matchesDesc = agent.description.toLowerCase().includes(q);
          const matchesCat = agent.category.toLowerCase().includes(q);
          const matchesInstructions = agent.systemInstruction.toLowerCase().includes(q);
          return matchesName || matchesTagline || matchesDesc || matchesCat || matchesInstructions;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'popular') {
          return (b.usageCount || 0) - (a.usageCount || 0);
        } else if (sortBy === 'name') {
          return a.name.localeCompare(b.name, 'pt-BR');
        } else {
          return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
        }
      });
  }, [agents, selectedCategory, onlyFavorites, onlyCustom, searchQuery, sortBy]);

  // Count agents by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'Tiktok 2K': 0,
      'Tiktok Shop': 0,
      'Recurso Anti-Violação': 0,
      'Suporte': 0,
      'Grupo de Network': 2,
      'Flow Ultra': 1,
      'Academia de Desafios': 0,
      'Todas': agents.length,
    };
    agents.forEach((a) => {
      if (a.category === 'Recurso Anti-Violação') {
        if (a.id === 'agent-recurso-anti-violacao-geracaozpro' || a.name.toLowerCase().includes('anti-violação geração z pro')) {
          counts['Recurso Anti-Violação'] = 1;
        }
      } else if (a.category === 'Tiktok Shop') {
        const nameLower = a.name.toLowerCase();
        if (
          !nameLower.includes('roteirista tiktok shop') &&
          !nameLower.includes('copywriter afiliado tiktok shop') &&
          !nameLower.includes('estrategista tiktok shop') &&
          !nameLower.includes('achadinhos')
        ) {
          counts['Tiktok Shop']++;
        }
      } else if (counts[a.category] !== undefined) {
        counts[a.category]++;
      } else {
        counts['Tiktok 2K']++;
      }
    });
    return counts;
  }, [agents]);

  return (
    <div className="space-y-6">
      
      {/* MAIN TOP NAVIGATION MENUS (TIKTOK 2K | TIKTOK SHOP | RECURSO ANTI-VIOLAÇÃO | SUPORTE | GRUPO DE NETWORK | FLOW ULTRA | ACADEMIA DE DESAFIOS) */}
      <div className="bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 border border-cyan-500/50 p-3 rounded-2xl shadow-2xl shadow-cyan-950/60 backdrop-blur-md relative overflow-hidden">
        {/* Tech Grid Image Overlay for main container */}
        <div 
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 relative z-10">
          {CATEGORY_MENU.map((item) => {
            const IconComponent = item.icon;
            const isSelected = selectedCategory === item.id;
            const count = categoryCounts[item.id] || 0;

            return (
              <button
                key={item.id}
                onClick={() => setSelectedCategory(item.id)}
                className={`relative flex flex-col items-start justify-between p-3.5 rounded-xl transition-all duration-300 text-left border overflow-hidden group ${
                  isSelected
                    ? `bg-gradient-to-br from-[#0d2a4a] via-[#091f38] to-[#051224] text-white ${item.activeBorder} shadow-xl shadow-cyan-500/30 ring-2 ring-cyan-400`
                    : 'bg-gradient-to-br from-[#051526]/90 via-[#030e1c]/90 to-[#020812]/90 hover:bg-[#0a233f] text-slate-200 border-cyan-500/30 hover:border-cyan-400/70 shadow-md'
                }`}
              >
                {/* Individual Card Tech Grid Background */}
                <div 
                  className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${isSelected ? 'opacity-40' : 'opacity-25 group-hover:opacity-45'}`}
                  style={{
                    backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />

                <div className="flex items-center justify-between w-full mb-3 relative z-10">
                  {/* Fundo Tecnológico no Quadrado do Ícone */}
                  <div className={`relative overflow-hidden w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                    isSelected 
                      ? `bg-gradient-to-br ${item.gradient} text-white border-cyan-200 shadow-lg shadow-cyan-500/50` 
                      : 'bg-gradient-to-br from-[#0a2847] via-[#0e3760] to-[#05182e] text-cyan-300 border-cyan-400/70 group-hover:border-cyan-300 shadow-md shadow-cyan-950/60'
                  }`}>
                    {/* Tech Grid Image texture inside icon square */}
                    <img 
                      src="https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png" 
                      alt="" 
                      className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${
                        isSelected ? 'opacity-85 mix-blend-screen' : 'opacity-80 mix-blend-screen'
                      }`}
                      referrerPolicy="no-referrer"
                    />
                    <IconComponent className="w-5 h-5 relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
                  </div>

                  {/* Badge contador */}
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                    isSelected
                      ? 'bg-cyan-950/90 text-cyan-200 border-cyan-400/70 shadow-xs'
                      : 'bg-[#030e1a]/90 text-cyan-300 border-cyan-500/30'
                  }`}>
                    {item.id === 'Grupo de Network' ? '2 Grupos VIP' : item.id === 'Suporte' ? '1 Contato' : item.id === 'Flow Ultra' ? '3 Grupos VIP' : item.id === 'Academia de Desafios' ? (count > 0 ? `${count} ${count === 1 ? 'Agente' : 'Agentes'}` : '3 Desafios') : `${count} ${count === 1 ? 'Agente' : 'Agentes'}`}
                  </span>
                </div>

                <div className="relative z-10">
                  <h3 className={`text-xs font-black tracking-tight uppercase ${isSelected ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-slate-100 group-hover:text-cyan-200'}`}>
                    {item.label}
                  </h3>
                  <span className={`text-[10px] font-bold ${isSelected ? item.textGlow : 'text-cyan-400/80'}`}>
                    {item.tag}
                  </span>
                </div>

                {isSelected && (
                  <div className={`absolute -bottom-0.5 left-3 right-3 h-0.5 rounded-full bg-gradient-to-r ${item.gradient}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Special Category Hero Banners */}
      {selectedCategory === 'Tiktok 2K' && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 border border-cyan-500/50 shadow-2xl shadow-cyan-950/50 text-white relative overflow-hidden group">
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-cyan-400 text-xs font-black uppercase tracking-wider mb-1">
                <Zap className="w-4 h-4 fill-cyan-400" />
                <span>Aba Exclusiva • Agentes de Alta Retenção</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-400">
                Agentes Virais Tiktok 2K
              </h2>
              <p className="text-xs text-cyan-100/90 mt-1 max-w-2xl leading-relaxed font-medium">
                Estes agentes foram projetados com os ganchos visuais, frases de retenção e capas estilizadas do método Tiktok 2K para alavancar suas publicações!
              </p>
            </div>
            <div className="shrink-0 flex items-center space-x-2">
              <span className="px-3 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 text-xs font-bold shadow-md shadow-cyan-500/20">
                {categoryCounts['Tiktok 2K']} Agentes Exclusivos
              </span>
            </div>
          </div>
        </div>
      )}

      {selectedCategory === 'Tiktok Shop' && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 border border-emerald-500/50 shadow-2xl shadow-cyan-950/50 text-white relative overflow-hidden group">
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-black uppercase tracking-wider mb-1">
                <ShoppingBag className="w-4 h-4" />
                <span>Menu Oficial • Conversão & Carrinho Amarelo</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-emerald-400">
                Agentes Especialistas em TikTok Shop
              </h2>
              <p className="text-xs text-emerald-100/90 mt-1 max-w-2xl leading-relaxed font-medium">
                Roteiros de unboxing, reviews persuasivos, mineração de produtos campeões e técnicas para direcionar os espectadores diretamente ao Carrinho Amarelo.
              </p>
            </div>
            <div className="shrink-0 flex items-center space-x-2">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 text-xs font-bold shadow-md shadow-emerald-500/20">
                {categoryCounts['Tiktok Shop']} Agentes de Vendas
              </span>
            </div>
          </div>
        </div>
      )}

      {selectedCategory === 'Recurso Anti-Violação' && (
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 border border-rose-500/50 shadow-2xl shadow-cyan-950/50 text-white relative overflow-hidden group">
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-rose-400 text-xs font-black uppercase tracking-wider mb-1">
                <ShieldAlert className="w-4 h-4" />
                <span>Menu Oficial • Defesa de Conta & Shadowban</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-rose-100 to-rose-400">
                Recursos e Proteção Anti-Violação
              </h2>
              <p className="text-xs text-rose-100/90 mt-1 max-w-2xl leading-relaxed font-medium">
                Elabore apelações formais com o agente oficial Anti-Violação Geração Z Pro. Audite seus roteiros antes de publicar para evitar shadowban e restrições.
              </p>
            </div>
            <div className="shrink-0 flex items-center space-x-2">
              <span className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-400/50 text-xs font-bold shadow-md shadow-rose-500/20">
                Agente Exclusivo
              </span>
            </div>
          </div>
        </div>
      )}

      {selectedCategory === 'Suporte' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 border border-emerald-500/50 shadow-2xl shadow-cyan-950/50 text-white relative overflow-hidden">
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="relative z-10 flex flex-col gap-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div>
                  <div className="flex items-center space-x-2 text-emerald-400 text-xs font-black uppercase tracking-wider mb-1.5">
                    <Headphones className="w-4 h-4" />
                    <span>Suporte Oficial</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-teal-300">
                    Suporte Mentor Bigode
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-200 mt-2 max-w-2xl leading-relaxed font-medium">
                    Precisa de suporte personalizado para dúvidas sobre os agentes ou dúvidas em geral? Clique no botão ao lado para abrir uma conversa direta no WhatsApp do Mentor Bigode
                  </p>
                </div>

                <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <a
                    href="https://wa.me/5521969931420"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 font-black text-sm flex items-center justify-center space-x-2.5 shadow-xl shadow-emerald-500/40 transition-all transform hover:scale-105 active:scale-95 border border-emerald-300/60 group"
                  >
                    <MessageCircle className="w-5 h-5 fill-slate-950/20 group-hover:scale-110 transition-transform" />
                    <span>WhatsApp Mentor Bigode</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Banner Image Suporte */}
              <div className="mt-1 rounded-xl overflow-hidden border border-emerald-500/30 shadow-2xl bg-[#030b15]">
                <img
                  src="https://i.postimg.cc/X7LHLNSh/SLIDE-7.png"
                  alt="Suporte Mentor Bigode — Geração Z Pro"
                  className="w-full h-auto object-cover rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedCategory === 'Grupo de Network' && (
        <div className="space-y-6">
          {/* Network Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 border border-emerald-500/50 shadow-2xl shadow-cyan-950/50 text-white relative overflow-hidden">
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2 text-emerald-400 text-xs font-black uppercase tracking-wider mb-1">
                  <Users className="w-4 h-4" />
                  <span>Comunidade VIP WhatsApp • Geração Z Pro</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-100 to-teal-300">
                  Nossos Grupos de Network
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed font-medium">
                  Conecte-se com outros criadores, compartilhe estratégias de vídeos virais, tire dúvidas sobre agentes GPT e expanda seus contatos nos nossos grupos exclusivos.
                </p>
              </div>
            </div>
          </div>

          {/* WhatsApp Group Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1 */}
            <div className="relative flex flex-col justify-between p-6 rounded-2xl bg-slate-900/90 border border-emerald-500/40 shadow-xl hover:border-emerald-400 transition-all duration-300 group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                    💬 Grupo VIP #01
                  </span>
                  <Users className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>

                <h3 className="text-xl font-black text-white group-hover:text-emerald-300 transition-colors">
                  Grupo 1 de Network Geração Z Pro
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Acesse este link para entrar no grupo do WhatsApp focado em troca de ideias, network com membros e inteligência artificial.
                </p>

                {/* Banner Image Grupo 1 */}
                <div className="mt-3 rounded-xl overflow-hidden border border-emerald-500/30 shadow-2xl bg-[#030b15]">
                  <img
                    src="https://i.postimg.cc/DmC9mHVn/image.png"
                    alt="Grupo 1 de Network Geração Z Pro"
                    className="w-full h-auto object-cover rounded-xl"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2">
                <a
                  href="https://chat.whatsapp.com/K50w9dkFPbjLpXJnrE23Fx?s=sw&p=a&ilr=4&amv=3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Entrar no Grupo 1 (WhatsApp)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={() => handleCopyLink('https://chat.whatsapp.com/K50w9dkFPbjLpXJnrE23Fx?s=sw&p=a&ilr=4&amv=3')}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                >
                  {copiedLink === 'https://chat.whatsapp.com/K50w9dkFPbjLpXJnrE23Fx?s=sw&p=a&ilr=4&amv=3' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Link do Grupo 1 Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Link do Grupo 1</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Card 2 */}
            <div className="relative flex flex-col justify-between p-6 rounded-2xl bg-slate-900/90 border border-teal-500/40 shadow-xl hover:border-teal-400 transition-all duration-300 group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-950 text-teal-300 border border-teal-500/40">
                    💬 Grupo VIP #02
                  </span>
                  <Users className="w-5 h-5 text-teal-400 group-hover:scale-110 transition-transform" />
                </div>

                <h3 className="text-xl font-black text-white group-hover:text-teal-300 transition-colors">
                  Grupo 2 Geração Z Pro Lives
                </h3>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Acesse o grupo oficial do WhatsApp e fique por dentro das melhores dicas, estratégias e dos horários das lives do Mentor Bigode.
                </p>

                {/* Banner Image Grupo 2 */}
                <div className="mt-3 rounded-xl overflow-hidden border border-teal-500/30 shadow-2xl bg-[#030b15]">
                  <img
                    src="https://i.postimg.cc/06q3LqSr/image.png"
                    alt="Grupo 2 Geração Z Pro Lives"
                    className="w-full h-auto object-cover rounded-xl"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2">
                <a
                  href="https://chat.whatsapp.com/DGHuHx1X7hfAT9pv7Ljlq9?s=sw&p=a&ilr=4&amv=3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 via-emerald-600 to-green-600 hover:from-teal-400 hover:to-green-500 text-white font-black text-xs flex items-center justify-center space-x-2 shadow-lg shadow-teal-500/30 transition-all active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Entrar no Grupo 2 (WhatsApp)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={() => handleCopyLink('https://chat.whatsapp.com/DGHuHx1X7hfAT9pv7Ljlq9?s=sw&p=a&ilr=4&amv=3')}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                >
                  {copiedLink === 'https://chat.whatsapp.com/DGHuHx1X7hfAT9pv7Ljlq9?s=sw&p=a&ilr=4&amv=3' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-teal-400" />
                      <span className="text-teal-400">Link do Grupo 2 Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Link do Grupo 2</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {selectedCategory === 'Flow Ultra' && (
        <div className="space-y-6">
          {/* Flow Ultra Main Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 border border-cyan-500/50 shadow-2xl shadow-cyan-950/50 text-white relative overflow-hidden">
            <div 
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div>
                <div className="flex items-center space-x-2 text-cyan-400 text-xs font-black uppercase tracking-wider mb-1.5">
                  <Zap className="w-4 h-4" />
                  <span>6 Grupos Oficiais • Geração Z Pro</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-indigo-300">
                  FLOW ULTRA
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 mt-2 max-w-2xl leading-relaxed font-medium">
                  Acesse os administradores dos grupos do Flow Ultra no WhatsApp. Entre em contato diretamente com o responsável pelo seu grupo para tirar dúvidas, liberar acesso e receber suporte.
                </p>
              </div>

              <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <a
                  href="https://labs.google/fx/tools/flow"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center space-x-2 shadow-xl shadow-cyan-500/30 transition-all transform hover:scale-105 active:scale-95 border border-cyan-300/40 group cursor-pointer"
                >
                  <Zap className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Acessar o site do Flow Ultra</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Attached High-Definition HD Image Display */}
          <div className="rounded-2xl overflow-hidden border border-cyan-500/40 shadow-2xl bg-[#030b15] relative group flex justify-center p-1 sm:p-2">
            <img
              src="https://i.postimg.cc/XngRqx4C/Chat-GPT-Image-24-de-jul-de-2026-21-37-52.png"
              alt="Flow Ultra Geração Z Pro HD"
              className="w-full h-auto object-contain rounded-xl max-h-[850px] shadow-lg"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* 6 WhatsApp Group Administrators Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center space-x-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <span>Administradores dos Grupos Flow Ultra</span>
              </h3>
              <span className="text-xs text-cyan-300 font-medium">3 Ativos • 3 Em Breve</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* GRUPO 1 */}
              <div className="relative flex flex-col justify-between p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 shadow-xl hover:border-emerald-400 transition-all duration-300 group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                      💬 GRUPO 1
                    </span>
                    <MessageCircle className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </div>

                  <h4 className="text-lg font-black text-white group-hover:text-emerald-300 transition-colors">
                    Mentor Bigode
                  </h4>

                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    Administrador responsável pelo Grupo 1 do Flow Ultra. Atendimento e suporte ao aluno.
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2">
                  <a
                    href="https://wa.me/5521969931420?text=Ol%C3%A1%20Mentor%20Bigode%2C%20quero%20participar%20do%20Grupo%201%20do%20Flow%20Ultra"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-black text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Falar no WhatsApp (Grupo 1)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => handleCopyLink('21 969931420')}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    {copiedLink === '21 969931420' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Número Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Número (21 969931420)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* GRUPO 2 */}
              <div className="relative flex flex-col justify-between p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 shadow-xl hover:border-emerald-400 transition-all duration-300 group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                      💬 GRUPO 2
                    </span>
                    <MessageCircle className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </div>

                  <h4 className="text-lg font-black text-white group-hover:text-emerald-300 transition-colors">
                    Administrador Walaf
                  </h4>

                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    Administrador responsável pelo Grupo 2 do Flow Ultra. Suporte a dúvidas e liberação.
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2">
                  <a
                    href="https://wa.me/5527981192966?text=Ol%C3%A1%20Walaf%2C%20quero%20participar%20do%20Grupo%202%20do%20Flow%20Ultra"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-black text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Falar no WhatsApp (Grupo 2)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => handleCopyLink('27 981192966')}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    {copiedLink === '27 981192966' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Número Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Número (27 981192966)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* GRUPO 3 */}
              <div className="relative flex flex-col justify-between p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 shadow-xl hover:border-emerald-400 transition-all duration-300 group">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                      💬 GRUPO 3
                    </span>
                    <MessageCircle className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </div>

                  <h4 className="text-lg font-black text-white group-hover:text-emerald-300 transition-colors">
                    Administrador Anderson
                  </h4>

                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    Administrador responsável pelo Grupo 3 do Flow Ultra. Atendimento e suporte direto.
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-2">
                  <a
                    href="https://wa.me/5521982850410?text=Ol%C3%A1%20Anderson%2C%20quero%20participar%20do%20Grupo%203%20do%20Flow%20Ultra"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-black text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Falar no WhatsApp (Grupo 3)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => handleCopyLink('21 982850410')}
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    {copiedLink === '21 982850410' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Número Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Número (21 982850410)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* GRUPO 4 */}
              <div className="relative flex flex-col justify-between p-5 rounded-2xl bg-slate-900/60 border border-slate-700/50 shadow-xl group hover:border-amber-500/40 transition-all duration-300">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-amber-300 border border-amber-500/30">
                      💬 GRUPO 4
                    </span>
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>

                  <h4 className="text-lg font-black text-slate-200">
                    Grupo 4 - Flow Ultra
                  </h4>

                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    Novo grupo de suporte e networking em breve disponível para alunos.
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80">
                  <div className="w-full py-3 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-xs flex items-center justify-center space-x-2">
                    <Clock className="w-4 h-4 animate-pulse" />
                    <span>Em breve</span>
                  </div>
                </div>
              </div>

              {/* GRUPO 5 */}
              <div className="relative flex flex-col justify-between p-5 rounded-2xl bg-slate-900/60 border border-slate-700/50 shadow-xl group hover:border-amber-500/40 transition-all duration-300">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-amber-300 border border-amber-500/30">
                      💬 GRUPO 5
                    </span>
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>

                  <h4 className="text-lg font-black text-slate-200">
                    Grupo 5 - Flow Ultra
                  </h4>

                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    Novo grupo de suporte e networking em breve disponível para alunos.
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80">
                  <div className="w-full py-3 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-xs flex items-center justify-center space-x-2">
                    <Clock className="w-4 h-4 animate-pulse" />
                    <span>Em breve</span>
                  </div>
                </div>
              </div>

              {/* GRUPO 6 */}
              <div className="relative flex flex-col justify-between p-5 rounded-2xl bg-slate-900/60 border border-slate-700/50 shadow-xl group hover:border-amber-500/40 transition-all duration-300">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-amber-300 border border-amber-500/30">
                      💬 GRUPO 6
                    </span>
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>

                  <h4 className="text-lg font-black text-slate-200">
                    Grupo 6 - Flow Ultra
                  </h4>

                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    Novo grupo de suporte e networking em breve disponível para alunos.
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-800/80">
                  <div className="w-full py-3 px-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-xs flex items-center justify-center space-x-2">
                    <Clock className="w-4 h-4 animate-pulse" />
                    <span>Em breve</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {selectedCategory === 'Academia de Desafios' && (
        <ChallengeAcademyPage onBackToMainTab={() => setSelectedCategory('Tiktok 2K')} />
      )}

      {/* Controls: Search, Filters & Sort (Hide when on Grupo de Network, Suporte, Flow Ultra or Academia de Desafios) */}
      {selectedCategory !== 'Grupo de Network' && selectedCategory !== 'Suporte' && selectedCategory !== 'Flow Ultra' && selectedCategory !== 'Academia de Desafios' && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#0a192f]/95 via-[#091322]/95 to-[#040d1a]/95 border border-cyan-500/40 shadow-xl shadow-cyan-950/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 backdrop-blur-md relative overflow-hidden">
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: `url('https://i.postimg.cc/sfqDXz09/Chat-GPT-Image-22-de-jul-de-2026-18-23-54.png')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          
          {/* Search Input */}
          <div className="relative flex-1 z-10">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
            <input
              type="text"
              placeholder="Pesquisar por nome, habilidades, instruções ou palavras-chave..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-[#05111d]/90 border border-cyan-500/40 text-white placeholder-cyan-200/50 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cyan-400 hover:text-cyan-200 font-bold"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Toggles and Sort */}
          <div className="flex items-center space-x-2 shrink-0 z-10">
            
            <button
              onClick={() => setOnlyFavorites(!onlyFavorites)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all border ${
                onlyFavorites
                  ? 'bg-rose-500/20 text-rose-300 border-rose-400/80 shadow-md shadow-rose-500/20'
                  : 'bg-[#05111d]/90 text-cyan-200/80 border-cyan-500/30 hover:border-cyan-400/60 hover:text-white'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-red-500 text-red-500' : 'text-red-400'}`} />
              <span>Favoritos</span>
            </button>

            <button
              onClick={() => setOnlyCustom(!onlyCustom)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all border ${
                onlyCustom
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/80 shadow-md shadow-emerald-500/20'
                  : 'bg-[#05111d]/90 text-cyan-200/80 border-cyan-500/30 hover:border-cyan-400/60 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Meus Agentes</span>
            </button>

            <div className="flex items-center space-x-1.5 pl-2 border-l border-cyan-500/30">
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#05111d]/90 border border-cyan-500/40 text-cyan-100 text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              >
                <option value="popular" className="bg-[#091322] text-white">Mais Usados</option>
                <option value="name" className="bg-[#091322] text-white">Nome (A-Z)</option>
                <option value="recent" className="bg-[#091322] text-white">Mais Recentes</option>
              </select>
            </div>

          </div>

        </div>
      )}

      {/* Grid of Agents (Hidden on Grupo de Network, Suporte, Academia de Desafios, and Flow Ultra unless agents exist) */}
      {selectedCategory !== 'Grupo de Network' && selectedCategory !== 'Suporte' && selectedCategory !== 'Academia de Desafios' && (selectedCategory !== 'Flow Ultra' || filteredAgents.length > 0) && (
        filteredAgents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredAgents.map((agent) => (
              <TikTokPosterCard
                key={agent.id}
                agent={agent}
                onSelectChat={onSelectChat}
                onToggleFavorite={onToggleFavorite}
                onCopyPrompt={onCopyPrompt}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800 p-8">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FolderOpen className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">
              Nenhum agente encontrado nesta categoria
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Não encontramos nenhum agente que corresponda à sua busca ou filtros selecionados para {selectedCategory}.
            </p>
          </div>
        )
      )}

    </div>
  );
};



