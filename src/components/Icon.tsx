/** Iconos de trazo de la app, todos del mismo juego: 16 px, línea de 1,5 y color del texto. */
const PATHS = {
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  close: 'M6 6l12 12M18 6L6 18',
  back: 'M19 12H5M11 6l-6 6 6 6',
  prev: 'M15 6l-6 6 6 6',
  next: 'M9 6l6 6-6 6',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 16, filled = false }: { name: IconName; size?: number; filled?: boolean }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="icon"
      fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={size <= 16 ? 2 : 1.6}
      strokeLinecap="round" strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
