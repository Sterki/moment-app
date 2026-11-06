export function readLocalStore<T>(
  storage: Storage,
  key: string,
  validate: (value: unknown) => value is T,
): T | null {
  const raw = storage.getItem(key)
  if (raw !== null) {
    try {
      const value: unknown = JSON.parse(raw)
      if (validate(value)) return value
    } catch {
      /* Try the recovery copy without changing the original. */
    }
  }
  const backup = storage.getItem(`${key}.backup`)
  if (backup !== null) {
    try {
      const value: unknown = JSON.parse(backup)
      if (validate(value)) return value
    } catch {
      /* Preserve unreadable data for recovery. */
    }
  }
  if (raw !== null || backup !== null) throw new Error('Unreadable saved data')
  return null
}
