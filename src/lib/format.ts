/** "2026-11-16" o "2026-11-16T10:00:00" → "16 nov 2026" */
export function formatDate(value: string): string {
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '')
}

/** Día local "2026-11-16" de un instante (por defecto, ahora). La API guarda en UTC. */
export function localDay(value: string | Date = new Date()): string {
  const d = typeof value === 'string' ? new Date(value) : value
  // taste-skill-ignore: es una fecha, no una numeración
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const todayIso = () => localDay()

/**
 * Fecha elegida en un <input type="date"> ("2026-11-16") → instante con zona horaria para la API.
 * La API devuelve 500 si recibe una fecha sin zona (no la valida como 422), así que siempre se manda
 * con zona. Se usa el mediodía local para que el día no cambie al pasar a UTC.
 */
export function toApiDate(day: string): string {
  return new Date(`${day}T12:00:00`).toISOString()
}
