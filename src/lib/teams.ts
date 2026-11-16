/** Reglas de equipos que comparte la web con la API (MAX_TEAM_SIZE en app/models.py). */
export const MAX_TEAM = 6

/** Mueve el elemento de la posición `from` a la posición `to` (para reordenar el equipo). */
export function move<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
