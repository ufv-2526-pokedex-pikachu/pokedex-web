/**
 * Logros: tus medallas (calculadas con tus datos de la API) y el armario del compañero,
 * con los accesorios que desbloquean esas medallas.
 */
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { ApiError } from '../api/client'
import type { PokedexEntry } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { loadAchievements } from '../components/AchievementWatcher'
import { Sprite } from '../components/Sprite'
import { AccessoryArt, Wearable, useAccessory } from '../components/Wearable'
import { ACCESSORIES, saveAccessory, unlockedAccessories } from '../lib/accessories'
import type { Achievement } from '../lib/achievements'
import { allEntries } from '../lib/entries'
import { pickPartner, savedPartner } from '../lib/partner'
import { displayName } from '../lib/pokemon'
import { sfx } from '../lib/sfx'
import './AchievementsPage.css'

export function AchievementsPage() {
  const { user } = useAuth()
  const [list, setList] = useState<Achievement[] | null>(null)
  const [partner, setPartner] = useState<PokedexEntry | null>(null)
  const [error, setError] = useState<string | null>(null)
  const accessory = useAccessory()

  useEffect(() => {
    if (!user) return
    Promise.all([loadAchievements(user.username), allEntries()])
      .then(([a, entries]) => { setList(a); setPartner(pickPartner(entries, savedPartner(user.username))) })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'No se han podido cargar tus logros.'))
  }, [user])

  const done = list?.filter((a) => a.unlocked).length ?? 0
  const unlocked = list ? unlockedAccessories(list) : new Set()
  const partnerName = partner ? partner.nickname ?? displayName(partner.pokemon_name) : 'Pikachu'

  function wear(id: (typeof ACCESSORIES)[number]['id'] | null) {
    if (!user) return
    saveAccessory(user.username, id)
    sfx.tap()
  }

  return (
    <div className="logros">
      <div className="title-row">
        <div>
          <h1 className="page-title">Logros</h1>
          <p className="muted num">{list ? `${done} de ${list.length} medallas` : 'Contando tus medallas…'}</p>
        </div>
      </div>

      {error && <p className="alert" role="alert">{error}</p>}

      <section className="card closet" aria-labelledby="closet-title">
        <div className="closet__stage">
          <span className="closet__grass" aria-hidden="true" />
          <Wearable accessory={accessory}>
            <Sprite id={partner?.pokemon_id ?? 25} alt={partnerName} className="closet__mon" />
          </Wearable>
        </div>
        <div className="closet__body">
          <h2 id="closet-title" className="card-title">El armario de {partnerName}</h2>
          <p className="muted">Cada medalla desbloquea un accesorio para tu compañero. Se ve en el inicio y en todas las pantallas.</p>
          <ul className="closet__list">
            <li>
              <button type="button" className={`closet__item ${accessory === null ? 'is-on' : ''}`} aria-pressed={accessory === null} onClick={() => wear(null)}>
                <span className="closet__art closet__art--none" aria-hidden="true">—</span>
                <span>Sin accesorio</span>
              </button>
            </li>
            {ACCESSORIES.map((x) => {
              const open = unlocked.has(x.id)
              const req = list?.find((a) => a.id === x.requires)
              return (
                <li key={x.id}>
                  <button
                    type="button" className={`closet__item ${accessory === x.id ? 'is-on' : ''}`} disabled={!open}
                    aria-pressed={accessory === x.id} onClick={() => wear(x.id)}
                  >
                    <span className="closet__art" aria-hidden="true"><AccessoryArt id={x.id} /></span>
                    <span>{x.name}</span>
                    {!open && <span className="closet__lock">Con «{req?.title ?? x.requires}»</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <ul className="medals" aria-label="Medallas">
        {(list ?? []).map((a) => (
          <li key={a.id} className={`card medal ${a.unlocked ? 'is-on' : ''}`} style={{ '--m': a.color } as CSSProperties}>
            <Medal unlocked={a.unlocked} />
            <div className="medal__text">
              <h2 className="medal__title">{a.title}</h2>
              <p className="muted">{a.description}</p>
              <div className="medal__bar" role="progressbar" aria-valuemin={0} aria-valuemax={a.target} aria-valuenow={a.current} aria-label={`Progreso de ${a.title}`}>
                <span style={{ width: `${(a.current / a.target) * 100}%` }} />
              </div>
              <p className="medal__count num">{a.unlocked ? '¡Conseguida!' : `${a.current} de ${a.target}`}</p>
            </div>
          </li>
        ))}
        {list === null && !error && Array.from({ length: 6 }, (_, i) => <li key={i} className="card medal medal--skel" aria-hidden="true" />)}
      </ul>
    </div>
  )
}

/** Medalla dibujada: cinta y disco con estrella. Sin conseguir, en gris con un candado. */
function Medal({ unlocked }: { unlocked: boolean }) {
  return (
    <svg className="medal__art" viewBox="0 0 80 100" aria-hidden="true">
      <path d="M22 2 L40 40 L58 2z" fill={unlocked ? 'var(--m)' : '#c5cddd'} stroke="#1b2440" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="40" cy="64" r="30" fill={unlocked ? 'var(--m)' : '#dfe4ee'} stroke="#1b2440" strokeWidth="5" />
      <circle cx="40" cy="64" r="20" fill={unlocked ? '#fff' : '#eef2f8'} stroke="#1b2440" strokeWidth="3" />
      {unlocked
        ? <path d="M40 50 l5 10 11 1.5 -8 7.5 2 11 -10 -5.5 -10 5.5 2 -11 -8 -7.5 11 -1.5z" fill="var(--m)" stroke="#1b2440" strokeWidth="2.5" strokeLinejoin="round" />
        : <><rect x="31" y="62" width="18" height="14" rx="3" fill="#8a94ad" /><path d="M34 62 v-4 a6 6 0 0 1 12 0 v4" fill="none" stroke="#8a94ad" strokeWidth="3.5" /></>}
    </svg>
  )
}
