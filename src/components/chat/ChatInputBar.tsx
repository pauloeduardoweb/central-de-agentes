import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Smile, AlertCircle, CornerUpLeft, Mic, Square, Trash2, Flame, Image as ImageIcon } from 'lucide-react';
import { ChatMessage } from './ChatMessageList';
import { MentionsAutocomplete, MentionMember } from './MentionsAutocomplete';
import { ImageAttachmentButton } from './ImageAttachmentButton';
import { ImagePreviewModal } from './ImagePreviewModal';
import { GifStickerPicker } from './GifStickerPicker';
import { compressAndPrepareImage, CompressedImageResult } from '../../utils/chatImageUtils';
import { chatApiFetch } from '../../services/chatApi';

interface ChatInputBarProps {
  onSendMessage: (
    content: string,
    replyToId?: number | null,
    extraData?: {
      message_type?: 'TEXT' | 'IMAGE' | 'AUDIO' | 'STICKER' | 'GIF';
      image_url?: string;
      image_width?: number;
      image_height?: number;
      image_size?: number;
      image_mime?: string;
      caption?: string;
    }
  ) => Promise<{ success: boolean; error?: string }>;
  onUploadImage?: (
    fileData: CompressedImageResult
  ) => Promise<{
    success: boolean;
    imageUrl?: string;
    width?: number;
    height?: number;
    size?: number;
    mime?: string;
    error?: string;
  }>;
  onTyping?: (isTyping: boolean) => void;
  replyToMessage?: ChatMessage | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  members?: MentionMember[];
  externalInputContent?: string;
  onClearExternalInput?: () => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  onSendMessage,
  onUploadImage,
  onTyping,
  replyToMessage,
  onCancelReply,
  disabled = false,
  members = [],
  externalInputContent,
  onClearExternalInput,
}) => {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifStickerPicker, setShowGifStickerPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  // Audio Recording state
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioTimerRef = useRef<any>(null);
  const audioDurationRef = useRef(0);
  const audioStartedAtRef = useRef<number | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Mobile attachments menu state
  const [showMobileToolsMenu, setShowMobileToolsMenu] = useState(false);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);

  const handleMobileFileClick = () => {
    setShowMobileToolsMenu(false);
    mobileFileInputRef.current?.click();
  };

  // Photo Attachment state
  const [selectedImage, setSelectedImage] = useState<CompressedImageResult | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string | null>(null);

  const EMOJI_LIST = ['🔥', '⚡', '🚀', '👏', '🎯', '💡', '💰', '💪', '❤️', '🙌', '🎉', '🏆', '😎', '🤖', '👍', '👎', '🥳', '💯', '💎', '✨', '📌', '💬', '🚨', '🎓', '📈'];

  useEffect(() => {
    if (externalInputContent !== undefined && externalInputContent !== null) {
      setContent(externalInputContent);
      if (onClearExternalInput) onClearExternalInput();
    }
  }, [externalInputContent, onClearExternalInput]);

  // Audio recording handlers
  const startRecordingAudio = async () => {
    setErrorMsg(null);
    const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Este navegador não oferece suporte à gravação de áudio.');
      return;
    }
    if (!window.MediaRecorder) {
      setErrorMsg('A gravação de áudio não está disponível neste navegador.');
      return;
    }

    // Determine supported audio MIME type across browsers (Chrome, Firefox, Safari/iOS, Android)
    const possibleMimes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/aac',
      'audio/mpeg',
    ];
    let selectedMime = 'audio/webm';
    for (const m of possibleMimes) {
      if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(m)) {
        selectedMime = m;
        break;
      }
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
    } catch (err: any) {
      console.warn('[AUDIO RECORD PERMISSION ERROR]', err);
      const errName = err?.name || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError' || err?.message?.includes('Permission denied')) {
        if (isEmbedded) {
          setErrorMsg('O microfone pode estar bloqueado pelo ambiente de Preview. Teste o áudio no aplicativo publicado ou abra a prévia em uma nova aba.');
        } else {
          setErrorMsg('O acesso ao microfone foi bloqueado. Libere a permissão do microfone nas configurações do navegador e tente novamente.');
        }
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setErrorMsg('Nenhum microfone foi encontrado neste dispositivo.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setErrorMsg('O microfone está sendo usado por outro aplicativo ou não está disponível.');
      } else if (errName === 'SecurityError') {
        setErrorMsg('O navegador bloqueou o microfone neste ambiente. Abra o aplicativo publicado em uma aba normal e tente novamente.');
      } else if (errName === 'AbortError') {
        setErrorMsg('A gravação de áudio foi interrompida pelo sistema ou navegador.');
      } else {
        if (isEmbedded) {
          setErrorMsg('O microfone pode estar bloqueado pelo ambiente de Preview. Teste o áudio no aplicativo publicado ou abra a prévia em uma nova aba.');
        } else {
          setErrorMsg(err?.message || 'Erro ao acessar o microfone. Verifique as permissões do seu navegador.');
        }
      }
      return;
    }

    try {
      const mediaRecorderOptions = selectedMime ? { mimeType: selectedMime } : undefined;
      const mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('[AUDIO MEDIARECORDER ERROR]', event);
        setErrorMsg('Ocorreu um erro durante a gravação do áudio.');
        setIsRecordingAudio(false);
      };

      mediaRecorder.onstop = async () => {
        const elapsedByClock = audioStartedAtRef.current
          ? Math.max(1, Math.round((Date.now() - audioStartedAtRef.current) / 1000))
          : 1;

        const finalDuration = Math.max(
          1,
          audioDurationRef.current,
          elapsedByClock
        );

        const finalMime =
          mediaRecorder.mimeType ||
          selectedMime ||
          audioChunksRef.current[0]?.type ||
          'audio/webm';

        const audioBlob = new Blob(audioChunksRef.current, {
          type: finalMime,
        });

        console.log('[AUDIO]', {
          chunks: audioChunksRef.current.length,
          sizes: audioChunksRef.current.map(c => c.size),
          finalBlob: audioBlob.size
        });

        const cleanupResources = () => {
          if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach((track) => track.stop());
            audioStreamRef.current = null;
          }
          if (audioTimerRef.current) {
            clearInterval(audioTimerRef.current);
            audioTimerRef.current = null;
          }
          audioStartedAtRef.current = null;
          mediaRecorderRef.current = null;
          setIsRecordingAudio(false);
        };

        if (audioChunksRef.current.length === 0 || audioBlob.size === 0) {
          setErrorMsg(
            'Nenhum áudio foi capturado. Verifique a permissão do microfone e tente novamente.'
          );
          cleanupResources();
          audioChunksRef.current = [];
          return;
        }

        console.log('[AUDIO FRONTEND BLOB]', {
          blobSize: audioBlob.size,
          blobType: audioBlob.type,
          chunks: audioChunksRef.current.length,
          chunkSizes: audioChunksRef.current.map(chunk => chunk.size),
        });

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const rawResult = String(reader.result || '');
          const base64Only = rawResult.includes(',')
            ? rawResult.split(',')[1]
            : rawResult;

          console.log('[AUDIO FRONTEND BASE64]', {
            dataUrlLength: rawResult.length,
            base64Length: base64Only.length,
            prefix: rawResult.slice(0, 80),
          });

          const base64data = rawResult;

          try {
            // Call backend media upload endpoint
            const uploadRes = await chatApiFetch('/api/chat/upload', {
              method: 'POST',
              body: {
                base64: base64data,
                mime: finalMime,
                mediaType: 'AUDIO',
                duration: finalDuration,
              },
            });

            if (!uploadRes.ok || !uploadRes.data?.success) {
              const serverErr = uploadRes.error || uploadRes.data?.error || 'AUDIO_UPLOAD_FAILED';
              let friendly = 'Falha ao realizar upload do áudio.';

              if (serverErr === 'CHAT_SUSPENDED') friendly = 'Sua conta está suspensa temporariamente.';
              else if (serverErr === 'CHAT_BANNED') friendly = 'Sua conta foi banida do bate-papo.';
              else if (serverErr === 'UNAUTHORIZED' || serverErr === 'INVALID_SESSION') friendly = 'Sessão expirada. Atualize a página e tente novamente.';
              else if (serverErr === 'ROOM_MEMBERSHIP_REQUIRED') friendly = 'Você precisa estar inscrito na sala para enviar áudios.';
              else if (serverErr.includes('CHAT_STORAGE_NOT_CONFIGURED')) friendly = 'Serviço de armazenamento de áudio não configurado no servidor.';
              else if (serverErr === 'AUDIO_TOO_LARGE') friendly = 'O áudio excede o tamanho máximo permitido.';
              else if (uploadRes.data?.message) friendly = uploadRes.data.message;

              setErrorMsg(friendly);
              // CRITICAL: Do NOT create ghost message or grant XP if upload failed!
              return;
            }

            const finalAudioUrl = uploadRes.data?.media?.url || uploadRes.data?.audioUrl;
            if (!finalAudioUrl) {
              setErrorMsg('Não foi possível obter a URL do áudio enviado.');
              return;
            }

            const sendRes = await onSendMessage('🎙️ Mensagem de voz', replyToMessage?.id || null, {
              message_type: 'AUDIO',
              image_url: finalAudioUrl,
            });

            if (!sendRes.success) {
              setErrorMsg(sendRes.error || 'Erro ao enviar mensagem de áudio.');
            } else {
              if (onCancelReply) onCancelReply();
            }
          } catch (err: any) {
            setErrorMsg(err?.message || 'Erro de conexão ao enviar áudio.');
          } finally {
            cleanupResources();
            audioChunksRef.current = [];
          }
        };
      };

      mediaRecorder.start(250);
      setIsRecordingAudio(true);

      audioStartedAtRef.current = Date.now();
      audioDurationRef.current = 0;
      setAudioDuration(0);

      if (audioTimerRef.current) {
        clearInterval(audioTimerRef.current);
      }

      audioTimerRef.current = window.setInterval(() => {
        const startedAt = audioStartedAtRef.current;

        if (!startedAt) return;

        const elapsed = Math.max(
          0,
          Math.floor((Date.now() - startedAt) / 1000)
        );

        audioDurationRef.current = elapsed;
        setAudioDuration(elapsed);
      }, 250);
    } catch (err: any) {
      console.warn('[AUDIO MEDIARECORDER INIT ERROR]', err);
      setErrorMsg('Não foi possível iniciar a gravação de áudio neste navegador.');
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      audioStreamRef.current = null;
    }
  };

  const stopAndSendAudio = () => {
    const recorder = mediaRecorderRef.current;

    if (!recorder) {
      setErrorMsg('O gravador de áudio não está disponível.');
      return;
    }

    if (audioTimerRef.current) {
      clearInterval(audioTimerRef.current);
      audioTimerRef.current = null;
    }

    if (audioStartedAtRef.current) {
      const elapsed = Math.max(
        1,
        Math.round(
          (Date.now() - audioStartedAtRef.current) / 1000
        )
      );

      audioDurationRef.current = elapsed;
      setAudioDuration(elapsed);
    }

    setIsRecordingAudio(false);

    try {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      } else {
        setErrorMsg('A gravação já foi encerrada.');
      }
    } catch (err: any) {
      setErrorMsg(
        err?.message || 'Não foi possível finalizar o áudio.'
      );
    }
  };

  const cancelAudioRecording = () => {
    if (audioTimerRef.current) {
      clearInterval(audioTimerRef.current);
      audioTimerRef.current = null;
    }
    audioStartedAtRef.current = null;
    audioDurationRef.current = 0;
    audioChunksRef.current = [];

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null;
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {}
      mediaRecorderRef.current = null;
    }

    setAudioDuration(0);
    setIsRecordingAudio(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    if (onTyping) {
      onTyping(val.trim().length > 0);
    }

    const match = val.match(/@([a-zA-Z0-9._\s\-\u00C0-\u00FF]*)$/);
    if (match) {
      setMentionQuery(match[1]);
    } else {
      setMentionQuery(null);
    }
  };

  const handleSelectMention = (nickname: string) => {
    if (mentionQuery !== null) {
      const regex = new RegExp(`@${mentionQuery}$`);
      const newText = content.replace(regex, `@${nickname} `);
      setContent(newText);
      setMentionQuery(null);
    }
  };

  const handleFileSelect = async (file: File) => {
    setErrorMsg(null);
    setUploadErrorMsg(null);
    try {
      const compressed = await compressAndPrepareImage(file);
      setSelectedImage(compressed);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao processar imagem selecionada.');
    }
  };

  const handleSendPhoto = async (caption: string) => {
    if (!selectedImage || isUploadingImage) return;

    setIsUploadingImage(true);
    setUploadProgress(20);
    setUploadErrorMsg(null);

    try {
      if (!onUploadImage) {
        throw new Error('Serviço de upload indisponível.');
      }

      setUploadProgress(50);
      const uploadRes = await onUploadImage(selectedImage);
      const finalUrl = (uploadRes as any)?.image?.url || uploadRes.imageUrl;
      if (!uploadRes.success || !finalUrl) {
        throw new Error(uploadRes.error || 'Erro ao realizar upload da foto.');
      }

      setUploadProgress(85);

      const sendRes = await onSendMessage(caption || '[Imagem]', replyToMessage?.id || null, {
        message_type: 'IMAGE',
        image_url: finalUrl,
        image_width: uploadRes.width || selectedImage.width,
        image_height: uploadRes.height || selectedImage.height,
        image_size: uploadRes.size || selectedImage.size,
        image_mime: uploadRes.mime || selectedImage.mime,
        caption: caption.trim() || undefined,
      });

      if (!sendRes.success) {
        throw new Error(sendRes.error || 'Erro ao enviar mensagem com foto.');
      }

      setUploadProgress(100);
      setSelectedImage(null);
      if (onCancelReply) onCancelReply();
    } catch (err: any) {
      setUploadErrorMsg(err?.message || 'Erro ao enviar a imagem.');
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const handleSendSticker = async (sticker: { code: string; title: string; icon: string }) => {
    try {
      await onSendMessage(`${sticker.icon} Sticker: ${sticker.title}`, replyToMessage?.id || null, {
        message_type: 'STICKER',
        image_url: sticker.icon,
      });
      if (onCancelReply) onCancelReply();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao enviar sticker.');
    }
  };

  const handleSendGif = async (gifUrl: string) => {
    try {
      await onSendMessage('👾 GIF enviado', replyToMessage?.id || null, {
        message_type: 'GIF',
        image_url: gifUrl,
      });
      if (onCancelReply) onCancelReply();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao enviar GIF.');
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const clean = content.trim();
    if (!clean) return;

    if (clean.length > 2000) {
      setErrorMsg('A mensagem excede o limite de 2000 caracteres.');
      return;
    }

    if (onTyping) onTyping(false);
    setSubmitting(true);
    try {
      const result = await onSendMessage(clean, replyToMessage?.id || null);
      if (!result.success) {
        setErrorMsg(result.error || 'Erro ao enviar mensagem.');
      } else {
        setContent('');
        if (onCancelReply) onCancelReply();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro de conexão ao enviar.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const gifButtonRef = useRef<HTMLButtonElement | null>(null);
  const gifPickerRef = useRef<HTMLDivElement | null>(null);

  // Close popovers on click outside or Escape key
  useEffect(() => {
    if (!showEmojiPicker && !showGifStickerPicker && !showMobileToolsMenu) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowEmojiPicker(false);
        setShowGifStickerPicker(false);
        setShowMobileToolsMenu(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(target) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(target)
      ) {
        setShowEmojiPicker(false);
      }
      if (
        showGifStickerPicker &&
        gifPickerRef.current &&
        !gifPickerRef.current.contains(target) &&
        gifButtonRef.current &&
        !gifButtonRef.current.contains(target)
      ) {
        setShowGifStickerPicker(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker, showGifStickerPicker, showMobileToolsMenu]);

  const toggleEmojiPicker = () => {
    setShowGifStickerPicker(false);
    setShowMobileToolsMenu(false);
    setShowEmojiPicker((prev) => !prev);
  };

  const toggleGifStickerPicker = () => {
    setShowEmojiPicker(false);
    setShowMobileToolsMenu(false);
    setShowGifStickerPicker((prev) => !prev);
  };

  const toggleMobileToolsMenu = () => {
    setShowEmojiPicker(false);
    setShowGifStickerPicker(false);
    setShowMobileToolsMenu((prev) => !prev);
  };

  const addEmoji = (emoji: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart || 0;
      const end = textareaRef.current.selectionEnd || 0;
      const updated = content.slice(0, start) + emoji + content.slice(end);
      setContent(updated);
      // Keep emoji picker open for multi-selection!
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = start + emoji.length;
          textareaRef.current.selectionStart = newPos;
          textareaRef.current.selectionEnd = newPos;
        }
      });
    } else {
      setContent((prev) => prev + emoji);
    }
  };

  const formatAudioTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-[#F0F2F5] border-t border-[#DADDE1] p-2.5 sm:p-3 relative z-20 text-[#111B21]">
      {/* Error Alert Banner */}
      {errorMsg && (
        <div className="mb-2 p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-600 hover:text-rose-800 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Reply Context Banner */}
      {replyToMessage && (
        <div className="mb-2 p-2.5 bg-[#FFFFFF] border-l-4 border-[#00A884] rounded-lg flex items-center justify-between text-xs text-[#111B21] border border-[#DADDE1]">
          <div className="flex items-center space-x-2 overflow-hidden">
            <CornerUpLeft className="w-4 h-4 text-[#00A884] shrink-0" />
            <div className="truncate">
              <span className="font-bold text-[#00A884] block text-[11px]">
                Respondendo {replyToMessage.author.nickname}
              </span>
              <span className="text-[#667781] truncate block text-[11px]">
                "{replyToMessage.content}"
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="p-1 rounded-full text-[#667781] hover:text-[#111B21] hover:bg-[#F0F2F5] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mentions Autocomplete Popover */}
      {mentionQuery !== null && (
        <MentionsAutocomplete
          query={mentionQuery}
          members={members}
          onSelectMember={handleSelectMention}
          onClose={() => setMentionQuery(null)}
        />
      )}

      {/* GIF & Sticker Picker Drawer */}
      <GifStickerPicker
        isOpen={showGifStickerPicker}
        onClose={() => setShowGifStickerPicker(false)}
        onSelectSticker={handleSendSticker}
        onSelectGif={handleSendGif}
      />

      {/* Quick Emoji Picker Drawer */}
      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="absolute bottom-full left-2 right-2 sm:left-3 sm:right-auto sm:max-w-md mb-2 p-2.5 bg-[#FFFFFF] border border-[#DADDE1] rounded-2xl shadow-xl z-30 overflow-hidden max-w-[calc(100vw-1rem)]">
          <div className="w-full max-w-full overflow-hidden flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {EMOJI_LIST.map((emoji, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl hover:bg-[#F0F2F5] text-lg sm:text-xl flex items-center justify-center transition-all active:scale-125 cursor-pointer shrink-0"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <ImagePreviewModal
          imageResult={selectedImage}
          onCancel={() => {
            if (!isUploadingImage) {
              setSelectedImage(null);
              setUploadErrorMsg(null);
            }
          }}
          onSend={handleSendPhoto}
          isUploading={isUploadingImage}
          uploadProgress={uploadProgress}
          errorMessage={uploadErrorMsg}
        />
      )}

      {/* Audio Recording Active State */}
      {isRecordingAudio ? (
        <div className="flex items-center justify-between bg-[#FFF4C6] border border-[#FDE68A] rounded-2xl p-2 px-4 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#00A884] animate-ping" />
            <span className="text-xs font-bold text-[#715B00] font-mono">
              Gravando Áudio: {formatAudioTime(audioDuration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelAudioRecording}
              className="p-2 rounded-xl bg-[#FFFFFF] hover:bg-[#F0F2F5] text-[#111B21] border border-[#DADDE1] text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Cancelar</span>
            </button>

            <button
              type="button"
              onClick={stopAndSendAudio}
              className="p-2 px-3 rounded-xl bg-[#00A884] hover:bg-[#008F72] text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1"
            >
              <Send className="w-4 h-4" />
              <span>Enviar Áudio</span>
            </button>
          </div>
        </div>
      ) : (
        /* Input Form */
        <form onSubmit={handleSend} className="flex items-end space-x-1.5 sm:space-x-2">
          {/* Mobile hidden file input for '+' menu photo upload */}
          <input
            ref={mobileFileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />

          {/* Mobile Tools Menu Popover */}
          {showMobileToolsMenu && (
            <div className="sm:hidden absolute bottom-full left-2 mb-2 w-48 p-2 bg-[#FFFFFF] border border-[#DADDE1] rounded-2xl shadow-xl z-40 space-y-1">
              <button
                type="button"
                onClick={() => { setShowMobileToolsMenu(false); setShowEmojiPicker(true); }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-[#111B21] hover:bg-[#F0F2F5] rounded-xl transition-colors font-medium cursor-pointer"
              >
                <Smile className="w-4 h-4 text-[#8A6500]" />
                <span>😃 Emoji</span>
              </button>
              <button
                type="button"
                onClick={() => { setShowMobileToolsMenu(false); setShowGifStickerPicker(true); }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-[#111B21] hover:bg-[#F0F2F5] rounded-xl transition-colors font-medium cursor-pointer"
              >
                <Flame className="w-4 h-4 text-[#00A884]" />
                <span>🎬 GIF & 🏷️ Sticker</span>
              </button>
              <button
                type="button"
                onClick={handleMobileFileClick}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-[#111B21] hover:bg-[#F0F2F5] rounded-xl transition-colors font-medium cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-[#00A884]" />
                <span>📷 Foto / Imagem</span>
              </button>
              <button
                type="button"
                onClick={() => { setShowMobileToolsMenu(false); startRecordingAudio(); }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-[#111B21] hover:bg-[#F0F2F5] rounded-xl transition-colors font-medium cursor-pointer"
              >
                <Mic className="w-4 h-4 text-[#00A884]" />
                <span>🎙️ Áudio</span>
              </button>
            </div>
          )}

          {/* Mobile [+] Button */}
          <button
            type="button"
            onClick={toggleMobileToolsMenu}
            disabled={disabled || submitting}
            aria-label="Abrir menu de anexos"
            className="sm:hidden min-w-[40px] min-h-[40px] p-2.5 rounded-xl bg-[#FFFFFF] active:bg-[#E9EDEF] text-[#00A884] border border-[#DADDE1] transition-colors shrink-0 flex items-center justify-center cursor-pointer font-bold text-lg"
            title="Anexar mídia ou áudio"
          >
            {showMobileToolsMenu ? '×' : '+'}
          </button>

          {/* Desktop Individual Tools (hidden on mobile) */}
          <div className="hidden sm:flex items-center space-x-1 shrink-0">
            {/* Emoji Button */}
            <button
              ref={emojiButtonRef}
              type="button"
              onClick={toggleEmojiPicker}
              disabled={disabled}
              className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-[#54656F] hover:text-[#111B21] hover:bg-[#FFFFFF] transition-colors shrink-0 flex items-center justify-center cursor-pointer"
              title="Inserir Emojis"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* GIF / Sticker Button */}
            <button
              ref={gifButtonRef}
              type="button"
              onClick={toggleGifStickerPicker}
              disabled={disabled}
              className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-[#54656F] hover:text-[#111B21] hover:bg-[#FFFFFF] transition-colors shrink-0 flex items-center justify-center cursor-pointer font-bold text-xs"
              title="Stickers e GIFs"
            >
              <Flame className="w-5 h-5 text-[#8A6500]" />
            </button>

            {/* Photo Attachment Button */}
            <ImageAttachmentButton onSelectFile={handleFileSelect} disabled={disabled || submitting} />

            {/* Mic Button */}
            <button
              type="button"
              onClick={startRecordingAudio}
              disabled={disabled || submitting}
              className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl text-[#54656F] hover:text-[#00A884] hover:bg-[#FFFFFF] transition-colors shrink-0 flex items-center justify-center cursor-pointer"
              title="Gravar Mensagem de Voz"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>

          {/* Text Input Area */}
          <div className="flex-1 bg-[#FFFFFF] rounded-2xl border border-[#DADDE1] px-3 py-1 focus-within:border-[#00A884] transition-colors flex items-center min-w-0">
            <textarea
              ref={textareaRef}
              rows={1}
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              disabled={disabled || submitting}
              placeholder={
                disabled
                  ? 'Bate-papo desativado'
                  : 'Mensagem...'
              }
              maxLength={2000}
              className="w-full bg-transparent text-xs sm:text-sm text-[#111B21] placeholder-[#667781] focus:outline-none resize-none max-h-24 py-1 custom-scrollbar"
            />
            {content.length > 1500 && (
              <span className="text-[10px] text-[#8A6500] ml-1.5 font-mono shrink-0">
                {2000 - content.length}
              </span>
            )}
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={disabled || submitting || !content.trim()}
            aria-label="Enviar mensagem"
            className="min-w-[40px] sm:min-w-[44px] min-h-[40px] sm:min-h-[44px] p-2.5 sm:p-3 rounded-2xl bg-[#00A884] hover:bg-[#008F72] active:scale-95 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs shrink-0 flex items-center justify-center cursor-pointer"
            title="Enviar mensagem"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </form>
      )}
    </div>
  );
};
