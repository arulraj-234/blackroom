import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Camera, Save } from 'lucide-react';

export default function UserProfile({ onClose }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');

  React.useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || '');
        setBio(data.bio || '');
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    await supabase
      .from('users')
      .update({
        display_name: displayName.trim() || profile.username,
        bio: bio.trim(),
      })
      .eq('id', user.id);
    setSaving(false);
    onClose?.();
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (error) {
      console.error('Avatar upload error:', error);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);

    await supabase
      .from('users')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', user.id);

    setProfile((prev) => ({ ...prev, avatar_url: urlData.publicUrl }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="text-[#71717a] text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-[#111] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e1e]">
          <h3 className="text-xl font-bold text-[#e4e4e7]">Profile</h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 text-[#71717a] hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar */}
        <div className="px-6 py-8 flex flex-col items-center">
          <div className="relative group">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-[#1e1e1e] shadow-xl" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-[#1e1e1e] flex items-center justify-center text-3xl font-bold text-[#a1a1aa] border-4 border-[#2a2a2a] shadow-xl">
                {profile?.username?.substring(0, 2).toUpperCase()}
              </div>
            )}
            <label className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all hover:scale-105">
              <Camera className="w-6 h-6 text-white" />
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>
          <p className="text-sm font-medium text-[#71717a] mt-4">@{profile?.username}</p>
        </div>

        {/* Form */}
        <div className="px-6 pb-8 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[#71717a]">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-[15px] text-[#e4e4e7] focus:outline-none focus:border-[#3f3f46] transition-colors"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[#71717a]">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={160}
              placeholder="Tell people about yourself..."
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-[15px] text-[#e4e4e7] placeholder-[#52525b] focus:outline-none focus:border-[#3f3f46] transition-colors resize-none"
            />
            <p className="text-xs text-[#52525b] text-right">{bio.length}/160</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-[#1e1e1e] flex gap-3">
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-5 py-3 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 text-sm font-bold transition-colors"
          >
            Sign Out
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-5 py-3 rounded-xl bg-[#a78bfa] hover:bg-[#c4b5fd] text-white text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
