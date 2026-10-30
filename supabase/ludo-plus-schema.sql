-- LUDO PLUS persistent social data schema
-- Run this in Supabase Dashboard -> SQL Editor.
-- Keep SUPABASE_SERVICE_ROLE_KEY only in Render environment variables; never expose it in the browser.

create table if not exists public.chat_messages (
  id text primary key,
  player_id text not null,
  display_name text not null,
  message_text text not null,
  created_at bigint not null
);

create index if not exists chat_messages_created_at_idx
  on public.chat_messages (created_at desc);

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

create index if not exists feed_posts_created_at_idx
  on public.feed_posts (created_at desc);

create table if not exists public.reels (
  id text primary key,
  player_id text not null,
  display_name text not null,
  caption text not null default '',
  video_url text not null,
  created_at bigint not null,
  likes jsonb not null default '[]'::jsonb
);

create index if not exists reels_created_at_idx
  on public.reels (created_at desc);

-- Access is intended to be server-only through the service role key.
-- Do not enable public/anon write access to these tables.
alter table public.chat_messages enable row level security;
alter table public.feed_posts enable row level security;
alter table public.reels enable row level security;


-- Persistent private Ludo rooms (backend service-role access only).
create table if not exists public.ludo_rooms (
  room_code text primary key,
  host_id text not null,
  status text not null default 'waiting' check (status in ('waiting','playing')),
  players jsonb not null default '[]'::jsonb,
  created_at bigint not null,
  game jsonb not null
);
create index if not exists ludo_rooms_created_at_idx on public.ludo_rooms (created_at desc);
alter table public.ludo_rooms enable row level security;
