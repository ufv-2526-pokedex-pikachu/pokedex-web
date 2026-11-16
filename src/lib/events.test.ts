import { describe, expect, it } from 'vitest'
import { REACTION, emit, onGameEvent } from './events'

describe('avisos entre pantallas', () => {
  it('quien escucha recibe cada aviso, y deja de recibirlos al darse de baja', () => {
    const got: string[] = []
    const off = onGameEvent((e) => got.push(e))
    emit('capture')
    emit('win')
    off()
    emit('lose')
    expect(got).toEqual(['capture', 'win'])
  })

  it('hay una frase del compañero para cada aviso', () => {
    for (const e of ['capture', 'flee', 'win', 'lose', 'achievement'] as const) expect(REACTION[e].length).toBeGreaterThan(5)
  })
})
