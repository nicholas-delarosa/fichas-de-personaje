import { useSyncExternalStore } from 'react'

// Efectos de sonido (los mismos del portafolio), con un interruptor global.
// Se reproducen con Web Audio: suenan al instante, incluso varios seguidos (ej. el "tic" del alma)
const STORAGE_KEY = 'fichas.sound'
const listeners = new Set<() => void>()

let enabled = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
})()

export const isSoundEnabled = () => enabled

export function setSoundEnabled(value: boolean) {
  enabled = value
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'on' : 'off')
  } catch {
    // Sin almacenamiento: el ajuste dura solo esta visita
  }
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useSoundEnabled = () => useSyncExternalStore(subscribe, isSoundEnabled, () => true)

export type Effect = 'move' | 'select' | 'error' | 'item' | 'save' | 'hurt' | 'power' | 'shine'

const effects: Record<Effect, { file: string; volume: number }> = {
  move: { file: 'menumove.wav', volume: 0.5 },      // mover el alma
  select: { file: 'select.wav', volume: 0.5 },      // confirmar
  error: { file: 'cantselect.wav', volume: 0.5 },   // no se puede (campo obligatorio vacío)
  item: { file: 'item.wav', volume: 0.5 },          // copiar el enlace
  save: { file: 'save.wav', volume: 0.5 },          // ficha guardada
  hurt: { file: 'hurtsmall.wav', volume: 0.5 },     // error al guardar / borrar
  power: { file: 'power.wav', volume: 0.5 },        // exportar la carta
  shine: { file: 'shineselect.wav', volume: 0.45 }  // voltear la carta
}

let context: AudioContext | null = null
const buffers = new Map<Effect, Promise<AudioBuffer | null>>()

// Antes del primer clic o tecla el navegador no deja sonar nada: ni lo intentamos
function audioContext() {
  if (!navigator.userActivation?.hasBeenActive) return null
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') context.resume().catch(() => {})
    return context
  } catch {
    return null // Navegadores sin Web Audio: sin sonido
  }
}

function load(effect: Effect, ctx: AudioContext) {
  let buffer = buffers.get(effect)
  if (!buffer) {
    buffer = fetch(`/sounds/${effects[effect].file}`)
      .then((r) => r.arrayBuffer())
      .then((data) => ctx.decodeAudioData(data))
      .catch(() => null)
    buffers.set(effect, buffer)
  }
  return buffer
}

const lastPlayed: Partial<Record<Effect, number>> = {}

export function play(effect: Effect) {
  if (!enabled) return
  // Evita la ametralladora de sonidos al pasar el mouse rápido por una lista
  const now = performance.now()
  if (effect === 'move' && now - (lastPlayed.move ?? 0) < 45) return
  lastPlayed[effect] = now

  const ctx = audioContext()
  if (!ctx) return
  load(effect, ctx).then((buffer) => {
    if (!buffer) return
    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    source.buffer = buffer
    gain.gain.value = effects[effect].volume
    source.connect(gain).connect(ctx.destination)
    source.start()
  })
}


// Con la primera interacción se precargan los sonidos más usados, para que el primero no llegue tarde
if (typeof window !== 'undefined') {
  const warmUp = () => {
    const ctx = audioContext()
    if (ctx) (['move', 'select'] as Effect[]).forEach((e) => load(e, ctx))
  }
  window.addEventListener('pointerdown', warmUp, { once: true })
  window.addEventListener('keydown', warmUp, { once: true })
}
