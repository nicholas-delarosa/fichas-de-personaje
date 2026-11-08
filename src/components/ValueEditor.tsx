import type { Block, Character, Relation, SectionDef, SectionValue } from '../lib/types'
import { newBlock, newRelation } from '../lib/templates'

interface Props {
  section: SectionDef
  value: SectionValue
  onChange(value: SectionValue): void
  others: Character[] // para enlazar relaciones
}

// Editor del contenido de una sección, según su tipo
export function ValueEditor({ section, value, onChange, others }: Props) {
  switch (value.kind) {
    case 'fields':
      return (
        <div className="form-grid">
          {(section.fields ?? []).map((f) => (
            <label key={f.id} className="form-field">
              <span className="form-label">{f.label}</span>
              <input
                className="input"
                value={value.values[f.id] ?? ''}
                placeholder={f.placeholder}
                onChange={(e) => onChange({ ...value, values: { ...value.values, [f.id]: e.target.value } })}
              />
            </label>
          ))}
        </div>
      )
    case 'text':
      return (
        <textarea
          className="input textarea"
          aria-label={section.title}
          rows={4}
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
        />
      )
    case 'list':
      return <ListInput items={value.items} itemLabel={section.itemLabel ?? 'elemento'} onChange={(items) => onChange({ ...value, items })} />
    case 'blocks':
      return <BlocksInput section={section} blocks={value.blocks} onChange={(blocks) => onChange({ ...value, blocks })} />
    case 'relations':
      return <RelationsInput relations={value.relations} others={others} onChange={(relations) => onChange({ ...value, relations })} />
  }
}

function move<T>(list: T[], index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= list.length) return list
  const copy = [...list]
  ;[copy[index], copy[target]] = [copy[target], copy[index]]
  return copy
}

export function RowActions({ index, length, onMove, onRemove, label }: {
  index: number; length: number; onMove(delta: number): void; onRemove(): void; label: string
}) {
  return (
    <span className="row-actions">
      <button type="button" className="icon-btn" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Subir ${label}`} title="Subir">↑</button>
      <button type="button" className="icon-btn" disabled={index === length - 1} onClick={() => onMove(1)} aria-label={`Bajar ${label}`} title="Bajar">↓</button>
      <button type="button" className="icon-btn icon-btn--danger" onClick={onRemove} aria-label={`Quitar ${label}`} title="Quitar">×</button>
    </span>
  )
}

export function ListInput({ items, itemLabel, onChange }: { items: string[]; itemLabel: string; onChange(items: string[]): void }) {
  const set = (i: number, text: string) => onChange(items.map((x, j) => (j === i ? text : x)))
  return (
    <div className="list-input">
      {items.map((item, i) => (
        <div key={i} className="list-row">
          <span className="list-bullet" aria-hidden="true">*</span>
          <input
            className="input"
            value={item}
            aria-label={`${itemLabel} ${i + 1}`}
            onChange={(e) => set(i, e.target.value)}
            onKeyDown={(e) => {
              // Enter añade otro elemento debajo
              if (e.key === 'Enter') {
                e.preventDefault()
                onChange([...items.slice(0, i + 1), '', ...items.slice(i + 1)])
                requestAnimationFrame(() => {
                  const inputs = (e.target as HTMLElement).closest('.list-input')?.querySelectorAll('input')
                  inputs?.[i + 1]?.focus()
                })
              }
            }}
          />
          <RowActions index={i} length={items.length} label={itemLabel} onMove={(d) => onChange(move(items, i, d))} onRemove={() => onChange(items.filter((_, j) => j !== i))} />
        </div>
      ))}
      <button type="button" className="menu-item add-btn" onClick={() => onChange([...items, ''])}>+ Añadir {itemLabel}</button>
    </div>
  )
}

function BlocksInput({ section, blocks, onChange }: { section: SectionDef; blocks: Block[]; onChange(blocks: Block[]): void }) {
  const cfg = section.block ?? { value: null, score: false, description: 'Descripción', details: null, notes: null }
  const label = section.itemLabel ?? 'elemento'
  const set = (id: string, patch: Partial<Block>) => onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)))

  return (
    <div className="blocks-input">
      {blocks.map((b, i) => (
        <div key={b.id} className="block-card">
          <div className="block-row">
            <input
              className="input input--title"
              placeholder="Nombre"
              aria-label={`Nombre (${label} ${i + 1})`}
              value={b.name}
              onChange={(e) => set(b.id, { name: e.target.value })}
            />
            <RowActions index={i} length={blocks.length} label={label} onMove={(d) => onChange(move(blocks, i, d))} onRemove={() => onChange(blocks.filter((x) => x.id !== b.id))} />
          </div>
          <div className="form-grid">
            {cfg.value && (
              <label className="form-field">
                <span className="form-label">{cfg.value}</span>
                <input className="input" value={b.value} onChange={(e) => set(b.id, { value: e.target.value })} />
              </label>
            )}
            {cfg.score && <ScoreInput score={b.score} onChange={(score) => set(b.id, { score })} />}
          </div>
          {cfg.description && (
            <label className="form-field">
              <span className="form-label">{cfg.description}</span>
              <textarea className="input textarea" rows={2} value={b.description} onChange={(e) => set(b.id, { description: e.target.value })} />
            </label>
          )}
          {cfg.details && (
            <div className="form-field">
              <span className="form-label">{cfg.details}</span>
              <ListInput items={b.details} itemLabel="detalle" onChange={(details) => set(b.id, { details })} />
            </div>
          )}
          {cfg.notes && (
            <label className="form-field">
              <span className="form-label">{cfg.notes}</span>
              <textarea className="input textarea" rows={2} value={b.notes} onChange={(e) => set(b.id, { notes: e.target.value })} />
            </label>
          )}
        </div>
      ))}
      <button type="button" className="menu-item add-btn" onClick={() => onChange([...blocks, newBlock()])}>+ Añadir {label}</button>
    </div>
  )
}

// Puntuación 1–10 con segmentos clicables (clic en el mismo valor la quita)
function ScoreInput({ score, onChange }: { score: number | null; onChange(score: number | null): void }) {
  return (
    <div className="form-field">
      <span className="form-label">Puntuación {score != null ? `(${score}/10)` : '(sin puntuar)'}</span>
      <div className="score-input" role="radiogroup" aria-label="Puntuación de 1 a 10">
        {Array.from({ length: 10 }, (_, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={score === i + 1}
            aria-label={`${i + 1}`}
            className={i < (score ?? 0) ? 'on' : ''}
            onClick={() => onChange(score === i + 1 ? null : i + 1)}
          />
        ))}
      </div>
    </div>
  )
}

function RelationsInput({ relations, others, onChange }: { relations: Relation[]; others: Character[]; onChange(r: Relation[]): void }) {
  const set = (id: string, patch: Partial<Relation>) => onChange(relations.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  return (
    <div className="blocks-input">
      {relations.map((r, i) => (
        <div key={r.id} className="block-card">
          <div className="block-row">
            <select
              className="input"
              aria-label="Personaje enlazado"
              value={r.characterId ?? ''}
              onChange={(e) => {
                const linked = others.find((o) => o.id === e.target.value)
                set(r.id, { characterId: linked?.id ?? null, name: linked ? linked.name : r.name })
              }}
            >
              <option value="">Personaje sin ficha</option>
              {others.map((o) => <option key={o.id} value={o.id}>{o.name || 'Sin nombre'}</option>)}
            </select>
            <RowActions index={i} length={relations.length} label="relación" onMove={(d) => onChange(move(relations, i, d))} onRemove={() => onChange(relations.filter((x) => x.id !== r.id))} />
          </div>
          <div className="form-grid">
            <label className="form-field">
              <span className="form-label">Nombre</span>
              <input className="input" value={r.name} disabled={r.characterId != null} onChange={(e) => set(r.id, { name: e.target.value })} />
            </label>
            <label className="form-field">
              <span className="form-label">Relación</span>
              <input className="input" placeholder="Rival, hermana, maestro…" value={r.type} onChange={(e) => set(r.id, { type: e.target.value })} />
            </label>
          </div>
          <label className="form-field">
            <span className="form-label">Descripción</span>
            <textarea className="input textarea" rows={2} value={r.description} onChange={(e) => set(r.id, { description: e.target.value })} />
          </label>
        </div>
      ))}
      <button type="button" className="menu-item add-btn" onClick={() => onChange([...relations, newRelation()])}>+ Añadir relación</button>
    </div>
  )
}
