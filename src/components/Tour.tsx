/**
 * La presentación en marcha: abre la pantalla de cada paso, la recorre despacio hacia abajo
 * y enseña abajo un panel con la explicación, los endpoints que usa y los controles.
 * Teclado: → siguiente, ← anterior, espacio pausa, Esc sale.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useNavigate } from 'react-router-dom'
import { STEP_MS, TOUR, tour } from '../lib/tour'
import './Tour.css'

export function Tour() {
  const index = useSyncExternalStore(tour.subscribe, tour.get)
  const navigate = useNavigate()
  const [paused, setPaused] = useState(false)
  const barRef = useRef<HTMLSpanElement>(null)
  const elapsed = useRef(0)

  // Al cambiar de paso: ir a su pantalla y arrancar el reloj del paso.
  useEffect(() => {
    if (index === null) return
    navigate(TOUR[index].path)
    window.scrollTo({ top: 0 })
    elapsed.current = 0
  }, [index, navigate])

  // Reloj: avanza la barra, baja la página poco a poco y pasa al siguiente paso al acabar.
  useEffect(() => {
    if (index === null || paused) return
    let last = performance.now()
    let raf = 0
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const tick = (now: number) => {
      elapsed.current += now - last
      last = now
      const p = Math.min(1, elapsed.current / STEP_MS)
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`
      // Recorre la pantalla entre el 15 % y el 85 % del tiempo del paso.
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (!reduce && max > 0) window.scrollTo({ top: max * Math.min(1, Math.max(0, (p - 0.15) / 0.7)) })
      if (p >= 1) { tour.go(1); return }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [index, paused])

  useEffect(() => {
    if (index === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') tour.stop()
      else if (e.key === 'ArrowRight') tour.go(1)
      else if (e.key === 'ArrowLeft') tour.go(-1)
      else if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); setPaused((v) => !v) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index])

  if (index === null) return null
  const step = TOUR[index]
  return (
    <section className="tour" aria-label="Modo presentación" aria-live="polite">
      <div className="tour__head">
        <span className="tour__count num">{index + 1} / {TOUR.length}</span>
        <h2 className="tour__title">{step.title}</h2>
      </div>
      <p className="tour__text">{step.text}</p>
      {step.endpoints.length > 0 && (
        <ul className="tour__endpoints" aria-label="Endpoints de la API que usa">
          {step.endpoints.map((e) => <li key={e}><code>{e}</code></li>)}
        </ul>
      )}
      <div className="tour__controls">
        <button type="button" className="btn" onClick={() => tour.go(-1)} disabled={index === 0}>Anterior</button>
        <button type="button" className="btn" onClick={() => setPaused((v) => !v)} aria-pressed={paused}>{paused ? 'Seguir' : 'Pausa'}</button>
        <button type="button" className="btn btn-primary" onClick={() => tour.go(1)}>{index === TOUR.length - 1 ? 'Terminar' : 'Siguiente'}</button>
        <button type="button" className="btn btn-ghost tour__exit" onClick={() => tour.stop()}>Salir</button>
      </div>
      <span className="tour__bar" aria-hidden="true"><span ref={barRef} /></span>
    </section>
  )
}
