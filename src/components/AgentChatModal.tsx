import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Send, Trash2, Copy, Check, Bot, User, Sparkles, RefreshCw, ChevronDown, ChevronUp, Code2, Globe, FileJson, AlertCircle, ExternalLink, Camera, Image as ImageIcon, Lock, Unlock } from 'lucide-react';
import { Agent, ChatMessage } from '../types';
import { AgentIcon, getColorTheme } from './AgentIcon';
import { getStoredChatSession, saveChatSession, clearChatSession } from '../utils/storage';
import { LightningChatBackground } from './LightningChatBackground';
import { getAuthHeaders, getDeviceId } from '../utils/deviceId';

interface AgentChatModalProps {
  agent: Agent;
  onClose: () => void;
  onIncrementUsage: (agentId: string) => void;
}

export const AgentChatModal: React.FC<AgentChatModalProps> = ({ agent, onClose, onIncrementUsage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageName, setSelectedImageName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isPromptUnlocked, setIsPromptUnlocked] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const directImageBg = (() => {
    const bg = agent.chatBackgroundImage || agent.coverImage;
    if (!bg) {
      const nameLower = agent.name.toLowerCase();
      if (nameLower.includes('vitrine 360') || agent.id === 'agent-shop-vitrine-360') {
        return 'https://i.postimg.cc/VSYvdYTV/image.png';
      }
      if (nameLower.includes('vitrine realista') || agent.id === 'agent-shop-vitrine-realista') {
        return 'https://i.postimg.cc/gnSmNzL8/image.png';
      }
      if (nameLower.includes('venda sem vender') || agent.id === 'agent-shop-venda-sem-vender') {
        return 'https://i.postimg.cc/4KJymJMW/image.png';
      }
      if (nameLower.includes('roteiro') || agent.id === 'agent-shop-roteiro-vende') {
        return 'https://i.postimg.cc/gwYjnY5S/image.png';
      }
      if (nameLower.includes('hiper-realista') || nameLower.includes('repórter ultra') || agent.id === 'agent-shop-reporter-hiper-realista') {
        return 'https://i.postimg.cc/pmQyW90B/image.png';
      }
      if (nameLower.includes('repórter cliente') || nameLower.includes('reporter cliente') || agent.id === 'agent-shop-reporter-cliente') {
        return 'https://i.postimg.cc/LJFnFkVP/image.png';
      }
      if (nameLower.includes('pegada viral') || agent.id === 'agent-shop-pegada-viral-pov') {
        return 'https://i.postimg.cc/68xyxVhT/image.png';
      }
      if (nameLower.includes('moda premium') || agent.id === 'agent-shop-moda-premium') {
        return 'https://i.postimg.cc/Xr6p6Kgj/image.png';
      }
      if (nameLower.includes('pov influencer') || nameLower.includes('método pov') || agent.id === 'agent-shop-pov-influencer') {
        return 'https://i.postimg.cc/JsCGC3Q1/image.png';
      }
      if (nameLower.includes('frutas em crise') || agent.id === 'agent-shop-frutas-em-crise') {
        return 'https://i.postimg.cc/N5H5nCRv/image.png';
      }
      if (nameLower.includes('fábrica viral') || nameLower.includes('fabrica viral') || agent.id === 'agent-shop-fabrica-viral') {
        return 'https://i.postimg.cc/zVgVQ2KF/image.png';
      }
      if (nameLower.includes('estampa premium') || agent.id === 'agent-shop-estampa-premium') {
        return 'https://i.postimg.cc/F7L76C3b/image.png';
      }
      if (nameLower.includes('copymaster') || agent.id === 'agent-shop-copymaster') {
        return 'https://i.postimg.cc/QHTHzY1Q/image.png';
      }
      if (nameLower.includes('colorinfluencer') || agent.id === 'agent-shop-colorinfluencer') {
        return 'https://i.postimg.cc/GHyHfgGJ/image.png';
      }
      if (nameLower.includes('anti-violação') || nameLower.includes('anti violação') || agent.id === 'agent-anti-violacao-gzpro') {
        return 'https://i.postimg.cc/233qQS6D/image.png';
      }
      if (nameLower.includes('babybola') || agent.id === 'agent-tiktok2k-babybola-viral') {
        return 'https://i.postimg.cc/w74378H1/image.png';
      }
      if (nameLower.includes('casquinha animal') || agent.id === 'agent-tiktok2k-casquinha-animal') {
        return 'https://i.postimg.cc/KRp4RSF8/image.png';
      }
      if (nameLower.includes('dama') || nameLower.includes('cartomante') || agent.id === 'agent-tiktok2k-dama-vidente') {
        return 'https://i.postimg.cc/HVvjVDHH/image.png';
      }
      if (nameLower.includes('novela frutas') || agent.id === 'agent-tiktok2k-frutas-em-crise') {
        return 'https://i.postimg.cc/ykpWk4Bs/image.png';
      }
      if (nameLower.includes('homem da roça') || nameLower.includes('homem da roca') || agent.id === 'agent-tiktok2k-homem-da-roca') {
        return 'https://i.postimg.cc/SJ1jJFq0/image.png';
      }
      if (nameLower.includes('mensageiro de deus') || agent.id === 'agent-tiktok2k-mensageiro-de-deus') {
        return 'https://i.postimg.cc/GHmHLh0b/image.png';
      }
      if (nameLower.includes('mulher da roça') || nameLower.includes('mulher da roca') || agent.id === 'agent-tiktok2k-mulher-da-roca') {
        return 'https://i.postimg.cc/KR8RGvXh/image.png';
      }
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
  })();

  const isTikTok2K = agent.category === 'Tiktok 2K';
  const isLightningBg = agent.chatBackgroundImage === 'lightning';
  const isDarkCustomBg = Boolean(directImageBg || isLightningBg);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('A imagem é muito grande. Escolha uma foto de até 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSelectedImage(result);
      setSelectedImageName(file.name);
      setErrorMsg(null);
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

  const videoList = useMemo(() => {
    if (agent.exampleVideoUrls && agent.exampleVideoUrls.length > 0) {
      return agent.exampleVideoUrls;
    }
    if (agent.exampleVideoUrl) {
      return [agent.exampleVideoUrl];
    }
    return [];
  }, [agent.exampleVideoUrl, agent.exampleVideoUrls]);

  const isTikTokModule = useMemo(() => {
    return agent.category === 'Tiktok 2K' || agent.category === 'Tiktok Shop' || agent.category?.toLowerCase().includes('tiktok');
  }, [agent.category]);

  const showExampleButton = isTikTokModule || videoList.length > 0;

  const currentVideoUrl = videoList[currentVideoIndex] || agent.exampleVideoUrl;

  const getVimeoEmbedUrl = (url?: string) => {
    if (!url) return null;
    const match = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
    if (match && match[1]) {
      return `https://player.vimeo.com/video/${match[1]}?autoplay=1&autopause=0`;
    }
    return url;
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const theme = getColorTheme(agent.colorTheme);

  // Load existing chat history or start fresh
  useEffect(() => {
    const history = getStoredChatSession(agent.id);
    setMessages(history);
  }, [agent.id]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if ((!text && !selectedImage) || isLoading) return;

    setErrorMsg(null);
    setInputMessage('');

    const currentImage = selectedImage;
    setSelectedImage(null);
    setSelectedImageName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text || (currentImage ? '📷 [Foto do produto enviada para análise]' : ''),
      image: currentImage || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    saveChatSession(agent.id, updatedMessages);
    setIsLoading(true);

    try {
      const storedKey = localStorage.getItem('user_gemini_api_key') || '';
      const storedCode = localStorage.getItem('user_student_access_code') || '';

      // Call server backend /api/chat
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          systemInstruction: agent.systemInstruction,
          temperature: agent.temperature,
          customApiKey: storedKey || undefined,
          studentAccessCode: storedCode || undefined,
          deviceId: getDeviceId(),
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
            image: m.image,
          })),
        }),
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (jsonErr) {
        console.error('Server response is not valid JSON:', responseText);
        if (!response.ok) {
          throw new Error(
            responseText.includes('GEMINI_API_KEY') || responseText.includes('API key')
              ? 'A chave GEMINI_API_KEY não foi configurada nas variáveis do servidor.'
              : 'Ocorreu um erro no servidor ao processar sua mensagem. Verifique a chave GEMINI_API_KEY.'
          );
        } else {
          throw new Error('A resposta do servidor não veio no formato JSON esperado.');
        }
      }

      if (!response.ok) {
        throw new Error(data.error || 'Erro na comunicação com o agente.');
      }

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      saveChatSession(agent.id, finalMessages);
      onIncrementUsage(agent.id);
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMsg(err.message || 'Ocorreu um erro ao gerar a resposta.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePromptAccess = () => {
    if (isPromptUnlocked) {
      setShowInstructions(!showInstructions);
    } else {
      setShowPasswordModal(true);
      setPasswordInput('');
      setPasswordError(null);
    }
  };

  const handleVerifyPassword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (passwordInput.trim() === '7144bigode') {
      setIsPromptUnlocked(true);
      setShowInstructions(true);
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError(null);
    } else {
      setPasswordError('Senha incorreta! Acesso restrito ao criador.');
    }
  };

  const handleLockPromptAgain = () => {
    setIsPromptUnlocked(false);
    setShowInstructions(false);
  };

  const handleSaveApiKey = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = apiKeyInput.trim();
    if (cleanKey) {
      if (cleanKey.length < 10) {
        setErrorMsg('Chave muito curta ou inválida. Cole a chave de API obtida em https://aistudio.google.com/app/apikey');
        setShowApiKeyModal(false);
        return;
      }
      localStorage.setItem('user_gemini_api_key', cleanKey);
    } else {
      localStorage.removeItem('user_gemini_api_key');
    }
    setShowApiKeyModal(false);
    setErrorMsg(null);
  };

  const handleClearChat = () => {
    clearChatSession(agent.id);
    setMessages([]);
    setSelectedImage(null);
    setSelectedImageName(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopyMessage = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
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
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                {agent.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Discreet Master Access Lock Button (Text 'Prompt do Agente' is hidden) */}
            <button
              onClick={handleTogglePromptAccess}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                isPromptUnlocked
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800'
              }`}
              title={isPromptUnlocked ? "Visualizar estrutura mestre" : "Acesso Restrito ao Criador (Senha Protegida)"}
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
              title="Limpar Histórico da Conversa"
              disabled={messages.length === 0}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200/60 dark:border-rose-800/40 flex items-center space-x-1.5 transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Chat</span>
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

        {/* Collapsible System Instruction Panel (Only when unlocked) */}
        {showInstructions && isPromptUnlocked && (
          <div className="p-4 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-2 animate-in slide-in-from-top duration-150">
            <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white">
              <span className="flex items-center space-x-1.5 text-amber-500 font-bold">
                <Unlock className="w-3.5 h-3.5" />
                <span>Instruções do Sistema (Visão Mestre do Criador)</span>
              </span>
              <div className="flex items-center space-x-3">
                <span className="text-[10px] text-slate-500 font-normal">Temperatura: {agent.temperature}</span>
                <button
                  onClick={handleLockPromptAgain}
                  className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[11px] font-bold flex items-center space-x-1 transition-colors border border-rose-500/30"
                >
                  <Lock className="w-3 h-3" />
                  <span>Trancar Estrutura</span>
                </button>
              </div>
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
                className="w-full h-full object-cover object-center transform scale-100 transition-transform duration-500"
                style={{ imageRendering: 'auto' }}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  if (agent.coverImage && (e.currentTarget.src !== agent.coverImage)) {
                    e.currentTarget.src = agent.coverImage;
                  }
                }}
              />
              {/* Subtle dark gradient overlay so HD image is full size and chat text is perfectly legible */}
              <div className="absolute inset-0 bg-gradient-to-b from-slate-950/45 via-slate-950/25 to-slate-950/80" />
              {isTikTok2K && (
                <div className="absolute inset-0 border border-cyan-500/20 pointer-events-none" />
              )}
            </div>
          ) : isLightningBg ? (
            <LightningChatBackground />
          ) : null}

          <div className="relative z-10 h-full overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto min-h-[350px]">
              <div className={`w-16 h-16 rounded-2xl ${
                isDarkCustomBg ? 'bg-slate-900/90 text-cyan-400 border-cyan-500/50 shadow-[0_0_20px_rgba(0,210,255,0.3)]' : `${theme.bg} ${theme.text} ${theme.border}`
              } border flex items-center justify-center mb-4 shadow-sm`}>
                <AgentIcon name={agent.iconName} size={32} />
              </div>
              <h3 className={`text-lg font-bold mb-1 ${isDarkCustomBg ? 'text-white drop-shadow-md' : 'text-slate-900 dark:text-white'}`}>
                Olá! Eu sou o {agent.name}
              </h3>
              <p className={`text-xs max-w-md mb-6 leading-relaxed ${isDarkCustomBg ? 'text-cyan-100/80 drop-shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}>
                {agent.description}
              </p>

              {/* Conversation Starters */}
              <div className="w-full max-w-xl space-y-3">
                {agent.conversationStarters && agent.conversationStarters.length > 0 && (
                  <div>
                    <p className={`text-[11px] font-semibold tracking-wider uppercase mb-2 ${
                      isDarkCustomBg ? 'text-cyan-300/80' : 'text-slate-400'
                    }`}>
                      Sugestões para começar a conversa:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {agent.conversationStarters.map((starter, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(starter)}
                          className={`p-3 text-left rounded-xl border text-xs transition-all shadow-xs group ${
                            isDarkCustomBg
                              ? 'bg-slate-900/85 hover:bg-slate-800/95 border-cyan-500/40 text-cyan-100 hover:border-cyan-300 hover:shadow-[0_0_15px_rgba(0,210,255,0.25)] backdrop-blur-md'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-500 dark:hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400'
                          }`}
                        >
                          <span className="font-medium group-hover:underline">{starter}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex space-x-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className={`w-8 h-8 rounded-lg ${
                    isDarkCustomBg ? 'bg-slate-900/90 text-cyan-400 border-cyan-500/50 shadow-[0_0_10px_rgba(0,210,255,0.3)]' : `${theme.bg} ${theme.text} ${theme.border}`
                  } border flex items-center justify-center shrink-0 mt-1`}>
                    <AgentIcon name={agent.iconName} size={16} />
                  </div>
                )}

                <div
                  className={`relative max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                    msg.role === 'user'
                      ? isDarkCustomBg
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none shadow-md shadow-cyan-950/50'
                        : 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white rounded-br-none'
                      : isDarkCustomBg
                        ? 'bg-slate-900/90 text-slate-100 border border-cyan-500/40 backdrop-blur-md rounded-bl-none shadow-md shadow-cyan-950/40'
                        : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-bl-none'
                  }`}
                >
                  {/* Copy message button */}
                  <button
                    onClick={() => handleCopyMessage(msg.id, msg.content)}
                    className="absolute top-2 right-2 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    title="Copiar texto"
                  >
                    {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {/* Render uploaded image if present */}
                  {msg.image && (
                    <div className="mb-3 overflow-hidden rounded-xl border border-slate-200/50 dark:border-slate-700/80 max-w-xs bg-slate-950/40">
                      <img
                        src={msg.image}
                        alt="Foto do produto"
                        className="w-full max-h-60 object-contain rounded-xl"
                      />
                    </div>
                  )}

                  <div className="whitespace-pre-wrap font-sans pr-5">
                    {msg.content}
                  </div>

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
            ))
          )}

          {/* Loading Typing Indicator */}
          {isLoading && (
            <div className="flex space-x-3 items-center">
              <div className={`w-8 h-8 rounded-lg ${
                isDarkCustomBg ? 'bg-slate-900/90 text-cyan-400 border-cyan-500/50' : `${theme.bg} ${theme.text} ${theme.border}`
              } border flex items-center justify-center shrink-0`}>
                <AgentIcon name={agent.iconName} size={16} />
              </div>
              <div className={`border rounded-2xl px-4 py-3 shadow-xs flex items-center space-x-2 ${
                isDarkCustomBg ? 'bg-slate-900/90 border-cyan-500/40 text-cyan-200 backdrop-blur-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-xs text-cyan-300/80 ml-2">{agent.name} está pensando...</span>
              </div>
            </div>
          )}
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={() => {
                  setApiKeyInput(localStorage.getItem('user_gemini_api_key') || '');
                  setShowApiKeyModal(true);
                }}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shrink-0 transition-colors shadow-xs flex items-center space-x-1"
              >
                <span>🔑 Inserir Chave API</span>
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Modal Footer / Chat Bar */}
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
                    📷 {selectedImageName || 'Foto do produto selecionada'}
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Pronta para envio ao agente {agent.name}
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
              disabled={isLoading}
              className={`py-3 px-3.5 rounded-xl border flex items-center justify-center space-x-1.5 text-xs font-bold transition-all shrink-0 ${
                selectedImage
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
              title="Anexar / Fazer Upload de Foto do Produto"
            >
              <Camera className="w-4 h-4 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Anexar Foto</span>
            </button>

            <input
              type="text"
              placeholder={selectedImage ? `Adicione uma mensagem com a foto (opcional)...` : `Enviar mensagem para ${agent.name}...`}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isLoading}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/50 transition-all border border-transparent dark:border-slate-700/60"
            />
            <button
              type="submit"
              disabled={(!inputMessage.trim() && !selectedImage) || isLoading}
              className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold transition-all shadow-sm active:scale-95 flex items-center justify-center shrink-0"
              title="Enviar mensagem"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
            <span>Pressione Enter para enviar • Você pode enviar fotos do produto</span>
            <span>Alimentado por Gemini 3.6 Flash</span>
          </div>
        </div>

      </div>

      {/* Embedded Video Modal directly on screen */}
      {showVideoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all"
          onClick={() => setShowVideoModal(false)}
        >
          <div
            className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-base">▶️</span>
                <div>
                  <h3 className="text-sm font-black text-white">{agent.name} — Exemplo em Vídeo</h3>
                  <p className="text-[11px] text-slate-400">
                    {videoList.length > 1
                      ? `Exemplo ${currentVideoIndex + 1} de ${videoList.length}`
                      : videoList.length === 1
                      ? 'Exemplo prático de publicação em vídeo'
                      : 'Vídeo de exemplo em breve'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowVideoModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pagination Controls for multiple videos */}
            {videoList.length > 1 && (
              <div className="flex items-center justify-between bg-slate-950/80 p-2 rounded-xl border border-slate-800/90">
                <button
                  onClick={() => setCurrentVideoIndex((prev) => (prev > 0 ? prev - 1 : videoList.length - 1))}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold flex items-center space-x-1 border border-slate-700/80 transition-colors"
                >
                  <span>&larr; Anterior</span>
                </button>

                <div className="flex items-center space-x-1.5">
                  {videoList.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentVideoIndex(idx)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all ${
                        idx === currentVideoIndex
                          ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md shadow-amber-500/20 scale-105'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {idx + 1}/{videoList.length}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentVideoIndex((prev) => (prev < videoList.length - 1 ? prev + 1 : 0))}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold flex items-center space-x-1 border border-slate-700/80 transition-colors"
                >
                  <span>Próximo &rarr;</span>
                </button>
              </div>
            )}

            {videoList.length > 0 ? (
              <div className="relative w-full aspect-[9/16] max-h-[60vh] sm:max-h-[65vh] rounded-xl overflow-hidden bg-black border border-slate-800 shadow-inner mx-auto">
                <iframe
                  key={currentVideoUrl}
                  src={getVimeoEmbedUrl(currentVideoUrl) || currentVideoUrl}
                  title={`Exemplo em Vídeo - ${agent.name}`}
                  className="w-full h-full border-0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="relative w-full aspect-[9/16] max-h-[50vh] sm:max-h-[55vh] rounded-xl overflow-hidden bg-slate-950/90 border border-slate-800/80 shadow-inner mx-auto flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-rose-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl shadow-lg shadow-orange-500/10">
                  ▶️
                </div>
                <div className="space-y-1.5 max-w-xs">
                  <h4 className="text-base font-black text-white">Vídeo de Exemplo em Breve</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Nenhum vídeo cadastrado no momento para o agente <strong className="text-amber-300">{agent.name}</strong>. Os vídeos de exemplo serão adicionados em breve!
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] font-bold text-slate-400">
                  Módulo {agent.category}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
              <span className="truncate">{agent.category} • {agent.name}</span>
              {videoList.length > 1 && (
                <span className="font-bold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                  Exemplo {currentVideoIndex + 1} de {videoList.length}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

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
                <p className="text-xs text-rose-500 font-medium flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{passwordError}</span>
                </p>
              )}

              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 transition-all shadow-md shadow-amber-500/20"
                >
                  Desbloquear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* API Key Modal */}
      {showApiKeyModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setShowApiKeyModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Configurar Chave API Gemini</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Insira sua chave do Google AI Studio para ativar os agentes:</p>
              </div>
            </div>

            <form onSubmit={handleSaveApiKey} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Chave API Gemini:</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-500 hover:underline inline-flex items-center space-x-1 text-[11px]"
                  >
                    <span>Obter chave grátis</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <input
                  type="text"
                  placeholder="Cole sua chave aqui..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                <p>💡 A chave será salva de forma segura no seu navegador para os agentes.</p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-md shadow-emerald-500/20"
                >
                  Salvar e Usar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
