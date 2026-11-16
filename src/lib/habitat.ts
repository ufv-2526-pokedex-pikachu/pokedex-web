/**
 * Dónde aparece cada Pokémon: su escenario se elige por su primer tipo (y, si el primero es
 * Normal, por el segundo: Pidgey es Normal/Volador y vive en el cielo, no en la hierba).
 */
export type Habitat = 'pradera' | 'agua' | 'cueva' | 'volcan' | 'cielo' | 'noche' | 'nieve'

const BY_TYPE: Record<string, Habitat> = {
  grass: 'pradera', bug: 'pradera', normal: 'pradera', poison: 'pradera', fairy: 'pradera',
  water: 'agua',
  rock: 'cueva', ground: 'cueva', fighting: 'cueva', steel: 'cueva',
  fire: 'volcan', dragon: 'volcan',
  flying: 'cielo', electric: 'cielo',
  ghost: 'noche', psychic: 'noche', dark: 'noche',
  ice: 'nieve',
}

export const HABITAT_ES: Record<Habitat, string> = {
  pradera: 'Hierba alta', agua: 'Orilla', cueva: 'Cueva', volcan: 'Volcán', cielo: 'Cielo abierto', noche: 'Bosque de noche', nieve: 'Nieve',
}

export function habitatFor(types: string[]): Habitat {
  const [first, second] = types
  if (first === 'normal' && second) return BY_TYPE[second] ?? 'pradera'
  return BY_TYPE[first] ?? 'pradera'
}
