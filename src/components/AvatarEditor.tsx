import { useMemo, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import type { Avatar, PixelAvatarOptions } from '../lib/types'
import { defaultPixelOptions, pixelAvatarUri, pixelParts, pixelPalettes, randomPixelOptions } from '../lib/avatar'
import { play } from '../lib/sound'
import { uid } from '../lib/id'

interface Props {
  avatar: Avatar
  onChange(avatar: Avatar): void
  upload(image: Blob): Promise<string>
}

type Mode = Avatar['mode']

const modeLabels: Record<Mode, string> = { image: 'Subir imagen', pixel: 'Armar por piezas', none: 'Sin avatar' }

// Dos caminos: subir tu propio dibujo (y encuadrarlo) o armar uno pixel art por piezas
export function AvatarEditor({ avatar, onChange, upload }: Props) {
  const [mode, setMode] = useState<Mode>(avatar.mode)
  // Se recuerda lo último de cada modo, así cambiar de pestaña no borra el trabajo
  const [lastPixel, setLastPixel] = useState<PixelAvatarOptions>(avatar.mode === 'pixel' ? avatar.options : defaultPixelOptions(uid()))
  const [lastImage, setLastImage] = useState<Avatar | null>(avatar.mode === 'image' ? avatar : null)

  function switchMode(m: Mode) {
    setMode(m)
    if (m === 'none') onChange({ mode: 'none' })
    if (m === 'pixel') onChange({ mode: 'pixel', options: lastPixel })
    if (m === 'image' && lastImage) onChange(lastImage)
  }

  return (
    <div className="avatar-editor">
      <div className="tabs" role="tablist" aria-label="Tipo de avatar">
        {(Object.keys(modeLabels) as Mode[]).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} className={`tab menu-item ${mode === m ? 'is-active' : ''}`} onClick={() => switchMode(m)}>
            {modeLabels[m]}
          </button>
        ))}
      </div>
      {mode === 'image' && (
        <ImageUpload
          current={lastImage}
          onDone={(a) => {
            setLastImage(a)
            onChange(a)
          }}
          upload={upload}
        />
      )}
      {mode === 'pixel' && (
        <PixelBuilder
          options={lastPixel}
          onChange={(options) => {
            setLastPixel(options)
            onChange({ mode: 'pixel', options })
          }}
        />
      )}
      {mode === 'none' && <p className="muted">La carta mostrará la inicial del nombre.</p>}
    </div>
  )
}

/* ---------- Subir imagen ---------- */

function ImageUpload({ current, onDone, upload }: { current: Avatar | null; onDone(a: Avatar): void; upload(b: Blob): Promise<string> }) {
  const [source, setSource] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)
  const [pixelated, setPixelated] = useState(current?.mode === 'image' ? current.pixelated : false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function pick(file: File | undefined) {
    setError(null)
    if (!file) return
    if (!file.type.startsWith('image/')) {
      play('error')
      setError('Ese archivo no es una imagen.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setSource(reader.result as string)
      setZoom(1)
      setCrop({ x: 0, y: 0 })
    }
    reader.readAsDataURL(file)
  }

  async function confirm() {
    if (!source || !area) return
    setBusy(true)
    setError(null)
    try {
      const blob = await cropToBlob(source, area, pixelated)
      const url = await upload(blob)
      onDone({ mode: 'image', url, pixelated })
      setSource(null)
      play('select')
    } catch (e) {
      play('hurt')
      setError(e instanceof Error ? e.message : 'No se pudo subir la imagen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="image-upload">
      {source ? (
        <>
          <div className="cropper">
            <Cropper
              image={source}
              crop={crop}
              zoom={zoom}
              aspect={1}
              maxZoom={6}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          </div>
          <label className="form-field">
            <span className="form-label">Zoom</span>
            <input type="range" min={1} max={6} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
          </label>
          <label className="check">
            <input type="checkbox" checked={pixelated} onChange={(e) => setPixelated(e.target.checked)} /> Es pixel art (no suavizar al agrandar)
          </label>
          <div className="button-row">
            <button type="button" className="menu-item" disabled={busy} onClick={confirm}>{busy ? 'Subiendo…' : 'Usar este encuadre'}</button>
            <button type="button" className="menu-item" disabled={busy} onClick={() => setSource(null)}>Cancelar</button>
          </div>
        </>
      ) : (
        <label className="dropzone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]) }}>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          <span className="menu-item">{current ? 'Cambiar imagen' : 'Elegir imagen'}</span>
          <span className="muted">o arrástrala aquí. Luego la encuadras.</span>
        </label>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  )
}

// Recorta a un cuadrado de hasta 512 px y lo guarda como WebP (pesa poco y conserva calidad)
async function cropToBlob(src: string, area: Area, pixelated: boolean): Promise<Blob> {
  const img = new Image()
  img.src = src
  await img.decode()
  const size = Math.min(512, Math.round(area.width))
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = !pixelated
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, pixelated ? 'image/png' : 'image/webp', 0.9))
  if (!blob) throw new Error('No se pudo procesar la imagen.')
  return blob
}

/* ---------- Por piezas ---------- */

type PartKey = keyof typeof pixelParts
type ColorKey = keyof typeof pixelPalettes

const partLabels: Record<PartKey, string> = {
  hair: 'Pelo', eyes: 'Ojos', mouth: 'Boca', clothing: 'Ropa', beard: 'Barba', glasses: 'Lentes', hat: 'Sombrero', accessories: 'Accesorio'
}
const optionalParts: PartKey[] = ['beard', 'glasses', 'hat', 'accessories']

const colorLabels: Record<ColorKey, string> = {
  skinColor: 'Piel', hairColor: 'Pelo', eyesColor: 'Ojos', clothingColor: 'Ropa', hatColor: 'Sombrero', background: 'Fondo'
}

function PixelBuilder({ options, onChange }: { options: PixelAvatarOptions; onChange(o: PixelAvatarOptions): void }) {
  const preview = useMemo(() => pixelAvatarUri(options), [options])
  const set = (patch: Partial<PixelAvatarOptions>) => onChange({ ...options, ...patch })

  function step(key: PartKey, delta: number) {
    play('move')
    const list: (string | null)[] = optionalParts.includes(key) ? [null, ...pixelParts[key]] : pixelParts[key]
    const index = list.indexOf(options[key] as string | null)
    const next = list[(index + delta + list.length) % list.length]
    set({ [key]: next } as Partial<PixelAvatarOptions>)
  }

  const position = (key: PartKey) => {
    const value = options[key] as string | null
    if (value == null) return 'Ninguno'
    return `${pixelParts[key].indexOf(value) + 1} / ${pixelParts[key].length}`
  }

  return (
    <div className="pixel-builder">
      <div className="pixel-preview">
        <img className="pixelated" src={preview} alt="Vista previa del avatar" />
        <button type="button" className="menu-item" onClick={() => { play('select'); onChange(randomPixelOptions()) }}>Aleatorio</button>
      </div>
      <div className="pixel-controls">
        {(Object.keys(partLabels) as PartKey[]).map((key) => (
          <div key={key} className="stepper">
            <span className="form-label">{partLabels[key]}</span>
            <button type="button" className="icon-btn" aria-label={`${partLabels[key]} anterior`} onClick={() => step(key, -1)}>‹</button>
            <span className="stepper-value">{position(key)}</span>
            <button type="button" className="icon-btn" aria-label={`${partLabels[key]} siguiente`} onClick={() => step(key, 1)}>›</button>
          </div>
        ))}
        {(Object.keys(colorLabels) as ColorKey[]).map((key) => (
          <ColorPicker key={key} label={colorLabels[key]} value={options[key]} palette={pixelPalettes[key]} onChange={(c) => set({ [key]: c } as Partial<PixelAvatarOptions>)} />
        ))}
      </div>
    </div>
  )
}

function ColorPicker({ label, value, palette, onChange }: { label: string; value: string; palette: string[]; onChange(c: string): void }) {
  const custom = value !== 'transparent' && !palette.includes(value)
  return (
    <div className="color-picker">
      <span className="form-label">{label}</span>
      <div className="swatches">
        {palette.map((c) => (
          <button
            key={c}
            type="button"
            className={`swatch ${c === value ? 'is-active' : ''} ${c === 'transparent' ? 'swatch--none' : ''}`}
            style={c === 'transparent' ? undefined : { background: `#${c}` }}
            aria-label={c === 'transparent' ? `${label}: transparente` : `${label}: #${c}`}
            aria-pressed={c === value}
            onClick={() => onChange(c)}
          />
        ))}
        <label className={`swatch swatch--custom ${custom ? 'is-active' : ''}`} title="Otro color" style={custom ? { background: `#${value}` } : undefined}>
          <input type="color" className="sr-only" value={`#${custom ? value : 'ffffff'}`} onChange={(e) => onChange(e.target.value.slice(1))} aria-label={`${label}: otro color`} />
          {!custom && '+'}
        </label>
      </div>
    </div>
  )
}
