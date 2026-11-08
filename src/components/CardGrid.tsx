import { Link } from 'react-router'
import type { Character } from '../lib/types'
import { CharacterCard } from './CharacterCard'

// Galería de cartas (el frente, en chico). Cada carta lleva a su ficha completa
export function CardGrid({ characters, showAuthor = false }: { characters: Character[]; showAuthor?: boolean }) {
  return (
    <ul className="card-grid">
      {characters.map((c) => (
        <li key={c.id}>
          <Link to={`/ficha/${c.id}`} className="menu-item soul-inside gallery-item">
            <CharacterCard character={c} side="front" compact className="card--mini" />
            <span className="gallery-caption">
              <span className="soul-slot" />
              <span>
                {c.name || 'Sin nombre'}
                {showAuthor && c.ownerName && <span className="muted gallery-author">por {c.ownerName}</span>}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
