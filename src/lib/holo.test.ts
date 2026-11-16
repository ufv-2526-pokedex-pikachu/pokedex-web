import { describe, expect, it } from 'vitest'
import { MAX_TILT, REST, fromOrientation, fromPointer } from './holo'

describe('carta holográfica', () => {
  it('en el centro no se inclina ni brilla', () => {
    expect(fromPointer(150, 210, 300, 420)).toEqual(REST)
  })

  it('en una esquina se inclina al máximo y brilla del todo', () => {
    const h = fromPointer(300, 0, 300, 420) // arriba a la derecha
    expect(h.rx).toBeCloseTo(MAX_TILT)
    expect(h.ry).toBeCloseTo(MAX_TILT)
    expect(h.px).toBe(100)
    expect(h.py).toBe(0)
    expect(h.hyp).toBeCloseTo(1)
  })

  it('fuera de la carta se queda en el borde', () => {
    const h = fromPointer(-50, 999, 300, 420)
    expect(h.px).toBe(0)
    expect(h.py).toBe(100)
    expect(Math.abs(h.rx)).toBeLessThanOrEqual(MAX_TILT)
  })

  it('con el móvil en la postura normal la carta está en reposo', () => {
    const h = fromOrientation(45, 0)
    expect(h.rx).toBeCloseTo(0)
    expect(h.ry).toBeCloseTo(0)
    expect(fromOrientation(45, 30).ry).toBeCloseTo(MAX_TILT)
  })
})
