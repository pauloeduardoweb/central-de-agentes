import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Users, Shield, Search, ArrowLeft, Settings, ShieldAlert, AlertTriangle, Crown, Lock, RefreshCw, Pin, Bell, BookOpen, Smile } from 'lucide-react';
import { ChatProfileModal } from './ChatProfileModal';
import { ChatMessageList, ChatMessage } from './ChatMessageList';
import { ChatInputBar } from './ChatInputBar';
import { ChatModerationModal } from './ChatModerationModal';
import { AvatarViewer } from './AvatarViewer';
import { ProfilePreview } from './ProfilePreview';
import { PinnedMessage } from './PinnedMessage';
import { TypingIndicator } from './TypingIndicator';
import { CommunityRulesModal } from './CommunityRulesModal';
import { CommunityHeader } from './CommunityHeader';
import { OnlineMembersDrawer, OnlineMemberItem } from './OnlineMembersDrawer';
import { PollCard, PollData } from './PollCard';
import { CommunityRanking, RankingMember } from './CommunityRanking';
import { FavoriteMessagesModal, FavoriteMessageItem } from './FavoriteMessagesModal';
import { CommunityGalleryModal } from './CommunityGalleryModal';
import { CommunityAnnouncementBar, CommunityAnnouncement } from './CommunityAnnouncementBar';
import { MentionMember } from './MentionsAutocomplete';
import { ChatAnimatedBackground } from './ChatAnimatedBackground';
import { ChatMobileDrawer } from './ChatMobileDrawer';
import { ChatNotificationsPanel, NotificationItem } from './ChatNotificationsPanel';
import { chatApiFetch, setChatApiCredentials } from '../../services/chatApi';
import { getSafeImageUrl } from '../../utils/chatMediaUrl';

interface ChatPageProps {
  studentCode: string;
  sessionId?: string;
  onLogout?: () => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ studentCode, sessionId, onLogout }) => {
  const [isCheckingProfile, setIsCheckingProfile] = useState<boolean>(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [isMentor, setIsMentor] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showModModal, setShowModModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<number>(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pinnedMessage, setPinnedMessage] = useState<any | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [notice, setNotice] = useState<any | null>(null);
  
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [editContent, setEditContent] = useState('');
  
  const [viewingPublicProfile, setViewingPublicProfile] = useState<any | null>(null);
  const [avatarViewerData, setAvatarViewerData] = useState<{ url: string; nickname: string } | null>(null);
  
  const [mobileView, setMobileView] = useState<'rooms' | 'chat'>('chat');
  const [showMobileDrawer, setShowMobileDrawer] = useState<boolean>(false);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');

  // V1.2 States
  const [onlineMembers, setOnlineMembers] = useState<OnlineMemberItem[]>([]);
  const [communityMembers, setCommunityMembers] = useState<MentionMember[]>([]);
  const [poll, setPoll] = useState<PollData | null>(null);
  const [ranking, setRanking] = useState<RankingMember[]>([]);
  const [favorites, setFavorites] = useState<FavoriteMessageItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NOTICES' | 'POLLS' | 'FAVORITES' | 'RANKING'>('ALL');
  const [showOnlineDrawer, setShowOnlineDrawer] = useState<boolean>(false);
  const [showRankingModal, setShowRankingModal] = useState<boolean>(false);
  const [rankingLoading, setRankingLoading] = useState<boolean>(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState<boolean>(false);
  const [showGalleryModal, setShowGalleryModal] = useState<boolean>(false);
  const [externalInputText, setExternalInputText] = useState<string | undefined>(undefined);
  const [announcement, setAnnouncement] = useState<CommunityAnnouncement | null>({
    id: 1,
    content: '🎉 Seja bem-vindo à Comunidade Geração Z Pro! Interaja diariamente e ganhe XP e posições no Ranking.',
    badge: '📢 COMUNICADO MENTOR',
  });

  // V3.1 Notifications States
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState<boolean>(false);
  const [notificationFilter, setNotificationFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [isNotificationsLoading, setIsNotificationsLoading] = useState<boolean>(false);

  // Fetch Notifications List
  const fetchNotifications = async (filter: 'ALL' | 'UNREAD' = notificationFilter) => {
    try {
      setIsNotificationsLoading(true);
      const res = await chatApiFetch(`/api/chat/notifications?filter=${filter}`);
      if (res.data?.notifications) {
        setNotifications(res.data.notifications);
      }
      if (res.data?.unread_count !== undefined) {
        setUnreadNotificationCount(res.data.unread_count);
      }
    } catch (e) {
      console.warn('[fetchNotifications error]:', e);
    } finally {
      setIsNotificationsLoading(false);
    }
  };

  // Fetch Unread Notification Count
  const fetchUnreadNotificationCount = async () => {
    try {
      const res = await chatApiFetch('/api/chat/notifications/unread-count');
      if (res.data?.unread_count !== undefined) {
        setUnreadNotificationCount(res.data.unread_count);
      }
    } catch (e) {}
  };

  const handleMarkNotificationRead = async (id: number) => {
    try {
      await chatApiFetch(`/api/chat/notifications/${id}/read`, { method: 'POST' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
    } catch (e) {}
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await chatApiFetch('/api/chat/notifications/read-all', { method: 'POST' });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      setUnreadNotificationCount(0);
    } catch (e) {}
  };

  const handleNotificationClick = (item: NotificationItem) => {
    setShowNotificationsPanel(false);
    if (item.related_room_id && item.related_room_id !== activeRoomId) {
      setActiveRoomId(item.related_room_id);
    }
    if (item.notification_type === 'POLL_CREATED') {
      setActiveFilter('POLLS');
    } else if (
      item.notification_type === 'ACHIEVEMENT_UNLOCKED' ||
      item.notification_type === 'LEVEL_UP' ||
      item.notification_type === 'TOP_10_ENTERED'
    ) {
      setActiveFilter('RANKING');
      setShowRankingModal(true);
    } else if (item.notification_type === 'ANNOUNCEMENT_PUBLISHED') {
      setActiveFilter('NOTICES');
    }
  };

  // Fetch Online Members Drawer List
  const fetchOnlineMembers = async () => {
    try {
      const res = await chatApiFetch('/api/chat/online-members');
      if (res.data?.members) setOnlineMembers(res.data.members);
    } catch (e) {}
  };

  // Fetch Community Members for Mentions
  const fetchCommunityMembers = async () => {
    try {
      const res = await chatApiFetch('/api/chat/members');
      if (res.data?.members) setCommunityMembers(res.data.members);
    } catch (e) {}
  };

  // Fetch Active Poll
  const fetchPoll = async () => {
    try {
      const res = await chatApiFetch(`/api/chat/polls?roomId=${activeRoomId}`);
      if (res.data?.poll !== undefined) setPoll(res.data.poll);
    } catch (e) {}
  };

  // Fetch Community Ranking
  const fetchRanking = async () => {
    setRankingLoading(true);
    try {
      console.log('[CHAT RANKING MODAL OPEN]');
      const res = await chatApiFetch('/api/chat/ranking');
      if (res.data?.ranking) {
        setRanking(res.data.ranking);
        console.log('[CHAT RANKING LOAD RESULT]', res.data.ranking.length);
      } else {
        console.log('[CHAT RANKING LOAD RESULT]', 0);
      }
    } catch (e) {
      console.error('[CHAT RANKING LOAD ERROR]', e);
    } finally {
      setRankingLoading(false);
    }
  };

  // Fetch Favorites
  const fetchFavorites = async () => {
    try {
      const res = await chatApiFetch('/api/chat/favorites');
      if (res.data?.favorites) setFavorites(res.data.favorites);
    } catch (e) {}
  };

  // Optimistic Reaction Handler
  const handleReact = async (messageId: number, emoji: string) => {
    const prevMessages = messages;

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;

        const currentReactions = msg.reactions || [];
        const existingIdx = currentReactions.findIndex((r) => r.emoji === emoji);

        let newReactions = [...currentReactions];
        if (existingIdx >= 0) {
          const item = newReactions[existingIdx];
          const hasReacted = item.hasReacted;
          const newCount = hasReacted ? item.count - 1 : item.count + 1;

          if (newCount <= 0) {
            newReactions.splice(existingIdx, 1);
          } else {
            newReactions[existingIdx] = {
              ...item,
              count: newCount,
              hasReacted: !hasReacted,
            };
          }
        } else {
          newReactions.push({
            emoji,
            count: 1,
            hasReacted: true,
          });
        }

        return {
          ...msg,
          reactions: newReactions,
        };
      })
    );

    try {
      const res = await chatApiFetch(`/api/chat/messages/${messageId}/react`, {
        method: 'POST',
        body: { emoji },
      });
      if (!res.ok) {
        setMessages(prevMessages);
      }
    } catch (e) {
      setMessages(prevMessages);
    }
  };

  // Optimistic Favorite Toggle Handler
  const handleToggleFavorite = async (messageId: number) => {
    const prevMessages = messages;
    const prevFavorites = favorites;

    const targetMsg = messages.find((m) => m.id === messageId);
    const wasFavorite = targetMsg?.is_favorite || false;

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, is_favorite: !wasFavorite } : m))
    );

    if (wasFavorite) {
      setFavorites((prev) => prev.filter((f) => f.id !== messageId));
    } else if (targetMsg) {
      const newFav: FavoriteMessageItem = {
        id: targetMsg.id,
        content: targetMsg.content,
        message_type: targetMsg.message_type || 'TEXT',
        author_nickname: targetMsg.author?.nickname || 'Aluno',
        author_photo: targetMsg.author?.photo_url || null,
        created_at: targetMsg.created_at || new Date().toISOString(),
      };
      setFavorites((prev) => [newFav, ...prev]);
    }

    try {
      const res = await chatApiFetch(`/api/chat/messages/${messageId}/favorite`, {
        method: 'POST',
      });
      if (!res.ok) {
        setMessages(prevMessages);
        setFavorites(prevFavorites);
      }
    } catch (e) {
      setMessages(prevMessages);
      setFavorites(prevFavorites);
    }
  };

  // Poll Vote Handler
  const handleVotePoll = async (pollId: number, optionIndex: number) => {
    try {
      const res = await chatApiFetch(`/api/chat/polls/${pollId}/vote`, {
        method: 'POST',
        body: { optionIndex },
      });
      if (res.ok) {
        fetchPoll();
      }
    } catch (e) {}
  };

  // Mentor Poll Create Handler
  const handleCreatePoll = async (question: string, options: string[]) => {
    try {
      const res = await chatApiFetch('/api/chat/polls', {
        method: 'POST',
        body: { roomId: activeRoomId, question, options },
      });
      if (res.ok) {
        fetchPoll();
      }
    } catch (e) {}
  };

  // 1. Fetch User Profile
  const fetchProfile = async () => {
    try {
      setIsCheckingProfile(true);
      const res = await chatApiFetch('/api/chat/profile');
      if (res.status === 401 || res.code === 'UNAUTHORIZED') {
        return { hasProfile: false, error: 'Sessão expirada. Atualize a página e tente novamente.' };
      }
      if (res.data) {
        setHasProfile(res.data.hasProfile);
        setProfile(res.data.profile);
        setIsMentor(res.data.isMentor);

        if (!res.data.hasProfile) {
          setShowProfileModal(true);
        } else {
          setShowProfileModal(false);
        }
        return res.data;
      }
    } catch (err) {
      console.error('[ChatPage fetchProfile Error]:', err);
    } finally {
      setIsCheckingProfile(false);
    }
    return null;
  };

  // Helper to ensure profile is verified before sensitive media operations
  const ensureProfileVerified = async () => {
    if (profile && profile.id && profile.nickname) {
      return { success: true, profile };
    }
    const profData = await fetchProfile();
    if (profData?.hasProfile && profData?.profile?.id) {
      return { success: true, profile: profData.profile };
    }
    if (profData?.error) {
      return { success: false, error: profData.error };
    }
    return { success: false, error: 'Perfil do chat não cadastrado.' };
  };

  // 2. Fetch Chat Rooms
  const fetchRooms = async () => {
    try {
      const res = await chatApiFetch('/api/chat/rooms');
      if (res.data?.rooms) {
        setRooms(res.data.rooms);
      }
    } catch (err) {
      console.error('[ChatPage fetchRooms Error]:', err);
    }
  };

  // 3. Fetch Messages & Pinned Message for Active Room
  const mergeMessages = (prevMsgs: ChatMessage[], serverMsgs: ChatMessage[], roomId?: number) => {
    // Only keep previous messages from the target active room
    const prevRoomMsgs = roomId ? prevMsgs.filter((m) => !m.room_id || Number(m.room_id) === Number(roomId)) : prevMsgs;

    const serverReqIds = new Set(serverMsgs.map((m) => m.clientRequestId).filter(Boolean));
    const serverIds = new Set(serverMsgs.map((m) => m.id));

    const processedServerMsgs = serverMsgs.map((sm) => {
      const prevOpt = prevRoomMsgs.find(
        (pm) => (pm.clientRequestId && pm.clientRequestId === sm.clientRequestId) || pm.id === sm.id
      );

      if (prevOpt) {
        const safeImg = getSafeImageUrl(sm) || getSafeImageUrl(prevOpt) || sm.image_url || prevOpt.image_url;
        const mediaObj = sm.media || prevOpt.media;
        const authorObj = (sm.author && sm.author.nickname) ? sm.author : (prevOpt.author || sm.author);
        const msgType = sm.message_type || sm.messageType || prevOpt.message_type || prevOpt.messageType || 'TEXT';
        const msgContent = (sm.content && sm.content.trim()) ? sm.content : prevOpt.content;

        return {
          ...prevOpt,
          ...sm,
          message_type: msgType,
          messageType: msgType,
          content: msgContent,
          image_url: safeImg,
          media: mediaObj,
          author: authorObj,
          author_nickname: authorObj?.nickname || sm.author_nickname || prevOpt.author_nickname,
          author_photo_url: authorObj?.photo_url || sm.author_photo_url || prevOpt.author_photo_url,
          isOptimistic: false,
        };
      }

      return sm;
    });

    // Retain local optimistic messages whose clientRequestId is not yet in serverMsgs
    const pendingOptimistic = prevRoomMsgs.filter(
      (m) =>
        m.isOptimistic &&
        ((m.clientRequestId && !serverReqIds.has(m.clientRequestId)) || (!m.clientRequestId && !serverIds.has(m.id)))
    );

    const merged = [...processedServerMsgs, ...pendingOptimistic];
    return merged.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return a.id - b.id;
    });
  };

  const fetchMessages = async (roomId: number, silent = false) => {
    if (!silent) setLoadingMessages(true);
    try {
      const res = await chatApiFetch(`/api/chat/rooms/${roomId}/messages?limit=50`);
      if (res.data?.messages) {
        setMessages((prev) => mergeMessages(prev, res.data.messages, roomId));
      }
      if (res.data?.notice !== undefined) {
        setNotice(res.data.notice);
      }

      // Fetch Pinned Message
      const pinRes = await chatApiFetch(`/api/chat/rooms/${roomId}/pinned`);
      setPinnedMessage(pinRes.data?.pinnedMessage || null);
    } catch (err) {
      console.error('[ChatPage fetchMessages Error]:', err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  // 4. Fetch Typing Users
  const fetchTypingUsers = async () => {
    try {
      const res = await chatApiFetch(`/api/chat/rooms/${activeRoomId}/typing`);
      setTypingUsers(res.data?.typingUsers || []);
    } catch (err) {
      // silent catch
    }
  };

  // 5. Publish Typing status
  const handleTypingEvent = async (isTyping: boolean) => {
    try {
      await chatApiFetch('/api/chat/typing', {
        method: 'POST',
        body: { roomId: activeRoomId, isTyping },
      });
    } catch (err) {
      // silent
    }
  };

  // Fetch Announcements
  const fetchAnnouncements = async () => {
    try {
      const res = await chatApiFetch('/api/chat/announcements');
      if (res.data?.announcements && res.data.announcements.length > 0) {
        const top = res.data.announcements[0];
        setAnnouncement({
          id: top.id,
          content: top.content,
          badge: top.badge || '📢 COMUNICADO MENTOR',
        });
      }
    } catch (e) {}
  };

  useEffect(() => {
    setChatApiCredentials(studentCode, sessionId);
    fetchProfile();
    fetchRooms();
    fetchOnlineMembers();
    fetchCommunityMembers();
    fetchPoll();
    fetchRanking();
    fetchFavorites();
    fetchAnnouncements();
    fetchUnreadNotificationCount();
  }, [studentCode, sessionId]);

  useEffect(() => {
    if (showNotificationsPanel) {
      fetchNotifications(notificationFilter);
    }
  }, [showNotificationsPanel, notificationFilter]);

  const hasValidChatProfile = Boolean(
    profile &&
    profile.id &&
    profile.nickname &&
    profile.nickname.trim().length >= 3 &&
    profile.phone &&
    profile.phone.trim().length >= 8 &&
    profile.chat_status !== 'BANNED'
  );

  useEffect(() => {
    if (hasValidChatProfile && activeRoomId) {
      fetchMessages(activeRoomId);
      fetchPoll();

      // Polling every 2.5s for real-time messages, typing status, and notification badge
      const interval = setInterval(() => {
        fetchMessages(activeRoomId, true);
        fetchTypingUsers();
        fetchOnlineMembers();
        fetchPoll();
        fetchUnreadNotificationCount();
      }, 2500);

      return () => clearInterval(interval);
    }
  }, [hasValidChatProfile, activeRoomId]);

  // Profile creation & update handler
  const handleProfileSubmit = async (data: any) => {
    try {
      const isUpdateMode = hasValidChatProfile || Boolean(profile);
      const url = '/api/chat/profile';
      const method = isUpdateMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify(data),
      });

      if (res.status === 401) {
        return { success: false, error: 'Sessão expirada. Entre novamente.' };
      }

      const result = await res.json();
      if (result.success && result.profile) {
        const newProf = result.profile;
        setHasProfile(true);
        setProfile(newProf);
        setShowProfileModal(false);

        if (newProf) {
          setMessages((prevMsgs) =>
            prevMsgs.map((m) => {
              if (
                m.profile_id === newProf.id ||
                m.author?.id === newProf.id ||
                (m.author?.nickname && m.author.nickname === newProf.nickname)
              ) {
                return {
                  ...m,
                  author: {
                    ...m.author,
                    id: newProf.id,
                    nickname: newProf.nickname,
                    photo_url: newProf.photo_url,
                    photoUrl: newProf.photo_url,
                  },
                  author_nickname: newProf.nickname,
                  author_photo_url: newProf.photo_url,
                  nickname: newProf.nickname,
                  photo_url: newProf.photo_url,
                };
              }
              return m;
            })
          );
        }

        fetchRooms();
        fetchMessages(activeRoomId);
        return { success: true, profile: newProf };
      }
      const customErr = result.error || result.message || (isUpdateMode ? 'Não foi possível atualizar a foto do perfil.' : 'Não foi possível salvar o perfil.');
      return { success: false, error: customErr };
    } catch (err: any) {
      console.error('[handleProfileSubmit Error]:', err);
      return { success: false, error: 'Sessão expirada. Entre novamente.' };
    }
  };

  // Profile photo upload handler
  const handleUploadAvatar = async (file: File) => {
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const base64 = await base64Promise;

      const res = await chatApiFetch('/api/chat/upload-profile-photo', {
        method: 'POST',
        body: {
          base64,
          mime: file.type || 'image/webp',
          mediaType: 'AVATAR',
        },
      });

      if (res.ok && res.data?.success) {
        const photoUrl = res.data.photoUrl || res.data.imageUrl || res.data.media?.url;
        if (profile) {
          setProfile({ ...profile, photo_url: photoUrl });
        }
        return { success: true, photoUrl };
      }
      return { success: false, error: res.error || res.data?.message || 'Erro ao enviar foto de perfil.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro de conexão no upload.' };
    }
  };

  // Upload image handler
  const handleUploadImage = async (fileData: any) => {
    try {
      const verified = await ensureProfileVerified();
      if (!verified.success) {
        return { success: false, error: verified.error || 'Perfil do chat não cadastrado.' };
      }

      const res = await chatApiFetch('/api/chat/upload-image', {
        method: 'POST',
        body: {
          base64: fileData.base64,
          mime: fileData.mime,
          width: fileData.width,
          height: fileData.height,
        },
      });

      if (!res.ok) {
        if (res.status === 401 || res.code === 'UNAUTHORIZED') {
          return { success: false, error: 'Sessão expirada. Atualize a página e tente novamente.' };
        }
        if (res.code === 'NO_PROFILE' || (res.status === 400 && res.error?.includes('Perfil'))) {
          const freshProf = await fetchProfile();
          if (freshProf?.hasProfile && freshProf?.profile) {
            const retryRes = await chatApiFetch('/api/chat/upload-image', {
              method: 'POST',
              body: {
                base64: fileData.base64,
                mime: fileData.mime,
                width: fileData.width,
                height: fileData.height,
              },
            });
            if (retryRes.ok && retryRes.data?.success) {
              return {
                success: true,
                imageUrl: retryRes.data.imageUrl,
                width: retryRes.data.imageWidth,
                height: retryRes.data.imageHeight,
                size: retryRes.data.imageSize,
                mime: retryRes.data.imageMime,
              };
            }
          }
        }
        return { success: false, error: res.error || res.data?.message || 'Erro ao realizar upload da foto.' };
      }

      if (res.ok && res.data?.success) {
        return {
          success: true,
          imageUrl: res.data.imageUrl,
          width: res.data.imageWidth,
          height: res.data.imageHeight,
          size: res.data.imageSize,
          mime: res.data.imageMime,
        };
      }
      return { success: false, error: res.error || res.data?.message || 'Erro ao realizar upload da foto.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro de conexão durante upload.' };
    }
  };

  // Send message handler with optimistic update
  const handleSendMessage = async (
    content: string,
    replyToId?: number | null,
    extraData?: {
      message_type?: 'TEXT' | 'IMAGE' | 'AUDIO' | 'STICKER' | 'GIF' | 'SYSTEM';
      image_url?: string;
      image_width?: number;
      image_height?: number;
      image_size?: number;
      image_mime?: string;
      caption?: string;
    }
  ) => {
    const msgType = extraData?.message_type || 'TEXT';
    const tempId = Date.now();
    const clientRequestId = 'req_' + tempId + '_' + Math.random().toString(36).substring(2, 9);

    const optimisticMsg: ChatMessage = {
      id: tempId,
      room_id: activeRoomId,
      profile_id: profile?.id || 0,
      reply_to_message_id: replyToId || null,
      message_type: msgType,
      content: content || (msgType === 'IMAGE' ? '[Imagem]' : msgType === 'AUDIO' ? '🎙️ Mensagem de voz' : msgType === 'STICKER' ? 'Sticker' : msgType === 'GIF' ? 'GIF' : ''),
      image_url: extraData?.image_url || null,
      image_width: extraData?.image_width || null,
      image_height: extraData?.image_height || null,
      image_size: extraData?.image_size || null,
      image_mime: extraData?.image_mime || null,
      caption: extraData?.caption || null,
      clientRequestId,
      edited_at: null,
      deleted_at: null,
      is_pinned: false,
      isOptimistic: true,
      created_at: new Date().toISOString(),
      author: {
        id: profile?.id || 0,
        nickname: profile?.nickname || 'Você',
        photo_url: profile?.photo_url || null,
        photoUrl: profile?.photo_url || null,
        is_mentor: isMentor,
        role: isMentor ? 'MENTOR' : 'STUDENT',
        chat_status: profile?.chat_status || 'ACTIVE',
      },
      author_nickname: profile?.nickname || 'Você',
      author_photo_url: profile?.photo_url || null,
      reply_to: replyToMessage
        ? {
            id: replyToMessage.id,
            content: replyToMessage.content,
            nickname: replyToMessage.author.nickname,
          }
        : null,
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await chatApiFetch(`/api/chat/rooms/${activeRoomId}/messages`, {
        method: 'POST',
        body: {
          content: content || (msgType === 'IMAGE' ? '[Imagem]' : msgType === 'AUDIO' ? '🎙️ Mensagem de voz' : msgType === 'STICKER' ? 'Sticker' : msgType === 'GIF' ? 'GIF' : ''),
          reply_to_message_id: replyToId,
          message_type: msgType,
          image_url: extraData?.image_url,
          image_width: extraData?.image_width,
          image_height: extraData?.image_height,
          image_size: extraData?.image_size,
          image_mime: extraData?.image_mime,
          caption: extraData?.caption,
          client_request_id: clientRequestId,
        },
      });

      if (res.ok && res.data?.success) {
        if (res.data?.message) {
          const confirmed = res.data.message;
          setMessages((prev) =>
            prev.map((m) =>
              m.clientRequestId === clientRequestId || m.id === tempId
                ? { ...confirmed, isOptimistic: false }
                : m
            )
          );
        } else {
          fetchMessages(activeRoomId, true);
        }
        return { success: true };
      }
      setMessages((prev) => prev.filter((m) => m.id !== tempId && m.clientRequestId !== clientRequestId));
      return { success: false, error: res.error || 'Falha ao enviar mensagem.' };
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId && m.clientRequestId !== clientRequestId));
      return { success: false, error: err?.message || 'Erro de conexão.' };
    }
  };

  // Pin message handler
  const handlePinMessage = async (msg: ChatMessage) => {
    try {
      const res = await fetch(`/api/chat/messages/${msg.id}/pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
        },
        body: JSON.stringify({ isPinned: true }),
      });
      const result = await res.json();
      if (result.success) {
        fetchMessages(activeRoomId, true);
      }
    } catch (err) {
      console.error('Error pinning message:', err);
    }
  };

  const handleUnpinMessage = async (msgId: number) => {
    try {
      await fetch(`/api/chat/messages/${msgId}/pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
        },
        body: JSON.stringify({ isPinned: false }),
      });
      setPinnedMessage(null);
    } catch (err) {
      console.error('Error unpinning message:', err);
    }
  };

  // Warn user handler for Mentor
  const handleWarnUser = async (profileId: number, nickname: string) => {
    const reason = prompt(`Motivo da advertência oficial para ${nickname}:`);
    if (!reason) return;

    try {
      const res = await fetch(`/api/admin/chat/profiles/${profileId}/warn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
        },
        body: JSON.stringify({ reason }),
      });
      const result = await res.json();
      if (result.success) {
        alert(`Advertência oficial emitida para ${nickname}.`);
        setViewingPublicProfile(null);
        fetchMessages(activeRoomId, true);
      }
    } catch (err) {
      console.error('Error warning user:', err);
    }
  };

  // Edit message handler
  const handleSaveEdit = async () => {
    if (!editingMessage || !editContent.trim()) return;
    try {
      const res = await fetch(`/api/chat/messages/${editingMessage.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify({ content: editContent.trim() }),
      });
      const result = await res.json();
      if (result.success) {
        setEditingMessage(null);
        setEditContent('');
        fetchMessages(activeRoomId, true);
      }
    } catch (err) {
      console.error('Error editing message:', err);
    }
  };

  // Delete message handler
  const handleDeleteMessage = async (msg: ChatMessage) => {
    if (!confirm('Deseja realmente apagar esta mensagem?')) return;
    try {
      const res = await fetch(`/api/chat/messages/${msg.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
          'x-session-id': sessionId || '',
        },
      });
      const result = await res.json();
      if (result.success) {
        fetchMessages(activeRoomId, true);
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  // Report message handler
  const handleReportMessage = async (msg: ChatMessage) => {
    const reason = prompt('Qual o motivo da denúncia ao Mentor?');
    if (!reason) return;

    try {
      const res = await fetch(`/api/chat/messages/${msg.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-access-code': studentCode,
          'x-session-id': sessionId || '',
        },
        body: JSON.stringify({ reason }),
      });
      const result = await res.json();
      if (result.success) {
        alert('Denúncia registrada! O Mentor Bigode analisará o caso.');
      }
    } catch (err) {
      console.error('Error reporting message:', err);
    }
  };

  // View public profile handler
  const handleViewPublicProfile = async (targetId: number) => {
    try {
      const res = await fetch(`/api/chat/profiles/${targetId}/public`, {
        headers: {
          'x-access-code': studentCode,
        },
      });
      const data = await res.json();
      if (data.profile) {
        setViewingPublicProfile(data.profile);
      }
    } catch (err) {
      console.error('Error fetching public profile:', err);
    }
  };

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || {
    name: '💬 Comunidade Geração Z Pro',
    member_count: 1,
  };

  // Filter tab handler
  const handleFilterChange = (filter: 'ALL' | 'NOTICES' | 'POLLS' | 'FAVORITES' | 'RANKING') => {
    setActiveFilter(filter);
    if (filter === 'RANKING') {
      fetchRanking();
      setShowRankingModal(true);
    } else if (filter === 'FAVORITES') {
      fetchFavorites();
    }
  };

  // Search & Filter logic for messages
  const filteredMessages = messages.filter((m) => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchesContent = m.content.toLowerCase().includes(term);
      const matchesAuthor = m.author.nickname.toLowerCase().includes(term);
      if (!matchesContent && !matchesAuthor) return false;
    }

    if (activeFilter === 'NOTICES') {
      return m.author?.is_mentor || m.message_type === 'SYSTEM';
    }
    if (activeFilter === 'FAVORITES') {
      return m.is_favorite === true;
    }

    return true;
  });

  if (isCheckingProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] bg-[#0b141a] text-white p-4 select-none">
        <div className="flex flex-col items-center space-y-4 bg-[#111b21] border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
            <MessageSquare className="w-5 h-5 text-emerald-400 absolute" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-white">Carregando Bate-papo</h3>
            <p className="text-xs text-slate-400">Verificando perfil da comunidade...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto h-full p-0 sm:p-2 lg:p-4 animate-fade-in flex flex-col overflow-hidden flex-1">
      
      {/* Mobile Drawer Navigation (< 1024px) */}
      <ChatMobileDrawer
        isOpen={showMobileDrawer}
        onClose={() => setShowMobileDrawer(false)}
        profile={profile}
        isMentor={isMentor}
        rooms={rooms}
        activeRoomId={activeRoomId}
        unreadNotificationCount={unreadNotificationCount}
        onOpenNotifications={() => setShowNotificationsPanel(true)}
        onViewSelfProfile={() => {
          console.log('[CHAT PROFILE OPEN CLICK]', profile?.id, 'source = MOBILE_DRAWER');
          if (profile) {
            console.log('[CHAT PROFILE SELECTED]', profile.id);
            console.log('[CHAT PROFILE MODAL OPEN]', profile.id);
            setViewingPublicProfile(profile);
          }
        }}
        onSelectRoom={(roomId) => {
          setActiveRoomId(roomId);
          setMobileView('chat');
        }}
        onOpenRules={() => setShowRulesModal(true)}
        onOpenProfileModal={() => setShowProfileModal(true)}
        onOpenModModal={() => setShowModModal(true)}
        onOpenAvatar={(url, nickname) => setAvatarViewerData({ url, nickname })}
        onOpenRanking={() => {
          console.log('[CHAT RANKING OPEN CLICK]');
          setShowMobileDrawer(false);
          setShowRankingModal(true);
          fetchRanking();
        }}
        onOpenFavorites={() => {
          setShowMobileDrawer(false);
          fetchFavorites();
          setShowFavoritesModal(true);
        }}
        onOpenGallery={() => {
          setShowMobileDrawer(false);
          setShowGalleryModal(true);
        }}
        onOpenOnlineDrawer={() => {
          setShowMobileDrawer(false);
          fetchOnlineMembers();
          setShowOnlineDrawer(true);
        }}
        onSelectFilter={handleFilterChange}
        onLogout={onLogout}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Outer Container */}
      <div className="flex-1 bg-[#FFFFFF] border-0 sm:border border-[#00A884]/28 rounded-none sm:rounded-2xl overflow-hidden shadow-xl flex flex-col lg:flex-row relative w-full max-w-full text-[#111B21]">

        {/* LEFT SIDEBAR: INLINE ON DESKTOP (>= 1024px) */}
        <div className="hidden lg:flex lg:w-80 xl:w-96 bg-[#FFFFFF] border-r border-[#DADDE1] flex-col shrink-0">
          {/* User Profile Header */}
          <div className="p-3 bg-[#F0F2F5] border-b border-[#DADDE1] flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              {profile?.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={profile.nickname}
                  className="w-9 h-9 rounded-full object-cover border border-[#00A884] cursor-pointer hover:brightness-105"
                  onClick={() => setAvatarViewerData({ url: profile.photo_url, nickname: profile.nickname })}
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#00A884]/20 border border-[#00A884]/40 flex items-center justify-center font-bold text-[#00A884] text-sm">
                  {profile?.nickname ? profile.nickname.charAt(0).toUpperCase() : 'Z'}
                </div>
              )}
              <div>
                <span className="font-bold text-[#111B21] text-xs block leading-tight flex items-center gap-1">
                  {isMentor ? 'Mentor Bigode' : profile?.nickname || 'Aluno GZ Pro'}
                  {isMentor && <Crown className="w-3 h-3 text-amber-500" />}
                </span>
                <span className="text-[10px] text-[#00A884] font-medium">
                  Status: {profile?.chat_status === 'ACTIVE' ? 'Ativo' : profile?.chat_status === 'SUSPENDED' ? 'Suspenso' : profile?.chat_status === 'BANNED' ? 'Banido' : (profile?.chat_status || 'Ativo')}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {/* Rules Button */}
              <button
                onClick={() => setShowRulesModal(true)}
                className="p-2 rounded-xl bg-[#FFFFFF] border border-[#DADDE1] text-[#54656F] hover:text-[#111B21] hover:bg-[#E9EDEF] transition-colors cursor-pointer"
                title="Regras da Comunidade"
              >
                <BookOpen className="w-4 h-4" />
              </button>

              {/* Mentor Admin Button */}
              {isMentor && (
                <button
                  onClick={() => setShowModModal(true)}
                  className="p-2 rounded-xl bg-[#FEF3C7] text-amber-800 border border-amber-300 hover:bg-[#FDE68A] transition-colors cursor-pointer"
                  title="Painel de Moderação do Mentor"
                >
                  <ShieldAlert className="w-4 h-4" />
                </button>
              )}

              {/* Profile Edit Button */}
              <button
                onClick={() => setShowProfileModal(true)}
                className="p-2 rounded-xl bg-[#FFFFFF] border border-[#DADDE1] text-[#54656F] hover:text-[#111B21] hover:bg-[#E9EDEF] transition-colors cursor-pointer"
                title="Editar Perfil"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-2.5 bg-[#F0F2F5] border-b border-[#DADDE1]">
            <div className="relative">
              <Search className="w-4 h-4 text-[#667781] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar mensagens ou membros..."
                className="w-full bg-[#FFFFFF] text-xs text-[#111B21] placeholder-[#667781] border border-[#DADDE1] rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-[#00A884] transition-colors"
              />
            </div>
          </div>

          {/* Room List */}
          <div className="flex-1 overflow-y-auto space-y-1 p-2 custom-scrollbar bg-[#FFFFFF]">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => {
                  setActiveRoomId(room.id);
                  setMobileView('chat');
                }}
                className={`w-full p-3 rounded-xl flex items-start space-x-3 transition-all text-left cursor-pointer ${
                  activeRoomId === room.id
                    ? 'bg-[#E9EDEF] border-l-4 border-[#00A884] shadow-xs'
                    : 'hover:bg-[#F0F2F5]'
                }`}
              >
                <div className="w-10 h-10 rounded-2xl bg-[#00A884]/10 border border-[#00A884]/30 flex items-center justify-center text-[#00A884] shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-xs font-bold text-[#111B21] truncate">{room.name}</h4>
                    {room.last_message_at && (
                      <span className="text-[10px] text-[#667781]">
                        {new Date(room.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#667781] truncate">
                    {room.last_message_content || room.description || 'Nenhuma mensagem recente'}
                  </p>
                </div>

                {room.unread_count > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#00A884] text-white text-[10px] font-bold shrink-0">
                    {room.unread_count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Community Info Footer */}
          <div className="p-3 bg-[#F0F2F5] border-t border-[#DADDE1] text-center text-[10px] text-[#667781] font-medium">
            Comunidade Exclusiva Alunos Geração Z Pro
          </div>
        </div>

        {/* RIGHT MAIN PANEL: ACTIVE CHAT ROOM */}
        <div className="flex-1 flex flex-col bg-[#EFEAE2] relative w-full min-w-0 max-w-full overflow-hidden">
          {/* V1.2 Premium Community Header */}
          <CommunityHeader
            onlineCount={onlineMembers.length}
            totalParticipants={activeRoom.member_count || onlineMembers.length}
            unreadNotificationCount={unreadNotificationCount}
            onOpenNotifications={() => setShowNotificationsPanel(true)}
            activeFilter={activeFilter}
            searchQuery={searchTerm}
            onFilterChange={handleFilterChange}
            onSearchChange={setSearchTerm}
            onOpenOnlineDrawer={() => {
              fetchOnlineMembers();
              setShowOnlineDrawer(true);
            }}
            onOpenRules={() => setShowRulesModal(true)}
            onOpenGallery={() => setShowGalleryModal(true)}
            onOpenProfileSettings={() => setShowProfileModal(true)}
            onToggleMobileDrawer={() => setShowMobileDrawer(true)}
            currentProfile={profile}
            poll={poll}
            isMentor={isMentor}
            onVote={handleVotePoll}
            onCreatePoll={handleCreatePoll}
          />

          {/* V2.5 Community Announcement Bar */}
          <CommunityAnnouncementBar
            announcement={announcement}
            isMentor={isMentor}
            onSaveAnnouncement={(text, badge) => {
              setAnnouncement({
                id: Date.now(),
                content: text,
                badge: badge || '📢 COMUNICADO MENTOR',
                created_by: profile?.nickname || 'Mentor Bigode',
                created_at: new Date().toISOString(),
              });
            }}
            onCloseAnnouncement={() => setAnnouncement(null)}
          />

          {/* Pinned Message Sticky Bar */}
          <PinnedMessage
            pinnedMessage={pinnedMessage}
            isMentor={isMentor}
            onUnpin={handleUnpinMessage}
            onClickMessage={(id) => {
              const el = document.getElementById(`msg-${id}`);
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          />

          {/* Typing Indicator Bar */}
          <div className="px-4">
            <TypingIndicator typingUsers={typingUsers} />
          </div>

          {/* Account Status Warnings */}
          {profile?.chat_status === 'SUSPENDED' && (
            <div className="p-3 bg-amber-950/90 border-b border-amber-500/50 text-amber-200 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Sua conta está temporariamente suspensa do bate-papo pelo Mentor Bigode. Você pode visualizar as mensagens, mas não pode enviar.</span>
            </div>
          )}

          {profile?.chat_status === 'BANNED' && (
            <div className="p-3 bg-rose-950/90 border-b border-rose-500/50 text-rose-200 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Sua conta está banida do bate-papo.</span>
            </div>
          )}

          {/* Messages Stream Component with Animated Tech Background */}
          <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
            <ChatAnimatedBackground
              variant="ACTIVE_ROOM"
              isEmpty={!loadingMessages && filteredMessages.length === 0}
              onSelectSuggestion={(suggestionText) => setExternalInputText(suggestionText)}
            >
              <ChatMessageList
                messages={filteredMessages}
                loadingMessages={loadingMessages}
                currentProfileId={profile?.id}
                currentProfile={profile}
                isMentor={isMentor}
                onReply={(msg) => setReplyToMessage(msg)}
                onEdit={(msg) => {
                  setEditingMessage(msg);
                  setEditContent(msg.content);
                }}
                onDelete={handleDeleteMessage}
                onReport={handleReportMessage}
                onPinMessage={handlePinMessage}
                onViewProfile={handleViewPublicProfile}
                onOpenAvatar={(url, nick) => setAvatarViewerData({ url, nickname: nick })}
                notice={notice}
                onReact={handleReact}
                onToggleFavorite={handleToggleFavorite}
              />
            </ChatAnimatedBackground>
          </div>

          {/* Edit Message Inline Modal */}
          {editingMessage && (
            <div className="p-3 bg-[#182229] border-t border-slate-700 flex items-center space-x-2">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="flex-1 bg-[#111b21] text-xs text-white border border-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 rounded-xl bg-cyan-600 text-white font-bold text-xs hover:bg-cyan-500 cursor-pointer"
              >
                Salvar
              </button>
              <button
                onClick={() => setEditingMessage(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Chat Input Bar */}
          <ChatInputBar
            onSendMessage={handleSendMessage}
            onUploadImage={handleUploadImage}
            onTyping={handleTypingEvent}
            replyToMessage={replyToMessage}
            onCancelReply={() => setReplyToMessage(null)}
            disabled={profile?.chat_status === 'SUSPENDED' || profile?.chat_status === 'BANNED'}
            members={communityMembers}
            externalInputContent={externalInputText}
            onClearExternalInput={() => setExternalInputText(undefined)}
          />
        </div>

      </div>

      {/* Online Members Drawer */}
      <OnlineMembersDrawer
        isOpen={showOnlineDrawer}
        onClose={() => setShowOnlineDrawer(false)}
        members={onlineMembers}
        onViewProfile={handleViewPublicProfile}
      />

      {/* Community Ranking Modal */}
      <CommunityRanking
        isOpen={showRankingModal}
        onClose={() => setShowRankingModal(false)}
        ranking={ranking}
        onViewProfile={handleViewPublicProfile}
        isLoading={rankingLoading}
      />

      {/* Favorite Messages Modal */}
      <FavoriteMessagesModal
        isOpen={showFavoritesModal}
        onClose={() => setShowFavoritesModal(false)}
        favorites={favorites}
        onRemoveFavorite={handleToggleFavorite}
      />

      {/* Community Gallery Modal */}
      <CommunityGalleryModal
        isOpen={showGalleryModal}
        onClose={() => setShowGalleryModal(false)}
        messages={messages}
      />

      {/* Profile Registration / Edit Modal */}
      <ChatProfileModal
        isOpen={showProfileModal || (!isCheckingProfile && !hasValidChatProfile)}
        onClose={() => {
          if (hasValidChatProfile) {
            setShowProfileModal(false);
          }
        }}
        onSubmitProfile={handleProfileSubmit}
        onUploadAvatar={handleUploadAvatar}
        initialProfile={profile}
        isMentor={isMentor}
        isRequiredOnboarding={!hasValidChatProfile}
      />

      {/* Mentor Moderation Modal */}
      {isMentor && (
        <ChatModerationModal
          isOpen={showModModal}
          onClose={() => setShowModModal(false)}
          studentCode={studentCode}
        />
      )}

      {/* Community Rules Modal */}
      {showRulesModal && (
        <CommunityRulesModal onClose={() => setShowRulesModal(false)} />
      )}

      {/* Avatar Full Screen Viewer */}
      {avatarViewerData && (
        <AvatarViewer
          imageUrl={avatarViewerData.url}
          nickname={avatarViewerData.nickname}
          onClose={() => setAvatarViewerData(null)}
        />
      )}

      {/* Member Public Profile Preview Drawer */}
      {viewingPublicProfile && (
        <ProfilePreview
          profile={viewingPublicProfile}
          isMentor={isMentor}
          onClose={() => setViewingPublicProfile(null)}
          onOpenAvatar={(url, nick) => setAvatarViewerData({ url, nickname: nick })}
          onWarnUser={handleWarnUser}
        />
      )}

      {/* Notifications Panel */}
      <ChatNotificationsPanel
        isOpen={showNotificationsPanel}
        onClose={() => setShowNotificationsPanel(false)}
        notifications={notifications}
        unreadCount={unreadNotificationCount}
        isLoading={isNotificationsLoading}
        filter={notificationFilter}
        onFilterChange={(f) => {
          setNotificationFilter(f);
          fetchNotifications(f);
        }}
        onMarkRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onNotificationClick={handleNotificationClick}
      />

    </div>
  );
};
