import { createRoot } from 'react-dom/client'
import type { CSSProperties, ReactNode } from 'react'
import { toCanvas, toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import type { Character } from './types'
import { slug } from './slug'
import { CharacterCard } from '../components/CharacterCard'
import { SheetView } from '../components/SheetView'

// Resolución de la exportación: 4 píxeles por cada píxel en pantalla. Se puede hacer zoom sin que se vea borroso
const PIXEL_RATIO = 4


export function CardPair({ character }: { character: Character }) {
  return (
    <div className="card-pair">
      <CharacterCard character={character} side="front" />
      <CharacterCard character={character} side="back" />
    </div>
  )
}

// Monta un componente fuera de la vista, espera fuentes e imágenes, y lo entrega para capturarlo
async function offscreen<T>(content: ReactNode, width: number | null, capture: (node: HTMLElement) => Promise<T>): Promise<T> {
  const host = document.createElement('div')
  host.style.cssText = `position:fixed;left:-20000px;top:0;${width ? `width:${width}px;` : ''}background:#000`
  document.body.appendChild(host)
  const root = createRoot(host)
  try {
    root.render(content)
    await new Promise((r) => setTimeout(r, 50))
    await document.fonts.ready
    await Promise.all([...host.querySelectorAll('img')].map((img) => img.decode().catch(() => {})))
    return await capture(host.firstElementChild as HTMLElement)
  } finally {
    root.unmount()
    host.remove()
  }
}

function download(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}

// Las dos caras lado a lado en un solo PNG
export async function exportCardPng(c: Character) {
  const url = await offscreen(<CardPair character={c} />, null, (node) =>
    toPng(node, { pixelRatio: PIXEL_RATIO, cacheBust: true, backgroundColor: '#000000' })
  )
  download(url, `${slug(c.name)}-carta.png`)
}

/*
  PDF A4: primera página con las dos caras de la carta, luego la ficha completa.
  Cada sección se captura por separado para que el salto de página no la corte por la mitad
  (si una sección es más alta que una página, sí se reparte entre varias)
*/
const SHEET_WIDTH = 760
const SHEET_RATIO = 3

export async function exportPdf(c: Character) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 28
  const usableW = pageW - margin * 2
  const usableH = pageH - margin * 2
  const paintPage = () => {
    pdf.setFillColor(0, 0, 0)
    pdf.rect(0, 0, pageW, pageH, 'F')
  }
  paintPage()
  let y = margin

  const place = (canvas: HTMLCanvasElement, cssWidth: number, ratio: number, forceFit = false) => {
    const scale = Math.min(usableW / cssWidth, forceFit ? (pageH - margin - y) / (canvas.height / ratio) : Infinity)
    const w = cssWidth * scale
    const h = (canvas.height / ratio) * scale
    if (h <= usableH) {
      if (y + h > pageH - margin) {
        pdf.addPage()
        paintPage()
        y = margin
      }
      pdf.addImage(canvas, 'PNG', margin + (usableW - w) / 2, y, w, h, undefined, 'FAST')
      y += h + 14
      return
    }
    // Más alta que una página: se corta en franjas
    const sliceCss = usableH / scale
    for (let top = 0; top < canvas.height / ratio; top += sliceCss) {
      if (y > margin) {
        pdf.addPage()
        paintPage()
        y = margin
      }
      const part = document.createElement('canvas')
      part.width = canvas.width
      part.height = Math.min(sliceCss * ratio, canvas.height - top * ratio)
      part.getContext('2d')!.drawImage(canvas, 0, -top * ratio)
      const h2 = (part.height / ratio) * scale
      pdf.addImage(part, 'PNG', margin, y, w, h2, undefined, 'FAST')
      y += h2 + 14
    }
  }

  const options = { pixelRatio: PIXEL_RATIO, cacheBust: true, backgroundColor: '#000000' }
  // El texto de la ficha va a 3x: sigue nítido al imprimir y el PDF se genera bastante más rápido
  const sheetOptions = { ...options, pixelRatio: SHEET_RATIO }

  // Página 1: nombre y la carta, achicada si hace falta para que entre entera
  const [headCanvas, cardCanvas] = await offscreen(
    <div>
      <header className="pdf-head pdf-head--cover">
        <h1>{c.name || 'Sin nombre'}</h1>
        {c.alias && <p style={{ color: c.style.accent }}>«{c.alias}»</p>}
      </header>
      <CardPair character={c} />
    </div>,
    null,
    async (node) => [await toCanvas(node.firstElementChild as HTMLElement, options), await toCanvas(node.lastElementChild as HTMLElement, options)]
  )
  place(headCanvas, headCanvas.width / PIXEL_RATIO, PIXEL_RATIO)
  place(cardCanvas, cardCanvas.width / PIXEL_RATIO, PIXEL_RATIO, true)

  // La ficha completa, sección por sección
  const sections = await offscreen(
    <div className="pdf-sheet">
      <div style={{ '--accent': c.style.accent } as CSSProperties}>
        <SheetView character={c} linkable={new Map()} />
      </div>
    </div>,
    SHEET_WIDTH,
    async (node) => {
      const parts = [...node.querySelectorAll<HTMLElement>('.sheet-section')]
      const out: HTMLCanvasElement[] = []
      for (const part of parts) out.push(await toCanvas(part, sheetOptions))
      return out
    }
  )
  pdf.addPage()
  paintPage()
  y = margin
  for (const canvas of sections) place(canvas, SHEET_WIDTH, SHEET_RATIO)

  pdf.save(`${slug(c.name)}-ficha.pdf`)
}
