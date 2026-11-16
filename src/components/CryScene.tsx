/**
 * La escena del grito: una pantalla de Pokédex con el Pokémon, que crece con el volumen del sonido,
 * anillos que laten a su ritmo y un osciloscopio que dibuja la onda en directo mientras suena.
 *
 * Audio de PokeAPI (CORS «*»). Se decodifica con un OfflineAudioContext (no necesita que pulses nada)
 * y al pulsar suena por un AnalyserNode, que da las muestras de cada fotograma para dibujarlas.
 * El volumen se escribe en la variable CSS --amp del escenario: React no se repinta 60 veces por segundo.
 */
import { useEffect, useRef, useState } from 'react'
import { envelope } from '../lib/audio'
import { Sprite } from './Sprite'
import './CryScene.css'

function cryUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`
}

const IDLE_BARS = 64

export function CryScene({ id, name }: { id: number; name: string }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const buffer = useRef<AudioBuffer | null>(null)
  const ctx = useRef<AudioContext | null>(null)
  const source = useRef<AudioBufferSourceNode | null>(null)
  const raf = useRef(0)
  const [state, setState] = useState<'loading' | 'ready' | 'playing' | 'failed'>('loading')
  const [duration, setDuration] = useState(0)
  const idle = useRef<number[]>([])

  /** Dibuja la forma completa del grito, quieta, mientras no suena. */
  function drawIdle() {
    const c = canvasRef.current
    if (!c) return
    const g = c.getContext('2d')
    if (!g) return
    const { width: w, height: h } = c
    g.clearRect(0, 0, w, h)
    g.strokeStyle = 'rgba(255,255,255,0.08)'
    g.lineWidth = 1
    for (const y of [h / 4, h / 2, (3 * h) / 4]) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke() }
    const bars = idle.current
    const step = w / bars.length
    g.fillStyle = 'rgba(255, 203, 5, 0.45)'
    bars.forEach((v, i) => {
      const bh = Math.max(3, v * h * 0.8)
      g.fillRect(i * step + step * 0.2, (h - bh) / 2, step * 0.6, bh)
    })
  }

  useEffect(() => {
    let alive = true
    setState('loading')
    buffer.current = null
    fetch(cryUrl(id))
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((data) => new OfflineAudioContext(1, 1, 44100).decodeAudioData(data))
      .then((b) => {
        if (!alive) return
        buffer.current = b
        idle.current = envelope(b.getChannelData(0), IDLE_BARS)
        setDuration(b.duration)
        setState('ready')
        requestAnimationFrame(drawIdle)
      })
      .catch(() => alive && setState('failed'))
    return () => {
      alive = false
      cancelAnimationFrame(raf.current)
      try { source.current?.stop() } catch { /* ya parado */ }
    }
  }, [id])

  useEffect(() => () => { void ctx.current?.close() }, [])

  function play() {
    const b = buffer.current
    const c = canvasRef.current
    const g = c?.getContext('2d')
    if (!b || !c || !g) return
    ctx.current ??= new AudioContext()
    const ac = ctx.current
    void ac.resume()
    try { source.current?.stop() } catch { /* ya parado */ }

    const src = ac.createBufferSource()
    const analyser = ac.createAnalyser()
    const gain = ac.createGain()
    analyser.fftSize = 2048
    gain.gain.value = 0.5
    src.buffer = b
    src.connect(analyser).connect(gain).connect(ac.destination)
    source.current = src
    const samples = new Float32Array(analyser.fftSize)
    const start = ac.currentTime
    setState('playing')
    src.start()

    cancelAnimationFrame(raf.current)
    const tick = () => {
      analyser.getFloatTimeDomainData(samples)
      const { width: w, height: h } = c
      g.clearRect(0, 0, w, h)
      // Rejilla suave y, encima, la onda en amarillo con un trazo grueso.
      g.strokeStyle = 'rgba(255,255,255,0.08)'
      g.lineWidth = 1
      for (const y of [h / 4, h / 2, (3 * h) / 4]) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke() }
      g.strokeStyle = '#ffcb05'
      g.lineWidth = 4
      g.lineJoin = 'round'
      g.beginPath()
      let sum = 0
      for (const v of samples) sum += v * v
      // 2048 muestras son demasiadas para una línea legible: se dibuja una de cada POINTS.
      const POINTS = 160
      for (let k = 0; k <= POINTS; k++) {
        const v = samples[Math.min(samples.length - 1, Math.round((k / POINTS) * (samples.length - 1)))]
        const x = (k / POINTS) * w
        const y = h / 2 + Math.max(-1, Math.min(1, v)) * h * 0.42
        if (k === 0) g.moveTo(x, y)
        else g.lineTo(x, y)
      }
      g.stroke()
      const rms = Math.sqrt(sum / samples.length)
      stageRef.current?.style.setProperty('--amp', Math.min(1, rms * 1.6).toFixed(3))
      stageRef.current?.style.setProperty('--progress', String(Math.min(1, (ac.currentTime - start) / b.duration)))
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    src.onended = () => {
      cancelAnimationFrame(raf.current)
      stageRef.current?.style.setProperty('--amp', '0')
      stageRef.current?.style.setProperty('--progress', '0')
      setState('ready')
      requestAnimationFrame(drawIdle)
    }
  }

  return (
    <div className={`cryscene is-${state}`} ref={stageRef}>
      <div className="cryscene__stage" aria-hidden="true">
        <span className="cryscene__ring cryscene__ring--a" />
        <span className="cryscene__ring cryscene__ring--b" />
        <Sprite id={id} alt="" className="cryscene__mon" />
      </div>
      <div className="cryscene__scope">
        <canvas ref={canvasRef} width={720} height={220} aria-hidden="true" />
        <span className="cryscene__bar" aria-hidden="true" />
        <span className="cryscene__caption">
          {state === 'loading' ? 'Cargando el grito…' : state === 'failed' ? 'Este Pokémon no tiene grito disponible.'
            : state === 'playing' ? 'Osciloscopio en directo' : `Grito de ${name} · ${duration.toLocaleString('es-ES', { maximumFractionDigits: 1 })} s`}
        </span>
      </div>
      <button type="button" className="btn btn-red cryscene__play" onClick={play} disabled={state === 'loading' || state === 'failed'}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>
        {state === 'playing' ? 'Sonando…' : `Oír a ${name}`}
      </button>
    </div>
  )
}
