-- Virtual Imambargah — initial schema

create extension if not exists pgcrypto;

-- ───────────── profiles ─────────────
create type public.user_role as enum ('member', 'host', 'admin');

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role         public.user_role not null default 'member',
  locale       text not null default 'ko',
  muted        boolean not null default false,
  created_at   timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('host', 'admin'));
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- members can edit their own name/locale, but not role/muted
-- auth.uid() is null for SQL editor / service role → allowed (needed to promote the first admin)
create or replace function public.guard_profile_update()
returns trigger language plpgsql as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if (new.role is distinct from old.role) and not public.is_admin() then
    raise exception 'only admin can change role';
  end if;
  if (new.muted is distinct from old.muted) and not public.is_staff() then
    raise exception 'only staff can mute';
  end if;
  return new;
end $$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

alter table public.profiles enable row level security;
create policy "profiles readable"  on public.profiles for select using (true);
create policy "profiles self edit" on public.profiles for update using (id = auth.uid() or public.is_staff());

-- ───────────── majlis ─────────────
create table public.majlis_series (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  occasion   text not null default '',      -- e.g. 'muharram', 'arbaeen', 'fatimiyya'
  hijri_year int,
  created_at timestamptz not null default now()
);

create type public.majlis_status as enum ('scheduled', 'live', 'ended');

create table public.majlis (
  id            uuid primary key default gen_random_uuid(),
  series_id     uuid references public.majlis_series (id) on delete set null,
  title         text not null,
  speaker       text not null default '',
  description   text not null default '',
  starts_at     timestamptz not null,
  status        public.majlis_status not null default 'scheduled',
  livekit_room  text not null default ('majlis-' || replace(gen_random_uuid()::text, '-', '')),
  egress_id     text,
  recording_url text,
  created_at    timestamptz not null default now()
);
create index majlis_starts_at_idx on public.majlis (starts_at);
create index majlis_series_idx on public.majlis (series_id);

alter table public.majlis_series enable row level security;
alter table public.majlis        enable row level security;
create policy "series readable" on public.majlis_series for select using (true);
create policy "series staff"    on public.majlis_series for all using (public.is_staff()) with check (public.is_staff());
create policy "majlis readable" on public.majlis for select using (true);
create policy "majlis staff"    on public.majlis for all using (public.is_staff()) with check (public.is_staff());

-- ───────────── chat ─────────────
create table public.banned_words (word text primary key);

create table public.chat_messages (
  id         bigint generated always as identity primary key,
  majlis_id  uuid not null references public.majlis (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  deleted    boolean not null default false,
  created_at timestamptz not null default now()
);
create index chat_majlis_idx on public.chat_messages (majlis_id, created_at);

create or replace function public.filter_chat()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.banned_words b where position(lower(b.word) in lower(new.body)) > 0) then
    raise exception 'message contains banned word' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger chat_filter before insert on public.chat_messages
  for each row execute function public.filter_chat();

alter table public.chat_messages enable row level security;
alter table public.banned_words  enable row level security;

create policy "chat readable" on public.chat_messages for select
  using (not deleted or public.is_staff());
create policy "chat insert" on public.chat_messages for insert
  with check (
    user_id = auth.uid()
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.muted)
    and exists (select 1 from public.majlis m where m.id = majlis_id and m.status = 'live')
  );
create policy "chat moderate" on public.chat_messages for update
  using (public.is_staff()) with check (public.is_staff());

create policy "banned staff" on public.banned_words for all using (public.is_staff()) with check (public.is_staff());

-- ───────────── library ─────────────
create type public.library_type as enum ('nauha', 'marsiya', 'ziyarat', 'dua');

create table public.library_items (
  id               uuid primary key default gen_random_uuid(),
  type             public.library_type not null,
  title            text not null,
  reciter          text not null default '',
  language         text not null default 'ur',  -- ur, ar, fa, en, ko ...
  occasion         text not null default '',
  audio_url        text,
  text_original    text not null default '',
  text_translation text not null default '',
  created_at       timestamptz not null default now()
);
create index library_type_idx on public.library_items (type, language);

alter table public.library_items enable row level security;
create policy "library readable" on public.library_items for select using (true);
create policy "library staff"    on public.library_items for all using (public.is_staff()) with check (public.is_staff());

-- ───────────── realtime ─────────────
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.majlis;

-- ───────────── storage ─────────────
insert into storage.buckets (id, name, public) values
  ('library', 'library', true),
  ('recordings', 'recordings', true)
on conflict (id) do nothing;

create policy "library files public read" on storage.objects for select
  using (bucket_id in ('library', 'recordings'));
create policy "library files staff write" on storage.objects for insert
  with check (bucket_id = 'library' and public.is_staff());
create policy "library files staff delete" on storage.objects for delete
  using (bucket_id = 'library' and public.is_staff());
