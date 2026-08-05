import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Image as ImageIcon, AlertCircle, RefreshCw, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { CompressedImageResult, formatBytes } from '../../utils/chatImageUtils';

interface ImagePreviewModalProps {
  imageResult: CompressedImageResult | null;
  onCancel: () => void;
  onSend: (caption: string) => Promise<void>;
  isUploading: boolean;
  uploadProgress?: number;
  errorMessage?: string | null;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  imageResult,
  onCancel,
  onSend,
  isUploading,
  uploadProgress = 0,
  errorMessage,
}) => {
  const [caption, setCaption] = useState('');
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoadingImage, setIsLoadingImage] = useState(true);
  const [hasImageError, setHasImageError] = useState(false);
  const backdropRef = useRef<HTMLDivElement | null>(null);

  // Manage object URL lifecycle safely
  useEffect(() => {
    if (!imageResult) return;

    let url = '';
    if (imageResult.file) {
      try {
        url = URL.createObjectURL(imageResult.file);
      } catch (err) {
        url = imageResult.base64 || '';
      }
    } else {
      url = imageResult.base64 || '';
    }

    setPreviewUrl(url);
    setIsLoadingImage(true);
    setHasImageError(false);

    return () => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    };
  }, [imageResult]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, []);

  // Handle Escape key safely
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isUploading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, isUploading]);

  if (!imageResult) return null;
  if (typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;
    await onSend(caption);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current && !isUploading) {
      onCancel();
    }
  };

  const isStorageNotConfigured =
    Boolean(errorMessage) &&
    (errorMessage.includes('CHAT_STORAGE_NOT_CONFIGURED') ||
      errorMessage.includes('CHAT_MEDIA_PUBLIC_BASE_URL') ||
      errorMessage.includes('Variável CHAT_MEDIA_PUBLIC_BASE_URL'));

  const modalContent = (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[520px] max-h-[calc(100dvh-24px)] bg-[#111b21] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0b141a]">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Pré-visualização da foto</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-40 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center bg-[#0d161c] gap-3">
          {/* Image Display Box */}
          <div className="relative w-full min-h-[220px] max-h-[320px] rounded-xl overflow-hidden border border-slate-700/60 bg-black/50 shadow-inner flex items-center justify-center p-2">
            {isLoadingImage && !hasImageError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d161c] text-cyan-300 gap-2 z-10 animate-pulse">
                <Loader2 className="w-7 h-7 animate-spin text-cyan-400" />
                <span className="text-xs font-medium">Carregando imagem...</span>
              </div>
            )}

            {hasImageError ? (
              <div className="flex flex-col items-center justify-center p-4 text-center text-red-400 space-y-1">
                <AlertCircle className="w-6 h-6 text-amber-500" />
                <span className="text-xs font-semibold">Erro ao carregar pré-visualização.</span>
              </div>
            ) : (
              <img
                src={previewUrl || imageResult.base64}
                alt="Pré-visualização"
                onLoad={() => setIsLoadingImage(false)}
                onError={() => {
                  setIsLoadingImage(false);
                  setHasImageError(true);
                }}
                className={`max-w-full max-h-[300px] w-auto h-auto object-contain rounded-lg transition-opacity duration-300 ${
                  isLoadingImage ? 'opacity-0' : 'opacity-100'
                }`}
              />
            )}
          </div>

          {/* Metadata info */}
          <div className="w-full flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="truncate max-w-[200px]" title={imageResult.name}>
              {imageResult.name}
            </span>
            <span className="font-mono bg-slate-800/80 px-2 py-0.5 rounded text-cyan-300">
              {formatBytes(imageResult.size)} • {imageResult.width}x{imageResult.height}px
            </span>
          </div>

          {/* Upload Progress Indicator */}
          {isUploading && (
            <div className="w-full bg-slate-800/90 border border-slate-700 rounded-xl p-3 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between text-xs text-cyan-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  Enviando foto...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(uploadProgress, 5)}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Banner: Friendly Preview Storage Notice */}
          {errorMessage && !isUploading && (
            isStorageNotConfigured ? (
              <div className="w-full p-3.5 bg-amber-950/80 border border-amber-500/50 rounded-xl flex flex-col gap-2 text-amber-200 text-xs animate-fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-amber-300">
                      Upload em ambiente de Preview
                    </p>
                    <p className="text-amber-200/90 leading-relaxed">
                      Upload externo ainda não está configurado neste ambiente de Preview. A imagem poderá ser enviada após configurar o storage da Hostinger/Vercel.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-500/30 flex flex-col gap-1 text-[11px] text-amber-300/80">
                  <button
                    type="button"
                    onClick={() => setShowTechDetails((prev) => !prev)}
                    className="flex items-center gap-1 font-mono hover:underline cursor-pointer self-start"
                  >
                    <span>Detalhes técnicos</span>
                    {showTechDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {showTechDetails && (
                    <div className="p-2 bg-black/40 rounded-lg font-mono text-[10px] text-amber-400 break-all border border-amber-500/20">
                      Detalhes técnicos: CHAT_MEDIA_PUBLIC_BASE_URL ausente.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full p-3 bg-red-950/80 border border-red-500/50 rounded-xl flex items-start gap-2.5 text-red-200 text-xs">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p>{errorMessage}</p>
                </div>
              </div>
            )
          )}

          {/* Caption Input */}
          <form id="image-send-form" onSubmit={handleSubmit} className="w-full mt-1">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Legenda opcional
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Adicione uma legenda à foto..."
              maxLength={1000}
              disabled={isUploading}
              className="w-full px-3.5 py-2.5 bg-[#182229] border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
            />
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-slate-800 bg-[#0b141a] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isUploading}
            className="min-h-[44px] px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-all disabled:opacity-40 cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="submit"
            form="image-send-form"
            disabled={isUploading}
            className="min-h-[44px] px-5 py-2.5 text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-emerald-400 hover:brightness-110 active:scale-95 rounded-xl transition-all shadow-md shadow-cyan-950/50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando...</span>
              </>
            ) : errorMessage ? (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Tentar novamente</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar foto</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

