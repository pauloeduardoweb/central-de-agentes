import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, AlertCircle, RefreshCw } from 'lucide-react';

interface ChatImageMessageProps {
  imageUrl: string;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  isOwn?: boolean;
  onOpenViewer: () => void;
}

export const ChatImageMessage: React.FC<ChatImageMessageProps> = ({
  imageUrl,
  caption,
  width,
  height,
  onOpenViewer,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  const cleanCaption = caption && caption.trim() ? caption.trim() : null;

  // Compute aspect ratio if dimensions available
  const aspectRatio = width && height && width > 0 && height > 0 ? `${width} / ${height}` : undefined;

  // Handle cached or pre-loaded images where onLoad doesn't fire
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);

    if (!imageUrl) {
      setIsLoading(false);
      setHasError(true);
      return;
    }

    if (imgRef.current) {
      if (imgRef.current.complete) {
        if (imgRef.current.naturalWidth > 0) {
          setIsLoading(false);
          setHasError(false);
        } else {
          setIsLoading(false);
          setHasError(true);
        }
      }
    }
  }, [imageUrl, retryKey]);

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    setHasError(false);
    setRetryKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col gap-1 w-full max-w-[72vw] sm:max-w-[280px] md:max-w-[380px]">
      <div
        onClick={!hasError ? onOpenViewer : undefined}
        style={{ aspectRatio }}
        className="relative overflow-hidden rounded-xl border border-slate-700/30 bg-slate-900/40 group cursor-pointer transition-all hover:brightness-105 active:scale-[0.99] w-full min-w-[150px] min-h-[150px] max-h-[45vh] flex items-center justify-center"
      >
        {/* Skeleton loading state */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 bg-slate-800/80 animate-pulse flex items-center justify-center rounded-xl z-10 min-h-[150px]">
            <ImageIcon className="w-7 h-7 text-slate-500 animate-bounce" />
          </div>
        )}

        {/* Image Error state */}
        {hasError ? (
          <div className="min-h-[120px] w-full bg-slate-900/90 flex flex-col items-center justify-center text-slate-400 p-3 text-center gap-2 rounded-xl z-10">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <span className="text-xs font-medium text-slate-300">Imagem indisponível</span>
            <button
              onClick={handleRetry}
              className="flex items-center space-x-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg transition-colors border border-slate-700 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Tentar novamente</span>
            </button>
          </div>
        ) : (
          <img
            key={retryKey}
            ref={imgRef}
            src={imageUrl}
            alt={cleanCaption || 'Foto enviada no chat'}
            onLoad={() => {
              setIsLoading(false);
              setHasError(false);
            }}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            className={`w-full h-auto max-w-full max-h-[45vh] object-cover rounded-xl transition-opacity duration-300 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
          />
        )}

        {/* Hover zoom icon badge */}
        {!isLoading && !hasError && (
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded-xl z-20">
            <span className="bg-black/60 backdrop-blur-md text-white text-[11px] px-2.5 py-1 rounded-full font-medium">
              Clique para ampliar
            </span>
          </div>
        )}
      </div>

      {/* Caption text below image */}
      {cleanCaption && (
        <p className="text-xs sm:text-sm leading-snug px-0.5 pt-0.5 break-words text-[#111B21] font-normal">
          {cleanCaption}
        </p>
      )}
    </div>
  );
};
