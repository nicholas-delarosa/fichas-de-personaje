import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useLoad } from '../lib/useLoad'
import { listPublicCharacters, listPublicStories } from '../lib/store'
import { CardGrid } from '../components/CardGrid'
import { StoryTile } from './StoriesPage'

// Fichas e historias públicas de todos los usuarios (las fichas "con enlace" no salen aquí)
export default function ExplorePage() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('ver') === 'historias' ? 'historias' : 'fichas'
  const [query, setQuery] = useState('')
  const { data, error, loading } = useLoad(async () => {
    const [characters, stories] = await Promise.all([listPublicCharacters(), listPublicStories()])
    const counts = new Map<string, number>()
    characters.forEach((c) => c.worldId && counts.set(c.worldId, (counts.get(c.worldId) ?? 0) + 1))
    return { characters, stories, counts }
  }, [])

  const q = query.trim().toLowerCase()
  const matches = (text: string) => !q || text.toLowerCase().includes(q)
  const characters = (data?.characters ?? []).filter((c) => matches(`${c.name} ${c.alias} ${c.ownerName ?? ''}`))
  const stories = (data?.stories ?? []).filter((s) => matches(`${s.name} ${s.description} ${s.ownerName ?? ''}`))

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Explorar</h1>
        <input className="input search" type="search" placeholder="Buscar por nombre o autor" aria-label="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="tabs" role="tablist" aria-label="Qué explorar">
        <button type="button" role="tab" aria-selected={tab === 'fichas'} className={`tab menu-item ${tab === 'fichas' ? 'is-active' : ''}`} onClick={() => setParams({})}>
          Fichas{data && ` (${data.characters.length})`}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'historias'} className={`tab menu-item ${tab === 'historias' ? 'is-active' : ''}`} onClick={() => setParams({ ver: 'historias' })}>
          Historias{data && ` (${data.stories.length})`}
        </button>
      </div>
      {loading && <p className="muted">Cargando…</p>}
      {error && <p className="form-error">{error}</p>}
      {data && tab === 'fichas' && (
        characters.length === 0
          ? <p className="muted">{q ? 'Nada coincide con la búsqueda.' : 'Todavía nadie publicó fichas.'}</p>
          : <CardGrid characters={characters} showAuthor />
      )}
      {data && tab === 'historias' && (
        stories.length === 0
          ? <p className="muted">{q ? 'Nada coincide con la búsqueda.' : 'Todavía nadie publicó historias.'}</p>
          : (
            <ul className="story-grid">
              {stories.map((s) => <li key={s.id}><StoryTile story={s} count={data.counts.get(s.id) ?? 0} showAuthor /></li>)}
            </ul>
          )
      )}
    </div>
  )
}
