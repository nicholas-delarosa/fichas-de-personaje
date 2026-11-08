import { useState, type CSSProperties, type ReactNode } from 'react'
import type { Character } from '../lib/types'
import { play } from '../lib/sound'
import { CharacterCard } from './CharacterCard'

// Carta con frente y reverso, y botón para voltearla. Las dos caras miden lo mismo (lo que pida la más larga)
export function FlipCard({ character, scale, children }: { character: Character; scale?: number; children?: ReactNode }) {
  const [back, setBack] = useState(false)

  const flip = () => {
    play('shine')
    setBack((b) => !b)
  }

  return (
    <div className="flip-wrap">
      <div className={`flip ${back ? 'is-back' : ''}`} style={scale ? ({ '--card-scale': scale } as CSSProperties) : undefined}>
        <div className="flip-inner">
          <div className="flip-face" aria-hidden={back}>
            <CharacterCard character={character} side="front" />
          </div>
          <div className="flip-face flip-face--back" aria-hidden={!back}>
            <CharacterCard character={character} side="back" />
          </div>
        </div>
      </div>
      <div className="flip-controls">
        <button type="button" className="menu-item" onClick={flip}>{back ? 'Ver frente' : 'Voltear'}</button>
        {children}
      </div>
    </div>
  )
}
