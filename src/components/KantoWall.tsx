/**
 * El muro de Kanto: los 151 Pokémon de la primera generación en una cuadrícula.
 * Capturado = sprite a color; en tu Pokédex pero sin capturar = silueta; el resto = su número.
 * Es la pieza que identifica la app: de un vistazo se ve cuánto te falta.
 */
import { memo } from 'react'
import type { CSSProperties } from 'react'
import { KANTO_TOTAL, dexNumber, spriteUrl } from '../lib/pokemon'
import './KantoWall.css'

export type DexState = 'captured' | 'seen'

interface Props {
  /** Estado de cada número de la Pokédex. Los que no están, se pintan como pendientes. */
  states: Map<number, DexState>
  /** Color del tipo de cada Pokémon que tienes: tiñe su casilla. */
  colors?: Map<number, string>
  /** En la pantalla de acceso todos se ven en gris, como invitación. */
  preview?: boolean
  onSelect?: (id: number) => void
}

const IDS = Array.from({ length: KANTO_TOTAL }, (_, i) => i + 1)

export const KantoWall = memo(function KantoWall({ states, colors, preview = false, onSelect }: Props) {
  return (
    <ol className={`kanto ${preview ? 'kanto--preview' : ''}`} aria-label="Pokédex de Kanto, 151 Pokémon">
      {IDS.map((id) => {
        const state = states.get(id)
        const label = `${dexNumber(id)} ${state === 'captured' ? 'capturado' : state === 'seen' ? 'visto' : 'pendiente'}`
        const inner = state || preview
          ? <img src={spriteUrl(id)} alt="" loading="lazy" width={96} height={96} />
          : <span className="kanto__n num">{id}</span>
        return (
          <li key={id} className={`kanto__cell ${state ? `is-${state}` : ''}`} style={state === 'captured' && colors?.get(id) ? { '--t': colors.get(id) } as CSSProperties : undefined}>
            {onSelect ? (
              <button type="button" className="kanto__btn" onClick={() => onSelect(id)} aria-label={label}>
                {inner}
              </button>
            ) : (
              <span className="kanto__btn" aria-label={preview ? undefined : label}>{inner}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
})
