import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useMessages(conversationId) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, username, display_name, avatar_url),
        reactions:message_reactions(id, emoji, user_id),
        reply:messages!messages_reply_to_fkey(id, content, sender:users!messages_sender_id_fkey(username))
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    setMessages([]);
    setLoading(true);
    fetchMessages();

    // Cleanup previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    if (!conversationId) return;

    // Subscribe to new messages
    const channelName = `messages_${conversationId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        // Fetch full message with relations
        const { data } = await supabase
          .from('messages')
          .select(`
            *,
            sender:users!messages_sender_id_fkey(id, username, display_name, avatar_url),
            reactions:message_reactions(id, emoji, user_id),
            reply:messages!messages_reply_to_fkey(id, content, sender:users!messages_sender_id_fkey(username))
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.find((m) => m.id === data.id)) return prev;
            return [...prev, data];
          });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m))
        );
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
      }, (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
      }, () => {
        // Refetch to get updated reaction counts
        fetchMessages();
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, fetchMessages]);

  const sendMessage = useCallback(async ({ content, replyTo, mediaUrl, mediaType, mediaMetadata }) => {
    if (!conversationId || !user) return;

    const msg = {
      conversation_id: conversationId,
      sender_id: user.id,
      content: content || null,
      reply_to: replyTo || null,
      media_url: mediaUrl || null,
      media_type: mediaType || null,
      media_metadata: mediaMetadata || null,
    };

    const { error } = await supabase.from('messages').insert(msg);
    if (error) throw error;
  }, [conversationId, user]);

  const editMessage = useCallback(async (messageId, newContent) => {
    const { error } = await supabase
      .from('messages')
      .update({
        content: newContent,
        is_edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (error) throw error;
  }, []);

  const deleteMessage = useCallback(async (messageId) => {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) throw error;
  }, []);

  const addReaction = useCallback(async (messageId, emoji) => {
    const { error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      });

    // Ignore duplicate error (user already reacted with same emoji)
    if (error && !error.message.includes('duplicate')) throw error;
  }, [user]);

  const removeReaction = useCallback(async (messageId, emoji) => {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji);

    if (error) throw error;
  }, [user]);

  return {
    messages,
    loading,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    refetch: fetchMessages,
  };
}
