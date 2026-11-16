/**
 * Tabla de tipos (generación 6 en adelante): cuánto daño hace un ataque de un tipo
 * contra un Pokémon de uno o dos tipos. La usan el editor de equipos y las batallas.
 */

type Row = { x2: string[]; x05: string[]; x0: string[] }

/** Para cada tipo de ATAQUE: contra qué tipos es eficaz (x2), poco eficaz (x0,5) o no afecta (x0). */
const CHART: Record<string, Row> = {
  normal: { x2: [], x05: ['rock', 'steel'], x0: ['ghost'] },
  fire: { x2: ['grass', 'ice', 'bug', 'steel'], x05: ['fire', 'water', 'rock', 'dragon'], x0: [] },
  water: { x2: ['fire', 'ground', 'rock'], x05: ['water', 'grass', 'dragon'], x0: [] },
  electric: { x2: ['water', 'flying'], x05: ['electric', 'grass', 'dragon'], x0: ['ground'] },
  grass: { x2: ['water', 'ground', 'rock'], x05: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'], x0: [] },
  ice: { x2: ['grass', 'ground', 'flying', 'dragon'], x05: ['fire', 'water', 'ice', 'steel'], x0: [] },
  fighting: { x2: ['normal', 'ice', 'rock', 'dark', 'steel'], x05: ['poison', 'flying', 'psychic', 'bug', 'fairy'], x0: ['ghost'] },
  poison: { x2: ['grass', 'fairy'], x05: ['poison', 'ground', 'rock', 'ghost'], x0: ['steel'] },
  ground: { x2: ['fire', 'electric', 'poison', 'rock', 'steel'], x05: ['grass', 'bug'], x0: ['flying'] },
  flying: { x2: ['grass', 'fighting', 'bug'], x05: ['electric', 'rock', 'steel'], x0: [] },
  psychic: { x2: ['fighting', 'poison'], x05: ['psychic', 'steel'], x0: ['dark'] },
  bug: { x2: ['grass', 'psychic', 'dark'], x05: ['fire', 'fighting', 'poison', 'flying', 'ghost', 'steel', 'fairy'], x0: [] },
  rock: { x2: ['fire', 'ice', 'flying', 'bug'], x05: ['fighting', 'ground', 'steel'], x0: [] },
  ghost: { x2: ['psychic', 'ghost'], x05: ['dark'], x0: ['normal'] },
  dragon: { x2: ['dragon'], x05: ['steel'], x0: ['fairy'] },
  dark: { x2: ['psychic', 'ghost'], x05: ['fighting', 'dark', 'fairy'], x0: [] },
  steel: { x2: ['ice', 'rock', 'fairy'], x05: ['fire', 'water', 'electric', 'steel'], x0: [] },
  fairy: { x2: ['fighting', 'dragon', 'dark'], x05: ['fire', 'poison', 'steel'], x0: [] },
}

export const ALL_TYPES = Object.keys(CHART)

/** Multiplicador de un ataque de tipo `attack` contra un defensor con `defender` (1 o 2 tipos). */
export function effectiveness(attack: string, defender: string[]): number {
  const row = CHART[attack]
  if (!row) return 1
  return defender.reduce((m, t) => {
    if (row.x0.includes(t)) return 0
    if (row.x2.includes(t)) return m * 2
    if (row.x05.includes(t)) return m * 0.5
    return m
  }, 1)
}

/** Tipos de ataque que hacen daño x2 o más a un Pokémon con estos tipos, primero los x4. */
export function weaknesses(defender: string[]): string[] {
  return ALL_TYPES
    .filter((a) => effectiveness(a, defender) >= 2)
    .sort((a, b) => effectiveness(b, defender) - effectiveness(a, defender))
}

/**
 * Debilidades de un equipo: tipos de ataque contra los que la mitad o más del equipo es débil
 * y nadie lo resiste. Ordenadas de más a menos miembros afectados.
 */
export function sharedWeaknesses(team: string[][]): { type: string; count: number }[] {
  if (team.length === 0) return []
  return ALL_TYPES
    .map((a) => ({
      type: a,
      count: team.filter((t) => effectiveness(a, t) >= 2).length,
      resisted: team.some((t) => effectiveness(a, t) < 1),
    }))
    .filter((w) => w.count >= Math.max(2, Math.ceil(team.length / 2)) && !w.resisted)
    .sort((a, b) => b.count - a.count)
    .map(({ type, count }) => ({ type, count }))
}
