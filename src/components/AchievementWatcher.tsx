/**
 * Vigila los logros en segundo plano: al entrar y después de cada captura o combate,
 * recalcula los logros con los datos de la API y, si hay alguno nuevo, lo celebra
 * (aviso, sonido, confeti y el compañero reacciona).
 */
import { useEffect } from 'react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { computeAchievements, markSeen, newlyUnlocked, seenAchievements } from '../lib/achievements'
import type { Achievement } from '../lib/achievements'
import { confetti } from '../lib/confetti'
import { allEntries } from '../lib/entries'
import { emit, onGameEvent } from '../lib/events'
import { readRecord } from '../lib/record'
import { sfx } from '../lib/sfx'
import { useToast } from './Toast'

/** Carga lo necesario y calcula los logros (GET /pokedex, /teams y /pokedex/stats). */
// eslint-disable-next-line react-refresh/only-export-components
export async function loadAchievements(user: string): Promise<Achievement[]> {
  const [entries, teams, stats] = await Promise.all([allEntries(), api.teams(), api.stats()])
  return computeAchievements({ entries, teams, stats, record: readRecord(user) })
}

export function AchievementWatcher() {
  const { user } = useAuth()
  const toast = useToast()

  useEffect(() => {
    if (!user) return
    const name = user.username
    let alive = true
    const check = () => loadAchievements(name).then((all) => {
      if (!alive) return
      const fresh = newlyUnlocked(all, seenAchievements(name))
      markSeen(name, all.filter((a) => a.unlocked).map((a) => a.id))
      fresh.forEach((a, i) => setTimeout(() => {
        toast(`¡Logro desbloqueado: ${a.title}!`)
        sfx.win()
        confetti(70)
        emit('achievement')
      }, 1800 + i * 1600)) // después de la celebración de la captura, uno detrás de otro
    }).catch(() => { /* sin conexión: ya avisarán las pantallas */ })
    check()
    const off = onGameEvent((e) => { if (e !== 'achievement') check() })
    return () => { alive = false; off() }
  }, [user, toast])

  return null
}
