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
  isOwn = false,
  onOpenViewer,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="flex flex-col gap-1.5 w-auto max-w-[78vw] sm:max-w-[320px] md:max-w-[420px]">
      <div
        onClick={onOpenViewer}
        className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-black/20 group cursor-pointer transition-all hover:brightness-105 active:scale-[0.99] w-auto max-w-full max-h-[55vh] flex items-center justify-center"
      >
        {/* Skeleton loading state */}
        {isLoading && (
          <div className="absolute inset-0 min-h-[140px] bg-slate-800/80 animate-pulse flex items-center justify-center rounded-xl">
            <ImageIcon className="w-8 h-8 text-slate-600 animate-bounce" />
          </div>
        )}

        {/* Image Error state */}
        {hasError ? (
          <div className="min-h-[120px] w-full bg-slate-900 flex flex-col items-center justify-center text-slate-400 p-3 text-center gap-1.5 rounded-xl">
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
            className={`w-auto h-auto max-w-full max-h-[55vh] object-contain rounded-xl transition-opacity duration-300 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
          />
        )}

        {/* Hover zoom icon badge */}
        {!isLoading && !hasError && (
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none rounded-xl">
            <span className="bg-black/60 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-full font-medium">
              Clique para ampliar
            </span>
          </div>
        )}
      </div>

      {/* Caption text below image */}
      {caption && (
        <p className={`text-xs sm:text-sm leading-snug px-1 break-words ${isOwn ? 'text-slate-100' : 'text-slate-800'}`}>
          {caption}
        </p>
      )}
    </div>
  );
};
