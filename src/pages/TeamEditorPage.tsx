/**
 * Crear (POST /teams) o editar (PUT /teams/{id}) un equipo.
 * A la izquierda el equipo, ordenable; a la derecha tu Pokédex para elegir.
 * Debajo, lo que aporta el equipo: tipos, debilidades compartidas y stats base.
 */
import { useEffect, useMemo, useState } from 'react'
import type { DragEvent, FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { PokedexEntry, PokemonDetail } from '../api/types'
import { TypePill, TypePills } from '../components/TypePill'
import { useToast } from '../components/Toast'
import { allEntries, pokemonDetail } from '../lib/entries'
import { dexNumber, displayName, splitTypes } from '../lib/pokemon'
import { MAX_TEAM, move } from '../lib/teams'
import { sharedWeaknesses } from '../lib/typechart'
import './TeamEditorPage.css'

const STAT_ES: Record<string, string> = {
  hp: 'PS', attack: 'Ataque', defense: 'Defensa',
  'special-attack': 'Ataque esp.', 'special-defense': 'Defensa esp.', speed: 'Velocidad',
}

export function TeamEditorPage() {
  const params = useParams()
  const teamId = params.id ? Number(params.id) : null
  const navigate = useNavigate()
  const toast = useToast()

  const [entries, setEntries] = useState<PokedexEntry[] | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [ids, setIds] = useState<number[]>([])
  const [filter, setFilter] = useState('')
  const [onlyCaptured, setOnlyCaptured] = useState(true)
  const [details, setDetails] = useState<Map<number, PokemonDetail>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dragFrom, setDragFrom] = useState<number | null>(null)

  useEffect(() => {
    const loadTeam = teamId
      ? api.teams().then((list) => {
        const t = list.find((x) => x.id === teamId)
        if (!t) throw new ApiError(404, 'Ese equipo no existe o no es tuyo.')
        setName(t.name); setDescription(t.description ?? ''); setIds(t.pokemon_ids)
      })
      : Promise.resolve()
    Promise.all([allEntries().then(setEntries), loadTeam])
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se ha podido cargar.'))
  }, [teamId])

  // Stats de cada miembro (GET /pokemon/{id}, con caché): solo de los que están en el equipo.
  useEffect(() => {
    for (const id of ids) {
      if (details.has(id)) continue
      pokemonDetail(id).then((d) => setDetails((m) => new Map(m).set(id, d))).catch(() => {})
    }
  }, [ids, details])

  const byId = useMemo(() => new Map((entries ?? []).map((e) => [e.pokemon_id, e])), [entries])
  const members = ids.map((id) => byId.get(id)).filter((e): e is PokedexEntry => Boolean(e))

  const pool = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return (entries ?? [])
      .filter((e) => (!onlyCaptured || e.is_captured))
      .filter((e) => !q || e.pokemon_name.includes(q) || (e.nickname ?? '').toLowerCase().includes(q) || String(e.pokemon_id) === q)
      .sort((a, b) => Number(b.is_captured) - Number(a.is_captured) || a.pokemon_id - b.pokemon_id)
  }, [entries, filter, onlyCaptured])

  const full = ids.length >= MAX_TEAM
  const add = (id: number) => !full && !ids.includes(id) && setIds([...ids, id])
  const remove = (id: number) => setIds(ids.filter((x) => x !== id))

  function onDrop(e: DragEvent, to: number) {
    e.preventDefault()
    if (dragFrom !== null) setIds(move(ids, dragFrom, to))
    setDragFrom(null)
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError('Ponle un nombre al equipo.'); return }
    if (ids.length === 0) { setError('Añade al menos un Pokémon.'); return }
    setSaving(true)
    const body = { name: name.trim(), description: description.trim() || null, pokemon_ids: ids }
    try {
      const team = teamId ? await api.updateTeam(teamId, body) : await api.createTeam(body)
      toast(`Equipo «${team.name}» guardado`)
      navigate('/equipos')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se ha podido guardar el equipo.')
    } finally {
      setSaving(false)
    }
  }

  // Resumen del equipo
  const teamTypes = members.map((m) => splitTypes(m.pokemon_types))
  const distinctTypes = [...new Set(teamTypes.flat())]
  const weak = sharedWeaknesses(teamTypes)
  const statRows = Object.keys(STAT_ES).map((k) => {
    const values = ids.map((id) => details.get(id)?.stats[k]).filter((v): v is number => v !== undefined)
    return { key: k, avg: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null }
  })
  const totals = ids.map((id) => details.get(id)).filter(Boolean).map((d) => Object.values(d!.stats).reduce((a, b) => a + b, 0))
  const statTotal = totals.reduce((a, b) => a + b, 0)
  const statsReady = ids.length > 0 && totals.length === ids.length

  return (
    <form className="editor" onSubmit={save}>
      <div className="title-row">
        <div>
          <Link to="/equipos" className="btn btn-ghost editor__back">← Equipos</Link>
          <h1 className="page-title">{teamId ? 'Editar equipo' : 'Nuevo equipo'}</h1>
        </div>
        <div className="title-row__actions">
          <Link to="/equipos" className="btn">Cancelar</Link>
          <button type="submit" className="btn btn-primary" disabled={saving || entries === null}>
            {saving && <span className="spinner" aria-hidden="true" />}Guardar equipo
          </button>
        </div>
      </div>

      {error && <p className="alert" role="alert">{error}</p>}

      <div className="editor__grid">
        <section className="card editor__team" aria-labelledby="team-title">
          <h2 id="team-title" className="card-title">Tu equipo <span className="faint num">{ids.length}/{MAX_TEAM}</span></h2>
          <div className="editor__fields">
            <div className="field">
              <label htmlFor="team-name">Nombre</label>
              <input id="team-name" className="input" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Equipo Kanto" />
            </div>
            <div className="field">
              <label htmlFor="team-desc">Descripción</label>
              <input id="team-desc" className="input" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
            </div>
          </div>

          <ol className="members">
            {Array.from({ length: MAX_TEAM }, (_, i) => {
              const m = members[i]
              if (!m) return <li key={`empty-${i}`} className="member member--empty"><span>Hueco libre</span></li>
              return (
                <li
                  key={m.pokemon_id} className={`member ${dragFrom === i ? 'is-dragging' : ''}`}
                  draggable onDragStart={() => setDragFrom(i)} onDragEnd={() => setDragFrom(null)}
                  onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, i)}
                >
                  <span className="member__grip" aria-hidden="true">⋮⋮</span>
                  <img src={m.pokemon_sprite} alt="" width={56} height={56} />
                  <span className="member__text">
                    <span className="member__name">{m.nickname ?? displayName(m.pokemon_name)}</span>
                    <TypePills types={splitTypes(m.pokemon_types)} />
                  </span>
                  <span className="member__tools">
                    <button type="button" className="icon-btn" disabled={i === 0} onClick={() => setIds(move(ids, i, i - 1))} aria-label={`Subir a ${displayName(m.pokemon_name)}`}>↑</button>
                    <button type="button" className="icon-btn" disabled={i === members.length - 1} onClick={() => setIds(move(ids, i, i + 1))} aria-label={`Bajar a ${displayName(m.pokemon_name)}`}>↓</button>
                    <button type="button" className="icon-btn" onClick={() => remove(m.pokemon_id)} aria-label={`Quitar a ${displayName(m.pokemon_name)}`}>✕</button>
                  </span>
                </li>
              )
            })}
          </ol>
        </section>

        <section className="card editor__pool" aria-labelledby="pool-title">
          <div className="card-head">
            <h2 id="pool-title" className="card-title">Tu Pokédex</h2>
            <label className="check check--small">
              <input type="checkbox" checked={onlyCaptured} onChange={(e) => setOnlyCaptured(e.target.checked)} />
              Solo capturados
            </label>
          </div>
          <label htmlFor="pool-q" className="visually-hidden">Filtrar por nombre o número</label>
          <input id="pool-q" className="input" type="search" placeholder="Filtrar por nombre o número" value={filter} onChange={(e) => setFilter(e.target.value)} />
          {entries === null ? <div className="skel" style={{ height: 240 }} />
            : pool.length === 0 ? (
              <p className="muted">
                {entries.length === 0 ? <>Tu Pokédex está vacía. <Link to="/capturar">Captura algún Pokémon</Link> para montar un equipo.</>
                  : 'Ningún Pokémon coincide.'}
              </p>
            ) : (
              <ul className="pool">
                {pool.map((e) => {
                  const inTeam = ids.includes(e.pokemon_id)
                  return (
                    <li key={e.id}>
                      <button
                        type="button" className={`pool__item ${inTeam ? 'is-in' : ''}`} disabled={inTeam || full}
                        onClick={() => add(e.pokemon_id)}
                        aria-label={`${inTeam ? 'Ya está en el equipo' : 'Añadir'}: ${displayName(e.pokemon_name)}`}
                      >
                        <img src={e.pokemon_sprite} alt="" width={64} height={64} loading="lazy" />
                        <span className="pool__name">{e.nickname ?? displayName(e.pokemon_name)}</span>
                        <span className="faint num pool__num">{dexNumber(e.pokemon_id)}{!e.is_captured && ' · visto'}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          {full && <p className="hint">El equipo está completo: quita uno para añadir otro.</p>}
        </section>

        <section className="card editor__summary" aria-labelledby="summary-title">
          <h2 id="summary-title" className="card-title">Cómo es el equipo</h2>
          {ids.length === 0 ? <p className="muted">Añade Pokémon para ver sus tipos, debilidades y stats.</p> : (
            <div className="summary">
              <div className="summary__block">
                <p className="summary__label">Tipos</p>
                <span className="types">{distinctTypes.map((t) => <TypePill key={t} type={t} />)}</span>
              </div>
              <div className="summary__block">
                <p className="summary__label">Debilidades compartidas</p>
                {weak.length === 0
                  ? <p>Ninguna: siempre hay alguien que resiste.</p>
                  : <span className="types">{weak.map((w) => (
                    <span key={w.type} className="weak"><TypePill type={w.type} /><span className="faint num">×{w.count}</span></span>
                  ))}</span>}
              </div>
              <div className="summary__block summary__stats">
                <p className="summary__label">Media de stats base {statsReady && <span className="faint num">· total del equipo {statTotal.toLocaleString('es-ES')}</span>}</p>
                <dl className="stats stats--compact">
                  {statRows.map((s) => (
                    <div key={s.key} className="stat">
                      <dt>{STAT_ES[s.key]}</dt>
                      <dd className="num">{s.avg ?? '…'}</dd>
                      <span className="stat__bar" aria-hidden="true"><span style={{ width: `${((s.avg ?? 0) / 255) * 100}%` }} /></span>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}
        </section>
      </div>
    </form>
  )
}
