import type { Character } from './types'
import { uid } from './id'

// Formato de archivo para respaldar o pasar una ficha sin cuenta
const FORMAT = 'fichas-de-personaje'
const VERSION = 1

export function downloadCharacter(c: Character, filename: string) {
  const { ownerId: _o, ownerName: _n, worldId: _w, ...rest } = c
  const blob = new Blob([JSON.stringify({ format: FORMAT, version: VERSION, character: rest }, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${filename}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export async function importCharacter(file: File, ownerId: string | null): Promise<Character> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  const data = parsed as { format?: string; character?: Partial<Character> }
  const c = data.character
  if (data.format !== FORMAT || !c || !Array.isArray(c.sections) || typeof c.values !== 'object') {
    throw new Error('Ese archivo no es una ficha exportada desde esta app.')
  }
  const now = new Date().toISOString()
  // Siempre entra como una ficha nueva y privada
  return {
    id: uid(),
    ownerId,
    worldId: null,
    name: String(c.name ?? ''),
    alias: String(c.alias ?? ''),
    sections: c.sections,
    values: c.values ?? {},
    avatar: c.avatar ?? { mode: 'none' },
    style: c.style ?? { frame: 'dialogo', accent: '#d535d9' },
    visibility: 'private',
    createdAt: now,
    updatedAt: now
  }
}
