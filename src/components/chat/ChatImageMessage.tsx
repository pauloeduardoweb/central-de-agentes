import React, { useState } from 'react';
import { Image as ImageIcon, AlertCircle } from 'lucide-react';

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
  isOwn = false,
  onOpenViewer,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Aspect ratio calculation
  const aspectRatio = width && height ? `${width} / ${height}` : '4 / 3';

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div
        onClick={onOpenViewer}
        className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-black/30 group cursor-pointer transition-all hover:brightness-105 active:scale-[0.99] max-w-[280px] sm:max-w-[340px]"
        style={{ aspectRatio }}
      >
        {/* Skeleton loading state */}
        {isLoading && (
          <div className="absolute inset-0 bg-slate-800/80 animate-pulse flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-slate-600 animate-bounce" />
          </div>
        )}

        {/* Image Error state */}
        {hasError ? (
          <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-400 p-3 text-center gap-1.5">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            <span className="text-xs">Não foi possível carregar a imagem.</span>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={caption || 'Foto enviada no chat'}
            loading="lazy"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
          />
        )}

        {/* Hover zoom icon badge */}
        {!isLoading && !hasError && (
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <span className="bg-black/60 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-full font-medium">
              Clique para ampliar
            </span>
          </div>
        )}
      </div>

      {/* Caption text below image */}
      {caption && (
        <p className={`text-xs sm:text-sm leading-snug px-1 break-words ${isOwn ? 'text-slate-100' : 'text-slate-200'}`}>
          {caption}
        </p>
      )}
    </div>
  );
};
