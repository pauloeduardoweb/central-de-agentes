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
  { category: 'Comemoração', title: 'Festa Celebração', url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif' },
  { category: 'Comemoração', title: 'Confetes e Alegria', url: 'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif' },
  { category: 'Comemoração', title: 'Dança da Vitória', url: 'https://media.giphy.com/media/26n6R5HOYPbekK0YE/giphy.gif' },

  // Dinheiro
  { category: 'Dinheiro', title: 'Chuva de Dinheiro', url: 'https://media.giphy.com/media/LdOyjZ7io5Msw/giphy.gif' },
  { category: 'Dinheiro', title: 'Contando Notas', url: 'https://media.giphy.com/media/67ThRZlYBvibtdF9JH/giphy.gif' },
  { category: 'Dinheiro', title: 'Rico em Vendas', url: 'https://media.giphy.com/media/xT0xezQGU5xCDJuCPe/giphy.gif' },

  // Vendas
  { category: 'Vendas', title: 'Notificação caindo', url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif' },
  { category: 'Vendas', title: 'Meta Batida', url: 'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif' },
  { category: 'Vendas', title: 'Lucro Garantido', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },

  // Viral
  { category: 'Viral', title: 'Explosão de Views', url: 'https://media.giphy.com/media/qs6ev2pm8g9dS/giphy.gif' },
  { category: 'Viral', title: 'Fogo e Chamas', url: 'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif' },
  { category: 'Viral', title: 'Bombando nas Redes', url: 'https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif' },

  // Motivação
  { category: 'Motivação', title: 'Foco no Trabalho', url: 'https://media.giphy.com/media/11ebonMs90YLu/giphy.gif' },
  { category: 'Motivação', title: 'Determinação Total', url: 'https://media.giphy.com/media/d31w24psGYeekCXY/giphy.gif' },
  { category: 'Motivação', title: 'Foguete decolando', url: 'https://media.giphy.com/media/tXL4FHPSnVJ0A/giphy.gif' },

  // Sucesso
  { category: 'Sucesso', title: 'Troféu Campeão', url: 'https://media.giphy.com/media/l41YtZOb9EUwkiqT6/giphy.gif' },
  { category: 'Sucesso', title: 'Mestre nos Negócios', url: 'https://media.giphy.com/media/xT5LMHxhOfscxPfIfm/giphy.gif' },
  { category: 'Sucesso', title: 'Topo do Ranking', url: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif' },

  // IA
  { category: 'IA', title: 'Robô Inteligente', url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif' },
  { category: 'IA', title: 'Automação Ativa', url: 'https://media.giphy.com/media/26tn33aiTi1jkl6H6/giphy.gif' },
  { category: 'IA', title: 'Futuro da IA', url: 'https://media.giphy.com/media/l3tJ3ytpD9wOqA3cI/giphy.gif' },

  // TikTok
  { category: 'TikTok', title: 'Vídeo na For You', url: 'https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif' },
  { category: 'TikTok', title: 'Tendência Viral', url: 'https://media.giphy.com/media/3o7TKP9ln2Dr6ze6f6/giphy.gif' },
  { category: 'TikTok', title: 'Dancinha do Sucesso', url: 'https://media.giphy.com/media/l0AMJL97Jv2Lw1f3y/giphy.gif' },

  // Risada
  { category: 'Risada', title: 'Risadas em Grupo', url: 'https://media.giphy.com/media/10JhvtGP90VHEQ/giphy.gif' },
  { category: 'Risada', title: 'Gargalhada de Alegria', url: 'https://media.giphy.com/media/COYGe9rZvfR0Q/giphy.gif' },
  { category: 'Risada', title: 'Meme Engraçado', url: 'https://media.giphy.com/media/l1J9u3TZnp283vG76/giphy.gif' },

  // Aprovação
  { category: 'Aprovação', title: 'Joinha e Like', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
  { category: 'Aprovação', title: 'Mindset Aprovado', url: 'https://media.giphy.com/media/3o7qDYEeUybWOv5msE/giphy.gif' },
  { category: 'Aprovação', title: 'Nota 10', url: 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif' },
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
