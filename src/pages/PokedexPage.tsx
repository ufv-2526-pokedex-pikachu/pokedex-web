/**
 * Mi Pokédex: la lista de GET /pokedex con sus filtros (capturados, vistos, favoritos),
 * orden y paginación. El estado vive en la URL (?tab=…&sort=…&page=…), así que
 * el botón Atrás y recargar la página mantienen lo que estabas mirando.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { PokedexEntry, PokedexQuery, PokedexStats } from '../api/types'
import { TypePills } from '../components/TypePill'
import { useToast } from '../components/Toast'
import { dexNumber, displayName, splitTypes } from '../lib/pokemon'
import { formatDate } from '../lib/format'
import './PokedexPage.css'

const PAGE_SIZE = 20

const TABS = [
  { id: 'todos', label: 'Todos', filter: {}, count: (s: PokedexStats) => s.total_pokemon },
  { id: 'capturados', label: 'Capturados', filter: { captured: true }, count: (s: PokedexStats) => s.captured },
  { id: 'vistos', label: 'Vistos', filter: { captured: false }, count: (s: PokedexStats) => s.total_pokemon - s.captured },
  { id: 'favoritos', label: 'Favoritos', filter: { favorite: true }, count: (s: PokedexStats) => s.favorites },
] as const

const SORTS = [
  { id: 'pokemon_id', label: 'Número' },
  { id: 'pokemon_name', label: 'Nombre' },
  { id: 'capture_date', label: 'Fecha de captura' },
] as const

const EMPTY_TEXT: Record<string, string> = {
  todos: 'Tu Pokédex está vacía. Elige un Pokémon en el muro de Kanto para añadirlo.',
  capturados: 'Todavía no has capturado ningún Pokémon.',
  vistos: 'No tienes Pokémon vistos sin capturar.',
  favoritos: 'No tienes favoritos. Marca la estrella de un Pokémon para guardarlo aquí.',
}

export function PokedexPage() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tab = TABS.find((t) => t.id === params.get('tab')) ?? TABS[0]
  const sort = (SORTS.find((s) => s.id === params.get('sort')) ?? SORTS[0]).id
  const order = params.get('order') === 'desc' ? 'desc' : 'asc'
  const page = Math.max(1, Number(params.get('page')) || 1)

  const [entries, setEntries] = useState<PokedexEntry[] | null>(null)
  const [stats, setStats] = useState<PokedexStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null)

  const update = useCallback((changes: Record<string, string | null>) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(changes)) {
        if (v === null) next.delete(k)
        else next.set(k, v)
      }
      if (!('page' in changes)) next.delete('page')
      return next
    })
  }, [setParams])

  useEffect(() => {
    let alive = true
    setEntries(null)
    setError(null)
    const query: PokedexQuery = { ...tab.filter, sort, order, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }
    Promise.all([api.pokedex(query), api.stats()])
      .then(([e, s]) => { if (alive) { setEntries(e); setStats(s) } })
      .catch((err) => { if (alive) setError(err instanceof ApiError ? err.message : 'No se ha podido cargar tu Pokédex.') })
    return () => { alive = false }
  }, [tab, sort, order, page])

  const total = stats ? tab.count(stats) : null
  const pages = total ? Math.ceil(total / PAGE_SIZE) : 1

  async function toggleFavorite(entry: PokedexEntry) {
    const favorite = !entry.favorite
    setEntries((list) => list?.map((e) => (e.id === entry.id ? { ...e, favorite } : e)) ?? null)
    try {
      await api.updateEntry(entry.id, { favorite })
      setStats(await api.stats())
      toast(`${displayName(entry.pokemon_name)} ${favorite ? 'añadido a' : 'quitado de'} favoritos`)
    } catch (err) {
      setEntries((list) => list?.map((e) => (e.id === entry.id ? { ...e, favorite: !favorite } : e)) ?? null)
      toast(err instanceof ApiError ? err.message : 'No se ha podido guardar.', 'error')
    }
  }

  async function exportAs(format: 'csv' | 'pdf') {
    setExporting(format)
    try {
      await api.exportPokedex(format, tab.filter)
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'No se ha podido exportar.', 'error')
    } finally {
      setExporting(null)
    }
  }

  const from = (page - 1) * PAGE_SIZE + 1
  const to = (page - 1) * PAGE_SIZE + (entries?.length ?? 0)

  return (
    <div className="dex">
      <div className="title-row">
        <div>
          <h1 className="page-title">Mi Pokédex</h1>
          <p className="muted">
            {stats ? `${stats.total_pokemon} Pokémon, ${stats.captured} capturados.` : 'Cargando…'}
          </p>
        </div>
        <div className="title-row__actions">
          <button type="button" className="btn" disabled={exporting !== null || total === 0} onClick={() => exportAs('csv')}>
            {exporting === 'csv' && <span className="spinner" aria-hidden="true" />}Exportar CSV
          </button>
          <button type="button" className="btn" disabled={exporting !== null || total === 0} onClick={() => exportAs('pdf')}>
            {exporting === 'pdf' && <span className="spinner" aria-hidden="true" />}Exportar PDF
          </button>
        </div>
      </div>

      <div className="tabs dex__tabs" role="tablist" aria-label="Filtrar">
        {TABS.map((t) => (
          <button
            key={t.id} role="tab" aria-selected={t.id === tab.id} className="tabs__tab"
            onClick={() => update({ tab: t.id === 'todos' ? null : t.id })}
          >
            {t.label}
            {stats && <span className="tabs__count num">{t.count(stats)}</span>}
          </button>
        ))}
      </div>

      <div className="toolbar">
        <p className="muted num">
          {total === null || entries === null ? '' : total === 0 ? 'Ninguno' : `${from}–${to} de ${total}`}
        </p>
        <div className="toolbar__sort">
          <label htmlFor="sort" className="muted">Ordenar por</label>
          <select id="sort" className="select" value={sort} onChange={(e) => update({ sort: e.target.value })}>
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <button
            type="button" className="btn btn-ghost" onClick={() => update({ order: order === 'asc' ? 'desc' : null })}
            aria-label={order === 'asc' ? 'Orden ascendente; cambiar a descendente' : 'Orden descendente; cambiar a ascendente'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" style={{ transform: order === 'desc' ? 'scaleY(-1)' : undefined }}>
              <path d="M8 3v10M4 9l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {order === 'asc' ? 'Ascendente' : 'Descendente'}
          </button>
        </div>
      </div>

      {error && <p className="alert" role="alert">{error}</p>}

      <div className="dex-table" role="table" aria-label="Pokémon de tu Pokédex" aria-busy={entries === null}>
        <div className="dex-row dex-row--head" role="row">
          <span role="columnheader">Pokémon</span>
          <span role="columnheader">Tipos</span>
          <span role="columnheader">Estado</span>
          <span role="columnheader"><span className="visually-hidden">Favorito</span></span>
        </div>

        {entries === null && !error && Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="dex-row dex-row--skeleton" aria-hidden="true"><span /></div>
        ))}

        {entries?.length === 0 && (
          <div className="dex-empty">
            <p>{EMPTY_TEXT[tab.id]}</p>
            {tab.id === 'todos' && <Link to="/" className="btn">Ir al muro de Kanto</Link>}
          </div>
        )}

        {entries?.map((e) => (
          <div key={e.id} className="dex-row" role="row">
            <Link to={`/pokemon/${e.pokemon_id}`} className="dex-row__id" role="cell">
              <img src={e.pokemon_sprite} alt="" width={56} height={56} loading="lazy" />
              <span>
                <span className="dex-row__name">{e.nickname ?? displayName(e.pokemon_name)}</span>
                <span className="dex-row__meta num">
                  {dexNumber(e.pokemon_id)}{e.nickname && ` · ${displayName(e.pokemon_name)}`}
                </span>
              </span>
            </Link>
            <span role="cell"><TypePills types={splitTypes(e.pokemon_types)} /></span>
            <span role="cell" className="dex-row__state">
              {e.is_captured
                ? <><span className="dot dot--captured" aria-hidden="true" />Capturado{e.capture_date && <span className="faint"> · {formatDate(e.capture_date)}</span>}</>
                : <><span className="dot" aria-hidden="true" />Visto</>}
            </span>
            <span role="cell">
              <button
                type="button" className={`star ${e.favorite ? 'is-on' : ''}`} onClick={() => toggleFavorite(e)}
                aria-pressed={e.favorite}
                aria-label={`${e.favorite ? 'Quitar de' : 'Añadir a'} favoritos: ${displayName(e.pokemon_name)}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
                </svg>
              </button>
            </span>
          </div>
        ))}
      </div>

      {pages > 1 && (
        <nav className="pager" aria-label="Páginas">
          <button type="button" className="btn" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>Anterior</button>
          <span className="muted num">Página {page} de {pages}</span>
          <button type="button" className="btn" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>Siguiente</button>
        </nav>
      )}
    </div>
  )
}
