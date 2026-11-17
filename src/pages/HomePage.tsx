/**
 * Inicio: el saludo según la hora, tu compañero, tus cifras como pegatinas y el muro de Kanto.
 * Responde de un vistazo a «¿cuánto me falta para completar Kanto?».
 */
import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { PokedexEntry, PokedexStats } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { KantoWall } from '../components/KantoWall'
import type { DexState } from '../components/KantoWall'
import { Mark } from '../components/Mark'
import { Partner } from '../components/Partner'
import { usePhase } from '../components/SkyScene'
import { useTrainerName } from '../components/TrainerMenu'
import { greetingAt } from '../lib/daytime'
import { allEntries } from '../lib/entries'
import { partnerLine, pickPartner, savedPartner } from '../lib/partner'
import { KANTO_TOTAL, TYPE_COLOR, TYPE_ES, splitTypes } from '../lib/pokemon'
import './HomePage.css'

export function HomePage() {
  const { user } = useAuth()
  const trainer = useTrainerName()
  const navigate = useNavigate()
  const phase = usePhase()
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
  const colors = useMemo(
    () => new Map((entries ?? []).map((e) => [e.pokemon_id, TYPE_COLOR[splitTypes(e.pokemon_types)[0]] ?? '#ccc'])),
    [entries],
  )

  const kantoCaptured = (entries ?? []).filter((e) => e.is_captured && e.pokemon_id <= KANTO_TOTAL).length
  const missing = KANTO_TOTAL - kantoCaptured
  const partner = entries && user ? pickPartner(entries, savedPartner(user.username)) : null
  const line = partnerLine({
    phase, captured: stats?.captured ?? 0, missing, streak: stats?.capture_streak_days ?? 0, hasPartner: Boolean(partner),
  })

  return (
    <div className="home">
      <section className="home__hero">
        <div className="home__hello">
          <h1 className="page-title home__title">¡{greetingAt(new Date().getHours())}, {trainer}!</h1>
          <p className="home__lead">
            {entries === null ? 'Abriendo tu Pokédex…'
              : missing === 0 ? 'Has capturado los 151 Pokémon de Kanto.'
                : <>Te faltan <strong>{missing} Pokémon</strong> para completar Kanto. Llevas {kantoCaptured}.</>}
          </p>
          <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={KANTO_TOTAL} aria-valuenow={kantoCaptured} aria-label="Kanto completado">
            <span style={{ width: `${(kantoCaptured / KANTO_TOTAL) * 100}%` }} />
          </div>
          <div className="home__actions">
            <Link to="/capturar" className="btn btn-primary btn-big"><Mark size={24} />Salir a capturar</Link>
            <Link to="/album" className="btn btn-big">Ver mi álbum</Link>
          </div>
        </div>
        {entries !== null && <Partner entry={partner} line={line} />}
      </section>

      {error && <p className="alert" role="alert">{error}</p>}

      <section className="stickers" aria-label="Resumen de tu Pokédex">
        <Sticker color="red" label="Capturados" value={stats?.captured} />
        <Sticker color="blue" label="En tu Pokédex" value={stats?.total_pokemon} />
        <Sticker color="yellow" label="Tipo más común"
          value={stats ? (stats.most_common_type ? TYPE_ES[stats.most_common_type] ?? stats.most_common_type : '—') : undefined} small />
        <Sticker color="green" label="Racha de capturas" value={stats?.capture_streak_days}
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
          : <KantoWall states={states} colors={colors} onSelect={(id) => navigate(`/pokemon/${id}`)} />}
      </section>
    </div>
  )
}

function Sticker({ color, label, value, unit, small = false }: {
  color: 'red' | 'blue' | 'yellow' | 'green'; label: string; value: number | string | undefined; unit?: string; small?: boolean
}) {
  return (
    <div className={`sticker sticker--${color}`} style={{ '--tilt': color === 'red' ? '-1.4deg' : color === 'blue' ? '0.9deg' : color === 'yellow' ? '-0.7deg' : '1.2deg' } as CSSProperties}>
      <span className="sticker__label">{label}</span>
      <span className={`sticker__value num ${small ? 'is-small' : ''}`}>
        {value ?? '…'}{value !== undefined && unit && <small> {unit}</small>}
      </span>
    </div>
  )
}
