export const backgrounds = [
  {
    id: 'original',
    label: 'Original',
    description: 'Crema y salvia',
    background: '#fafbf7',
  },
  {
    id: 'sunrise',
    label: 'Amanecer',
    description: 'Melocotón y rosa',
    background: 'linear-gradient(140deg, #fff2e4, #fce8ef 60%, #faf4ed)',
  },
  {
    id: 'lavender',
    label: 'Lavanda',
    description: 'Lila y azul suave',
    background: 'linear-gradient(140deg, #f1eafa, #eaf1fc 65%, #f7f3fc)',
  },
  {
    id: 'ocean',
    label: 'Océano',
    description: 'Azul y turquesa',
    background: 'linear-gradient(140deg, #e8f2fc, #def4ef 65%, #f0f7fb)',
  },
  {
    id: 'forest',
    label: 'Bosque',
    description: 'Verdes naturales',
    background: 'linear-gradient(140deg, #e8efdf, #e5f1e9 65%, #f5f5e9)',
  },
  {
    id: 'night',
    label: 'Noche',
    description: 'Azul profundo',
    background: 'linear-gradient(140deg, #17202e, #24243c 65%, #172c35)',
  },
] as const
export type Background = (typeof backgrounds)[number]['id'] | 'custom'
export type Motion = 'none' | 'light' | 'sparkles'
export interface Appearance {
  background: Background
  color: string
  motion: Motion
}
export const defaultAppearance: Appearance = {
  background: 'original',
  color: '#fafbf7',
  motion: 'none',
}
export function validAppearance(value: unknown): value is Appearance {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    (v.background === 'custom' ||
      backgrounds.some((b) => b.id === v.background)) &&
    typeof v.color === 'string' &&
    /^#[0-9a-f]{6}$/i.test(v.color) &&
    ['none', 'light', 'sparkles'].includes(v.motion as string)
  )
}
export function appearanceBackground(value: Appearance) {
  return value.background === 'custom'
    ? value.color
    : backgrounds.find((b) => b.id === value.background)!.background
}
export function isDarkAppearance(value: Appearance) {
  if (value.background !== 'custom') return value.background === 'night'
  return luminance(value.color) < 0.179
}

function mixColor(first: string, second: string, amount: number) {
  return (
    '#' +
    [1, 3, 5]
      .map((index) =>
        Math.round(
          parseInt(first.slice(index, index + 2), 16) * (1 - amount) +
            parseInt(second.slice(index, index + 2), 16) * amount,
        )
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  )
}
function luminance(hex: string) {
  const rgb = [1, 3, 5].map((index) => {
    const value = parseInt(hex.slice(index, index + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722
}
export function appearancePalette(value: Appearance) {
  const seeds = {
    original: '#91a77a',
    sunrise: '#dc8a91',
    lavender: '#a18bc9',
    ocean: '#5e9fb5',
    forest: '#739b78',
    night: '#91a3e1',
  }
  const seed =
    value.background === 'custom' ? value.color : seeds[value.background]
  const dark = isDarkAppearance(value)
  const base = dark ? '#18212e' : '#ffffff'
  const accent = mixColor(
    seed,
    dark ? '#ffffff' : '#142332',
    dark ? 0.65 : 0.35,
  )
  return {
    '--theme-card-start': mixColor(base, seed, dark ? 0.19 : 0.12),
    '--theme-card-end': mixColor(base, seed, dark ? 0.32 : 0.25),
    '--theme-panel': mixColor(base, seed, dark ? 0.14 : 0.06),
    '--theme-border': mixColor(base, seed, dark ? 0.5 : 0.4),
    '--theme-accent': accent,
    '--theme-accent-text': luminance(accent) > 0.179 ? '#17212a' : '#ffffff',
    '--theme-shadow': `${mixColor(seed, '#142332', 0.5)}18`,
    '--motion-one': `${mixColor(seed, dark ? '#ad9fed' : '#ffffff', 0.12)}99`,
    '--motion-two': `${mixColor(seed, dark ? '#66c5cf' : '#e7c1a4', 0.45)}88`,
    '--motion-three': `${mixColor(seed, '#adb6eb', 0.5)}77`,
    '--motion-dot': mixColor(
      seed,
      dark ? '#ffffff' : '#233b41',
      dark ? 0.65 : 0.3,
    ),
  }
}
