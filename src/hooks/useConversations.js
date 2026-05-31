import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    // Get all conversation IDs the user participates in
    const { data: participations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (!participations || participations.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convoIds = participations.map((p) => p.conversation_id);

    // Fetch conversations with their participants and last message
    const { data: convos } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_participants(
          user_id,
          role,
          users(id, username, display_name, avatar_url, status, last_seen)
        )
      `)
      .in('id', convoIds)
      .order('created_at', { ascending: false });

    if (!convos) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Fetch last message for each conversation
    const enriched = await Promise.all(
      convos.map(async (convo) => {
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, created_at, sender_id, media_type')
          .eq('conversation_id', convo.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // For DMs, find the other user
        const otherParticipant = convo.conversation_participants?.find(
          (p) => p.user_id !== user.id
        );

        return {
          ...convo,
          lastMessage: lastMsg || null,
          otherUser: otherParticipant?.users || null,
          displayName: convo.is_group
            ? convo.name || 'Unnamed Group'
            : otherParticipant?.users?.display_name || otherParticipant?.users?.username || 'Unknown',
          displayAvatar: convo.is_group
            ? convo.group_avatar_url
            : otherParticipant?.users?.avatar_url,
        };
      })
    );

    // Sort by last message time
    enriched.sort((a, b) => {
      const aTime = a.lastMessage?.created_at || a.created_at;
      const bTime = b.lastMessage?.created_at || b.created_at;
      return new Date(bTime) - new Date(aTime);
    });

    setConversations(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();

    // Subscribe to new messages to update last message preview
    const channel = supabase
      .channel('conversations_updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, () => {
        fetchConversations();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversation_participants',
      }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

  const createDM = useCallback(async (otherUserId) => {
    // Check if DM already exists
    const existing = conversations.find(
      (c) => !c.is_group && c.otherUser?.id === otherUserId
    );
    if (existing) return existing.id;

    // Create new conversation
    const { data: newConvo, error } = await supabase
      .from('conversations')
      .insert({ is_group: false, created_by: user.id })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('conversation_participants').insert([
      { conversation_id: newConvo.id, user_id: user.id, role: 'member' },
      { conversation_id: newConvo.id, user_id: otherUserId, role: 'member' },
    ]);

    await fetchConversations();
    return newConvo.id;
  }, [user, conversations, fetchConversations]);

  const createGroup = useCallback(async (name, memberIds) => {
    const { data: newConvo, error } = await supabase
      .from('conversations')
      .insert({ is_group: true, name, created_by: user.id })
      .select()
      .single();

    if (error) throw error;

    const participants = [
      { conversation_id: newConvo.id, user_id: user.id, role: 'admin' },
      ...memberIds.map((id) => ({
        conversation_id: newConvo.id,
        user_id: id,
        role: 'member',
      })),
    ];

    await supabase.from('conversation_participants').insert(participants);
    await fetchConversations();
    return newConvo.id;
  }, [user, fetchConversations]);

  return {
    conversations,
    loading,
    createDM,
    createGroup,
    refetch: fetchConversations,
  };
}
