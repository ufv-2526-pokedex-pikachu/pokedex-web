/** Los seis huecos de un equipo, con el sprite de cada miembro o un hueco vacío. */
import { MAX_TEAM } from '../lib/teams'
import { displayName } from '../lib/pokemon'

interface Member { pokemon_id: number; pokemon_name: string; pokemon_sprite: string; nickname: string | null }

export function TeamSlots({ members, size = 64 }: { members: Member[]; size?: number }) {
  return (
    <ol className="slots" aria-label={`${members.length} de ${MAX_TEAM} Pokémon`}>
      {Array.from({ length: MAX_TEAM }, (_, i) => {
        const m = members[i]
        return (
          <li key={i} className={`slot ${m ? '' : 'slot--empty'}`} style={{ width: size, height: size }}>
            {m && <img src={m.pokemon_sprite} alt={m.nickname ?? displayName(m.pokemon_name)} title={m.nickname ?? displayName(m.pokemon_name)} />}
          </li>
        )
      })}
    </ol>
  )
}
