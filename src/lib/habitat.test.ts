import { describe, expect, it } from 'vitest'
import { habitatFor } from './habitat'

describe('hábitat', () => {
  it('se elige por el primer tipo', () => {
    expect(habitatFor(['water'])).toBe('agua')
    expect(habitatFor(['fire', 'flying'])).toBe('volcan') // Charizard
    expect(habitatFor(['ghost', 'poison'])).toBe('noche') // Gengar
    expect(habitatFor(['rock', 'ground'])).toBe('cueva') // Geodude
  })

  it('si el primero es Normal, manda el segundo', () => {
    expect(habitatFor(['normal', 'flying'])).toBe('cielo') // Pidgey
    expect(habitatFor(['normal'])).toBe('pradera') // Rattata
  })

  it('un tipo desconocido cae en la pradera', () => {
    expect(habitatFor(['stellar'])).toBe('pradera')
    expect(habitatFor([])).toBe('pradera')
  })
})
