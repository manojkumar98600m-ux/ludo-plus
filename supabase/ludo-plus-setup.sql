-- LUDO PLUS Supabase setup
-- Run this once in Supabase Dashboard > SQL Editor using the project owner account.
-- The backend uses SUPABASE_SERVICE_ROLE_KEY server-side; never put that key in frontend code.

create table if not exists public.ludo_rooms (
  room_code text primary key,
  host_id text not null,
  status text not null default 'waiting' check (status in ('waiting', 'playing')),
  players jsonb not null default '[]'::jsonb,
  created_at bigint not null,
  game jsonb not null
);
create index if not exists ludo_rooms_created_at_idx on public.ludo_rooms (created_at);

create table if not exists public.chat_messages (
  id text primary key,
  player_id text not null,
  display_name text not null,
  message_text text not null,
  created_at bigint not null
);
create index if not exists chat_messages_created_at_idx on public.chat_messages (created_at desc);

create table if not exists public.feed_posts (
  id text primary key,
  player_id text not null,
  display_name text not null,
  caption text not null default '',
  image_url text not null default '',
  created_at bigint not null,
  likes jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb
);
create index if not exists feed_posts_created_at_idx on public.feed_posts (created_at desc);

create table if not exists public.reels (
  id text primary key,
  player_id text not null,
  display_name text not null,
  caption text not null default '',
  video_url text not null,
  created_at bigint not null,
  likes jsonb not null default '[]'::jsonb
);
create index if not exists reels_created_at_idx on public.reels (created_at desc);

-- Keep direct browser access blocked. The server uses the service-role key,
-- which bypasses RLS; never expose that key to the client.
alter table public.ludo_rooms enable row level security;
alter table public.chat_messages enable row level security;
alter table public.feed_posts enable row level security;
alter table public.reels enable row level security;

-- Public bucket for user-posted photos and reels. Uploaded media is publicly readable.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ludo-media',
  'ludo-media',
  true,
  104857600,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
