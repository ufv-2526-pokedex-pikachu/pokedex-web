/**
 * Botón «Continuar con Google» con la librería oficial de Google (Google Identity Services).
 * Google da a la web un ID token firmado; la web se lo pasa al puente, que lo verifica.
 * Si no hay VITE_GOOGLE_CLIENT_ID en el .env, el botón no se pinta.
 */
import { useEffect, useRef, useState } from 'react'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const GSI_SRC = 'https://accounts.google.com/gsi/client'

interface GoogleId {
  initialize(cfg: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }): void
  renderButton(el: HTMLElement, opts: Record<string, string | number>): void
}
declare global {
  interface Window { google?: { accounts: { id: GoogleId } } }
}

let loading: Promise<void> | null = null
function loadGsi(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve()
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = GSI_SRC
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => { loading = null; reject(new Error('No se ha podido cargar Google')) }
    document.head.appendChild(s)
  })
  return loading
}

// eslint-disable-next-line react-refresh/only-export-components
export const googleEnabled = Boolean(CLIENT_ID)

export function GoogleButton({ onCredential, disabled }: { onCredential: (credential: string) => void; disabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  // La librería guarda el callback al iniciar; con una ref siempre llama al más reciente.
  const cb = useRef(onCredential)
  useEffect(() => { cb.current = onCredential }, [onCredential])

  useEffect(() => {
    if (!CLIENT_ID) return
    let alive = true
    loadGsi()
      .then(() => {
        if (!alive || !ref.current || !window.google) return
        window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: (r) => cb.current(r.credential), ux_mode: 'popup' })
        window.google.accounts.id.renderButton(ref.current, {
          type: 'standard', theme: 'filled_black', size: 'large', shape: 'pill',
          text: 'continue_with', locale: 'es', width: Math.min(360, ref.current.clientWidth || 360),
        })
      })
      .catch(() => alive && setFailed(true))
    return () => { alive = false }
  }, [])

  if (!CLIENT_ID) return null
  if (failed) return <p className="hint">No se ha podido cargar el botón de Google. Revisa la conexión.</p>
  return <div ref={ref} className={`google-btn ${disabled ? 'is-disabled' : ''}`} aria-busy={disabled} />
}
