/**
 * Sprite animado de un Pokémon. Si el GIF no carga (algún Pokémon raro no lo tiene),
 * se cambia solo al sprite estático, así nunca queda un hueco.
 */
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { animatedUrl, spriteUrl } from '../lib/pokemon'

interface Props {
  id: number
  alt: string
  back?: boolean
  className?: string
  style?: CSSProperties
  /** Altura en px; el ancho se ajusta solo. */
  size?: number
}

export function Sprite({ id, alt, back = false, className = '', style, size }: Props) {
  const [failed, setFailed] = useState(false)
  return (
    <img
      src={failed ? spriteUrl(id) : animatedUrl(id, back)}
      alt={alt}
      className={`sprite ${className}`}
      style={{ ...(size ? { height: size } : {}), ...style }}
      onError={() => setFailed(true)}
      draggable={false}
      loading="lazy"
    />
  )
}
