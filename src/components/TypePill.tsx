import type { CSSProperties } from 'react'
import { TYPE_COLOR, TYPE_ES } from '../lib/pokemon'

export function TypePill({ type }: { type: string }) {
  return (
    <span className="type" style={{ '--t': TYPE_COLOR[type] ?? '#888' } as CSSProperties}>
      {TYPE_ES[type] ?? type}
    </span>
  )
}

export function TypePills({ types }: { types: string[] }) {
  return (
    <span className="types">
      {types.map((t) => <TypePill key={t} type={t} />)}
    </span>
  )
}
