-- Mini Notion · Supabase schema
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run.

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  nickname    text not null check (char_length(nickname) between 1 and 20),
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.pages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title       text not null default '',
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists pages_user_updated_idx on public.pages (user_id, updated_at desc);

-- Row Level Security: 본인 데이터만 읽고 쓸 수 있음
alter table public.profiles enable row level security;
alter table public.pages    enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own pages" on public.pages;
create policy "own pages" on public.pages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
