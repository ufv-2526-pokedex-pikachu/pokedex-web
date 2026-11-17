/**
 * El sprite animado del compañero con su accesorio «puesto» de verdad.
 *
 * Descompone el GIF en fotogramas con la API ImageDecoder del navegador, sigue la cabeza a lo largo de
 * todos (src/lib/fit.ts → trackAnchors) y pinta el accesorio píxel a píxel en cada uno; luego reproduce la animación en un <canvas>
 * a la resolución original, ampliado con `image-rendering: pixelated`: misma definición que el sprite.
 * Navegadores sin ImageDecoder: el sprite quieto (PNG) con el accesorio ya puesto.
 * Sin accesorio, es el <Sprite> de siempre.
 */
import { useEffect, useRef, useState } from 'react'
import type { AccessoryId } from '../lib/accessories'
import { anchors, paintAccessory, trackAnchors } from '../lib/fit'
import type { Anchors } from '../lib/fit'
import { animatedUrl, spriteUrl } from '../lib/pokemon'
import { Sprite } from './Sprite'

interface Frame { bitmap: ImageBitmap; ms: number }
interface Clip { width: number; height: number; frames: Frame[] }

const cache = new Map<string, Promise<Clip>>()

/** El seguimiento de la cabeza, en un Web Worker (hilo aparte); si no se puede, en el hilo principal. */
function track(frames: ImageData[]): Promise<(Anchors | null)[]> {
  return new Promise<(Anchors | null)[]>((resolve, reject) => {
    const w = new Worker(new URL('../lib/fit.worker.ts', import.meta.url), { type: 'module' })
    w.onmessage = (e: MessageEvent<(Anchors | null)[]>) => { resolve(e.data); w.terminate() }
    w.onerror = (e) => { reject(e); w.terminate() }
    w.postMessage(frames)
  }).catch(() => trackAnchors(frames))
}

function dress(source: CanvasImageSource, width: number, height: number, id: AccessoryId): Promise<ImageBitmap> {
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.drawImage(source, 0, 0)
  const img = g.getImageData(0, 0, width, height)
  const a = anchors(img)
  if (a) paintAccessory(img, id, a)
  g.putImageData(img, 0, 0)
  return createImageBitmap(c)
}

async function buildClip(pokemon: number, id: AccessoryId): Promise<Clip> {
  type Decoder = {
    tracks: { ready: Promise<void>; selectedTrack: { frameCount: number } | null }
    decode: (o: { frameIndex: number }) => Promise<{ image: VideoFrame }>
    close: () => void
  }
  const ImageDecoderCtor = (window as unknown as { ImageDecoder?: new (o: { data: ArrayBuffer; type: string }) => Decoder }).ImageDecoder
  if (ImageDecoderCtor) {
    try {
      const data = await (await fetch(animatedUrl(pokemon))).arrayBuffer()
      const dec = new ImageDecoderCtor({ data, type: 'image/gif' })
      await dec.tracks.ready
      const count = dec.tracks.selectedTrack?.frameCount ?? 1
      // Primero todos los fotogramas en crudo: el seguimiento necesita verlos todos.
      const raw: { img: ImageData; ms: number }[] = []
      const c = document.createElement('canvas')
      const g = c.getContext('2d', { willReadFrequently: true })!
      for (let i = 0; i < count; i++) {
        const { image } = await dec.decode({ frameIndex: i })
        if (i === 0) { c.width = image.displayWidth; c.height = image.displayHeight }
        g.clearRect(0, 0, c.width, c.height)
        g.drawImage(image, 0, 0)
        raw.push({ img: g.getImageData(0, 0, c.width, c.height), ms: Math.max(20, (image.duration ?? 100_000) / 1000) })
        image.close()
      }
      dec.close()
      const marks = await track(raw.map((r) => r.img))
      const frames: Frame[] = []
      for (const [i, r] of raw.entries()) {
        const a = marks[i]
        if (a) paintAccessory(r.img, id, a)
        frames.push({ bitmap: await createImageBitmap(r.img), ms: r.ms })
      }
      if (frames.length) return { width: c.width, height: c.height, frames }
    } catch { /* sigue con el sprite quieto */ }
  }
  // El PNG quieto trae mucho margen vacío: se recorta a la figura para que ocupe lo mismo que el GIF.
  const png = await createImageBitmap(await (await fetch(spriteUrl(pokemon))).blob())
  const dressed = await dress(png, png.width, png.height, id)
  const c = document.createElement('canvas')
  c.width = png.width
  c.height = png.height
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.drawImage(dressed, 0, 0)
  const a = anchors(g.getImageData(0, 0, c.width, c.height))
  if (!a) return { width: png.width, height: png.height, frames: [{ bitmap: dressed, ms: 1e9 }] }
  const w = a.right - a.left + 3, h = a.bottom - a.top + 3
  return { width: w, height: h, frames: [{ bitmap: await createImageBitmap(c, a.left - 1, a.top - 1, w, h), ms: 1e9 }] }
}

function clipFor(pokemon: number, id: AccessoryId): Promise<Clip> {
  const key = `${pokemon}:${id}`
  let p = cache.get(key)
  if (!p) { p = buildClip(pokemon, id); p.catch(() => cache.delete(key)); cache.set(key, p) }
  return p
}

export function WornSprite({ id, accessory, alt, className = '' }: {
  id: number; accessory: AccessoryId | null; alt: string; className?: string
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!accessory) return
    let alive = true
    let timer = 0
    setReady(false)
    setFailed(false)
    clipFor(id, accessory).then((clip) => {
      const c = canvas.current
      if (!alive || !c) return
      c.width = clip.width
      c.height = clip.height
      const g = c.getContext('2d')!
      g.imageSmoothingEnabled = false
      setReady(true)
      let i = 0
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const show = () => {
        const f = clip.frames[i]
        g.clearRect(0, 0, c.width, c.height)
        g.drawImage(f.bitmap, 0, 0)
        if (reduce || clip.frames.length === 1) return
        i = (i + 1) % clip.frames.length
        timer = window.setTimeout(show, f.ms)
      }
      show()
    }).catch(() => alive && setFailed(true))
    return () => { alive = false; clearTimeout(timer) }
  }, [id, accessory])

  if (!accessory || failed) return <Sprite id={id} alt={alt} className={className} />
  // Mientras se preparan los fotogramas se ve el sprite normal; así no hay salto de tamaño.
  return (
    <>
      {!ready && <Sprite id={id} alt={alt} className={className} />}
      <canvas ref={canvas} role="img" aria-label={alt} className={`sprite ${className}`} hidden={!ready} />
    </>
  )
}
