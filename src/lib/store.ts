import type { Character, Template, World } from './types'
import { supabase } from './supabase'
import { exampleCharacter } from './templates'

// Dos almacenes con la misma forma: el del navegador (modo invitado) y el de Supabase (con cuenta)
export interface Repo {
  kind: 'local' | 'cloud'
  listCharacters(): Promise<Character[]>
  getCharacter(id: string): Promise<Character | null>
  saveCharacter(c: Character): Promise<Character>
  deleteCharacter(id: string): Promise<void>
  listTemplates(): Promise<Template[]>
  saveTemplate(t: Template): Promise<Template>
  deleteTemplate(id: string): Promise<void>
  listWorlds(): Promise<World[]>
  saveWorld(w: World): Promise<World>
  deleteWorld(id: string): Promise<void>
  uploadAvatar(characterId: string, image: Blob): Promise<string>
}

const touch = <T extends { updatedAt: string }>(x: T): T => ({ ...x, updatedAt: new Date().toISOString() })
const byUpdated = <T extends { updatedAt: string }>(a: T, b: T) => b.updatedAt.localeCompare(a.updatedAt)

/* ---------------- Navegador ---------------- */

const KEYS = { characters: 'fichas.characters', templates: 'fichas.templates', worlds: 'fichas.worlds', seeded: 'fichas.seeded' }

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function writeList<T>(key: string, list: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    throw new Error('No hay espacio en el navegador. Prueba con una imagen de avatar más pequeña o crea una cuenta.')
  }
}

function upsert<T extends { id: string }>(key: string, item: T) {
  const list = readList<T>(key).filter((x) => x.id !== item.id)
  writeList(key, [item, ...list])
  return item
}

function remove(key: string, id: string) {
  writeList(key, readList<{ id: string }>(key).filter((x) => x.id !== id))
}

// La primera visita en modo invitado trae un personaje de ejemplo
function seedOnce() {
  try {
    if (localStorage.getItem(KEYS.seeded)) return
    localStorage.setItem(KEYS.seeded, '1')
    if (readList(KEYS.characters).length === 0) upsert(KEYS.characters, exampleCharacter(null))
  } catch {
    // Sin almacenamiento: nada que sembrar
  }
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

export const localRepo: Repo = {
  kind: 'local',
  async listCharacters() {
    seedOnce()
    return readList<Character>(KEYS.characters).sort(byUpdated)
  },
  async getCharacter(id) {
    return readList<Character>(KEYS.characters).find((c) => c.id === id) ?? null
  },
  async saveCharacter(c) {
    return upsert(KEYS.characters, touch(c))
  },
  async deleteCharacter(id) {
    remove(KEYS.characters, id)
  },
  async listTemplates() {
    return readList<Template>(KEYS.templates).sort(byUpdated)
  },
  async saveTemplate(t) {
    return upsert(KEYS.templates, touch(t))
  },
  async deleteTemplate(id) {
    remove(KEYS.templates, id)
  },
  async listWorlds() {
    return readList<World>(KEYS.worlds).sort(byUpdated)
  },
  async saveWorld(w) {
    return upsert(KEYS.worlds, touch(w))
  },
  async deleteWorld(id) {
    remove(KEYS.worlds, id)
    // Los personajes de ese mundo quedan sin mundo
    writeList(KEYS.characters, readList<Character>(KEYS.characters).map((c) => (c.worldId === id ? { ...c, worldId: null } : c)))
  },
  async uploadAvatar(_id, image) {
    return blobToDataUrl(image)
  }
}

export const hasLocalData = () => readList(KEYS.characters).length + readList(KEYS.templates).length + readList(KEYS.worlds).length > 0

export function clearLocalData() {
  writeList(KEYS.characters, [])
  writeList(KEYS.templates, [])
  writeList(KEYS.worlds, [])
}

/* ---------------- Supabase ---------------- */

interface CharacterRow {
  id: string
  owner_id: string
  world_id: string | null
  name: string
  alias: string
  data: Pick<Character, 'sections' | 'values' | 'avatar' | 'style'>
  visibility: Character['visibility']
  created_at: string
  updated_at: string
  profiles?: { display_name: string | null } | null
}

const toCharacter = (r: CharacterRow): Character => ({
  id: r.id,
  ownerId: r.owner_id,
  ownerName: r.profiles?.display_name ?? undefined,
  worldId: r.world_id,
  name: r.name,
  alias: r.alias,
  ...r.data,
  visibility: r.visibility,
  createdAt: r.created_at,
  updatedAt: r.updated_at
})

const fromCharacter = (c: Character, ownerId: string) => ({
  id: c.id,
  owner_id: ownerId,
  world_id: c.worldId,
  name: c.name,
  alias: c.alias,
  data: { sections: c.sections, values: c.values, avatar: c.avatar, style: c.style },
  visibility: c.visibility,
  created_at: c.createdAt,
  updated_at: new Date().toISOString()
})

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  return result.data
}

const CHARACTER_SELECT = '*, profiles(display_name)'

export function cloudRepo(userId: string): Repo {
  const db = supabase!
  return {
    kind: 'cloud',
    async listCharacters() {
      const rows = check(await db.from('characters').select(CHARACTER_SELECT).eq('owner_id', userId).order('updated_at', { ascending: false }))
      return (rows as CharacterRow[]).map(toCharacter)
    },
    async getCharacter(id) {
      return fetchCharacter(id)
    },
    async saveCharacter(c) {
      const row = check(await db.from('characters').upsert(fromCharacter(c, userId)).select(CHARACTER_SELECT).single())
      return toCharacter(row as CharacterRow)
    },
    async deleteCharacter(id) {
      check(await db.from('characters').delete().eq('id', id))
    },
    async listTemplates() {
      const rows = check(await db.from('templates').select('*').eq('owner_id', userId).order('updated_at', { ascending: false }))
      return (rows as TemplateRow[]).map(toTemplate)
    },
    async saveTemplate(t) {
      const row = check(await db.from('templates').upsert({
        id: t.id, owner_id: userId, name: t.name, description: t.description, sections: t.sections, updated_at: new Date().toISOString()
      }).select('*').single())
      return toTemplate(row as TemplateRow)
    },
    async deleteTemplate(id) {
      check(await db.from('templates').delete().eq('id', id))
    },
    async listWorlds() {
      const rows = check(await db.from('worlds').select('*').eq('owner_id', userId).order('updated_at', { ascending: false }))
      return (rows as WorldRow[]).map(toWorld)
    },
    async saveWorld(w) {
      const row = check(await db.from('worlds').upsert({
        id: w.id, owner_id: userId, name: w.name, description: w.description, updated_at: new Date().toISOString()
      }).select('*').single())
      return toWorld(row as WorldRow)
    },
    async deleteWorld(id) {
      check(await db.from('worlds').delete().eq('id', id))
    },
    async uploadAvatar(characterId, image) {
      // Un archivo nuevo por subida (evita que el navegador muestre la imagen vieja en caché)
      const path = `${userId}/${characterId}-${Date.now()}.webp`
      check(await db.storage.from('avatars').upload(path, image, { contentType: image.type, upsert: true }))
      return db.storage.from('avatars').getPublicUrl(path).data.publicUrl
    }
  }
}

interface TemplateRow { id: string; owner_id: string; name: string; description: string; sections: Template['sections']; updated_at: string }
interface WorldRow { id: string; owner_id: string; name: string; description: string; updated_at: string }

const toTemplate = (r: TemplateRow): Template => ({
  id: r.id, ownerId: r.owner_id, name: r.name, description: r.description, sections: r.sections, updatedAt: r.updated_at
})
const toWorld = (r: WorldRow): World => ({
  id: r.id, ownerId: r.owner_id, name: r.name, description: r.description, updatedAt: r.updated_at
})

// Lectura sin importar el dueño: las reglas de la base solo dejan ver fichas propias, públicas o con enlace
export async function fetchCharacter(id: string): Promise<Character | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('characters').select(CHARACTER_SELECT).eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? toCharacter(data as CharacterRow) : null
}

export async function listPublicCharacters(): Promise<Character[]> {
  if (!supabase) return []
  const rows = check(await supabase.from('characters').select(CHARACTER_SELECT).eq('visibility', 'public').order('updated_at', { ascending: false }).limit(60))
  return (rows as CharacterRow[]).map(toCharacter)
}

// Personajes públicos del mismo autor, para resolver los enlaces de "Relaciones" en una ficha compartida
export async function fetchCharactersByIds(ids: string[]): Promise<Character[]> {
  if (!supabase || ids.length === 0) return []
  const rows = check(await supabase.from('characters').select(CHARACTER_SELECT).in('id', ids))
  return (rows as CharacterRow[]).map(toCharacter)
}

// Pasa las fichas del modo invitado a la cuenta. Los ids se conservan, así las relaciones siguen enlazadas
export async function migrateLocalToCloud(repo: Repo) {
  for (const w of readList<World>(KEYS.worlds)) await repo.saveWorld(w)
  for (const t of readList<Template>(KEYS.templates)) await repo.saveTemplate(t)
  for (const c of readList<Character>(KEYS.characters)) {
    let avatar = c.avatar
    if (avatar.mode === 'image' && avatar.url.startsWith('data:')) {
      const blob = await (await fetch(avatar.url)).blob()
      avatar = { ...avatar, url: await repo.uploadAvatar(c.id, blob) }
    }
    await repo.saveCharacter({ ...c, avatar, visibility: 'private' })
  }
  clearLocalData()
}
