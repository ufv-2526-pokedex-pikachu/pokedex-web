import { describe, expect, it } from 'vitest'
import type { PokedexEntry } from '../api/types'
import { partnerLine, pickPartner } from './partner'

const e = (id: number, o: Partial<PokedexEntry> = {}): PokedexEntry => ({
  id, pokemon_id: id, pokemon_name: `p${id}`, pokemon_sprite: '', pokemon_types: 'normal',
  is_captured: true, capture_date: `2026-11-${String(10 + id).padStart(2, '0')}T10:00:00Z`,
  nickname: null, notes: null, favorite: false, created_at: '', ...o,
})

describe('compañero', () => {
  it('prioriza el elegido, luego un favorito, luego el primero capturado', () => {
    const list = [e(3), e(1), e(2, { favorite: true })]
    expect(pickPartner(list, 3)?.pokemon_id).toBe(3)
    expect(pickPartner(list, null)?.pokemon_id).toBe(2)
    expect(pickPartner([e(3), e(1)], null)?.pokemon_id).toBe(1) // capturado antes
  })

  it('nunca elige uno que solo has visto, ni uno elegido que ya no está capturado', () => {
    expect(pickPartner([e(1, { is_captured: false })], 1)).toBeNull()
    expect(pickPartner([e(1, { is_captured: false }), e(2)], 1)?.pokemon_id).toBe(2)
  })

  it('dice algo distinto según la situación', () => {
    const base = { phase: 'dia' as const, captured: 16, missing: 135, streak: 1, hasPartner: true }
    expect(partnerLine({ ...base, hasPartner: false })).toMatch(/primero/)
    expect(partnerLine({ ...base, missing: 0 })).toMatch(/151/)
    expect(partnerLine({ ...base, streak: 3 })).toMatch(/3 días/)
    expect(partnerLine({ ...base, phase: 'noche' })).toMatch(/dormir/)
    expect(partnerLine(base)).toMatch(/16/)
  })
})
