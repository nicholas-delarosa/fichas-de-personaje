-- Esquema de Fichas de Personaje. Se pega entero en Supabase > SQL Editor > Run.
-- Se puede volver a ejecutar sin romper nada.

-- Perfil público de cada usuario (el nombre que se muestra como autor de las fichas)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.worlds (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null default '',
  description text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null default '',
  description text not null default '',
  sections jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  world_id uuid references public.worlds (id) on delete set null,
  name text not null default '',
  alias text not null default '',
  data jsonb not null default '{}',          -- secciones, valores, avatar y estilo de la carta
  visibility text not null default 'private' check (visibility in ('private', 'link', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists characters_owner_idx on public.characters (owner_id, updated_at desc);
create index if not exists characters_public_idx on public.characters (updated_at desc) where visibility = 'public';

-- Crea el perfil al registrarse, con el nombre que da Google o GitHub
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'user_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Reglas de acceso (RLS) ----------
alter table public.profiles enable row level security;
alter table public.worlds enable row level security;
alter table public.templates enable row level security;
alter table public.characters enable row level security;

drop policy if exists "perfiles visibles" on public.profiles;
create policy "perfiles visibles" on public.profiles for select using (true);
drop policy if exists "editar mi perfil" on public.profiles;
create policy "editar mi perfil" on public.profiles for update using (auth.uid() = id);

drop policy if exists "mis mundos" on public.worlds;
create policy "mis mundos" on public.worlds for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "mis plantillas" on public.templates;
create policy "mis plantillas" on public.templates for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Las fichas 'link' se pueden leer con el enlace (el id es un UUID imposible de adivinar);
-- solo las 'public' aparecen en Explorar, porque la app filtra por visibility = 'public'
drop policy if exists "leer fichas" on public.characters;
create policy "leer fichas" on public.characters for select
  using (visibility in ('link', 'public') or auth.uid() = owner_id);
drop policy if exists "crear mis fichas" on public.characters;
create policy "crear mis fichas" on public.characters for insert with check (auth.uid() = owner_id);
drop policy if exists "editar mis fichas" on public.characters;
create policy "editar mis fichas" on public.characters for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "borrar mis fichas" on public.characters;
create policy "borrar mis fichas" on public.characters for delete using (auth.uid() = owner_id);

-- ---------- Imágenes de avatar ----------
-- Bucket público de lectura; cada usuario solo escribe en su carpeta (avatars/<su id>/...)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/webp', 'image/png', 'image/jpeg'];

drop policy if exists "ver mis avatares" on storage.objects;
create policy "ver mis avatares" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "subir mi avatar" on storage.objects;
create policy "subir mi avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "cambiar mi avatar" on storage.objects;
create policy "cambiar mi avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "borrar mi avatar" on storage.objects;
create policy "borrar mi avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
