import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { Shell } from './components/Shell'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'
import { PokedexPage } from './pages/PokedexPage'
import { PokemonPage } from './pages/PokemonPage'
import { CapturePage } from './pages/CapturePage'
import { TeamsPage } from './pages/TeamsPage'
import { TeamEditorPage } from './pages/TeamEditorPage'
import { BattlePage } from './pages/BattlePage'
import { ToastProvider } from './components/Toast'

/** Si no hay sesión, manda a /entrar y recuerda adónde querías ir. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, checking } = useAuth()
  const location = useLocation()
  if (checking) return <div className="boot" aria-busy="true"><span className="spinner" /></div>
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
        <Routes>
          <Route path="/entrar" element={<AuthPage />} />
          <Route element={<RequireAuth><Shell /></RequireAuth>}>
            <Route index element={<HomePage />} />
            <Route path="pokedex" element={<PokedexPage />} />
            <Route path="pokemon/:id" element={<PokemonPage />} />
            <Route path="capturar" element={<CapturePage />} />
            <Route path="equipos" element={<TeamsPage />} />
            <Route path="equipos/nuevo" element={<TeamEditorPage />} />
            <Route path="equipos/:id" element={<TeamEditorPage />} />
            <Route path="batalla" element={<BattlePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
