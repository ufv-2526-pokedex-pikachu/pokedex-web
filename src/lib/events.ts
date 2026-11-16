/**
 * Avisos entre pantallas: «has capturado», «se ha escapado», «has ganado»…
 * Quien juega los lanza (emit) y quien reacciona los escucha (onGameEvent): el compañero, el confeti, los sonidos.
 * Usa un EventTarget propio, no `window`, para poder probarlo sin navegador.
 */
export type GameEvent = 'capture' | 'flee' | 'win' | 'lose' | 'achievement'

const bus = new EventTarget()

export function emit(event: GameEvent) {
  bus.dispatchEvent(new CustomEvent<GameEvent>('game', { detail: event }))
}

/** Escucha los avisos; devuelve la función para dejar de escuchar. */
export function onGameEvent(fn: (event: GameEvent) => void): () => void {
  const handler = (e: Event) => fn((e as CustomEvent<GameEvent>).detail)
  bus.addEventListener('game', handler)
  return () => bus.removeEventListener('game', handler)
}

/** Lo que dice el compañero ante cada aviso. */
export const REACTION: Record<GameEvent, string> = {
  capture: '¡Bien hecho! Uno más para la Pokédex.',
  flee: '¡Casi! A la próxima lo pillamos.',
  win: '¡Hemos ganado el combate!',
  lose: 'Uf… La próxima vez entrenamos más.',
  achievement: '¡Medalla nueva! Mírala en Logros.',
}
