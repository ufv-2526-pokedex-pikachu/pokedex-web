/**
 * Cartas pequeñas del álbum. Usan solo los datos de tu Pokédex (GET /pokedex), sin pedir el detalle
 * de cada Pokémon: con 151 cartas no se puede gastar el límite de 30 peticiones por minuto.
 *  - MiniCard: capturado (con foil) o visto (gris, en silueta).
 *  - CardBack: el reverso, para los que aún no tienes.
 */
import type { CSSProperties } from 'react'
import { TYPE_COLOR, artworkUrl, dexNumber, displayName } from '../lib/pokemon'
import { Icon } from './Icon'
import { Mark } from './Mark'
import { useHoloTilt } from './useHoloTilt'
import './HoloCard.css'

interface MiniProps {
  id: number
  name: string
  types: string[]
  nickname?: string | null
  captured: boolean
  favorite?: boolean
  /** Nombre para la transición entre páginas (solo la carta que se está abriendo). */
  transitionName?: string
}

export function MiniCard({ id, name, types, nickname, captured, favorite, transitionName }: MiniProps) {
  const { ref, active, handlers } = useHoloTilt<HTMLDivElement>({ ignoreTouch: true })
  const t1 = TYPE_COLOR[types[0]] ?? '#888'
  const t2 = TYPE_COLOR[types[1] ?? types[0]] ?? t1
  return (
    <div
      ref={ref}
      className={`holo holo--mini ${captured ? 'is-holo' : 'is-dull is-silhouette'} ${active ? 'is-active' : ''}`}
      style={{ '--t1': t1, '--t2': t2, viewTransitionName: transitionName } as CSSProperties}
      {...handlers}
    >
      <div className="holo__rotator">
        <div className="holo__face">
          <p className="holo__top">
            <span className="holo__name">{nickname ?? displayName(name)}</span>
            {favorite && <span className="holo__fav" role="img" aria-label="Favorito"><Icon name="star" filled /></span>}
          </p>
          <div className="holo__window">
            <img src={artworkUrl(id)} alt="" loading="lazy" width={160} height={160} draggable={false} />
            <span className="holo__foil" aria-hidden="true" />
          </div>
          <p className="holo__mini-foot num">
            <span>{dexNumber(id)}</span>
            <span className="holo__mini-dots" aria-hidden="true">
              {types.map((t) => <i key={t} style={{ background: TYPE_COLOR[t] }} />)}
            </span>
          </p>
        </div>
        <span className="holo__glare" aria-hidden="true" />
      </div>
    </div>
  )
}

export function CardBack({ id }: { id: number }) {
  return (
    <div className="card-back">
      <div className="card-back__face">
        <span className="card-back__ring" aria-hidden="true"><Mark size={48} /></span>
        <span className="card-back__word">Pokédex</span>
        <span className="card-back__num num">{dexNumber(id)}</span>
      </div>
    </div>
  )
}
