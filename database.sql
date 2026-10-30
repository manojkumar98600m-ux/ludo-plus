-- Starter schema for Supabase/PostgreSQL. Review policies before production.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text unique, display_name text not null default 'New User',
 bio text not null default '', avatar_url text, date_of_birth date,
 created_at timestamptz not null default now()
);
create table if not exists public.posts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 caption text not null default '', media_url text not null,
 media_type text not null default 'image' check (media_type in ('image','video')),
 created_at timestamptz not null default now()
);
create table if not exists public.messages (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references auth.users(id) on delete cascade,
 receiver_id uuid not null references auth.users(id) on delete cascade,
 message_text text not null default '', media_url text,
 created_at timestamptz not null default now()
);
create table if not exists public.memberships (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 amount_paise integer not null check (amount_paise = 5000),
 duration_days integer not null default 90 check (duration_days = 90),
 status text not null default 'pending' check (status in ('pending','active','expired','failed')),
 provider text not null default 'phonepe', provider_transaction_id text unique,
 starts_at timestamptz, expires_at timestamptz, created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.messages enable row level security;
alter table public.memberships enable row level security;
create policy "Authenticated profiles readable" on public.profiles for select to authenticated using (true);
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "Authenticated users view posts" on public.posts for select to authenticated using (true);
create policy "Users create own posts" on public.posts for insert to authenticated with check (auth.uid() = user_id);
create policy "Users delete own posts" on public.posts for delete to authenticated using (auth.uid() = user_id);
create policy "Participants view messages" on public.messages for select to authenticated using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Users send as themselves" on public.messages for insert to authenticated with check (auth.uid() = sender_id);
create policy "Users view own memberships" on public.memberships for select to authenticated using (auth.uid() = user_id);
-- Never allow client-side membership activation. Verify payment in trusted server code.