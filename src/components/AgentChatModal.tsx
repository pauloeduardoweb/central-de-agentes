import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Send, Trash2, Copy, Check, User, Sparkles, ChevronDown, ChevronUp, Camera, Lock, Unlock, RotateCcw, Edit3, Bug } from 'lucide-react';
import { Agent, ChatMessage, AgentStepState } from '../types';
import { AgentIcon, getColorTheme } from './AgentIcon';
import { getStoredChatSessionFull, saveChatSession, clearChatSession } from '../utils/storage';
import { LightningChatBackground } from './LightningChatBackground';
import { LocalAgentEngine } from '../services/LocalAgentEngine';
import { isMasterKey } from '../data/studentCodes';
import { AgentOptionButtons } from './AgentOptionButtons';
import { AgentFinalOutput } from './AgentFinalOutput';
import { AgentTemplateCompiler } from '../agents/AgentTemplateCompiler';
import { AgentOutputGenerator } from '../services/AgentOutputGenerator';
import { AgentOption } from '../agents/agentTypes';

interface AgentChatModalProps {
  agent: Agent;
  onClose: () => void;
  onIncrementUsage: (agentId: string) => void;
}

export const AgentChatModal: React.FC<AgentChatModalProps> = ({ agent, onClose, onIncrementUsage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [stepState, setStepState] = useState<AgentStepState>({
    currentStep: 0,
    answers: {},
    attachedImage: null,
    attachedImageName: null,
    finalPrompt: null,
    isCompleted: false,
  });

  const [inputMessage, setInputMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isPromptUnlocked, setIsPromptUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDebugMode, setShowDebugMode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const theme = getColorTheme(agent.colorTheme);

  const agentConfig = useMemo(() => AgentTemplateCompiler.compile(agent), [agent]);

  const flowSession = stepState.flowSession;

  const currentStep = useMemo(() => {
    if (!flowSession || flowSession.status === 'completed') return null;
    return agentConfig.steps.find((s) => s.id === flowSession.currentStepId) || null;
  }, [agentConfig, flowSession]);

  const isCompleted = stepState.isCompleted || flowSession?.status === 'completed';

  const finalOutputs = useMemo(() => {
    if (!isCompleted || !flowSession) return [];
    return AgentOutputGenerator.generateOutputs(agentConfig, flowSession);
  }, [isCompleted, agentConfig, flowSession]);

  const directImageBg = useMemo(() => {
    const bg = agent.chatBackgroundImage || agent.coverImage;
    if (!bg) {
      const nameLower = agent.name.toLowerCase();
      if (nameLower.includes('vitrine 360') || agent.id === 'agent-shop-vitrine-360') return 'https://i.postimg.cc/VSYvdYTV/image.png';
      if (nameLower.includes('vitrine realista') || agent.id === 'agent-shop-vitrine-realista') return 'https://i.postimg.cc/gnSmNzL8/image.png';
      if (nameLower.includes('venda sem vender') || agent.id === 'agent-shop-venda-sem-vender') return 'https://i.postimg.cc/4KJymJMW/image.png';
      if (nameLower.includes('roteiro') || agent.id === 'agent-shop-roteiro-vende') return 'https://i.postimg.cc/gwYjnY5S/image.png';
      if (nameLower.includes('hiper-realista') || agent.id === 'agent-shop-reporter-hiper-realista') return 'https://i.postimg.cc/pmQyW90B/image.png';
      if (nameLower.includes('repórter cliente') || agent.id === 'agent-shop-reporter-cliente') return 'https://i.postimg.cc/LJFnFkVP/image.png';
      if (nameLower.includes('pegada viral') || agent.id === 'agent-shop-pegada-viral-pov') return 'https://i.postimg.cc/68xyxVhT/image.png';
      if (nameLower.includes('moda premium') || agent.id === 'agent-shop-moda-premium') return 'https://i.postimg.cc/Xr6p6Kgj/image.png';
      if (nameLower.includes('pov influencer') || agent.id === 'agent-shop-pov-influencer') return 'https://i.postimg.cc/JsCGC3Q1/image.png';
      if (nameLower.includes('frutas em crise') || agent.id === 'agent-shop-frutas-em-crise') return 'https://i.postimg.cc/N5H5nCRv/image.png';
      if (nameLower.includes('fábrica viral') || agent.id === 'agent-shop-fabrica-viral') return 'https://i.postimg.cc/zVgVQ2KF/image.png';
      if (nameLower.includes('estampa premium') || agent.id === 'agent-shop-estampa-premium') return 'https://i.postimg.cc/F7L76C3b/image.png';
      if (nameLower.includes('copymaster') || agent.id === 'agent-shop-copymaster') return 'https://i.postimg.cc/QHTHzY1Q/image.png';
      if (nameLower.includes('colorinfluencer') || agent.id === 'agent-shop-colorinfluencer') return 'https://i.postimg.cc/GHyHfgGJ/image.png';
      if (nameLower.includes('anti-violação') || agent.id === 'agent-anti-violacao-gzpro') return 'https://i.postimg.cc/233qQS6D/image.png';
      if (nameLower.includes('babybola') || agent.id === 'agent-tiktok2k-babybola-viral') return 'https://i.postimg.cc/w74378H1/image.png';
      if (nameLower.includes('babypet') || agent.id === 'agent-tiktok2k-babypet-viral') return 'https://i.postimg.cc/t4XHYNmQ/babypet.png';
      if (nameLower.includes('casquinha animal') || agent.id === 'agent-tiktok2k-casquinha-animal') return 'https://i.postimg.cc/KRp4RSF8/image.png';
      if (nameLower.includes('dama') || agent.id === 'agent-tiktok2k-dama-vidente') return 'https://i.postimg.cc/HVvjVDHH/image.png';
      if (nameLower.includes('novela frutas') || agent.id === 'agent-tiktok2k-frutas-em-crise') return 'https://i.postimg.cc/ykpWk4Bs/image.png';
      if (nameLower.includes('homem da roça') || agent.id === 'agent-tiktok2k-homem-da-roca') return 'https://i.postimg.cc/SJ1jJFq0/image.png';
      if (nameLower.includes('mensageiro de deus') || agent.id === 'agent-tiktok2k-mensageiro-de-deus') return 'https://i.postimg.cc/GHmHLh0b/image.png';
      if (nameLower.includes('mulher da roça') || agent.id === 'agent-tiktok2k-mulher-da-roca') return 'https://i.postimg.cc/KR8RGvXh/image.png';
      return null;
    }
    if (bg.startsWith('http')) {
      if (bg.includes('postimg.cc/')) {
        const parts = bg.split('postimg.cc/');
        const code = parts[1]?.split('/')[0];
        if (code) return `https://i.postimg.cc/${code}/image.png`;
      }
      return bg;
    }
    return null;
  }, [agent]);

  const isTikTok2K = agent.category === 'Tiktok 2K';
  const isLightningBg = agent.chatBackgroundImage === 'lightning';
  const isDarkCustomBg = Boolean(directImageBg || isLightningBg);

  // Load chat history or initialize guided local flow
  useEffect(() => {
    const fullSession = getStoredChatSessionFull(agent.id);
    if (fullSession.messages && fullSession.messages.length > 0) {
      setMessages(fullSession.messages);
      if (fullSession.localState) {
        setStepState(fullSession.localState);
      }
    } else {
      const { message, initialState } = LocalAgentEngine.getInitialGreeting(agent);
      setMessages([message]);
      setStepState(initialState);
      saveChatSession(agent.id, [message], initialState);
    }
  }, [agent]);

  // Scroll to bottom on message change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isCompleted]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('A imagem é muito grande. Escolha uma foto de até 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSelectedImage(result);
      setSelectedImageName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setSelectedImageName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text && !selectedImage) return;

    setInputMessage('');

    const currentImage = selectedImage;
    const currentImageName = selectedImageName;
    setSelectedImage(null);
    setSelectedImageName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    const imagePayload = currentImage && currentImageName ? { data: currentImage, name: currentImageName } : null;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text || (currentImage ? '📷 [Foto enviada]' : ''),
      image: currentImage || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMessage];

    // Process response using Local Agent Engine
    const { assistantMessages, nextState } = await LocalAgentEngine.processUserResponse(
      agent,
      text,
      imagePayload,
      stepState
    );

    const finalMessages = [...updatedMessages, ...assistantMessages];
    setMessages(finalMessages);
    setStepState(nextState);
    saveChatSession(agent.id, finalMessages, nextState);
    onIncrementUsage(agent.id);
  };

  const handleSelectOption = (option: AgentOption) => {
    handleSendMessage(option.id);
  };

  const handleClearChat = () => {
    clearChatSession(agent.id);
    const { message, initialState } = LocalAgentEngine.getInitialGreeting(agent);
    setMessages([message]);
    setStepState(initialState);
    saveChatSession(agent.id, [message], initialState);
  };

  const handleEditAnswers = () => {
    const { message, initialState } = LocalAgentEngine.getInitialGreeting(agent);
    setMessages([message]);
    setStepState(initialState);
    saveChatSession(agent.id, [message], initialState);
  };

  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isMentorBigodeLoggedIn = (): boolean => {
    if (typeof window === 'undefined') return false;
    const codes = [
      localStorage.getItem('user_student_access_code'),
      localStorage.getItem('student_access_code'),
      localStorage.getItem('user_access_code'),
      localStorage.getItem('access_code'),
      localStorage.getItem('mentor_access_code'),
    ];
    return codes.some((code) => isMasterKey(code));
  };

  const handleTogglePromptAccess = () => {
    if (isMentorBigodeLoggedIn() || isPromptUnlocked) {
      setIsPromptUnlocked(true);
      setShowInstructions(!showInstructions);
    } else {
      setShowPasswordModal(true);
      setPasswordInput('');
      setPasswordError(null);
    }
  };

  const handleVerifyPassword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawInput = passwordInput.trim();
    const normalizedInput = rawInput.toUpperCase();
    const validMasterCodes = ['MENTOR-BIGODE', 'BIGODE-MENTOR', 'BIGODE7144', '7144BIGODE'];

    if (
      validMasterCodes.includes(normalizedInput) ||
      rawInput.toLowerCase() === '7144bigode' ||
      isMasterKey(rawInput)
    ) {
      setIsPromptUnlocked(true);
      setShowInstructions(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError(null);
    } else {
      setPasswordError('Senha incorreta! Acesso restrito ao Mentor Bigode.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-4xl h-[92vh] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center space-x-3.5">
            <div className={`w-10 h-10 rounded-xl ${theme.bg} ${theme.text} ${theme.border} border flex items-center justify-center shrink-0`}>
              <AgentIcon name={agent.iconName} size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {agent.name}
                </h2>
                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${theme.badge}`}>
                  {agent.category}
                </span>
                <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ⚡ CHAT LOCAL
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                {agent.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Debug Mode Button for Mentor */}
            {isMentorBigodeLoggedIn() && (
              <button
                onClick={() => setShowDebugMode(!showDebugMode)}
                className={`p-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                  showDebugMode
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Modo Debug Mestre"
              >
                <Bug className="w-4 h-4" />
              </button>
            )}

            {/* Master Access Lock Button */}
            <button
              onClick={handleTogglePromptAccess}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                isPromptUnlocked
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
              title={isPromptUnlocked ? "Visualizar estrutura mestre" : "Acesso Restrito ao Criador"}
            >
              {isPromptUnlocked ? (
                <>
                  <Unlock className="w-4 h-4 text-amber-500" />
                  <span className="text-[11px] font-bold text-amber-500">Mestre</span>
                  {showInstructions ? <ChevronUp className="w-3.5 h-3.5 text-amber-500" /> : <ChevronDown className="w-3.5 h-3.5 text-amber-500" />}
                </>
              ) : (
                <Lock className="w-4 h-4 text-slate-400 hover:text-slate-300" />
              )}
            </button>

            <button
              onClick={handleClearChat}
              title="Nova Conversa"
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200/60 dark:border-rose-800/40 flex items-center space-x-1.5 transition-all shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Nova Conversa</span>
            </button>

            <button
              onClick={onClose}
              id="btn-close-chat"
              title="Fechar conversa"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Debug Panel (Mentor Bigode) */}
        {showDebugMode && isMentorBigodeLoggedIn() && (
          <div className="p-3 bg-slate-950 text-cyan-300 border-b border-cyan-800 text-[11px] font-mono space-y-1">
            <div className="font-bold text-amber-400">🐞 DEBUG MODE — MENTOR BIGODE</div>
            <div>AgentID: {agent.id} | Step: {flowSession?.currentStepId || 'step-0'}</div>
            <div>Produto Consolidado: {flowSession?.answers?.['productName'] || flowSession?.answers?.['step-0'] || 'N/A'}</div>
            <div>Origem da Identificação: Local Vision Canvas + Título</div>
            <div>Nível de Confiança: {flowSession?.answers?.['productName'] ? '92%' : '80%'} (Local)</div>
            <div>Answers: {JSON.stringify(flowSession?.answers || {})}</div>
          </div>
        )}

        {/* Master System Instruction Panel (When unlocked) */}
        {showInstructions && (isPromptUnlocked || isMentorBigodeLoggedIn()) && (
          <div className="p-4 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-2 animate-in slide-in-from-top duration-150">
            <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white">
              <span className="flex items-center space-x-1.5 text-amber-500 font-bold">
                <Unlock className="w-3.5 h-3.5" />
                <span>Instruções do Sistema (Prompt Mestre)</span>
              </span>
              <button
                onClick={() => setShowInstructions(false)}
                className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[11px] font-bold flex items-center space-x-1 transition-colors border border-rose-500/30"
              >
                <Lock className="w-3 h-3" />
                <span>Fechar</span>
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-mono text-[11px] bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700/80 max-h-36 overflow-y-auto leading-relaxed select-none">
              {agent.systemInstruction}
            </pre>
          </div>
        )}

        {/* Chat Messages Area */}
        <div className={`relative flex-1 overflow-hidden ${
          isDarkCustomBg ? 'bg-[#030712] text-white' : 'bg-slate-50/50 dark:bg-slate-950/50'
        }`}>
          {directImageBg ? (
            <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden bg-[#030712]">
              <img
                src={directImageBg}
                alt={`${agent.name} Background HD`}
                className="w-full h-full object-cover object-center transform scale-100 transition-transform duration-500 opacity-90"
                style={{ imageRendering: 'auto' }}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/30 to-slate-950/85" />
              {isTikTok2K && (
                <div className="absolute inset-0 border border-cyan-500/20 pointer-events-none" />
              )}
            </div>
          ) : isLightningBg ? (
            <LightningChatBackground />
          ) : null}

          <div className="relative z-10 h-full overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((msg, index) => {
              const isLastMessage = index === messages.length - 1;
              const isAssistant = msg.role === 'assistant';

              return (
                <div
                  key={msg.id}
                  className={`flex space-x-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {isAssistant && (
                    <div className={`w-8 h-8 rounded-lg ${
                      isDarkCustomBg ? 'bg-slate-900/90 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(0,210,255,0.3)]' : `${theme.bg} ${theme.text} ${theme.border}`
                    } border flex items-center justify-center shrink-0 mt-1`}>
                      <AgentIcon name={agent.iconName} size={16} />
                    </div>
                  )}

                  <div
                    className={`relative max-w-[88%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                      msg.role === 'user'
                        ? isDarkCustomBg
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none shadow-md shadow-cyan-950/50'
                          : 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white rounded-br-none'
                        : isDarkCustomBg
                          ? 'bg-slate-900/95 text-slate-100 border border-cyan-500/40 backdrop-blur-md rounded-bl-none shadow-md shadow-cyan-950/40'
                          : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-bl-none'
                    }`}
                  >
                    {/* Copy message button */}
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      className="absolute top-2.5 right-2.5 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title="Copiar texto"
                    >
                      {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    {/* Uploaded image preview inside user message */}
                    {msg.image && (
                      <div className="mb-3 overflow-hidden rounded-xl border border-slate-200/50 dark:border-slate-700/80 max-w-xs bg-slate-950/40">
                        <img
                          src={msg.image}
                          alt="Foto do produto"
                          className="w-full max-h-60 object-contain rounded-xl"
                        />
                      </div>
                    )}

                    <div className="whitespace-pre-wrap font-sans pr-6">
                      {msg.content}
                    </div>

                    {/* Interactive Option Buttons for Current Step */}
                    {isAssistant && isLastMessage && !isCompleted && currentStep?.options && (
                      <AgentOptionButtons
                        options={currentStep.options}
                        onSelectOption={handleSelectOption}
                      />
                    )}

                    <span className={`block text-[10px] mt-2 ${msg.role === 'user' ? 'text-cyan-200/80' : 'text-slate-400'}`}>
                      {msg.timestamp}
                    </span>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Final Output Panel when completed */}
            {isCompleted && finalOutputs.length > 0 && (
              <AgentFinalOutput
                outputs={finalOutputs}
                onEditAnswers={handleEditAnswers}
                onClearChat={handleClearChat}
              />
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Modal Footer / Chat Input Bar */}
        {!isCompleted && (
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            {/* Selected Image Preview Bar */}
            {selectedImage && (
              <div className="mb-2.5 p-2 bg-emerald-50/80 dark:bg-emerald-950/60 rounded-xl flex items-center justify-between border border-emerald-500/50 shadow-xs">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <img
                    src={selectedImage}
                    alt="Preview da foto"
                    className="w-12 h-12 object-cover rounded-lg border border-emerald-400/60 shrink-0 bg-slate-900"
                  />
                  <div className="truncate">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      📷 {selectedImageName || 'Foto selecionada'}
                    </p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      Pronta para ser vinculada à etapa do agente
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-800 transition-colors"
                  title="Remover foto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              {/* Upload Photo Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`py-3 px-3.5 rounded-xl border flex items-center justify-center space-x-1.5 text-xs font-bold transition-all shrink-0 ${
                  selectedImage
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                title="Anexar / Fazer Upload de Foto"
              >
                <Camera className="w-4 h-4 text-emerald-500 dark:text-emerald-400 transition-transform" />
                <span className="hidden sm:inline">Anexar Foto</span>
              </button>

              <input
                type="text"
                placeholder={selectedImage ? `Adicione o nome/detalhes ou envie...` : `Responder à etapa atual...`}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 transition-all border border-transparent dark:border-slate-700/60"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() && !selectedImage}
                className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold transition-all shadow-sm active:scale-95 flex items-center justify-center shrink-0"
                title="Enviar resposta"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
              <span>Etapas deterministas • Responda cada pergunta para avançar</span>
              <span className="font-semibold text-emerald-400">Motor de Agentes Local • GZ Pro</span>
            </div>
          </div>
        )}

      </div>

      {/* Master Password Verification Modal */}
      {showPasswordModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setShowPasswordModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Acesso Mestre Restrito</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Digite a senha para desbloquear esta área:</p>
              </div>
            </div>

            <form onSubmit={handleVerifyPassword} className="space-y-3">
              <input
                type="password"
                placeholder="Digite a senha..."
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(null);
                }}
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />

              {passwordError && (
                <p className="text-xs text-rose-500 font-medium">{passwordError}</p>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-sm"
                >
                  Desbloquear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
