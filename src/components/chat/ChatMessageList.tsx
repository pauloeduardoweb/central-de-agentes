import React, { useRef, useEffect, useState } from 'react';
import { Crown, Reply, MoreVertical, Edit2, Trash2, Flag, Pin, CheckCheck, Check, Lock, Copy, ArrowDown, Star, Share2 } from 'lucide-react';
import { getAvatarGradient, getNicknameInitials } from '../../utils/avatarUtils';
import { resolveChatMediaUrl, getSafeImageUrl } from '../../utils/chatMediaUrl';
import { ReactionsBar, ReactionItem } from './ReactionsBar';
import { ChatImageMessage } from './ChatImageMessage';
import { ImageViewer } from './ImageViewer';
import { ChatAudioMessage } from './ChatAudioMessage';
import { ChatLinkPreview, extractUrls } from './ChatLinkPreview';
import { ReadReceiptsModal } from './ReadReceiptsModal';
import { MessageListSkeleton } from './ChatSkeletons';

export interface ChatMessage {
  id: number;
  room_id: number;
  profile_id: number;
  profileId?: number;
  reply_to_message_id: number | null;
  message_type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'STICKER' | 'GIF' | 'SYSTEM';
  messageType?: 'TEXT' | 'IMAGE' | 'AUDIO' | 'STICKER' | 'GIF' | 'SYSTEM';
  content: string;
  image_url?: string | null;
  imageUrl?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  image_size?: number | null;
  image_mime?: string | null;
  caption?: string | null;
  clientRequestId?: string | null;
  media?: {
    media_id?: number;
    media_type?: string;
    public_url?: string | null;
    mime_type?: string | null;
    file_size?: number | null;
    width?: number | null;
    height?: number | null;
    duration_seconds?: number | null;
    upload_status?: string | null;
  } | null;
  edited_at: string | null;
  deleted_at: string | null;
  is_pinned: boolean;
  created_at: string;
  isOptimistic?: boolean;
  reactions?: ReactionItem[];
  is_favorite?: boolean;
  is_highlight?: boolean;
  read_by?: Array<{ id: number; nickname: string; photo_url?: string | null; is_mentor?: boolean }>;
  author: {
    id: number;
    nickname: string;
    photo_url: string | null;
    photoUrl?: string | null;
    is_mentor: boolean;
    role?: string;
    chat_status: string;
    status?: string;
  };
  author_nickname?: string;
  author_photo_url?: string | null;
  author_role?: string;
  nickname?: string;
  photo_url?: string | null;
  reply_to?: {
    id: number;
    content: string;
    nickname: string;
  } | null;
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  loadingMessages?: boolean;
  currentProfileId?: number;
  currentProfile?: any;
  isMentor?: boolean;
  onReply: (msg: ChatMessage) => void;
  onEdit: (msg: ChatMessage) => void;
  onDelete: (msg: ChatMessage) => void;
  onReport: (msg: ChatMessage) => void;
  onPinMessage?: (msg: ChatMessage) => void;
  onViewProfile: (profileId: number) => void;
  onOpenAvatar?: (url: string, nickname: string) => void;
  notice?: { id: number; content: string; created_by: string; created_at: string } | null;
  onReact?: (messageId: number, emoji: string) => void;
  onToggleFavorite?: (messageId: number) => void;
  onHashtagClick?: (hashtag: string) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  loadingMessages = false,
  currentProfileId,
  currentProfile,
  isMentor = false,
  onReply,
  onEdit,
  onDelete,
  onReport,
  onPinMessage,
  onViewProfile,
  onOpenAvatar,
  notice,
  onReact,
  onToggleFavorite,
  onHashtagClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [readReceiptsMsg, setReadReceiptsMsg] = useState<ChatMessage | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const [viewerImage, setViewerImage] = useState<{
    url: string;
    caption?: string | null;
    authorName?: string;
    createdAt?: string;
  } | null>(null);

  // Format mentions & hashtags in text
  const renderFormattedContent = (text: string) => {
    if (!text) return null;
    const tokens = text.split(/(@[a-zA-Z0-9._\s\-\u00C0-\u00FF]+|#[a-zA-Z0-9_]+)/g);
    return tokens.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              // mention search
            }}
            className="font-bold text-[#00A884] bg-[#E7F8F3] border border-[#A7F3D0] px-1 py-0.5 rounded text-[12px] shadow-xs cursor-pointer hover:underline"
          >
            {part}
          </span>
        );
      }
      if (part.startsWith('#')) {
        return (
          <span
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              if (onHashtagClick) onHashtagClick(part);
            }}
            className="font-bold text-[#00A884] bg-[#E7F8F3] border border-[#A7F3D0] px-1 py-0.5 rounded text-[12px] cursor-pointer hover:underline"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isBottom = scrollHeight - scrollTop - clientHeight < 150;
    setShowScrollBottom(!isBottom);
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (containerRef.current && !showScrollBottom) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages.length]);

  const copyToClipboard = (msg: ChatMessage) => {
    navigator.clipboard.writeText(msg.content);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDateLabel = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) return 'HOJE';
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return 'ONTEM';
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }).toUpperCase();
    } catch {
      return '';
    }
  };

  /**
   * Helper function to check if a message should be visually grouped with the previous message.
   * Grouping ONLY happens if ALL 7 conditions are met:
   * 1. Valid previous message exists (mIdx > 0).
   * 2. Neither message is a SYSTEM message.
   * 3. Neither message was deleted.
   * 4. Same date label (no date separator between them).
   * 5. Same author (author ID or nickname match).
   * 6. Same direction (sent/received direction match).
   * 7. Time gap is less than 5 minutes (300,000 ms).
   */
  const shouldGroupMessage = (msg: ChatMessage, prevMsg: ChatMessage | null): boolean => {
    if (!prevMsg) return false;

    // Rule 5: SYSTEM messages never group
    if (msg.message_type === 'SYSTEM' || prevMsg.message_type === 'SYSTEM') return false;

    // Rule 7: Deleted messages never group
    if (Boolean(msg.deleted_at) || Boolean(prevMsg.deleted_at)) return false;

    // Rule 6: Same date group check (different label means date separator pill between them)
    if (formatDateLabel(msg.created_at) !== formatDateLabel(prevMsg.created_at)) return false;

    // Rule 2: Same author check
    const currentAuthorId = msg.profile_id || msg.author?.id;
    const prevAuthorId = prevMsg.profile_id || prevMsg.author?.id;

    let sameAuthor = false;
    if (currentAuthorId && prevAuthorId) {
      sameAuthor = Number(currentAuthorId) === Number(prevAuthorId);
    } else if (msg.author?.nickname && prevMsg.author?.nickname) {
      sameAuthor = msg.author.nickname.trim().toLowerCase() === prevMsg.author.nickname.trim().toLowerCase();
    }

    if (!sameAuthor) return false;

    // Rule 3: Same direction check (both sent or both received)
    const isSelf = Boolean(currentProfileId && currentAuthorId && Number(currentAuthorId) === Number(currentProfileId));
    const prevIsSelf = Boolean(currentProfileId && prevAuthorId && Number(prevAuthorId) === Number(currentProfileId));

    if (isSelf !== prevIsSelf) return false;

    // Rule 4: Interval less than 5 minutes (300,000 ms)
    const msgTime = new Date(msg.created_at).getTime();
    const prevTime = new Date(prevMsg.created_at).getTime();

    if (isNaN(msgTime) || isNaN(prevTime)) return false;

    const diffMs = msgTime - prevTime;
    if (diffMs < 0 || diffMs >= 5 * 60 * 1000) return false;

    return true;
  };

  // Sort messages chronologically (oldest first) before grouping by date
  const sortedMessages = [...messages].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.id - b.id;
  });

  // Group messages by date
  const groupedMessages: { date: string; msgs: ChatMessage[] }[] = [];
  sortedMessages.forEach((msg) => {
    const label = formatDateLabel(msg.created_at);
    const existing = groupedMessages.find((g) => g.date === label);
    if (existing) {
      existing.msgs.push(msg);
    } else {
      groupedMessages.push({ date: label, msgs: [msg] });
    }
  });

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 bg-[#EFEAE2] text-[#111B21] relative custom-scrollbar"
    >
      {loadingMessages && messages.length === 0 ? (
        <MessageListSkeleton />
      ) : (
        <>
          {/* Official Notice Banner (if active) */}
      {notice && (
        <div className="sticky top-0 z-20 mx-auto max-w-xl bg-[#FFF7D6] border border-[#E5C14A] rounded-xl p-3 shadow-md backdrop-blur-md text-[#3B3100] text-xs flex items-start space-x-2.5 animate-slide-down">
          <Pin className="w-4 h-4 text-[#8A6500] shrink-0 mt-0.5 animate-bounce" />
          <div className="flex-1">
            <div className="flex items-center justify-between font-bold text-[#8A6500] text-[11px] mb-0.5">
              <span>Aviso Oficial do Mentor</span>
              <span className="text-[10px] text-[#8A6500]/70">{formatTime(notice.created_at)}</span>
            </div>
            <p className="text-[#3B3100] text-xs leading-relaxed">{notice.content}</p>
          </div>
        </div>
      )}

      {/* Render Grouped Messages */}
      {groupedMessages.map((group, gIdx) => (
        <div key={gIdx} className="space-y-1.5">
          
          {/* Date separator sticky pill */}
          <div className="flex justify-center my-3">
            <span className="bg-[#FFFFFF] border border-[#DADDE1] text-[#54656F] text-[10px] font-bold tracking-widest px-3 py-1 rounded-full uppercase shadow-xs">
              {group.date}
            </span>
          </div>

          {group.msgs.map((msg, mIdx) => {
            const tempIsSelfCheck = Boolean(
              currentProfileId &&
              (msg.author?.id || msg.profile_id || msg.profileId) &&
              Number(msg.author?.id || msg.profile_id || msg.profileId) === Number(currentProfileId)
            );

            const authorId =
              msg.author?.id ??
              msg.profile_id ??
              msg.profileId ??
              (tempIsSelfCheck ? currentProfile?.id : undefined);

            const authorNick =
              msg.author?.nickname ??
              msg.author_nickname ??
              msg.nickname ??
              (tempIsSelfCheck ? currentProfile?.nickname : undefined) ??
              'Aluno';

            const authorPhoto =
              msg.author?.photo_url ??
              msg.author?.photoUrl ??
              msg.author_photo_url ??
              msg.photo_url ??
              (tempIsSelfCheck ? (currentProfile?.photo_url ?? currentProfile?.photoUrl) : undefined) ??
              null;

            const isSelf = Boolean(
              currentProfileId &&
              authorId &&
              Number(authorId) === Number(currentProfileId)
            );

            const isMentorAuthor = Boolean(
              msg.author?.is_mentor ||
              msg.author?.role === 'MENTOR' ||
              msg.author_role === 'MENTOR' ||
              (isSelf && isMentor)
            );

            const isDeleted = Boolean(msg.deleted_at);
            const isSystem = msg.message_type === 'SYSTEM';

            // Check if this message should be visually grouped with the previous message
            const prevMsg = mIdx > 0 ? group.msgs[mIdx - 1] : null;
            const isGrouped = shouldGroupMessage(msg, prevMsg);

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-3">
                  <div className="bg-[#FFF7D6] border border-[#E5C14A] text-[#3B3100] text-xs px-4 py-2 rounded-2xl max-w-md text-center shadow-xs flex items-center gap-2">
                    <span>{msg.content}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                id={`msg-${msg.id}`}
                className={`flex items-end gap-2 group animate-msg-entry ${
                  isGrouped ? 'mt-1' : 'mt-2.5'
                } ${isSelf ? 'justify-end' : 'justify-start'}`}
              >
                {/* Author Avatar (Left side for received messages) */}
                {!isSelf && (
                  !isGrouped ? (
                    <button
                      onClick={() => {
                        if (authorPhoto && onOpenAvatar) {
                          onOpenAvatar(authorPhoto, authorNick);
                        } else if (authorId) {
                          onViewProfile(authorId);
                        }
                      }}
                      className="shrink-0 transition-transform active:scale-95 focus:outline-none"
                      title={`Ver foto de ${authorNick}`}
                    >
                      {authorPhoto ? (
                        <img
                          src={resolveChatMediaUrl(authorPhoto)}
                          alt={authorNick}
                          className="w-8 h-8 rounded-full object-cover border border-[#DADDE1] hover:brightness-105"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-gradient-to-tr ${getAvatarGradient(authorNick)} text-white shadow-xs`}>
                          {getNicknameInitials(authorNick)}
                        </div>
                      )}
                    </button>
                  ) : (
                    /* Alignment spacer for grouped messages */
                    <div className="w-8 h-8 shrink-0 invisible pointer-events-none" />
                  )
                )}

                {/* Message Bubble Container */}
                <div
                  className={`relative max-w-[88%] md:max-w-[78%] lg:max-w-[70%] rounded-2xl px-3.5 py-2 text-xs shadow-xs transition-all ${
                    isMentorAuthor
                      ? 'bg-[#FFF7D6] border border-[#E5C14A] text-[#3B3100]'
                      : isSelf
                      ? 'bg-[#D9FDD3] border border-[#C2F2BB] text-[#111B21] rounded-br-none'
                      : 'bg-[#FFFFFF] border border-[#E9EDEF] text-[#111B21] rounded-bl-none'
                  }`}
                >
                  {/* Reply Context (If replying to another message) */}
                  {msg.reply_to && (
                    <div className={`mb-1.5 p-2 rounded-lg border-l-4 border-[#00A884] text-[11px] ${
                      isSelf ? 'bg-[#C2F2BB] text-[#111B21]' : 'bg-[#F0F2F5] text-[#111B21]'
                    }`}>
                      <span className="font-bold text-[#00A884] block text-[10px]">
                        {msg.reply_to.nickname}
                      </span>
                      <p className="truncate text-[#54656F] italic text-[11px]">
                        {msg.reply_to.content}
                      </p>
                    </div>
                  )}

                  {/* Header: Author Nickname & Badges (Shown on first message of a group) */}
                  {!isGrouped && (
                    <div className="flex items-center space-x-1.5 mb-1">
                      <button
                        onClick={() => authorId && onViewProfile(authorId)}
                        className={`font-bold hover:underline text-[12px] ${
                          isMentorAuthor ? 'text-[#8A6500]' : 'text-[#111B21]'
                        }`}
                      >
                        {authorNick}
                      </button>

                      {isMentorAuthor && (
                        <span className="bg-[#F5D75C] text-[#4A3900] border border-[#E5C14A] text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Crown className="w-2.5 h-2.5 text-[#8A6500]" />
                          MENTOR OFICIAL
                        </span>
                      )}
                    </div>
                  )}

                  {/* Highlighted Message Badge (Item 8) */}
                  {(msg.is_highlight || (msg.reactions && msg.reactions.reduce((acc, r) => acc + r.count, 0) >= 3)) && (
                    <div className="my-1 px-2 py-0.5 rounded-md bg-[#FFF4C6] border border-[#FDE68A] text-[#715B00] font-bold text-[10px] inline-flex items-center gap-1 shadow-xs animate-pulse">
                      <span>🔥 Mensagem em destaque</span>
                    </div>
                  )}

                  {/* Message Content: Image, Audio, Sticker, GIF, or Text */}
                  <div className="break-words whitespace-pre-wrap text-[13px] leading-relaxed select-text">
                    {isDeleted ? (
                      <span className="italic text-[#667781] flex items-center gap-1 text-[11px]">
                        <Trash2 className="w-3 h-3 text-[#667781]" />
                        Esta mensagem foi apagada.
                      </span>
                    ) : msg.message_type === 'AUDIO' ? (
                      <ChatAudioMessage audioUrl={resolveChatMediaUrl(msg.image_url || msg.content)} isOwn={isSelf} />
                    ) : msg.message_type === 'STICKER' ? (
                      (() => {
                        const stickerUrl = resolveChatMediaUrl(msg.image_url || getSafeImageUrl(msg));
                        if (stickerUrl) {
                          return (
                            <div className="my-1 flex flex-col items-center select-none">
                              <img
                                src={stickerUrl}
                                alt={msg.content || 'Sticker'}
                                className="w-28 h-28 sm:w-32 sm:h-32 object-contain filter drop-shadow-xs transition-transform active:scale-105"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          );
                        }
                        return (
                          <div className="my-1 px-3 py-2 bg-[#F0F2F5] border border-[#DADDE1] rounded-2xl flex items-center space-x-2 text-center shadow-xs">
                            <span className="text-3xl select-none">{msg.image_url || '🔥'}</span>
                            <span className="text-xs font-bold text-[#00A884]">{msg.content ? msg.content.replace(/^.*?Sticker:\s*/i, '') : 'Sticker'}</span>
                          </div>
                        );
                      })()
                    ) : msg.message_type === 'GIF' ? (
                      (() => {
                        const gifUrl = getSafeImageUrl(msg) || resolveChatMediaUrl(msg.image_url);
                        if (gifUrl) {
                          return (
                            <div className="rounded-xl overflow-hidden border border-[#DADDE1] max-w-xs my-1 relative bg-black/5">
                              <img
                                src={gifUrl}
                                alt="GIF"
                                className="w-full h-auto object-cover min-h-[100px]"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    parent.classList.add('p-3', 'bg-[#F0F2F5]', 'text-center');
                                    parent.innerHTML = '<span class="text-xs text-[#54656F] italic">🎬 GIF indisponível</span>';
                                  }
                                }}
                              />
                              <span className="bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded absolute bottom-1 right-1 pointer-events-none">
                                GIF
                              </span>
                            </div>
                          );
                        }
                        return (
                          <div className="p-3 bg-[#F0F2F5] rounded-xl text-center border border-[#DADDE1] my-1">
                            <span className="text-xs text-[#54656F] italic">🎬 GIF indisponível</span>
                          </div>
                        );
                      })()
                    ) : (msg.message_type === 'IMAGE' && Boolean(getSafeImageUrl(msg))) ? (
                      <ChatImageMessage
                        imageUrl={getSafeImageUrl(msg)}
                        caption={msg.caption || (msg.content !== '[Imagem]' && !msg.content?.startsWith('http') && !msg.content?.startsWith('/') ? msg.content : null)}
                        width={msg.image_width || msg.media?.width || undefined}
                        height={msg.image_height || msg.media?.height || undefined}
                        isOwn={isSelf}
                        onOpenViewer={() =>
                          setViewerImage({
                            url: getSafeImageUrl(msg),
                            caption: msg.caption || (msg.content !== '[Imagem]' && !msg.content?.startsWith('http') && !msg.content?.startsWith('/') ? msg.content : null),
                            authorName: msg.author.nickname,
                            createdAt: msg.created_at,
                          })
                        }
                      />
                    ) : (
                      <>
                        {renderFormattedContent(msg.content)}
                        {/* Auto Link Cards */}
                        {extractUrls(msg.content).map((url, uIdx) => (
                          <ChatLinkPreview key={uIdx} url={url} />
                        ))}
                      </>
                    )}
                  </div>

                  {/* Footer Meta: Time, Edited Tag & Status */}
                  <div className="flex items-center justify-end space-x-1.5 mt-1 text-[10px] text-[#667781] select-none">
                    {msg.edited_at && !isDeleted && <span className="italic text-[9px]">editada</span>}
                    <span>{formatTime(msg.created_at)}</span>
                    {isSelf && !isDeleted && (
                      msg.isOptimistic ? (
                        <Check className="w-3 h-3 text-[#667781]" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReadReceiptsMsg(msg)}
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                          title="Clique para ver quem visualizou"
                        >
                          <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB] inline-block" />
                        </button>
                      )
                    )}
                  </div>

                  {/* Reactions & Favorites Bar */}
                  {!isDeleted && onReact && (
                    <ReactionsBar
                      messageId={msg.id}
                      reactions={msg.reactions}
                      isFavorite={msg.is_favorite}
                      isHighlight={msg.is_highlight}
                      onReact={onReact}
                      onToggleFavorite={onToggleFavorite}
                    />
                  )}

                  {/* Context Action Menu Trigger Button */}
                  {!isDeleted && msg.message_type !== 'AUDIO' && (
                    <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === msg.id ? null : msg.id)}
                        className="p-1 rounded-full bg-[#F0F2F5] text-[#54656F] hover:text-[#111B21] transition-colors shadow-xs"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown Menu Popup */}
                      {activeMenuId === msg.id && (
                        <div
                          className="absolute right-0 top-6 z-30 w-40 bg-[#FFFFFF] border border-[#DADDE1] rounded-xl shadow-xl py-1 text-[11px] text-[#111B21]"
                          onMouseLeave={() => setActiveMenuId(null)}
                        >
                          <button
                            onClick={() => {
                              onReply(msg);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-[#F0F2F5] flex items-center space-x-2 text-[#00A884]"
                          >
                            <Reply className="w-3.5 h-3.5" />
                            <span>Responder</span>
                          </button>

                          <button
                            onClick={() => {
                              copyToClipboard(msg);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3 py-1.5 text-left hover:bg-[#F0F2F5] flex items-center space-x-2 text-[#111B21]"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedId === msg.id ? 'Copiado!' : 'Copiar Texto'}</span>
                          </button>

                          {isMentor && onPinMessage && (
                            <button
                              onClick={() => {
                                onPinMessage(msg);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-[#F0F2F5] flex items-center space-x-2 text-[#8A6500]"
                            >
                              <Pin className="w-3.5 h-3.5" />
                              <span>Fixar no topo</span>
                            </button>
                          )}

                          {isSelf && (
                            <button
                              onClick={() => {
                                onEdit(msg);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-[#F0F2F5] flex items-center space-x-2 text-[#00A884]"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                          )}

                          {(isSelf || isMentor) && (
                            <button
                              onClick={() => {
                                onDelete(msg);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-[#F0F2F5] flex items-center space-x-2 text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Excluir</span>
                            </button>
                          )}

                          {!isSelf && (
                            <button
                              onClick={() => {
                                onReport(msg);
                                setActiveMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-left hover:bg-[#F0F2F5] flex items-center space-x-2 text-amber-600"
                            >
                              <Flag className="w-3.5 h-3.5" />
                              <span>Denunciar</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* Author Avatar (Right side for own messages) */}
                {isSelf && (
                  !isGrouped ? (
                    <button
                      onClick={() => {
                        if (authorPhoto && onOpenAvatar) {
                          onOpenAvatar(authorPhoto, authorNick);
                        } else if (authorId) {
                          onViewProfile(authorId);
                        }
                      }}
                      className="shrink-0 transition-transform active:scale-95 focus:outline-none"
                      title={`Ver foto de ${authorNick}`}
                    >
                      {authorPhoto ? (
                        <img
                          src={resolveChatMediaUrl(authorPhoto)}
                          alt={authorNick}
                          className="w-8 h-8 rounded-full object-cover border border-[#DADDE1] hover:brightness-105"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-gradient-to-tr ${getAvatarGradient(authorNick)} text-white shadow-xs`}>
                          {getNicknameInitials(authorNick)}
                        </div>
                      )}
                    </button>
                  ) : (
                    /* Alignment spacer for grouped messages */
                    <div className="w-8 h-8 shrink-0 invisible pointer-events-none" />
                  )
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:right-6 z-30 px-4 py-2 rounded-full bg-[#FFFFFF] text-[#00A884] border border-[#DADDE1] shadow-lg transition-all animate-bounce cursor-pointer flex items-center gap-2 font-bold text-xs hover:bg-[#F0F2F5]"
          title="Rolar para as mensagens recentes"
        >
          <ArrowDown className="w-4 h-4 text-[#00A884]" />
          <span>Novas mensagens</span>
        </button>
      )}

      {/* Fullscreen Image Viewer Modal */}
      {viewerImage && (
        <ImageViewer
          imageUrl={viewerImage.url}
          caption={viewerImage.caption}
          authorName={viewerImage.authorName}
          createdAt={viewerImage.createdAt}
          onClose={() => setViewerImage(null)}
        />
      )}

      {/* Read Receipts Modal */}
      {readReceiptsMsg && (
        <ReadReceiptsModal
          isOpen={Boolean(readReceiptsMsg)}
          onClose={() => setReadReceiptsMsg(null)}
          messageTime={readReceiptsMsg.created_at}
          readBy={readReceiptsMsg.read_by || []}
        />
      )}
        </>
      )}
    </div>
  );
};
