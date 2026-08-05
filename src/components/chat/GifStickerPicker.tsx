import React, { useState } from 'react';
import { Search, Flame, ImageIcon, X, Sparkles } from 'lucide-react';

interface GifStickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (sticker: { code: string; title: string; icon: string }) => void;
  onSelectGif: (gifUrl: string) => void;
}

export const OFFICIAL_STICKERS = [
  { code: 'STICKER_VIRAL', title: 'Viral', icon: '🔥', description: 'Post viralizou no TikTok' },
  { code: 'STICKER_VENDA', title: 'Vendas', icon: '💰', description: 'Comissão caindo na conta' },
  { code: 'STICKER_RESULTADO', title: 'Resultado', icon: '🚀', description: 'Meta de vendas atingida' },
  { code: 'STICKER_IA', title: 'IA', icon: '🤖', description: 'Automação criada com sucesso' },
  { code: 'STICKER_MENTOR', title: 'Mentor', icon: '👑', description: 'Orientação do Mentor Bigode' },
  { code: 'STICKER_TOP_AFILIADO', title: 'Top Afiliado', icon: '🏆', description: 'Ranking dos melhores do mês' },
  { code: 'STICKER_ESCALANDO', title: 'Escalando', icon: '📈', description: 'Operação rodando no alto' },
  { code: 'STICKER_META_BATIDA', title: 'Meta Batida', icon: '🎯', description: 'Objetivo alcançado' },
  { code: 'STICKER_PREMIUM', title: 'Premium', icon: '💎', description: 'Conteúdo de alto nível' },
  { code: 'STICKER_PARABENS', title: 'Parabéns', icon: '👏', description: 'Reconhecimento da comunidade' },
  { code: 'STICKER_COMEMORACAO', title: 'Comemoração', icon: '🎉', description: 'Festa e celebração' },
  { code: 'STICKER_OBRIGADO', title: 'Obrigado', icon: '❤️', description: 'Gratidão pelo apoio' },
  { code: 'STICKER_SURPRESA', title: 'Surpresa', icon: '😮', description: 'Impressionado com o resultado' },
  { code: 'STICKER_ENGRACADO', title: 'Engraçado', icon: '😂', description: 'Risadas na comunidade' },
  { code: 'STICKER_FORCA', title: 'Força', icon: '💪', description: 'Foco e disciplina total' },
  { code: 'STICKER_EXCELENTE', title: 'Excelente', icon: '⭐', description: 'Trabalho de excelência' },
  { code: 'STICKER_PEDIDO', title: 'Pedido', icon: '📦', description: 'Novo pedido gerado' },
  { code: 'STICKER_ENVIADO', title: 'Enviado', icon: '🚚', description: 'Produto a caminho do cliente' },
  { code: 'STICKER_PRESENTE', title: 'Presente', icon: '🎁', description: 'Bônus e recompensas' },
  { code: 'STICKER_IDEIA', title: 'Ideia', icon: '💡', description: 'Sacada e insight valioso' },
  { code: 'STICKER_TIKTOK', title: 'TikTok', icon: '📲', description: 'Tráfego orgânico bombando' },
  { code: 'STICKER_SHOP', title: 'Shop', icon: '🛒', description: 'Loja convertendo alto' },
  { code: 'STICKER_CRESCIMENTO', title: 'Crescimento', icon: '📈', description: 'Evolução constante' },
  { code: 'STICKER_RAPIDO', title: 'Rápido', icon: '⚡', description: 'Execução na velocidade da luz' },
  { code: 'STICKER_EXPLODIU', title: 'Explodiu', icon: '💥', description: 'Campanha estourando de vendas' },
  { code: 'STICKER_CONTEUDO_VIRAL', title: 'Conteúdo Viral', icon: '🎬', description: 'Vídeo na For You do TikTok' },
  { code: 'STICKER_COMISSAO', title: 'Comissão', icon: '💸', description: 'Notificação de venda efetuada' },
  { code: 'STICKER_PRIMEIRO_LUGAR', title: 'Primeiro Lugar', icon: '🥇', description: 'Líder do ranking mensal' },
  { code: 'STICKER_FOGUETE', title: 'Foguete', icon: '🚀', description: 'Foguete não tem ré' },
  { code: 'STICKER_CAMPEAO', title: 'Campeão', icon: '🏅', description: 'Troféu de mestre do tráfego' },
];

export const CURATED_GIFS = [
  // Comemoração
  { category: 'Comemoração', title: 'Festa Celebração', url: '/gifs/festa-celebracao.gif' },
  { category: 'Comemoração', title: 'Confetes e Alegria', url: '/gifs/confetes-alegria.gif' },
  { category: 'Comemoração', title: 'Dança da Vitória', url: '/gifs/danca-vitoria.gif' },

  // Dinheiro
  { category: 'Dinheiro', title: 'Chuva de Dinheiro', url: '/gifs/chuva-dinheiro.gif' },
  { category: 'Dinheiro', title: 'Contando Notas', url: '/gifs/contando-notas.gif' },
  { category: 'Dinheiro', title: 'Rico em Vendas', url: '/gifs/rico-vendas.gif' },

  // Vendas
  { category: 'Vendas', title: 'Notificação caindo', url: '/gifs/notificacao-caindo.gif' },
  { category: 'Vendas', title: 'Meta Batida', url: '/gifs/meta-batida.gif' },
  { category: 'Vendas', title: 'Lucro Garantido', url: '/gifs/lucro-garantido.gif' },

  // Viral
  { category: 'Viral', title: 'Explosão de Views', url: '/gifs/explosao-views.gif' },
  { category: 'Viral', title: 'Fogo e Chamas', url: '/gifs/fogo-chamas.gif' },
  { category: 'Viral', title: 'Bombando nas Redes', url: '/gifs/bombando-redes.gif' },

  // Motivação
  { category: 'Motivação', title: 'Foco no Trabalho', url: '/gifs/foco-trabalho.gif' },
  { category: 'Motivação', title: 'Determinação Total', url: '/gifs/determinacao-total.gif' },
  { category: 'Motivação', title: 'Foguete decolando', url: '/gifs/foguete-decolando.gif' },

  // Sucesso
  { category: 'Sucesso', title: 'Troféu Campeão', url: '/gifs/trofeu-campeao.gif' },
  { category: 'Sucesso', title: 'Mestre nos Negócios', url: '/gifs/mestre-negocios.gif' },
  { category: 'Sucesso', title: 'Topo do Ranking', url: '/gifs/topo-ranking.gif' },

  // IA
  { category: 'IA', title: 'Robô Inteligente', url: '/gifs/robo-inteligente.gif' },
  { category: 'IA', title: 'Automação Ativa', url: '/gifs/automacao-ativa.gif' },
  { category: 'IA', title: 'Futuro da IA', url: '/gifs/futuro-ia.gif' },

  // TikTok
  { category: 'TikTok', title: 'Vídeo na For You', url: '/gifs/video-foryou.gif' },
  { category: 'TikTok', title: 'Tendência Viral', url: '/gifs/tendencia-viral.gif' },
  { category: 'TikTok', title: 'Dancinha do Sucesso', url: '/gifs/dancinha-sucesso.gif' },

  // Risada
  { category: 'Risada', title: 'Risadas em Grupo', url: '/gifs/risadas-grupo.gif' },
  { category: 'Risada', title: 'Gargalhada de Alegria', url: '/gifs/gargalhada-alegria.gif' },
  { category: 'Risada', title: 'Meme Engraçado', url: '/gifs/meme-engracado.gif' },

  // Aprovação
  { category: 'Aprovação', title: 'Joinha e Like', url: '/gifs/joinha-like.gif' },
  { category: 'Aprovação', title: 'Mindset Aprovado', url: '/gifs/mindset-aprovado.gif' },
  { category: 'Aprovação', title: 'Nota 10', url: '/gifs/nota-10.gif' },
];

export const GIF_CATEGORIES = [
  'Tudo',
  'Comemoração',
  'Dinheiro',
  'Vendas',
  'Viral',
  'Motivação',
  'Sucesso',
  'IA',
  'TikTok',
  'Risada',
  'Aprovação',
];

export const GifStickerPicker: React.FC<GifStickerPickerProps> = ({
  isOpen,
  onClose,
  onSelectSticker,
  onSelectGif,
}) => {
  const [activeTab, setActiveTab] = useState<'STICKERS' | 'GIFS'>('STICKERS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGifCategory, setSelectedGifCategory] = useState('Tudo');
  const [failedGifs, setFailedGifs] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleGifError = (url: string) => {
    setFailedGifs((prev) => {
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  };

  const filteredStickers = OFFICIAL_STICKERS.filter(
    (st) =>
      st.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGifs = CURATED_GIFS.filter((g) => {
    if (failedGifs.has(g.url)) return false;
    const matchesCategory =
      selectedGifCategory === 'Tudo' || g.category === selectedGifCategory;
    const matchesSearch =
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="absolute bottom-full left-2 right-2 sm:left-4 sm:right-auto sm:w-[420px] mb-2 bg-[#111b21] border border-slate-700/80 rounded-2xl shadow-2xl z-40 overflow-hidden flex flex-col max-h-[440px] animate-fade-in select-none">
      {/* Header Tabs */}
      <div className="bg-[#1f2c34] p-2.5 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('STICKERS');
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'STICKERS'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-300" />
            <span>Adesivos ({OFFICIAL_STICKERS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('GIFS');
              setSearchQuery('');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'GIFS'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-cyan-300" />
            <span>GIFs ({CURATED_GIFS.length - failedGifs.size})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-2.5 bg-[#182229] border-b border-slate-700/60 space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'STICKERS'
                ? 'Pesquisar adesivos (ex: Vendas, IA, Viral)...'
                : 'Pesquisar GIFs no Geração Z...'
            }
            className="w-full bg-[#1f2c34] border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Category Pills for GIFs */}
        {activeTab === 'GIFS' && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar text-[11px]">
            {GIF_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedGifCategory(cat)}
                className={`px-2.5 py-0.5 rounded-lg font-medium whitespace-nowrap transition-all cursor-pointer ${
                  selectedGifCategory === cat
                    ? 'bg-teal-600 text-white font-bold'
                    : 'bg-[#1f2c34] text-slate-300 hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="p-3 overflow-y-auto custom-scrollbar flex-1">
        {activeTab === 'STICKERS' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filteredStickers.map((st) => (
              <button
                key={st.code}
                type="button"
                onClick={() => {
                  onSelectSticker(st);
                  onClose();
                }}
                className="p-2.5 bg-[#1f2c34] hover:bg-[#2a3942] border border-emerald-500/20 hover:border-emerald-500/60 rounded-2xl flex flex-col items-center text-center transition-all group active:scale-95 cursor-pointer shadow-md"
              >
                <span className="text-2xl mb-1 group-hover:scale-125 transition-transform">
                  {st.icon}
                </span>
                <span className="text-xs font-bold text-white leading-tight">
                  {st.title}
                </span>
                <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                  {st.description}
                </span>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'GIFS' && (
          <div>
            {filteredGifs.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredGifs.map((gif, idx) => (
                  <button
                    key={`${gif.url}-${idx}`}
                    type="button"
                    onClick={() => {
                      onSelectGif(gif.url);
                      onClose();
                    }}
                    className="relative rounded-xl overflow-hidden border border-slate-700/60 hover:border-emerald-500 transition-all group cursor-pointer aspect-video bg-black/40"
                  >
                    <img
                      src={gif.url}
                      alt={gif.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                      onError={() => handleGifError(gif.url)}
                    />
                    <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black/80 to-transparent text-[10px] text-slate-200 truncate font-semibold">
                      {gif.title}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                Nenhum GIF encontrado para essa pesquisa.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
