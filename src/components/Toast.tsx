/**
 * Avisos cortos abajo a la derecha ("Pikachu añadido a favoritos").
 * Se usan con: const toast = useToast(); toast('Texto') o toast('Texto', 'error').
 */
import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import './Toast.css'

type Kind = 'ok' | 'error'
interface Item { id: number; text: string; kind: Kind }

const ToastContext = createContext<(text: string, kind?: Kind) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([])

  const push = useCallback((text: string, kind: Kind = 'ok') => {
    const id = Date.now() + Math.random()
    setItems((list) => [...list.slice(-2), { id, text, kind }])
    setTimeout(() => setItems((list) => list.filter((i) => i.id !== id)), kind === 'error' ? 6000 : 3200)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((i) => (
          <p key={i.id} className={`toast toast--${i.kind}`}>{i.text}</p>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext)
}
