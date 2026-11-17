/** Hilo aparte del navegador: sigue la cabeza en todos los fotogramas sin congelar la página. */
import { trackAnchors } from './fit'
import type { Img } from './fit'

self.onmessage = (e: MessageEvent<Img[]>) => postMessage(trackAnchors(e.data))
