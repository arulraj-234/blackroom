import { useState, useCallback, useEffect, useRef } from 'react';
import AppLayout from '../components/AppLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ConversationList from '../components/ConversationList';
import ChatWindow from '../components/ChatWindow';
import FriendsPanel from '../components/FriendsPanel';
import CreateGroup from '../components/CreateGroup';
import UserProfile from '../components/UserProfile';
import { useConversations } from '../hooks/useConversations';


export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dms');
  const [selectedConvoId, setSelectedConvoId] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showFriendsPanel, setShowFriendsPanel] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { conversations, createDM, updateLastRead } = useConversations();
  const { user } = useAuth();
  
  const selectedConvoIdRef = useRef(selectedConvoId);
  const conversationsRef = useRef(conversations);

  useEffect(() => {
    selectedConvoIdRef.current = selectedConvoId;
    if (selectedConvoId) {
      updateLastRead(selectedConvoId);
    }
  }, [selectedConvoId, updateLastRead]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMsg = payload.new;

          if (newMsg.sender_id === user.id) return;
          if (newMsg.conversation_id === selectedConvoIdRef.current) {
            updateLastRead(selectedConvoIdRef.current);
            return;
          }

          const convo = conversationsRef.current.find(c => c.id === newMsg.conversation_id);
          if (!convo) return;

          const { data: senderData } = await supabase
            .from('users')
            .select('display_name, username')
            .eq('id', newMsg.sender_id)
            .single();
            
          const senderName = senderData?.display_name || senderData?.username || 'Someone';

          if ('Notification' in window && Notification.permission === 'granted') {
            const title = convo.is_group 
              ? `${senderName} in ${convo.displayName}`
              : senderName;
            
            const notification = new Notification(title, {
              body: newMsg.content || 'Sent an attachment',
            });
            
            notification.onclick = () => {
              window.focus();
            };
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friendships',
          filter: `addressee_id=eq.${user.id}`
        },
        async (payload) => {
          const { data: senderData } = await supabase
            .from('users')
            .select('display_name, username')
            .eq('id', payload.new.requester_id)
            .single();
            
          const senderName = senderData?.display_name || senderData?.username || 'Someone';

          if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification('New Friend Request', {
              body: `${senderName} sent you a friend request!`,
            });
            notification.onclick = () => {
              window.focus();
            };
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, updateLastRead]);

  // Filter conversations by tab
  const filteredConvos = conversations.filter((c) =>
    activeTab === 'groups' ? c.is_group : !c.is_group
  );

  // Get selected conversation data
  const selectedConvo = conversations.find((c) => c.id === selectedConvoId);

  const handleTabChange = useCallback((tab) => {
    if (tab === 'profile') {
      setShowProfile(true);
      return;
    }
    setActiveTab(tab);
    setSelectedConvoId(null);
  }, []);

  const handleNewChat = useCallback(async () => {
    if (activeTab === 'groups') {
      setShowCreateGroup(true);
    } else if (activeTab === 'dms') {
      setShowFriendsPanel(true);
    }
  }, [activeTab]);

  const handleStartDM = useCallback(async (friendId) => {
    try {
      const convoId = await createDM(friendId);
      setActiveTab('dms');
      setSelectedConvoId(convoId);
      setShowFriendsPanel(false);
    } catch (err) {
      console.error('Failed to start DM:', err);
    }
  }, [createDM]);

  const handleGroupCreated = useCallback((convoId) => {
    setActiveTab('groups');
    setSelectedConvoId(convoId);
  }, []);

  return (
    <>
      <AppLayout activeTab={activeTab} onTabChange={handleTabChange}>
        <div className="flex h-full w-full overflow-hidden pb-[60px] md:pb-0">
          {/* Middle panel */}
          <div className={`h-full w-full md:w-80 flex-shrink-0 border-r border-[#1e1e1e] bg-[#0a0a0a] ${selectedConvoId ? 'hidden md:block' : 'block'}`}>
            <ConversationList
              conversations={filteredConvos}
              selectedId={selectedConvoId}
              onSelect={setSelectedConvoId}
              onNewChat={handleNewChat}
              activeTab={activeTab}
            />
          </div>

          {/* Main chat area */}
          <div className={`h-full flex-1 min-w-0 bg-[#050505] ${selectedConvoId ? 'block' : 'hidden md:block'}`}>
            <ChatWindow
              conversationId={selectedConvoId}
              conversationName={selectedConvo?.displayName}
              conversationAvatar={selectedConvo?.displayAvatar}
              isGroup={selectedConvo?.is_group}
              participants={selectedConvo?.conversation_participants}
              onBack={() => setSelectedConvoId(null)}
            />
          </div>
        </div>
      </AppLayout>

      {/* Modals */}
      {showFriendsPanel && (
        <FriendsPanel
          onStartDM={handleStartDM}
          onClose={() => setShowFriendsPanel(false)}
        />
      )}
      {showCreateGroup && (
        <CreateGroup
          onClose={() => setShowCreateGroup(false)}
          onCreated={handleGroupCreated}
        />
      )}
      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}
    </>
  );
}
