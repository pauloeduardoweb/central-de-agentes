import React, { useState, useEffect } from 'react';
import {
  X, Copy, Check, Sparkles, Loader2, AlertCircle, RefreshCw,
  Wand2, Target, ArrowRight, Quote, Flame, ShoppingBag, Eye,
  Sliders, Layers, Video, ShieldCheck, CheckCircle2, ChevronRight,
  FileText, Film, Lightbulb
} from 'lucide-react';
import {
  ProductMinerProduct,
  VideoTranscriptionResponse,
  ModelContentResponse,
  fetchPersistedTranscriptionByVideoIdApi,
  fetchVideoTranscriptionApi,
  modelVideoContentApi,
} from '../../services/productMinerApi';

interface ProductContentModelerModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductMinerProduct | null;
  studentCode: string;
  initialTranscription?: VideoTranscriptionResponse | null;
  onTrackClick?: (product: ProductMinerProduct) => void;
}

export const ProductContentModelerModal: React.FC<ProductContentModelerModalProps> = ({
  isOpen,
  onClose,
  product,
  studentCode,
  initialTranscription,
  onTrackClick,
}) => {
  const [loadingTranscription, setLoadingTranscription] = useState(false);
  const [modelingLoading, setModelingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<VideoTranscriptionResponse | null>(null);

  // Form states for new target product
  const [targetProduct, setTargetProduct] = useState('');
  const [targetNiche, setTargetNiche] = useState('');
  const [targetAngle, setTargetAngle] = useState('');
  const [targetDifferentiator, setTargetDifferentiator] = useState('');
  const [voiceTone, setVoiceTone] = useState('Viral & Enérgico');
  const [structuralFidelity, setStructuralFidelity] = useState<'Alta' | 'Média' | 'Livre'>('Alta');
  const [customInstructions, setCustomInstructions] = useState('');

  // Result states
  const [modeledResult, setModeledResult] = useState<ModelContentResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'script' | 'analysis'>('form');
  const [copiedScript, setCopiedScript] = useState(false);
  const [variantCount, setVariantCount] = useState(1);

  const video = product?.video || (product?.associatedVideos && product.associatedVideos[0]) || null;
  const productId = product?.productId;
  const videoId = video?.id || (video as any)?.videoId || (video as any)?.video_id || '';

  // Load transcription: strictly prioritize persisted transcription without auto-generating if not found
  useEffect(() => {
    if (!isOpen || !product) {
      setTranscription(null);
      setModeledResult(null);
      setError(null);
      setTargetProduct('');
      setTargetNiche('');
      return;
    }

    if (initialTranscription && initialTranscription.rawTranscript) {
      setTranscription(initialTranscription);
      if (!targetProduct) {
        setTargetProduct(product.title);
        setTargetNiche(product.category || 'Geral');
      }
    } else {
      setLoadingTranscription(true);
      setError(null);

      // Usar rota de consulta GET por videoId / productId
      const cleanVid = videoId || '';
      fetchPersistedTranscriptionByVideoIdApi(studentCode, cleanVid, product.productId)
        .then((data) => {
          if (data && data.exists && data.rawTranscript) {
            setTranscription(data);
            if (!targetProduct) {
              setTargetProduct(product.title);
              setTargetNiche(product.category || 'Geral');
            }
          } else {
            // Se não houver transcrição salva ainda, carregar via POST de resolução
            return fetchVideoTranscriptionApi(studentCode, {
              productId: product.productId,
              videoId: cleanVid,
              videoUrl: video?.url || product.videoUrl,
              productTitle: product.title,
              productCategory: product.category,
              videoAuthor: video?.author || product.videoAuthor,
              videoDescription: video?.description || product.videoDescription,
              forceRefresh: false,
            }).then((genData) => {
              if (genData && genData.rawTranscript) {
                setTranscription(genData);
                if (!targetProduct) {
                  setTargetProduct(product.title);
                  setTargetNiche(product.category || 'Geral');
                }
              } else {
                setError('Este vídeo ainda não possui uma transcrição válida.');
              }
            });
          }
        })
        .catch((err: any) => {
          console.error('[Modeler Transcription Fetch Error]:', err);
          setError(err?.message || 'Este vídeo ainda não possui uma transcrição válida.');
        })
        .finally(() => setLoadingTranscription(false));
    }
  }, [isOpen, productId, videoId, initialTranscription]);

  // ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const handleGenerateModel = async (isNewVariant = false) => {
    if (!transcription && !product) return;
    setModelingLoading(true);
    setError(null);

    const currentVariant = isNewVariant ? variantCount + 1 : variantCount;
    if (isNewVariant) setVariantCount(currentVariant);

    try {
      const response = await modelVideoContentApi(studentCode, {
        productId: product.productId,
        videoId,
        exactTranscript: transcription?.rawTranscript || '',
        originalHook: transcription?.hookOriginal,
        originalStructure: transcription?.structureOriginal,
        originalDevelopment: transcription?.developmentOriginal,
        originalCta: transcription?.ctaOriginal,
        originalRhythm: transcription?.rhythm,
        originalDuration: transcription?.durationSeconds,
        targetProduct: targetProduct.trim() || product.title,
        targetNiche: targetNiche.trim() || product.category || 'Geral',
        targetAngle: targetAngle.trim(),
        targetDifferentiator: targetDifferentiator.trim(),
        voiceTone,
        structuralFidelity,
        customInstructions: customInstructions.trim(),
        variantSeed: currentVariant,
      });

      setModeledResult(response);
      setActiveTab('script');
    } catch (err: any) {
      console.error('[Content Modeling Error]:', err);
      setError(err?.message || 'Falha ao processar modelagem de conteúdo com IA.');
    } finally {
      setModelingLoading(false);
    }
  };

  const handleCopyFullScript = async () => {
    if (!modeledResult?.modeledScript) return;
    const script = modeledResult.modeledScript;

    let formattedText = `🎬 ROTEIRO MODELADO (TIKTOK SHOP)\n`;
    formattedText += `Produto: ${script.targetProduct}\n`;
    formattedText += `Duração Estimada: ${script.estimatedDuration}\n`;
    formattedText += `==============================================\n\n`;

    if (script.sections && script.sections.length > 0) {
      script.sections.forEach((sec) => {
        formattedText += `[${sec.time}] - ${sec.tag.toUpperCase()}\n`;
        formattedText += `👁️ AÇÃO VISUAL: ${sec.visualAction}\n`;
        formattedText += `🗣️ FALA: "${sec.spokenText}"\n`;
        if (sec.onScreenText) formattedText += `📱 TEXTO NA TELA: ${sec.onScreenText}\n`;
        formattedText += `\n`;
      });
    } else if (script.fullScriptMarkdown) {
      formattedText += script.fullScriptMarkdown;
    }

    if (script.viralTips && script.viralTips.length > 0) {
      formattedText += `\n💡 DICAS DE GRAVAÇÃO:\n`;
      script.viralTips.forEach((tip) => {
        formattedText += `• ${tip}\n`;
      });
    }

    await navigator.clipboard.writeText(formattedText);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-3xl bg-white border border-slate-200 p-5 sm:p-7 shadow-2xl text-slate-900 my-auto flex flex-col max-h-[94dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-amber-500/20">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight">
                  MODELAGEM DE CONTEÚDO
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 font-black text-[10px] uppercase">
                  <Target className="w-3 h-3 text-amber-600" />
                  Engenharia Reversa Viral
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">
                Reutilize a estrutura, ritmo e gatilhos da transcrição exata adaptados para outro produto.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer shrink-0"
            title="Fechar (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl my-3.5 border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-2 px-3 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'form'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-amber-600" />
            <span>1. Configurar Novo Produto</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analysis')}
            className={`flex-1 py-2 px-3 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'analysis'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>2. Raio-X do Original</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (modeledResult) setActiveTab('script');
              else handleGenerateModel(false);
            }}
            disabled={modelingLoading}
            className={`flex-1 py-2 px-3 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'script'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 disabled:opacity-50'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>3. Roteiro Adaptado {modeledResult ? '✓' : ''}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4">
          {loadingTranscription ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
              <p className="text-xs text-slate-600 font-bold">
                Carregando transcrição exata para matéria-prima da modelagem...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-center space-y-2">
              <p className="text-xs text-rose-700 font-bold">{error}</p>
              <button
                type="button"
                onClick={() => handleGenerateModel(false)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <>
              {/* TAB 1: FORMULÁRIO DO NOVO PRODUTO */}
              {activeTab === 'form' ? (
                <div className="space-y-4">
                  {/* Resumo da Matéria-prima */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                        VIRAL
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-black text-amber-800 uppercase block tracking-wide">
                          Vídeo Original de Base
                        </span>
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {product.title}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveTab('analysis')}
                      className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 font-bold text-xs shrink-0 shadow-2xs cursor-pointer"
                    >
                      Ver Raio-X
                    </button>
                  </div>

                  {/* Formulário de Modelagem */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3.5 shadow-2xs">
                    <h4 className="font-black text-xs sm:text-sm text-slate-900 uppercase tracking-wide flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-600" />
                      Defina o Novo Produto a ser Promovido
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700 block">
                          Nome / Conceito do Novo Produto <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={targetProduct}
                          onChange={(e) => setTargetProduct(e.target.value)}
                          placeholder="Ex: Escova Elétrica Modeladora 5 em 1"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">
                          Nicho / Categoria
                        </label>
                        <input
                          type="text"
                          value={targetNiche}
                          onChange={(e) => setTargetNiche(e.target.value)}
                          placeholder="Ex: Beleza e Cuidados Pessoais"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">
                          Tom de Voz
                        </label>
                        <select
                          value={voiceTone}
                          onChange={(e) => setVoiceTone(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none transition-all"
                        >
                          <option value="Viral & Enérgico">🔥 Viral & Enérgico (Alta Retenção)</option>
                          <option value="Review Sincero / Amigável">⭐ Review Sincero / Conversacional</option>
                          <option value="Tutorial Rápido / Prático">⚡ Tutorial Rápido / Passo a Passo</option>
                          <option value="Urgência & Oferta">🛒 Urgência / Foco em Preço Promocional</option>
                          <option value="Humor & Descontração">😂 Humor & Espontaneidade</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">
                          Ângulo Principal (Dor / Desejo)
                        </label>
                        <input
                          type="text"
                          value={targetAngle}
                          onChange={(e) => setTargetAngle(e.target.value)}
                          placeholder="Ex: Cabelo pronto em 5 minutos sem queimar"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">
                          Diferencial Único
                        </label>
                        <input
                          type="text"
                          value={targetDifferentiator}
                          onChange={(e) => setTargetDifferentiator(e.target.value)}
                          placeholder="Ex: Não esquenta o cabo e tem 3 temperaturas"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none transition-all"
                        />
                      </div>

                      {/* Nível de Fidelidade Estrutural */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700">
                            Nível de Fidelidade Estrutural
                          </label>
                          <span className="text-[10px] text-amber-800 font-black bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {structuralFidelity === 'Alta' ? '1:1 Estrutura e Timestamps' : structuralFidelity === 'Média' ? 'Equilíbrio Viral' : 'Inspiração Criativa'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setStructuralFidelity('Alta')}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              structuralFidelity === 'Alta'
                                ? 'bg-amber-50/90 border-amber-400 text-amber-950 shadow-2xs ring-2 ring-amber-400/30'
                                : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-black text-xs text-amber-900">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Alta (1:1 Rigoroso)</span>
                            </div>
                            <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 font-medium leading-tight">
                              Copia a matriz cronológica, pausas e gatilhos exatos.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setStructuralFidelity('Média')}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              structuralFidelity === 'Média'
                                ? 'bg-amber-50/90 border-amber-400 text-amber-950 shadow-2xs ring-2 ring-amber-400/30'
                                : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-black text-xs text-orange-900">
                              <Sliders className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                              <span>Média (Equilíbrio)</span>
                            </div>
                            <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 font-medium leading-tight">
                              Mantém a macroestrutura com adaptação de copy.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setStructuralFidelity('Livre')}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              structuralFidelity === 'Livre'
                                ? 'bg-amber-50/90 border-amber-400 text-amber-950 shadow-2xs ring-2 ring-amber-400/30'
                                : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-black text-xs text-purple-900">
                              <Lightbulb className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              <span>Livre (Criativo)</span>
                            </div>
                            <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 font-medium leading-tight">
                              Nova narrativa fluida inspirada no conceito do vídeo.
                            </p>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-700 block">
                          Instruções Opcionais para a IA
                        </label>
                        <input
                          type="text"
                          value={customInstructions}
                          onChange={(e) => setCustomInstructions(e.target.value)}
                          placeholder="Ex: Enfatizar que o frete é grátis e que restam poucas unidades no carrinho"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleGenerateModel(false)}
                        disabled={modelingLoading || !targetProduct.trim()}
                        className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {modelingLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Processando Engenharia Reversa e Modelagem...</span>
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4" />
                            <span>GERAR ROTEIRO MODELADO COM IA</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* TAB 2: RAIO-X DO VÍDEO ORIGINAL */}
              {activeTab === 'analysis' ? (
                <div className="space-y-3.5 max-h-[55dvh] overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Hook Original */}
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 space-y-1.5 shadow-2xs">
                      <div className="flex items-center gap-2 text-amber-800 font-black text-xs uppercase tracking-wider">
                        <Flame className="w-4 h-4 text-amber-600" />
                        <span>1. Hook Original (0s - 3s)</span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed">
                        &ldquo;{transcription?.hookOriginal || 'Gancho de impacto visual e quebra de padrão'}&rdquo;
                      </p>
                    </div>

                    {/* CTA Original */}
                    <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200/90 space-y-1.5 shadow-2xs">
                      <div className="flex items-center gap-2 text-orange-800 font-black text-xs uppercase tracking-wider">
                        <Target className="w-4 h-4 text-orange-600" />
                        <span>2. CTA Original (Conversão)</span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed">
                        &ldquo;{transcription?.ctaOriginal || 'Clica no carrinho amarelo aqui embaixo!'}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Estrutura e Ritmo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                        📐 Estrutura Sequencial
                      </span>
                      <p className="text-xs font-bold text-slate-800 leading-normal">
                        {transcription?.structureOriginal || 'Hook de Impacto -> Dor Cotidiana -> Revelação -> Demonstração Prática -> CTA'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                        ⏱️ Ritmo & Duração
                      </span>
                      <p className="text-xs font-bold text-slate-800 leading-normal">
                        {transcription?.rhythm || 'Rápido e enérgico'} (~{transcription?.durationSeconds || 30}s)
                      </p>
                    </div>
                  </div>

                  {/* Transcrição Literal de Apoio */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <span className="text-xs font-black text-slate-900 uppercase">
                        Matéria-prima: Transcrição Fiel
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {transcription?.timedTranscript?.length || 1} blocos
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto text-xs text-slate-700 leading-relaxed pr-1">
                      {transcription?.timedTranscript && transcription.timedTranscript.length > 0 ? (
                        transcription.timedTranscript.map((b, i) => (
                          <div key={i} className="flex items-start gap-2 py-0.5">
                            <span className="font-mono text-[10px] text-amber-700 font-bold shrink-0">
                              [{b.time}]
                            </span>
                            <span>&ldquo;{b.text}&rdquo;</span>
                          </div>
                        ))
                      ) : (
                        <p>&ldquo;{transcription?.rawTranscript}&rdquo;</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('form')}
                      className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <span>Avançar para Modelagem do Novo Produto</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : null}

              {/* TAB 3: ROTEIRO ADAPTADO GERADO */}
              {activeTab === 'script' ? (
                <div className="space-y-4">
                  {modeledResult ? (
                    <div className="space-y-4">
                      {/* Top Bar do Roteiro */}
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 flex items-center justify-between gap-3">
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900">
                            {modeledResult.modeledScript?.title || `Roteiro: ${targetProduct}`}
                          </h4>
                          <span className="text-xs text-amber-800 font-bold">
                            Duração Estimada: {modeledResult.modeledScript?.estimatedDuration || '30 segundos'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleGenerateModel(true)}
                            disabled={modelingLoading}
                            className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${modelingLoading ? 'animate-spin' : ''}`} />
                            <span>Nova Variação</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleCopyFullScript}
                            className={`px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer ${
                              copiedScript
                                ? 'bg-emerald-600 text-white'
                                : 'bg-amber-500 hover:bg-amber-600 text-white'
                            }`}
                          >
                            {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedScript ? 'Copiado!' : 'Copiar Roteiro'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Blocos do Roteiro Modelado */}
                      {modeledResult.modeledScript?.sections && modeledResult.modeledScript.sections.length > 0 ? (
                        <div className="space-y-3 max-h-[50dvh] overflow-y-auto pr-1">
                          {modeledResult.modeledScript.sections.map((sec, idx) => (
                            <div
                              key={idx}
                              className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2.5 shadow-2xs hover:border-amber-300 transition-colors"
                            >
                              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 font-mono text-[11px] font-black">
                                    {sec.time}
                                  </span>
                                  <span className="font-black text-xs text-slate-900 uppercase">
                                    {sec.tag}
                                  </span>
                                </div>
                                {sec.onScreenText ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-900 border border-purple-200">
                                    Texto: {sec.onScreenText}
                                  </span>
                                ) : null}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
                                <div className="sm:col-span-5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                    👁️ Ação Visual / Cena
                                  </span>
                                  <p className="text-slate-800 font-medium leading-relaxed">
                                    {sec.visualAction}
                                  </p>
                                </div>

                                <div className="sm:col-span-7 p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/70 space-y-1">
                                  <span className="text-[10px] font-black text-amber-800 uppercase block">
                                    🗣️ Fala Exata da Locução
                                  </span>
                                  <p className="text-slate-950 font-bold text-xs sm:text-sm leading-relaxed">
                                    &ldquo;{sec.spokenText}&rdquo;
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-white border border-slate-200 whitespace-pre-line text-xs leading-relaxed font-medium">
                          {modeledResult.modeledScript?.fullScriptMarkdown}
                        </div>
                      )}

                      {/* Dicas Virais de Gravação */}
                      {modeledResult.modeledScript?.viralTips && modeledResult.modeledScript.viralTips.length > 0 ? (
                        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
                          <span className="text-xs font-black text-emerald-900 uppercase flex items-center gap-1.5">
                            <Lightbulb className="w-4 h-4 text-emerald-600" />
                            Dicas de Produção para Gravar e Vender no TikTok Shop:
                          </span>
                          <ul className="text-xs text-emerald-950 space-y-1 pl-4 list-disc font-medium">
                            {modeledResult.modeledScript.viralTips.map((tip, i) => (
                              <li key={i}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-center py-12 space-y-3">
                      <p className="text-xs text-slate-500">
                        Nenhum roteiro modelado gerado ainda.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleGenerateModel(false)}
                        className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold"
                      >
                        Gerar Roteiro Agora
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
          >
            Fechar
          </button>

          {activeTab === 'script' && modeledResult ? (
            <button
              type="button"
              onClick={handleCopyFullScript}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
            >
              {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedScript ? 'Copiado para a Área de Transferência!' : 'Copiar Roteiro Completo'}</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
