import { isEmojiSymbol } from './emojis'
export { emojiSymbols } from './emojis'
import {
  Cake,
  Plane,
  PartyPopper,
  Heart,
  Sparkles,
  Gift,
  Music,
  GraduationCap,
  Briefcase,
  Coffee,
  Camera,
  Mountain,
  Palmtree,
  Sun,
  Moon,
  Star,
  Rocket,
  Trophy,
  Flower2,
  BookOpen,
  Home,
  Gem,
  CalendarHeart,
  Ticket,
} from 'lucide-vue-next'
export const symbols = [
  { id: 'cake', label: 'Tarta', icon: Cake },
  { id: 'plane', label: 'Avión', icon: Plane },
  { id: 'party', label: 'Fiesta', icon: PartyPopper },
  { id: 'heart', label: 'Corazón', icon: Heart },
  { id: 'sparkles', label: 'Destellos', icon: Sparkles },
  { id: 'gift', label: 'Regalo', icon: Gift },
  { id: 'music', label: 'Música', icon: Music },
  { id: 'graduation', label: 'Graduación', icon: GraduationCap },
  { id: 'work', label: 'Trabajo', icon: Briefcase },
  { id: 'coffee', label: 'Café', icon: Coffee },
  { id: 'camera', label: 'Fotografía', icon: Camera },
  { id: 'mountain', label: 'Montaña', icon: Mountain },
  { id: 'palm', label: 'Palmera', icon: Palmtree },
  { id: 'sun', label: 'Sol', icon: Sun },
  { id: 'moon', label: 'Luna', icon: Moon },
  { id: 'star', label: 'Estrella', icon: Star },
  { id: 'rocket', label: 'Cohete', icon: Rocket },
  { id: 'trophy', label: 'Logro', icon: Trophy },
  { id: 'flower', label: 'Flor', icon: Flower2 },
  { id: 'book', label: 'Libro', icon: BookOpen },
  { id: 'home', label: 'Hogar', icon: Home },
  { id: 'gem', label: 'Joya', icon: Gem },
  { id: 'calendar-heart', label: 'Fecha especial', icon: CalendarHeart },
  { id: 'ticket', label: 'Entrada', icon: Ticket },
] as const
export function isValidSymbol(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (symbols.some((s) => s.id === value) || isEmojiSymbol(value))
  )
}
