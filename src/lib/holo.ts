/**
 * Cuentas de la carta holográfica: dónde está la luz y cuánto se inclina la carta.
 * Funciones puras para poder probarlas sin navegador.
 */

export const MAX_TILT = 14 // grados

export interface Holo {
  /** Giro alrededor del eje X y del eje Y, en grados. */
  rx: number
  ry: number
  /** Posición de la luz sobre la carta, de 0 a 100 (%). */
  px: number
  py: number
  /** Distancia del centro: 0 en el centro, 1 en una esquina. Más lejos, más brillo. */
  hyp: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Desde la posición del puntero dentro de la carta (en px) hasta la inclinación y la luz. */
export function fromPointer(x: number, y: number, width: number, height: number): Holo {
  const px = clamp((x / width) * 100, 0, 100)
  const py = clamp((y / height) * 100, 0, 100)
  const dx = px / 50 - 1 // -1 izquierda … 1 derecha
  const dy = py / 50 - 1 // -1 arriba … 1 abajo
  return {
    // La carta se inclina hacia el puntero: arriba ⇒ el borde superior se aleja.
    rx: 0 - dy * MAX_TILT, // «0 -» en vez de «-dy»: en el centro da 0 y no -0
    ry: dx * MAX_TILT,
    px, py,
    hyp: clamp(Math.hypot(dx, dy) / Math.SQRT2, 0, 1),
  }
}

/**
 * Desde el giroscopio del móvil (DeviceOrientationEvent): beta = adelante/atrás, gamma = izquierda/derecha.
 * Se toma como reposo el móvil inclinado unos 45° hacia ti, que es como se sujeta al mirar la pantalla.
 */
export function fromOrientation(beta: number, gamma: number): Holo {
  const dx = clamp(gamma / 30, -1, 1)
  const dy = clamp((beta - 45) / 30, -1, 1)
  return fromPointer(((dx + 1) / 2) * 100, ((dy + 1) / 2) * 100, 100, 100)
}

/** Reposo: plana, con la luz en el centro y sin brillo. */
export const REST: Holo = { rx: 0, ry: 0, px: 50, py: 50, hyp: 0 }
