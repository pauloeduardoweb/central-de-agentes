import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { StatsBar } from './components/StatsBar';
import { GeracaoZProBanner } from './components/GeracaoZProBanner';
import { GeracaoZProModal } from './components/GeracaoZProModal';
import { CertificadosModal } from './components/CertificadosModal';
import { AfiliadosModal } from './components/AfiliadosModal';
import { AgentGrid } from './components/AgentGrid';
import { AgentChatModal } from './components/AgentChatModal';
import { AgentEditorModal } from './components/AgentEditorModal';
import { ChatGPTImportModal } from './components/ChatGPTImportModal';
import { MultiAgentModal } from './components/MultiAgentModal';
import { ExportModal } from './components/ExportModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { TechGridBackground } from './components/TechGridBackground';
import { Agent } from './types';
import { getStoredAgents, saveAgents, resetAgentsToDefault } from './utils/storage';
import { getDeviceId, unbindCurrentDevice } from './utils/deviceId';
import { isValidStudentCode } from './data/studentCodes';
import { Check } from 'lucide-react';

export default function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('Tiktok 2K');
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [studentCode, setStudentCode] = useState<string>(() => {
    return localStorage.getItem('user_student_access_code') || '';
  });
  const [sessionId, setSessionId] = useState<string>(() => {
    return localStorage.getItem('user_session_id') || '';
  });
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Modal controls
  const [selectedChatAgent, setSelectedChatAgent] = useState<Agent | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showMultiAgentModal, setShowMultiAgentModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showGeracaoZProModal, setShowGeracaoZProModal] = useState(false);
  const [showCertificadosModal, setShowCertificadosModal] = useState(false);
  const [showAfiliadosModal, setShowAfiliadosModal] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const loaded = getStoredAgents();
    setAgents(loaded);

    const savedCode = localStorage.getItem('user_student_access_code') || '';
    const savedKey = localStorage.getItem('user_gemini_api_key') || '';
    const savedSessionId = localStorage.getItem('user_session_id') || '';

    if (savedCode && isValidStudentCode(savedCode)) {
      setUserApiKey(savedKey || 'STUDENT_AUTHORIZED');
      setStudentCode(savedCode);
      setSessionId(savedSessionId);
      setShowApiKeyModal(false);

      // Verify active session with server on load
      const deviceId = getDeviceId();
      fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-device-id': deviceId,
          'x-session-id': savedSessionId,
        },
        body: JSON.stringify({ accessCode: savedCode, deviceId, sessionId: savedSessionId }),
      })
        .then(async (res) => {
          let data: any = {};
          try {
            data = await res.json();
          } catch (e) {}

          if (!res.ok && (res.status === 409 || res.status === 403 || res.status === 401)) {
            // Code is active on another device or session revoked
            localStorage.removeItem('user_student_access_code');
            localStorage.removeItem('user_session_id');
            localStorage.removeItem('user_gemini_api_key');
            setUserApiKey('');
            setStudentCode('');
            setSessionId('');
            setShowApiKeyModal(true);
            if (data.message || data.error) triggerToast(data.message || data.error);
          } else if (res.ok && data.sessionId) {
            localStorage.setItem('user_session_id', data.sessionId);
            setSessionId(data.sessionId);
          }
        })
        .catch(() => {});
    } else {
      setUserApiKey('');
      setStudentCode('');
      setSessionId('');
      setShowApiKeyModal(true);
    }
  }, []);

  // Heartbeat loop every 30 seconds
  useEffect(() => {
    if (!studentCode || !sessionId) return;

    const sendHeartbeat = async () => {
      try {
        const deviceId = getDeviceId();
        const res = await fetch('/api/session/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-student-access-code': studentCode,
            'x-session-id': sessionId,
            'x-client-device-id': deviceId,
          },
          body: JSON.stringify({
            studentAccessCode: studentCode,
            sessionId: sessionId,
            deviceId,
          }),
        });

        if (!res.ok && (res.status === 401 || res.status === 409)) {
          let data: any = {};
          try {
            data = await res.json();
          } catch (e) {}

          localStorage.removeItem('user_student_access_code');
          localStorage.removeItem('user_session_id');
          localStorage.removeItem('user_gemini_api_key');
          setUserApiKey('');
          setStudentCode('');
          setSessionId('');
          setShowApiKeyModal(true);
          triggerToast(data.message || data.error || 'Esta chave já está sendo utilizada em outro dispositivo. Sua sessão foi encerrada.');
        }
      } catch (err) {
        console.warn('[Heartbeat] Network check error:', err);
      }
    };

    const interval = setInterval(sendHeartbeat, 30000); // 30s
    return () => clearInterval(interval);
  }, [studentCode, sessionId]);

  // Page unload beacon (sendBeacon)
  useEffect(() => {
    const handleUnload = () => {
      if (studentCode && sessionId) {
        const payload = JSON.stringify({
          studentAccessCode: studentCode,
          sessionId: sessionId,
          deviceId: getDeviceId(),
        });
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/logout', blob);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, [studentCode, sessionId]);

  const handleSaveApiKey = (key: string, accessCode: string, newSessionId?: string) => {
    localStorage.setItem('user_gemini_api_key', key);
    localStorage.setItem('user_student_access_code', accessCode);
    if (newSessionId) {
      localStorage.setItem('user_session_id', newSessionId);
      setSessionId(newSessionId);
    }
    setUserApiKey(key);
    setStudentCode(accessCode);
    setShowApiKeyModal(false);
    triggerToast('Acesso do Aluno ativado com sucesso!');
  };

  const handleDisconnectApiKey = async () => {
    await unbindCurrentDevice();
    localStorage.removeItem('user_gemini_api_key');
    localStorage.removeItem('user_student_access_code');
    localStorage.removeItem('user_session_id');
    setUserApiKey('');
    setStudentCode('');
    setSessionId('');
    setShowApiKeyModal(true);
    triggerToast('Código de acesso removido do navegador.');
  };


  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const updateAgentsList = (newAgents: Agent[]) => {
    setAgents(newAgents);
    saveAgents(newAgents);
  };

  const handleOpenOfficialAgent = () => {
    const official = agents.find((a) => a.id === 'agent-geracaozpro-oficial') || agents[0];
    if (official) {
      setSelectedChatAgent(official);
    }
  };

  const handleToggleFavorite = (id: string) => {
    const updated = agents.map((a) => (a.id === id ? { ...a, isFavorite: !a.isFavorite } : a));
    updateAgentsList(updated);
  };

  const handleIncrementUsage = (agentId: string) => {
    const updated = agents.map((a) =>
      a.id === agentId
        ? { ...a, usageCount: (a.usageCount || 0) + 1, lastUsedAt: new Date().toISOString() }
        : a
    );
    updateAgentsList(updated);
  };

  const handleSaveAgent = (agentData: Partial<Agent>) => {
    if (editingAgent) {
      // Edit existing
      const updated = agents.map((a) => (a.id === editingAgent.id ? ({ ...a, ...agentData } as Agent) : a));
      updateAgentsList(updated);
      triggerToast(`Agente "${agentData.name}" atualizado com sucesso!`);
    } else {
      // Create new
      const newAgent: Agent = {
        id: `agent-custom-${Date.now()}`,
        name: agentData.name || 'Novo Agente GPT',
        tagline: agentData.tagline || 'Custom GPT',
        description: agentData.description || '',
        category: agentData.category || 'Tiktok 2K',
        iconName: agentData.iconName || 'Bot',
        colorTheme: agentData.colorTheme || 'indigo',
        systemInstruction: agentData.systemInstruction || 'Você é...',
        conversationStarters: agentData.conversationStarters || ['Olá!'],
        capabilities: agentData.capabilities || { codeInterpreter: true, webSearch: true, imageGeneration: false, jsonOutput: false },
        temperature: agentData.temperature || 0.7,
        isFavorite: false,
        isCustom: true,
        usageCount: 0,
        createdAt: new Date().toISOString(),
      };
      updateAgentsList([newAgent, ...agents]);
      triggerToast(`Novo Agente "${newAgent.name}" criado com sucesso!`);
    }

    setEditingAgent(null);
    setShowCreateModal(false);
  };

  const handleDuplicateAgent = (agent: Agent) => {
    const duplicated: Agent = {
      ...agent,
      id: `agent-copy-${Date.now()}`,
      name: `${agent.name} (Cópia)`,
      isCustom: true,
      usageCount: 0,
      createdAt: new Date().toISOString(),
    };
    updateAgentsList([duplicated, ...agents]);
    triggerToast(`Agente "${agent.name}" duplicado!`);
  };

  const handleDeleteAgent = (id: string) => {
    const target = agents.find((a) => a.id === id);
    if (window.confirm(`Tem certeza de que deseja excluir o agente "${target?.name}"?`)) {
      const updated = agents.filter((a) => a.id !== id);
      updateAgentsList(updated);
      triggerToast('Agente removido.');
    }
  };

  const handleCopyPrompt = (agent: Agent) => {
    const textToCopy = `[PROMPT DO CUSTOM GPT - ${agent.name}]
Tagline: ${agent.tagline}
Instruções de Sistema:
${agent.systemInstruction}

Perguntas Iniciais Recomendadas:
${agent.conversationStarters.map((s) => `- ${s}`).join('\n')}`;

    navigator.clipboard.writeText(textToCopy);
    triggerToast(`Prompt do agente "${agent.name}" copiado para a área de transferência!`);
  };

  const handleImportAgentFromChatGPT = (importedData: Partial<Agent>) => {
    const newAgent: Agent = {
      id: `agent-import-${Date.now()}`,
      name: importedData.name || 'GPT Importado',
      tagline: importedData.tagline || 'Custom GPT Importado',
      description: importedData.description || 'Agente importado a partir do ChatGPT',
      category: importedData.category || 'Tiktok 2K',
      iconName: importedData.iconName || 'Bot',
      colorTheme: importedData.colorTheme || 'emerald',
      systemInstruction: importedData.systemInstruction || 'Você é um assistente...',
      conversationStarters: importedData.conversationStarters || ['Como você pode me ajudar?'],
      capabilities: importedData.capabilities || { codeInterpreter: true, webSearch: true, imageGeneration: false, jsonOutput: false },
      temperature: importedData.temperature || 0.7,
      isFavorite: false,
      isCustom: true,
      usageCount: 0,
      createdAt: new Date().toISOString(),
    };

    updateAgentsList([newAgent, ...agents]);
    triggerToast(`Agente "${newAgent.name}" importado com sucesso!`);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Deseja restaurar a lista padrão de agentes? Isso não removerá seus agentes personalizados.')) {
      const restored = resetAgentsToDefault();
      setAgents(restored);
      triggerToast('Agentes restaurados para o padrão.');
    }
  };

  return (
    <div className="min-h-screen bg-[#03131c] text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white pb-20 relative overflow-x-hidden">
      <TechGridBackground />

      <div className="relative z-10">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2 bg-slate-900 text-white dark:bg-emerald-600 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <Check className="w-4 h-4 text-emerald-400 dark:text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        onOpenCreate={() => {
          setEditingAgent(null);
          setShowCreateModal(true);
        }}
        onOpenImport={() => setShowImportModal(true)}
        onOpenMultiAgent={() => setShowMultiAgentModal(true)}
        onOpenExport={() => setShowExportModal(true)}
        onResetDefaults={handleResetDefaults}
        onOpenApiKeyModal={() => setShowApiKeyModal(true)}
        onDisconnectApiKey={handleDisconnectApiKey}
        hasApiKey={Boolean(userApiKey)}
        studentCode={studentCode}
        agentCount={agents.filter((a) => a.category !== 'Suporte').length}
      />

      {/* Container */}
      <main className={`max-w-7xl mx-auto px-4 lg:px-8 pt-6 transition-all duration-300 ${!userApiKey ? 'filter blur-lg opacity-20 pointer-events-none select-none' : ''}`}>
        
        {/* Banner Oficial Geração Z Pro */}
        <GeracaoZProBanner />

        {/* Metric Stats Banner - 8 Card Unified Menu */}
        <StatsBar
          agents={agents}
          activeCategory={activeCategory}
          onOpenOfficialAgent={handleOpenOfficialAgent}
          onOpenAfiliados={() => setShowAfiliadosModal(true)}
          onOpenSiteModal={() => setShowGeracaoZProModal(true)}
          onOpenCertificados={() => setShowCertificadosModal(true)}
        />

        {/* Grid and Search */}
        <AgentGrid
          agents={agents}
          onSelectChat={(agent) => setSelectedChatAgent(agent)}
          onToggleFavorite={handleToggleFavorite}
          onEdit={(agent) => {
            setEditingAgent(agent);
            setShowCreateModal(true);
          }}
          onDuplicate={handleDuplicateAgent}
          onDelete={handleDeleteAgent}
          onCopyPrompt={handleCopyPrompt}
          onOpenCreate={() => {
            setEditingAgent(null);
            setShowCreateModal(true);
          }}
        />

      </main>

      {/* Modals */}
      {showGeracaoZProModal && (
        <GeracaoZProModal
          onClose={() => setShowGeracaoZProModal(false)}
          onOpenOfficialAgent={handleOpenOfficialAgent}
        />
      )}

      {showCertificadosModal && (
        <CertificadosModal
          onClose={() => setShowCertificadosModal(false)}
        />
      )}

      {showAfiliadosModal && (
        <AfiliadosModal
          onClose={() => setShowAfiliadosModal(false)}
        />
      )}

      {selectedChatAgent && (
        <AgentChatModal
          agent={selectedChatAgent}
          onClose={() => setSelectedChatAgent(null)}
          onIncrementUsage={handleIncrementUsage}
        />
      )}

      {(showCreateModal || editingAgent) && (
        <AgentEditorModal
          initialAgent={editingAgent}
          onSave={handleSaveAgent}
          onClose={() => {
            setShowCreateModal(false);
            setEditingAgent(null);
          }}
        />
      )}

      {showImportModal && (
        <ChatGPTImportModal
          onImport={handleImportAgentFromChatGPT}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {showMultiAgentModal && (
        <MultiAgentModal
          agents={agents}
          onClose={() => setShowMultiAgentModal(false)}
        />
      )}

      {showExportModal && (
        <ExportModal
          agents={agents}
          onImportBackup={(imported) => {
            updateAgentsList(imported);
            triggerToast('Backup restaurado com sucesso!');
          }}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showApiKeyModal && (
        <ApiKeyModal
          isMandatoryOnboarding={!userApiKey}
          onSave={handleSaveApiKey}
          onClose={() => setShowApiKeyModal(false)}
        />
      )}

      </div>
    </div>
  );
}

