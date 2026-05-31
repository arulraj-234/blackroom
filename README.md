# ⬛ BLACKROOM

> **A sleek, real-time messaging platform built for the modern web.**

BLACKROOM is a premium chat application inspired by the aesthetic of Discord and Instagram DMs. It features a stunning dark-mode-first design with smooth glassmorphism, powered by a robust backend using Supabase for instant real-time synchronization.

## ◼ FEATURES

- **⚡ Real-Time Messaging**: Instant delivery of messages, typing indicators, and presence tracking.
- **🔐 Secure Authentication**: Full user management powered by Supabase Auth.
- **👥 Direct & Group Chats**: Create 1-on-1 conversations or coordinate with multiple people in groups.
- **🖼️ Rich Media Support**: Drag-and-drop support for images, videos, and audio clips. Includes a full-screen image lightbox.
- **👍 Reactions & Receipts**: React to any message with emojis. See exactly when your messages are "Seen", and track unread conversations with notification badges.
- **🔔 Desktop Notifications**: Stay in the loop even when you're tabbed out.
- **🎨 Premium UI**: A beautifully crafted dark-mode interface built with Tailwind CSS.

## 🛠 TECH ARSENAL

- **Frontend Core**: React 18, Vite
- **Styling**: Tailwind CSS, Lucide React (Icons)
- **Backend & Database**: Supabase (PostgreSQL)
- **Realtime**: Supabase Realtime Channels
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage buckets

## 🚀 INITIALIZATION

### Prerequisites
- Node.js (v18+)
- A Supabase Project (for your backend database, auth, and storage)

### Deploy Protocol

1. **Clone the Repository**
   ```bash
   git clone <repo-url>
   cd blackroom
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Initialize the Database**
   Run the SQL provided in `schema.sql` within your Supabase project's SQL Editor to set up the necessary tables (users, conversations, messages, reactions) and Row Level Security policies.

5. **Launch the Interface**
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:3000` to access the application.

## 📖 OPERATIONAL GUIDE

- **Authentication**: Sign up to create your operative profile.
- **Friends Panel**: Browse all registered users and instantly start a DM with them.
- **Groups**: Click the `+` icon in the Groups tab to form a new channel and select participants.
- **Media**: Drag and drop any image/video file directly into the chat window to upload it seamlessly.

## 📄 LICENSE

MIT License.