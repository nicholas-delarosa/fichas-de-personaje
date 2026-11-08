// Modelo de datos. Una plantilla define secciones; un personaje copia esas secciones al crearse
// (así editar la plantilla después no rompe los personajes ya hechos) y guarda sus valores por sección.

export type SectionKind = 'fields' | 'text' | 'list' | 'blocks' | 'relations'

// Dónde aparece la sección en la carta (la ficha completa siempre muestra todo)
export type CardPlacement = 'front' | 'back' | null

export interface FieldDef {
  id: string
  label: string
  placeholder?: string
  onCard?: boolean // se muestra como dato rápido en el frente de la carta
}

// Qué partes tiene cada bloque de una sección 'blocks' (capacidades, habilidades…). null = no se usa
export interface BlockConfig {
  value: string | null       // ej. "Valor" → "800 km/h"
  score: boolean             // puntuación 1–10, se dibuja como barra en la carta
  description: string | null // ej. "Descripción"
  details: string | null     // lista, ej. "Efectos"
  notes: string | null       // ej. "Limitaciones"
}

export interface SectionDef {
  id: string
  title: string
  kind: SectionKind
  hint?: string
  card: CardPlacement
  fields?: FieldDef[]   // solo 'fields'
  block?: BlockConfig   // solo 'blocks'
  itemLabel?: string    // nombre de cada elemento al añadir (ej. "capacidad", "debilidad")
}

export interface Block {
  id: string
  name: string
  value: string
  score: number | null
  description: string
  details: string[]
  notes: string
}

export interface Relation {
  id: string
  characterId: string | null // si es otro personaje de la app, enlaza a su ficha
  name: string
  type: string               // ej. "Rival", "Hermana"
  description: string
}

export type SectionValue =
  | { kind: 'fields'; values: Record<string, string> }
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'blocks'; blocks: Block[] }
  | { kind: 'relations'; relations: Relation[] }

export interface PixelAvatarOptions {
  seed: string
  hair: string
  hairColor: string
  skinColor: string
  eyes: string
  eyesColor: string
  mouth: string
  clothing: string
  clothingColor: string
  beard: string | null
  glasses: string | null
  hat: string | null
  hatColor: string
  accessories: string | null
  background: string
}

export type Avatar =
  | { mode: 'none' }
  | { mode: 'image'; url: string; pixelated: boolean }
  | { mode: 'pixel'; options: PixelAvatarOptions }

export type FrameStyle = 'dialogo' | 'darkworld' | 'reliquia' | 'minimal'

export interface CardStyle {
  frame: FrameStyle
  accent: string
}

export type Visibility = 'private' | 'link' | 'public'

export interface Character {
  id: string
  ownerId: string | null
  ownerName?: string
  worldId: string | null
  name: string
  alias: string
  sections: SectionDef[]
  values: Record<string, SectionValue>
  avatar: Avatar
  style: CardStyle
  visibility: Visibility
  createdAt: string
  updatedAt: string
}

export interface Template {
  id: string
  ownerId: string | null
  name: string
  description: string
  sections: SectionDef[]
  builtin?: boolean
  updatedAt: string
}

export interface World {
  id: string
  ownerId: string | null
  name: string
  description: string
  updatedAt: string
}
