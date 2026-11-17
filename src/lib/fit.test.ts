import { describe, expect, it } from 'vitest'
import { anchors, paintAccessory } from './fit'
import type { Img } from './fit'

/** Un «Pokémon» de prueba de 40×40: dos orejas finas, una cabeza ancha y un cuerpo. */
function creature(): Img {
  const w = 40, h = 40, data = new Uint8ClampedArray(w * h * 4)
  const fill = (x0: number, x1: number, y0: number, y1: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = (y * w + x) * 4; data.set([250, 220, 60, 255], i) }
  }
  fill(12, 13, 4, 9); fill(26, 27, 4, 9) // orejas
  fill(10, 29, 10, 19) // cabeza
  fill(14, 25, 20, 35) // cuerpo
  return { width: w, height: h, data }
}
const alpha = (img: Img, x: number, y: number) => img.data[(y * img.width + x) * 4 + 3]
const color = (img: Img, x: number, y: number) => Array.from(img.data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 4))

describe('accesorios que se amoldan', () => {
  it('encuentra la figura y distingue las orejas de la cabeza', () => {
    const a = anchors(creature())!
    expect([a.top, a.bottom, a.left, a.right]).toEqual([4, 35, 10, 29])
    expect(a.headStart).toBe(10) // la primera fila «llena», no la punta de las orejas
    expect([a.headLeft, a.headRight]).toEqual([10, 29])
    expect(a.brimY).toBeGreaterThan(a.headStart)
    expect(a.neckY).toBeGreaterThan(a.eyeY)
  })

  it('con ojos, la cabeza se coloca a partir de ellos', () => {
    const img = creature()
    for (const x of [16, 17, 22, 23]) img.data.set([20, 20, 20, 255], (14 * 40 + x) * 4) // dos ojos oscuros
    const a = anchors(img)!
    expect(a.eyeY).toBe(15)
    expect(a.eyeX).toBe(20)
    expect(a.headStart).toBe(10) // la coronilla, encima de los ojos
    expect(a.brimY).toBeLessThan(a.eyeY - 1) // la visera no tapa los ojos
    expect(a.neckY).toBeGreaterThan(a.eyeY)
  })

  it('un fotograma vacío no tiene puntos de referencia', () => {
    expect(anchors({ width: 4, height: 4, data: new Uint8ClampedArray(64) })).toBeNull()
  })

  it('la gorra tapa las orejas y pinta encima de la cabeza con contorno de tinta', () => {
    const img = creature()
    const a = anchors(img)!
    paintAccessory(img, 'gorra', a)
    // Donde estaba la punta de una oreja, fuera de la cúpula, ya no queda oreja.
    expect(alpha(img, 12, 4)).toBe(0)
    // Justo encima de la visera, en el centro, hay gorra (roja o blanca, opaca).
    expect(alpha(img, 20, a.brimY - 1)).toBe(255)
    // El borde de la gorra (lado de atrás) es contorno de tinta y la visera sale hacia delante (izquierda).
    expect(color(img, a.headRight + 1, a.brimY + 1)).toEqual([27, 36, 64, 255])
    expect(alpha(img, a.headLeft - 2, a.brimY + 1)).toBe(255)
  })

  it('la bufanda solo colorea píxeles que ya eran del Pokémon', () => {
    const img = creature()
    const a = anchors(img)!
    paintAccessory(img, 'bufanda', a)
    expect(alpha(img, 2, a.neckY)).toBe(0) // fuera de la figura sigue transparente
    const c = color(img, 20, a.neckY + 1)
    expect(c).not.toEqual([250, 220, 60, 255]) // dentro ya no es el amarillo del cuerpo
  })

  it('ningún accesorio se sale de la imagen ni rompe con figuras pegadas al borde', () => {
    for (const id of ['gorra', 'corona', 'gafas', 'lazo', 'bufanda', 'medalla'] as const) {
      const img = creature()
      // Movemos la figura al borde: anclas en x=0.
      const a = { ...anchors(img)!, headLeft: 0, left: 0 }
      expect(() => paintAccessory(img, id, a)).not.toThrow()
      expect(img.data.length).toBe(40 * 40 * 4)
    }
  })
})
