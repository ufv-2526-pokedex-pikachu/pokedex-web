/**
 * Modo presentación: un recorrido automático por la web para enseñarla en clase sin tocar nada.
 * Cada paso abre una pantalla y explica qué hace y qué endpoints de la API usa.
 * El estado vive aquí (fuera de React) para que cualquier botón pueda empezarlo.
 */
export interface TourStep { path: string; title: string; text: string; endpoints: string[] }

export const TOUR: TourStep[] = [
  { path: '/', title: 'Inicio', text: 'El cielo cambia con la hora real y tu compañero te habla según cómo va tu colección. El muro enseña los 151 de Kanto: a color los capturados, en silueta los vistos.', endpoints: ['GET /pokedex', 'GET /pokedex/stats'] },
  { path: '/pokedex', title: 'Mi Pokédex', text: 'Tu lista con filtros, orden y páginas, tal y como los da la API. La estrella marca favoritos al momento y se puede exportar en CSV o en PDF.', endpoints: ['GET /pokedex', 'PATCH /pokedex/{id}', 'GET /pokedex/export'] },
  { path: '/pokemon/6', title: 'La ficha', text: 'Cada Pokémon en su hábitat, con su carta holográfica, su grito con un osciloscopio en directo y su cadena evolutiva, que sale de la versión 2 de la API.', endpoints: ['GET /pokemon/{id}', 'GET /pokemon/{id}/card', 'GET /api/v2/pokedex'] },
  { path: '/album', title: 'El álbum', text: 'Tu colección como un archivador de cartas. Al abrir una, la carta vuela hasta su ficha con la View Transitions API del navegador.', endpoints: ['GET /pokedex'] },
  { path: '/capturar', title: 'Capturar', text: 'Buscas un Pokémon o entras en la hierba alta, y lanzas la Poké Ball cuando el anillo se cierra. Si lo capturas, se guarda en la API.', endpoints: ['GET /pokemon/search', 'POST /pokedex'] },
  { path: '/equipos', title: 'Equipos', text: 'Equipos de hasta seis Pokémon de tu Pokédex, con sus tipos, sus debilidades compartidas y su PDF.', endpoints: ['GET /teams', 'POST /teams', 'PUT /teams/{id}', 'GET /teams/{id}/export'] },
  { path: '/batalla', title: 'Batallas', text: 'Combates a nivel 50 con las estadísticas reales de cada Pokémon, la tabla de tipos y un rival con inteligencia artificial. El motor tiene sus propios tests.', endpoints: ['GET /teams', 'GET /pokemon/{id}'] },
  { path: '/logros', title: 'Logros', text: 'Medallas que se calculan con tus datos de la API y accesorios para tu compañero que se desbloquean con ellas.', endpoints: ['GET /pokedex', 'GET /teams', 'GET /pokedex/stats'] },
  { path: '/', title: 'Y todo, sin tocar la API', text: 'La web solo usa la Pokédex API tal y como se entregó: el login con Google va por un puente aparte. Gracias por mirar.', endpoints: [] },
]

export const STEP_MS = 9000

type Listener = () => void
let index: number | null = null
const listeners = new Set<Listener>()
const notify = () => listeners.forEach((l) => l())

export const tour = {
  /** Paso actual, o null si no hay presentación en marcha. */
  get: () => index,
  subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l) } },
  start() { index = 0; notify() },
  stop() { index = null; notify() },
  /** Avanza o retrocede; al pasar del último, termina. Devuelve el paso nuevo. */
  go(delta: number): number | null {
    if (index === null) return null
    const next = index + delta
    index = next >= TOUR.length ? null : Math.max(0, next)
    notify()
    return index
  },
}
