import { createAvatar } from '@dicebear/core'
import * as pixelArt from '@dicebear/pixel-art'
import type { PixelAvatarOptions } from './types'

// Avatar por piezas con el estilo "Pixel Art" de DiceBear (diseño CC0, código MIT)
const schema = pixelArt.schema.properties as Record<string, { items?: { enum?: string[] }; default?: string[] }>
const choices = (key: string) => [...(schema[key]?.items?.enum ?? [])].reverse()
const palette = (key: string) => [...(schema[key]?.default ?? [])]

export const pixelParts = {
  hair: choices('hair'),
  eyes: choices('eyes'),
  mouth: choices('mouth'),
  clothing: choices('clothing'),
  beard: choices('beard'),
  glasses: choices('glasses'),
  hat: choices('hat'),
  accessories: choices('accessories')
}

export const pixelPalettes = {
  hairColor: [...palette('hairColor'), 'f2f2f2', '1a1a1a', 'd535d9'],
  skinColor: palette('skinColor'),
  eyesColor: [...palette('eyesColor'), 'b8860b', 'c0392b'],
  clothingColor: [...palette('clothingColor'), 'ffffff', '222222'],
  hatColor: palette('hatColor'),
  background: ['000000', '1b1630', '2a2140', '0e2a3a', '3a1420', 'f2f2f2', 'transparent']
}

const pick = <T,>(list: T[], seed: number) => list[seed % list.length]

export function defaultPixelOptions(seed: string): PixelAvatarOptions {
  // Valores iniciales derivados de la semilla, para que cada personaje nuevo empiece distinto
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return {
    seed,
    hair: pick(pixelParts.hair, h),
    hairColor: pick(pixelPalettes.hairColor, h >>> 3),
    skinColor: pick(pixelPalettes.skinColor, h >>> 5),
    eyes: pick(pixelParts.eyes, h >>> 7),
    eyesColor: pick(pixelPalettes.eyesColor, h >>> 9),
    mouth: pick(pixelParts.mouth, h >>> 11),
    clothing: pick(pixelParts.clothing, h >>> 13),
    clothingColor: pick(pixelPalettes.clothingColor, h >>> 15),
    beard: null,
    glasses: null,
    hat: null,
    hatColor: pixelPalettes.hatColor[0],
    accessories: null,
    background: '1b1630'
  }
}

const strip = (hex: string) => hex.replace('#', '')

export function pixelAvatarUri(o: PixelAvatarOptions): string {
  // Los tipos de DiceBear solo aceptan sus nombres de piezas; los validamos con el esquema al elegirlos
  const options: Record<string, unknown> = {
    seed: o.seed,
    hair: [o.hair],
    hairColor: [strip(o.hairColor)],
    skinColor: [strip(o.skinColor)],
    eyes: [o.eyes],
    eyesColor: [strip(o.eyesColor)],
    mouth: [o.mouth],
    clothing: [o.clothing],
    clothingColor: [strip(o.clothingColor)],
    beard: o.beard ? [o.beard] : undefined,
    beardProbability: o.beard ? 100 : 0,
    glasses: o.glasses ? [o.glasses] : undefined,
    glassesProbability: o.glasses ? 100 : 0,
    hat: o.hat ? [o.hat] : undefined,
    hatColor: [strip(o.hatColor)],
    hatProbability: o.hat ? 100 : 0,
    accessories: o.accessories ? [o.accessories] : undefined,
    accessoriesProbability: o.accessories ? 100 : 0,
    backgroundColor: [strip(o.background)]
  }
  return createAvatar(pixelArt, options as Parameters<typeof createAvatar<typeof pixelArt.schema>>[1]).toDataUri()
}

export function randomPixelOptions(): PixelAvatarOptions {
  const r = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]
  const maybe = <T,>(list: T[], chance: number) => (Math.random() < chance ? r(list) : null)
  return {
    seed: crypto.randomUUID(),
    hair: r(pixelParts.hair),
    hairColor: r(pixelPalettes.hairColor),
    skinColor: r(pixelPalettes.skinColor),
    eyes: r(pixelParts.eyes),
    eyesColor: r(pixelPalettes.eyesColor),
    mouth: r(pixelParts.mouth),
    clothing: r(pixelParts.clothing),
    clothingColor: r(pixelPalettes.clothingColor),
    beard: maybe(pixelParts.beard, 0.2),
    glasses: maybe(pixelParts.glasses, 0.2),
    hat: maybe(pixelParts.hat, 0.15),
    hatColor: r(pixelPalettes.hatColor),
    accessories: maybe(pixelParts.accessories, 0.15),
    background: r(pixelPalettes.background.slice(0, 5))
  }
}
