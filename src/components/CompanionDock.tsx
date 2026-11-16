/**
 * El compañero en pequeño, abajo a la izquierda en todas las pantallas (menos el inicio, donde sale grande).
 * Reacciona a lo que pasa: salta al capturar o ganar, se agita si algo sale mal y se duerme
 * si llevas un rato sin tocar nada; al mover el ratón o pulsar una tecla, se despierta.
 */
import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { PokedexEntry } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { allEntries } from '../lib/entries'
import { REACTION, onGameEvent } from '../lib/events'
import type { GameEvent } from '../lib/events'
import { pickPartner, savedPartner } from '../lib/partner'
import { displayName } from '../lib/pokemon'
import { Sprite } from './Sprite'
import { Wearable, useAccessory } from './Wearable'
import './CompanionDock.css'

const SLEEP_AFTER_MS = 45_000

export function CompanionDock() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [partner, setPartner] = useState<PokedexEntry | null>(null)
  const [mood, setMood] = useState<'idle' | 'happy' | 'sad' | 'sleep'>('idle')
  const [line, setLine] = useState<string | null>(null)
  const timer = useRef(0)
  const sleepTimer = useRef(0)
  const accessory = useAccessory()

  const refresh = useRef(() => {})
  refresh.current = () => {
    if (!user) return
    allEntries().then((list) => setPartner(pickPartner(list, savedPartner(user.username)))).catch(() => {})
  }
  useEffect(() => { refresh.current() }, [user, pathname])

  // Reacciones a lo que pasa en el juego.
  useEffect(() => onGameEvent((e: GameEvent) => {
    clearTimeout(timer.current)
    setMood(e === 'capture' || e === 'win' || e === 'achievement' ? 'happy' : 'sad')
    setLine(REACTION[e])
    if (e === 'capture') refresh.current()
    timer.current = window.setTimeout(() => { setMood('idle'); setLine(null) }, 3200)
  }), [])

  // Se duerme sin actividad y se despierta con ella.
  useEffect(() => {
    const wake = () => {
      clearTimeout(sleepTimer.current)
      setMood((m) => {
        if (m === 'sleep') { setLine('¡Ah! ¿Seguimos?'); clearTimeout(timer.current); timer.current = window.setTimeout(() => setLine(null), 2200); return 'idle' }
        return m
      })
      sleepTimer.current = window.setTimeout(() => { setMood('sleep'); setLine(null) }, SLEEP_AFTER_MS)
    }
    wake()
    const opts = { passive: true }
    window.addEventListener('pointermove', wake, opts)
    window.addEventListener('keydown', wake)
    window.addEventListener('scroll', wake, opts)
    return () => {
      clearTimeout(sleepTimer.current)
      window.removeEventListener('pointermove', wake)
      window.removeEventListener('keydown', wake)
      window.removeEventListener('scroll', wake)
    }
  }, [])

  if (!partner || pathname === '/') return null
  const name = partner.nickname ?? displayName(partner.pokemon_name)
  return (
    <aside className={`dock is-${mood}`} aria-label={`Tu compañero, ${name}`}>
      {line && <p className="dock__bubble" role="status">{line}</p>}
      {mood === 'sleep' && <span className="dock__zzz" aria-hidden="true">Zzz</span>}
      <div className="dock__mon">
        <Wearable accessory={accessory}><Sprite id={partner.pokemon_id} alt={name} /></Wearable>
      </div>
    </aside>
  )
}
