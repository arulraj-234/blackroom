-- Create users table (extends Supabase auth.users)
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create conversations table
create table public.conversations (
  id uuid default gen_random_uuid() primary key,
  is_group boolean default false not null,
  name text, -- Only used if it's a group
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create conversation_participants (junction table for many-to-many)
create table public.conversation_participants (
  conversation_id uuid references public.conversations on delete cascade not null,
  user_id uuid references public.users on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (conversation_id, user_id)
);

-- Create messages table
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations on delete cascade not null,
  sender_id uuid references public.users on delete cascade not null,
  content text,
  media_url text, -- URL to Supabase Storage if it's an image/video
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- Policies
-- 1. Users can read all users (to find people to chat with)
create policy "Users are viewable by everyone." on public.users for select using (true);
-- 2. Users can insert/update their own profile
create policy "Users can update own profile." on public.users for update using (auth.uid() = id);

-- 3. Users can view all conversations
create policy "Users can view all conversations." on public.conversations for select using (true);

-- 4. Users can view messages in conversations they are part of
create policy "Users can view messages in their conversations." on public.messages for select using (
  exists (
    select 1 from public.conversation_participants
    where conversation_id = public.messages.conversation_id and user_id = auth.uid()
  )
);

-- 5. Users can insert messages in conversations they are part of
create policy "Users can insert messages in their conversations." on public.messages for insert with check (
  auth.uid() = sender_id and
  exists (
    select 1 from public.conversation_participants
    where conversation_id = public.messages.conversation_id and user_id = auth.uid()
  )
);

-- 6. Authenticated users can create conversations
create policy "Authenticated users can create conversations." on public.conversations for insert with check (auth.uid() is not null);

-- 7. Users can insert participants
create policy "Users can insert participants." on public.conversation_participants for insert with check (auth.uid() is not null);

-- 8. Users can view participants
create policy "Users can view participants." on public.conversation_participants for select using (true);
