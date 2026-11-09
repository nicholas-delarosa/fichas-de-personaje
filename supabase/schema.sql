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

-- ===== Migración 002: códigos cortos, historias públicas y fichas con enlace =====

-- ---------- Códigos cortos ----------
alter table public.characters add column if not exists short_id text;
update public.characters set short_id = substr(md5(random()::text || id::text), 1, 8) where short_id is null;
alter table public.characters alter column short_id set not null;
alter table public.characters alter column short_id set default substr(md5(random()::text), 1, 8);
create unique index if not exists characters_short_id_idx on public.characters (short_id);

-- ---------- Historias (tabla worlds) ----------
alter table public.worlds add column if not exists short_id text;
update public.worlds set short_id = substr(md5(random()::text || id::text), 1, 8) where short_id is null;
alter table public.worlds alter column short_id set not null;
alter table public.worlds alter column short_id set default substr(md5(random()::text), 1, 8);
create unique index if not exists worlds_short_id_idx on public.worlds (short_id);

alter table public.worlds add column if not exists color text not null default '#d535d9';
alter table public.worlds add column if not exists visibility text not null default 'private';
alter table public.worlds drop constraint if exists worlds_visibility_check;
alter table public.worlds add constraint worlds_visibility_check check (visibility in ('private', 'public'));

-- Las historias públicas las ve cualquiera; crear, editar y borrar sigue siendo solo del dueño
drop policy if exists "mis mundos" on public.worlds;
drop policy if exists "ver historias" on public.worlds;
create policy "ver historias" on public.worlds for select using (visibility = 'public' or auth.uid() = owner_id);
drop policy if exists "crear mis historias" on public.worlds;
create policy "crear mis historias" on public.worlds for insert with check (auth.uid() = owner_id);
drop policy if exists "editar mis historias" on public.worlds;
create policy "editar mis historias" on public.worlds for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "borrar mis historias" on public.worlds;
create policy "borrar mis historias" on public.worlds for delete using (auth.uid() = owner_id);

-- ---------- Fichas "con enlace" ----------
-- Antes la regla dejaba LISTAR todas las fichas 'link' desde la API. Ahora solo se listan las
-- públicas y las propias; una ficha 'link' se lee con esta función, que exige el código exacto
drop policy if exists "leer fichas" on public.characters;
create policy "leer fichas" on public.characters for select
  using (visibility = 'public' or auth.uid() = owner_id);

create or replace function public.character_by_code(code text)
returns setof public.characters
language sql stable security definer set search_path = '' as $$
  select c.* from public.characters c
  where (c.short_id = code or c.id::text = code)
    and (c.visibility in ('link', 'public') or c.owner_id = auth.uid())
  limit 1;
$$;

revoke all on function public.character_by_code(text) from public;
grant execute on function public.character_by_code(text) to anon, authenticated;
