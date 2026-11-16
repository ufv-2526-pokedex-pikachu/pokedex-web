/** Récord de batallas. La API no guarda combates, así que vive en el navegador (uno por usuario). */
export interface BattleRecord { won: number; lost: number }

const key = (user: string) => `pokedex.record.${user}`

export function readRecord(user: string): BattleRecord {
  try {
    const r = JSON.parse(localStorage.getItem(key(user)) ?? '')
    return { won: Number(r.won) || 0, lost: Number(r.lost) || 0 }
  } catch { return { won: 0, lost: 0 } }
}

export function saveRecord(user: string, r: BattleRecord) {
  try { localStorage.setItem(key(user), JSON.stringify(r)) } catch { /* sin almacenamiento */ }
}
