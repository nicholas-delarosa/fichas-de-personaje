import { useState } from 'react'
import { Link } from 'react-router'
import type { World } from '../lib/types'
import { useSession } from '../lib/session'
import { useLoad } from '../lib/useLoad'
import { play } from '../lib/sound'
import { uid } from '../lib/id'

// Mundos: para agrupar personajes de una misma historia
export default function WorldsPage() {
  const { repo, user, ready } = useSession()
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<World | null>(null)
  const { data, error, reload } = useLoad(async () => {
    if (!ready) return null
    const [worlds, characters] = await Promise.all([repo.listWorlds(), repo.listCharacters()])
    const counts = new Map<string, number>()
    characters.forEach((c) => c.worldId && counts.set(c.worldId, (counts.get(c.worldId) ?? 0) + 1))
    return { worlds, counts }
  }, [repo, ready])

  async function save(world: World) {
    try {
      await repo.saveWorld(world)
      play('save')
      setEditing(null)
      reload()
    } catch (e) {
      play('hurt')
      alert(e instanceof Error ? e.message : 'No se pudo guardar.')
    }
  }

  async function create() {
    if (!name.trim()) {
      play('error')
      return
    }
    await save({ id: uid(), ownerId: user?.id ?? null, name: name.trim(), description: '', updatedAt: '' })
    setName('')
  }

  async function remove(w: World) {
    if (!confirm(`¿Borrar el mundo "${w.name}"? Sus personajes no se borran, solo quedan sin mundo.`)) return
    await repo.deleteWorld(w.id)
    play('hurt')
    reload()
  }

  return (
    <div className="page">
      <h1 className="page-title">Mundos</h1>
      <p className="muted page-intro">Agrupa a los personajes de una misma historia. En Mis fichas puedes filtrar por mundo.</p>

      <form className="inline-form" onSubmit={(e) => { e.preventDefault(); create() }}>
        <input className="input" placeholder="Nombre del mundo nuevo" aria-label="Nombre del mundo nuevo" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="menu-item">+ Crear mundo</button>
      </form>

      {error && <p className="form-error">{error}</p>}
      {data && data.worlds.length === 0 && <p className="muted">Todavía no hay mundos.</p>}
      <ul className="template-list">
        {data?.worlds.map((w) => (
          <li key={w.id} className="box template-item">
            {editing?.id === w.id ? (
              <form className="world-edit" onSubmit={(e) => { e.preventDefault(); save(editing) }}>
                <input className="input input--title" aria-label="Nombre" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                <textarea className="input textarea" aria-label="Descripción" rows={3} placeholder="De qué trata este mundo o historia" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                <div className="button-row">
                  <button type="submit" className="menu-item">Guardar</button>
                  <button type="button" className="menu-item" onClick={() => setEditing(null)}>Cancelar</button>
                </div>
              </form>
            ) : (
              <>
                <div>
                  <h3 className="template-name">{w.name}</h3>
                  {w.description && <p className="muted">{w.description}</p>}
                  <p className="muted">{data.counts.get(w.id) ?? 0} personaje(s)</p>
                </div>
                <div className="button-row">
                  <Link to={`/?mundo=${w.id}`} className="menu-item">Ver personajes</Link>
                  <button type="button" className="menu-item" onClick={() => setEditing(w)}>Editar</button>
                  <button type="button" className="menu-item" onClick={() => remove(w)}>Borrar</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
