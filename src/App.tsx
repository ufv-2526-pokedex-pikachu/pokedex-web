import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { Shell } from './components/Shell'
import { AuthPage } from './pages/AuthPage'
import { HomePage } from './pages/HomePage'

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
        <Routes>
          <Route path="/entrar" element={<AuthPage />} />
          <Route element={<RequireAuth><Shell /></RequireAuth>}>
            <Route index element={<HomePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
