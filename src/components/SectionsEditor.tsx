import { useState } from 'react'
import type { BlockConfig, CardPlacement, FieldDef, SectionDef, SectionKind } from '../lib/types'
import { newSection } from '../lib/templates'
import { uid } from '../lib/id'
import { RowActions } from './ValueEditor'

export const kindLabels: Record<SectionKind, string> = {
  fields: 'Datos (campos cortos)',
  text: 'Texto largo',
  list: 'Lista',
  blocks: 'Bloques (capacidades, habilidades…)',
  relations: 'Relaciones'
}

const placementLabels: Record<string, string> = { front: 'Frente', back: 'Reverso', none: 'Solo en la ficha' }

// Editor de la estructura: qué secciones hay, en qué orden, de qué tipo y dónde van en la carta
export function SectionsEditor({ sections, onChange }: { sections: SectionDef[]; onChange(sections: SectionDef[]): void }) {
  const [newKind, setNewKind] = useState<SectionKind>('text')
  const [open, setOpen] = useState<string | null>(null)

  const set = (id: string, patch: Partial<SectionDef>) => onChange(sections.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  const moveSection = (i: number, d: number) => {
    const t = i + d
    if (t < 0 || t >= sections.length) return
    const copy = [...sections]
    ;[copy[i], copy[t]] = [copy[t], copy[i]]
    onChange(copy)
  }

  return (
    <div className="sections-editor">
      {sections.map((s, i) => (
        <div key={s.id} className={`structure-row ${open === s.id ? 'is-open' : ''}`}>
          <div className="block-row">
            <button type="button" className="menu-item structure-toggle" aria-expanded={open === s.id} onClick={() => setOpen(open === s.id ? null : s.id)}>
              {s.title || 'Sin título'}
            </button>
            <span className="muted structure-kind">{kindLabels[s.kind].split(' (')[0]}</span>
            <RowActions
              index={i}
              length={sections.length}
              label={`la sección ${s.title}`}
              onMove={(d) => moveSection(i, d)}
              onRemove={() => {
                if (confirm(`¿Quitar la sección "${s.title}"? Si ya tiene contenido, se pierde.`)) onChange(sections.filter((x) => x.id !== s.id))
              }}
            />
          </div>
          {open === s.id && <SectionSettings section={s} onChange={(patch) => set(s.id, patch)} />}
        </div>
      ))}
      <div className="structure-add">
        <select className="input" aria-label="Tipo de la nueva sección" value={newKind} onChange={(e) => setNewKind(e.target.value as SectionKind)}>
          {Object.entries(kindLabels).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <button
          type="button"
          className="menu-item add-btn"
          onClick={() => {
            const s = newSection(newKind)
            onChange([...sections, s])
            setOpen(s.id)
          }}
        >
          + Añadir sección
        </button>
      </div>
    </div>
  )
}

function SectionSettings({ section: s, onChange }: { section: SectionDef; onChange(patch: Partial<SectionDef>): void }) {
  return (
    <div className="structure-settings">
      <div className="form-grid">
        <label className="form-field">
          <span className="form-label">Título</span>
          <input className="input" value={s.title} onChange={(e) => onChange({ title: e.target.value })} />
        </label>
        <label className="form-field">
          <span className="form-label">En la carta</span>
          <select
            className="input"
            value={s.card ?? 'none'}
            onChange={(e) => onChange({ card: (e.target.value === 'none' ? null : e.target.value) as CardPlacement })}
          >
            {Object.entries(placementLabels).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </label>
      </div>
      <label className="form-field">
        <span className="form-label">Ayuda (opcional)</span>
        <input className="input" value={s.hint ?? ''} placeholder="Una pista de qué escribir aquí" onChange={(e) => onChange({ hint: e.target.value })} />
      </label>
      {(s.kind === 'list' || s.kind === 'blocks') && (
        <label className="form-field">
          <span className="form-label">Cada elemento se llama</span>
          <input className="input" value={s.itemLabel ?? ''} placeholder="habilidad, debilidad…" onChange={(e) => onChange({ itemLabel: e.target.value })} />
        </label>
      )}
      {s.kind === 'fields' && <FieldsSettings fields={s.fields ?? []} onChange={(fields) => onChange({ fields })} />}
      {s.kind === 'blocks' && s.block && <BlockSettings config={s.block} onChange={(block) => onChange({ block })} />}
    </div>
  )
}

function FieldsSettings({ fields, onChange }: { fields: FieldDef[]; onChange(fields: FieldDef[]): void }) {
  const set = (id: string, patch: Partial<FieldDef>) => onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  return (
    <div className="form-field">
      <span className="form-label">Campos (marca los que salen como dato rápido en el frente)</span>
      {fields.map((f, i) => (
        <div key={f.id} className="list-row">
          <input className="input" aria-label={`Nombre del campo ${i + 1}`} value={f.label} onChange={(e) => set(f.id, { label: e.target.value })} />
          <label className="check">
            <input type="checkbox" checked={!!f.onCard} onChange={(e) => set(f.id, { onCard: e.target.checked })} /> En carta
          </label>
          <RowActions
            index={i}
            length={fields.length}
            label={`el campo ${f.label}`}
            onMove={(d) => {
              const t = i + d
              const copy = [...fields]
              ;[copy[i], copy[t]] = [copy[t], copy[i]]
              onChange(copy)
            }}
            onRemove={() => onChange(fields.filter((x) => x.id !== f.id))}
          />
        </div>
      ))}
      <button type="button" className="menu-item add-btn" onClick={() => onChange([...fields, { id: uid(), label: 'Campo nuevo' }])}>+ Añadir campo</button>
    </div>
  )
}

// Cada parte opcional del bloque se activa poniéndole nombre
function BlockSettings({ config, onChange }: { config: BlockConfig; onChange(config: BlockConfig): void }) {
  const part = (key: 'value' | 'description' | 'details' | 'notes', label: string, fallback: string) => (
    <div className="list-row">
      <label className="check">
        <input type="checkbox" checked={config[key] != null} onChange={(e) => onChange({ ...config, [key]: e.target.checked ? fallback : null })} /> {label}
      </label>
      {config[key] != null && (
        <input className="input" aria-label={`Nombre de "${label}"`} value={config[key] ?? ''} onChange={(e) => onChange({ ...config, [key]: e.target.value })} />
      )}
    </div>
  )
  return (
    <div className="form-field">
      <span className="form-label">Partes de cada bloque</span>
      {part('value', 'Valor corto', 'Valor')}
      <label className="check">
        <input type="checkbox" checked={config.score} onChange={(e) => onChange({ ...config, score: e.target.checked })} /> Puntuación 1–10 (barra en la carta)
      </label>
      {part('description', 'Descripción', 'Descripción')}
      {part('details', 'Lista de detalles', 'Detalles')}
      {part('notes', 'Notas', 'Limitaciones')}
    </div>
  )
}
