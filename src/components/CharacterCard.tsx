import { forwardRef, type CSSProperties } from 'react'
import type { Character, SectionDef } from '../lib/types'
import { valueOf } from '../lib/templates'
import { AvatarImage } from './AvatarImage'
import { hasContent } from './SheetView'
import './CharacterCard.css'

export type CardSide = 'front' | 'back'

interface Props {
  character: Character
  side: CardSide
  // Compacta: alto fijo y texto recortado (galería). Si no, la carta crece hasta mostrar todo
  compact?: boolean
  className?: string
}

const placed = (c: Character, side: CardSide) => c.sections.filter((s) => s.card === side)

export const CharacterCard = forwardRef<HTMLDivElement, Props>(function CharacterCard({ character, side, compact = false, className }, ref) {
  const style = { '--accent': character.style.accent } as CSSProperties
  return (
    <div ref={ref} className={`card card--${character.style.frame} ${compact ? 'card--compact' : ''} ${className ?? ''}`} style={style}>
      <div className="card-inner">
        {side === 'front' ? <Front character={character} compact={compact} /> : <Back character={character} compact={compact} />}
      </div>
    </div>
  )
})

// En la carta compacta solo caben unos cuantos elementos; en la completa, todos
const limit = <T,>(list: T[], max: number, compact: boolean) => (compact ? list.slice(0, max) : list)

function Front({ character: c, compact }: { character: Character; compact: boolean }) {
  const sections = placed(c, 'front')
  const facts = c.sections
    .filter((s) => s.kind === 'fields')
    .flatMap((s) => {
      const v = valueOf(c, s)
      return v.kind === 'fields' ? (s.fields ?? []).filter((f) => f.onCard && v.values[f.id]?.trim()).map((f) => ({ label: f.label, value: v.values[f.id] })) : []
    })

  return (
    <>
      <header className="card-head">
        <h3 className="card-name">{c.name || 'Sin nombre'}</h3>
        {c.alias && <p className="card-alias">«{c.alias}»</p>}
      </header>
      <div className="card-portrait">
        <AvatarImage avatar={c.avatar} name={c.name} className="card-avatar" />
      </div>
      {facts.length > 0 && (
        <dl className="card-facts">
          {limit(facts, 4, compact).map((f) => (
            <div key={f.label}>
              <dt>{shortLabel(f.label)}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="card-body">
        {sections.map((s) => <FrontSection key={s.id} character={c} section={s} compact={compact} />)}
      </div>
    </>
  )
}

// "Raza / especie" → "Raza"
const shortLabel = (label: string) => label.split('/')[0].trim()

function FrontSection({ character, section, compact }: { character: Character; section: SectionDef; compact: boolean }) {
  const v = valueOf(character, section)
  if (v.kind === 'blocks') {
    const blocks = v.blocks.filter((b) => b.name.trim())
    if (blocks.length === 0) return null
    return (
      <div className="card-section">
        <h4 className="card-label">{section.title}</h4>
        {section.block?.score ? (
          <ul className="card-stats">
            {limit(blocks, 6, compact).map((b) => (
              <li key={b.id}>
                <span className="card-stat-name">{b.name}</span>
                <span className="card-bar" aria-label={b.score ? `${b.score} de 10` : 'Sin puntuación'}>
                  {Array.from({ length: 10 }, (_, i) => <i key={i} className={i < (b.score ?? 0) ? 'on' : ''} />)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="card-chips">
            {limit(blocks, 6, compact).map((b) => <li key={b.id}>{b.name}</li>)}
          </ul>
        )}
      </div>
    )
  }
  if (v.kind === 'text' && v.text.trim()) {
    return (
      <div className="card-section card-section--text">
        <h4 className="card-label">{section.title}</h4>
        <p className="card-clamp">{v.text}</p>
      </div>
    )
  }
  if (v.kind === 'list' && v.items.some((i) => i.trim())) return <ListSection title={section.title} items={v.items} compact={compact} />
  return null
}

function ListSection({ title, items, compact }: { title: string; items: string[]; compact: boolean }) {
  return (
    <div className="card-section">
      <h4 className="card-label">{title}</h4>
      <ul className="card-list">
        {limit(items.filter((i) => i.trim()), 4, compact).map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  )
}

function Back({ character: c, compact }: { character: Character; compact: boolean }) {
  const sections = placed(c, 'back')
  const empty = !sections.some((s) => hasContent(c, s))
  return (
    <>
      <header className="card-head card-head--back">
        <h3 className="card-name card-name--small">{c.name || 'Sin nombre'}</h3>
      </header>
      <div className="card-body card-body--back">
        {empty && <p className="card-empty">Aquí van las secciones marcadas para el reverso (resumen, habilidades…), cuando tengan contenido.</p>}
        {sections.map((s) => {
          const v = valueOf(c, s)
          if (v.kind === 'text' && v.text.trim()) {
            return <blockquote key={s.id} className="card-quote card-clamp">{v.text}</blockquote>
          }
          if (v.kind === 'blocks') {
            const blocks = v.blocks.filter((b) => b.name.trim())
            if (blocks.length === 0) return null
            return (
              <div key={s.id} className="card-section">
                <h4 className="card-label">{s.title}</h4>
                <ul className="card-abilities">
                  {limit(blocks, 3, compact).map((b) => (
                    <li key={b.id}>
                      <strong>{b.name}</strong>
                      {(b.description || b.value) && <span className="card-clamp card-clamp--2">{b.description || b.value}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )
          }
          if (v.kind === 'list' && v.items.some((i) => i.trim())) return <ListSection key={s.id} title={s.title} items={v.items} compact={compact} />
          if (v.kind === 'fields') {
            const rows = (s.fields ?? []).filter((f) => v.values[f.id]?.trim())
            if (rows.length === 0) return null
            return (
              <div key={s.id} className="card-section">
                <h4 className="card-label">{s.title}</h4>
                <dl className="card-facts card-facts--plain">
                  {rows.map((f) => (
                    <div key={f.id}><dt>{shortLabel(f.label)}</dt><dd>{v.values[f.id]}</dd></div>
                  ))}
                </dl>
              </div>
            )
          }
          return null
        })}
      </div>
      <footer className="card-foot">
        <span className="card-soul" aria-hidden="true" />
      </footer>
    </>
  )
}
