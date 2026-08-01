import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Plus,
  Search,
  Sparkles,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Shield,
  Zap,
  Tag,
  AlertCircle,
  X,
  RefreshCw,
  Flame,
  Award,
} from 'lucide-react';

export interface ChallengeItem {
  id: string;
  title: string;
  category: string;
  xpReward: number;
  minLevel: number;
  description: string;
  instructions: string;
  examplePrompt?: string;
  active: boolean;
  createdAt: string;
}

interface MentorChallengesProps {
  studentCode: string;
}

const DEFAULT_CHALLENGES: ChallengeItem[] = [
  {
    id: 'ch-1',
    title: 'O Gancho Hipnótico de 3 Segundos',
    category: 'Hooks Virais',
    xpReward: 150,
    minLevel: 1,
    description: 'Crie uma introdução devastadora para prender a atenção nos primeiros 3 segundos de reels ou shorts.',
    instructions: 'Defina a dor principal do seu público e use uma pergunta provocativa antes da transição visual.',
    examplePrompt: 'Pare de tentar vender para todo mundo. Se você tem menos de 10k seguidores, faça exatamente isso...',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ch-2',
    title: 'Roteiro de Retenção Absoluta 60s',
    category: 'Retenção TikTok',
    xpReward: 250,
    minLevel: 2,
    description: 'Aprenda a estruturar o meio do vídeo para manter o tempo de exibição acima de 80%.',
    instructions: 'Divida o roteiro em 3 blocos de revelação progressiva com quebra de padrão visual a cada 4 segundos.',
    examplePrompt: 'Primeiro, a maioria faz X. Mas o segredo que ninguém te conta é Y...',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ch-3',
    title: 'CTA Inquebrável para Conversão Direta',
    category: 'Conversão Direta',
    xpReward: 300,
    minLevel: 3,
    description: 'Transforme visualizações em cliques na bio com uma chamada para ação sem atrito.',
    instructions: 'Use escassez genuína e recompensa imediata (download ou aula grátis no link).',
    examplePrompt: 'Comente "ALFA" que eu te envio o modelo pronto no direct agora mesmo.',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ch-4',
    title: 'Criação de Anúncio VSL Ultra-Segmentado',
    category: 'Anúncios',
    xpReward: 500,
    minLevel: 4,
    description: 'Estruturação completa de anúncio em vídeo para público frio com alta intenção de compra.',
    instructions: 'Conecte o problema urgência, prova social rápida e a solução inovadora do seu produto.',
    examplePrompt: 'Se você vende infoprodutos e sua taxa de conversão está caindo, este é o novo modelo...',
    active: true,
    createdAt: new Date().toISOString(),
  },
];

export const MentorChallenges: React.FC<MentorChallengesProps> = ({ studentCode }) => {
  const [challenges, setChallenges] = useState<ChallengeItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');

  // Modal States
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingChallenge, setEditingChallenge] = useState<ChallengeItem | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Hooks Virais');
  const [formXp, setFormXp] = useState<number>(150);
  const [formMinLevel, setFormMinLevel] = useState<number>(1);
  const [formDescription, setFormDescription] = useState<string>('');
  const [formInstructions, setFormInstructions] = useState<string>('');
  const [formExamplePrompt, setFormExamplePrompt] = useState<string>('');
  const [formActive, setFormActive] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const categories = ['Todos', 'Hooks Virais', 'Retenção TikTok', 'Conversão Direta', 'Anúncios', 'Copywriting'];

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadChallenges = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/challenges', {
        headers: {
          'x-access-code': studentCode,
          'x-student-access-code': studentCode,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.challenges) && data.challenges.length > 0) {
          setChallenges(data.challenges);
          setLoading(false);
          return;
        }
      }

      // Local fallback from storage or defaults
      const saved = localStorage.getItem('mentor_custom_challenges');
      if (saved) {
        try {
          setChallenges(JSON.parse(saved));
        } catch {
          setChallenges(DEFAULT_CHALLENGES);
        }
      } else {
        setChallenges(DEFAULT_CHALLENGES);
      }
    } catch {
      setChallenges(DEFAULT_CHALLENGES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallenges();
  }, [studentCode]);

  const saveToStorageAndServer = async (updatedList: ChallengeItem[]) => {
    setChallenges(updatedList);
    localStorage.setItem('mentor_custom_challenges', JSON.stringify(updatedList));

    try {
      await fetch('/api/admin/challenges/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
        },
        body: JSON.stringify({ challenges: updatedList }),
      });
    } catch {
      // Best-effort server save
    }
  };

  const handleOpenCreate = () => {
    setEditingChallenge(null);
    setFormTitle('');
    setFormCategory('Hooks Virais');
    setFormXp(150);
    setFormMinLevel(1);
    setFormDescription('');
    setFormInstructions('');
    setFormExamplePrompt('');
    setFormActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (ch: ChallengeItem) => {
    setEditingChallenge(ch);
    setFormTitle(ch.title);
    setFormCategory(ch.category);
    setFormXp(ch.xpReward);
    setFormMinLevel(ch.minLevel);
    setFormDescription(ch.description);
    setFormInstructions(ch.instructions);
    setFormExamplePrompt(ch.examplePrompt || '');
    setFormActive(ch.active);
    setShowModal(true);
  };

  const handleSaveChallenge = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim() || !formDescription.trim()) {
      triggerToast('Preencha os campos obrigatórios do desafio.');
      return;
    }

    let updated: ChallengeItem[];

    if (editingChallenge) {
      updated = challenges.map((item) =>
        item.id === editingChallenge.id
          ? {
              ...item,
              title: formTitle.trim(),
              category: formCategory,
              xpReward: formXp,
              minLevel: formMinLevel,
              description: formDescription.trim(),
              instructions: formInstructions.trim(),
              examplePrompt: formExamplePrompt.trim(),
              active: formActive,
            }
          : item
      );
      triggerToast(`Desafio "${formTitle}" atualizado com sucesso!`);
    } else {
      const newItem: ChallengeItem = {
        id: `ch-${Date.now()}`,
        title: formTitle.trim(),
        category: formCategory,
        xpReward: formXp,
        minLevel: formMinLevel,
        description: formDescription.trim(),
        instructions: formInstructions.trim(),
        examplePrompt: formExamplePrompt.trim(),
        active: formActive,
        createdAt: new Date().toISOString(),
      };
      updated = [newItem, ...challenges];
      triggerToast(`Novo desafio "${formTitle}" criado com sucesso!`);
    }

    saveToStorageAndServer(updated);
    setShowModal(false);
  };

  const handleToggleActive = (id: string) => {
    const updated = challenges.map((ch) =>
      ch.id === id ? { ...ch, active: !ch.active } : ch
    );
    saveToStorageAndServer(updated);
    triggerToast('Status do desafio alterado.');
  };

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o desafio "${title}"?`)) {
      const updated = challenges.filter((ch) => ch.id !== id);
      saveToStorageAndServer(updated);
      triggerToast('Desafio removido.');
    }
  };

  const filteredChallenges = challenges.filter((ch) => {
    const matchesCategory = categoryFilter === 'Todos' || ch.category === categoryFilter;
    const matchesSearch =
      ch.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ch.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0a192f] via-[#091322] to-[#040d1a] border border-cyan-500/40 shadow-2xl text-white space-y-6">
      
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2 bg-emerald-900/90 text-emerald-200 border border-emerald-500/50 px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 text-[10px] font-black uppercase tracking-wider">
              <Shield className="w-3 h-3 text-amber-400" />
              <span>PAINEL DO MENTOR • EXCLUSIVO</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight mt-0.5">
              Gestão da Academia de Desafios & Ganchos Virais
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadChallenges}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center space-x-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Criar Novo Desafio</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título ou descrição do desafio..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 text-xs font-semibold focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Challenges List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredChallenges.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-xs space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="font-semibold">Nenhum desafio encontrado para este filtro.</p>
          </div>
        ) : (
          filteredChallenges.map((ch) => (
            <div
              key={ch.id}
              className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-4 ${
                ch.active
                  ? 'bg-[#031d2e]/80 border-cyan-500/30 hover:border-cyan-400/60'
                  : 'bg-[#020d14]/50 border-slate-800 opacity-60'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/30 flex items-center space-x-1">
                    <Tag className="w-3 h-3 text-amber-400" />
                    <span>{ch.category}</span>
                  </span>

                  <div className="flex items-center space-x-2">
                    <span
                      onClick={() => handleToggleActive(ch.id)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all border ${
                        ch.active
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                      }`}
                      title="Clique para alternar status do desafio"
                    >
                      {ch.active ? '● Ativo' : '○ Inativo'}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white tracking-tight">
                  {ch.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {ch.description}
                </p>

                {ch.instructions && (
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <span className="font-bold text-cyan-300">Instruções para o Aluno:</span>
                    <p className="leading-snug">{ch.instructions}</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center space-x-1 text-amber-400 font-black">
                    <Flame className="w-3.5 h-3.5" />
                    <span>+{ch.xpReward} XP</span>
                  </span>
                  <span className="flex items-center space-x-1 text-indigo-300 font-semibold text-[11px]">
                    <Award className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Nível Mínimo: {ch.minLevel}</span>
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenEdit(ch)}
                    className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
                    title="Editar desafio"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(ch.id, ch.title)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all cursor-pointer"
                    title="Excluir desafio"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Create/Edit Challenge */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#031926] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">
                  {editingChallenge ? 'Editar Desafio' : 'Criar Novo Desafio Viral'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveChallenge} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Título do Desafio *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: O Gancho Hipnótico de 3 Segundos"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Categoria</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Hooks Virais">Hooks Virais</option>
                    <option value="Retenção TikTok">Retenção TikTok</option>
                    <option value="Conversão Direta">Conversão Direta</option>
                    <option value="Anúncios">Anúncios</option>
                    <option value="Copywriting">Copywriting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Recompensa (XP)</label>
                  <input
                    type="number"
                    min={50}
                    step={25}
                    value={formXp}
                    onChange={(e) => setFormXp(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nível Mínimo</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formMinLevel}
                    onChange={(e) => setFormMinLevel(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Descrição do Desafio *</label>
                <textarea
                  required
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Resumo do desafio que aparecerá no card para os alunos..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Instruções para o Aluno</label>
                <textarea
                  rows={2}
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="Passo a passo ou orientações práticas..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Exemplo ou Prompt Modelo</label>
                <input
                  type="text"
                  value={formExamplePrompt}
                  onChange={(e) => setFormExamplePrompt(e.target.value)}
                  placeholder="Exemplo pronto de cópia ou script..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="formActiveCheck"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="formActiveCheck" className="text-xs font-semibold text-slate-300 cursor-pointer">
                  Publicar desafio como ATIVO na plataforma
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs cursor-pointer"
                >
                  {editingChallenge ? 'Salvar Alterações' : 'Criar Desafio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
