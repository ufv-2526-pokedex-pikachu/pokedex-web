/**
 * Escenario de fondo según el hábitat del Pokémon, dibujado en SVG con colores planos y vivos,
 * como una foto del Pokémon en su sitio. Se usa en Capturar y en las batallas.
 */
import type { Habitat } from '../lib/habitat'
import './HabitatScene.css'

const SKY: Record<Habitat, string> = {
  pradera: '#9fe0ff', agua: '#9fdcff', cueva: '#cbb9a4', volcan: '#ffb38a', cielo: '#a9dcff', noche: '#3a3f7a', nieve: '#d7ecff',
}

function Grass({ y, color, step = 22, h = 18 }: { y: number; color: string; step?: number; h?: number }) {
  const d = Array.from({ length: Math.ceil(620 / step) }, (_, i) => {
    const x = i * step - 6
    return `M${x} ${y} q4 -${h} 7 0 q3 -${h * 0.8} 6 0 q4 -${h * 1.1} 8 0z`
  }).join(' ')
  return <path d={d} fill={color} />
}

function Scene({ habitat }: { habitat: Habitat }) {
  switch (habitat) {
    case 'pradera':
      return (
        <>
          <path d="M0 190 Q120 140 250 175 T600 160 V330 H0z" fill="#8edb76" />
          <path d="M0 230 Q160 205 320 225 T600 215 V330 H0z" fill="#6cc65a" />
          <Grass y={330} color="#4e9f43" />
          <Grass y={300} color="#5fb84f" step={30} h={14} />
        </>
      )
    case 'agua':
      return (
        <>
          <rect y="170" width="600" height="160" fill="#4fa8e8" />
          <rect y="215" width="600" height="115" fill="#3b8fd6" />
          {[190, 235, 270].map((y, i) => (
            <path key={y} d={`M-20 ${y} ${Array.from({ length: 16 }, () => `q20 -8 40 0`).join(' ')}`}
              stroke="#cdeaff" strokeWidth={i === 2 ? 3 : 2} fill="none" />
          ))}
          <path d="M0 300 Q150 288 300 298 T600 292 V330 H0z" fill="#f2d38c" />
        </>
      )
    case 'cueva':
      return (
        <>
          <path d="M0 0 H600 V20 L570 70 L545 20 L505 95 L470 20 L420 60 L380 18 L330 85 L290 20 L240 55 L200 18 L150 90 L110 22 L60 65 L30 20 L0 40z" fill="#a28f7a" />
          <path d="M0 250 L60 228 L120 245 L200 222 L280 240 L360 220 L450 238 L520 224 L600 236 V330 H0z" fill="#8f7b66" />
          <path d="M40 330 L70 290 L110 330z M470 330 L510 280 L560 330z M250 330 L270 305 L300 330z" fill="#7a6654" />
        </>
      )
    case 'volcan':
      return (
        <>
          <path d="M120 230 L260 70 L300 78 L340 70 L480 230z" fill="#c45a3c" />
          <path d="M262 72 L282 120 L300 92 L318 125 L338 72" stroke="#ff7a1a" strokeWidth="5" fill="none" strokeLinejoin="round" />
          <path d="M0 240 Q150 222 300 238 T600 232 V330 H0z" fill="#a34a32" />
          <path d="M0 290 Q200 276 380 292 T600 286 V330 H0z" fill="#8a3a28" />
        </>
      )
    case 'cielo':
      return (
        <>
          <path d="M0 250 L90 200 L160 235 L250 185 L340 230 L430 195 L520 238 L600 210 V330 H0z" fill="#7fb3e0" />
          {[[90, 70, 1], [420, 50, 1.3], [260, 120, 0.8]].map(([x, y, s]) => (
            <g key={x} transform={`translate(${x} ${y}) scale(${s})`} fill="#ffffff">
              <circle cx="0" cy="12" r="16" /><circle cx="22" cy="4" r="22" /><circle cx="46" cy="12" r="16" /><rect x="0" y="12" width="46" height="16" />
            </g>
          ))}
          <path d="M0 300 Q160 285 330 298 T600 292 V330 H0z" fill="#cfe9ff" />
        </>
      )
    case 'noche':
      return (
        <>
          <circle cx="480" cy="70" r="34" fill="#fff3c4" />
          {[40, 120, 200, 300, 380, 520, 580].map((x, i) => (
            <path key={x} d={`M${x} 330 L${x} ${200 + (i % 3) * 18} M${x - 34} ${250 + (i % 3) * 18} L${x} ${180 + (i % 3) * 18} L${x + 34} ${250 + (i % 3) * 18}z`}
              fill="#2a2d5c" stroke="#2a2d5c" strokeWidth="6" />
          ))}
          <path d="M0 290 Q180 278 360 292 T600 286 V330 H0z" fill="#23264f" />
        </>
      )
    case 'nieve':
      return (
        <>
          <path d="M0 210 Q140 170 300 205 T600 190 V330 H0z" fill="#ffffff" />
          <path d="M0 260 Q180 240 360 258 T600 250 V330 H0z" fill="#eaf4ff" />
          {Array.from({ length: 26 }, (_, i) => (
            <circle key={i} cx={(i * 97) % 600} cy={(i * 53) % 170 + 10} r={i % 3 === 0 ? 2.2 : 1.4} fill="#ffffff" />
          ))}
        </>
      )
  }
}

export function HabitatScene({ habitat, label }: { habitat: Habitat; label?: string }) {
  return (
    <div className="habitat" style={{ background: SKY[habitat] }} aria-hidden={label ? undefined : true}>
      <svg viewBox="0 0 600 330" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <Scene habitat={habitat} />
      </svg>
      {label && <span className="habitat__label">{label}</span>}
    </div>
  )
}
