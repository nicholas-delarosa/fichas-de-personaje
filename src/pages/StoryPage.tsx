import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import type { Character, World } from '../lib/types'
import { useSession } from '../lib/session'
import { useLoad } from '../lib/useLoad'
import { fetchWorld, listStoryCharacters, localRepo } from '../lib/store'
import { refFromParam, storyPath } from '../lib/paths'
import { play } from '../lib/sound'
import { CardGrid } from '../components/CardGrid'

const colors = ['#d535d9', '#ffff00', '#00c2ff', '#ff6ad5', '#5dff8a', '#ff9f2e', '#ff4b4b', '#9a7bff', '#ffffff']

export default function StoryPage() {
  const { ref: param } = useParams()
  const ref = refFromParam(param)
  const { repo, user, ready } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [editing, setEditing] = useState<World | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [adding, setAdding] = useState('')

  const { data, error, loading, reload } = useLoad(async () => {
    if (!ready || !ref) return null
    const story = (await repo.getWorld(ref)) ?? (await localRepo.getWorld(ref)) ?? (await fetchWorld(ref))
    if (!story) return { story: null, characters: [] as Character[], mine: [] as Character[] }
    const isLocal = !story.ownerId
    const characters = isLocal
      ? (await localRepo.listCharacters()).filter((c) => c.worldId === story.id)
      : await listStoryCharacters(story.id)
    const mine = await repo.listCharacters()
    return { story, characters, mine }
  }, [ref, repo, ready])

  const canonical = data?.story ? storyPath(data.story) : null
  useEffect(() => {
    if (canonical && location.pathname !== canonical) navigate(canonical, { replace: true })
  }, [canonical, location.pathname, navigate])

  if (!ready || (loading && !data)) return <p className="page status-message">Cargando…</p>
  if (error) return <p className="page status-message form-error">{error}</p>
  if (!data?.story) {
    return (
      <div className="page status-message">
        <p>No encontramos esta historia.</p>
        <p className="muted">Puede que sea privada o que la hayan borrado.</p>
      </div>
    )
  }

  const story = data.story
  const isOwner = story.ownerId ? story.ownerId === user?.id : repo.kind === 'local'
  const cloud = repo.kind === 'cloud' && isOwner
  const shareUrl = `${window.location.origin}${storyPath(story)}`
  const loose = data.mine.filter((c) => c.worldId !== story.id)

  async function saveStory(w: World) {
    try {
      await repo.saveWorld(w)
      play('save')
      setEditing(null)
      reload()
    } catch (e) {
      play('hurt')
      setMessage(e instanceof Error ? e.message : 'No se pudo guardar.')
    }
  }

  async function remove() {
    if (!confirm(`¿Borrar la historia "${story.name}"? Sus personajes no se borran, solo quedan sin historia.`)) return
    await repo.deleteWorld(story.id)
    play('hurt')
    navigate('/historias')
  }

  async function addExisting() {
    const c = data!.mine.find((x) => x.id === adding)
    if (!c) return
    try {
      await repo.saveCharacter({ ...c, worldId: story.id })
      play('save')
      setAdding('')
      reload()
    } catch (e) {
      play('hurt')
      setMessage(e instanceof Error ? e.message : 'No se pudo añadir.')
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

  return (
    <div className="page story-page" style={{ '--story': story.color } as CSSProperties}>
      {editing ? (
        <form className="box story-edit" onSubmit={(e) => { e.preventDefault(); saveStory(editing) }}>
          <label className="form-field">
            <span className="form-label">Nombre</span>
            <input className="input input--title" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </label>
          <label className="form-field">
            <span className="form-label">De qué trata</span>
            <textarea className="input textarea" rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </label>
          <div className="form-field">
            <span className="form-label">Color</span>
            <div className="swatches">
              {colors.map((c) => (
                <button key={c} type="button" className={`swatch ${editing.color === c ? 'is-active' : ''}`} style={{ background: c }} aria-label={`Color ${c}`} aria-pressed={editing.color === c} onClick={() => setEditing({ ...editing, color: c })} />
              ))}
            </div>
          </div>
          {repo.kind === 'cloud' && (
            <div className="form-field">
              <span className="form-label">Quién puede verla</span>
              <div className="choice-row" role="radiogroup" aria-label="Quién puede verla">
                {(['private', 'public'] as const).map((v) => (
                  <button key={v} type="button" role="radio" aria-checked={editing.visibility === v} className={`tag tag-btn ${editing.visibility === v ? 'is-active' : ''}`} onClick={() => setEditing({ ...editing, visibility: v })}>
                    {v === 'private' ? 'Privada' : 'Pública (aparece en Explorar)'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="button-row">
            <button type="submit" className="menu-item">Guardar</button>
            <button type="button" className="menu-item" onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        </form>
      ) : (
        <header className="story-head">
          <p className="story-kicker">Historia{story.ownerName && !isOwner && <> · por {story.ownerName}</>}{cloud && <> · {story.visibility === 'public' ? 'Pública' : 'Privada'}</>}</p>
          <h1 className="page-title">{story.name || 'Sin nombre'}</h1>
          {story.description && <p className="story-desc">{story.description}</p>}
        </header>
      )}

      {isOwner && !editing && (
        <div className="button-row story-actions">
          <Link to={`/nueva?historia=${story.id}`} className="menu-item">+ Nueva ficha aquí</Link>
          <button type="button" className="menu-item" onClick={() => setEditing(story)}>Editar</button>
          <button type="button" className="menu-item" onClick={remove}>Borrar</button>
        </div>
      )}

      {cloud && story.visibility === 'public' && !editing && (
        <div className="share-link">
          <input className="input" readOnly value={shareUrl} aria-label="Enlace de la historia" onFocus={(e) => e.target.select()} />
          <button type="button" className="menu-item" onClick={copyLink}>Copiar enlace</button>
        </div>
      )}

      {message && <p className="status-line" role="status">{message}</p>}

      {isOwner && loose.length > 0 && (
        <div className="inline-form story-add">
          <select className="input" aria-label="Añadir una ficha existente" value={adding} onChange={(e) => setAdding(e.target.value)}>
            <option value="">Añadir una ficha que ya tienes…</option>
            {loose.map((c) => <option key={c.id} value={c.id}>{c.name || 'Sin nombre'}</option>)}
          </select>
          <button type="button" className="menu-item" disabled={!adding} onClick={addExisting}>Añadir</button>
        </div>
      )}

      {isOwner && cloud && story.visibility === 'public' && (
        <p className="muted form-note--after">Los visitantes solo ven las fichas de esta historia que tengan visibilidad “Pública”.</p>
      )}

      {data.characters.length === 0
        ? <p className="muted empty-story">{isOwner ? 'Esta historia todavía no tiene personajes.' : 'Esta historia todavía no tiene personajes públicos.'}</p>
        : <CardGrid characters={data.characters} />}
    </div>
  )
}
