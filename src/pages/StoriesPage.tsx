import { useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router'
import type { World } from '../lib/types'
import { useSession } from '../lib/session'
import { useLoad } from '../lib/useLoad'
import { DEFAULT_STORY_COLOR } from '../lib/store'
import { storyPath } from '../lib/paths'
import { play } from '../lib/sound'
import { shortId, uid } from '../lib/id'

export const newStory = (name: string, ownerId: string | null): World => ({
  id: uid(),
  shortId: shortId(),
  ownerId,
  name,
  description: '',
  color: DEFAULT_STORY_COLOR,
  visibility: 'private',
  updatedAt: ''
})

// Historias: cada una agrupa a los personajes que viven en ella
export default function StoriesPage() {
  const { repo, user, ready } = useSession()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data, error: loadError } = useLoad(async () => {
    if (!ready) return null
    const [worlds, characters] = await Promise.all([repo.listWorlds(), repo.listCharacters()])
    const counts = new Map<string, number>()
    characters.forEach((c) => c.worldId && counts.set(c.worldId, (counts.get(c.worldId) ?? 0) + 1))
    return { worlds, counts, loose: characters.filter((c) => !c.worldId).length }
  }, [repo, ready])

  async function create() {
    if (!name.trim()) {
      play('error')
      return
    }
    try {
      const saved = await repo.saveWorld(newStory(name.trim(), user?.id ?? null))
      play('save')
      navigate(storyPath(saved))
    } catch (e) {
      play('hurt')
      setError(e instanceof Error ? e.message : 'No se pudo crear la historia.')
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Historias</h1>
      <p className="muted page-intro">
        Agrupa a los personajes de una misma historia. Cada historia tiene su página, y si la haces pública, aparece en Explorar.
      </p>

      <form className="inline-form" onSubmit={(e) => { e.preventDefault(); create() }}>
        <input className="input" placeholder="Nombre de la historia nueva" aria-label="Nombre de la historia nueva" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="menu-item">+ Crear historia</button>
      </form>
      {(error || loadError) && <p className="form-error">{error ?? loadError}</p>}

      {data && data.worlds.length === 0 && <p className="muted">Todavía no tienes historias.</p>}
      {data && data.worlds.length > 0 && (
        <ul className="story-grid">
          {data.worlds.map((w) => (
            <li key={w.id}>
              <StoryTile story={w} count={data.counts.get(w.id) ?? 0} />
            </li>
          ))}
        </ul>
      )}
      {data && data.loose > 0 && (
        <p className="muted story-loose">
          Tienes {data.loose} ficha(s) sin historia. Puedes asignarlas desde la página de cada historia o al editar la ficha. <Link className="link" to="/">Ver mis fichas</Link>
        </p>
      )}
    </div>
  )
}

export function StoryTile({ story, count, showAuthor = false }: { story: World; count?: number; showAuthor?: boolean }) {
  return (
    <Link to={storyPath(story)} className="menu-item soul-inside story-tile" style={{ '--story': story.color } as CSSProperties}>
      <span className="story-tile-name">
        <span className="soul-slot" />
        {story.name || 'Sin nombre'}
      </span>
      {story.description && <span className="story-tile-desc">{story.description}</span>}
      <span className="story-tile-meta">
        {count != null && <>{count} personaje{count === 1 ? '' : 's'}</>}
        {showAuthor && story.ownerName && <>por {story.ownerName}</>}
        {!showAuthor && story.visibility === 'public' && <span className="tag">Pública</span>}
      </span>
    </Link>
  )
}
