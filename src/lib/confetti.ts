/**
 * Confeti de celebración: trocitos de colores que caen desde arriba durante un segundo y medio.
 * Se crean y se borran fuera de React (es un efecto de un momento, no parte de la página).
 */
const COLORS = ['#e8403a', '#ffcb05', '#3f8cff', '#2fbf71', '#ff8a2b', '#b9a5ff']

export function confetti(count = 90) {
  if (typeof document === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const layer = document.createElement('div')
  layer.className = 'confetti'
  layer.setAttribute('aria-hidden', 'true')
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i')
    p.style.left = `${Math.random() * 100}%`
    p.style.background = COLORS[i % COLORS.length]
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 240}px`)
    p.style.setProperty('--rot', `${(Math.random() - 0.5) * 1440}deg`)
    p.style.animationDelay = `${Math.random() * 0.25}s`
    p.style.animationDuration = `${1.1 + Math.random() * 0.7}s`
    if (i % 3 === 0) p.style.borderRadius = '50%'
    layer.appendChild(p)
  }
  document.body.appendChild(layer)
  setTimeout(() => layer.remove(), 2200)
}
