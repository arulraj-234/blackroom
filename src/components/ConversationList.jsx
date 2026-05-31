import { useState, useMemo, useCallback } from 'react';
import { Search, Plus, MessageCircle, Users, Hash } from 'lucide-react';

/**
 * Format a timestamp to a relative string.
 * @param {string|number|Date} timestamp
 * @returns {string}
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diff = Math.max(0, now - time);

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get initials from a name string.
 */
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/* ── Avatar ─────────────────────────────────── */

function ConversationAvatar({ conversation }) {
  const isGroup = conversation.type === 'group';
  const initials = getInitials(conversation.name);

  if (isGroup) {
    return (
      <div
        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #1e1e2e, #2a2a3a)',
          border: '1px solid #2a2a2a',
        }}
      >
        <Users size={16} className="text-[#a1a1aa]" />
      </div>
    );
  }

  // DM avatar — generate a consistent color from the name
  const hue = (conversation.name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

  return (
    <div
      className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold text-white"
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 60%, 40%), hsl(${hue + 30}, 50%, 50%))`,
      }}
    >
      {initials}
    </div>
  );
}

/* ── Conversation Item ──────────────────────── */

function ConversationItem({ conversation, isSelected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(conversation.id)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-100 text-left group"
      style={{
        background: isSelected ? '#1e1e1e' : 'transparent',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) e.currentTarget.style.background = 'rgba(30,30,30,0.5)';
      }}
      onMouseLeave={(e) => {
        if (!isSelected) e.currentTarget.style.background = 'transparent';
      }}
    >
      {/* Avatar */}
      <ConversationAvatar conversation={conversation} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-sm font-medium truncate"
            style={{ color: isSelected ? '#e4e4e7' : '#e4e4e7' }}
          >
            {conversation.name}
          </span>
          <span
            className="text-[11px] flex-shrink-0 font-mono"
            style={{ color: '#52525b' }}
          >
            {formatRelativeTime(conversation.lastMessageAt)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className="text-[13px] truncate"
            style={{ color: '#52525b' }}
          >
            {conversation.lastMessage || 'No messages yet'}
          </p>

          {/* Unread badge */}
          {conversation.unreadCount > 0 && (
            <span
              className="flex-shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-semibold rounded-full text-white"
              style={{ background: '#6366f1' }}
            >
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ── Empty State ────────────────────────────── */

function EmptyState({ type }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'rgba(99, 102, 241, 0.08)' }}
      >
        {type === 'groups' ? (
          <Users size={24} className="text-[#6366f1]" />
        ) : (
          <MessageCircle size={24} className="text-[#6366f1]" />
        )}
      </div>
      <h3 className="text-sm font-medium mb-1" style={{ color: '#e4e4e7' }}>
        No conversations yet
      </h3>
      <p className="text-xs leading-relaxed" style={{ color: '#52525b', maxWidth: '200px' }}>
        {type === 'groups'
          ? 'Create a group to start chatting with multiple people.'
          : 'Start a new conversation to begin messaging.'}
      </p>
    </div>
  );
}

/* ── Main Component ─────────────────────────── */

function ConversationList({
  conversations = [],
  selectedId,
  onSelect,
  onNewChat,
  activeTab = 'dms',
}) {
  const [search, setSearch] = useState('');

  const title = activeTab === 'groups' ? 'Groups' : 'Messages';

  // Filter conversations by search query
  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase().trim();
    return conversations.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.lastMessage?.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const handleSearchChange = useCallback((e) => {
    setSearch(e.target.value);
  }, []);

  return (
    <div
      className="flex flex-col h-full flex-shrink-0 overflow-hidden"
      style={{
        width: '320px',
        background: '#0a0a0a',
        borderRight: '1px solid #1e1e1e',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <h2 className="text-base font-semibold" style={{ color: '#e4e4e7' }}>
          {title}
        </h2>
        <button
          onClick={onNewChat}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
          style={{
            background: 'rgba(99, 102, 241, 0.1)',
            color: '#6366f1',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
          }}
          title={activeTab === 'groups' ? 'New group' : 'New message'}
        >
          <Plus size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2 flex-shrink-0">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: '#52525b' }}
          />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg outline-none transition-all duration-150"
            style={{
              background: '#111111',
              border: '1px solid #1e1e1e',
              color: '#e4e4e7',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#2a2a2a';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#1e1e1e';
            }}
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 ? (
          search.trim() ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-xs" style={{ color: '#52525b' }}>
                No results for "{search}"
              </p>
            </div>
          ) : (
            <EmptyState type={activeTab} />
          )
        ) : (
          <div className="flex flex-col gap-0.5">
            {filtered.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedId === conversation.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ConversationList;
