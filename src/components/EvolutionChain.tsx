/**
 * Cadena evolutiva navegable, con los datos de la v2 de la API (`evolution_chain`).
 * La v2 da nombres; el número y el sprite salen de tu Pokédex o, si no lo tienes, de GET /pokemon/{nombre}.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PokedexEntry } from '../api/types'
import { evolutionChain, pokemonDetail } from '../lib/entries'
import { dexNumber, displayName, spriteUrl } from '../lib/pokemon'
import { Icon } from './Icon'
import './EvolutionChain.css'

interface Step { name: string; id: number | null }

export function EvolutionChain({ id, entries }: { id: number; entries: PokedexEntry[] | null }) {
  /** undefined = cargando; null = no está en tu Pokédex. */
  const [steps, setSteps] = useState<Step[] | null | undefined>(undefined)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!entries) return
    let alive = true
    setSteps(undefined); setFailed(false)
    const byName = new Map(entries.map((e) => [e.pokemon_name, e.pokemon_id]))
    evolutionChain(id)
      .then(async (chain) => {
        if (chain === null) { if (alive) setSteps(null); return }
        const resolved = await Promise.all(chain.map(async (name) => ({
          name,
          id: byName.get(name) ?? (await pokemonDetail(name).then((d) => d.id).catch(() => null)),
        })))
        if (alive) setSteps(resolved)
      })
      .catch(() => alive && setFailed(true))
    return () => { alive = false }
  }, [id, entries])

  const state = (pid: number | null) => {
    const e = pid ? entries?.find((x) => x.pokemon_id === pid) : undefined
    return e ? (e.is_captured ? 'captured' : 'seen') : 'none'
  }

  return (
    <section className="card evo" aria-labelledby="evo-title">
      <div className="card-head">
        <h2 id="evo-title" className="card-title">Evolución</h2>
        <p className="faint">Datos de la v2 de la API</p>
      </div>
      {failed ? <p className="muted">No se ha podido cargar la evolución. Prueba en un minuto.</p>
        : steps === undefined ? <div className="skel" style={{ height: 112 }} />
          : steps === null ? <p className="muted">Añádelo a tu Pokédex para ver su cadena evolutiva: la API solo la da de tus Pokémon.</p>
            : steps.length <= 1 ? <p className="muted">{displayName(steps[0]?.name ?? '')} no evoluciona.</p>
              : (
                <ol className="evo__list">
                  {steps.map((s, i) => {
                    const st = state(s.id)
                    const current = s.id === id
                    const body = (
                      <>
                        <span className={`evo__sprite is-${st}`}>
                          {s.id && <img src={spriteUrl(s.id)} alt="" width={72} height={72} loading="lazy" />}
                        </span>
                        <span className="evo__name">{displayName(s.name)}</span>
                        <span className="evo__meta num">{s.id ? dexNumber(s.id) : '—'}{st === 'captured' ? ' · capturado' : st === 'seen' ? ' · visto' : ''}</span>
                      </>
                    )
                    return (
                      <li key={s.name} className="evo__step">
                        {i > 0 && <span className="evo__arrow" aria-hidden="true"><Icon name="next" /></span>}
                        {current || !s.id
                          ? <span className={`evo__item ${current ? 'is-current' : ''}`} aria-current={current ? 'page' : undefined}>{body}</span>
                          : <Link to={`/pokemon/${s.id}`} className="evo__item">{body}</Link>}
                      </li>
                    )
                  })}
                </ol>
              )}
    </section>
  )
}
