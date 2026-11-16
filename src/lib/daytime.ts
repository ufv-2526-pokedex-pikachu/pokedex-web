/** Momento del día según la hora local: decide el color del cielo y el saludo. */
export type Phase = 'amanecer' | 'dia' | 'atardecer' | 'noche'

export function phaseAt(hour: number): Phase {
  if (hour >= 6 && hour < 9) return 'amanecer'
  if (hour >= 9 && hour < 18) return 'dia'
  if (hour >= 18 && hour < 21) return 'atardecer'
  return 'noche'
}

export function greetingAt(hour: number): string {
  if (hour >= 6 && hour < 14) return 'Buenos días'
  if (hour >= 14 && hour < 21) return 'Buenas tardes'
  return 'Buenas noches'
}

/** Colores del cielo y de las colinas en cada momento (planos, sin degradados). */
export const SKY: Record<Phase, { sky: string; far: string; mid: string; near: string; sun: string }> = {
  amanecer: { sky: '#ffc9a8', far: '#a7d98f', mid: '#86c96f', near: '#6db45a', sun: '#ffe08a' },
  dia: { sky: '#8fd4ff', far: '#8edb76', mid: '#6cc65a', near: '#56b14a', sun: '#ffe36b' },
  atardecer: { sky: '#ff9f7a', far: '#8fbf6a', mid: '#74a957', near: '#5d9147', sun: '#ffd36b' },
  noche: { sky: '#26305e', far: '#2f5a4a', mid: '#264c3f', near: '#1e3f34', sun: '#f2f0d6' },
}
