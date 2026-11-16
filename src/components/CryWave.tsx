/**
 * El grito del Pokémon con su onda de sonido, como en los juegos desde la 3.ª generación:
 * la onda se dibuja al cargar y se va rellenando de amarillo mientras suena.
 * Audio de PokeAPI (permite leerse desde otra web: CORS «*»), decodificado con la Web Audio API.
 */
import { useEffect, useRef, useState } from 'react'
import { envelope } from '../lib/audio'
import './CryWave.css'

const BARS = 44

function cryUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`
}

export function CryWave({ id, name }: { id: number; name: string }) {
  const buffer = useRef<AudioBuffer | null>(null)
  const ctx = useRef<AudioContext | null>(null)
  const source = useRef<AudioBufferSourceNode | null>(null)
  const raf = useRef(0)
  const [bars, setBars] = useState<number[] | null>(null)
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  // Descarga y decodifica el grito. Se decodifica con un OfflineAudioContext, que no necesita
  // que el usuario haya pulsado nada (un AudioContext normal se crea «suspendido» y avisa en consola).
  useEffect(() => {
    let alive = true
    setBars(null); setFailed(false); setProgress(0); buffer.current = null
    fetch(cryUrl(id))
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then((data) => new OfflineAudioContext(1, 1, 44100).decodeAudioData(data))
      .then((b) => {
        if (!alive) return
        buffer.current = b
        setBars(envelope(b.getChannelData(0), BARS))
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
      cancelAnimationFrame(raf.current)
      try { source.current?.stop() } catch { /* ya parado */ }
    }
  }, [id])

  useEffect(() => () => { void ctx.current?.close() }, [])

  function play() {
    const b = buffer.current
    if (!b) return
    ctx.current ??= new AudioContext()
    const ac = ctx.current
    void ac.resume()
    try { source.current?.stop() } catch { /* ya parado */ }
    const src = ac.createBufferSource()
    const gain = ac.createGain()
    gain.gain.value = 0.45
    src.buffer = b
    src.connect(gain).connect(ac.destination)
    const start = ac.currentTime
    src.start()
    source.current = src
    setPlaying(true)
    cancelAnimationFrame(raf.current)
    const tick = () => {
      const p = Math.min(1, (ac.currentTime - start) / b.duration)
      setProgress(p)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    src.onended = () => { setPlaying(false); setProgress(0); cancelAnimationFrame(raf.current) }
  }

  return (
    <div className="cry">
      <button type="button" className="btn" onClick={play} disabled={!bars} aria-label={`Escuchar el grito de ${name}`}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor" />
          <path d={playing ? 'M11 5.5c1 .7 1 4.3 0 5M12.8 3.8c2 1.6 2 6.8 0 8.4' : 'M11 5.5c1 .7 1 4.3 0 5'} stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
        Grito
      </button>
      {failed ? <span className="hint">Este Pokémon no tiene grito disponible.</span> : (
        <svg className={`cry__wave ${bars ? '' : 'is-loading'}`} viewBox={`0 0 ${BARS * 5} 36`} preserveAspectRatio="none" aria-hidden="true">
          {(bars ?? Array.from({ length: BARS }, () => 0.15)).map((v, i) => {
            const h = Math.max(2, v * 34)
            return <rect key={i} x={i * 5} y={(36 - h) / 2} width={3} height={h} rx={1.5} className={i / BARS < progress ? 'is-played' : ''} />
          })}
        </svg>
      )}
    </div>
  )
}
