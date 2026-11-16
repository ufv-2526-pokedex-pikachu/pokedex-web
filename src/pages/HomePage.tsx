/**
 * Inicio: responde "¿cuánto me falta para completar Kanto?".
 * Lo más grande es el muro de los 151; encima, las cifras de /pokedex/stats en una sola tarjeta.
 */
import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { api, ApiError } from '../api/client'
import type { PokedexEntry, PokedexStats } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { KantoWall } from '../components/KantoWall'
import type { DexState } from '../components/KantoWall'
import { KANTO_TOTAL, TYPE_COLOR, TYPE_ES } from '../lib/pokemon'
import './HomePage.css'

/** La API pagina de 100 en 100: pide páginas hasta tenerlas todas. */
async function allEntries(): Promise<PokedexEntry[]> {
  const out: PokedexEntry[] = []
  for (let offset = 0; ; offset += 100) {
    const page = await api.pokedex({ limit: 100, offset })
    out.push(...page)
    if (page.length < 100) return out
  }
}

export function HomePage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<PokedexEntry[] | null>(null)
  const [stats, setStats] = useState<PokedexStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([allEntries(), api.stats()])
      .then(([e, s]) => { setEntries(e); setStats(s) })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se ha podido cargar tu Pokédex.'))
  }, [])

  const states = useMemo(() => {
    const m = new Map<number, DexState>()
    for (const e of entries ?? []) m.set(e.pokemon_id, e.is_captured ? 'captured' : 'seen')
    return m
  }, [entries])

  const kantoCaptured = useMemo(
    () => (entries ?? []).filter((e) => e.is_captured && e.pokemon_id <= KANTO_TOTAL).length,
    [entries],
  )
  const missing = KANTO_TOTAL - kantoCaptured

  return (
    <div className="home">
      <div className="home__head">
        <h1 className="page-title">Hola, {user?.username}</h1>
        <p className="muted">
          {entries === null
            ? 'Cargando tu Pokédex…'
            : missing === 0
              ? 'Has capturado los 151 Pokémon de Kanto.'
              : `Te faltan ${missing} Pokémon para completar Kanto.`}
        </p>
      </div>

      {error && <p className="alert" role="alert">{error}</p>}

      <section className="card figures" aria-label="Resumen de tu Pokédex">
        <Figure label="Kanto" value={entries ? `${kantoCaptured}` : null} unit={`/ ${KANTO_TOTAL}`} />
        <Figure label="En tu Pokédex" value={stats ? `${stats.total_pokemon}` : null} />
        <Figure label="Capturados" value={stats ? `${stats.captured}` : null} />
        <Figure
          label="Capturados de tu Pokédex"
          value={stats ? stats.completion_percentage.toLocaleString('es-ES', { minimumFractionDigits: 1 }) : null}
          unit="%"
        />
        <Figure label="Favoritos" value={stats ? `${stats.favorites}` : null} />
        <div className="figure">
          <span className="figure__label">Tipo más común</span>
          {stats === null ? <span className="figure__value faint">…</span>
            : stats.most_common_type
              ? <span className="type figure__type" style={{ '--t': TYPE_COLOR[stats.most_common_type] } as CSSProperties}>
                  {TYPE_ES[stats.most_common_type] ?? stats.most_common_type}
                </span>
              : <span className="figure__value faint">—</span>}
        </div>
        <Figure label="Racha de capturas" value={stats ? `${stats.capture_streak_days}` : null}
          unit={stats?.capture_streak_days === 1 ? 'día' : 'días'} />
      </section>

      <section className="card kanto-card" aria-labelledby="kanto-title">
        <div className="kanto-card__head">
          <h2 id="kanto-title" className="card-title">Pokédex de Kanto</h2>
          <ul className="legend" aria-label="Leyenda">
            <li><span className="legend__swatch is-captured" />Capturado</li>
            <li><span className="legend__swatch is-seen" />Visto</li>
            <li><span className="legend__swatch" />Pendiente</li>
          </ul>
        </div>
        {entries === null && !error
          ? <div className="kanto-skeleton" aria-busy="true" />
          : <KantoWall states={states} />}
      </section>
    </div>
  )
}

function Figure({ label, value, unit }: { label: string; value: string | null; unit?: string }) {
  return (
    <div className="figure">
      <span className="figure__label">{label}</span>
      <span className="figure__value num">
        {value ?? <span className="faint">…</span>}
        {value !== null && unit && <span className="figure__unit"> {unit}</span>}
      </span>
    </div>
  )
}
