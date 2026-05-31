import { useState, useCallback, useRef, useEffect } from 'react';
import { MessageCircle, Users, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const TABS = [
  { id: 'dms', icon: MessageCircle, label: 'Messages' },
  { id: 'groups', icon: Users, label: 'Groups' },
];

const BOTTOM_ACTIONS = [
  { id: 'profile', icon: User, label: 'Profile' },
];

function getInitials(name) {
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
          color: isActive ? '#c4b5fd' : '#a1a1aa',
        }}
      >
        {/* Active indicator bar */}
        {isActive && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
            style={{ background: '#a78bfa', left: '-8px' }}
          />
        )}
        <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
      </button>
    </Tooltip>
  );
}

function UserAvatar({ user, onClick }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { supabase } = await import('../lib/supabase');
      const { data } = await supabase.from('users').select('username, display_name, avatar_url').eq('id', user.id).single();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [user]);

  const displayName = profile?.display_name || profile?.username || user?.email;
  const initials = getInitials(displayName);

  return (
    <Tooltip text="Profile">
      <button
        onClick={onClick}
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-150 hover:ring-2 hover:ring-[#2a2a2a] overflow-hidden bg-[#1e1e1e]"
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', color: '#ffffff' }}>
            {initials}
          </div>
        )}
      </button>
    </Tooltip>
  );
}

/* ── Mobile Bottom Nav ───────────────────── */

function MobileBottomNav({ activeTab, onTabChange }) {
  const allItems = [
    ...TABS,
    ...BOTTOM_ACTIONS,
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2"
      style={{
        height: 'calc(60px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
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
              color: isActive ? '#c4b5fd' : '#52525b',
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
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#a78bfa] to-[#c4b5fd] shadow-lg shadow-[#a78bfa]/20">
          <span className="text-xl font-black text-black tracking-tighter">B</span>
        </div>
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

      {/* User Avatar */}
      <div className="mb-4">
        <UserAvatar
          user={user}
          onClick={() => onTabChange('profile')}
        />
      </div>
    </aside>
  );
}

/* ── Main Layout ─────────────────────────── */

function AppLayout({ children, activeTab, onTabChange }) {
  const { user } = useAuth();

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden" style={{ background: '#050505' }}>
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
