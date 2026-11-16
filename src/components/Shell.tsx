/**
 * Marco de la app una vez dentro: el cielo de fondo (según la hora), una barra superior flotante
 * tipo pegatina con las secciones y el entrenador, y el contenido de cada página debajo.
 * En el móvil las secciones se pliegan en un menú.
 */
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Wordmark } from './Mark'
import { SkyScene, usePhase } from './SkyScene'
import './Shell.css'

export const NAV = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/pokedex', label: 'Mi Pokédex', end: false },
  { to: '/album', label: 'Álbum', end: false },
  { to: '/capturar', label: 'Capturar', end: false },
  { to: '/equipos', label: 'Equipos', end: false },
  { to: '/batalla', label: 'Batalla', end: false },
] as const

export function Shell() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const phase = usePhase()

  useEffect(() => setMenuOpen(false), [pathname])

  return (
    <div className={`shell is-${phase}`}>
      <SkyScene phase={phase} />
      <header className="topbar">
        <NavLink to="/" className="topbar__brand" aria-label="Pokédex, ir al inicio"><Wordmark /></NavLink>
        <nav className={`topbar__nav ${menuOpen ? 'is-open' : ''}`} aria-label="Secciones" id="secciones">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav__item">
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="topbar__user">
          <span className="avatar" aria-hidden="true">{user?.username.charAt(0).toUpperCase()}</span>
          <span className="topbar__name">{user?.username}</span>
          <button type="button" className="btn btn-ghost topbar__logout" onClick={logout}>Salir</button>
          <button
            type="button" className="btn topbar__menu" aria-expanded={menuOpen} aria-controls="secciones"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setMenuOpen((o) => !o)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              <path d={menuOpen ? 'M4 4l12 12M16 4L4 16' : 'M3 5h14M3 10h14M3 15h14'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      <main className="canvas">
        <Outlet />
      </main>
    </div>
  )
}
