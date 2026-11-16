/** Datos fijos del mundo Pokémon que la web necesita para pintar (no salen de la API). */

/** Colores canónicos de cada tipo. Son identidad, como el color de una persona: van en etiquetas pálidas. */
export const TYPE_COLOR: Record<string, string> = {
  normal: '#a8a77a', fire: '#ee8130', water: '#6390f0', electric: '#f7d02c', grass: '#7ac74c',
  ice: '#96d9d6', fighting: '#c22e28', poison: '#a33ea1', ground: '#e2bf65', flying: '#a98ff3',
  psychic: '#f95587', bug: '#a6b91a', rock: '#b6a136', ghost: '#735797', dragon: '#6f35fc',
  dark: '#705746', steel: '#b7b7ce', fairy: '#d685ad',
}

export const TYPE_ES: Record<string, string> = {
  normal: 'Normal', fire: 'Fuego', water: 'Agua', electric: 'Eléctrico', grass: 'Planta',
  ice: 'Hielo', fighting: 'Lucha', poison: 'Veneno', ground: 'Tierra', flying: 'Volador',
  psychic: 'Psíquico', bug: 'Bicho', rock: 'Roca', ghost: 'Fantasma', dragon: 'Dragón',
  dark: 'Siniestro', steel: 'Acero', fairy: 'Hada',
}

/** Primera generación: la Pokédex de Kanto. */
export const KANTO_TOTAL = 151

/** Sprite oficial por número (repositorio público de PokeAPI). Sirve para pintar sin gastar peticiones a la API. */
export function spriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
}

export function artworkUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`
}

/** "#025" */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(3, '0')}`
}

/** "mr-mime" → "Mr Mime" */
export function displayName(name: string): string {
  return name.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/** En la v1 los tipos llegan como "fire,flying". */
export function splitTypes(types: string): string[] {
  return types.split(',').map((t) => t.trim()).filter(Boolean)
}
