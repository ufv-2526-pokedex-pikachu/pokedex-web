/**
 * Álbum: la colección como un archivador de cartas. Los 151 de Kanto en orden:
 * capturados = carta holográfica, vistos = carta en silueta, el resto = reverso.
 * Al abrir una carta, esa misma carta vuela hasta la ficha (View Transitions API).
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams, useViewTransitionState } from 'react-router-dom'
import { ApiError } from '../api/client'
import type { PokedexEntry } from '../api/types'
import { CardBack, MiniCard } from '../components/MiniCard'
import { CARD_TRANSITION } from '../components/useHoloTilt'
import { allEntries } from '../lib/entries'
import { KANTO_TOTAL, dexNumber, displayName, splitTypes } from '../lib/pokemon'
import './AlbumPage.css'

const FILTERS = [
  { id: 'todas', label: 'Todas' },
  { id: 'capturadas', label: 'Capturadas' },
  { id: 'faltan', label: 'Por conseguir' },
] as const
type Filter = (typeof FILTERS)[number]['id']

export function AlbumPage() {
  const [params, setParams] = useSearchParams()
  const filter = (FILTERS.find((f) => f.id === params.get('ver'))?.id ?? 'todas') as Filter
  const [entries, setEntries] = useState<PokedexEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    allEntries().then(setEntries).catch((err) => setError(err instanceof ApiError ? err.message : 'No se ha podido cargar tu colección.'))
  }, [])

  const byId = useMemo(() => new Map((entries ?? []).map((e) => [e.pokemon_id, e])), [entries])
  const captured = (entries ?? []).filter((e) => e.is_captured)
  const kantoCaptured = captured.filter((e) => e.pokemon_id <= KANTO_TOTAL).length
  // Los de fuera de Kanto que tengas van al final, después del 151.
  const ids = useMemo(() => {
    const extra = (entries ?? []).map((e) => e.pokemon_id).filter((id) => id > KANTO_TOTAL).sort((a, b) => a - b)
    const all = [...Array.from({ length: KANTO_TOTAL }, (_, i) => i + 1), ...extra]
    if (filter === 'capturadas') return all.filter((id) => byId.get(id)?.is_captured)
    if (filter === 'faltan') return all.filter((id) => !byId.get(id)?.is_captured)
    return all
  }, [entries, byId, filter])

  const pct = Math.round((kantoCaptured / KANTO_TOTAL) * 100)

  return (
    <div className="album">
      <div className="title-row">
        <div>
          <h1 className="page-title">Álbum</h1>
          <p className="muted num">
            {entries === null ? 'Abriendo el álbum…' : `${kantoCaptured} de ${KANTO_TOTAL} cartas de Kanto · ${pct} %`}
          </p>
        </div>
        <div className="title-row__actions">
          <Link to="/capturar" className="btn btn-primary">Conseguir más</Link>
        </div>
      </div>

      <div className="album__progress" role="progressbar" aria-valuemin={0} aria-valuemax={KANTO_TOTAL} aria-valuenow={kantoCaptured} aria-label="Cartas de Kanto conseguidas">
        <span style={{ transform: `scaleX(${kantoCaptured / KANTO_TOTAL})` }} />
      </div>

      <div className="tabs" role="tablist" aria-label="Filtrar cartas">
        {FILTERS.map((f) => (
          <button key={f.id} role="tab" aria-selected={f.id === filter} className="tabs__tab"
            onClick={() => setParams(f.id === 'todas' ? {} : { ver: f.id })}>
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="alert" role="alert">{error}</p>}

      {entries === null && !error ? (
        <ul className="album__grid" aria-busy="true">
          {Array.from({ length: 12 }, (_, i) => <li key={i}><span className="album__skel" /></li>)}
        </ul>
      ) : ids.length === 0 ? (
        <p className="muted album__empty">
          {filter === 'capturadas' ? 'Aún no tienes cartas. Captura tu primer Pokémon y aparecerá aquí.' : '¡Lo tienes todo! Has completado Kanto.'}
        </p>
      ) : (
        <ul className="album__grid">
          {ids.map((id) => <AlbumSlot key={id} id={id} entry={byId.get(id)} />)}
        </ul>
      )}
    </div>
  )
}

function AlbumSlot({ id, entry }: { id: number; entry?: PokedexEntry }) {
  const to = `/pokemon/${id}`
  // Solo la carta que se está abriendo lleva el nombre de la transición (debe ser único en la página).
  const opening = useViewTransitionState(to)
  const label = entry
    ? `${entry.nickname ?? displayName(entry.pokemon_name)}, ${dexNumber(id)}, ${entry.is_captured ? 'capturado' : 'visto'}`
    : `${dexNumber(id)}, por conseguir`
  return (
    <li className="album__slot">
      <Link to={to} viewTransition className="album__link" aria-label={label}>
        {entry
          ? <MiniCard id={id} name={entry.pokemon_name} types={splitTypes(entry.pokemon_types)} nickname={entry.nickname}
              captured={entry.is_captured} favorite={entry.favorite} transitionName={opening ? CARD_TRANSITION : undefined} />
          : <CardBack id={id} />}
      </Link>
    </li>
  )
}
