import { describe, expect, it } from 'vitest'
import { aiMove, buildFighter, calcDamage, movesFor, mvp, newBattle, playTurn, seeded } from './battle'
import type { BattleState } from './battle'

const pikachu = () => buildFighter({ id: 25, name: 'pikachu', types: ['electric'], stats: { hp: 35, attack: 55, defense: 40, 'special-attack': 50, 'special-defense': 50, speed: 90 } })
const gyarados = () => buildFighter({ id: 130, name: 'gyarados', types: ['water', 'flying'], stats: { hp: 95, attack: 125, defense: 79, 'special-attack': 60, 'special-defense': 100, speed: 81 } })
const geodude = () => buildFighter({ id: 74, name: 'geodude', types: ['rock', 'ground'], stats: { hp: 40, attack: 80, defense: 100, 'special-attack': 30, 'special-defense': 30, speed: 20 } })

describe('Pokémon a nivel 50', () => {
  it('calcula PS y stats con la fórmula de los juegos', () => {
    const p = pikachu()
    expect(p.maxHp).toBe(110) // floor((70+31)*50/100)+60
    expect(p.spe).toBe(110)
  })

  it('tiene 4 ataques y empieza por los de su tipo', () => {
    expect(pikachu().moves).toHaveLength(4)
    expect(pikachu().moves[0].type).toBe('electric')
    expect(movesFor(['water', 'flying'], 100, 50).map((m) => m.type)).toEqual(['water', 'water', 'flying', 'flying'])
  })
})

describe('daño', () => {
  it('súper eficaz hace más daño que poco eficaz, e inmune hace 0', () => {
    const rng = () => 0.5 // sin crítico, variación fija
    const rayo = pikachu().moves.find((m) => m.name === 'Rayo')!
    expect(calcDamage(pikachu(), gyarados(), rayo, rng).eff).toBe(4)
    expect(calcDamage(pikachu(), gyarados(), rayo, rng).damage).toBeGreaterThan(calcDamage(pikachu(), pikachu(), rayo, rng).damage)
    expect(calcDamage(pikachu(), geodude(), rayo, rng)).toEqual({ damage: 0, eff: 0, crit: false })
  })

  it('la IA elige el ataque que más daño hace', () => {
    const g = geodude()
    // Contra Pikachu, Geodude debe usar un ataque de Tierra (×2), no de Roca.
    expect(g.moves[aiMove(g, pikachu())].type).toBe('ground')
  })
})

describe('turnos', () => {
  it('el más rápido ataca primero', () => {
    const { events } = playTurn(newBattle([pikachu()], [geodude()]), { kind: 'move', index: 3 }, seeded(1))
    expect(events[0]).toMatchObject({ kind: 'move', side: 'player' })
  })

  it('un combate termina siempre con un ganador y los PS nunca bajan de 0', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = seeded(seed)
      let s: BattleState = newBattle([pikachu(), geodude()], [gyarados(), pikachu()])
      for (let i = 0; i < 200 && !s.winner; i++) {
        const action = s.mustSwitch
          ? { kind: 'switch' as const, to: s.player.team.findIndex((f) => f.hp > 0) }
          : { kind: 'move' as const, index: aiMove(s.player.team[s.player.active], s.foe.team[s.foe.active]) }
        s = playTurn(s, action, rng).state
      }
      expect(s.winner).not.toBeNull()
      for (const f of [...s.player.team, ...s.foe.team]) expect(f.hp).toBeGreaterThanOrEqual(0)
    }
  })

  it('si cae tu Pokémon, el siguiente turno solo puede ser un cambio y el rival no ataca', () => {
    const weak = { ...pikachu(), hp: 1 }
    let s = newBattle([weak, geodude()], [geodude()])
    s = playTurn(s, { kind: 'move', index: 0 }, seeded(3)).state
    expect(s.mustSwitch).toBe(true)
    expect(playTurn(s, { kind: 'move', index: 0 }, seeded(3)).events).toEqual([])
    const r = playTurn(s, { kind: 'switch', to: 1 }, seeded(3))
    expect(r.events).toEqual([{ kind: 'switch', side: 'player', to: 1 }])
    expect(r.state.mustSwitch).toBe(false)
  })

  it('no cambia el estado anterior y el MVP es quien más daño hizo', () => {
    const s = newBattle([pikachu()], [gyarados()])
    const r = playTurn(s, { kind: 'move', index: 0 }, seeded(5))
    expect(s.foe.team[0].hp).toBe(s.foe.team[0].maxHp)
    expect(r.state.foe.team[0].hp).toBeLessThan(r.state.foe.team[0].maxHp)
    expect(mvp(r.state.player.team).name).toBe('pikachu')
  })
})
