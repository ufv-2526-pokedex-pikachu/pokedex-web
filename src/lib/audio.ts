/**
 * Onda del grito: resume las muestras de audio en `bars` barras.
 * Cada barra es la energía media del tramo (RMS, raíz de la media de los cuadrados), no el pico:
 * los gritos suenan fuerte casi todo el rato y con el pico todas las barras salían al máximo.
 * Se normaliza de 0 a 1 para que el grito más flojo también se vea entero.
 */
export function envelope(samples: Float32Array, bars: number): number[] {
  if (bars <= 0 || samples.length === 0) return []
  const size = samples.length / bars
  const out: number[] = []
  for (let b = 0; b < bars; b++) {
    const from = Math.floor(b * size)
    const to = Math.max(from + 1, Math.min(samples.length, Math.floor((b + 1) * size)))
    let sum = 0
    for (let i = from; i < to; i++) sum += (samples[i] ?? 0) ** 2
    out.push(Math.sqrt(sum / (to - from)))
  }
  const top = Math.max(...out)
  return top === 0 ? out : out.map((v) => v / top)
}
