/**
 * Cliente HTTP de la Pokédex API.
 *
 * Todas las llamadas pasan por aquí: añade el token, renueva la sesión con el
 * refresh token cuando el access token caduca y traduce los errores a mensajes
 * en español que se pueden enseñar tal cual.
 */
import type {
  PokedexEntry, PokedexEntryCreate, PokedexEntryUpdate, PokedexPageV2, PokedexQuery,
  PokedexStats, PokemonDetail, PokemonSearchResult, Team, TeamInput, Token, User,
} from './types'

const ACCESS_KEY = 'pokedex.access'
const REFRESH_KEY = 'pokedex.refresh'

export class ApiError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/* ---------- Tokens ---------- */

function read(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

export const tokens = {
  get access() { return read(ACCESS_KEY) },
  get refresh() { return read(REFRESH_KEY) },
  save(t: Token) {
    try {
      localStorage.setItem(ACCESS_KEY, t.access_token)
      localStorage.setItem(REFRESH_KEY, t.refresh_token)
    } catch { /* modo privado: la sesión dura lo que la pestaña */ }
  },
  clear() {
    try { localStorage.removeItem(ACCESS_KEY); localStorage.removeItem(REFRESH_KEY) } catch { /* nada */ }
  },
}

/** Se llama cuando la sesión ya no se puede recuperar (refresh caducado). */
let onSessionLost: () => void = () => {}
export function setSessionLostHandler(fn: () => void) { onSessionLost = fn }

/* ---------- Errores ---------- */

const FIELD_NAMES: Record<string, string> = {
  username: 'Usuario', email: 'Email', password: 'Contraseña', name: 'Nombre',
  pokemon_id: 'Pokémon', pokemon_ids: 'Pokémon del equipo',
}

async function errorFrom(res: Response): Promise<ApiError> {
  let detail: unknown = null
  try { detail = (await res.json()).detail } catch { /* sin cuerpo JSON */ }

  if (typeof detail === 'string') return new ApiError(res.status, detail)
  if (Array.isArray(detail)) {
    // 422 de FastAPI: lista de errores de validación con loc y msg.
    const msgs = detail.map((e: { loc?: unknown[]; msg?: string }) => {
      const field = String(e.loc?.[e.loc.length - 1] ?? '')
      const msg = (e.msg ?? '').replace(/^Value error, /, '')
      return FIELD_NAMES[field] ? `${FIELD_NAMES[field]}: ${msg}` : msg
    })
    return new ApiError(res.status, msgs.join(' · '))
  }
  if (res.status === 429) return new ApiError(429, 'Demasiadas peticiones seguidas. Espera un minuto y vuelve a probar.')
  if (res.status >= 500) return new ApiError(res.status, 'La API ha fallado. Prueba otra vez en unos segundos.')
  return new ApiError(res.status, `Error ${res.status}`)
}

/* ---------- Petición base ---------- */

interface Options {
  method?: string
  json?: unknown
  form?: Record<string, string>
  query?: Record<string, string | number | boolean | undefined>
  auth?: boolean
}

let refreshing: Promise<boolean> | null = null

/** Pide tokens nuevos con el refresh token. Varias peticiones a la vez comparten un solo intento. */
function refreshSession(): Promise<boolean> {
  const rt = tokens.refresh
  if (!rt) return Promise.resolve(false)
  refreshing ??= fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: rt }),
  })
    .then(async (r) => {
      if (!r.ok) return false
      tokens.save(await r.json())
      return true
    })
    .catch(() => false)
    .finally(() => { refreshing = null })
  return refreshing
}

async function send(path: string, opts: Options, retried = false): Promise<Response> {
  const url = new URL(path, window.location.origin)
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v))
  }
  const headers: Record<string, string> = {}
  let body: BodyInit | undefined
  if (opts.json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(opts.json)
  } else if (opts.form) {
    body = new URLSearchParams(opts.form)
  }
  if (opts.auth !== false && tokens.access) headers.Authorization = `Bearer ${tokens.access}`

  let res: Response
  try {
    res = await fetch(url, { method: opts.method ?? 'GET', headers, body })
  } catch {
    throw new ApiError(0, 'No se puede conectar con la API. ¿Está arrancada en el puerto 8000?')
  }

  if (res.status === 401 && opts.auth !== false) {
    if (!retried && (await refreshSession())) return send(path, opts, true)
    tokens.clear()
    onSessionLost()
  }
  if (!res.ok) throw await errorFrom(res)
  return res
}

async function json<T>(path: string, opts: Options = {}): Promise<T> {
  const res = await send(path, opts)
  return (res.status === 204 ? undefined : await res.json()) as T
}

/** Descarga un archivo (PDF o CSV) de la API y lo guarda con el nombre que manda el servidor. */
async function download(path: string, fallbackName: string, query?: Options['query']): Promise<void> {
  const res = await send(path, { query })
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') ?? ''
  const name = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? fallbackName
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
}

/* ---------- Endpoints ---------- */

const V1 = '/api/v1'

export const api = {
  health: () => json<{ status: string }>('/health', { auth: false }),

  register: (username: string, email: string, password: string) =>
    json<User>(`${V1}/auth/register`, { method: 'POST', json: { username, email, password }, auth: false }),
  login: async (username: string, password: string) => {
    const t = await json<Token>(`${V1}/auth/login`, { method: 'POST', form: { username, password }, auth: false })
    tokens.save(t)
    return t
  },
  me: () => json<User>(`${V1}/auth/me`),

  searchPokemon: (name: string, limit = 20, offset = 0) =>
    json<PokemonSearchResult>(`${V1}/pokemon/search`, { query: { name, limit, offset } }),
  pokemon: (idOrName: number | string) => json<PokemonDetail>(`${V1}/pokemon/${idOrName}`),
  downloadCard: (idOrName: number | string) => download(`${V1}/pokemon/${idOrName}/card`, `pokemon_${idOrName}.pdf`),

  pokedex: (q: PokedexQuery = {}) => json<PokedexEntry[]>(`${V1}/pokedex`, { query: { ...q } }),
  pokedexV2: (q: PokedexQuery = {}) => json<PokedexPageV2>('/api/v2/pokedex', { query: { ...q } }),
  addEntry: (body: PokedexEntryCreate) => json<PokedexEntry>(`${V1}/pokedex`, { method: 'POST', json: body }),
  updateEntry: (id: number, body: PokedexEntryUpdate) =>
    json<PokedexEntry>(`${V1}/pokedex/${id}`, { method: 'PATCH', json: body }),
  deleteEntry: (id: number) => json<void>(`${V1}/pokedex/${id}`, { method: 'DELETE' }),
  stats: () => json<PokedexStats>(`${V1}/pokedex/stats`),
  exportPokedex: (format: 'csv' | 'pdf', q: { captured?: boolean; favorite?: boolean } = {}) =>
    download(`${V1}/pokedex/export`, `pokedex.${format}`, { format, ...q }),

  teams: () => json<Team[]>(`${V1}/teams`),
  createTeam: (body: TeamInput) => json<Team>(`${V1}/teams`, { method: 'POST', json: body }),
  updateTeam: (id: number, body: TeamInput) => json<Team>(`${V1}/teams/${id}`, { method: 'PUT', json: body }),
  downloadTeam: (id: number) => download(`${V1}/teams/${id}/export`, `equipo_${id}.pdf`),
}
