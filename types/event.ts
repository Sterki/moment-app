export interface CountdownEvent {
  id: string
  title: string
  date: string
  category: string
  note: string
  favorite: boolean
  createdAt: number
}
export function remaining(date: string, now: number) {
  const seconds = Math.max(
    0,
    Math.floor((new Date(date).getTime() - now) / 1000),
  )
  return [
    Math.floor(seconds / 86400),
    Math.floor(seconds / 3600) % 24,
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
}
export function formatDate(date: string) {
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}
