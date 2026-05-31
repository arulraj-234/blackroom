import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFriends } from '../hooks/useFriends';
import { Search, UserPlus, UserCheck, Clock, X, Check, UserMinus } from 'lucide-react';

export default function FriendsPanel() {
  const { user } = useAuth();
  const { friends, incomingRequests, outgoingRequests, sendRequest, acceptRequest, declineRequest, removeFriend } = useFriends();
  const [tab, setTab] = useState('friends'); // friends | requests | search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError('');
    setSearchResults([]);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('username', `%${searchQuery.trim()}%`)
      .neq('id', user.id)
      .limit(10);

    if (error) {
      setSearchError('Search failed. Try again.');
    } else if (!data || data.length === 0) {
      setSearchError('No users found with that username.');
    } else {
      setSearchResults(data);
    }
    setSearching(false);
  };

  const isFriend = (userId) => friends.some((f) => f.id === userId);
  const hasPendingRequest = (userId) =>
    outgoingRequests.some((r) => r.id === userId) ||
    incomingRequests.some((r) => r.id === userId);

  const handleSendRequest = async (userId) => {
    try {
      await sendRequest(userId);
    } catch (err) {
      console.error('Failed to send request:', err);
    }
  };

  const tabClass = (t) =>
    `px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all ${
      tab === t ? 'bg-white/10 text-white' : 'text-[#71717a] hover:text-white hover:bg-white/5'
    }`;

  return (
    <div className="w-80 border-r border-[#1e1e1e] bg-[#0a0a0a] h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#1e1e1e]">
        <h2 className="text-lg font-bold text-[#e4e4e7] mb-3">Friends</h2>
        <div className="flex gap-1">
          <button onClick={() => setTab('friends')} className={tabClass('friends')}>
            All
          </button>
          <button onClick={() => setTab('requests')} className={tabClass('requests')}>
            Requests
            {incomingRequests.length > 0 && (
              <span className="ml-1.5 bg-[#6366f1] text-white text-[10px] w-4 h-4 rounded-full inline-flex items-center justify-center">
                {incomingRequests.length}
              </span>
            )}
          </button>
          <button onClick={() => setTab('search')} className={tabClass('search')}>
            Add
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Friends List */}
        {tab === 'friends' && (
          <div>
            {friends.length === 0 ? (
              <div className="p-6 text-center">
                <UserPlus className="w-10 h-10 text-[#3f3f46] mx-auto mb-3" />
                <p className="text-sm text-[#71717a]">No friends yet</p>
                <p className="text-xs text-[#52525b] mt-1">Search for users to add them</p>
              </div>
            ) : (
              friends.map((friend) => (
                <div key={friend.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-[#1e1e1e] flex items-center justify-center text-sm font-bold text-[#a1a1aa] border border-[#2a2a2a]">
                    {friend.username?.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#e4e4e7] truncate">{friend.display_name || friend.username}</div>
                    <div className="text-xs text-[#52525b]">@{friend.username}</div>
                  </div>
                  <button
                    onClick={() => removeFriend(friend.friendshipId)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-[#52525b] hover:text-red-400 transition-all"
                    title="Remove friend"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Requests */}
        {tab === 'requests' && (
          <div>
            {incomingRequests.length > 0 && (
              <div>
                <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-[#52525b] font-semibold">Incoming</div>
                {incomingRequests.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-[#1e1e1e] flex items-center justify-center text-sm font-bold text-[#a1a1aa] border border-[#2a2a2a]">
                      {req.username?.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#e4e4e7] truncate">{req.username}</div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => acceptRequest(req.friendshipId)}
                        className="p-1.5 rounded-lg bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e]/20 transition-all"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => declineRequest(req.friendshipId)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {outgoingRequests.length > 0 && (
              <div>
                <div className="px-4 py-2 text-[10px] uppercase tracking-widest text-[#52525b] font-semibold">Pending</div>
                {outgoingRequests.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-[#1e1e1e] flex items-center justify-center text-sm font-bold text-[#a1a1aa] border border-[#2a2a2a]">
                      {req.username?.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#e4e4e7] truncate">{req.username}</div>
                    </div>
                    <Clock className="w-4 h-4 text-[#52525b]" />
                  </div>
                ))}
              </div>
            )}
            {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
              <div className="p-6 text-center">
                <Clock className="w-10 h-10 text-[#3f3f46] mx-auto mb-3" />
                <p className="text-sm text-[#71717a]">No pending requests</p>
              </div>
            )}
          </div>
        )}

        {/* Search / Add Friend */}
        {tab === 'search' && (
          <div className="p-4">
            <div className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg pl-9 pr-3 py-2.5 text-sm text-[#e4e4e7] placeholder-[#52525b] focus:outline-none focus:border-[#3f3f46] transition-colors"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="px-4 py-2 bg-[#6366f1] hover:bg-[#818cf8] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {searching ? '...' : 'Search'}
              </button>
            </div>

            {searchError && (
              <p className="text-sm text-[#71717a] text-center py-4">{searchError}</p>
            )}

            {searchResults.map((result) => (
              <div key={result.id} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-colors">
                <div className="w-10 h-10 rounded-full bg-[#1e1e1e] flex items-center justify-center text-sm font-bold text-[#a1a1aa] border border-[#2a2a2a]">
                  {result.username?.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#e4e4e7] truncate">{result.display_name || result.username}</div>
                  <div className="text-xs text-[#52525b]">@{result.username}</div>
                </div>
                {isFriend(result.id) ? (
                  <span className="text-xs text-[#22c55e] flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" /> Friends
                  </span>
                ) : hasPendingRequest(result.id) ? (
                  <span className="text-xs text-[#71717a] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Pending
                  </span>
                ) : (
                  <button
                    onClick={() => handleSendRequest(result.id)}
                    className="px-3 py-1.5 bg-[#6366f1]/10 text-[#6366f1] hover:bg-[#6366f1]/20 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Add
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
