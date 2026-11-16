import { describe, expect, it } from 'vitest'
import type { PokedexEntry, Team } from '../api/types'
import { computeAchievements, newlyUnlocked } from './achievements'

const e = (id: number, types = 'normal', o: Partial<PokedexEntry> = {}): PokedexEntry => ({
  id, pokemon_id: id, pokemon_name: `p${id}`, pokemon_sprite: '', pokemon_types: types,
  is_captured: true, capture_date: null, nickname: null, notes: null, favorite: false, created_at: '', ...o,
})
const team = (n: number): Team => ({ id: 1, name: 'E', description: null, created_at: '', pokemon_ids: [], members: Array.from({ length: n }, (_, i) => ({ position: i + 1, pokedex_entry_id: i, pokemon_id: i, pokemon_name: '', pokemon_sprite: '', nickname: null })) })
const get = (list: ReturnType<typeof computeAchievements>, id: string) => list.find((a) => a.id === id)!

describe('logros', () => {
  const none = { entries: [], teams: [], stats: null, record: { won: 0, lost: 0 } }

  it('sin datos no hay ninguno desbloqueado y el progreso empieza en 0', () => {
    const all = computeAchievements(none)
    expect(all.length).toBeGreaterThanOrEqual(12)
    expect(all.every((a) => !a.unlocked && a.current === 0)).toBe(true)
  })

  it('solo cuentan los capturados, no los vistos', () => {
    const all = computeAchievements({ ...none, entries: [e(1, 'grass', { is_captured: false })] })
    expect(get(all, 'primera-captura').unlocked).toBe(false)
  })

  it('iniciales, legendario, tipos, apodo y favorito', () => {
    const entries = [e(1, 'grass,poison'), e(4, 'fire'), e(7, 'water', { nickname: 'Vamos' }), e(150, 'psychic', { favorite: true })]
    const all = computeAchievements({ ...none, entries })
    expect(get(all, 'iniciales').unlocked).toBe(true)
    expect(get(all, 'leyenda').unlocked).toBe(true)
    expect(get(all, 'arcoiris').current).toBe(5) // planta, veneno, fuego, agua, psíquico
    expect(get(all, 'bautizo').unlocked).toBe(true)
    expect(get(all, 'favorito').unlocked).toBe(true)
  })

  it('equipo de 6, racha y victorias; el progreso nunca pasa del objetivo', () => {
    const all = computeAchievements({ entries: [], teams: [team(4), team(6)], stats: { total_pokemon: 0, captured: 0, favorites: 0, completion_percentage: 0, most_common_type: null, capture_streak_days: 9 }, record: { won: 7, lost: 1 } })
    expect(get(all, 'equipo-completo').unlocked).toBe(true)
    expect(get(all, 'racha').current).toBe(3)
    expect(get(all, 'campeon').unlocked).toBe(true)
  })

  it('avisa solo de los nuevos, y la primera vez no avisa de nada', () => {
    const all = computeAchievements({ ...none, entries: [e(1), e(2, 'normal', { favorite: true })] })
    expect(newlyUnlocked(all, null)).toEqual([])
    expect(newlyUnlocked(all, new Set(['primera-captura'])).map((a) => a.id)).toEqual(['favorito'])
  })
})
