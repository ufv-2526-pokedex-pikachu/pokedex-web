/** Utilidades sobre la Pokédex del usuario que usan varias pantallas. */
import { api } from '../api/client'
import type { PokedexEntry, PokemonDetail } from '../api/types'

/** La API pagina de 100 en 100: pide páginas hasta tenerlas todas. */
export async function allEntries(): Promise<PokedexEntry[]> {
  const out: PokedexEntry[] = []
  for (let offset = 0; ; offset += 100) {
    const page = await api.pokedex({ limit: 100, offset })
    out.push(...page)
    if (page.length < 100) return out
  }
}

/*
 * El detalle de un Pokémon no cambia nunca, y /pokemon/{id} cuenta para el límite de 30 por minuto.
 * Se guarda en memoria durante la visita para no pedir dos veces el mismo.
 */
const detailCache = new Map<number, Promise<PokemonDetail>>()

export function pokemonDetail(id: number): Promise<PokemonDetail> {
  let p = detailCache.get(id)
  if (!p) {
    p = api.pokemon(id)
    p.catch(() => detailCache.delete(id))
    detailCache.set(id, p)
  }
  return p
}
