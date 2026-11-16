/** Utilidades sobre la Pokédex del usuario que usan varias pantallas. */
import { api } from '../api/client'
import type { PokedexEntry, PokedexEntryV2, PokemonDetail } from '../api/types'

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
 * Se guarda en memoria durante la visita para no pedir dos veces el mismo (por número o por nombre).
 */
const detailCache = new Map<string, Promise<PokemonDetail>>()

export function pokemonDetail(idOrName: number | string): Promise<PokemonDetail> {
  const key = String(idOrName).toLowerCase()
  let p = detailCache.get(key)
  if (!p) {
    p = api.pokemon(key)
    p.then((d) => { detailCache.set(String(d.id), p!); detailCache.set(d.name, p!) }).catch(() => detailCache.delete(key))
    detailCache.set(key, p)
  }
  return p
}

/*
 * Cadena evolutiva: solo la da la v2 de la API (GET /api/v2/pokedex), y solo de los Pokémon de tu Pokédex.
 * La v2 cuenta para el límite de 30 por minuto, así que la lista se guarda durante la visita y solo se
 * vuelve a pedir si buscas uno que aún no estaba (por ejemplo, porque lo acabas de añadir).
 */
let v2Cache: Promise<PokedexEntryV2[]> | null = null

async function allEntriesV2(): Promise<PokedexEntryV2[]> {
  const out: PokedexEntryV2[] = []
  for (let offset = 0; ; offset += 100) {
    const page = await api.pokedexV2({ limit: 100, offset })
    out.push(...page.items)
    if (out.length >= page.total || page.items.length === 0) return out
  }
}

/** null = no está en tu Pokédex (la API no da su evolución); [] = no evoluciona. */
export async function evolutionChain(pokemonId: number): Promise<string[] | null> {
  v2Cache ??= allEntriesV2()
  let list = await v2Cache.catch((e) => { v2Cache = null; throw e })
  if (!list.some((e) => e.pokemon_id === pokemonId)) {
    v2Cache = allEntriesV2()
    list = await v2Cache
  }
  const entry = list.find((e) => e.pokemon_id === pokemonId)
  return entry ? entry.evolution_chain ?? [] : null
}
