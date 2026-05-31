import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Sidebar({ onSelectUser }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .neq('id', currentUser.id)
        .order('username');
      
      if (!error && data) {
        setUsers(data);
      }
      setLoading(false);
    };

    fetchUsers();
  }, [currentUser]);

  return (
    <div className="w-80 border-r border-white/10 bg-black/50 backdrop-blur-xl h-full flex flex-col">
      <div className="p-6 border-b border-white/10">
        <h2 className="text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500">OPERATIVES</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-sm text-gray-500 text-center animate-pulse tracking-widest uppercase">Scanning sectors...</div>
        ) : users.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 text-center tracking-widest uppercase">No operatives found.</div>
        ) : (
          users.map((u) => (
            <button
              key={u.id}
              onClick={() => onSelectUser(u)}
              className="w-full text-left p-4 border-b border-white/5 hover:bg-white/10 transition-colors flex items-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-gray-300 border border-white/20 group-hover:border-white/50 shadow-inner font-bold">
                {u.username.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-sm text-gray-200 tracking-wider">{u.username}</div>
                <div className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Available</div>
              </div>
            </button>
          ))
        )}
      </div>
      <div className="p-4 border-t border-white/10 flex justify-between items-center bg-black">
        <div className="text-xs text-gray-400 uppercase tracking-widest truncate max-w-[150px]">
          {currentUser.email}
        </div>
        <button 
          onClick={() => supabase.auth.signOut()}
          className="text-xs text-red-500 hover:text-red-400 transition-colors uppercase tracking-widest font-bold px-3 py-1 border border-red-500/20 hover:border-red-500/50 rounded-lg bg-red-500/5"
        >
          Abort
        </button>
      </div>
    </div>
  );
}
