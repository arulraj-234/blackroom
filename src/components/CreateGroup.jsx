import React, { useState } from 'react';
import { X, Users } from 'lucide-react';
import { useFriends } from '../hooks/useFriends';
import { useConversations } from '../hooks/useConversations';

export default function CreateGroup({ onClose, onCreated }) {
  const { friends } = useFriends();
  const { createGroup } = useConversations();
  const [name, setName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleMember = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Group name is required');
      return;
    }
    if (selectedIds.length === 0) {
      setError('Add at least one member');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const convoId = await createGroup(name.trim(), selectedIds);
      onCreated?.(convoId);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1e1e1e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#6366f1]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#6366f1]" />
            </div>
            <h3 className="text-lg font-bold text-[#e4e4e7]">Create Group</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-[#71717a] hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#71717a] mb-1.5 font-medium">Group Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Squad, Homies, Project X..."
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-[#e4e4e7] placeholder-[#52525b] focus:outline-none focus:border-[#3f3f46] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#71717a] mb-1.5 font-medium">
              Add Members ({selectedIds.length} selected)
            </label>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-[#2a2a2a] bg-[#0a0a0a]">
              {friends.length === 0 ? (
                <p className="p-4 text-sm text-[#52525b] text-center">Add friends first to create a group</p>
              ) : (
                friends.map((friend) => {
                  const selected = selectedIds.includes(friend.id);
                  return (
                    <button
                      key={friend.id}
                      onClick={() => toggleMember(friend.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        selected ? 'bg-[#6366f1]/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selected ? 'bg-[#6366f1] border-[#6366f1]' : 'border-[#3f3f46]'
                      }`}>
                        {selected && <span className="text-white text-xs">✓</span>}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#1e1e1e] flex items-center justify-center text-xs font-bold text-[#a1a1aa]">
                        {friend.username?.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm text-[#e4e4e7]">{friend.display_name || friend.username}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#1e1e1e] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[#2a2a2a] text-[#a1a1aa] hover:bg-white/5 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim() || selectedIds.length === 0}
            className="flex-1 px-4 py-2.5 rounded-lg bg-[#6366f1] hover:bg-[#818cf8] text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}
