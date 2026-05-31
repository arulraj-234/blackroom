import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Reply,
  SmilePlus,
  MoreHorizontal,
  ArrowDown,
  Check,
  CheckCheck,
  ArrowLeft,
  Copy,
  Pencil,
  Trash2,
  Play,
  Pause,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import MessageInput from './MessageInput';
import MediaViewer from './MediaViewer';
import EmojiPicker from './EmojiPicker';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDateLabel(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (target.getTime() === today.getTime()) return 'Today';
  if (target.getTime() === yesterday.getTime()) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function groupMessagesByDate(messages) {
  const groups = [];
  let currentLabel = null;

  for (const msg of messages) {
    const label = formatDateLabel(msg.created_at);
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push({ label, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  }
  return groups;
}

// ─── AudioPlayer ────────────────────────────────────────────────────────────

function AudioPlayer({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  }, [playing]);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(isNaN(pct) ? 0 : pct);
  }, []);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    setProgress(0);
  }, []);

  return (
    <div className="flex items-center gap-3 w-56 px-3 py-2 rounded-xl bg-[#0a0a0a] border border-[#2a2a2a]">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />
      <button
        onClick={toggle}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10
                   hover:bg-white/20 text-white transition-colors shrink-0 cursor-pointer"
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <div className="flex-1 h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ─── MessageBubble ──────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isOwn,
  isGroup,
  repliedMessage,
  onReply,
  onReact,
  onOpenMedia,
  onDelete,
  currentUserId,
}) {
  const [hovered, setHovered] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState({ top: 0, left: 0 });
  const actionBarRef = useRef(null);

  const handleReact = useCallback(
    (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setEmojiAnchor({ top: rect.top - 52, left: rect.left - 80 });
      setShowEmojiPicker(true);
    },
    []
  );

  const handleEmojiSelect = useCallback(
    (emoji) => {
      onReact(message.id, emoji);
      setShowEmojiPicker(false);
    },
    [message.id, onReact]
  );

  const handleCopy = useCallback(() => {
    if (message.content) navigator.clipboard.writeText(message.content);
    setShowMore(false);
  }, [message.content]);

  const handleDelete = useCallback(() => {
    onDelete(message.id);
    setShowMore(false);
  }, [message.id, onDelete]);

  const reactions = message.reactions || {};
  const reactionEntries = Object.entries(reactions);

  return (
    <div
      className={`group flex gap-2.5 max-w-full ${isOwn ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setShowMore(false);
      }}
    >
      {/* Left-side avatar for others in groups */}
      {!isOwn && isGroup && (
        <div className="shrink-0 mt-auto">
          {message.sender_avatar ? (
            <img
              src={message.sender_avatar}
              alt=""
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#1e1e1e] flex items-center justify-center text-xs text-gray-500 font-medium">
              {(message.sender_username || '?')[0].toUpperCase()}
            </div>
          )}
        </div>
      )}

      <div className={`relative flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
        {/* Sender name in groups */}
        {!isOwn && isGroup && (
          <span className="text-[11px] text-gray-500 mb-1 ml-1 font-medium">
            {message.sender_username || 'Unknown'}
          </span>
        )}

        {/* Reply preview */}
        {repliedMessage && (
          <div className="mb-1 px-3 py-1.5 text-[11px] rounded-lg bg-white/5 border-l-2 border-indigo-500/60 text-gray-400 max-w-full truncate">
            <span className="text-indigo-400 font-medium mr-1">
              {repliedMessage.sender_username || 'User'}
            </span>
            {repliedMessage.content || '📎 Media'}
          </div>
        )}

        {/* Bubble */}
        <div
          className={`relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words
            ${
              isOwn
                ? 'bg-indigo-600/20 text-white border border-indigo-500/20'
                : 'bg-[#111] text-gray-200 border border-[#1e1e1e]'
            }`}
        >
          {/* Media */}
          {message.media_url && message.media_type === 'image' && (
            <img
              src={message.media_url}
              alt=""
              onClick={() => onOpenMedia(message.media_url, 'image')}
              className="max-h-80 rounded-xl mb-2 cursor-pointer hover:opacity-90 transition-opacity"
            />
          )}
          {message.media_url && message.media_type === 'video' && (
            <video
              src={message.media_url}
              controls
              className="max-h-80 rounded-xl mb-2 max-w-full"
            />
          )}
          {message.media_url && message.media_type === 'audio' && (
            <div className="mb-2">
              <AudioPlayer src={message.media_url} />
            </div>
          )}

          {/* Text content */}
          {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}

          {/* Timestamp on hover */}
          <span
            className={`text-[10px] font-mono text-gray-600 mt-1 transition-opacity duration-200
              ${hovered ? 'opacity-100' : 'opacity-0'} flex items-center gap-1 ${isOwn ? 'justify-end' : ''}`}
          >
            {formatTime(message.created_at)}
            {isOwn && (
              message.read
                ? <CheckCheck size={12} className="text-indigo-400" />
                : <Check size={12} />
            )}
          </span>
        </div>

        {/* Reactions */}
        {reactionEntries.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {reactionEntries.map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => onReact(message.id, emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                  border transition-colors cursor-pointer
                  ${
                    Array.isArray(users) && users.includes(currentUserId)
                      ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300'
                      : 'bg-[#111] border-[#2a2a2a] text-gray-400 hover:border-[#3a3a3a]'
                  }`}
              >
                <span>{emoji}</span>
                <span>{Array.isArray(users) ? users.length : users}</span>
              </button>
            ))}
          </div>
        )}

        {/* Floating action bar on hover */}
        {hovered && (
          <div
            ref={actionBarRef}
            className={`absolute -top-9 flex items-center gap-0.5 px-1 py-0.5
              bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-lg shadow-black/40 z-20
              ${isOwn ? 'right-0' : 'left-0'}`}
          >
            <button
              onClick={() => onReply(message)}
              className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors cursor-pointer"
              title="Reply"
            >
              <Reply size={14} />
            </button>
            <button
              onClick={handleReact}
              className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors cursor-pointer"
              title="React"
            >
              <SmilePlus size={14} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMore((v) => !v)}
                className="p-1.5 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors cursor-pointer"
                title="More"
              >
                <MoreHorizontal size={14} />
              </button>
              {showMore && (
                <div
                  className={`absolute top-full mt-1 w-36 py-1 bg-[#1a1a1a] border border-[#2a2a2a]
                    rounded-lg shadow-xl shadow-black/50 z-30 ${isOwn ? 'right-0' : 'left-0'}`}
                >
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-400
                               hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                  >
                    <Copy size={12} /> Copy text
                  </button>
                  {isOwn && (
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400
                                 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Emoji picker */}
        {showEmojiPicker && (
          <EmojiPicker
            position={emojiAnchor}
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Typing indicator ───────────────────────────────────────────────────────

function TypingIndicator({ usernames }) {
  if (!usernames || usernames.length === 0) return null;

  const text =
    usernames.length === 1
      ? `${usernames[0]} is typing`
      : `${usernames.join(', ')} are typing`;

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gray-500"
            style={{
              animation: `typing-dot 1.4s infinite ease-in-out`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <span className="text-xs text-gray-500">{text}</span>
      <style>{`
        @keyframes typing-dot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

// ─── ChatWindow ─────────────────────────────────────────────────────────────

export default function ChatWindow({
  conversationId,
  conversationName,
  conversationAvatar,
  isGroup,
  onBack,
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [mediaViewer, setMediaViewer] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [memberCount, setMemberCount] = useState(null);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const isNearBottom = useRef(true);

  // ─ Fetch messages with sender info ──────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;

    let cancelled = false;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!sender_id ( id, username, avatar_url )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (!cancelled && data) {
        const enriched = data.map((m) => ({
          ...m,
          sender_username: m.sender?.username,
          sender_avatar: m.sender?.avatar_url,
        }));
        setMessages(enriched);
        scrollToBottom('auto');
      }
    };

    fetchMessages();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // ─ Fetch member count for groups ────────────────────────────────────────
  useEffect(() => {
    if (!conversationId || !isGroup) return;

    const fetchCount = async () => {
      const { count } = await supabase
        .from('conversation_participants')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);
      setMemberCount(count);
    };

    fetchCount();
  }, [conversationId, isGroup]);

  // ─ Realtime subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new;

          // Fetch sender info
          const { data: senderData } = await supabase
            .from('users')
            .select('id, username, avatar_url')
            .eq('id', newMsg.sender_id)
            .single();

          const enriched = {
            ...newMsg,
            sender_username: senderData?.username,
            sender_avatar: senderData?.avatar_url,
          };

          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === enriched.id)) return prev;
            return [...prev, enriched];
          });

          if (isNearBottom.current) {
            scrollToBottom('smooth');
          } else {
            setShowScrollButton(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // ─ Typing indicator subscription ────────────────────────────────────────
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const names = Object.values(presenceState)
          .flat()
          .filter((p) => p.user_id !== user?.id)
          .map((p) => p.username);
        setTypingUsers(names);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  // ─ Scroll handling ──────────────────────────────────────────────────────
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }, 50);
    setShowScrollButton(false);
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 120;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    isNearBottom.current = atBottom;
    setShowScrollButton(!atBottom);
  }, []);

  // ─ Message actions ──────────────────────────────────────────────────────
  const handleReply = useCallback((msg) => {
    setReplyingTo(msg);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleReact = useCallback(
    async (messageId, emoji) => {
      if (!user) return;

      // Optimistic update
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = { ...(m.reactions || {}) };
          const users = Array.isArray(reactions[emoji]) ? [...reactions[emoji]] : [];

          if (users.includes(user.id)) {
            // Toggle off
            const filtered = users.filter((u) => u !== user.id);
            if (filtered.length === 0) {
              delete reactions[emoji];
            } else {
              reactions[emoji] = filtered;
            }
          } else {
            reactions[emoji] = [...users, user.id];
          }

          return { ...m, reactions };
        })
      );

      // Find the message to get current reactions from state
      const msg = messages.find((m) => m.id === messageId);
      const currentReactions = { ...(msg?.reactions || {}) };
      const currentUsers = Array.isArray(currentReactions[emoji]) ? [...currentReactions[emoji]] : [];

      if (currentUsers.includes(user.id)) {
        const filtered = currentUsers.filter((u) => u !== user.id);
        if (filtered.length === 0) {
          delete currentReactions[emoji];
        } else {
          currentReactions[emoji] = filtered;
        }
      } else {
        currentReactions[emoji] = [...currentUsers, user.id];
      }

      await supabase
        .from('messages')
        .update({ reactions: currentReactions })
        .eq('id', messageId);
    },
    [user, messages]
  );

  const handleDelete = useCallback(async (messageId) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    await supabase.from('messages').delete().eq('id', messageId);
  }, []);

  const handleOpenMedia = useCallback((url, type) => {
    setMediaViewer({ url, type });
  }, []);

  // ─ Build replied-message lookup ─────────────────────────────────────────
  const messageMap = {};
  for (const m of messages) {
    messageMap[m.id] = m;
  }

  const dateGroups = groupMessagesByDate(messages);

  // ─ Render ───────────────────────────────────────────────────────────────
  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#050505]">
        <div className="text-center space-y-3">
          <div className="text-4xl opacity-20">💬</div>
          <p className="text-sm text-gray-600">Select a conversation to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#050505] h-full relative">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-[#1e1e1e]
                      bg-[#0a0a0a]/80 backdrop-blur-md z-20">
        {/* Back button (mobile) */}
        {onBack && (
          <button
            onClick={onBack}
            className="sm:hidden p-2 -ml-2 rounded-lg hover:bg-white/5 text-gray-400
                       hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        {/* Avatar */}
        {conversationAvatar ? (
          <img
            src={conversationAvatar}
            alt=""
            className="w-9 h-9 rounded-full object-cover border border-[#2a2a2a]"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[#1e1e1e] flex items-center justify-center
                          text-sm font-medium text-gray-400 border border-[#2a2a2a]">
            {(conversationName || '?')[0].toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-100 truncate">
            {conversationName || 'Conversation'}
          </h2>
          <p className="text-[11px] text-gray-500">
            {isGroup
              ? `${memberCount ?? '…'} members`
              : (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Online
                </span>
              )}
          </p>
        </div>
      </div>

      {/* ── Messages area ────────────────────────────────────────────────── */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4
                   scrollbar-thin scrollbar-thumb-[#1e1e1e] scrollbar-track-transparent"
      >
        {dateGroups.map((group) => (
          <div key={group.label}>
            {/* Date divider */}
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-[#1e1e1e]" />
              <span className="text-[10px] font-mono text-gray-600 uppercase tracking-wider">
                {group.label}
              </span>
              <div className="flex-1 h-px bg-[#1e1e1e]" />
            </div>

            {/* Messages in this date group */}
            <div className="space-y-2.5">
              {group.messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.sender_id === user?.id}
                  isGroup={isGroup}
                  repliedMessage={msg.reply_to ? messageMap[msg.reply_to] : null}
                  onReply={handleReply}
                  onReact={handleReact}
                  onOpenMedia={handleOpenMedia}
                  onDelete={handleDelete}
                  currentUserId={user?.id}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        <TypingIndicator usernames={typingUsers} />

        <div ref={messagesEndRef} />
      </div>

      {/* ── Scroll-to-bottom button ──────────────────────────────────────── */}
      {showScrollButton && (
        <button
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-28 right-6 z-20 flex items-center gap-2
                     px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full
                     text-xs text-gray-400 hover:text-white hover:border-[#3a3a3a]
                     shadow-lg shadow-black/40 transition-all cursor-pointer
                     animate-fade-up"
        >
          <ArrowDown size={14} />
          New messages
        </button>
      )}

      {/* ── Message input ────────────────────────────────────────────────── */}
      <MessageInput
        conversationId={conversationId}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
      />

      {/* ── Media viewer overlay ─────────────────────────────────────────── */}
      {mediaViewer && (
        <MediaViewer
          mediaUrl={mediaViewer.url}
          mediaType={mediaViewer.type}
          onClose={() => setMediaViewer(null)}
        />
      )}

      {/* Component-scoped animations */}
      <style>{`
        @keyframes fade-up {
          0%   { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up {
          animation: fade-up 0.2s ease forwards;
        }
      `}</style>
    </div>
  );
}
