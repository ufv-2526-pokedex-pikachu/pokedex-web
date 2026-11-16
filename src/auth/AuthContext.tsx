/**
 * Sesión del entrenador: quién ha entrado y las acciones de entrar, registrarse y salir.
 * Cualquier pantalla la lee con useAuth().
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, setSessionLostHandler, tokens } from '../api/client'
import type { User } from '../api/types'

interface AuthState {
  user: User | null
  /** true mientras se comprueba si el token guardado sigue valiendo. */
  checking: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  loginWithGoogle: (credential: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(() => tokens.access !== null)

  const logout = useCallback(() => {
    tokens.clear()
    setUser(null)
  }, [])

  useEffect(() => {
    setSessionLostHandler(() => setUser(null))
    if (!tokens.access) return
    api.me()
      .then(setUser)
      .catch(() => tokens.clear())
      .finally(() => setChecking(false))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    await api.login(username, password)
    setUser(await api.me())
  }, [])

  const loginWithGoogle = useCallback(async (credential: string) => {
    await api.googleLogin(credential)
    setUser(await api.me())
  }, [])

  const register = useCallback(async (username: string, email: string, password: string) => {
    await api.register(username, email, password)
    await login(username, password)
  }, [login])

  const value = useMemo(
    () => ({ user, checking, login, register, loginWithGoogle, logout }),
    [user, checking, login, register, loginWithGoogle, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth tiene que usarse dentro de <AuthProvider>')
  return ctx
}
