/**
 * Carta holográfica de un Pokémon: diseño propio con sus datos reales de la API.
 * Se inclina en 3D hacia el puntero (o con el giroscopio del móvil) y su foil brilla según
 * de dónde viene la luz. Solo brilla si está capturado; la shiny lleva un foil con destellos.
 *
 * La posición de la luz va en variables CSS que se escriben directamente en el elemento:
 * así React no vuelve a pintar la carta 60 veces por segundo.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import type { PokemonDetail } from '../api/types'
import { buildFighter } from '../lib/battle'
import { formatDate } from '../lib/format'
import { REST, fromOrientation, fromPointer } from '../lib/holo'
import type { Holo } from '../lib/holo'
import { TYPE_COLOR, artworkUrl, dexNumber, displayName } from '../lib/pokemon'
import { weaknesses } from '../lib/typechart'
import { TypePill } from './TypePill'
import './HoloCard.css'

interface Props {
  detail: PokemonDetail
  /** 'captured' brilla; 'seen' y null salen apagadas. */
  owned: 'captured' | 'seen' | null
  shiny?: boolean
  nickname?: string | null
  captureDate?: string | null
  trainer?: string
}

const shinyArt = (id: number) =>
  `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/${id}.png`

type IOSOrientation = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> }

export function HoloCard({ detail, owned, shiny = false, nickname, captureDate, trainer }: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const [gyro, setGyro] = useState(false)
  const name = displayName(detail.name)

  // A nivel 50, como en las batallas: sus PS y sus dos ataques más fuertes.
  const fighter = useMemo(() => buildFighter({ id: detail.id, name, types: detail.types, stats: detail.stats }), [detail, name])
  const moves = useMemo(() => [...fighter.moves].sort((a, b) => b.power - a.power).slice(0, 2), [fighter])
  const weak = useMemo(() => weaknesses(detail.types).slice(0, 2), [detail.types])

  const t1 = TYPE_COLOR[detail.types[0]] ?? '#888'
  const t2 = TYPE_COLOR[detail.types[1] ?? detail.types[0]] ?? t1

  function apply(h: Holo) {
    const el = cardRef.current
    if (!el) return
    el.style.setProperty('--rx', String(h.rx))
    el.style.setProperty('--ry', String(h.ry))
    el.style.setProperty('--px', String(h.px))
    el.style.setProperty('--py', String(h.py))
    el.style.setProperty('--hyp', String(h.hyp))
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'touch' && gyro) return
    const r = e.currentTarget.getBoundingClientRect()
    setActive(true)
    apply(fromPointer(e.clientX - r.left, e.clientY - r.top, r.width, r.height))
  }

  function onLeave() {
    setActive(false)
    apply(REST)
  }

  // Giroscopio: en Android llega sin pedir permiso; en iPhone hay que pulsar el botón.
  useEffect(() => {
    if (!gyro) return
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return
      setActive(true)
      apply(fromOrientation(e.beta, e.gamma))
    }
    window.addEventListener('deviceorientation', onTilt)
    return () => window.removeEventListener('deviceorientation', onTilt)
  }, [gyro])

  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const needsPermission = typeof (window.DeviceOrientationEvent as IOSOrientation | undefined)?.requestPermission === 'function'
    if (coarse && 'DeviceOrientationEvent' in window && !needsPermission) setGyro(true)
  }, [])

  const askGyro = async () => {
    const DOE = window.DeviceOrientationEvent as IOSOrientation
    if ((await DOE.requestPermission?.()) === 'granted') setGyro(true)
  }
  const canAskGyro = typeof window !== 'undefined'
    && typeof (window.DeviceOrientationEvent as IOSOrientation | undefined)?.requestPermission === 'function'
    && window.matchMedia('(pointer: coarse)').matches && !gyro

  const holo = owned === 'captured'
  const label = `Carta de ${nickname ?? name}${shiny ? ' shiny' : ''}${holo ? ', holográfica' : owned === 'seen' ? ', vista sin capturar' : ', no está en tu Pokédex'}`

  return (
    <div className="holo-wrap">
      <div
        ref={cardRef}
        className={`holo ${holo ? 'is-holo' : 'is-dull'} ${shiny ? 'is-shiny' : ''} ${active ? 'is-active' : ''}`}
        style={{ '--t1': t1, '--t2': t2 } as CSSProperties}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        onPointerCancel={onLeave}
      >
        <article className="holo__rotator" aria-label={label}>
          <div className="holo__face">
            <header className="holo__top">
              <span className="holo__name">{nickname ?? name}</span>
              <span className="holo__hp num"><small>PS</small>{fighter.maxHp}</span>
            </header>
            {nickname && <p className="holo__species">{name}</p>}

            <div className="holo__window">
              <img src={shiny ? shinyArt(detail.id) : artworkUrl(detail.id)} alt="" width={300} height={300} draggable={false} />
              <span className="holo__foil" aria-hidden="true" />
              {!holo && <span className="holo__stamp">{owned === 'seen' ? 'Visto' : 'Sin capturar'}</span>}
            </div>

            <p className="holo__strip num">
              <span>{dexNumber(detail.id)}</span>
              <span>{(detail.height / 10).toLocaleString('es-ES')} m</span>
              <span>{(detail.weight / 10).toLocaleString('es-ES')} kg</span>
              <span>Nv. 50</span>
            </p>

            <ul className="holo__moves">
              {moves.map((m) => (
                <li key={m.name}>
                  <span className="holo__move-dot" style={{ background: TYPE_COLOR[m.type] }} aria-hidden="true" />
                  <span className="holo__move-name">{m.name}</span>
                  <span className="holo__move-power num">{m.power}</span>
                </li>
              ))}
            </ul>

            <footer className="holo__foot">
              <div>
                <span className="holo__label">Tipo</span>
                <span className="holo__pills">{detail.types.map((t) => <TypePill key={t} type={t} />)}</span>
              </div>
              <div>
                <span className="holo__label">Debilidad</span>
                <span className="holo__pills">{weak.map((t) => <TypePill key={t} type={t} />)}</span>
              </div>
            </footer>
            <p className="holo__mark">
              <span>{holo && captureDate ? `Capturado el ${formatDate(captureDate)}` : 'Pokédex de Kanto'}</span>
              <span>{trainer ? `Entrenador: ${trainer}` : ''}{shiny ? ' · Shiny' : ''}</span>
            </p>
          </div>
          <span className="holo__glare" aria-hidden="true" />
        </article>
      </div>
      {canAskGyro && (
        <button type="button" className="btn btn-ghost holo__gyro" onClick={askGyro}>Mover la carta con el móvil</button>
      )}
    </div>
  )
}
