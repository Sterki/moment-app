import { defaultCategories, type EventCategory } from '~/types/category'
import { validCategories } from '~/utils/momentDatabase'
export function useCategories() {
  const {
    items: categories,
    error: categoryError,
    loading: categoriesLoading,
    saving: categorySaving,
    mutate,
  } = useMomentCollection(
    'categories',
    defaultCategories.map((c) => ({ ...c })),
  )
  const saveCategory = (category: EventCategory) =>
    mutate((store) => {
      if (!validCategories([category])) throw new Error('Invalid category')
      const request = store.getAll()
      request.onsuccess = () => {
        if (
          request.result.some(
            (c: EventCategory) =>
              c.id !== category.id &&
              c.label.toLocaleLowerCase('es') ===
                category.label.toLocaleLowerCase('es'),
          )
        ) {
          store.transaction.abort()
          return
        }
        store.put({ ...category })
      }
    })
  function categoryFor(id: string) {
    return categories.value.find((c) => c.id === id) || defaultCategories[3]!
  }
  return {
    categories,
    categoryError,
    categoriesLoading,
    categorySaving,
    saveCategory,
    categoryFor,
  }
}
