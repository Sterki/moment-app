import {
  defaultCategories,
  categoryColors,
  type EventCategory,
} from '~/types/category'
import { isValidSymbol } from '~/types/symbols'
const STORAGE_KEY = 'moment.categories.v1'
export function useCategories() {
  const categories = ref<EventCategory[]>(
    defaultCategories.map((c) => ({ ...c })),
  )
  const categoryError = ref('')
  onMounted(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === null) return
      const parsed: unknown = JSON.parse(saved)
      if (
        !Array.isArray(parsed) ||
        !parsed.length ||
        !parsed.every(
          (c) =>
            c &&
            typeof c.id === 'string' &&
            c.id.length > 0 &&
            typeof c.label === 'string' &&
            c.label.trim().length > 0 &&
            c.label.length <= 32 &&
            isValidSymbol(c.emoji) &&
            categoryColors.some((color) => color.id === c.color),
        ) ||
        new Set(parsed.map((c) => c.id)).size !== parsed.length
      )
        throw new Error('Invalid categories')
      categories.value = parsed
    } catch {
      categoryError.value =
        'No pudimos leer tus categorías. Se muestran las predeterminadas hasta que guardes un cambio.'
    }
  })
  function saveCategory(category: EventCategory) {
    const index = categories.value.findIndex((c) => c.id === category.id)
    if (index < 0) categories.value.push(category)
    else categories.value[index] = category
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(categories.value))
      categoryError.value = ''
    } catch {
      categoryError.value =
        'Las categorías no se pudieron guardar. Los cambios solo estarán disponibles durante esta sesión.'
    }
  }
  function categoryFor(id: string) {
    return categories.value.find((c) => c.id === id) || defaultCategories[3]!
  }
  return { categories, categoryError, saveCategory, categoryFor }
}
