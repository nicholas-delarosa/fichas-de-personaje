import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import type { Character, FrameStyle, SectionValue, Visibility } from '../lib/types'
import { useSession } from '../lib/session'
import { useLoad } from '../lib/useLoad'
import { builtinTemplates, characterFromTemplate, copyTemplate, valueOf } from '../lib/templates'
import { play } from '../lib/sound'
import { uid } from '../lib/id'
import { FlipCard } from '../components/FlipCard'
import { ExportButtons } from '../components/ExportButtons'
import { ValueEditor } from '../components/ValueEditor'
import { AvatarEditor } from '../components/AvatarEditor'
import { SectionsEditor } from '../components/SectionsEditor'

export const frameLabels: Record<FrameStyle, string> = {
  dialogo: 'Caja de diálogo',
  darkworld: 'Mundo oscuro',
  reliquia: 'Reliquia',
  minimal: 'Minimal'
}

const accents = ['#d535d9', '#ffff00', '#00c2ff', '#ff6ad5', '#5dff8a', '#ff9f2e', '#ff4b4b', '#ffffff', '#ffc425', '#9a7bff']

export const visibilityLabels: Record<Visibility, string> = {
  private: 'Privada (solo tú)',
  link: 'Con enlace (quien tenga el link)',
  public: 'Pública (aparece en Explorar)'
}

export default function EditorPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const templateId = params.get('plantilla') ?? builtinTemplates[0].id
  const navigate = useNavigate()
  const { repo, user, ready } = useSession()

  const [draft, setDraft] = useState<Character | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [showStructure, setShowStructure] = useState(false)

  const { data, error } = useLoad(async () => {
    if (!ready) return null
    const [templates, worlds, characters] = await Promise.all([repo.listTemplates(), repo.listWorlds(), repo.listCharacters()])
    let character: Character | null
    if (id) {
      character = await repo.getCharacter(id)
    } else {
      const template = [...builtinTemplates, ...templates].find((t) => t.id === templateId) ?? builtinTemplates[0]
      character = characterFromTemplate(template, user?.id ?? null)
    }
    return { worlds, characters, character }
  }, [id, templateId, repo, ready])

  useEffect(() => {
    if (data?.character) {
      setDraft(data.character)
      setDirty(false)
    }
  }, [data])

  // Aviso al cerrar la pestaña con cambios sin guardar
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // Ctrl+S guarda
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (error) return <p className="page status-message form-error">{error}</p>
  if (!data || !draft) return <p className="page status-message">Cargando…</p>
  if (!data.character) return <p className="page status-message">Esa ficha no existe.</p>
  if (user && draft.ownerId && draft.ownerId !== user.id) {
    return <p className="page status-message">Esta ficha es de otra persona. <Link className="link" to={`/ficha/${draft.id}`}>Verla</Link></p>
  }

  const update = (patch: Partial<Character>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d))
    setDirty(true)
    setStatus(null)
  }
  const setValue = (sectionId: string, value: SectionValue) => update({ values: { ...draft.values, [sectionId]: value } })

  async function save() {
    if (!draft || saving) return
    if (!draft.name.trim()) {
      play('error')
      setStatus({ kind: 'error', text: 'Ponle un nombre al personaje antes de guardar.' })
      document.getElementById('char-name')?.focus()
      return
    }
    setSaving(true)
    try {
      const saved = await repo.saveCharacter(draft)
      setDraft(saved)
      setDirty(false)
      play('save')
      setStatus({ kind: 'ok', text: 'Guardado.' })
      if (!id) navigate(`/ficha/${saved.id}/editar`, { replace: true })
    } catch (e) {
      play('hurt')
      setStatus({ kind: 'error', text: e instanceof Error ? e.message : 'No se pudo guardar.' })
    } finally {
      setSaving(false)
    }
  }

  async function saveAsTemplate() {
    if (!draft) return
    const name = prompt('Nombre de la plantilla nueva:', `Plantilla de ${draft.name || 'personaje'}`)
    if (!name) return
    try {
      await repo.saveTemplate({
        ...copyTemplate({ id: uid(), ownerId: null, name, description: '', sections: draft.sections, updatedAt: '' }, user?.id ?? null),
        name
      })
      play('save')
      setStatus({ kind: 'ok', text: `Plantilla "${name}" creada. Está en Plantillas.` })
    } catch (e) {
      play('hurt')
      setStatus({ kind: 'error', text: e instanceof Error ? e.message : 'No se pudo crear la plantilla.' })
    }
  }

  const others = data.characters.filter((c) => c.id !== draft.id)

  return (
    <div className="page editor">
      <div className="editor-bar">
        <h1 className="page-title">{id ? 'Editar ficha' : 'Nueva ficha'}</h1>
        <div className="button-row">
          {status && <span className={status.kind === 'error' ? 'form-error' : 'status-ok'} role="status">{status.text}</span>}
          {dirty && !status && <span className="muted">Cambios sin guardar</span>}
          <button type="button" className="menu-item" disabled={saving} onClick={save}>{saving ? 'Guardando…' : 'Guardar'}</button>
          {id && (
            <Link
              to={`/ficha/${draft.id}`}
              className="menu-item"
              onClick={(e) => { if (dirty && !confirm('Hay cambios sin guardar. ¿Salir igual?')) e.preventDefault() }}
            >
              Ver ficha
            </Link>
          )}
        </div>
      </div>

      <div className="editor-columns">
        <div className="editor-form">
          <section className="box">
            <h2 className="box-title">Personaje</h2>
            <div className="form-grid">
              <label className="form-field">
                <span className="form-label">Nombre *</span>
                <input id="char-name" className="input input--title" value={draft.name} onChange={(e) => update({ name: e.target.value })} />
              </label>
              <label className="form-field">
                <span className="form-label">Apodo / título</span>
                <input className="input" value={draft.alias} placeholder="La asesina de hechiceros" onChange={(e) => update({ alias: e.target.value })} />
              </label>
              <label className="form-field">
                <span className="form-label">Mundo</span>
                <select className="input" value={draft.worldId ?? ''} onChange={(e) => update({ worldId: e.target.value || null })}>
                  <option value="">Sin mundo</option>
                  {data.worlds.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </label>
              {repo.kind === 'cloud' && (
                <label className="form-field">
                  <span className="form-label">Quién puede verla</span>
                  <select className="input" value={draft.visibility} onChange={(e) => update({ visibility: e.target.value as Visibility })}>
                    {Object.entries(visibilityLabels).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                </label>
              )}
            </div>
            {data.worlds.length === 0 && <p className="muted form-note">Para agrupar personajes por historia, crea un mundo en <Link className="link" to="/mundos">Mundos</Link>.</p>}
          </section>

          <section className="box">
            <h2 className="box-title">Avatar</h2>
            <AvatarEditor avatar={draft.avatar} onChange={(avatar) => update({ avatar })} upload={(blob) => repo.uploadAvatar(draft.id, blob)} />
          </section>

          <section className="box">
            <h2 className="box-title">Estilo de la carta</h2>
            <div className="form-field">
              <span className="form-label">Marco</span>
              <div className="choice-row" role="radiogroup" aria-label="Marco">
                {(Object.keys(frameLabels) as FrameStyle[]).map((f) => (
                  <button key={f} type="button" role="radio" aria-checked={draft.style.frame === f} className={`tag tag-btn ${draft.style.frame === f ? 'is-active' : ''}`} onClick={() => update({ style: { ...draft.style, frame: f } })}>
                    {frameLabels[f]}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-field">
              <span className="form-label">Color de acento</span>
              <div className="swatches">
                {accents.map((a) => (
                  <button key={a} type="button" className={`swatch ${draft.style.accent === a ? 'is-active' : ''}`} style={{ background: a }} aria-label={`Acento ${a}`} aria-pressed={draft.style.accent === a} onClick={() => update({ style: { ...draft.style, accent: a } })} />
                ))}
                <label className={`swatch swatch--custom ${accents.includes(draft.style.accent) ? '' : 'is-active'}`} style={accents.includes(draft.style.accent) ? undefined : { background: draft.style.accent }} title="Otro color">
                  <input type="color" className="sr-only" aria-label="Otro color de acento" value={draft.style.accent} onChange={(e) => update({ style: { ...draft.style, accent: e.target.value } })} />
                  {accents.includes(draft.style.accent) && '+'}
                </label>
              </div>
            </div>
          </section>

          {draft.sections.map((s) => (
            <section key={s.id} className="box" id={`sec-${s.id}`}>
              <h2 className="box-title">{s.title}</h2>
              {s.hint && <p className="muted form-note">{s.hint}</p>}
              <ValueEditor section={s} value={valueOf(draft, s)} onChange={(v) => setValue(s.id, v)} others={others} />
            </section>
          ))}

          <section className="box">
            <div className="block-row">
              <h2 className="box-title">Estructura de esta ficha</h2>
              <button type="button" className="menu-item" aria-expanded={showStructure} onClick={() => setShowStructure(!showStructure)}>
                {showStructure ? 'Ocultar' : 'Cambiar secciones'}
              </button>
            </div>
            <p className="muted form-note">Añade, quita o reordena secciones solo para este personaje. Para reutilizarla, guárdala como plantilla.</p>
            {showStructure && (
              <>
                <SectionsEditor sections={draft.sections} onChange={(sections) => update({ sections })} />
                <button type="button" className="menu-item" onClick={saveAsTemplate}>Guardar esta estructura como plantilla</button>
              </>
            )}
          </section>
        </div>

        <aside className="editor-preview" aria-label="Vista previa de la carta">
          <FlipCard character={draft}><ExportButtons character={draft} /></FlipCard>
          <p className="muted preview-note">Así se ve la carta. La ficha completa muestra todo el texto.</p>
        </aside>
      </div>
    </div>
  )
}
