/**
 * Ficha de un Pokémon: lo que dice GET /pokemon/{id} (stats, habilidades, tamaño) y,
 * si está en tu Pokédex, tu registro editable con PATCH /pokedex/{entry_id}.
 * Si no está, se puede añadir desde aquí con POST /pokedex.
 */
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { PokedexEntry, PokedexEntryUpdate, PokemonDetail } from '../api/types'
import { Icon } from '../components/Icon'
import { TypePills } from '../components/TypePill'
import { useToast } from '../components/Toast'
import { allEntries, pokemonDetail } from '../lib/entries'
import { formatDate, localDay, toApiDate, todayIso } from '../lib/format'
import { KANTO_TOTAL, artworkUrl, dexNumber, displayName } from '../lib/pokemon'
import './PokemonPage.css'

const STAT_ES: Record<string, string> = {
  hp: 'PS', attack: 'Ataque', defense: 'Defensa',
  'special-attack': 'Ataque esp.', 'special-defense': 'Defensa esp.', speed: 'Velocidad',
}
const STAT_MAX = 255
const LAST_ID = 1025

function cryUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`
}

export function PokemonPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const toast = useToast()

  const [detail, setDetail] = useState<PokemonDetail | null>(null)
  /** undefined = cargando; null = no está en tu Pokédex. */
  const [entry, setEntry] = useState<PokedexEntry | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [shiny, setShiny] = useState(false)

  useEffect(() => {
    let alive = true
    setDetail(null); setEntry(undefined); setError(null); setShiny(false)
    if (!Number.isInteger(id) || id < 1 || id > LAST_ID) {
      setError('Ese número no corresponde a ningún Pokémon.')
      return
    }
    pokemonDetail(id)
      .then((d) => alive && setDetail(d))
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : 'No se ha podido cargar el Pokémon.'))
    allEntries()
      .then((list) => alive && setEntry(list.find((e) => e.pokemon_id === id) ?? null))
      .catch(() => alive && setEntry(null))
    return () => { alive = false }
  }, [id])

  async function add(captured: boolean) {
    setBusy(true)
    try {
      const created = await api.addEntry({ pokemon_id: id, is_captured: captured })
      setEntry(created)
      toast(`${displayName(created.pokemon_name)} ${captured ? 'capturado' : 'añadido a tu Pokédex'}`)
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'No se ha podido añadir.', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function toggleFavorite() {
    if (!entry) return
    try {
      const updated = await api.updateEntry(entry.id, { favorite: !entry.favorite })
      setEntry(updated)
      toast(updated.favorite ? 'Añadido a favoritos' : 'Quitado de favoritos')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'No se ha podido guardar.', 'error')
    }
  }

  async function downloadCard() {
    try { await api.downloadCard(id) } catch (err) {
      toast(err instanceof ApiError ? err.message : 'No se ha podido descargar la carta.', 'error')
    }
  }

  const name = detail ? displayName(detail.name) : entry ? displayName(entry.pokemon_name) : dexNumber(id)
  const statTotal = detail ? Object.values(detail.stats).reduce((a, b) => a + b, 0) : 0
  const art = shiny
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${id}.png`
    : artworkUrl(id)

  return (
    <div className="mon">
      <nav className="mon__nav" aria-label="Pokémon anterior y siguiente">
        <Link to="/pokedex" className="btn btn-ghost"><Icon name="back" />Mi Pokédex</Link>
        <span className="mon__steps">
          <button type="button" className="btn btn-ghost num" disabled={id <= 1} onClick={() => navigate(`/pokemon/${id - 1}`)}>
            <Icon name="prev" />{id > 1 ? dexNumber(id - 1) : ''}
          </button>
          <button type="button" className="btn btn-ghost num" disabled={id >= LAST_ID} onClick={() => navigate(`/pokemon/${id + 1}`)}>
            {id < LAST_ID ? dexNumber(id + 1) : ''}<Icon name="next" />
          </button>
        </span>
      </nav>

      {error && <p className="alert" role="alert">{error}</p>}

      {!error && (
        <>
          <section className="card mon__head">
            <div className={`mon__art ${entry?.is_captured ? 'is-captured' : ''}`}>
              <img src={art} alt={`Ilustración de ${name}`} width={240} height={240} />
            </div>
            <div className="mon__info">
              <p className="faint num">{dexNumber(id)}{id <= KANTO_TOTAL && ' · Kanto'}</p>
              <h1 className="mon__name">{entry?.nickname ?? name}</h1>
              {entry?.nickname && <p className="muted">{name}</p>}
              {detail ? <TypePills types={detail.types} /> : <span className="mon__types-skel" />}
              <p className="mon__status">
                {entry === undefined ? <span className="faint">Comprobando tu Pokédex…</span>
                  : entry === null ? <><span className="dot" aria-hidden="true" />No está en tu Pokédex</>
                    : entry.is_captured
                      ? <><span className="dot dot--captured" aria-hidden="true" />Capturado{entry.capture_date && ` el ${formatDate(entry.capture_date)}`}</>
                      : <><span className="dot" aria-hidden="true" />Visto, sin capturar</>}
              </p>
              <div className="mon__actions">
                {entry === null && (
                  <>
                    <button type="button" className="btn btn-primary" disabled={busy} onClick={() => add(true)}>Lo he capturado</button>
                    <button type="button" className="btn" disabled={busy} onClick={() => add(false)}>Añadir como visto</button>
                  </>
                )}
                {entry && (
                  <button type="button" className={`btn ${entry.favorite ? 'is-fav' : ''}`} aria-pressed={entry.favorite} onClick={toggleFavorite}>
                    <Icon name="star" filled={entry.favorite} />Favorito
                  </button>
                )}
                <CryButton id={id} />
                <button type="button" className="btn" onClick={downloadCard}>Carta en PDF</button>
              </div>
            </div>
          </section>

          <div className="mon__grid">
            <section className="card mon__stats" aria-labelledby="stats-title">
              <div className="card-head">
                <h2 id="stats-title" className="card-title">Estadísticas base</h2>
                {detail && <p className="muted num">Total {statTotal}</p>}
              </div>
              {detail ? (
                <dl className="stats">
                  {Object.entries(detail.stats).map(([k, v]) => (
                    <div key={k} className="stat">
                      <dt>{STAT_ES[k] ?? k}</dt>
                      <dd className="num">{v}</dd>
                      <span className="stat__bar" aria-hidden="true"><span style={{ width: `${(v / STAT_MAX) * 100}%` }} /></span>
                    </div>
                  ))}
                </dl>
              ) : <div className="skel" style={{ height: 228 }} />}
            </section>

            <section className="card mon__facts" aria-labelledby="facts-title">
              <h2 id="facts-title" className="card-title">Datos</h2>
              {detail ? (
                <dl className="facts">
                  <div><dt>Altura</dt><dd className="num">{(detail.height / 10).toLocaleString('es-ES')} m</dd></div>
                  <div><dt>Peso</dt><dd className="num">{(detail.weight / 10).toLocaleString('es-ES')} kg</dd></div>
                  <div><dt>Habilidades</dt><dd>{detail.abilities.map(displayName).join(', ')}</dd></div>
                </dl>
              ) : <div className="skel" style={{ height: 120 }} />}
              <div className="sprites">
                <p className="muted">Variante</p>
                <div className="segmented" role="group" aria-label="Variante de la ilustración">
                  <button type="button" aria-pressed={!shiny} onClick={() => setShiny(false)}>Normal</button>
                  <button type="button" aria-pressed={shiny} onClick={() => setShiny(true)}>Shiny</button>
                </div>
              </div>
            </section>

            {entry && <EntryForm entry={entry} onSaved={setEntry} onDeleted={() => setEntry(null)} />}
          </div>
        </>
      )}
    </div>
  )
}

function CryButton({ id }: { id: number }) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  useEffect(() => () => audio.current?.pause(), [id])

  function play() {
    audio.current?.pause()
    const a = new Audio(cryUrl(id))
    a.volume = 0.4
    a.onended = () => setPlaying(false)
    a.onerror = () => setPlaying(false)
    audio.current = a
    setPlaying(true)
    a.play().catch(() => setPlaying(false))
  }

  return (
    <button type="button" className="btn" onClick={play} aria-label="Escuchar su grito">
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor" />
        <path d={playing ? 'M11 5.5c1 .7 1 4.3 0 5M12.8 3.8c2 1.6 2 6.8 0 8.4' : 'M11 5.5c1 .7 1 4.3 0 5'} stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </svg>
      Grito
    </button>
  )
}

/** Tu registro de este Pokémon: apodo, notas y captura. Solo manda a la API lo que ha cambiado. */
function EntryForm({ entry, onSaved, onDeleted }: {
  entry: PokedexEntry
  onSaved: (e: PokedexEntry) => void
  onDeleted: () => void
}) {
  const toast = useToast()
  const [nickname, setNickname] = useState(entry.nickname ?? '')
  const [notes, setNotes] = useState(entry.notes ?? '')
  const [captured, setCaptured] = useState(entry.is_captured)
  const [date, setDate] = useState((entry.capture_date ? localDay(entry.capture_date) : ''))
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    setNickname(entry.nickname ?? ''); setNotes(entry.notes ?? '')
    setCaptured(entry.is_captured); setDate((entry.capture_date ? localDay(entry.capture_date) : ''))
  }, [entry])

  const changes: PokedexEntryUpdate = {}
  if (nickname.trim() !== (entry.nickname ?? '')) changes.nickname = nickname.trim() || null
  if (notes.trim() !== (entry.notes ?? '')) changes.notes = notes.trim() || null
  if (captured !== entry.is_captured) changes.is_captured = captured
  if (captured && date && date !== (entry.capture_date ? localDay(entry.capture_date) : '')) changes.capture_date = toApiDate(date)
  const dirty = Object.keys(changes).length > 0

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!dirty) return
    setSaving(true)
    try {
      onSaved(await api.updateEntry(entry.id, changes))
      toast('Cambios guardados')
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'No se ha podido guardar.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    try {
      await api.deleteEntry(entry.id)
      toast(`${displayName(entry.pokemon_name)} eliminado de tu Pokédex`)
      onDeleted()
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'No se ha podido eliminar.', 'error')
    }
  }

  return (
    <section className="card mon__entry" aria-labelledby="entry-title">
      <h2 id="entry-title" className="card-title">Tu registro</h2>
      <form className="entry-form" onSubmit={save}>
        <div className="field">
          <label htmlFor="nickname">Apodo</label>
          <input id="nickname" className="input" maxLength={50} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Sin apodo" />
        </div>
        <div className="field entry-form__notes">
          <label htmlFor="notes">Notas</label>
          <textarea id="notes" className="input textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dónde lo viste, cómo lo capturaste…" />
        </div>
        <label className="check">
          <input type="checkbox" checked={captured} onChange={(e) => { setCaptured(e.target.checked); if (e.target.checked && !date) setDate(todayIso()) }} />
          Capturado
        </label>
        <div className="field">
          <label htmlFor="date">Fecha de captura</label>
          <input id="date" type="date" className="input" disabled={!captured} max={todayIso()} value={captured ? date : ''} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="entry-form__actions">
          <button type="submit" className="btn btn-primary" disabled={!dirty || saving}>
            {saving && <span className="spinner" aria-hidden="true" />}Guardar cambios
          </button>
          {confirmDelete ? (
            <span className="confirm">
              <span className="muted">¿Eliminar de tu Pokédex?</span>
              <button type="button" className="btn btn-danger" onClick={remove}>Eliminar</button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Cancelar</button>
            </span>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(true)}>Eliminar de mi Pokédex</button>
          )}
        </div>
      </form>
    </section>
  )
}
