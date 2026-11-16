/**
 * Motor de combate por turnos. Funciones puras: reciben el estado y devuelven el estado nuevo
 * y la lista de cosas que han pasado (para animarlas). El azar entra por `rng`, así los tests
 * pueden repetir un combate exacto.
 *
 * Simplificado de los juegos: nivel 50 para todos, 4 ataques por Pokémon según sus tipos,
 * daño con la fórmula clásica (stats, tipo, STAB ×1,5, crítico ×1,5 con 1/16, variación 85–100 %).
 */
import { effectiveness } from './typechart'

export const LEVEL = 50

export interface Move { name: string; type: string; power: number; category: 'physical' | 'special' }

export interface Fighter {
  id: number
  name: string
  types: string[]
  maxHp: number
  hp: number
  atk: number; def: number; spa: number; spd: number; spe: number
  moves: Move[]
  front: string | null
  back: string | null
  /** Daño total causado: sirve para elegir el MVP. */
  dealt: number
}

export interface Side { team: Fighter[]; active: number }

export interface BattleState {
  player: Side
  foe: Side
  turn: number
  /** El jugador tiene que elegir a quién sacar (su Pokémon activo se ha debilitado). */
  mustSwitch: boolean
  winner: 'player' | 'foe' | null
}

export type Action = { kind: 'move'; index: number } | { kind: 'switch'; to: number }

export type BattleEvent =
  | { kind: 'move'; side: 'player' | 'foe'; move: Move; damage: number; eff: number; crit: boolean; targetHp: number }
  | { kind: 'switch'; side: 'player' | 'foe'; to: number }
  | { kind: 'faint'; side: 'player' | 'foe' }
  | { kind: 'end'; winner: 'player' | 'foe' }

export type Rng = () => number

/** Generador de números aleatorios con semilla (mulberry32). */
export function seeded(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ---------- Ataques ---------- */

/** Dos ataques por tipo: uno físico y uno especial. */
const MOVES: Record<string, [Move, Move]> = {
  normal: [m('Golpe cuerpo', 'normal', 85, 'physical'), m('Hiperrayo', 'normal', 90, 'special')],
  fire: [m('Puño fuego', 'fire', 75, 'physical'), m('Lanzallamas', 'fire', 90, 'special')],
  water: [m('Cascada', 'water', 80, 'physical'), m('Surf', 'water', 90, 'special')],
  electric: [m('Puño trueno', 'electric', 75, 'physical'), m('Rayo', 'electric', 90, 'special')],
  grass: [m('Hoja aguda', 'grass', 90, 'physical'), m('Energibola', 'grass', 90, 'special')],
  ice: [m('Puño hielo', 'ice', 75, 'physical'), m('Rayo hielo', 'ice', 90, 'special')],
  fighting: [m('Demolición', 'fighting', 75, 'physical'), m('Onda certera', 'fighting', 90, 'special')],
  poison: [m('Puya nociva', 'poison', 80, 'physical'), m('Bomba lodo', 'poison', 90, 'special')],
  ground: [m('Terremoto', 'ground', 100, 'physical'), m('Tierra viva', 'ground', 90, 'special')],
  flying: [m('Golpe aéreo', 'flying', 75, 'physical'), m('Tajo aéreo', 'flying', 75, 'special')],
  psychic: [m('Cabezazo zen', 'psychic', 80, 'physical'), m('Psíquico', 'psychic', 90, 'special')],
  bug: [m('Tijera X', 'bug', 80, 'physical'), m('Zumbido', 'bug', 90, 'special')],
  rock: [m('Avalancha', 'rock', 75, 'physical'), m('Joya de luz', 'rock', 80, 'special')],
  ghost: [m('Garra umbría', 'ghost', 70, 'physical'), m('Bola sombra', 'ghost', 80, 'special')],
  dragon: [m('Garra dragón', 'dragon', 80, 'physical'), m('Pulso dragón', 'dragon', 85, 'special')],
  dark: [m('Triturar', 'dark', 80, 'physical'), m('Pulso umbrío', 'dark', 80, 'special')],
  steel: [m('Cabeza de hierro', 'steel', 80, 'physical'), m('Foco resplandor', 'steel', 80, 'special')],
  fairy: [m('Carantoña', 'fairy', 90, 'physical'), m('Fuerza lunar', 'fairy', 95, 'special')],
}

/** Tipo de cobertura para los Pokémon de un solo tipo (cubre sus puntos flojos más comunes). */
const COVERAGE: Record<string, string> = {
  normal: 'fighting', fire: 'ground', water: 'ice', electric: 'steel', grass: 'poison', ice: 'water',
  fighting: 'rock', poison: 'ground', ground: 'rock', flying: 'steel', psychic: 'fairy', bug: 'flying',
  rock: 'ground', ghost: 'dark', dragon: 'fire', dark: 'fighting', steel: 'ground', fairy: 'fire',
}

function m(name: string, type: string, power: number, category: Move['category']): Move {
  return { name, type, power, category }
}

/** Cuatro ataques: los de sus tipos y, si le faltan, uno normal y uno de cobertura. Del lado en que pega más fuerte. */
export function movesFor(types: string[], atk: number, spa: number): Move[] {
  const side = atk >= spa ? 0 : 1
  const pool: Move[] = []
  for (const t of types) {
    const pair = MOVES[t]
    if (pair) pool.push(pair[side], pair[1 - side])
  }
  if (types.length === 1) {
    pool.push(MOVES[COVERAGE[types[0]] ?? 'normal'][side])
    if (types[0] !== 'normal') pool.push(MOVES.normal[side])
  }
  if (pool.length < 4) pool.push(MOVES.normal[1 - side])
  return pool.slice(0, 4)
}

/* ---------- Pokémon a nivel 50 ---------- */

export interface BaseStats { hp: number; attack: number; defense: number; 'special-attack': number; 'special-defense': number; speed: number }

const statAt50 = (base: number) => Math.floor(((2 * base + 31) * LEVEL) / 100) + 5
const hpAt50 = (base: number) => Math.floor(((2 * base + 31) * LEVEL) / 100) + LEVEL + 10

export function buildFighter(p: {
  id: number; name: string; types: string[]; stats: Record<string, number>
  front?: string | null; back?: string | null
}): Fighter {
  const s = p.stats
  const atk = statAt50(s.attack ?? 50)
  const spa = statAt50(s['special-attack'] ?? 50)
  const maxHp = hpAt50(s.hp ?? 50)
  return {
    id: p.id, name: p.name, types: p.types, maxHp, hp: maxHp,
    atk, def: statAt50(s.defense ?? 50), spa, spd: statAt50(s['special-defense'] ?? 50), spe: statAt50(s.speed ?? 50),
    moves: movesFor(p.types, atk, spa), front: p.front ?? null, back: p.back ?? null, dealt: 0,
  }
}

/* ---------- Daño ---------- */

export function calcDamage(att: Fighter, def: Fighter, move: Move, rng: Rng) {
  const eff = effectiveness(move.type, def.types)
  if (eff === 0) return { damage: 0, eff, crit: false }
  const [a, d] = move.category === 'physical' ? [att.atk, def.def] : [att.spa, def.spd]
  const crit = rng() < 1 / 16
  const base = Math.floor(Math.floor((Math.floor((2 * LEVEL) / 5 + 2) * move.power * a) / d) / 50) + 2
  const stab = att.types.includes(move.type) ? 1.5 : 1
  const roll = 0.85 + rng() * 0.15
  const damage = Math.max(1, Math.floor(base * stab * eff * (crit ? 1.5 : 1) * roll))
  return { damage, eff, crit }
}

/** Daño esperado sin azar: lo usa la IA para elegir. */
export function expectedDamage(att: Fighter, def: Fighter, move: Move): number {
  const eff = effectiveness(move.type, def.types)
  const [a, d] = move.category === 'physical' ? [att.atk, def.def] : [att.spa, def.spd]
  const stab = att.types.includes(move.type) ? 1.5 : 1
  return ((Math.floor((2 * LEVEL) / 5 + 2) * move.power * a) / d / 50 + 2) * stab * eff
}

/** IA del rival: el ataque que más daño hace al Pokémon que tiene delante. */
export function aiMove(att: Fighter, def: Fighter): number {
  let best = 0
  att.moves.forEach((mv, i) => { if (expectedDamage(att, def, mv) > expectedDamage(att, def, att.moves[best])) best = i })
  return best
}

/** IA del rival al cambiar: el vivo que mejor pega al Pokémon del jugador. */
export function aiNext(side: Side, against: Fighter): number {
  let best = -1
  let bestScore = -1
  side.team.forEach((f, i) => {
    if (f.hp <= 0) return
    const score = Math.max(...f.moves.map((mv) => expectedDamage(f, against, mv)))
    if (score > bestScore) { best = i; bestScore = score }
  })
  return best
}

/* ---------- Turno ---------- */

export function newBattle(player: Fighter[], foe: Fighter[]): BattleState {
  return { player: { team: player, active: 0 }, foe: { team: foe, active: 0 }, turn: 1, mustSwitch: false, winner: null }
}

const alive = (s: Side) => s.team.some((f) => f.hp > 0)

/** Copia profunda sencilla para no tocar el estado anterior (React necesita objetos nuevos). */
function clone(s: BattleState): BattleState {
  const side = (x: Side): Side => ({ active: x.active, team: x.team.map((f) => ({ ...f })) })
  return { ...s, player: side(s.player), foe: side(s.foe) }
}

/**
 * Resuelve un turno: primero los cambios, después los ataques por orden de velocidad
 * (empate a suertes). Si cae el Pokémon del rival, la IA saca otro; si cae el tuyo,
 * `mustSwitch` queda en true y el siguiente turno solo puede ser un cambio.
 */
export function playTurn(prev: BattleState, action: Action, rng: Rng): { state: BattleState; events: BattleEvent[] } {
  if (prev.winner) return { state: prev, events: [] }
  const state = clone(prev)
  const events: BattleEvent[] = []
  const P = state.player
  const F = state.foe

  if (action.kind === 'switch') {
    const target = P.team[action.to]
    if (!target || target.hp <= 0 || action.to === P.active) return { state: prev, events: [] }
    P.active = action.to
    events.push({ kind: 'switch', side: 'player', to: action.to })
    if (state.mustSwitch) {
      state.mustSwitch = false
      return { state, events } // cambio obligado: el rival no ataca
    }
  } else if (state.mustSwitch) {
    return { state: prev, events: [] }
  }

  const foeMoveIndex = aiMove(F.team[F.active], P.team[P.active])
  type Turn = { side: 'player' | 'foe'; index: number }
  const order: Turn[] = []
  if (action.kind === 'move') {
    const me = P.team[P.active]
    const them = F.team[F.active]
    const meFirst = me.spe > them.spe || (me.spe === them.spe && rng() < 0.5)
    order.push(...(meFirst
      ? [{ side: 'player', index: action.index }, { side: 'foe', index: foeMoveIndex }] as Turn[]
      : [{ side: 'foe', index: foeMoveIndex }, { side: 'player', index: action.index }] as Turn[]))
  } else {
    order.push({ side: 'foe', index: foeMoveIndex })
  }

  for (const t of order) {
    const [atkSide, defSide] = t.side === 'player' ? [P, F] : [F, P]
    const att = atkSide.team[atkSide.active]
    const def = defSide.team[defSide.active]
    if (att.hp <= 0 || def.hp <= 0) continue
    const move = att.moves[t.index] ?? att.moves[0]
    const { damage, eff, crit } = calcDamage(att, def, move, rng)
    const real = Math.min(damage, def.hp)
    def.hp -= real
    att.dealt += real
    events.push({ kind: 'move', side: t.side, move, damage: real, eff, crit, targetHp: def.hp })
    if (def.hp <= 0) {
      const fainted = t.side === 'player' ? 'foe' : 'player'
      events.push({ kind: 'faint', side: fainted })
      if (!alive(defSide)) {
        state.winner = t.side
        events.push({ kind: 'end', winner: t.side })
        return { state, events }
      }
      if (fainted === 'foe') {
        F.active = aiNext(F, P.team[P.active])
        events.push({ kind: 'switch', side: 'foe', to: F.active })
      } else {
        state.mustSwitch = true
      }
      break // quien cae ya no ataca este turno
    }
  }

  state.turn += 1
  return { state, events }
}

/** El que más daño ha hecho de un equipo. */
export function mvp(team: Fighter[]): Fighter {
  return team.reduce((a, b) => (b.dealt > a.dealt ? b : a))
}
