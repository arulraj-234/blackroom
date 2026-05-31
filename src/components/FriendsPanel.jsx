import { useState, useEffect } from 'react';

import { useFriends } from '../hooks/useFriends';
import { UserPlus, Check, X, Search, User, MessageCircle } from 'lucide-react';

export default function FriendsPanel({ onStartDM, onClose }) {
  const { friends, incomingRequests, outgoingRequests, loading, searchUsers, sendRequest, acceptRequest, declineRequest } = useFriends();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Search effect
  useEffect(() => {
    let timeout;
    if (activeTab === 'add' && searchQuery.trim().length >= 2) {
      timeout = setTimeout(async () => {
        setSearching(true);
        const results = await searchUsers(searchQuery);
        setSearchResults(results);
        setSearching(false);
      }, 500);
    } else {
      setSearchResults([]);
    }
    return () => clearTimeout(timeout);
  }, [searchQuery, activeTab, searchUsers]);

  const handleStartDM = (friendId) => {
    if (onStartDM) onStartDM(friendId);
  };

  const getRequestStatus = (userId) => {
    if (friends.find((f) => f.id === userId)) return 'friends';
    if (outgoingRequests.find((r) => r.id === userId)) return 'sent';
    if (incomingRequests.find((r) => r.id === userId)) return 'pending';
    return 'none';
  };

  const pendingCount = incomingRequests?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden animate-in flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-col border-b border-[#1e1e1e]">
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="text-xl font-bold tracking-tight text-[#e4e4e7]">Friends</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-[#71717a] hover:text-white transition-all">
              <X size={20} />
            </button>
          </div>
          <div className="flex gap-1.5 px-5 pb-4">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'bg-white/10 text-white'
                  : 'text-[#a1a1aa] hover:bg-white/5 hover:text-[#e4e4e7]'
              }`}
            >
              All Friends
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-white/10 text-white'
                  : 'text-[#a1a1aa] hover:bg-white/5 hover:text-[#e4e4e7]'
              }`}
            >
              Pending
              {pendingCount > 0 && (
                <span className="flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold bg-[#a78bfa] text-white rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'add'
                  ? 'bg-[#a78bfa] text-white'
                  : 'text-[#a78bfa] hover:bg-[#a78bfa]/10'
              }`}
            >
              Add Friend
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-[#0a0a0a]">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin" />
            </div>
          ) : activeTab === 'all' ? (
            <div className="p-2">
              {friends.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                    <User size={20} className="text-[#52525b]" />
                  </div>
                  <p className="text-[#a1a1aa] text-sm">No friends yet.</p>
                  <button
                    onClick={() => setActiveTab('add')}
                    className="mt-3 text-[#a78bfa] hover:text-[#c4b5fd] text-sm font-medium"
                  >
                    Add someone
                  </button>
                </div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      {friend.avatar_url ? (
                        <img src={friend.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#1e1e1e] flex items-center justify-center text-[#a1a1aa] font-bold text-sm border border-[#2a2a2a]">
                          {friend.username?.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-[#e4e4e7] font-medium text-sm">{friend.display_name || friend.username}</div>
                        <div className="text-[#52525b] text-xs">@{friend.username}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartDM(friend.id)}
                      className="w-8 h-8 rounded-full bg-white/5 hover:bg-[#a78bfa] text-[#a1a1aa] hover:text-white flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Message"
                    >
                      <MessageCircle size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'pending' ? (
            <div className="p-2 space-y-4">
              {/* Received Requests */}
              <div>
                <h3 className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#52525b]">
                  Received — {incomingRequests?.length || 0}
                </h3>
                {!incomingRequests || incomingRequests.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-[#71717a]">No pending requests</p>
                ) : (
                  incomingRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1e1e1e] flex items-center justify-center text-[#a1a1aa] font-bold text-sm">
                          {req.username?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[#e4e4e7] font-medium text-sm">{req.display_name || req.username}</div>
                          <div className="text-[#52525b] text-xs">Incoming request</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => acceptRequest(req.friendshipId)}
                          className="w-8 h-8 rounded-full bg-green-500/10 hover:bg-green-500/20 text-green-500 flex items-center justify-center transition-colors"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => declineRequest(req.friendshipId)}
                          className="w-8 h-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Sent Requests */}
              <div>
                <h3 className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#52525b]">
                  Sent — {outgoingRequests?.length || 0}
                </h3>
                {!outgoingRequests || outgoingRequests.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-[#71717a]">No sent requests</p>
                ) : (
                  outgoingRequests.map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#1e1e1e] flex items-center justify-center text-[#a1a1aa] font-bold text-sm">
                          {req.username?.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="text-[#e4e4e7] font-medium text-sm">{req.display_name || req.username}</div>
                      </div>
                      <button
                        onClick={() => declineRequest(req.friendshipId)}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 flex flex-col h-full">
              <div className="flex items-center bg-[#111] border border-[#2a2a2a] rounded-xl overflow-hidden focus-within:border-[#a78bfa] transition-colors shadow-inner">
                <div className="pl-4 text-[#52525b]">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none px-3 py-3.5 text-sm text-white placeholder-[#52525b] focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="mt-4 flex-1 overflow-y-auto">
                {searching ? (
                  <div className="flex justify-center py-8">
                    <div className="w-5 h-5 border-2 border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin" />
                  </div>
                ) : searchQuery.trim().length > 0 && searchResults.length === 0 ? (
                  <p className="text-center text-[#71717a] py-8 text-sm">No users found matching &quot;{searchQuery}&quot;</p>
                ) : (
                  <div className="space-y-1">
                    {searchResults.map((resultUser) => {
                      const status = getRequestStatus(resultUser.id);
                      return (
                        <div key={resultUser.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#1e1e1e] flex items-center justify-center text-[#a1a1aa] font-bold text-sm">
                              {resultUser.username?.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-[#e4e4e7] font-medium text-sm">{resultUser.display_name || resultUser.username}</div>
                              <div className="text-[#52525b] text-xs">@{resultUser.username}</div>
                            </div>
                          </div>
                          
                          {status === 'friends' ? (
                            <button
                              onClick={() => handleStartDM(resultUser.id)}
                              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-[#a78bfa] text-[#e4e4e7] hover:text-white text-xs font-medium transition-colors"
                            >
                              Message
                            </button>
                          ) : status === 'sent' ? (
                            <button disabled className="px-3 py-1.5 rounded-lg bg-white/5 text-[#71717a] text-xs font-medium cursor-not-allowed">
                              Sent
                            </button>
                          ) : status === 'pending' ? (
                            <button disabled className="px-3 py-1.5 rounded-lg bg-[#a78bfa]/20 text-[#c4b5fd] text-xs font-medium cursor-not-allowed">
                              Check Pending
                            </button>
                          ) : (
                            <button
                              onClick={() => sendRequest(resultUser.id)}
                              className="px-3 py-1.5 rounded-lg bg-[#a78bfa] hover:bg-[#c4b5fd] text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-lg shadow-[#a78bfa]/20"
                            >
                              <UserPlus size={14} /> Add
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
