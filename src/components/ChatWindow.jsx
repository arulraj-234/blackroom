import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function ChatWindow({ selectedUser }) {
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!selectedUser) return;
    
    // Find or create conversation
    const initConversation = async () => {
      // Find common conversation
      const { data: myConvos } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUser.id);
        
      if (myConvos && myConvos.length > 0) {
        const convoIds = myConvos.map(c => c.conversation_id);
        const { data: sharedConvo } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .in('conversation_id', convoIds)
          .eq('user_id', selectedUser.id)
          .limit(1)
          .single();
          
        if (sharedConvo) {
          setConversationId(sharedConvo.conversation_id);
          return;
        }
      }
      
      // Create new conversation if not found
      const { data: newConvo, error: convoErr } = await supabase
        .from('conversations')
        .insert({ is_group: false })
        .select()
        .single();
        
      if (!convoErr && newConvo) {
        await supabase.from('conversation_participants').insert([
          { conversation_id: newConvo.id, user_id: currentUser.id },
          { conversation_id: newConvo.id, user_id: selectedUser.id }
        ]);
        setConversationId(newConvo.id);
      }
    };
    
    initConversation();
  }, [selectedUser, currentUser]);

  useEffect(() => {
    if (!conversationId) return;

    // Fetch history
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
        
      if (data) setMessages(data);
      scrollToBottom();
    };
    
    fetchMessages();

    // Subscribe to new realtime messages
    const channel = supabase
      .channel(`chat_${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        scrollToBottom();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;

    const msg = newMessage;
    setNewMessage(''); // optimistic clear

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUser.id,
      content: msg
    });
  };

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0a0a0a] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black">
        <div className="text-center text-gray-500">
          <div className="text-5xl mb-6 opacity-20">📡</div>
          <p className="uppercase tracking-[0.2em] text-xs font-bold">Select an operative to establish link</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#050505] h-full relative">
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex items-center gap-4 bg-black/80 backdrop-blur-md absolute top-0 w-full z-10">
        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 border border-white/20 shadow-lg">
          {selectedUser.username.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="font-bold text-gray-200 tracking-wider">{selectedUser.username}</div>
          <div className="text-xs text-green-500 flex items-center gap-2 mt-1 uppercase tracking-widest font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e] animate-pulse"></span> 
            Secure Link Active
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 pt-28 pb-24 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900/50 via-black to-black">
        {messages.map((msg, index) => {
          const isMe = msg.sender_id === currentUser.id;
          return (
            <div key={msg.id || index} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div 
                className={`max-w-[70%] px-5 py-3 text-sm tracking-wide leading-relaxed shadow-lg ${
                  isMe 
                    ? 'bg-white/10 text-white rounded-2xl rounded-tr-sm border border-white/10 backdrop-blur-sm' 
                    : 'bg-black text-gray-300 rounded-2xl rounded-tl-sm border border-white/10'
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-white/10 bg-black/80 backdrop-blur-md absolute bottom-0 w-full z-10">
        <form onSubmit={handleSend} className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="TYPE ENCRYPTED TRANSMISSION..."
            className="flex-1 bg-black/50 border border-white/20 rounded-xl px-5 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-white/50 focus:ring-1 focus:ring-white/30 transition-all font-mono text-sm tracking-widest"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-white text-black hover:bg-gray-200 px-8 py-4 rounded-xl font-black tracking-widest uppercase text-xs transition-all disabled:opacity-20 disabled:hover:bg-white"
          >
            Transmit
          </button>
        </form>
      </div>
    </div>
  );
}
