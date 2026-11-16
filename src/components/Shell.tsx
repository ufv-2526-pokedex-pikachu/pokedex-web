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
import { CompanionDock } from './CompanionDock'
import { setSound, sfx, soundOn } from '../lib/sfx'
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

  const [sound, setSoundState] = useState(soundOn)

  useEffect(() => setMenuOpen(false), [pathname])

  // Un «clic» suave al pulsar cualquier botón de juguete (si el sonido está activado).
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element).closest?.('.btn, .nav__item, .tabs__tab, .move, .bench__item, .pool__item, .finder__item, .suggest__item, .kanto__btn')) sfx.tap()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [])

  function toggleSound() {
    const next = !sound
    setSound(next)
    setSoundState(next)
    if (next) sfx.tap()
  }

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
          <button
            type="button" className="btn topbar__sound" onClick={toggleSound} aria-pressed={sound}
            aria-label={sound ? 'Silenciar los sonidos' : 'Activar los sonidos'} title={sound ? 'Sonido activado' : 'Sonido desactivado'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 9h4l5-4v14l-5-4H4z" />
              {sound ? <><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19 6a8.5 8.5 0 0 1 0 12" /></> : <path d="M17 9l5 6M22 9l-5 6" />}
            </svg>
          </button>
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
      <CompanionDock />
    </div>
  )
}
