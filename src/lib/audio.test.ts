import { describe, expect, it } from 'vitest'
import { envelope } from './audio'

describe('onda del grito', () => {
  it('cada barra es la energía media del tramo, normalizada a 1', () => {
    // Tramos: [0.1, -0.5] → 0,3606 · [0.2, 0.25] → 0,2264 · [-0.05, 0.1] → 0,0791
    const s = new Float32Array([0.1, -0.5, 0.2, 0.25, -0.05, 0.1])
    const e = envelope(s, 3)
    expect(e[0]).toBe(1)
    expect(e[1]).toBeCloseTo(0.628, 3)
    expect(e[2]).toBeCloseTo(0.219, 3)
  })

  it('un tramo fuerte todo el rato y otro con un solo golpe ya no salen iguales', () => {
    const constante = new Float32Array(100).fill(0.8)
    const golpe = new Float32Array(100); golpe[0] = 0.8
    const e = envelope(new Float32Array([...constante, ...golpe]), 2)
    expect(e[0]).toBe(1)
    expect(e[1]).toBeLessThan(0.2)
  })

  it('silencio da todo ceros y entradas vacías dan lista vacía', () => {
    expect(envelope(new Float32Array(10), 5)).toEqual([0, 0, 0, 0, 0])
    expect(envelope(new Float32Array(0), 5)).toEqual([])
    expect(envelope(new Float32Array(4), 0)).toEqual([])
  })

  it('siempre devuelve tantas barras como se piden, aunque haya pocas muestras', () => {
    expect(envelope(new Float32Array([1, 0.5]), 4)).toHaveLength(4)
  })
})
