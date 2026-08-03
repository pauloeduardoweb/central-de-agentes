import React, { useState } from 'react';
import { Search, Flame, Rocket, DollarSign, Bot, Trophy, Crown, Smile, Image as ImageIcon, X } from 'lucide-react';

interface GifStickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (sticker: { code: string; title: string; icon: string }) => void;
  onSelectGif: (gifUrl: string) => void;
}

const OFFICIAL_STICKERS = [
  { code: 'STICKER_VIRAL', title: 'Viral', icon: '🔥', description: 'Post viralizou no TikTok!' },
  { code: 'STICKER_RESULTADO', title: 'Resultado', icon: '🚀', description: 'Meta batida e vendas caindo' },
  { code: 'STICKER_VENDA', title: 'Venda', icon: '💰', description: 'Comissão recebida na conta' },
  { code: 'STICKER_IA', title: 'IA', icon: '🤖', description: 'Automação criada com sucesso' },
  { code: 'STICKER_TOP', title: 'Top', icon: '🏆', description: 'Ranked Top Aluno da Semana' },
  { code: 'STICKER_MENTOR', title: 'Mentor', icon: '👑', description: 'Orientação do Mentor Bigode' },
];

const CURATED_GIFS = [
  { title: 'Comemoração Festa', url: 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif' },
  { title: 'Dinheiro Vendas', url: 'https://media.giphy.com/media/LdOyjZ7io5Msw/giphy.gif' },
  { title: 'Sucesso Mindset', url: 'https://media.giphy.com/media/3o7TKP7yvT1Bvh7M2c/giphy.gif' },
  { title: 'Motivação Fogo', url: 'https://media.giphy.com/media/l0IybQ6l8J455FuZX/giphy.gif' },
  { title: 'Surpresa Uau', url: 'https://media.giphy.com/media/5vkx5R161nQG4/giphy.gif' },
  { title: 'Risada KKK', url: 'https://media.giphy.com/media/10JhvoUG6Jotao/giphy.gif' },
  { title: 'Aprovação Like', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
  { title: 'Viral Chamas', url: 'https://media.giphy.com/media/xT0xezQGU5xCDJuCPe/giphy.gif' },
  { title: 'Foco Trabalho', url: 'https://media.giphy.com/media/d31w24psGYeedC64/giphy.gif' },
  { title: 'Foguete Subindo', url: 'https://media.giphy.com/media/mi6f94v6yQS5i/giphy.gif' },
  { title: 'Vencedor Campeão', url: 'https://media.giphy.com/media/nUxC6MRNmw32E/giphy.gif' },
  { title: 'Energia Maxima', url: 'https://media.giphy.com/media/l41YtZOb9EUwklMlt/giphy.gif' },
];

export const GifStickerPicker: React.FC<GifStickerPickerProps> = ({
  isOpen,
  onClose,
  onSelectSticker,
  onSelectGif,
}) => {
  const [activeTab, setActiveTab] = useState<'STICKERS' | 'GIFS'>('STICKERS');
  const [searchQuery, setSearchQuery] = useState('');
  const [failedGifs, setFailedGifs] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleGifError = (url: string) => {
    setFailedGifs((prev) => {
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  };

  const filteredGifs = CURATED_GIFS.filter(
    (g) => !failedGifs.has(g.url) && g.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="absolute bottom-full left-2 right-2 sm:left-4 sm:right-auto sm:w-96 mb-2 bg-[#111b21] border border-slate-700/80 rounded-2xl shadow-2xl z-40 overflow-hidden flex flex-col max-h-[380px] animate-fade-in">
      {/* Header Tabs */}
      <div className="bg-[#1f2c34] p-2 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('STICKERS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'STICKERS'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-300" />
            <span>Stickers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GIFS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'GIFS'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-cyan-300" />
            <span>GIFs</span>
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

      {/* Content Area */}
      <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-3">
        {activeTab === 'STICKERS' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {OFFICIAL_STICKERS.map((st) => (
              <button
                key={st.code}
                type="button"
                onClick={() => {
                  onSelectSticker(st);
                  onClose();
                }}
                className="p-3 bg-[#1f2c34] hover:bg-[#2a3942] border border-emerald-500/20 hover:border-emerald-500/60 rounded-2xl flex flex-col items-center text-center transition-all group active:scale-95 cursor-pointer shadow-md"
              >
                <span className="text-3xl mb-1 group-hover:scale-125 transition-transform">
                  {st.icon}
                </span>
                <span className="text-xs font-bold text-white">
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
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar GIFs no Geração Z..."
                className="w-full bg-[#1f2c34] border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {filteredGifs.map((gif, idx) => (
                <button
                  key={idx}
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
          </div>
        )}
      </div>
    </div>
  );
};
