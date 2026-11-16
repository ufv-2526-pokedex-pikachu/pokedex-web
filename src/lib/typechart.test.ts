import { describe, expect, it } from 'vitest'
import { effectiveness, sharedWeaknesses, weaknesses } from './typechart'

describe('tabla de tipos', () => {
  it('multiplica los dos tipos del defensor', () => {
    expect(effectiveness('electric', ['water'])).toBe(2)
    expect(effectiveness('electric', ['water', 'flying'])).toBe(4) // Gyarados
    expect(effectiveness('fire', ['grass', 'poison'])).toBe(2) // Bulbasaur
    expect(effectiveness('grass', ['fire', 'flying'])).toBe(0.25) // Charizard
  })

  it('las inmunidades dan 0', () => {
    expect(effectiveness('electric', ['ground'])).toBe(0)
    expect(effectiveness('normal', ['ghost', 'poison'])).toBe(0)
    expect(effectiveness('ground', ['fire', 'flying'])).toBe(0)
  })

  it('debilidades de Charizard', () => {
    expect(weaknesses(['fire', 'flying']).sort()).toEqual(['electric', 'rock', 'water'])
    expect(weaknesses(['fire', 'flying'])[0]).toBe('rock') // ×4 va primero
  })

  it('debilidad compartida solo si la mitad es débil y nadie la resiste', () => {
    const fuego = [['fire'], ['fire'], ['fire', 'flying']]
    expect(sharedWeaknesses(fuego).map((w) => w.type)).toContain('water')
    // Con un Pokémon de Planta, el Agua ya está resistida.
    expect(sharedWeaknesses([...fuego, ['grass']]).map((w) => w.type)).not.toContain('water')
    expect(sharedWeaknesses([])).toEqual([])
  })
})
