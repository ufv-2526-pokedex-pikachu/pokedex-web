import { describe, expect, it } from 'vitest'
import { greetingAt, phaseAt } from './daytime'

describe('momento del día', () => {
  it('reparte las 24 horas en cuatro momentos', () => {
    expect(phaseAt(7)).toBe('amanecer')
    expect(phaseAt(12)).toBe('dia')
    expect(phaseAt(19)).toBe('atardecer')
    expect(phaseAt(23)).toBe('noche')
    expect(phaseAt(3)).toBe('noche')
  })

  it('los límites caen en el momento siguiente', () => {
    expect(phaseAt(6)).toBe('amanecer')
    expect(phaseAt(9)).toBe('dia')
    expect(phaseAt(18)).toBe('atardecer')
    expect(phaseAt(21)).toBe('noche')
  })

  it('saluda según la hora', () => {
    expect(greetingAt(8)).toBe('Buenos días')
    expect(greetingAt(16)).toBe('Buenas tardes')
    expect(greetingAt(23)).toBe('Buenas noches')
    expect(greetingAt(2)).toBe('Buenas noches')
  })
})
