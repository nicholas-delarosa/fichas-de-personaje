import { useState } from 'react'
import type { Character } from '../lib/types'
import { play } from '../lib/sound'

// PNG: las dos caras de la carta. PDF: la carta y la ficha completa. El exportador (y jsPDF) se carga al usarlo
export function ExportButtons({ character }: { character: Character }) {
  const [busy, setBusy] = useState<'png' | 'pdf' | null>(null)

  async function run(kind: 'png' | 'pdf') {
    setBusy(kind)
    try {
      const { exportCardPng, exportPdf } = await import('../lib/exporter')
      await (kind === 'png' ? exportCardPng(character) : exportPdf(character))
      play('power')
    } catch {
      play('hurt')
      alert('No se pudo exportar. Si el avatar es una imagen de otra web, súbela de nuevo desde tu equipo.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <button type="button" className="menu-item" disabled={busy !== null} onClick={() => run('pdf')}>{busy === 'pdf' ? 'Creando PDF…' : 'Descargar PDF'}</button>
      <button type="button" className="menu-item" disabled={busy !== null} onClick={() => run('png')}>{busy === 'png' ? 'Creando PNG…' : 'PNG de la carta'}</button>
    </>
  )
}
