-- Persistent LUDO PLUS private rooms. Run in Supabase SQL Editor.
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
-- No anon/authenticated policies: access only through backend service-role key.
