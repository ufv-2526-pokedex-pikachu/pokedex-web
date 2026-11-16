/** Marca de la app: una Poké Ball de juguete, con el mismo contorno de tinta que el resto de la interfaz. */
export function Mark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="14.2" fill="#fff" stroke="#1b2440" strokeWidth="2.6" />
      <path d="M1.8 16a14.2 14.2 0 0 1 28.4 0z" fill="#e8403a" stroke="#1b2440" strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="16" cy="16" r="5" fill="#fff" stroke="#1b2440" strokeWidth="2.6" />
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
