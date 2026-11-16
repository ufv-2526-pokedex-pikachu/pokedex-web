/** Tipos que devuelve la API (copiados de su OpenAPI en /openapi.json). */

export interface Token {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface User {
  id: number
  username: string
  email: string
  created_at: string
  is_active: boolean
}

export interface PokemonSummary {
  id: number
  name: string
  sprite: string | null
  types: string[]
}

export interface PokemonSearchResult {
  count: number
  results: PokemonSummary[]
}

export interface PokemonDetail extends PokemonSummary {
  sprites: Record<string, string | null>
  stats: Record<string, number>
  abilities: string[]
  height: number
  weight: number
}

export interface PokedexEntry {
  id: number
  pokemon_id: number
  pokemon_name: string
  pokemon_sprite: string
  /** En v1 los tipos llegan como texto separado por comas, p. ej. "fire,flying". */
  pokemon_types: string
  is_captured: boolean
  capture_date: string | null
  nickname: string | null
  notes: string | null
  favorite: boolean
  created_at: string
}

export interface PokedexEntryCreate {
  pokemon_id: number
  nickname?: string | null
  is_captured?: boolean
  capture_date?: string | null
  notes?: string | null
  favorite?: boolean
}

export type PokedexEntryUpdate = Partial<Omit<PokedexEntryCreate, 'pokemon_id'>>

export interface PokedexEntryV2 extends Omit<PokedexEntry, 'pokemon_types'> {
  pokemon_types: string[]
  evolution_chain: string[] | null
}

export interface PokedexPageV2 {
  total: number
  limit: number
  offset: number
  items: PokedexEntryV2[]
}

export interface PokedexStats {
  total_pokemon: number
  captured: number
  favorites: number
  completion_percentage: number
  most_common_type: string | null
  capture_streak_days: number
}

export interface TeamMember {
  position: number
  pokedex_entry_id: number
  pokemon_id: number
  pokemon_name: string
  pokemon_sprite: string
  nickname: string | null
}

export interface Team {
  id: number
  name: string
  description: string | null
  created_at: string
  pokemon_ids: number[]
  members: TeamMember[]
}

export interface TeamInput {
  name: string
  description?: string | null
  pokemon_ids: number[]
}

export interface PokedexQuery {
  captured?: boolean
  favorite?: boolean
  sort?: 'pokemon_id' | 'capture_date' | 'pokemon_name'
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}
