import { Link } from 'react-router'
import type { Character, SectionDef } from '../lib/types'
import { valueOf } from '../lib/templates'

// Ficha completa: todas las secciones con todo su texto (la carta solo muestra un resumen)
export function SheetView({ character, linkable }: { character: Character; linkable: Map<string, string> }) {
  const sections = character.sections.filter((s) => hasContent(character, s))
  if (sections.length === 0) return <p className="muted">Esta ficha todavía está vacía.</p>
  return (
    <div className="sheet">
      {sections.map((s) => (
        <section key={s.id} className="sheet-section box">
          <h2 className="sheet-title">{s.title}</h2>
          <SectionContent character={character} section={s} linkable={linkable} />
        </section>
      ))}
    </div>
  )
}

export function hasContent(c: Character, s: SectionDef) {
  const v = valueOf(c, s)
  switch (v.kind) {
    case 'fields': return Object.values(v.values).some((x) => x.trim())
    case 'text': return v.text.trim() !== ''
    case 'list': return v.items.some((x) => x.trim())
    case 'blocks': return v.blocks.some((b) => b.name.trim())
    case 'relations': return v.relations.some((r) => r.name.trim())
  }
}

function SectionContent({ character, section, linkable }: { character: Character; section: SectionDef; linkable: Map<string, string> }) {
  const v = valueOf(character, section)
  switch (v.kind) {
    case 'fields':
      return (
        <dl className="sheet-fields">
          {(section.fields ?? []).filter((f) => v.values[f.id]?.trim()).map((f) => (
            <div key={f.id}>
              <dt>{f.label}</dt>
              <dd>{v.values[f.id]}</dd>
            </div>
          ))}
        </dl>
      )
    case 'text':
      return <p className="sheet-text">{v.text}</p>
    case 'list':
      return (
        <ul className="sheet-list">
          {v.items.filter((i) => i.trim()).map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )
    case 'blocks': {
      const cfg = section.block
      return (
        <div className="sheet-blocks">
          {v.blocks.filter((b) => b.name.trim()).map((b) => (
            <article key={b.id} className="sheet-block">
              <header className="sheet-block-head">
                <h3>{b.name}</h3>
                {cfg?.value && b.value && <span className="sheet-block-value">{b.value}</span>}
                {cfg?.score && b.score != null && (
                  <span className="card-bar sheet-bar" aria-label={`${b.score} de 10`}>
                    {Array.from({ length: 10 }, (_, i) => <i key={i} className={i < (b.score ?? 0) ? 'on' : ''} />)}
                  </span>
                )}
              </header>
              {cfg?.description && b.description && <p className="sheet-text">{b.description}</p>}
              {cfg?.details && b.details.some((d) => d.trim()) && (
                <>
                  <h4 className="sheet-sub">{cfg.details}</h4>
                  <ul className="sheet-list">{b.details.filter((d) => d.trim()).map((d, i) => <li key={i}>{d}</li>)}</ul>
                </>
              )}
              {cfg?.notes && b.notes && (
                <>
                  <h4 className="sheet-sub">{cfg.notes}</h4>
                  <p className="sheet-text">{b.notes}</p>
                </>
              )}
            </article>
          ))}
        </div>
      )
    }
    case 'relations':
      return (
        <ul className="sheet-relations">
          {v.relations.filter((r) => r.name.trim()).map((r) => (
            <li key={r.id}>
              {r.characterId && linkable.has(r.characterId)
                ? <Link className="menu-item" to={linkable.get(r.characterId)!}>{r.name}</Link>
                : <strong>{r.name}</strong>}
              {r.type && <span className="tag">{r.type}</span>}
              {r.description && <p className="sheet-text">{r.description}</p>}
            </li>
          ))}
        </ul>
      )
  }
}
