import { describe, expect, it } from 'vitest'
import { catchChance, difficulty, ringAt, ringPeriod, shakes, throwQuality } from './capture'

describe('captura', () => {
  it('un Pokémon débil es más fácil que un legendario', () => {
    expect(catchChance(195, 1)).toBeGreaterThan(catchChance(680, 1))
    expect(difficulty(195)).toBe(0)
    expect(difficulty(680)).toBe(1)
  })

  it('cerrar el anillo sube la probabilidad', () => {
    expect(catchChance(320, 0.3)).toBeGreaterThan(catchChance(320, 1))
  })

  it('la probabilidad se queda entre 0,05 y 0,97', () => {
    for (const total of [100, 195, 320, 500, 680, 780]) {
      for (const ring of [0, 0.3, 0.6, 1, 2]) {
        const c = catchChance(total, ring)
        expect(c).toBeGreaterThanOrEqual(0.05)
        expect(c).toBeLessThanOrEqual(0.97)
      }
    }
  })

  it('3 sacudidas si la tirada entra; menos cuanto más lejos', () => {
    expect(shakes(0.5, 0.49)).toBe(3)
    expect(shakes(0.5, 0.55)).toBe(2)
    expect(shakes(0.5, 0.75)).toBe(1)
    expect(shakes(0.5, 0.99)).toBe(0)
  })

  it('el anillo va de 1 a 0,3 y vuelve', () => {
    expect(ringAt(0, 1000)).toBeCloseTo(1)
    expect(ringAt(500, 1000)).toBeCloseTo(0.3)
    expect(ringAt(1000, 1000)).toBeCloseTo(1)
  })

  it('calidad del lanzamiento y ritmo del anillo', () => {
    expect(throwQuality(0.35)).toBe('excelente')
    expect(throwQuality(0.6)).toBe('bien')
    expect(throwQuality(0.9)).toBe('normal')
    expect(ringPeriod(680)).toBeLessThan(ringPeriod(195))
  })
})
