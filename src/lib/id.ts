export const uid = () => crypto.randomUUID()

// Código corto para URLs: 8 caracteres [a-z0-9] (~2,8 billones de combinaciones)
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
export function shortId() {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('')
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (s: string) => UUID.test(s)
