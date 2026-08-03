import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, RotateCcw, Download, Calendar, User } from 'lucide-react';

interface ImageViewerProps {
  imageUrl: string;
  caption?: string | null;
  authorName?: string;
  createdAt?: string;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  imageUrl,
  caption,
  authorName = 'Aluno',
  createdAt,
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const backdropRef = useRef<HTMLDivElement | null>(null);

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

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.5, 4));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.5, 1));
  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const formattedTime = createdAt
    ? new Date(createdAt).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const modalContent = (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[10000] flex flex-col bg-black/95 text-white animate-fade-in select-none"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/80 to-transparent z-20">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-cyan-300">
            <User className="w-4 h-4 text-cyan-400" />
            <span>{authorName}</span>
          </div>
          {formattedTime && (
            <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span>{formattedTime}</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            title="Reduzir zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            title="Resetar zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <a
            href={imageUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-cyan-600/80 hover:bg-cyan-500 text-white transition-colors cursor-pointer"
            title="Baixar imagem"
          >
            <Download className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-red-600/80 text-white transition-colors cursor-pointer ml-1"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center p-2 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={imageUrl}
          alt={caption || 'Imagem do chat'}
          className="max-w-full max-h-full object-contain transition-transform duration-100 ease-out rounded-lg shadow-2xl"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
        />
      </div>

      {/* Caption Overlay */}
      {caption && (
        <div className="p-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent text-center z-20">
          <p className="text-sm text-slate-200 max-w-2xl mx-auto leading-relaxed bg-slate-900/80 border border-slate-800 rounded-xl p-3 shadow-lg">
            {caption}
          </p>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};

