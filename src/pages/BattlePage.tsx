/**
 * Batallas: eliges uno de tus equipos (GET /teams) y un rival (Kanto al azar u otro equipo tuyo).
 * Las stats salen de GET /pokemon/{id} y el combate lo calcula el motor de src/lib/battle.ts.
 * La API no guarda batallas: el récord de victorias se guarda solo en este navegador.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { Team } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { TeamSlots } from '../components/TeamSlots'
import { TypePill } from '../components/TypePill'
import type { Action, BattleEvent, BattleState, Fighter } from '../lib/battle'
import { buildFighter, mvp, newBattle, playTurn } from '../lib/battle'
import { pokemonDetail } from '../lib/entries'
import { habitatFor } from '../lib/habitat'
import { readRecord, saveRecord } from '../lib/record'
import { confetti } from '../lib/confetti'
import { emit } from '../lib/events'
import { sfx } from '../lib/sfx'
import { HabitatScene } from '../components/HabitatScene'
import { Sprite } from '../components/Sprite'
import { KANTO_TOTAL, TYPE_COLOR, displayName, spriteUrl } from '../lib/pokemon'
import { effectiveness } from '../lib/typechart'
import './BattlePage.css'

type Rival = { kind: 'random' } | { kind: 'team'; id: number }
type Screen = 'setup' | 'loading' | 'fight' | 'result'

/** Los legendarios de Kanto no salen en la hierba alta del rival. */
const LEGENDARY = new Set([144, 145, 146, 150, 151])
const STEP_MS = 950

async function fightersFor(ids: number[]): Promise<Fighter[]> {
  const details = await Promise.all(ids.map((id) => pokemonDetail(id)))
  return details.map((d) => buildFighter({
    id: d.id, name: displayName(d.name), types: d.types, stats: d.stats,
    front: d.sprites.front_default ?? d.sprite ?? spriteUrl(d.id), back: d.sprites.back_default ?? null,
  }))
}

function randomKanto(n: number, exclude: number[]): number[] {
  const pool = Array.from({ length: KANTO_TOTAL }, (_, i) => i + 1).filter((id) => !LEGENDARY.has(id) && !exclude.includes(id))
  const out: number[] = []
  while (out.length < n && pool.length) out.push(...pool.splice(Math.floor(Math.random() * pool.length), 1))
  return out
}

export function BattlePage() {
  const { user } = useAuth()
  const username = user?.username ?? ''
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [teamId, setTeamId] = useState<number | null>(null)
  const [rival, setRival] = useState<Rival>({ kind: 'random' })
  const [screen, setScreen] = useState<Screen>('setup')
  const [error, setError] = useState<string | null>(null)
  const [battle, setBattle] = useState<BattleState | null>(null)
  const [rivalName, setRivalName] = useState('')
  const [record, setRecord] = useState(() => readRecord(username))

  useEffect(() => {
    api.teams()
      .then((t) => { setTeams(t); if (t[0]) setTeamId(t[0].id) })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se han podido cargar tus equipos.'))
  }, [])

  const myTeam = teams?.find((t) => t.id === teamId) ?? null
  const otherTeams = teams?.filter((t) => t.id !== teamId) ?? []

  async function start() {
    if (!myTeam) return
    setError(null)
    setScreen('loading')
    try {
      const rivalTeam = rival.kind === 'team' ? teams?.find((t) => t.id === rival.id) : null
      const rivalIds = rivalTeam ? rivalTeam.pokemon_ids : randomKanto(myTeam.pokemon_ids.length, myTeam.pokemon_ids)
      const [mine, theirs] = await Promise.all([fightersFor(myTeam.pokemon_ids), fightersFor(rivalIds)])
      setRivalName(rivalTeam ? rivalTeam.name : 'Entrenador de Kanto')
      setBattle(newBattle(mine, theirs))
      setScreen('fight')
    } catch (err) {
      setError(err instanceof ApiError
        ? err.status === 429 ? 'Has pedido muchos Pokémon seguidos. Espera un minuto y vuelve a probar.' : err.message
        : 'No se ha podido preparar el combate.')
      setScreen('setup')
    }
  }

  const onEnd = useCallback((won: boolean) => {
    setRecord((r) => {
      const next = won ? { ...r, won: r.won + 1 } : { ...r, lost: r.lost + 1 }
      saveRecord(username, next)
      return next
    })
    setScreen('result')
  }, [username])

  return (
    <div className="battle">
      <div className="title-row">
        <div>
          <h1 className="page-title">Batalla</h1>
          <p className="muted num">
            Combates a nivel 50 por turnos · {record.won} {record.won === 1 ? 'victoria' : 'victorias'}, {record.lost} {record.lost === 1 ? 'derrota' : 'derrotas'}
          </p>
        </div>
        {screen !== 'setup' && screen !== 'loading' && (
          <div className="title-row__actions">
            <button type="button" className="btn" onClick={() => setScreen('setup')}>Cambiar de equipo</button>
          </div>
        )}
      </div>

      {error && <p className="alert" role="alert">{error}</p>}

      {(screen === 'setup' || screen === 'loading') && (
        <Setup
          teams={teams} teamId={teamId} setTeamId={setTeamId} rival={rival} setRival={setRival}
          otherTeams={otherTeams} loading={screen === 'loading'} onStart={start}
        />
      )}

      {(screen === 'fight' || screen === 'result') && battle && (
        <Fight
          key={battle.foe.team.map((f) => f.id).join('-') + battle.player.team.map((f) => f.id).join('-') + rivalName}
          initial={battle} rivalName={rivalName} onEnd={onEnd} finished={screen === 'result'}
          onRematch={start}
        />
      )}
    </div>
  )
}

/* ---------- Preparación ---------- */

function Setup({ teams, teamId, setTeamId, rival, setRival, otherTeams, loading, onStart }: {
  teams: Team[] | null; teamId: number | null; setTeamId: (id: number) => void
  rival: Rival; setRival: (r: Rival) => void; otherTeams: Team[]; loading: boolean; onStart: () => void
}) {
  if (teams === null) return <div className="card skel" style={{ height: 220 }} />
  if (teams.length === 0) {
    return (
      <section className="card battle__empty">
        <p className="card-title">Necesitas un equipo para combatir</p>
        <p className="muted">Monta un equipo con tus Pokémon capturados y vuelve aquí.</p>
        <Link to="/equipos/nuevo" className="btn btn-primary">Nuevo equipo</Link>
      </section>
    )
  }
  return (
    <div className="setup">
      <section className="card setup__mine" aria-labelledby="mine-title">
        <h2 id="mine-title" className="card-title">Tu equipo</h2>
        <div className="setup__teams" role="radiogroup" aria-labelledby="mine-title">
          {teams.map((t) => (
            <button
              key={t.id} type="button" role="radio" aria-checked={t.id === teamId}
              className={`setup__team ${t.id === teamId ? 'is-on' : ''}`} onClick={() => setTeamId(t.id)}
            >
              <span className="setup__team-name">{t.name}</span>
              <TeamSlots members={t.members} size={44} />
            </button>
          ))}
        </div>
      </section>

      <section className="card setup__rival" aria-labelledby="rival-title">
        <h2 id="rival-title" className="card-title">Rival</h2>
        <div className="setup__teams" role="radiogroup" aria-labelledby="rival-title">
          <button
            type="button" role="radio" aria-checked={rival.kind === 'random'}
            className={`setup__team ${rival.kind === 'random' ? 'is-on' : ''}`} onClick={() => setRival({ kind: 'random' })}
          >
            <span className="setup__team-name">Entrenador de Kanto</span>
            <span className="muted">Pokémon de Kanto al azar, tantos como tenga tu equipo. Sin legendarios.</span>
          </button>
          {otherTeams.map((t) => (
            <button
              key={t.id} type="button" role="radio" aria-checked={rival.kind === 'team' && rival.id === t.id}
              className={`setup__team ${rival.kind === 'team' && rival.id === t.id ? 'is-on' : ''}`}
              onClick={() => setRival({ kind: 'team', id: t.id })}
            >
              <span className="setup__team-name">{t.name}</span>
              <TeamSlots members={t.members} size={44} />
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-primary btn-block" onClick={onStart} disabled={loading || teamId === null}>
          {loading && <span className="spinner" aria-hidden="true" />}{loading ? 'Preparando el combate…' : '¡A combatir!'}
        </button>
      </section>
    </div>
  )
}

/* ---------- Combate ---------- */

const EFF_TEXT = (eff: number) => (eff === 0 ? 'No afecta' : eff >= 2 ? 'Súper eficaz' : eff < 1 ? 'Poco eficaz' : '')

function Fight({ initial, rivalName, onEnd, finished, onRematch }: {
  initial: BattleState; rivalName: string; onEnd: (won: boolean) => void; finished: boolean; onRematch: () => void
}) {
  const [state, setState] = useState(initial)
  /** Lo que se pinta: avanza evento a evento hasta alcanzar a `state`. */
  const [shown, setShown] = useState(initial)
  const [message, setMessage] = useState(`¡${rivalName} quiere combatir!`)
  const [busy, setBusy] = useState(false)
  const [anim, setAnim] = useState<{ attacker?: 'player' | 'foe'; hit?: 'player' | 'foe'; fx?: HitFx }>({})
  const [log, setLog] = useState<string[]>([])
  const alive = useRef(true)
  // En desarrollo React monta dos veces (StrictMode): hay que volver a poner true al montar.
  useEffect(() => {
    alive.current = true
    return () => { alive.current = false }
  }, [])

  const wait = (ms: number) => new Promise((r) => setTimeout(r, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? ms / 3 : ms))

  const me = shown.player.team[shown.player.active]
  const foe = shown.foe.team[shown.foe.active]

  async function play(action: Action) {
    if (busy || state.winner) return
    const { state: next, events } = playTurn(state, action, Math.random)
    if (events.length === 0) return
    setBusy(true)
    let view = shown
    for (const ev of events) {
      if (!alive.current) return
      const text = describe(ev, view)
      const sideOf = (s: 'player' | 'foe') => (s === 'player' ? view.player : view.foe)
      if (ev.kind === 'move') {
        setAnim({ attacker: ev.side })
        setMessage(text[0])
        await wait(450)
        const target = ev.side === 'player' ? 'foe' : 'player'
        view = patchHp(view, target, ev.targetHp)
        setShown(view)
        setAnim({ hit: ev.damage > 0 ? target : undefined, fx: { side: target, color: TYPE_COLOR[ev.move.type] ?? '#fff', damage: ev.damage, crit: ev.crit, eff: ev.eff, key: Date.now() } })
        if (ev.damage > 0) sfx.hit(ev.crit ? 2 : ev.eff)
        if (text[1]) { await wait(350); setMessage(`${text[0]} ${text[1]}`) }
        await wait(STEP_MS - 450)
        setAnim({})
      } else if (ev.kind === 'switch') {
        view = { ...view, [ev.side]: { ...sideOf(ev.side), active: ev.to } }
        setShown(view)
        setMessage(text[0])
        await wait(STEP_MS)
      } else {
        setMessage(text[0])
        if (ev.kind === 'faint') sfx.faint()
        await wait(ev.kind === 'end' ? 300 : STEP_MS)
      }
      setLog((l) => [...l, text.join(' ')].slice(-40))
    }
    setState(next)
    setShown(next)
    setBusy(false)
    if (next.winner) {
      const won = next.winner === 'player'
      if (won) { sfx.win(); confetti(140) } else sfx.lose()
      emit(won ? 'win' : 'lose')
      onEnd(won)
    }
    else if (next.mustSwitch) setMessage('Elige a quién sacar.')
    else setMessage(`¿Qué debería hacer ${next.player.team[next.player.active].name}?`)
  }

  const canAct = !busy && !state.winner
  const best = useMemo(() => mvp(state.player.team), [state])

  return (
    <div className="fight">
      <section className="card fight__arena" aria-label="Combate">
        <div className={`arena-field ${anim.fx && (anim.fx.crit || anim.fx.eff >= 2) ? 'is-shaking' : ''}`}>
          <HabitatScene habitat={habitatFor(foe.types)} />
          <HpBox fighter={foe} className="arena-field__foe-box" />
          <div className={`arena-field__mon arena-field__mon--foe ${anim.attacker === 'foe' ? 'is-attacking' : ''} ${anim.hit === 'foe' ? 'is-hit' : ''} ${foe.hp <= 0 ? 'is-fainted' : ''}`} key={`f-${foe.id}`}>
            <span className="arena-field__pad" aria-hidden="true" />
            <Sprite id={foe.id} alt={foe.name} />
            {anim.fx?.side === 'foe' && <HitEffect fx={anim.fx} />}
          </div>
          <div className={`arena-field__mon arena-field__mon--me ${anim.attacker === 'player' ? 'is-attacking' : ''} ${anim.hit === 'player' ? 'is-hit' : ''} ${me.hp <= 0 ? 'is-fainted' : ''}`} key={`m-${me.id}`}>
            <span className="arena-field__pad" aria-hidden="true" />
            <Sprite id={me.id} back alt={me.name} />
            {anim.fx?.side === 'player' && <HitEffect fx={anim.fx} />}
          </div>
          <HpBox fighter={me} mine className="arena-field__me-box" />
        </div>
        <p className="fight__message" role="status" aria-live="polite">{message}</p>
      </section>

      <section className="card fight__panel" aria-label="Acciones">
        {finished && state.winner ? (
          <div className="result">
            <p className={`result__title ${state.winner === 'player' ? 'is-win' : ''}`}>
              {state.winner === 'player' ? '¡Victoria!' : 'Derrota'}
            </p>
            <dl className="facts">
              <div><dt>Turnos</dt><dd className="num">{state.turn - 1}</dd></div>
              <div><dt>MVP de tu equipo</dt><dd>{best.name} <span className="faint num">· {best.dealt} de daño</span></dd></div>
              <div><dt>Pokémon en pie</dt><dd className="num">{state.player.team.filter((f) => f.hp > 0).length} de {state.player.team.length}</dd></div>
            </dl>
            <button type="button" className="btn btn-primary btn-block" onClick={onRematch}>Otro combate</button>
          </div>
        ) : (
          <>
            <h2 className="card-title">{state.mustSwitch ? 'Elige a tu siguiente Pokémon' : 'Ataques'}</h2>
            {!state.mustSwitch && (
              <div className="moves">
                {me.moves.map((mv, i) => {
                  const eff = effectiveness(mv.type, foe.types)
                  return (
                    <button key={mv.name} type="button" className="move" disabled={!canAct} onClick={() => play({ kind: 'move', index: i })}>
                      <span className="move__name">{mv.name}</span>
                      <span className="move__meta">
                        <TypePill type={mv.type} />
                        <span className="faint num">{mv.power}</span>
                      </span>
                      <span className={`move__eff ${eff >= 2 ? 'is-good' : eff < 1 ? 'is-bad' : ''}`}>{EFF_TEXT(eff)}</span>
                    </button>
                  )
                })}
              </div>
            )}
            <h3 className="fight__team-title">Tu equipo {!state.mustSwitch && <span className="faint">· cambiar gasta el turno</span>}</h3>
            <ul className="bench">
              {state.player.team.map((f, i) => (
                <li key={f.id}>
                  <button
                    type="button" className={`bench__item ${i === state.player.active ? 'is-active' : ''}`}
                    disabled={!canAct || f.hp <= 0 || i === state.player.active}
                    onClick={() => play({ kind: 'switch', to: i })}
                    aria-label={`Sacar a ${f.name}, ${f.hp} de ${f.maxHp} PS`}
                  >
                    {f.front && <img src={f.front} alt="" width={40} height={40} />}
                    <span className="bench__name">{f.name}</span>
                    <HpBar hp={(shown.player.team[i] ?? f).hp} max={f.maxHp} />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <details className="fight__log">
          <summary>Registro del combate</summary>
          <ol>{log.map((l, i) => <li key={i}>{l}</li>)}</ol>
        </details>
      </section>
    </div>
  )
}

/** Golpe que se pinta sobre el Pokémon que lo recibe. */
interface HitFx { side: 'player' | 'foe'; color: string; damage: number; crit: boolean; eff: number; key: number }

/**
 * Efecto del golpe: un destello y chispas del color del tipo del ataque, y el daño flotando hacia arriba.
 * Es decorativo (aria-hidden): el texto del combate ya dice lo que ha pasado.
 */
function HitEffect({ fx }: { fx: HitFx }) {
  const tag = fx.eff === 0 ? 'No afecta' : fx.crit ? '¡Crítico!' : fx.eff >= 2 ? '¡Súper eficaz!' : fx.eff < 1 ? 'Poco eficaz' : ''
  return (
    <span className={`hitfx ${fx.eff === 0 ? 'is-immune' : ''}`} style={{ '--fx': fx.color } as CSSProperties} key={fx.key} aria-hidden="true">
      {fx.eff > 0 && <span className="hitfx__burst" />}
      {fx.eff > 0 && Array.from({ length: 8 }, (_, i) => <i key={i} style={{ '--a': `${i * 45 + 20}deg` } as CSSProperties} />)}
      {fx.damage > 0 && <span className="hitfx__dmg num">-{fx.damage}</span>}
      {tag && <span className="hitfx__tag">{tag}</span>}
    </span>
  )
}

function patchHp(view: BattleState, side: 'player' | 'foe', hp: number): BattleState {
  const s = view[side]
  return { ...view, [side]: { ...s, team: s.team.map((f, i) => (i === s.active ? { ...f, hp } : f)) } }
}

function describe(ev: BattleEvent, view: BattleState): string[] {
  const name = (side: 'player' | 'foe', idx?: number) => {
    const s = view[side]
    const f = s.team[idx ?? s.active]
    return side === 'foe' ? `${f.name} rival` : f.name
  }
  switch (ev.kind) {
    case 'move': {
      const target = ev.side === 'player' ? 'foe' : 'player'
      const extra = ev.eff === 0 ? `No afecta a ${name(target)}…`
        : [ev.crit ? '¡Golpe crítico!' : '', ev.eff >= 2 ? '¡Es súper eficaz!' : ev.eff < 1 ? 'No es muy eficaz…' : ''].filter(Boolean).join(' ')
      return [`¡${name(ev.side)} usa ${ev.move.name}!`, extra]
    }
    case 'switch':
      return [ev.side === 'player' ? `¡Adelante, ${view.player.team[ev.to].name}!` : `El rival saca a ${view.foe.team[ev.to].name}.`]
    case 'faint':
      return [`¡${name(ev.side)} se ha debilitado!`]
    case 'end':
      return [ev.winner === 'player' ? '¡Has ganado el combate!' : 'Te has quedado sin Pokémon…']
  }
}

function HpBox({ fighter, mine = false, className }: { fighter: Fighter; mine?: boolean; className: string }) {
  return (
    <div className={`hpbox ${className}`}>
      <p className="hpbox__name">{fighter.name} <span className="faint">Nv. 50</span></p>
      <span className="types">{fighter.types.map((t) => <TypePill key={t} type={t} />)}</span>
      <HpBar hp={fighter.hp} max={fighter.maxHp} />
      {mine && <p className="hpbox__hp num">{fighter.hp} / {fighter.maxHp} PS</p>}
    </div>
  )
}

function HpBar({ hp, max }: { hp: number; max: number }) {
  const pct = Math.max(0, hp / max)
  const level = pct > 0.5 ? 'ok' : pct > 0.2 ? 'mid' : 'low'
  return (
    <span className={`hpbar hpbar--${level}`} role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={hp} aria-label="Puntos de salud">
      <span style={{ '--w': pct } as CSSProperties} />
    </span>
  )
}
