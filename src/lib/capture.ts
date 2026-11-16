/**
 * Reglas del minijuego de captura. Son funciones puras (sin React ni red) para poder probarlas.
 *
 * - Cuanto más fuerte es el Pokémon (suma de sus stats base), más difícil.
 * - Cuanto más cerrado está el anillo al lanzar, más fácil.
 * - La Poké Ball se sacude de 0 a 3 veces: 3 sacudidas = capturado.
 */

/** Tamaño mínimo y máximo del anillo, en proporción al tamaño del Pokémon. */
export const RING_MIN = 0.3
export const RING_MAX = 1

/** Lanzamientos por encuentro antes de que el Pokémon huya. */
export const BALLS_PER_ENCOUNTER = 3

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** De 0 (muy fácil, p. ej. Caterpie con 195) a 1 (legendario, 680 o más). */
export function difficulty(statTotal: number): number {
  return clamp((statTotal - 200) / 480, 0, 1)
}

/** Probabilidad de captura entre 0,05 y 0,97. */
export function catchChance(statTotal: number, ringScale: number): number {
  const base = 0.75 - 0.45 * difficulty(statTotal)
  // Anillo en el mínimo → +0,35; abierto del todo → +0.
  const ringBonus = ((RING_MAX - clamp(ringScale, RING_MIN, RING_MAX)) / (RING_MAX - RING_MIN)) * 0.35
  const legendary = statTotal >= 580 ? 0.55 : 1
  return clamp((base + ringBonus) * legendary, 0.05, 0.97)
}

/** Etiqueta del lanzamiento según lo cerrado que estaba el anillo. */
export function throwQuality(ringScale: number): 'excelente' | 'bien' | 'normal' {
  if (ringScale <= 0.45) return 'excelente'
  if (ringScale <= 0.7) return 'bien'
  return 'normal'
}

/**
 * Cuántas veces se sacude la Poké Ball. `roll` es un número aleatorio entre 0 y 1.
 * Por debajo de la probabilidad, 3 (capturado). Por encima, 0, 1 o 2: cuanto más cerca, más sacudidas.
 */
export function shakes(chance: number, roll: number): 0 | 1 | 2 | 3 {
  if (roll < chance) return 3
  const miss = (roll - chance) / (1 - chance) // 0 = casi, 1 = lejísimos
  if (miss < 0.33) return 2
  if (miss < 0.66) return 1
  return 0
}

/** Escala del anillo en el instante t (ms): baja de 1 a 0,3 y vuelve, en un ciclo de `period` ms. */
export function ringAt(t: number, period: number): number {
  const phase = (t % period) / period // 0..1
  const tri = phase < 0.5 ? phase * 2 : 2 - phase * 2 // 0→1→0
  return RING_MAX - (RING_MAX - RING_MIN) * tri
}

/** Ciclo del anillo: los Pokémon difíciles lo cierran más rápido. */
export function ringPeriod(statTotal: number): number {
  return Math.round(1900 - 700 * difficulty(statTotal))
}
