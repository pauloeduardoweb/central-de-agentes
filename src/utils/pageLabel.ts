import { Agent } from '../types';

interface PageLabelParams {
  activeView: 'hub' | 'mentor' | 'chat' | 'miner';
  selectedChatAgent: Agent | null;
  showGeracaoZProModal: boolean;
  showCertificadosModal: boolean;
  showAfiliadosModal: boolean;
  showCreateModal: boolean;
  editingAgent: Agent | null;
  showImportModal: boolean;
  showMultiAgentModal: boolean;
  showExportModal: boolean;
  showApiKeyModal: boolean;
  activeCategory: string;
  mentorTab?: string;
}

function normalizeCategoryKey(rawCategory: string): string {
  if (!rawCategory) return '';
  return rawCategory
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[-_]/g, ' ')           // normalize hyphens/underscores to spaces
    .replace(/\s+/g, ' ')            // normalize duplicate spaces
    .trim();
}

export function getCurrentPageLabel({
  activeView,
  selectedChatAgent,
  showGeracaoZProModal,
  showCertificadosModal,
  showAfiliadosModal,
  showCreateModal,
  editingAgent,
  showImportModal,
  showMultiAgentModal,
  showExportModal,
  showApiKeyModal,
  activeCategory,
  mentorTab,
}: PageLabelParams): string {
  // 1. Specific Agent Chat Modal open -> Agent Name
  if (selectedChatAgent) {
    return selectedChatAgent.name || 'Dashboard';
  }

  // 2. Modals open
  if (showGeracaoZProModal) return 'Recurso Anti-Violação';
  if (showCertificadosModal) return 'Certificados';
  if (showAfiliadosModal) return 'Programa de Afiliados';
  if (showMultiAgentModal) return 'Flow Ultra';
  if (showCreateModal || editingAgent) return 'Criar / Editar Agente';
  if (showImportModal) return 'Importar ChatGPT';
  if (showExportModal) return 'Exportar / Backup';
  if (showApiKeyModal) return 'Acesso do Aluno';

  if (activeView === 'chat') return 'Bate-papo';
  if (activeView === 'miner') return 'Minerar Produtos';

  // 3. Mentor View tabs
  if (activeView === 'mentor') {
    if (mentorTab === 'products') return 'Biblioteca de Produtos';
    if (mentorTab === 'challenges') return 'Criar Desafios';
    if (mentorTab === 'students') return 'Alunos';
    if (mentorTab === 'codes') return 'Códigos de Acesso';
    if (mentorTab === 'sessions') return 'Sessões Ativas & Membros';
    if (mentorTab === 'stats') return 'Estatísticas';
    return 'Dashboard';
  }

  // 4. Hub Categories & Menus with explicit normalized mapping
  const normalizedKey = normalizeCategoryKey(activeCategory);

  if (normalizedKey === 'tiktok 2k' || normalizedKey === 'tiktok2k') return 'TikTok 2K';
  if (normalizedKey === 'tiktok shop' || normalizedKey === 'tiktokshop') return 'TikTok Shop';
  if (
    normalizedKey === 'recurso anti violacao' ||
    normalizedKey === 'anti violacao' ||
    normalizedKey === 'recurso anti violacao geracao z pro'
  ) {
    return 'Recurso Anti-Violação';
  }
  if (normalizedKey === 'suporte') return 'Suporte';
  if (normalizedKey === 'grupo de network' || normalizedKey === 'network') return 'Grupo de Network';
  if (normalizedKey === 'flow ultra' || normalizedKey === 'flowultra') return 'Flow Ultra';
  if (normalizedKey === 'academia de desafios' || normalizedKey === 'desafios') return 'Academia de Desafios';
  if (normalizedKey === 'prompts de movimentos' || normalizedKey === 'movimentos') return 'Prompts de Movimentos';

  // If activeCategory is 'todos', 'all', or empty/unrecognized, fallback to 'Dashboard'
  if (!activeCategory || normalizedKey === 'todos' || normalizedKey === 'all') {
    return 'Dashboard';
  }

  return activeCategory;
}

