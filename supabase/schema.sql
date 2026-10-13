-- Mini Notion · Supabase schema
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run.

-- ── profile: 사용자당 1행 (별명, 프로필 이미지, 자기소개) ──
create table if not exists public.profile (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users (id) on delete cascade,
  name          text not null,
  avatar_url    text,
  introduction  text,
  created_at    timestamptz not null default now()
);

alter table public.profile enable row level security;

drop policy if exists profile_select_own on public.profile;
create policy profile_select_own on public.profile
  for select using ((select auth.uid()) = user_id);
drop policy if exists profile_insert_own on public.profile;
create policy profile_insert_own on public.profile
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists profile_update_own on public.profile;
create policy profile_update_own on public.profile
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 첫 로그인 때 profile 행을 만든다 (name = Google 표시 이름, 최대 20자)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  insert into public.profile (user_id, name)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    ), 20)
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Storage: avatars 버킷 (공개 읽기, 2MB, JPG · PNG · WEBP) ──
-- 파일 경로는 avatars/<user id>/avatar, 본인 폴더에만 쓸 수 있다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists avatars_select_own on storage.objects;
create policy avatars_select_own on storage.objects
  for select using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ── page: 글 (본인 글만 읽고 쓸 수 있음) ──
create table if not exists public.page (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists page_user_id_created_at_idx on public.page (user_id, created_at desc);

alter table public.page enable row level security;

drop policy if exists page_select_own on public.page;
create policy page_select_own on public.page
  for select using ((select auth.uid()) = user_id);
drop policy if exists page_insert_own on public.page;
create policy page_insert_own on public.page
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists page_update_own on public.page;
create policy page_update_own on public.page
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists page_delete_own on public.page;
create policy page_delete_own on public.page
  for delete using ((select auth.uid()) = user_id);
