/** Marca de la app: una Poké Ball plana dibujada en SVG, junto al nombre. */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#fff" />
      <path d="M1 16a15 15 0 0 1 30 0z" fill="#e5484d" />
      <rect x="1" y="14.6" width="30" height="2.8" fill="#000" />
      <circle cx="16" cy="16" r="5.4" fill="#000" />
      <circle cx="16" cy="16" r="2.8" fill="#fff" />
    </svg>
  )
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <Mark />
      <span>Pokédex</span>
    </span>
  )
}
