/**
 * Arriba a la derecha: tu inicial y tu nombre. Al pulsarlo se abre una tarjeta para ponerte
 * un apodo (cómo te saluda la web) y para salir. Se cierra con Esc o pulsando fuera.
 */
import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { NICKNAME_MAX, defaultNickname, saveNickname, savedNickname, trainerName } from '../lib/nickname'
import './TrainerMenu.css'

/** El nombre del entrenador, al día si se cambia el apodo. */
// eslint-disable-next-line react-refresh/only-export-components
export function useTrainerName(): string {
  const { user } = useAuth()
  const [name, setName] = useState(() => (user ? trainerName(user.username) : ''))
  useEffect(() => {
    const read = () => setName(user ? trainerName(user.username) : '')
    read()
    window.addEventListener('pokedex:apodo', read)
    return () => window.removeEventListener('pokedex:apodo', read)
  }, [user])
  return name
}

export function TrainerMenu() {
  const { user, logout } = useAuth()
  const name = useTrainerName()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    setDraft(user ? savedNickname(user.username) ?? '' : '')
    setSaved(false)
    input.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e: PointerEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown) }
  }, [open, user])

  if (!user) return null

  function submit(e: FormEvent) {
    e.preventDefault()
    saveNickname(user!.username, draft)
    setSaved(true)
  }

  return (
    <div className="trainer" ref={box}>
      <button
        type="button" className="trainer__button" aria-expanded={open} aria-controls={panelId}
        onClick={() => setOpen((o) => !o)} title="Tu perfil"
      >
        <span className="avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
        <span className="trainer__name">{name}</span>
      </button>
      {open && (
        <div className="trainer__panel" id={panelId} role="dialog" aria-label="Tu perfil">
          <p className="trainer__who">
            <strong>{name}</strong>
            <span className="muted">Usuario: {user.username}</span>
          </p>
          <form className="trainer__form" onSubmit={submit}>
            <label htmlFor={`${panelId}-apodo`}>Tu apodo</label>
            <div className="trainer__row">
              <input
                ref={input} id={`${panelId}-apodo`} className="input" maxLength={NICKNAME_MAX} autoComplete="nickname"
                value={draft} onChange={(e) => { setDraft(e.target.value); setSaved(false) }}
                placeholder={defaultNickname(user.username)}
              />
              <button type="submit" className="btn btn-primary">Guardar</button>
            </div>
            <p className="trainer__hint muted" role="status">
              {saved ? '¡Listo! Así te saludaremos.' : 'Así te saluda la web. Vacío = tu nombre de usuario.'}
            </p>
          </form>
          <button type="button" className="btn btn-ghost btn-block" onClick={logout}>Salir</button>
        </div>
      )}
    </div>
  )
}
