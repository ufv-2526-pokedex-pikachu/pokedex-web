/**
 * Pantalla de acceso: entrar o crear cuenta contra /auth/login y /auth/register.
 * A la derecha, el muro de Kanto en gris: lo que el entrenador va a ir completando.
 */
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { GoogleButton, googleEnabled } from '../components/GoogleButton'
import { KantoWall } from '../components/KantoWall'
import { Wordmark } from '../components/Mark'
import { SkyScene, usePhase } from '../components/SkyScene'
import './AuthPage.css'

type Mode = 'login' | 'register'

const EMPTY = new Map()
const PASSWORD_RULE = 'Mínimo 8 caracteres, con una mayúscula y un número.'

function passwordProblem(p: string): string | null {
  if (p.length < 8 || !/[A-Z]/.test(p) || !/\d/.test(p)) return PASSWORD_RULE
  if (new TextEncoder().encode(p).length > 72) return 'La contraseña no puede ocupar más de 72 bytes.'
  return null
}

export function AuthPage() {
  const { user, login, register, loginWithGoogle } = useAuth()
  const phase = usePhase()
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/'
  if (user) return <Navigate to={from} replace />

  const pwProblem = mode === 'register' && touched ? passwordProblem(password) : null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (mode === 'register' && passwordProblem(password)) return
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') await login(username.trim(), password)
      else await register(username.trim(), email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Algo ha fallado. Prueba otra vez.'
      setError(err instanceof ApiError && err.status === 401 ? 'Usuario o contraseña incorrectos.' : msg)
    } finally {
      setBusy(false)
    }
  }

  async function onGoogle(credential: string) {
    setError(null)
    setBusy(true)
    try {
      await loginWithGoogle(credential)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se ha podido entrar con Google.')
    } finally {
      setBusy(false)
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setTouched(false)
  }

  return (
    <div className={`auth is-${phase}`}>
      <SkyScene phase={phase} />
      <main className="auth__panel">
        <Wordmark />

        <div className="auth__body card">
          <h1 className="auth__title">{mode === 'login' ? 'Entra en tu Pokédex' : 'Empieza tu Pokédex'}</h1>
          <p className="muted auth__lead">
            Captura, organiza tus equipos y combate con los 151 Pokémon de Kanto.
          </p>

          <div className="tabs" role="tablist" aria-label="Acceso">
            <button role="tab" aria-selected={mode === 'login'} className="tabs__tab" onClick={() => switchMode('login')}>
              Entrar
            </button>
            <button role="tab" aria-selected={mode === 'register'} className="tabs__tab" onClick={() => switchMode('register')}>
              Crear cuenta
            </button>
          </div>

          <form className="auth__form" onSubmit={onSubmit} noValidate>
            <div className="field">
              <label htmlFor="username">Usuario</label>
              <input
                id="username" className="input" autoComplete="username" required minLength={3} maxLength={50}
                value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ash"
              />
            </div>

            {mode === 'register' && (
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email" type="email" className="input" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ash@pokemon.com"
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password" type="password" className="input" required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                aria-invalid={pwProblem ? true : undefined}
                aria-describedby={mode === 'register' ? 'pw-rule' : undefined}
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
              {mode === 'register' && (
                <p id="pw-rule" className="hint" style={pwProblem ? { color: 'var(--pill-negative-ink)' } : undefined}>
                  {pwProblem ?? PASSWORD_RULE}
                </p>
              )}
            </div>

            {error && <p className="alert" role="alert">{error}</p>}

            <button type="submit" className="btn btn-primary btn-block" disabled={busy || !username || !password}>
              {busy && <span className="spinner" aria-hidden="true" />}
              {mode === 'login' ? 'Entrar' : 'Crear cuenta y entrar'}
            </button>
          </form>

          {googleEnabled && (
            <>
              <p className="divider"><span>o</span></p>
              <GoogleButton onCredential={onGoogle} disabled={busy} />
            </>
          )}
        </div>

        <p className="faint auth__foot">
          Proyecto de la asignatura · Pokédex API con FastAPI
        </p>
      </main>

      <aside className="auth__wall" aria-label="Los 151 Pokémon de Kanto">
        <KantoWall states={EMPTY} preview />
        <p className="auth__caption">
          <span className="num">151</span> Pokémon en Kanto. Cada uno que captures se enciende aquí.
        </p>
      </aside>
    </div>
  )
}
