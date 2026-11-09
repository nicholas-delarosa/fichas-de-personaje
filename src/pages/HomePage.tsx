import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useSession } from '../lib/session'
import { useLoad } from '../lib/useLoad'
import { builtinTemplates, exampleCharacter } from '../lib/templates'
import { hasLocalData, migrateLocalToCloud } from '../lib/store'
import { importCharacter } from '../lib/files'
import { play } from '../lib/sound'
import { CardGrid } from '../components/CardGrid'

export function HomePage() {
  const { repo, user, ready } = useSession()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const worldFilter = params.get('historia')
  const [choosing, setChoosing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const { data, error, loading, reload } = useLoad(
    async () => {
      if (!ready) return null
      const [characters, worlds, templates] = await Promise.all([repo.listCharacters(), repo.listWorlds(), repo.listTemplates()])
      return { characters, worlds, templates }
    },
    [repo, ready]
  )

  const characters = (data?.characters ?? []).filter((c) => !worldFilter || c.worldId === worldFilter)
  const templates = [...builtinTemplates, ...(data?.templates ?? [])]
  const canMigrate = user && hasLocalData()

  async function run(task: () => Promise<void>, done: string) {
    setBusy(true)
    setMessage(null)
    try {
      await task()
      play('save')
      setMessage(done)
      reload()
    } catch (e) {
      play('hurt')
      setMessage(e instanceof Error ? e.message : 'Algo salió mal')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Mis fichas</h1>
        <div className="button-row">
          <button type="button" className="menu-item" aria-expanded={choosing} onClick={() => setChoosing(!choosing)}>+ Nueva ficha</button>
          <label className="menu-item file-btn">
            Importar .json
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) run(async () => { await repo.saveCharacter(await importCharacter(file, user?.id ?? null)) }, 'Ficha importada.')
              }}
            />
          </label>
        </div>
      </div>

      {choosing && (
        <section className="box template-chooser" aria-label="Elegir plantilla">
          <h2 className="box-title">¿Con qué plantilla?</h2>
          <ul className="choice-list">
            {templates.map((t) => (
              <li key={t.id}>
                <button type="button" className="menu-item" onClick={() => navigate(`/nueva?plantilla=${t.id}`)}>{t.name}</button>
                <p className="muted">{t.description || `${t.sections.length} secciones`}</p>
              </li>
            ))}
          </ul>
          <p className="muted">Puedes crear tus propias plantillas en <Link to="/plantillas" className="link">Plantillas</Link>.</p>
        </section>
      )}

      {canMigrate && (
        <div className="box notice">
          <p>Tienes fichas guardadas en este navegador de antes de entrar. ¿Las pasamos a tu cuenta?</p>
          <button type="button" className="menu-item" disabled={busy} onClick={() => run(() => migrateLocalToCloud(repo), 'Listo: tus fichas ya están en tu cuenta.')}>
            {busy ? 'Pasando…' : 'Pasar a mi cuenta'}
          </button>
        </div>
      )}

      {message && <p className="status-line" role="status">{message}</p>}

      {(data?.worlds.length ?? 0) > 0 && (
        <div className="filter-row" role="group" aria-label="Filtrar por historia">
          <button type="button" className={`tag tag-btn ${!worldFilter ? 'is-active' : ''}`} onClick={() => setParams({})}>Todos</button>
          {data!.worlds.map((w) => (
            <button key={w.id} type="button" className={`tag tag-btn ${worldFilter === w.id ? 'is-active' : ''}`} onClick={() => setParams({ historia: w.id })}>{w.name || 'Sin nombre'}</button>
          ))}
        </div>
      )}

      {loading && !data && <p className="muted">Cargando…</p>}
      {error && <p className="form-error">{error}</p>}
      {data && characters.length === 0 && (
        <div className="empty">
          <p>{worldFilter ? 'No hay personajes en esta historia todavía.' : 'Todavía no tienes personajes.'}</p>
          {!worldFilter && (
            <button type="button" className="menu-item" disabled={busy} onClick={() => run(async () => { await repo.saveCharacter(exampleCharacter(user?.id ?? null)) }, 'Personaje de ejemplo creado.')}>
              Ver un personaje de ejemplo
            </button>
          )}
        </div>
      )}
      {characters.length > 0 && <CardGrid characters={characters} />}
    </div>
  )
}
