/** Reglas del compañero: a quién se elige y qué te dice. Funciones puras para poder probarlas. */
import type { PokedexEntry } from '../api/types'
import type { Phase } from './daytime'

const KEY = (user: string) => `pokedex.partner.${user}`

export function savedPartner(user: string): number | null {
  try { return Number(localStorage.getItem(KEY(user))) || null } catch { return null }
}

export function savePartner(user: string, id: number) {
  try { localStorage.setItem(KEY(user), String(id)) } catch { /* sin almacenamiento: dura lo que la pestaña */ }
}

/** El elegido; si no, el primer favorito capturado; si no, el primero que capturaste. */
export function pickPartner(entries: PokedexEntry[], saved: number | null): PokedexEntry | null {
  const captured = entries.filter((e) => e.is_captured)
  return captured.find((e) => e.pokemon_id === saved)
    ?? captured.find((e) => e.favorite)
    ?? [...captured].sort((a, b) => (a.capture_date ?? '').localeCompare(b.capture_date ?? ''))[0]
    ?? null
}

/** Lo que dice el compañero en el inicio, según la hora y cómo va tu colección. */
export function partnerLine(o: { phase: Phase; captured: number; missing: number; streak: number; hasPartner: boolean }): string {
  if (!o.hasPartner) return '¡Hola! Aún no tienes ningún Pokémon. ¿Salimos a capturar el primero?'
  if (o.missing === 0) return '¡Lo hemos conseguido! Los 151 de Kanto son tuyos.'
  if (o.streak >= 2) return `¡Llevamos ${o.streak} días seguidos capturando! No rompamos la racha.`
  if (o.phase === 'noche') return 'Es tarde… ¿un último Pokémon antes de dormir?'
  if (o.phase === 'amanecer') return '¡Buenos días! Por la mañana salen muchos Pokémon a la hierba alta.'
  if (o.missing <= 10) return `¡Solo nos faltan ${o.missing}! Ya casi tenemos Kanto entero.`
  return `Llevamos ${o.captured}. ¡Vamos a por el siguiente!`
}
