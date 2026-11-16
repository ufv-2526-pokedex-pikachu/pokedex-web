/**
 * Tu compañero: un Pokémon de tu Pokédex que vive en el inicio y te habla.
 * Quién es y qué dice lo deciden las reglas de src/lib/partner.ts; sin ninguno capturado, Pikachu te espera.
 */
import type { PokedexEntry } from '../api/types'
import { displayName } from '../lib/pokemon'
import { Sprite } from './Sprite'
import './Partner.css'

export function Partner({ entry, line }: { entry: PokedexEntry | null; line: string }) {
  const id = entry?.pokemon_id ?? 25
  const name = entry ? entry.nickname ?? displayName(entry.pokemon_name) : 'Pikachu'
  return (
    <figure className="partner" aria-label={`Tu compañero, ${name}`}>
      <p className="partner__bubble">{line}</p>
      <div className="partner__stage">
        <span className="partner__grass" aria-hidden="true" />
        <Sprite id={id} alt={name} className="partner__sprite" />
      </div>
      <figcaption className="partner__name">{entry ? `Tu compañero · ${name}` : 'Te espera un compañero'}</figcaption>
    </figure>
  )
}
