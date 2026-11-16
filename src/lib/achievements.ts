/**
 * Logros: medallas que se ganan jugando. Se calculan con los datos reales de la API
 * (tu Pokédex, tus equipos y tus estadísticas) más el récord de batallas del navegador.
 * No se guardan en ningún sitio: si cumples la condición, el logro es tuyo.
 */
import type { PokedexEntry, PokedexStats, Team } from '../api/types'
import type { BattleRecord } from './record'
import { splitTypes } from './pokemon'

export interface Achievement {
  id: string
  title: string
  description: string
  /** Color de la medalla. */
  color: string
  /** Valor actual y objetivo, para la barra de progreso. */
  current: number
  target: number
  unlocked: boolean
}

export interface AchievementInput {
  entries: PokedexEntry[]
  teams: Team[]
  stats: PokedexStats | null
  record: BattleRecord
}

const LEGENDARY = [144, 145, 146, 150, 151]
const STARTERS = [1, 4, 7]

type Rule = Omit<Achievement, 'current' | 'unlocked'> & { value: (d: Derived) => number }

interface Derived {
  captured: PokedexEntry[]
  kanto: number
  types: number
  favorites: number
  nicknames: number
  fullTeam: number
  streak: number
  legendary: number
  starters: number
  wins: number
}

const RULES: Rule[] = [
  { id: 'primera-captura', title: 'Primer Pokémon', description: 'Captura tu primer Pokémon.', color: '#e8403a', target: 1, value: (d) => d.captured.length },
  { id: 'diez-capturas', title: 'Coleccionista', description: 'Captura 10 Pokémon.', color: '#3f8cff', target: 10, value: (d) => d.captured.length },
  { id: 'veinticinco', title: 'Entrenador experto', description: 'Captura 25 Pokémon.', color: '#7a5cff', target: 25, value: (d) => d.captured.length },
  { id: 'media-kanto', title: 'Media Kanto', description: 'Captura 76 Pokémon de Kanto, la mitad.', color: '#2fbf71', target: 76, value: (d) => d.kanto },
  { id: 'arcoiris', title: 'Arcoíris', description: 'Ten capturados Pokémon de 10 tipos distintos.', color: '#ff8a2b', target: 10, value: (d) => d.types },
  { id: 'iniciales', title: 'Profesor de Kanto', description: 'Captura a Bulbasaur, Charmander y Squirtle.', color: '#4caf50', target: 3, value: (d) => d.starters },
  { id: 'leyenda', title: 'Leyenda', description: 'Captura un Pokémon legendario de Kanto.', color: '#c9a400', target: 1, value: (d) => d.legendary },
  { id: 'favorito', title: 'Mi favorito', description: 'Marca un Pokémon como favorito.', color: '#ff5fa2', target: 1, value: (d) => d.favorites },
  { id: 'bautizo', title: 'Bautizo', description: 'Ponle un apodo a uno de tus Pokémon.', color: '#00a6a6', target: 1, value: (d) => d.nicknames },
  { id: 'equipo-completo', title: 'Equipo completo', description: 'Monta un equipo con 6 Pokémon.', color: '#1b2440', target: 6, value: (d) => d.fullTeam },
  { id: 'racha', title: 'Racha de tres', description: 'Captura Pokémon tres días seguidos.', color: '#ff7a1a', target: 3, value: (d) => d.streak },
  { id: 'primera-victoria', title: 'Primera victoria', description: 'Gana tu primer combate.', color: '#e8403a', target: 1, value: (d) => d.wins },
  { id: 'campeon', title: 'Campeón', description: 'Gana 5 combates.', color: '#ffcb05', target: 5, value: (d) => d.wins },
]

export function computeAchievements({ entries, teams, stats, record }: AchievementInput): Achievement[] {
  const captured = entries.filter((e) => e.is_captured)
  const ids = new Set(captured.map((e) => e.pokemon_id))
  const d: Derived = {
    captured,
    kanto: captured.filter((e) => e.pokemon_id <= 151).length,
    types: new Set(captured.flatMap((e) => splitTypes(e.pokemon_types))).size,
    favorites: entries.filter((e) => e.favorite).length,
    nicknames: entries.filter((e) => e.nickname).length,
    fullTeam: Math.max(0, ...teams.map((t) => t.members.length)),
    streak: stats?.capture_streak_days ?? 0,
    legendary: LEGENDARY.filter((id) => ids.has(id)).length,
    starters: STARTERS.filter((id) => ids.has(id)).length,
    wins: record.won,
  }
  return RULES.map(({ value, ...rule }) => {
    const current = Math.min(rule.target, value(d))
    return { ...rule, current, unlocked: current >= rule.target }
  })
}

/* ---------- Avisos de logros nuevos ---------- */

const seenKey = (user: string) => `pokedex.logros.${user}`

/** Los logros que ya se le enseñaron al usuario (para avisar solo de los nuevos). */
export function seenAchievements(user: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(seenKey(user))
    return raw === null ? null : new Set(JSON.parse(raw) as string[])
  } catch { return new Set() }
}

export function markSeen(user: string, ids: string[]) {
  try { localStorage.setItem(seenKey(user), JSON.stringify(ids)) } catch { /* sin almacenamiento */ }
}

/**
 * Logros desbloqueados que aún no se habían visto. La primera vez (sin nada guardado) no avisa de nada:
 * si no, quien ya tenía muchos logros recibiría todos los avisos de golpe.
 */
export function newlyUnlocked(all: Achievement[], seen: Set<string> | null): Achievement[] {
  if (seen === null) return []
  return all.filter((a) => a.unlocked && !seen.has(a.id))
}
