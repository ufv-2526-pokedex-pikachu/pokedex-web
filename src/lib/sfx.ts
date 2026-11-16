/**
 * Sonidos de la interfaz, sintetizados con la Web Audio API (no hay archivos de audio que descargar).
 * Se pueden silenciar con el botón del altavoz; la elección se guarda en el navegador.
 * Solo suenan tras una pulsación del usuario (los navegadores bloquean el audio antes).
 */
const KEY = 'pokedex.sound'
let ctx: AudioContext | null = null
let enabled = (() => { try { return localStorage.getItem(KEY) !== 'off' } catch { return true } })()

export const soundOn = () => enabled
export function setSound(on: boolean) {
  enabled = on
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* sin almacenamiento */ }
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; delay?: number; vol?: number; to?: number } = {}) {
  if (!enabled) return
  try {
    ctx ??= new AudioContext()
    const t = ctx.currentTime + (opts.delay ?? 0)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = opts.type ?? 'square'
    osc.frequency.setValueAtTime(freq, t)
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + dur)
    gain.gain.setValueAtTime(opts.vol ?? 0.06, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(gain).connect(ctx.destination)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  } catch { /* sin audio: la web funciona igual */ }
}

/** Melodía corta: notas en Hz, cada una `step` segundos. */
function jingle(notes: number[], step = 0.09, type: OscillatorType = 'square') {
  notes.forEach((n, i) => tone(n, step * 1.6, { type, delay: i * step, vol: 0.05 }))
}

export const sfx = {
  tap: () => tone(660, 0.05, { type: 'triangle', vol: 0.05 }),
  throwBall: () => tone(300, 0.35, { type: 'triangle', to: 900, vol: 0.06 }),
  shake: () => tone(180, 0.08, { type: 'square', vol: 0.05 }),
  caught: () => jingle([523, 659, 784, 1047], 0.1),
  fled: () => jingle([392, 330, 262], 0.12, 'triangle'),
  hit: (eff: number) => tone(eff >= 2 ? 140 : 110, eff >= 2 ? 0.22 : 0.14, { type: 'sawtooth', to: 50, vol: eff >= 2 ? 0.08 : 0.06 }),
  faint: () => tone(500, 0.6, { type: 'triangle', to: 80, vol: 0.06 }),
  win: () => jingle([523, 523, 659, 784, 659, 784, 1047], 0.11),
  lose: () => jingle([392, 349, 330, 262], 0.16, 'triangle'),
}
