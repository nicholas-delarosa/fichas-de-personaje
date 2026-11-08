import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import type { Template } from '../lib/types'
import { useSession } from '../lib/session'
import { useLoad } from '../lib/useLoad'
import { builtinTemplates, copyTemplate } from '../lib/templates'
import { play } from '../lib/sound'
import { uid } from '../lib/id'
import { kindLabels } from '../components/SectionsEditor'

export default function TemplatesPage() {
  const { repo, user, ready } = useSession()
  const navigate = useNavigate()
  const { data, error, reload } = useLoad(async () => (ready ? repo.listTemplates() : null), [repo, ready])

  async function create(from: Template | null) {
    const base: Template = from ?? { id: uid(), ownerId: null, name: 'Plantilla nueva', description: '', sections: [], updatedAt: '' }
    try {
      const saved = await repo.saveTemplate(from ? copyTemplate(from, user?.id ?? null) : { ...base, ownerId: user?.id ?? null })
      play('save')
      navigate(`/plantillas/${saved.id}`)
    } catch (e) {
      play('hurt')
      alert(e instanceof Error ? e.message : 'No se pudo crear la plantilla.')
    }
  }

  async function remove(t: Template) {
    if (!confirm(`¿Borrar la plantilla "${t.name}"? Las fichas que ya la usan no cambian.`)) return
    await repo.deleteTemplate(t.id)
    play('hurt')
    reload()
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Plantillas</h1>
        <button type="button" className="menu-item" onClick={() => create(null)}>+ Plantilla vacía</button>
      </div>
      <p className="muted page-intro">
        Una plantilla define qué secciones tiene una ficha nueva. Cambiar una plantilla no modifica las fichas que ya la usaron.
      </p>

      <h2 className="section-heading">Incluidas</h2>
      <ul className="template-list">
        {builtinTemplates.map((t) => (
          <TemplateItem key={t.id} template={t}>
            <button type="button" className="menu-item" onClick={() => navigate(`/nueva?plantilla=${t.id}`)}>Usar</button>
            <button type="button" className="menu-item" onClick={() => create(t)}>Copiar y editar</button>
          </TemplateItem>
        ))}
      </ul>

      <h2 className="section-heading">Mías</h2>
      {error && <p className="form-error">{error}</p>}
      {data && data.length === 0 && <p className="muted">Todavía no tienes plantillas propias. Copia una incluida o empieza una vacía.</p>}
      <ul className="template-list">
        {data?.map((t) => (
          <TemplateItem key={t.id} template={t}>
            <button type="button" className="menu-item" onClick={() => navigate(`/nueva?plantilla=${t.id}`)}>Usar</button>
            <Link to={`/plantillas/${t.id}`} className="menu-item">Editar</Link>
            <button type="button" className="menu-item" onClick={() => remove(t)}>Borrar</button>
          </TemplateItem>
        ))}
      </ul>
    </div>
  )
}

function TemplateItem({ template, children }: { template: Template; children: ReactNode }) {
  return (
    <li className="box template-item">
      <div>
        <h3 className="template-name">{template.name}</h3>
        {template.description && <p className="muted">{template.description}</p>}
        <p className="template-sections">
          {template.sections.map((s) => <span key={s.id} className="tag" title={kindLabels[s.kind]}>{s.title}</span>)}
        </p>
      </div>
      <div className="button-row">{children}</div>
    </li>
  )
}
