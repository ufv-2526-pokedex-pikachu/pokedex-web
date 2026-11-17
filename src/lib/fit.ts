/**
 * Accesorios que se amoldan al Pokémon, píxel a píxel.
 *
 * 1. `anchors` mira los píxeles de un fotograma del sprite y encuentra dónde empieza la figura,
 *    dónde acaban las orejas o cuernos y empieza la cabeza de verdad, el cuello y el pecho.
 * 2. `paintAccessory` dibuja el accesorio encima, a la misma resolución que el sprite y con su mismo
 *    contorno de 1 píxel, así parece parte del dibujo. La gorra y la corona borran lo que queda por
 *    encima (orejas, cuernos): el accesorio los «tapa».
 *
 * Se hace en cada fotograma, así que el accesorio sigue el movimiento del Pokémon.
 * Trabaja sobre un objeto con la forma de ImageData para poder probarlo sin navegador.
 */
import type { AccessoryId } from './accessories'

export interface Img { width: number; height: number; data: Uint8ClampedArray }

export interface Anchors {
  top: number; bottom: number; left: number; right: number
  /** Primera fila de la cabeza «ancha» (debajo de orejas, cuernos o pelo de punta). */
  headStart: number
  /** Bordes de la cabeza a la altura de headStart. */
  headLeft: number; headRight: number
  /** Fila donde va la visera de la gorra. */
  brimY: number
  /** Centro y fila de los ojos, y filas del cuello y del pecho. */
  eyeX: number; eyeY: number; neckY: number; chestY: number
}

type RGBA = [number, number, number, number]
const INK: RGBA = [27, 36, 64, 255]
const ALPHA_MIN = 40

const opaque = (img: Img, x: number, y: number) =>
  x >= 0 && y >= 0 && x < img.width && y < img.height && img.data[(y * img.width + x) * 4 + 3] > ALPHA_MIN

function rowInfo(img: Img, y: number): { count: number; min: number; max: number } {
  let count = 0, min = Infinity, max = -Infinity
  for (let x = 0; x < img.width; x++) if (opaque(img, x, y)) { count++; min = Math.min(min, x); max = Math.max(max, x) }
  return { count, min, max }
}

const luma = (img: Img, x: number, y: number) => {
  const i = (y * img.width + x) * 4
  return 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2]
}

/** ¿Está el píxel rodeado de figura en un cuadrado de radio r? (descarta el contorno y lo fino, como orejas). */
function solid(img: Img, x: number, y: number, r: number) {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!opaque(img, x + dx, y + dy)) return false
  return true
}

/** Tramo continuo de figura que contiene la columna x en la fila y (o null si ahí no hay figura). */
function spanAt(img: Img, y: number, x: number): { min: number; max: number } | null {
  if (!opaque(img, x, y)) return null
  let min = x, max = x
  while (opaque(img, min - 1, y)) min--
  while (opaque(img, max + 1, y)) max++
  return { min, max }
}

/** Puntos de referencia de la figura, o null si el fotograma está vacío. */
export function anchors(img: Img): Anchors | null {
  let top = -1, bottom = -1, left = Infinity, right = -Infinity
  for (let y = 0; y < img.height; y++) {
    const r = rowInfo(img, y)
    if (r.count === 0) continue
    if (top < 0) top = y
    bottom = y
    left = Math.min(left, r.min); right = Math.max(right, r.max)
  }
  if (top < 0) return null
  const h = bottom - top + 1
  // Primera fila «llena» de arriba: las filas de las orejas tienen pocos píxeles; la cabeza, muchos.
  const band = Math.max(3, Math.round(h * 0.25))
  let maxCount = 0
  for (let y = top; y < top + band; y++) maxCount = Math.max(maxCount, rowInfo(img, y).count)
  let headStart = top
  for (let y = top; y < top + band; y++) if (rowInfo(img, y).count >= maxCount * 0.55) { headStart = y; break }

  // Los ojos: los primeros píxeles muy oscuros DENTRO de la figura (lejos del contorno, que también
  // es oscuro) y mucho más oscuros que lo que tienen alrededor (no una sombra ni el interior de una oreja).
  const r = Math.max(1, Math.round(h * 0.035))
  const isEye = (x: number, y: number) => {
    if (!opaque(img, x, y) || !solid(img, x, y, r)) return false
    const l = luma(img, x, y)
    if (l >= 90) return false
    let sum = 0, n = 0
    for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) {
      const xx = x + dx * (r + 1), yy = y + dy * (r + 1)
      if (opaque(img, xx, yy)) { sum += luma(img, xx, yy); n++ }
    }
    return n > 0 && sum / n - l > 90
  }
  let eyeTop = -1, first = 0, ex0 = Infinity, ex1 = -Infinity
  for (let y = headStart; y < top + h * 0.6 && eyeTop < 0; y++) {
    for (let x = left; x <= right; x++) if (isEye(x, y)) { eyeTop = y; first = x; break }
  }
  if (eyeTop >= 0) {
    // El otro ojo está en la misma cabeza: a menos de media cabeza de distancia del primero.
    const reach = Math.max(4, Math.round(h * 0.3))
    for (let y = eyeTop; y <= eyeTop + 2; y++) for (let x = first - reach; x <= first + reach; x++) {
      if (isEye(x, y)) { ex0 = Math.min(ex0, x); ex1 = Math.max(ex1, x) }
    }
  }
  if (eyeTop < 0) {
    // Sin ojos a la vista: la cabeza es el bulto de arriba, centrado donde está la figura en sus primeras filas.
    let sx = 0, sn = 0
    for (let y = top; y <= top + Math.max(2, Math.round(h * 0.15)); y++) for (let x = left; x <= right; x++) if (opaque(img, x, y)) { sx += x; sn++ }
    const cxTop = Math.round(sx / sn)
    const width = (y: number) => { const sp = spanAt(img, y, cxTop); return sp ? sp.max - sp.min + 1 : 0 }
    let maxW = 0
    for (let y = top; y < top + band; y++) maxW = Math.max(maxW, width(y))
    for (let y = top; y < top + band; y++) if (width(y) >= maxW * 0.55) { headStart = y; break }
    const head = spanAt(img, headStart, cxTop) ?? rowInfo(img, headStart)
    const brimY = Math.min(bottom, headStart + Math.max(2, Math.round(h * 0.08)))
    const headBottom = Math.min(bottom, headStart + Math.max(4, Math.round(h * 0.3)))
    return {
      top, bottom, left, right, headStart, headLeft: head.min, headRight: head.max, brimY,
      eyeX: cxTop, eyeY: Math.round(brimY + (headBottom - brimY) * 0.35),
      neckY: headBottom, chestY: Math.min(bottom, headBottom + Math.max(3, Math.round(h * 0.12))),
    }
  }
  const eyeY = eyeTop + 1
  const eyeX = Math.round((ex0 + ex1) / 2)
  // La coronilla: subiendo en vertical desde entre los ojos hasta salir de la figura.
  let headTop = eyeTop
  while (opaque(img, eyeX, headTop - 1)) headTop--
  const gap = Math.max(2, eyeY - headTop)
  // El ancho de la cabeza, a media frente.
  const forehead = spanAt(img, Math.round((headTop + eyeY) / 2), eyeX) ?? { min: ex0 - 2, max: ex1 + 2 }
  // El cuello: la fila más estrecha bajo la cara. Si no se estrecha (Pokémon redondos), un poco más abajo de la boca.
  let neckY = Math.min(bottom, eyeY + Math.round(gap * 1.6))
  const faceW = spanAt(img, eyeY, eyeX)
  let minW = Infinity
  for (let y = eyeY + gap; y <= Math.min(bottom - 2, eyeY + gap * 3); y++) {
    const sp = spanAt(img, y, eyeX)
    if (sp && sp.max - sp.min < minW) { minW = sp.max - sp.min; if (faceW && minW < (faceW.max - faceW.min) * 0.85) neckY = y }
  }
  return {
    top, bottom, left, right, headStart: headTop,
    headLeft: Math.min(forehead.min, ex0 - 1), headRight: Math.max(forehead.max, ex1 + 1),
    brimY: Math.min(eyeY - 2, headTop + Math.max(1, Math.round(gap * 0.55))),
    eyeX, eyeY, neckY, chestY: Math.min(bottom, neckY + Math.max(3, Math.round(gap * 0.8))),
  }
}

/* ---------- Dibujo píxel a píxel ---------- */

function setPx(img: Img, x: number, y: number, c: RGBA) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return
  const i = (y * img.width + x) * 4
  img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = c[3]
}

/** Pinta una forma (máscara) con su color por píxel y un contorno de tinta de 1 píxel, como los sprites. */
function paintShape(img: Img, mask: (x: number, y: number) => boolean, color: (x: number, y: number) => RGBA,
  box: { x0: number; y0: number; x1: number; y1: number }) {
  for (let y = box.y0 - 1; y <= box.y1 + 1; y++) {
    for (let x = box.x0 - 1; x <= box.x1 + 1; x++) {
      if (mask(x, y)) {
        const edge = !mask(x - 1, y) || !mask(x + 1, y) || !mask(x, y - 1) || !mask(x, y + 1)
        setPx(img, x, y, edge ? INK : color(x, y))
      }
    }
  }
}

/** Borra la figura por encima de una fila (las orejas que tapa la gorra o la corona). */
function clearAbove(img: Img, y: number, x0: number, x1: number) {
  for (let yy = 0; yy < y; yy++) for (let x = x0; x <= x1; x++) setPx(img, x, yy, [0, 0, 0, 0])
}

const RED: RGBA = [232, 64, 58, 255]
const RED_DARK: RGBA = [176, 40, 36, 255]
const WHITE: RGBA = [255, 255, 255, 255]
const GOLD: RGBA = [255, 203, 5, 255]
const GOLD_DARK: RGBA = [214, 160, 0, 255]
const PINK: RGBA = [255, 95, 162, 255]
const GREEN: RGBA = [47, 191, 113, 255]
const GREEN_DARK: RGBA = [30, 140, 82, 255]
const BLUE: RGBA = [63, 140, 255, 255]
const GLASS: RGBA = [27, 36, 64, 255]

export function paintAccessory(img: Img, id: AccessoryId, a: Anchors) {
  const headW = Math.max(6, a.headRight - a.headLeft + 1)
  const cx = a.eyeX
  // Las orejas y cuernos que tapa la gorra están por encima de la cabeza, algo más anchos que ella.
  const wideL = Math.max(0, a.headLeft - Math.round(headW * 0.35)), wideR = Math.min(img.width - 1, a.headRight + Math.round(headW * 0.35))

  switch (id) {
    case 'gorra': {
      // La cúpula va de lo más alto de la figura a la visera y tapa todo lo que hay encima (orejas incluidas).
      const capTop = Math.max(0, a.headStart - Math.max(1, Math.round(headW * 0.12)))
      const x0 = a.headLeft - 1, x1 = a.headRight + 1
      clearAbove(img, a.brimY, wideL, wideR)
      const rx = (x1 - x0) / 2 + 0.5, ry = a.brimY - capTop + 0.5, ccx = (x0 + x1) / 2
      const dome = (x: number, y: number) => y >= capTop && y <= a.brimY && ((x - ccx) / rx) ** 2 + ((y - a.brimY) / ry) ** 2 <= 1
      const panel = (x: number) => Math.abs(x - ccx) <= Math.max(1, rx * 0.28)
      paintShape(img, dome, (x, y) => (y >= a.brimY - 1 ? RED_DARK : panel(x) ? WHITE : RED), { x0, y0: capTop, x1, y1: a.brimY })
      // Visera: sale hacia delante, que en los sprites de frente es la izquierda.
      const v0 = x0 - Math.max(2, Math.round(headW * 0.3)), v1 = x1
      const brim = (x: number, y: number) => x >= v0 && x <= v1 && y >= a.brimY && y <= a.brimY + 2
      paintShape(img, brim, () => RED_DARK, { x0: v0, y0: a.brimY, x1: v1, y1: a.brimY + 2 })
      break
    }
    case 'corona': {
      const w = Math.max(7, Math.round(headW * 0.62))
      const h = Math.max(5, Math.round(w * 0.55))
      const x0 = Math.round(cx - w / 2), x1 = x0 + w - 1
      const base = a.headStart + 1, y0 = base - h
      const third = (x1 - x0) / 4
      const crown = (x: number, y: number) => {
        if (x < x0 || x > x1 || y > base || y < y0) return false
        if (y >= base - Math.round(h * 0.4)) return true
        // Tres puntas: la distancia a la punta más cercana decide si el píxel está dentro.
        const peaks = [x0, x0 + 2 * third, x1]
        const d = Math.min(...peaks.map((p) => Math.abs(x - p)))
        return y >= y0 + d * (h / third) * 0.75
      }
      paintShape(img, crown, (x, y) => (y >= base - 1 ? GOLD_DARK : (y === base - Math.round(h * 0.25) && Math.abs(x - cx) < 1.5 ? RED : GOLD)), { x0, y0, x1, y1: base })
      break
    }
    case 'gafas': {
      const w = Math.max(8, Math.round(headW * 0.74))
      const lensW = Math.max(3, Math.round(w * 0.42)), lensH = Math.max(2, Math.round(w * 0.2))
      const x0 = Math.round(cx - w / 2), x1 = x0 + w - 1
      const y0 = a.eyeY - Math.floor(lensH / 2), y1 = y0 + lensH - 1
      const lens = (x: number, y: number) => y >= y0 && y <= y1 && ((x >= x0 && x < x0 + lensW) || (x <= x1 && x > x1 - lensW))
      const bridge = (x: number, y: number) => y === y0 && x >= x0 + lensW && x <= x1 - lensW
      paintShape(img, (x, y) => lens(x, y) || bridge(x, y), (x, y) => (y === y0 && (x === x0 + 1 || x === x1 - lensW + 2) ? WHITE : GLASS), { x0, y0, x1, y1 })
      break
    }
    case 'lazo': {
      const s = Math.max(5, Math.round(headW * 0.32))
      const bx = Math.min(img.width - s - 1, a.headRight - Math.round(s * 0.6)), by = a.headStart - Math.round(s * 0.4)
      const mid = bx + Math.floor(s / 2)
      const bow = (x: number, y: number) => {
        if (y < by || y > by + s - 1 || x < bx || x > bx + s) return false
        const dx = Math.abs(x - mid), dy = Math.abs(y - (by + (s - 1) / 2))
        return dy <= dx * 0.8 + 1 // dos alas que se abren desde el nudo
      }
      paintShape(img, bow, (x) => (Math.abs(x - mid) <= 1 ? [255, 140, 192, 255] : PINK), { x0: bx, y0: by, x1: bx + s, y1: by + s - 1 })
      break
    }
    case 'bufanda': {
      // Recolorea los píxeles de la figura a la altura del cuello: la bufanda «abraza» su forma exacta.
      const rows = Math.max(2, Math.round((a.bottom - a.top) * 0.07))
      const y0 = a.neckY, y1 = Math.min(a.bottom, a.neckY + rows)
      // Solo el tramo continuo que pasa por debajo de la cara: no pinta la cola ni las alas de esa fila.
      const snapshot = new Set<number>()
      for (let y = y0; y <= y1; y++) {
        const s = spanAt(img, y, Math.round(cx)) ?? { min: 0, max: img.width - 1 }
        for (let x = s.min; x <= s.max; x++) if (opaque(img, x, y)) snapshot.add(y * img.width + x)
      }
      const mask = (x: number, y: number) => snapshot.has(y * img.width + x)
      paintShape(img, mask, (x, y) => ((x + y) % 4 === 0 ? GREEN_DARK : GREEN), { x0: a.left, y0, x1: a.right, y1 })
      // La punta que cuelga por un lado.
      const r = rowInfo({ ...img }, y1)
      if (r.count > 0) {
        const tx = Math.max(r.min + 1, Math.round(r.max - (r.max - r.min) * 0.25)), len = rows + 3
        const tail = (x: number, y: number) => x >= tx && x <= tx + 2 && y > y1 && y <= y1 + len
        paintShape(img, tail, () => GREEN, { x0: tx, y0: y1 + 1, x1: tx + 2, y1: y1 + len })
      }
      break
    }
    case 'medalla': {
      const r = Math.max(2, Math.round(headW * 0.14))
      const mx = Math.round(cx + headW * 0.12), my = a.chestY + r + 2
      const ribbon = (x: number, y: number) => x >= mx - 1 && x <= mx + 1 && y >= a.neckY && y < my - r
      paintShape(img, ribbon, () => BLUE, { x0: mx - 1, y0: a.neckY, x1: mx + 1, y1: my - r })
      const disc = (x: number, y: number) => (x - mx) ** 2 + (y - my) ** 2 <= (r + 0.5) ** 2
      paintShape(img, disc, (x, y) => (x === mx && y === my ? WHITE : GOLD), { x0: mx - r, y0: my - r, x1: mx + r, y1: my + r })
      break
    }
  }
}
