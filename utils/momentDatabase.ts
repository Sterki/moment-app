import { createId } from './createId'
import type { CountdownEvent } from '~/types/event'
import {
  defaultCategories,
  categoryColors,
  type EventCategory,
} from '~/types/category'
import { isValidSymbol } from '~/types/symbols'
import { readLocalStore } from './localStore'

export interface MomentData {
  events: CountdownEvent[]
  categories: EventCategory[]
}
export type Collection = keyof MomentData
const DATABASE = 'moment'
let connection: Promise<IDBDatabase> | undefined

export function validEvents(value: unknown): value is CountdownEvent[] {
  return (
    Array.isArray(value) &&
    value.every(
      (e) =>
        e &&
        typeof e.id === 'string' &&
        e.id.length > 0 &&
        typeof e.title === 'string' &&
        typeof e.date === 'string' &&
        Number.isFinite(Date.parse(e.date)) &&
        typeof e.category === 'string' &&
        typeof e.note === 'string' &&
        typeof e.favorite === 'boolean' &&
        Number.isFinite(e.createdAt),
    ) &&
    new Set(value.map((e) => e.id)).size === value.length
  )
}
export function validCategories(value: unknown): value is EventCategory[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (c) =>
        c &&
        typeof c.id === 'string' &&
        c.id.length > 0 &&
        typeof c.label === 'string' &&
        c.label.trim().length > 0 &&
        c.label.length <= 32 &&
        isValidSymbol(c.emoji) &&
        categoryColors.some((color) => color.id === c.color),
    ) &&
    new Set(value.map((c) => c.id)).size === value.length
  )
}
function examples(): CountdownEvent[] {
  const future = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    d.setHours(12, 0, 0, 0)
    return d.toISOString()
  }
  return [
    {
      id: createId(),
      title: 'Mi próximo cumpleaños',
      date: future(24),
      category: 'birthday',
      note: 'Una vuelta más al sol. Y muchos motivos para celebrar.',
      favorite: true,
      createdAt: Date.now(),
    },
    {
      id: createId(),
      title: 'Escapada a la playa',
      date: future(48),
      category: 'travel',
      note: 'Sol, mar y desconectar un poquito.',
      favorite: false,
      createdAt: Date.now(),
    },
    {
      id: createId(),
      title: 'Año Nuevo',
      date: new Date(new Date().getFullYear() + 1, 0, 1).toISOString(),
      category: 'celebration',
      note: 'Nuevos comienzos, nuevas historias.',
      favorite: false,
      createdAt: Date.now(),
    },
  ]
}
function open(): Promise<IDBDatabase> {
  if (!connection) {
    connection = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1)
      let expired = false
      const timeout = setTimeout(() => {
        expired = true
        reject(new Error('Database open timed out'))
      }, 10000)
      request.onupgradeneeded = () => {
        const db = request.result
        db.createObjectStore('events', { keyPath: 'id' })
        db.createObjectStore('categories', { keyPath: 'id' })
        db.createObjectStore('meta')
      }
      request.onerror = () => {
        clearTimeout(timeout)
        reject(request.error)
      }
      request.onblocked = () => {
        expired = true
        clearTimeout(timeout)
        reject(new Error('Close older tabs to open the database'))
      }
      request.onsuccess = () => {
        clearTimeout(timeout)
        const db = request.result
        if (expired) {
          db.close()
          return
        }
        db.onversionchange = () => {
          db.close()
          connection = undefined
        }
        db.onclose = () => {
          connection = undefined
        }
        resolve(db)
      }
    }).catch((error) => {
      connection = undefined
      throw error
    })
  }
  return connection
}
// No awaits inside a transaction: Safari may otherwise auto-commit between requests.
function initialize(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['meta', 'events', 'categories'], 'readwrite')
    let failure: unknown
    tx.oncomplete = () => resolve()
    tx.onabort = () =>
      reject(failure || tx.error || new Error('Migration aborted'))
    tx.objectStore('meta').get('initialized').onsuccess = (event) => {
      if ((event.target as IDBRequest).result === true) return
      try {
        const events =
          readLocalStore(localStorage, 'moment.events.v1', validEvents) ??
          examples()
        const categories =
          readLocalStore(
            localStorage,
            'moment.categories.v1',
            validCategories,
          ) ?? defaultCategories
        // Migration and its marker commit together. Keep localStorage untouched.
        for (const e of events) tx.objectStore('events').add(e)
        for (const c of categories) tx.objectStore('categories').add(c)
        tx.objectStore('meta').put(true, 'initialized')
      } catch (error) {
        failure = error
        tx.abort()
      }
    }
  })
}
export async function readMomentData(): Promise<MomentData> {
  const db = await open()
  await initialize(db)
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['events', 'categories'], 'readonly')
    const events = tx.objectStore('events').getAll()
    const categories = tx.objectStore('categories').getAll()
    tx.onabort = () => reject(tx.error || new Error('Read aborted'))
    tx.oncomplete = () => {
      if (!validEvents(events.result) || !validCategories(categories.result)) {
        reject(new Error('Invalid database data'))
        return
      }
      resolve({ events: events.result, categories: categories.result })
    }
  })
}
export async function changeMomentData(
  collection: Collection,
  change: (store: IDBObjectStore) => void,
): Promise<void> {
  const db = await open()
  await initialize(db)
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(collection, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error || new Error('Write aborted'))
    try {
      change(tx.objectStore(collection))
    } catch (error) {
      tx.abort()
      reject(error)
    }
  })
  // Success means the transaction completed, not just the individual request.
}
