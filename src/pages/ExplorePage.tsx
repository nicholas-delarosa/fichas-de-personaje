import { useState } from 'react'
import { useLoad } from '../lib/useLoad'
import { listPublicCharacters } from '../lib/store'
import { CardGrid } from '../components/CardGrid'

// Fichas públicas de todos los usuarios (las "con enlace" no salen aquí)
export default function ExplorePage() {
  const [query, setQuery] = useState('')
  const { data, error, loading } = useLoad(listPublicCharacters, [])
  const q = query.trim().toLowerCase()
  const shown = (data ?? []).filter((c) => !q || `${c.name} ${c.alias} ${c.ownerName ?? ''}`.toLowerCase().includes(q))

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="page-title">Explorar</h1>
        <input className="input search" type="search" placeholder="Buscar por nombre o autor" aria-label="Buscar" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {loading && <p className="muted">Cargando…</p>}
      {error && <p className="form-error">{error}</p>}
      {data && shown.length === 0 && <p className="muted">{q ? 'Nada coincide con la búsqueda.' : 'Todavía nadie publicó fichas.'}</p>}
      <CardGrid characters={shown} showAuthor />
    </div>
  )
}
