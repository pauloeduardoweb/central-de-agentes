import React, { useState } from 'react';
import {
  X, Sparkles, Copy, Check, Play, Eye, Heart, MessageCircle, Share2,
  Bookmark, Zap, Loader2, Download, AlertCircle, FileText, Wand2, RefreshCw, ExternalLink, ShieldCheck, BarChart3
} from 'lucide-react';
import {
  ProductMinerProduct,
  ProductScriptType,
  generateProductScript,
  calculateVideoAnalysis,
} from '../../services/productMinerApi';

function compactNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatMoney(cents: number | null, symbol = 'R$') {
  if (cents === null || cents === undefined) return '—';
  return `${symbol} ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ==========================================
// 1. SCRIPT GENERATOR MODAL (AI ROTEIRO/COPY)
// ==========================================
interface ScriptGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductMinerProduct | null;
  studentCode: string;
}

const SCRIPT_TYPES: Array<{ id: ProductScriptType; label: string; desc: string }> = [
  { id: 'roteiro_completo', label: '📜 Roteiro Completo', desc: 'Hook + 3 Cenas + CTA para TikTok Shop' },
  { id: 'roteiro_viral', label: '🔥 Roteiro Viral', desc: 'Focado em reter a atenção e gerar salvamentos' },
  { id: 'copy_venda', label: '💰 Copy de Venda', desc: '3 opções de copy persuasiva de conversão' },
  { id: 'hooks', label: '🪝 5 Hooks Virais', desc: 'Ganchos irrecusáveis para os primeiros 3s' },
  { id: 'cta', label: '📣 5 CTAs', desc: 'Chamadas para clicar no carrinho amarelo' },
];

export const ScriptGeneratorModal: React.FC<ScriptGeneratorModalProps> = ({
  isOpen,
  onClose,
  product,
  studentCode,
}) => {
  const [scriptType, setScriptType] = useState<ProductScriptType>('roteiro_completo');
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [scriptText, setScriptText] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [variantCount, setVariantCount] = useState(0);

  if (!isOpen || !product) return null;

  const handleGenerate = async (seedOverride?: number) => {
    setLoading(true);
    setError('');
    setCopied(false);

    try {
      const res = await generateProductScript(
        studentCode,
        product,
        scriptType,
        customPrompt,
        seedOverride ?? (variantCount > 0 ? Date.now() : undefined)
      );
      setScriptText(res.script);
      if (seedOverride !== undefined) {
        setVariantCount((prev) => prev + 1);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao gerar roteiro.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!scriptText) return;
    navigator.clipboard.writeText(scriptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl border border-fuchsia-500/30 bg-slate-900 p-6 shadow-2xl shadow-fuchsia-950/20 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 border border-fuchsia-500/40 text-fuchsia-300">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Gerador de Roteiro AI <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 font-bold">TikTok Shop</span>
              </h2>
              <p className="text-xs text-slate-400">
                Produza conteúdo viral direcionado para conversão no carrinho amarelo.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Summary Header */}
        <div className="mt-4 p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center gap-3">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-200 truncate">{product.title}</h3>
              {product.score !== undefined && product.score !== null ? (
                <span className="shrink-0 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/30">
                  Score {product.score}/100
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
              <span className="font-bold text-emerald-400">{formatMoney(product.priceCents, product.currencySymbol)}</span>
              <span>• {compactNumber(product.soldCount)} vendas</span>
              {product.video?.views ? <span>• {compactNumber(product.video.views)} views no vídeo</span> : null}
            </div>
          </div>
        </div>

        {/* Script Type Options */}
        <div className="mt-4 space-y-2">
          <label className="text-xs font-bold text-slate-300 block">Tipo de Conteúdo Desejado:</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SCRIPT_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setScriptType(t.id)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  scriptType === t.id
                    ? 'border-fuchsia-500 bg-fuchsia-500/15 text-white shadow-md shadow-fuchsia-950/20'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold">{t.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Prompt Input */}
        <div className="mt-4 space-y-1.5">
          <label className="text-xs font-bold text-slate-300 block">
            Instrução Adicional / Foco Específico <span className="text-slate-500 font-normal">(Opcional)</span>:
          </label>
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Ex: Foque na dor de falta de tempo, ou enfatize o preço promocional para estudantes..."
            className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/80 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-fuchsia-500"
          />
        </div>

        {/* Generate Action Button */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => handleGenerate()}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-950/30 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando Roteiro com IA...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                {scriptText ? 'Recriar Roteiro' : '✨ Gerar Roteiro com IA'}
              </>
            )}
          </button>

          {scriptText ? (
            <button
              onClick={() => handleGenerate(Date.now())}
              disabled={loading}
              title="Gerar uma versão alternativa"
              className="px-4 py-2.5 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300 hover:bg-fuchsia-500/20 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Outra Versão
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="mt-3 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300">
            {error}
          </div>
        ) : null}

        {/* Script Output Box */}
        {scriptText ? (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-fuchsia-400" />
                Roteiro Gerado:
              </span>

              <button
                onClick={handleCopy}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  copied
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar Roteiro
                  </>
                )}
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/90 text-xs text-slate-200 whitespace-pre-wrap font-sans leading-relaxed max-h-80 overflow-y-auto">
              {scriptText}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};


// ==========================================
// 2. VIDEO ANALYSIS MODAL (ANÁLISE DE VÍDEO)
// ==========================================
interface VideoAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductMinerProduct | null;
  onOpenScriptModal?: (p: ProductMinerProduct) => void;
}

export const VideoAnalysisModal: React.FC<VideoAnalysisModalProps> = ({
  isOpen,
  onClose,
  product,
  onOpenScriptModal,
}) => {
  if (!isOpen || !product || !product.video) return null;

  const analysis = calculateVideoAnalysis(product.video);
  if (!analysis) return null;

  const video = product.video;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl rounded-2xl border border-cyan-500/30 bg-slate-900 p-6 shadow-2xl shadow-cyan-950/20 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                Análise do Vídeo Vencedor
              </h2>
              <p className="text-xs text-slate-400">
                Métricas detalhadas e diagnóstico de engajamento do TikTok Shop.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Strength Badge & Classification */}
        <div className="mt-4 p-4 rounded-xl border border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Classificação de Força</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-3 py-1 rounded-lg border text-sm font-black ${analysis.badgeColor}`}>
                {analysis.classification === 'Viral' ? '🔥 VIRAL (1M+ Views)' : `Classificação: ${analysis.classification}`}
              </span>
              <span className="text-xs text-slate-400">
                • {analysis.engagementRate}% de engajamento
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full sm:w-48">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Potencial de Escala</span>
              <span className="font-bold">{analysis.scorePercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-amber-400 transition-all duration-500"
                style={{ width: `${analysis.scorePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Author / Creator info */}
        <div className="mt-4 p-3 rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center font-bold text-fuchsia-300 text-sm">
              @
            </div>
            <div>
              <div className="text-xs font-bold text-fuchsia-300">@{video.author || 'criador'}</div>
              <div className="text-[10px] text-slate-400">
                {video.authorFollowers ? `${compactNumber(video.authorFollowers)} seguidores` : 'Creator do TikTok Shop'}
              </div>
            </div>
          </div>

          {video.url ? (
            <a
              href={video.url}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 hover:bg-fuchsia-500/30 text-xs font-bold flex items-center gap-1.5"
            >
              Ver no TikTok <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : null}
        </div>

        {/* Metrics Grid */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-center">
            <Eye className="w-4 h-4 mx-auto mb-1 text-cyan-300" />
            <div className="text-xs text-slate-400">Visualizações</div>
            <div className="text-sm font-black text-white mt-0.5">{compactNumber(analysis.views)}</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-center">
            <Heart className="w-4 h-4 mx-auto mb-1 text-rose-400" />
            <div className="text-xs text-slate-400">Curtidas</div>
            <div className="text-sm font-black text-white mt-0.5">{compactNumber(analysis.likes)}</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-center">
            <MessageCircle className="w-4 h-4 mx-auto mb-1 text-violet-300" />
            <div className="text-xs text-slate-400">Comentários</div>
            <div className="text-sm font-black text-white mt-0.5">{compactNumber(analysis.comments)}</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-center">
            <Share2 className="w-4 h-4 mx-auto mb-1 text-emerald-300" />
            <div className="text-xs text-slate-400">Compartilhamentos</div>
            <div className="text-sm font-black text-white mt-0.5">{compactNumber(analysis.shares)}</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-center">
            <Bookmark className="w-4 h-4 mx-auto mb-1 text-amber-300" />
            <div className="text-xs text-slate-400">Salvos</div>
            <div className="text-sm font-black text-white mt-0.5">{compactNumber(analysis.saves)}</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 text-center">
            <Zap className="w-4 h-4 mx-auto mb-1 text-amber-400" />
            <div className="text-xs text-slate-400">Engajamento Aprox.</div>
            <div className="text-sm font-black text-amber-300 mt-0.5">{analysis.engagementRate}%</div>
          </div>
        </div>

        {/* Zero-credit note */}
        <div className="mt-4 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            Análise realizada instantaneamente com dados do MySQL — <strong>0 Créditos Consumidos</strong>.
          </span>
        </div>

        {/* Modal Actions */}
        <div className="mt-5 flex gap-2">
          {onOpenScriptModal ? (
            <button
              onClick={() => {
                onClose();
                onOpenScriptModal(product);
              }}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-950/20"
            >
              <Sparkles className="w-4 h-4" />
              ✨ Gerar Roteiro Deste Vídeo
            </button>
          ) : null}

          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white text-xs font-bold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};


// ==========================================
// 3. VIDEO DOWNLOAD AUDIT NOTICE MODAL
// ==========================================
interface VideoDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductMinerProduct | null;
}

export const VideoDownloadModal: React.FC<VideoDownloadModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !product || !product.video) return null;

  const video = product.video;

  const handleCopyLink = () => {
    if (!video.url) return;
    navigator.clipboard.writeText(video.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-xl rounded-2xl border border-cyan-500/30 bg-slate-900 p-6 shadow-2xl shadow-cyan-950/20 my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                Download do Vídeo
              </h2>
              <p className="text-xs text-slate-400">
                Auditoria de URL do vídeo associado ao produto.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Share URL Box */}
        <div className="mt-4 p-4 rounded-xl border border-slate-800 bg-slate-950/80 space-y-3">
          <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>URL Registrada no Banco de Dados:</span>
            <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30">
              Página Web do TikTok
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono break-all select-all">
            {video.url || 'Nenhuma URL cadastrada'}
          </div>

          <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-300 text-xs space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              Auditoria do Recurso de Download Direto
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              • A URL armazenada é o link direto para visualização da página do TikTok.<br />
              • O download do arquivo brutos de vídeo (.mp4 CDN) requer chamada de extração de stream via SocialCrawl (1 crédito por vídeo).<br />
              • Para proteger o saldo de créditos do projeto, o download automático em lote permanece travado até autorização pelo Mentor.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap gap-2">
          {video.url ? (
            <a
              href={video.url}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-2.5 px-4 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              Assistir no TikTok
            </a>
          ) : null}

          <button
            onClick={handleCopyLink}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              copied
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Link Copiado!' : 'Copiar Link'}
          </button>

          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-800 bg-slate-950 text-slate-400 hover:text-white text-xs font-bold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
