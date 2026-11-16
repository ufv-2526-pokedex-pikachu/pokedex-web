import { describe, expect, it } from 'vitest'
import { TOUR, tour } from './tour'

describe('modo presentación', () => {
  it('empieza en el primer paso, avanza, no baja de 0 y termina al pasar del último', () => {
    const seen: (number | null)[] = []
    const off = tour.subscribe(() => seen.push(tour.get()))
    tour.start()
    expect(tour.get()).toBe(0)
    tour.go(-1)
    expect(tour.get()).toBe(0)
    for (let i = 1; i < TOUR.length; i++) tour.go(1)
    expect(tour.get()).toBe(TOUR.length - 1)
    tour.go(1)
    expect(tour.get()).toBeNull()
    off()
    expect(seen[0]).toBe(0)
    expect(seen.at(-1)).toBeNull()
  })

  it('cada paso tiene pantalla, título y explicación', () => {
    for (const s of TOUR) {
      expect(s.path.startsWith('/')).toBe(true)
      expect(s.title.length).toBeGreaterThan(2)
      expect(s.text.length).toBeGreaterThan(40)
    }
  })
})
