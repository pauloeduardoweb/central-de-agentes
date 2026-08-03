import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface AvatarViewerProps {
  imageUrl: string | null;
  nickname: string;
  onClose: () => void;
}

export const AvatarViewer: React.FC<AvatarViewerProps> = ({ imageUrl, nickname, onClose }) => {
  const [scale, setScale] = useState(1);

  // Lock background body scroll
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, []);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!imageUrl) return null;
  if (typeof document === 'undefined') return null;

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.5, 0.8));
  const handleReset = () => setScale(1);

  const modalContent = (
    <div 
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-between bg-black/95 backdrop-blur-xl p-4 transition-all duration-300 select-none"
      onClick={onClose}
    >
      {/* Header toolbar */}
      <div 
        className="w-full flex items-center justify-between max-w-xl text-white px-2 py-3 border-b border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg text-emerald-400">{nickname}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Reduzir zoom"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Restaurar tamanho"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors ml-2 cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Image container */}
      <div 
        className="flex-1 flex items-center justify-center overflow-hidden w-full max-w-3xl py-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={`Foto de perfil de ${nickname}`}
          style={{ transform: `scale(${scale})` }}
          className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl transition-transform duration-200 cursor-grab active:cursor-grabbing border border-white/10"
        />
      </div>

      {/* Footer instruction */}
      <div className="text-center text-xs text-emerald-400/80 mb-2 font-mono">
        Clique fora ou no X para fechar | Pinçar ou use os botões para zoom
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

