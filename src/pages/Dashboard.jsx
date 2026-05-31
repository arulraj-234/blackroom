import React, { useState, useCallback } from 'react';
import AppLayout from '../components/AppLayout';
import ConversationList from '../components/ConversationList';
import ChatWindow from '../components/ChatWindow';
import FriendsPanel from '../components/FriendsPanel';
import CreateGroup from '../components/CreateGroup';
import UserProfile from '../components/UserProfile';
import { useConversations } from '../hooks/useConversations';
import { useFriends } from '../hooks/useFriends';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dms');
  const [selectedConvoId, setSelectedConvoId] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { conversations, loading: convosLoading, createDM } = useConversations();
  const { friends } = useFriends();

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
    }
    // For DMs, the user goes to Friends panel and clicks a friend
  }, [activeTab]);

  const handleStartDM = useCallback(async (friendId) => {
    try {
      const convoId = await createDM(friendId);
      setActiveTab('dms');
      setSelectedConvoId(convoId);
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
        <div className="flex h-full w-full overflow-hidden">
          {/* Middle panel: changes based on tab */}
          {activeTab === 'friends' ? (
            <FriendsPanel onStartDM={handleStartDM} />
          ) : (
            <ConversationList
              conversations={filteredConvos}
              selectedId={selectedConvoId}
              onSelect={setSelectedConvoId}
              onNewChat={handleNewChat}
              activeTab={activeTab}
            />
          )}

          {/* Main chat area */}
          <ChatWindow
            conversationId={selectedConvoId}
            conversationName={selectedConvo?.displayName}
            isGroup={selectedConvo?.is_group}
          />
        </div>
      </AppLayout>

      {/* Modals */}
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
