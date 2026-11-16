/**
 * Fondo de toda la app: cielo, sol o luna, nubes o estrellas y colinas, según la hora real.
 * Va fijo detrás del contenido y se revisa cada minuto por si cambia el momento del día.
 */
import { useEffect, useState } from 'react'
import { SKY, phaseAt } from '../lib/daytime'
import type { Phase } from '../lib/daytime'
import './SkyScene.css'

// eslint-disable-next-line react-refresh/only-export-components
export function usePhase(): Phase {
  const [phase, setPhase] = useState(() => phaseAt(new Date().getHours()))
  useEffect(() => {
    const t = setInterval(() => setPhase(phaseAt(new Date().getHours())), 60_000)
    return () => clearInterval(t)
  }, [])
  return phase
}

export function SkyScene({ phase }: { phase: Phase }) {
  const c = SKY[phase]
  const night = phase === 'noche'
  return (
    <div className={`sky sky--${phase}`} style={{ background: c.sky }} aria-hidden="true">
      <span className="sky__sun" style={{ background: c.sun }} />
      {night
        ? Array.from({ length: 34 }, (_, i) => (
          <i key={i} className="sky__star" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 55}%`, animationDelay: `${(i % 7) * 0.6}s` }} />
        ))
        : (
          <>
            <span className="sky__cloud sky__cloud--a" />
            <span className="sky__cloud sky__cloud--b" />
            <span className="sky__cloud sky__cloud--c" />
          </>
        )}
      <svg className="sky__hills" viewBox="0 0 1440 360" preserveAspectRatio="none">
        <path d="M0 130 Q260 40 520 110 T1040 80 T1440 90 V360 H0z" fill={c.far} />
        <path d="M0 210 Q300 140 640 195 T1440 165 V360 H0z" fill={c.mid} />
        <path d="M0 290 Q400 245 760 280 T1440 262 V360 H0z" fill={c.near} />
      </svg>
    </div>
  )
}
