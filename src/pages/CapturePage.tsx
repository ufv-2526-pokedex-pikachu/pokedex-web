/**
 * Capturar: buscas un Pokémon (GET /pokemon/search) o sales a la hierba alta (uno de Kanto al azar),
 * y le lanzas Poké Balls. Si lo capturas, se guarda con POST /pokedex (o PATCH si ya lo habías visto);
 * si huye, queda registrado como visto.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, Dispatch, SetStateAction } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { PokedexEntry, PokemonDetail, PokemonSummary } from '../api/types'
import { Mark } from '../components/Mark'
import { TypePills } from '../components/TypePill'
import { useToast } from '../components/Toast'
import {
  BALLS_PER_ENCOUNTER, catchChance, ringAt, ringPeriod, shakes, throwQuality,
} from '../lib/capture'
import { allEntries, pokemonDetail } from '../lib/entries'
import { KANTO_TOTAL, artworkUrl, dexNumber, displayName, spriteUrl } from '../lib/pokemon'
import './CapturePage.css'

type Phase = 'aiming' | 'throwing' | 'shaking' | 'escaped' | 'caught' | 'fled'

interface Encounter {
  detail: PokemonDetail
  total: number
  ballsLeft: number
  phase: Phase
  shakeCount: number
  quality: ReturnType<typeof throwQuality> | null
}

const searchCache = new Map<string, PokemonSummary[]>()
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const wait = (ms: number) => new Promise((r) => setTimeout(r, reduceMotion() ? Math.min(ms, 150) : ms))

export function CapturePage() {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PokemonSummary[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [entries, setEntries] = useState<Map<number, PokedexEntry>>(new Map())
  const [encounter, setEncounter] = useState<Encounter | null>(null)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const arenaRef = useRef<HTMLElement>(null)
  const encounterId = encounter?.detail.id

  // En el móvil el escenario queda arriba del buscador: al empezar un encuentro, se lleva a la vista.
  useEffect(() => {
    const el = arenaRef.current
    if (!encounterId || !el) return
    const r = el.getBoundingClientRect()
    if (r.top < 64 || r.bottom > window.innerHeight) window.scrollTo({ top: r.top + window.scrollY - 72 })
  }, [encounterId])

  useEffect(() => {
    allEntries().then((list) => setEntries(new Map(list.map((e) => [e.pokemon_id, e])))).catch(() => {})
  }, [])

  // Busca 350 ms después de dejar de escribir: cada búsqueda cuenta para el límite de 30 por minuto.
  useEffect(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) { setResults(null); setSearchError(null); return }
    if (searchCache.has(q)) { setResults(searchCache.get(q)!); return }
    let alive = true
    const t = setTimeout(() => {
      setSearching(true)
      api.searchPokemon(q, 12)
        .then((r) => { searchCache.set(q, r.results); if (alive) { setResults(r.results); setSearchError(null) } })
        .catch((err) => alive && setSearchError(err instanceof ApiError ? err.message : 'No se ha podido buscar.'))
        .finally(() => alive && setSearching(false))
    }, 350)
    return () => { alive = false; clearTimeout(t) }
  }, [query])

  const start = useCallback(async (id: number) => {
    setLoadingId(id)
    try {
      const detail = await pokemonDetail(id)
      const total = Object.values(detail.stats).reduce((a, b) => a + b, 0)
      setEncounter({ detail, total, ballsLeft: BALLS_PER_ENCOUNTER, phase: 'aiming', shakeCount: 0, quality: null })
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'No se ha podido encontrar a ese Pokémon.', 'error')
    } finally {
      setLoadingId(null)
    }
  }, [toast])

  /** Hierba alta: un Pokémon de Kanto al azar, mejor uno que aún no tengas capturado. */
  function tallGrass() {
    const pending = Array.from({ length: KANTO_TOTAL }, (_, i) => i + 1).filter((id) => !entries.get(id)?.is_captured)
    const pool = pending.length ? pending : Array.from({ length: KANTO_TOTAL }, (_, i) => i + 1)
    start(pool[Math.floor(Math.random() * pool.length)])
  }

  /** Guarda el resultado en la API y devuelve la entrada actualizada. */
  async function save(id: number, captured: boolean): Promise<void> {
    const existing = entries.get(id)
    let saved: PokedexEntry | null = null
    if (captured) {
      // Sin capture_date: al marcarlo como capturado, la API pone la fecha de hoy ella sola.
      saved = existing
        ? existing.is_captured ? existing : await api.updateEntry(existing.id, { is_captured: true })
        : await api.addEntry({ pokemon_id: id, is_captured: true })
    } else if (!existing) {
      saved = await api.addEntry({ pokemon_id: id, is_captured: false })
    }
    if (saved) setEntries((m) => new Map(m).set(id, saved))
  }

  async function onResult(enc: Encounter, caught: boolean) {
    try {
      await save(enc.detail.id, caught)
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'No se ha podido guardar en tu Pokédex.', 'error')
    }
  }

  const owned = encounter ? entries.get(encounter.detail.id) : undefined

  // Ocho de Kanto que aún no tienes, elegidos una vez al cargar (sin peticiones: los sprites van por URL).
  const [seed] = useState(() => Math.random())
  const suggestions = useMemo(() => {
    const pending = Array.from({ length: KANTO_TOTAL }, (_, i) => i + 1).filter((id) => !entries.has(id))
    const start = Math.floor(seed * pending.length)
    return [...pending.slice(start), ...pending.slice(0, start)].slice(0, 8)
  }, [entries, seed])

  return (
    <div className="capture">
      <div className="title-row">
        <div>
          <h1 className="page-title">Capturar</h1>
          <p className="muted">Busca un Pokémon o entra en la hierba alta, y lanza la Poké Ball cuando el anillo se cierre.</p>
        </div>
      </div>

      <div className="capture__grid">
        <section className="card finder" aria-labelledby="finder-title">
          <h2 id="finder-title" className="card-title">Buscar</h2>
          <div className="finder__search">
            <label htmlFor="q" className="visually-hidden">Nombre del Pokémon</label>
            <input
              id="q" className="input" type="search" autoComplete="off" placeholder="Escribe un nombre: pika, char…"
              value={query} onChange={(e) => setQuery(e.target.value)}
            />
            {searching && <span className="spinner finder__spin" aria-hidden="true" />}
          </div>
          <button type="button" className="btn btn-primary btn-block" onClick={tallGrass} disabled={loadingId !== null}>
            Entrar en la hierba alta
          </button>

          {searchError && <p className="alert" role="alert">{searchError}</p>}

          <ul className="finder__list" aria-live="polite">
            {results?.length === 0 && <li className="finder__empty muted">Ningún Pokémon se llama así.</li>}
            {results?.map((p) => {
              const e = entries.get(p.id)
              return (
                <li key={p.id}>
                  <button type="button" className="finder__item" onClick={() => start(p.id)} disabled={loadingId !== null}>
                    {p.sprite ? <img src={p.sprite} alt="" width={48} height={48} loading="lazy" /> : <span className="finder__noimg" />}
                    <span className="finder__text">
                      <span className="finder__name">
                        {displayName(p.name)}
                        <span className="faint num"> {dexNumber(p.id)}</span>
                      </span>
                      <TypePills types={p.types} />
                    </span>
                    <span className={`finder__state ${e?.is_captured ? 'is-captured' : ''}`}>
                      {loadingId === p.id ? <span className="spinner" aria-hidden="true" />
                        : e?.is_captured ? 'Capturado' : e ? 'Visto' : ''}
                    </span>
                  </button>
                </li>
              )
            })}
            {results === null && !searchError && (
              <li className="finder__empty muted">Escribe al menos 2 letras para buscar entre todos los Pokémon.</li>
            )}
          </ul>

          {results === null && suggestions.length > 0 && (
            <div className="suggest">
              <p className="summary__label">Aún no los tienes</p>
              <ul className="suggest__grid">
                {suggestions.map((id) => (
                  <li key={id}>
                    <button type="button" className="suggest__item" onClick={() => start(id)} disabled={loadingId !== null} aria-label={`Buscar al Pokémon ${dexNumber(id)}`}>
                      {loadingId === id ? <span className="spinner" aria-hidden="true" /> : <img src={spriteUrl(id)} alt="" width={64} height={64} loading="lazy" />}
                      <span className="faint num">{dexNumber(id)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section ref={arenaRef} className="card arena" aria-label="Encuentro">
          {encounter
            ? <Arena
                key={encounter.detail.id}
                encounter={encounter}
                setEncounter={setEncounter}
                alreadyCaptured={owned?.is_captured ?? false}
                onResult={onResult}
                onAgain={tallGrass}
              />
            : <EmptyArena loading={loadingId !== null} />}
        </section>
      </div>
    </div>
  )
}

function EmptyArena({ loading }: { loading: boolean }) {
  return (
    <div className="arena__empty">
      <div className="arena__ball-big" aria-hidden="true"><Mark size={96} /></div>
      <p className="card-title">{loading ? 'Algo se mueve en la hierba…' : 'Ningún Pokémon a la vista'}</p>
      <p className="muted">Elige uno en el buscador o entra en la hierba alta.</p>
    </div>
  )
}

interface ArenaProps {
  encounter: Encounter
  setEncounter: Dispatch<SetStateAction<Encounter | null>>
  alreadyCaptured: boolean
  onResult: (enc: Encounter, caught: boolean) => Promise<void>
  onAgain: () => void
}

function Arena({ encounter, setEncounter, alreadyCaptured, onResult, onAgain }: ArenaProps) {
  const { detail, total, phase, ballsLeft, shakeCount, quality } = encounter
  const ringRef = useRef<HTMLDivElement>(null)
  const startRef = useRef(performance.now())
  const scaleRef = useRef(1)
  const period = useMemo(() => ringPeriod(total), [total])
  const name = displayName(detail.name)

  // El anillo se dibuja en cada fotograma; así sabemos su tamaño exacto al pulsar.
  useEffect(() => {
    if (phase !== 'aiming') return
    let raf = 0
    const tick = (now: number) => {
      const s = ringAt(now - startRef.current, period)
      scaleRef.current = s
      if (ringRef.current) ringRef.current.style.transform = `scale(${s})`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, period])

  const patch = (p: Partial<Encounter>) => setEncounter((e) => (e ? { ...e, ...p } : e))

  const throwBall = useCallback(async () => {
    if (phase !== 'aiming' || ballsLeft === 0) return
    const ring = scaleRef.current
    const chance = catchChance(total, ring)
    const n = shakes(chance, Math.random())
    patch({ phase: 'throwing', quality: throwQuality(ring), ballsLeft: ballsLeft - 1, shakeCount: 0 })
    await wait(700)
    patch({ phase: 'shaking', shakeCount: n })
    await wait(Math.max(n, 1) * 750 + 250)
    if (n === 3) {
      patch({ phase: 'caught' })
      await onResult(encounter, true)
    } else if (ballsLeft - 1 === 0) {
      patch({ phase: 'escaped' })
      await wait(900)
      patch({ phase: 'fled' })
      await onResult(encounter, false)
    } else {
      patch({ phase: 'escaped' })
      await wait(900)
      startRef.current = performance.now()
      patch({ phase: 'aiming', quality: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, ballsLeft, total, encounter, onResult])

  // Espacio también lanza, como un mando.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        throwBall()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [throwBall])

  const message =
    phase === 'caught' ? `¡${name} capturado!`
      : phase === 'fled' ? `${name} ha huido`
        : phase === 'escaped' ? '¡Oh, no! Se ha escapado'
          : phase === 'shaking' ? '…'
            : phase === 'throwing' ? (quality === 'excelente' ? '¡Excelente!' : quality === 'bien' ? '¡Bien!' : '¡Allá va!')
              : `¡Un ${name} salvaje!`

  return (
    <div className={`arena__stage is-${phase}`}>
      <div className="arena__head">
        <div>
          <p className="arena__name">{name} <span className="faint num">{dexNumber(detail.id)}</span></p>
          <TypePills types={detail.types} />
        </div>
        <div className="arena__balls" aria-label={ballsLeft === 1 ? "Te queda 1 Poké Ball" : `Te quedan ${ballsLeft} Poké Balls`}>
          {Array.from({ length: BALLS_PER_ENCOUNTER }, (_, i) => (
            <span key={i} className={i < ballsLeft ? '' : 'is-used'}><Mark size={18} /></span>
          ))}
        </div>
      </div>

      <div className="arena__field">
        <div className="arena__target">
          <span className="arena__shadow" aria-hidden="true" />
          <img className="arena__mon" src={artworkUrl(detail.id)} alt={name} width={240} height={240} />
          {phase === 'aiming' && <div ref={ringRef} className="arena__ring" aria-hidden="true" />}
          <span className="arena__ball" aria-hidden="true" style={{ '--shakes': shakeCount } as CSSProperties}>
            <Mark size={44} />
          </span>
          {phase === 'caught' && <span className="arena__stars" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <i key={i} />)}</span>}
        </div>
      </div>

      <p className="arena__message" role="status" aria-live="assertive">{message}</p>

      <div className="arena__actions">
        {phase === 'caught' || phase === 'fled' ? (
          <>
            <button type="button" className="btn btn-primary" onClick={onAgain}>Volver a la hierba alta</button>
            <Link className="btn" to={`/pokemon/${detail.id}`}>Ver su ficha</Link>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-primary arena__throw" onClick={throwBall} disabled={phase !== 'aiming'}>
              Lanzar Poké Ball
            </button>
            <p className="faint arena__tip">
              {alreadyCaptured ? 'Ya lo tienes capturado: puedes practicar igualmente.' : 'Pulsa cuando el anillo sea pequeño. También con la barra espaciadora.'}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
