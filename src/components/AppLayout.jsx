import { useState, useCallback, useRef, useEffect } from 'react';
import { MessageCircle, Users, UserPlus, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const TABS = [
  { id: 'dms', icon: MessageCircle, label: 'Messages' },
  { id: 'groups', icon: Users, label: 'Groups' },
];

const BOTTOM_ACTIONS = [
  { id: 'friends', icon: UserPlus, label: 'Friends' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

function getInitials(user) {
  if (!user) return '?';
  const meta = user.user_metadata || {};
  const name = meta.display_name || meta.full_name || meta.username || user.email || '';
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function Tooltip({ text, children }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);

  const handleEnter = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.top + rect.height / 2, left: rect.right + 10 });
    }
    setShow(true);
  }, []);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className="fixed z-50 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none"
          style={{
            top: pos.top,
            left: pos.left,
            transform: 'translateY(-50%)',
            background: '#1e1e1e',
            color: '#e4e4e7',
            border: '1px solid #2a2a2a',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

function SidebarButton({ icon: Icon, label, isActive, onClick }) {
  return (
    <Tooltip text={label}>
      <button
        onClick={onClick}
        className="relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-150 group"
        style={{
          background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
          color: isActive ? '#818cf8' : '#a1a1aa',
        }}
      >
        {/* Active indicator bar */}
        {isActive && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
            style={{ background: '#6366f1', left: '-8px' }}
          />
        )}
        <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
      </button>
    </Tooltip>
  );
}

function UserAvatar({ user, onClick }) {
  const initials = getInitials(user);

  return (
    <Tooltip text="Profile">
      <button
        onClick={onClick}
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-150 hover:ring-2 hover:ring-[#2a2a2a]"
        style={{
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#ffffff',
        }}
      >
        {initials}
      </button>
    </Tooltip>
  );
}

/* ── Mobile Bottom Nav ───────────────────── */

function MobileBottomNav({ activeTab, onTabChange, user }) {
  const allItems = [
    ...TABS,
    ...BOTTOM_ACTIONS,
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 safe-area-bottom"
      style={{
        height: '60px',
        background: '#0a0a0a',
        borderTop: '1px solid #1e1e1e',
      }}
    >
      {allItems.map(({ id, icon: Icon, label }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors duration-150"
            style={{
              color: isActive ? '#818cf8' : '#52525b',
            }}
          >
            <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ── Desktop Sidebar ─────────────────────── */

function DesktopSidebar({ activeTab, onTabChange, user }) {
  return (
    <aside
      className="hidden md:flex flex-col items-center py-4 flex-shrink-0"
      style={{
        width: '64px',
        background: '#0a0a0a',
        borderRight: '1px solid #1e1e1e',
      }}
    >
      {/* Logo */}
      <div className="mb-4 flex-shrink-0">
        <img
          src="/logo1.png"
          alt="Blackroom"
          className="w-8 h-8 rounded-lg object-contain"
          draggable={false}
        />
      </div>

      {/* Divider */}
      <div className="w-8 h-px mb-3" style={{ background: '#1e1e1e' }} />

      {/* Main Tabs */}
      <div className="flex flex-col items-center gap-1.5">
        {TABS.map((tab) => (
          <SidebarButton
            key={tab.id}
            icon={tab.icon}
            label={tab.label}
            isActive={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          />
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom Divider */}
      <div className="w-8 h-px mb-3" style={{ background: '#1e1e1e' }} />

      {/* Bottom Actions */}
      <div className="flex flex-col items-center gap-1.5 mb-3">
        {BOTTOM_ACTIONS.map((action) => (
          <SidebarButton
            key={action.id}
            icon={action.icon}
            label={action.label}
            isActive={activeTab === action.id}
            onClick={() => onTabChange(action.id)}
          />
        ))}
      </div>

      {/* User Avatar */}
      <UserAvatar
        user={user}
        onClick={() => onTabChange('profile')}
      />
    </aside>
  );
}

/* ── Main Layout ─────────────────────────── */

function AppLayout({ children, activeTab, onTabChange }) {
  const { user } = useAuth();

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: '#050505' }}>
      {/* Desktop Sidebar */}
      <DesktopSidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        user={user}
      />

      {/* Content Area */}
      <div className="flex flex-1 min-w-0 overflow-hidden">
        {children}
      </div>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        user={user}
      />
    </div>
  );
}

export default AppLayout;
