-- Códigos cortos en las URLs, historias públicas y lectura segura de fichas "con enlace".
-- Se puede volver a ejecutar sin romper nada.

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
