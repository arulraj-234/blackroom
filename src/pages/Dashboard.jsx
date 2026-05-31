import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';

export default function Dashboard() {
  const [selectedUser, setSelectedUser] = useState(null);

  return (
    <div className="h-screen w-full bg-black text-white flex overflow-hidden font-sans selection:bg-white/20">
      <Sidebar onSelectUser={setSelectedUser} />
      <ChatWindow selectedUser={selectedUser} />
    </div>
  );
}
