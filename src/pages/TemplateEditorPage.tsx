import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import type { Template } from '../lib/types'
import { useSession } from '../lib/session'
import { useLoad } from '../lib/useLoad'
import { play } from '../lib/sound'
import { SectionsEditor } from '../components/SectionsEditor'

export default function TemplateEditorPage() {
  const { id } = useParams()
  const { repo, ready } = useSession()
  const [draft, setDraft] = useState<Template | null>(null)
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const { data, error, loading } = useLoad(async () => {
    if (!ready) return null
    return (await repo.listTemplates()).find((t) => t.id === id) ?? null
  }, [id, repo, ready])

  useEffect(() => {
    if (data) setDraft(data)
  }, [data])

  if (error) return <p className="page status-message form-error">{error}</p>
  if (loading || !ready) return <p className="page status-message">Cargando…</p>
  if (!data) return <p className="page status-message">Esa plantilla no existe.</p>
  if (!draft) return null

  const update = (patch: Partial<Template>) => {
    setDraft({ ...draft, ...patch })
    setDirty(true)
    setStatus(null)
  }

  async function save() {
    if (!draft) return
    try {
      setDraft(await repo.saveTemplate(draft))
      setDirty(false)
      play('save')
      setStatus('Guardada.')
    } catch (e) {
      play('hurt')
      setStatus(e instanceof Error ? e.message : 'No se pudo guardar.')
    }
  }

  return (
    <div className="page">
      <div className="editor-bar">
        <h1 className="page-title">Editar plantilla</h1>
        <div className="button-row">
          {status && <span className="status-ok" role="status">{status}</span>}
          {dirty && !status && <span className="muted">Cambios sin guardar</span>}
          <button type="button" className="menu-item" onClick={save}>Guardar</button>
          <Link to="/plantillas" className="menu-item">Volver</Link>
        </div>
      </div>
      <div className="narrow">
        <section className="box">
          <div className="form-grid">
            <label className="form-field">
              <span className="form-label">Nombre</span>
              <input className="input input--title" value={draft.name} onChange={(e) => update({ name: e.target.value })} />
            </label>
            <label className="form-field">
              <span className="form-label">Descripción</span>
              <input className="input" value={draft.description} onChange={(e) => update({ description: e.target.value })} />
            </label>
          </div>
        </section>
        <section className="box">
          <h2 className="box-title">Secciones</h2>
          <p className="muted form-note">Toca una sección para cambiar su título, tipo de contenido y si aparece en la carta.</p>
          <SectionsEditor sections={draft.sections} onChange={(sections) => update({ sections })} />
        </section>
      </div>
    </div>
  )
}
