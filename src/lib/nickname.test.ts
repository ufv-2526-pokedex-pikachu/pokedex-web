import { beforeEach, describe, expect, it } from 'vitest'
import { cleanNickname, defaultNickname, saveNickname, trainerName } from './nickname'

// Vitest corre en Node: un localStorage mínimo en memoria para probar el guardado.
const store = new Map<string, string>()
globalThis.localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
} as Storage
globalThis.window = { dispatchEvent: () => true } as unknown as Window & typeof globalThis

describe('apodo del entrenador', () => {
  beforeEach(() => store.clear())

  it('a los de Google se les quita la coletilla del usuario', () => {
    expect(defaultNickname('adrianzuga-g92708')).toBe('adrianzuga')
    expect(defaultNickname('rojo')).toBe('rojo')
    expect(defaultNickname('ash-g12')).toBe('ash-g12') // solo la coletilla exacta de 5 cifras
  })

  it('limpia lo que se escribe', () => {
    expect(cleanNickname('   Adri   el   Maestro  ')).toBe('Adri el Maestro')
    expect(cleanNickname('a\u0000b\nc')).toBe('abc')
    expect(cleanNickname('x'.repeat(40))).toHaveLength(20)
  })

  it('se guarda por usuario y vacío vuelve al nombre por defecto', () => {
    expect(trainerName('adrianzuga-g92708')).toBe('adrianzuga')
    saveNickname('adrianzuga-g92708', ' Adri ')
    expect(trainerName('adrianzuga-g92708')).toBe('Adri')
    expect(trainerName('rojo')).toBe('rojo') // otro usuario no lo ve
    saveNickname('adrianzuga-g92708', '   ')
    expect(trainerName('adrianzuga-g92708')).toBe('adrianzuga')
  })
})
