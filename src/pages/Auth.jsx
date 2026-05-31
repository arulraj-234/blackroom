import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Auth() {
  const { user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

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
        if (username.length < 3) {
          throw new Error('Username must be at least 3 characters');
        }

        // Check if username is taken
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('username', username.trim().toLowerCase())
          .single();

        if (existing) {
          throw new Error('Username already taken');
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        if (data.user) {
          const { error: insertError } = await supabase.from('users').insert({
            id: data.user.id,
            username: username.trim().toLowerCase(),
            display_name: username.trim(),
          });
          if (insertError) {
            console.error('Profile creation error:', insertError);
            throw new Error('Account created, but profile setup failed.');
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
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Background subtle gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.05)_0%,_transparent_50%)]" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <img src="/logo1.png" alt="Blackroom" className="w-16 h-16 rounded-xl mb-5 shadow-lg shadow-black/50" />
          <h1 className="text-2xl font-bold tracking-tight text-[#e4e4e7]">
            {isLogin ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-[#52525b] mt-1.5">
            {isLogin ? 'Sign in to continue to Blackroom' : 'Join the conversation'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-2xl p-6 shadow-xl">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-5 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5 ml-0.5">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#52525b] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-all"
                  placeholder="Choose a unique username"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5 ml-0.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#52525b] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-all"
                placeholder="you@email.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5 ml-0.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-white placeholder-[#52525b] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/30 transition-all"
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#6366f1] hover:bg-[#818cf8] text-white rounded-xl py-3 mt-2 font-semibold text-sm transition-all disabled:opacity-50 disabled:hover:bg-[#6366f1] shadow-lg shadow-[#6366f1]/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>
        </div>

        {/* Toggle */}
        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-[#52525b] hover:text-[#a1a1aa] text-sm transition-colors"
          >
            {isLogin ? (
              <>Don't have an account? <span className="text-[#6366f1] font-medium">Sign Up</span></>
            ) : (
              <>Already have an account? <span className="text-[#6366f1] font-medium">Sign In</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
