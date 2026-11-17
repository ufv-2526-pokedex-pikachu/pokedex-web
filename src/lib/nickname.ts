/**
 * Apodo del entrenador: cómo te saluda la web. La API no tiene un campo para esto (y no se toca),
 * así que se guarda en este navegador, por usuario, como el compañero y su accesorio.
 * Sin apodo, se usa el usuario; a los que entran con Google se les quita la coletilla «-g12345».
 */
export const NICKNAME_MAX = 20

const key = (user: string) => `pokedex.apodo.${user}`

/** El nombre por defecto: el usuario sin la coletilla que le pone el puente de Google. */
export function defaultNickname(username: string): string {
  return username.replace(/-g\d{5}$/, '')
}

/** Limpia lo que escribe el usuario: sin espacios de sobra ni caracteres de control, y como mucho 20. */
export function cleanNickname(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, NICKNAME_MAX).trim()
}

export function savedNickname(username: string): string | null {
  try { return localStorage.getItem(key(username)) } catch { return null }
}

/** Nombre con el que se muestra al entrenador. */
export function trainerName(username: string): string {
  return savedNickname(username) || defaultNickname(username)
}

/** Guarda el apodo (vacío = volver al nombre por defecto) y avisa a quien lo esté mostrando. */
export function saveNickname(username: string, raw: string) {
  const name = cleanNickname(raw)
  try {
    if (name) localStorage.setItem(key(username), name)
    else localStorage.removeItem(key(username))
  } catch { /* sin almacenamiento: dura lo que la pestaña */ }
  window.dispatchEvent(new Event('pokedex:apodo'))
}
