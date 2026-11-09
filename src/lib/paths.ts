import type { Character, World } from './types'
import { slug } from './slug'
import { isUuid } from './id'

// URLs legibles y cortas: /ficha/nina-williams-k3j9xq2a. Solo el código final importa,
// así que si cambia el nombre el enlace viejo sigue funcionando
export const characterPath = (c: Pick<Character, 'name' | 'shortId'>) => `/ficha/${slug(c.name)}-${c.shortId}`
export const storyPath = (w: Pick<World, 'name' | 'shortId'>) => `/historia/${slug(w.name)}-${w.shortId}`

// "nina-williams-k3j9xq2a" → "k3j9xq2a". Los enlaces viejos con UUID completo también se aceptan
export function refFromParam(param: string | undefined): string | null {
  if (!param) return null
  if (isUuid(param)) return param
  const code = param.slice(param.lastIndexOf('-') + 1)
  return code || null
}
