/**
 * Marco de la app una vez dentro: barra lateral con las secciones, barra superior con el
 * título de la pantalla y el entrenador, y el contenido de cada página en el centro.
 */
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Wordmark } from './Mark'
import './Shell.css'

export const NAV = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/pokedex', label: 'Mi Pokédex', end: false },
  { to: '/capturar', label: 'Capturar', end: false },
] as const

function titleFor(path: string): string {
  if (path.startsWith('/pokemon/')) return 'Ficha'
  return NAV.find((n) => (n.to === '/' ? path === '/' : path.startsWith(n.to)))?.label ?? 'Pokédex'
}

export function Shell() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => setMenuOpen(false), [pathname])

  return (
    <div className="shell">
      <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
        <div className="sidebar__brand"><Wordmark /></div>
        <nav aria-label="Secciones">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav__item">
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <header className="topbar">
        <button
          type="button" className="btn btn-ghost topbar__menu" aria-expanded={menuOpen}
          aria-label="Abrir menú" onClick={() => setMenuOpen((o) => !o)}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M2 5h14M2 9h14M2 13h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <p className="topbar__title">{titleFor(pathname)}</p>
        <div className="topbar__user">
          <span className="avatar" aria-hidden="true">{user?.username.charAt(0).toUpperCase()}</span>
          <span className="topbar__name">{user?.username}</span>
          <button type="button" className="btn btn-ghost" onClick={logout}>Salir</button>
        </div>
      </header>

      <main className="canvas">
        <Outlet />
      </main>
    </div>
  )
}
