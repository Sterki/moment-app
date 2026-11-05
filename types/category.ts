export const categoryColors = [
  { id: 'peach', label: 'Melocotón' },
  { id: 'sage', label: 'Salvia' },
  { id: 'lavender', label: 'Lavanda' },
  { id: 'yellow', label: 'Vainilla' },
  { id: 'rose', label: 'Rosa' },
  { id: 'sky', label: 'Cielo' },
] as const
export type CategoryColor = (typeof categoryColors)[number]['id']
export interface EventCategory {
  id: string
  label: string
  emoji: string
  color: CategoryColor
}
export const defaultCategories: EventCategory[] = [
  { id: 'birthday', label: 'Cumpleaños', emoji: '🎂', color: 'peach' },
  { id: 'travel', label: 'Viajes', emoji: '🌴', color: 'sage' },
  { id: 'celebration', label: 'Celebraciones', emoji: '✨', color: 'lavender' },
  { id: 'personal', label: 'Personal', emoji: '💛', color: 'yellow' },
]
