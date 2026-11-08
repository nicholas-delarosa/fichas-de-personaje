import { useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { Character, Visibility } from '../lib/types'
import { useSession } from '../lib/session'
import { useLoad } from '../lib/useLoad'
import { fetchCharacter, fetchCharactersByIds, localRepo } from '../lib/store'
import { cloudEnabled } from '../lib/supabase'
import { downloadCharacter } from '../lib/files'
import { play } from '../lib/sound'
import { uid } from '../lib/id'
import { FlipCard } from '../components/FlipCard'
import { ExportButtons } from '../components/ExportButtons'
import { slug } from '../lib/slug'
import { SheetView } from '../components/SheetView'

const visibilityShort: Record<Visibility, string> = { private: 'Privada', link: 'Con enlace', public: 'Pública' }

export function CharacterPage() {
  const { id } = useParams()
  const { repo, user, ready } = useSession()
  const navigate = useNavigate()
  const [message, setMessage] = useState<string | null>(null)

  const { data, error, loading, setData } = useLoad(async () => {
    if (!ready || !id) return null
    // Primero lo propio (navegador o cuenta); si no está, puede ser una ficha compartida de otra persona
    const character = (await repo.getCharacter(id)) ?? (await localRepo.getCharacter(id)) ?? (await fetchCharacter(id))
    if (!character) return { character: null, linkable: new Set<string>(), world: null }

    const relationIds = character.sections.flatMap((s) => {
      const v = character.values[s.id]
      return v?.kind === 'relations' ? v.relations.map((r) => r.characterId).filter((x): x is string => !!x) : []
    })
    const isLocal = repo.kind === 'local' || !character.ownerId
    const reachable = isLocal
      ? (await localRepo.listCharacters()).filter((c) => relationIds.includes(c.id))
      : await fetchCharactersByIds(relationIds)
    const worlds = await repo.listWorlds()
    return {
      character,
      linkable: new Set(reachable.map((c) => c.id)),
      world: worlds.find((w) => w.id === character.worldId) ?? null
    }
  }, [id, repo, ready])

  if (!ready || (loading && !data)) return <p className="page status-message">Cargando…</p>
  if (error) return <p className="page status-message form-error">{error}</p>
  if (!data?.character) {
    return (
      <div className="page status-message">
        <p>No encontramos esta ficha.</p>
        <p className="muted">Puede que sea privada o que la hayan borrado.</p>
      </div>
    )
  }

  const c = data.character
  // Las fichas del modo invitado no tienen dueño: son de quien las tiene en su navegador
  const isOwner = c.ownerId ? c.ownerId === user?.id : repo.kind === 'local'
  const shareUrl = `${window.location.origin}/ficha/${c.id}`

  async function setVisibility(visibility: Visibility) {
    try {
      const saved = await repo.saveCharacter({ ...c, visibility })
      setData((d) => (d ? { ...d, character: saved } : d))
      play('save')
    } catch (e) {
      play('hurt')
      setMessage(e instanceof Error ? e.message : 'No se pudo cambiar.')
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      play('item')
      setMessage('Enlace copiado.')
    } catch {
      setMessage(shareUrl)
    }
  }

  async function duplicate() {
    const now = new Date().toISOString()
    const copy: Character = { ...structuredClone(c), id: uid(), ownerId: user?.id ?? null, name: `${c.name} (copia)`, visibility: 'private', createdAt: now, updatedAt: now }
    if (!isOwner) copy.worldId = null
    try {
      const saved = await repo.saveCharacter(copy)
      play('save')
      navigate(`/ficha/${saved.id}/editar`)
    } catch (e) {
      play('hurt')
      setMessage(e instanceof Error ? e.message : 'No se pudo duplicar.')
    }
  }

  async function remove() {
    if (!confirm(`¿Borrar a ${c.name || 'este personaje'}? No se puede deshacer.`)) return
    try {
      await repo.deleteCharacter(c.id)
      play('hurt')
      navigate('/')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo borrar.')
    }
  }

  return (
    <div className="page character-page" style={{ '--accent': c.style.accent } as CSSProperties}>
      <aside className="character-aside">
        <FlipCard character={c}><ExportButtons character={c} /></FlipCard>
      </aside>
      <div className="character-main">
        <header className="character-head">
          <h1 className="page-title">{c.name || 'Sin nombre'}</h1>
          {c.alias && <p className="character-alias" style={{ color: c.style.accent }}>«{c.alias}»</p>}
          <p className="muted">
            {c.ownerName && !isOwner && <>Por {c.ownerName} · </>}
            {data.world && <>Mundo: <Link className="link" to={`/?mundo=${data.world.id}`}>{data.world.name}</Link> · </>}
            {isOwner && repo.kind === 'cloud' && <>{visibilityShort[c.visibility]} · </>}
            Actualizada el {new Date(c.updatedAt).toLocaleDateString('es')}
          </p>
        </header>

        <div className="button-row character-actions">
          {isOwner && <Link to={`/ficha/${c.id}/editar`} className="menu-item">Editar</Link>}
          <button type="button" className="menu-item" onClick={duplicate}>{isOwner ? 'Duplicar' : 'Copiar a mis fichas'}</button>
          <button type="button" className="menu-item" onClick={() => downloadCharacter(c, slug(c.name))}>Descargar .json</button>
          {isOwner && <button type="button" className="menu-item" onClick={remove}>Borrar</button>}
        </div>

        {isOwner && (
          <section className="box share-box">
            <h2 className="box-title">Compartir</h2>
            {repo.kind === 'cloud' ? (
              <>
                <div className="choice-row" role="radiogroup" aria-label="Quién puede verla">
                  {(Object.keys(visibilityShort) as Visibility[]).map((v) => (
                    <button key={v} type="button" role="radio" aria-checked={c.visibility === v} className={`tag tag-btn ${c.visibility === v ? 'is-active' : ''}`} onClick={() => setVisibility(v)}>
                      {visibilityShort[v]}
                    </button>
                  ))}
                </div>
                {c.visibility === 'private'
                  ? <p className="muted">Solo tú la ves. Elige “Con enlace” o “Pública” para compartirla.</p>
                  : (
                    <div className="share-link">
                      <input className="input" readOnly value={shareUrl} aria-label="Enlace de la ficha" onFocus={(e) => e.target.select()} />
                      <button type="button" className="menu-item" onClick={copyLink}>Copiar enlace</button>
                    </div>
                  )}
              </>
            ) : (
              <p className="muted">
                {cloudEnabled
                  ? <>Para compartir con enlace, <Link className="link" to="/entrar">entra con tu cuenta</Link>. Mientras, puedes mandar el PDF, el PNG de la carta o el .json.</>
                  : 'Puedes compartir el PDF de la ficha, el PNG de la carta o el archivo .json.'}
              </p>
            )}
          </section>
        )}

        {message && <p className="status-line" role="status">{message}</p>}

        <SheetView character={c} linkable={data.linkable} />
      </div>
    </div>
  )
}
