/**
 * El sprite del compañero con su accesorio puesto. Los accesorios son dibujos SVG propios
 * colocados encima del sprite (gorra arriba, gafas en la cara, bufanda abajo…).
 * Como cada Pokémon tiene una forma distinta, las posiciones son aproximadas: es un juego.
 */
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import { savedAccessory } from '../lib/accessories'
import type { AccessoryId } from '../lib/accessories'
import './Wearable.css'

const INK = '#1b2440'

export function AccessoryArt({ id }: { id: AccessoryId }): ReactNode {
  switch (id) {
    case 'gorra':
      return (
        <svg viewBox="0 0 100 60" aria-hidden="true">
          <path d="M14 44 Q14 8 50 8 Q86 8 86 44z" fill="#e8403a" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <path d="M50 8 Q60 8 66 14 L60 44 L40 44 L34 14 Q40 8 50 8z" fill="#fff" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M6 44 H96 Q96 54 84 54 H18 Q6 54 6 44z" fill="#e8403a" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        </svg>
      )
    case 'gafas':
      return (
        <svg viewBox="0 0 100 34" aria-hidden="true">
          <rect x="6" y="6" width="38" height="22" rx="9" fill={INK} />
          <rect x="56" y="6" width="38" height="22" rx="9" fill={INK} />
          <path d="M44 14 H56" stroke={INK} strokeWidth="5" />
          <path d="M14 12 L22 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
          <path d="M64 12 L72 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        </svg>
      )
    case 'bufanda':
      return (
        <svg viewBox="0 0 100 50" aria-hidden="true">
          <path d="M8 12 Q50 30 92 12 L92 26 Q50 44 8 26z" fill="#2fbf71" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <path d="M66 26 L72 48 L84 44 L78 22z" fill="#2fbf71" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M20 18 L24 30 M40 22 L42 34 M60 22 L58 34" stroke="#fff" strokeWidth="3" opacity="0.6" />
        </svg>
      )
    case 'lazo':
      return (
        <svg viewBox="0 0 80 50" aria-hidden="true">
          <path d="M40 25 L8 8 Q2 25 8 42z" fill="#ff5fa2" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <path d="M40 25 L72 8 Q78 25 72 42z" fill="#ff5fa2" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <circle cx="40" cy="25" r="9" fill="#ff8cc0" stroke={INK} strokeWidth="5" />
        </svg>
      )
    case 'corona':
      return (
        <svg viewBox="0 0 100 60" aria-hidden="true">
          <path d="M10 52 L14 14 L34 32 L50 8 L66 32 L86 14 L90 52z" fill="#ffcb05" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
          <circle cx="50" cy="38" r="6" fill="#e8403a" stroke={INK} strokeWidth="3" />
          <circle cx="28" cy="42" r="4.5" fill="#3f8cff" stroke={INK} strokeWidth="3" />
          <circle cx="72" cy="42" r="4.5" fill="#3f8cff" stroke={INK} strokeWidth="3" />
        </svg>
      )
    case 'medalla':
      return (
        <svg viewBox="0 0 60 80" aria-hidden="true">
          <path d="M18 2 L30 30 L42 2z" fill="#3f8cff" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <circle cx="30" cy="52" r="22" fill="#ffcb05" stroke={INK} strokeWidth="5" />
          <path d="M30 40 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z" fill="#fff6cf" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
      )
  }
}

/** Escucha el accesorio guardado del usuario y se actualiza si cambia en el armario. */
// eslint-disable-next-line react-refresh/only-export-components
export function useAccessory(): AccessoryId | null {
  const { user } = useAuth()
  const [acc, setAcc] = useState<AccessoryId | null>(() => (user ? savedAccessory(user.username) : null))
  useEffect(() => {
    const read = () => setAcc(user ? savedAccessory(user.username) : null)
    read()
    window.addEventListener('pokedex:accesorio', read)
    return () => window.removeEventListener('pokedex:accesorio', read)
  }, [user])
  return acc
}

/** Envuelve un sprite y le pone encima el accesorio. */
export function Wearable({ accessory, children }: { accessory: AccessoryId | null; children: ReactNode }) {
  return (
    <span className="wear">
      {children}
      {accessory && <span className={`wear__item wear__item--${accessory}`}><AccessoryArt id={accessory} /></span>}
    </span>
  )
}
