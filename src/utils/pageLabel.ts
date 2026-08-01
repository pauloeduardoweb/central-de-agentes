import { Agent } from '../types';

interface PageLabelParams {
  activeView: 'hub' | 'mentor';
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
    return selectedChatAgent.name || 'Agente GPT';
  }

  // 2. Modals open
  if (showGeracaoZProModal) return 'Recurso Anti-Violação';
  if (showCertificadosModal) return 'Certificados';
  if (showAfiliadosModal) return 'Biblioteca de Produtos';
  if (showMultiAgentModal) return 'Flow Ultra';
  if (showCreateModal || editingAgent) return 'Criar / Editar Agente';
  if (showImportModal) return 'Importar ChatGPT';
  if (showExportModal) return 'Exportar / Backup';
  if (showApiKeyModal) return 'Acesso do Aluno';

  // 3. Mentor View tabs
  if (activeView === 'mentor') {
    if (mentorTab === 'products') return 'Biblioteca de Produtos';
    if (mentorTab === 'challenges') return 'Criar Desafios';
    if (mentorTab === 'students') return 'Alunos';
    if (mentorTab === 'codes') return 'Códigos de Acesso';
    if (mentorTab === 'sessions') return 'Monitoramento Online';
    if (mentorTab === 'stats') return 'Estatísticas';
    return 'Painel do Mentor';
  }

  // 4. Hub Categories & Menus
  if (activeCategory === 'Tiktok 2K' || activeCategory === 'TikTok 2K') return 'TikTok 2K';
  if (activeCategory === 'Tiktok Shop' || activeCategory === 'TikTok Shop') return 'TikTok Shop';
  if (activeCategory === 'Recurso Anti-Violação') return 'Recurso Anti-Violação';
  if (activeCategory === 'Suporte') return 'Suporte';
  if (activeCategory === 'Grupo de Network') return 'Grupo de Network';
  if (activeCategory === 'Flow Ultra') return 'Flow Ultra';
  if (activeCategory === 'Academia de Desafios') return 'Academia de Desafios';
  if (activeCategory === 'Prompts de Movimentos') return 'Prompts de Movimentos';

  return activeCategory || 'TikTok 2K';
}
