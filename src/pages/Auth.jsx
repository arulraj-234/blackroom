import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        // After signup, insert the public profile
        if (data.user) {
            const { error: insertError } = await supabase.from('users').insert({
                id: data.user.id,
                username: username,
                display_name: username
            });
            if (insertError) {
                console.error("Error creating profile:", insertError);
                throw new Error("Account created, but failed to setup profile. Please contact support.");
            }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl transition-all duration-300">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-widest mb-2 text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500">
            BLACKROOM
          </h1>
          <p className="text-gray-400 text-sm tracking-widest uppercase font-semibold">Zero Trace. Total Stealth.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          {!isLogin && (
             <div className="space-y-1">
               <label className="block text-xs uppercase tracking-wider text-gray-400 ml-1">Operative Alias (Username)</label>
               <input 
                 type="text" 
                 required 
                 value={username}
                 onChange={(e) => setUsername(e.target.value)}
                 className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all"
                 placeholder="ghost_protocol"
               />
             </div>
          )}
          
          <div className="space-y-1">
            <label className="block text-xs uppercase tracking-wider text-gray-400 ml-1">Transmission Link (Email)</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all"
              placeholder="agent@shadow.net"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs uppercase tracking-wider text-gray-400 ml-1">Cipher Key (Password)</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-white text-black hover:bg-gray-200 transition-all rounded-xl py-3 mt-8 font-bold tracking-widest uppercase text-sm disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Initialize Link' : 'Create Protocol')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-gray-500 hover:text-white text-xs uppercase tracking-widest transition-colors"
          >
            {isLogin ? "Need a protocol? Register here" : "Already an operative? Login here"}
          </button>
        </div>
      </div>
    </div>
  );
}
