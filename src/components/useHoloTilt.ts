/**
 * Inclinación y luz de una carta holográfica, compartida por la carta grande y las del álbum.
 * Escribe --rx --ry --px --py --hyp en el elemento; el CSS hace el resto.
 */
import { useCallback, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { REST, fromPointer } from '../lib/holo'
import type { Holo } from '../lib/holo'

/** Nombre de la transición de páginas: lo llevan la carta del álbum que se abre y la carta de la ficha. */
export const CARD_TRANSITION = 'holo-card'

export function applyHolo(el: HTMLElement | null, h: Holo) {
  if (!el) return
  el.style.setProperty('--rx', String(h.rx))
  el.style.setProperty('--ry', String(h.ry))
  el.style.setProperty('--px', String(h.px))
  el.style.setProperty('--py', String(h.py))
  el.style.setProperty('--hyp', String(h.hyp))
}

export function useHoloTilt<T extends HTMLElement>(opts: { ignoreTouch?: boolean } = {}) {
  const ref = useRef<T>(null)
  const [active, setActive] = useState(false)

  const onPointerMove = useCallback((e: PointerEvent<T>) => {
    if (opts.ignoreTouch && e.pointerType === 'touch') return
    const r = e.currentTarget.getBoundingClientRect()
    setActive(true)
    applyHolo(ref.current, fromPointer(e.clientX - r.left, e.clientY - r.top, r.width, r.height))
  }, [opts.ignoreTouch])

  const onPointerLeave = useCallback(() => {
    setActive(false)
    applyHolo(ref.current, REST)
  }, [])

  return { ref, active, setActive, handlers: { onPointerMove, onPointerLeave, onPointerCancel: onPointerLeave } }
}
