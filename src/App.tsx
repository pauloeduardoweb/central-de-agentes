import React, { useState, useEffect, useMemo } from 'react';
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
import { MentorPanel } from './components/mentor/MentorPanel';
import { ChatPage } from './components/chat/ChatPage';
import { TechGridBackground } from './components/TechGridBackground';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ProductMinerPage } from './components/miner/ProductMinerPage';
import { getProductMinerAccess } from './services/productMinerApi';
import { Agent } from './types';
import { getStoredAgents, saveAgents, resetAgentsToDefault } from './utils/storage';
import { getDeviceId, unbindCurrentDevice } from './utils/deviceId';
import { isValidStudentCode, isMasterKey, normalizeAccessCode } from './data/studentCodes';
import { useFavorites } from './hooks/useFavorites';
import { getCurrentPageLabel } from './utils/pageLabel';
import { Check } from 'lucide-react';

export default function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('Tiktok 2K');
  const [mentorTab, setMentorTab] = useState<string>('challenges');
  const [userApiKey, setUserApiKey] = useState<string>('');
  const [studentCode, setStudentCode] = useState<string>(() => {
    return localStorage.getItem('user_student_access_code') || '';
  });
  const [sessionId, setSessionId] = useState<string>(() => {
    return localStorage.getItem('user_session_id') || '';
  });
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [activeView, setActiveView] = useState<'hub' | 'mentor' | 'chat' | 'miner'>('hub');
  const [productMinerAccess, setProductMinerAccess] = useState<{ enabled: boolean; canRefresh: boolean }>({ enabled: false, canRefresh: false });
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return typeof window !== 'undefined' ? window.location.pathname : '/';
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        setCurrentPath(window.location.pathname);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isMaster = isMasterKey(studentCode);
  const canAccessProductMiner = isMaster || productMinerAccess.enabled;
  const canRefreshProductMiner = isMaster || productMinerAccess.canRefresh;

  useEffect(() => {
    let cancelled = false;
    if (!studentCode) {
      setProductMinerAccess({ enabled: false, canRefresh: false });
      return;
    }
    if (isMaster) {
      setProductMinerAccess({ enabled: true, canRefresh: true });
      return;
    }
    getProductMinerAccess(studentCode)
      .then((access) => {
        if (!cancelled) setProductMinerAccess({ enabled: access.enabled, canRefresh: access.canRefresh });
      })
      .catch(() => {
        if (!cancelled) setProductMinerAccess({ enabled: false, canRefresh: false });
      });
    return () => { cancelled = true; };
  }, [studentCode, isMaster]);

  useEffect(() => {
    if (activeView === 'miner' && !canAccessProductMiner) {
      setActiveView('hub');
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/miner')) {
        window.history.replaceState({}, '', '/');
      }
      setCurrentPath('/');
      triggerToast('Este recurso não está habilitado para sua conta.');
    }
  }, [activeView, canAccessProductMiner]);

  const handleSelectView = (view: 'hub' | 'mentor' | 'chat' | 'miner') => {
    if (view === 'miner' && !canAccessProductMiner) {
      setActiveView('hub');
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/miner')) {
        window.history.replaceState({}, '', '/');
      }
      setCurrentPath('/');
      triggerToast('Este recurso não está habilitado para sua conta.');
      return;
    }

    if (view === 'mentor' && !isMaster) {
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/mentor')) {
        window.history.replaceState({}, '', '/');
      }
      setCurrentPath('/');
      setActiveView('hub');
      return;
    }

    if (view === 'hub') {
      if (typeof window !== 'undefined' && (window.location.pathname.startsWith('/mentor') || window.location.pathname.startsWith('/miner'))) {
        window.history.pushState({}, '', '/');
      }
      setCurrentPath('/');
      setActiveView('hub');
    } else if (view === 'mentor') {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/mentor')) {
        window.history.pushState({}, '', '/mentor');
      }
      setCurrentPath('/mentor');
      setActiveView('mentor');
    } else if (view === 'chat') {
      if (typeof window !== 'undefined' && (window.location.pathname.startsWith('/mentor') || window.location.pathname.startsWith('/miner'))) {
        window.history.pushState({}, '', '/');
        setCurrentPath('/');
      }
      setActiveView('chat');
    } else if (view === 'miner') {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/miner')) {
        window.history.pushState({}, '', '/miner');
        setCurrentPath('/miner');
      }
      setActiveView('miner');
    }
  };

  useEffect(() => {
    if (currentPath.startsWith('/miner')) {
      if (canAccessProductMiner) {
        setActiveView('miner');
      } else {
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/miner')) {
          window.history.replaceState({}, '', '/');
        }
        setCurrentPath('/');
        setActiveView('hub');
        triggerToast('Este recurso não está habilitado para sua conta.');
      }
    } else if (currentPath.startsWith('/mentor')) {
      if (isMaster) {
        setActiveView('mentor');
        if (currentPath.startsWith('/mentor/integracoes/tiktok')) {
          setMentorTab('tiktok');
        } else if (mentorTab === 'tiktok') {
          setMentorTab('challenges');
        }
      } else {
        // Redirect non-master keys away from /mentor URLs to Central de Agentes
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/mentor')) {
          window.history.replaceState({}, '', '/');
        }
        setCurrentPath('/');
        setActiveView('hub');
      }
    } else {
      if (activeView === 'mentor') {
        setActiveView('hub');
      }
    }
  }, [currentPath, isMaster, canAccessProductMiner]);

  const userIdentifier = studentCode
    ? (isMaster ? 'MASTER' : normalizeAccessCode(studentCode))
    : '';

  const { favoriteAgentIds, toggleFavorite: toggleUserFavorite } = useFavorites(userIdentifier);

  const displayAgents = useMemo(() => {
    return agents.map((agent) => ({
      ...agent,
      isFavorite: favoriteAgentIds.includes(agent.id),
    }));
  }, [agents, favoriteAgentIds]);

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

  // Lock body scroll when in chat view to prevent external scrollbar on mobile
  useEffect(() => {
    if (activeView === 'chat') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeView]);

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
          // Ignore server errors or non-ok statuses that are not explicit revocations
          if (res.status >= 500) {
            console.warn('[Startup Verify] Server temporary response ignored:', res.status);
            return;
          }

          let data: any = {};
          try {
            data = await res.json();
          } catch {
            // Non-JSON or proxy response -> keep stored session
            return;
          }

          const errCode = String(data?.error || data?.code || data?.accessStatus || '').toUpperCase();

          const isSuspended = res.status === 423 || errCode === 'KEY_SUSPENDED' || errCode === 'SUSPENDED';
          const isBanned = res.status === 403 || errCode === 'KEY_BANNED' || errCode === 'BANNED';
          const isInvalidCode = res.status === 401 && errCode === 'INVALID_ACCESS_CODE';
          const isExplicitRevocation = res.status === 401 && (
            errCode === 'ADMIN_DISCONNECTED' ||
            errCode === 'SESSION_EXPIRED'
          );

          if (isSuspended || isBanned || isInvalidCode || isExplicitRevocation) {
            try {
              localStorage.clear();
              sessionStorage.clear();
            } catch (e) {
              localStorage.removeItem('user_student_access_code');
              localStorage.removeItem('user_session_id');
              localStorage.removeItem('user_gemini_api_key');
            }
            setSelectedChatAgent(null);
            setEditingAgent(null);
            setShowCreateModal(false);
            setShowImportModal(false);
            setShowMultiAgentModal(false);
            setShowExportModal(false);
            setShowGeracaoZProModal(false);
            setShowCertificadosModal(false);
            setShowAfiliadosModal(false);
            setUserApiKey('');
            setStudentCode('');
            setSessionId('');
            setShowApiKeyModal(true);

            let toastMsg = data.message;
            if (isSuspended) {
              toastMsg = 'Acesso temporariamente suspenso pelo Mentor.';
            } else if (isBanned) {
              toastMsg = 'Acesso permanentemente bloqueado pelo Mentor.';
            } else if (isInvalidCode) {
              toastMsg = 'Código de acesso inválido. Verifique o código informado e tente novamente.';
            }
            if (toastMsg) triggerToast(toastMsg);
          } else if (res.ok && data.sessionId) {
            localStorage.setItem('user_session_id', data.sessionId);
            setSessionId(data.sessionId);
          }
        })
        .catch((err) => {
          console.warn('[Startup Verify] Network error ignored (keeping session intact):', err);
        });
    } else {
      setUserApiKey('');
      setStudentCode('');
      setSessionId('');
      setShowApiKeyModal(true);
    }
  }, []);

  // Dynamic Real Page Identifier
  const currentPageLabel = useMemo(() => {
    const label = getCurrentPageLabel({
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
    });

    console.log('[CURRENT PAGE STATE]', {
      pathname: typeof window !== 'undefined' ? window.location.pathname : '/',
      activeCategory,
      selectedAgent: selectedChatAgent?.name || null,
      currentPageLabel: label,
    });

    return label;
  }, [
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
  ]);

  // Heartbeat loop every 30 seconds & immediate presence update on page transition
  useEffect(() => {
    if (!studentCode || !sessionId) return;

    let isSending = false;

    const sendHeartbeat = async () => {
      if (document.visibilityState === 'hidden') return;
      if (isSending) return;
      isSending = true;

      try {
        const deviceId = getDeviceId();
        console.log('[HEARTBEAT CURRENT PAGE]', currentPageLabel);

        const res = await fetch('/api/presence/heartbeat', {
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
            currentPage: currentPageLabel,
            currentAction: selectedChatAgent ? 'Conversando com agente' : 'Visualizando',
            currentAgentId: selectedChatAgent?.id || null,
            currentAgentName: selectedChatAgent?.name || null,
            agentCategory: selectedChatAgent?.category || activeCategory || null,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          }),
        });

        // 500, 502, 503, 504 server errors -> KEEP SESSION INTACT
        if (res.status >= 500) {
          console.warn('[Heartbeat] Server error ignored:', res.status);
          return;
        }

        if (!res.ok) {
          let data: any = {};
          try {
            data = await res.json();
          } catch {
            // Non-JSON or HTML gateway error -> KEEP SESSION INTACT
            return;
          }

          const errCode = String(data?.error || data?.code || data?.accessStatus || '').toUpperCase();
          const isSuspended = res.status === 423 || errCode === 'KEY_SUSPENDED' || errCode === 'SUSPENDED';
          const isBanned = res.status === 403 || errCode === 'KEY_BANNED' || errCode === 'BANNED';
          const isExplicitRevocation = res.status === 401 && (
            errCode === 'ADMIN_DISCONNECTED' ||
            errCode === 'SESSION_EXPIRED' ||
            errCode === 'INVALID_ACCESS_CODE'
          );

          if (isSuspended || isBanned || isExplicitRevocation) {
            try {
              localStorage.clear();
              sessionStorage.clear();
            } catch (e) {
              localStorage.removeItem('user_student_access_code');
              localStorage.removeItem('user_session_id');
              localStorage.removeItem('user_gemini_api_key');
            }
            setSelectedChatAgent(null);
            setEditingAgent(null);
            setShowCreateModal(false);
            setShowImportModal(false);
            setShowMultiAgentModal(false);
            setShowExportModal(false);
            setShowGeracaoZProModal(false);
            setShowCertificadosModal(false);
            setShowAfiliadosModal(false);
            setUserApiKey('');
            setStudentCode('');
            setSessionId('');
            setShowApiKeyModal(true);

            let msg = data.message || data.error;
            if (isSuspended) {
              msg = 'Acesso temporariamente suspenso pelo Mentor.';
            } else if (isBanned) {
              msg = 'Acesso permanentemente bloqueado pelo Mentor.';
            } else if (!msg) {
              msg = 'Sua sessão foi encerrada.';
            }
            triggerToast(msg);
          } else {
            console.warn('[Heartbeat] Ignored non-fatal response status:', res.status, errCode);
          }
        }
      } catch (err) {
        console.warn('[Heartbeat] Network error ignored (keeping session intact):', err);
      } finally {
        isSending = false;
      }
    };

    // Initial heartbeat immediately when mounted or when currentPageLabel changes
    sendHeartbeat();

    // Re-send heartbeat immediately when tab becomes visible after background pause
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    const interval = setInterval(sendHeartbeat, 30000); // 30 seconds heartbeat

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [studentCode, sessionId, currentPageLabel]);

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
    if (!userIdentifier) {
      triggerToast('Usuário não autenticado.');
      return;
    }
    toggleUserFavorite(id);
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

  if (currentPath === '/termos' || currentPath === '/termos/') {
    return (
      <TermsPage
        onNavigateHome={() => {
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/');
          }
          setCurrentPath('/');
        }}
      />
    );
  }

  if (currentPath === '/privacidade' || currentPath === '/privacidade/') {
    return (
      <PrivacyPage
        onNavigateHome={() => {
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', '/');
          }
          setCurrentPath('/');
        }}
      />
    );
  }

  const isAuthenticated = Boolean(userApiKey && studentCode && sessionId);

  if (!isAuthenticated) {
    return (
      <div className="notranslate min-h-screen bg-[#03131c] text-slate-100 font-sans antialiased flex items-center justify-center p-4 relative overflow-hidden" translate="no">
        <TechGridBackground />

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 flex items-center space-x-2 bg-slate-900 text-white dark:bg-emerald-600 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold animate-in slide-in-from-bottom duration-200">
            <Check className="w-4 h-4 text-emerald-400 dark:text-white" />
            <span>{toastMessage}</span>
          </div>
        )}

        <ApiKeyModal
          isMandatoryOnboarding={true}
          onSave={handleSaveApiKey}
          onClose={() => {}}
        />
      </div>
    );
  }

  return (
    <div className={`notranslate bg-[#03131c] text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white relative overflow-x-hidden ${
      activeView === 'chat' ? 'h-[var(--chat-viewport-height,100dvh)] min-h-[100dvh] overflow-hidden flex flex-col p-0' : 'min-h-screen pb-20'
    }`} translate="no">
      <TechGridBackground />

      <div className={`relative z-10 ${activeView === 'chat' ? 'h-full flex-1 min-h-0 flex flex-col overflow-hidden' : ''}`}>
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
        agentCount={agents.filter((a) => a.category !== 'Suporte' && !a.isCustom).length}
        isMaster={isMaster}
        showProductMiner={canAccessProductMiner}
        activeView={activeView}
        onSelectView={handleSelectView}
      />

      {/* Container */}
      <main className={`transition-all duration-300 ${
        activeView === 'chat'
          ? 'w-full flex-1 min-h-0 overflow-hidden p-0 m-0 max-w-full flex flex-col'
          : 'max-w-7xl mx-auto px-4 lg:px-8 pt-6'
      } ${!userApiKey ? 'filter blur-lg opacity-20 pointer-events-none select-none' : ''}`}>
        
        {activeView === 'chat' ? (
          <ChatPage
            studentCode={studentCode}
            sessionId={sessionId}
            onLogout={handleDisconnectApiKey}
          />
        ) : activeView === 'miner' && canAccessProductMiner ? (
          <ProductMinerPage studentCode={studentCode} canRefresh={canRefreshProductMiner} />
        ) : isMaster && activeView === 'mentor' ? (
          <MentorPanel
            studentCode={studentCode}
            initialTab={currentPath.startsWith('/mentor/integracoes/tiktok') ? 'tiktok' : (mentorTab === 'tiktok' || mentorTab === 'products' ? 'challenges' : mentorTab)}
            onBackToHub={() => handleSelectView('hub')}
            onTabChange={(tab) => {
              setMentorTab(tab);
              if (tab === 'tiktok') {
                if (typeof window !== 'undefined' && window.location.pathname !== '/mentor/integracoes/tiktok') {
                  window.history.pushState({}, '', '/mentor/integracoes/tiktok');
                  setCurrentPath('/mentor/integracoes/tiktok');
                }
              } else {
                if (typeof window !== 'undefined' && window.location.pathname.startsWith('/mentor/integracoes/tiktok')) {
                  window.history.pushState({}, '', '/mentor');
                  setCurrentPath('/mentor');
                }
              }
            }}
          />
        ) : (
          <>
            {/* Banner Oficial Geração Z Pro */}
            <GeracaoZProBanner />

            {/* Metric Stats Banner - 8 Card Unified Menu */}
            <StatsBar
              agents={displayAgents}
              activeCategory={activeCategory}
              onOpenOfficialAgent={handleOpenOfficialAgent}
              onOpenAfiliados={() => setShowAfiliadosModal(true)}
              onOpenSiteModal={() => setShowGeracaoZProModal(true)}
              onOpenCertificados={() => setShowCertificadosModal(true)}
            />

            {/* Grid and Search */}
            <AgentGrid
              agents={displayAgents}
              userIdentifier={userIdentifier}
              activeCategory={activeCategory}
              onSelectCategory={(cat) => setActiveCategory(cat)}
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
          </>
        )}

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

