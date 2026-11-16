/**
 * Accesorios del compañero: cada uno se desbloquea con un logro.
 * El elegido se guarda en el navegador (es solo decoración: la API no sabe nada de ellos).
 */
import type { Achievement } from './achievements'

export type AccessoryId = 'gorra' | 'gafas' | 'bufanda' | 'lazo' | 'corona' | 'medalla'

export interface Accessory { id: AccessoryId; name: string; requires: string }

export const ACCESSORIES: Accessory[] = [
  { id: 'gorra', name: 'Gorra de entrenador', requires: 'primera-captura' },
  { id: 'lazo', name: 'Lazo', requires: 'favorito' },
  { id: 'gafas', name: 'Gafas de sol', requires: 'diez-capturas' },
  { id: 'bufanda', name: 'Bufanda', requires: 'racha' },
  { id: 'medalla', name: 'Medalla de campeón', requires: 'primera-victoria' },
  { id: 'corona', name: 'Corona', requires: 'leyenda' },
]

export function unlockedAccessories(achievements: Achievement[]): Set<AccessoryId> {
  const done = new Set(achievements.filter((a) => a.unlocked).map((a) => a.id))
  return new Set(ACCESSORIES.filter((x) => done.has(x.requires)).map((x) => x.id))
}

const key = (user: string) => `pokedex.accesorio.${user}`

export function savedAccessory(user: string): AccessoryId | null {
  try { return (localStorage.getItem(key(user)) as AccessoryId | null) || null } catch { return null }
}

export function saveAccessory(user: string, id: AccessoryId | null) {
  try {
    if (id) localStorage.setItem(key(user), id)
    else localStorage.removeItem(key(user))
  } catch { /* sin almacenamiento */ }
  window.dispatchEvent(new Event('pokedex:accesorio'))
}
