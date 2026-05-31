import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFriendships = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('friendships')
      .select(`
        *,
        requester:users!friendships_requester_id_fkey(*),
        addressee:users!friendships_addressee_id_fkey(*)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (error) {
      console.error('Error fetching friendships:', error);
      return;
    }

    const accepted = [];
    const incoming = [];
    const outgoing = [];

    data?.forEach((f) => {
      if (f.status === 'accepted') {
        const friend = f.requester_id === user.id ? f.addressee : f.requester;
        accepted.push({ ...friend, friendshipId: f.id });
      } else if (f.status === 'pending') {
        if (f.addressee_id === user.id) {
          incoming.push({ ...f.requester, friendshipId: f.id });
        } else {
          outgoing.push({ ...f.addressee, friendshipId: f.id });
        }
      }
    });

    setFriends(accepted);
    setIncomingRequests(incoming);
    setOutgoingRequests(outgoing);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFriendships();

    // Subscribe to friendship changes
    const channel = supabase
      .channel('friendships_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friendships',
      }, () => {
        fetchFriendships();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchFriendships]);

  const sendRequest = useCallback(async (addresseeId) => {
    const { error } = await supabase
      .from('friendships')
      .insert({ requester_id: user.id, addressee_id: addresseeId });
    
    if (error) throw error;
    await fetchFriendships();
  }, [user, fetchFriendships]);

  const acceptRequest = useCallback(async (friendshipId) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', friendshipId);
    
    if (error) throw error;
    await fetchFriendships();
  }, [fetchFriendships]);

  const declineRequest = useCallback(async (friendshipId) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);
    
    if (error) throw error;
    await fetchFriendships();
  }, [fetchFriendships]);

  const removeFriend = useCallback(async (friendshipId) => {
    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);
    
    if (error) throw error;
    await fetchFriendships();
  }, [fetchFriendships]);

  const blockUser = useCallback(async (friendshipId) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'blocked', updated_at: new Date().toISOString() })
      .eq('id', friendshipId);
    
    if (error) throw error;
    await fetchFriendships();
  }, [fetchFriendships]);

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    blockUser,
    refetch: fetchFriendships,
  };
}
