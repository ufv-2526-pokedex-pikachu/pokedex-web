/**
 * Escenario de fondo según el hábitat del Pokémon, dibujado en SVG con colores planos y apagados
 * (el protagonista es el Pokémon: el fondo solo dice dónde estás). Se usa en Capturar y en las batallas.
 */
import type { Habitat } from '../lib/habitat'
import './HabitatScene.css'

const SKY: Record<Habitat, string> = {
  pradera: '#16201a', agua: '#111b24', cueva: '#141312', volcan: '#1e1412', cielo: '#121a25', noche: '#120f1b', nieve: '#141b21',
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
          <path d="M0 190 Q120 140 250 175 T600 160 V330 H0z" fill="#1b291f" />
          <path d="M0 230 Q160 205 320 225 T600 215 V330 H0z" fill="#203222" />
          <Grass y={330} color="#2a4227" />
          <Grass y={300} color="#253a23" step={30} h={14} />
        </>
      )
    case 'agua':
      return (
        <>
          <rect y="170" width="600" height="160" fill="#14273a" />
          <rect y="215" width="600" height="115" fill="#183048" />
          {[190, 235, 270].map((y, i) => (
            <path key={y} d={`M-20 ${y} ${Array.from({ length: 16 }, () => `q20 -8 40 0`).join(' ')}`}
              stroke="#24425f" strokeWidth={i === 2 ? 3 : 2} fill="none" />
          ))}
          <path d="M0 300 Q150 288 300 298 T600 292 V330 H0z" fill="#2a2a22" />
        </>
      )
    case 'cueva':
      return (
        <>
          <path d="M0 0 H600 V20 L570 70 L545 20 L505 95 L470 20 L420 60 L380 18 L330 85 L290 20 L240 55 L200 18 L150 90 L110 22 L60 65 L30 20 L0 40z" fill="#1d1b19" />
          <path d="M0 250 L60 228 L120 245 L200 222 L280 240 L360 220 L450 238 L520 224 L600 236 V330 H0z" fill="#231f1c" />
          <path d="M40 330 L70 290 L110 330z M470 330 L510 280 L560 330z M250 330 L270 305 L300 330z" fill="#2c2723" />
        </>
      )
    case 'volcan':
      return (
        <>
          <path d="M120 230 L260 70 L300 78 L340 70 L480 230z" fill="#2a1914" />
          <path d="M262 72 L282 120 L300 92 L318 125 L338 72" stroke="#6a2c14" strokeWidth="5" fill="none" strokeLinejoin="round" />
          <path d="M0 240 Q150 222 300 238 T600 232 V330 H0z" fill="#25170f" />
          <path d="M0 290 Q200 276 380 292 T600 286 V330 H0z" fill="#2d1c13" />
        </>
      )
    case 'cielo':
      return (
        <>
          <path d="M0 250 L90 200 L160 235 L250 185 L340 230 L430 195 L520 238 L600 210 V330 H0z" fill="#172130" />
          {[[90, 70, 1], [420, 50, 1.3], [260, 120, 0.8]].map(([x, y, s]) => (
            <g key={x} transform={`translate(${x} ${y}) scale(${s})`} fill="#1d2838">
              <circle cx="0" cy="12" r="16" /><circle cx="22" cy="4" r="22" /><circle cx="46" cy="12" r="16" /><rect x="0" y="12" width="46" height="16" />
            </g>
          ))}
          <path d="M0 300 Q160 285 330 298 T600 292 V330 H0z" fill="#1c2a3a" />
        </>
      )
    case 'noche':
      return (
        <>
          <circle cx="480" cy="70" r="34" fill="#2a2638" />
          {[40, 120, 200, 300, 380, 520, 580].map((x, i) => (
            <path key={x} d={`M${x} 330 L${x} ${200 + (i % 3) * 18} M${x - 34} ${250 + (i % 3) * 18} L${x} ${180 + (i % 3) * 18} L${x + 34} ${250 + (i % 3) * 18}z`}
              fill="#19152a" stroke="#19152a" strokeWidth="6" />
          ))}
          <path d="M0 290 Q180 278 360 292 T600 286 V330 H0z" fill="#1d1830" />
        </>
      )
    case 'nieve':
      return (
        <>
          <path d="M0 210 Q140 170 300 205 T600 190 V330 H0z" fill="#212b34" />
          <path d="M0 260 Q180 240 360 258 T600 250 V330 H0z" fill="#29343f" />
          {Array.from({ length: 26 }, (_, i) => (
            <circle key={i} cx={(i * 97) % 600} cy={(i * 53) % 170 + 10} r={i % 3 === 0 ? 2.2 : 1.4} fill="#3c4955" />
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
