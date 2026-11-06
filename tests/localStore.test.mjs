import test from 'node:test'
import assert from 'node:assert/strict'
import { readLocalStore } from '../utils/localStore.ts'
const valid = (value) =>
  Array.isArray(value) && value.every((v) => typeof v === 'string')
function storage() {
  const data = new Map()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  }
}
test('missing legacy data is distinct from an intentionally empty list', () => {
  const s = storage()
  assert.equal(readLocalStore(s, 'events', valid), null)
  s.setItem('events', '[]')
  assert.deepEqual(readLocalStore(s, 'events', valid), [])
})
test('migration can read a valid backup without changing a damaged original', () => {
  const s = storage()
  s.setItem('events', '{broken')
  s.setItem('events.backup', '["saved event"]')
  assert.deepEqual(readLocalStore(s, 'events', valid), ['saved event'])
  assert.equal(s.getItem('events'), '{broken')
})
test('unreadable legacy data is preserved and blocks migration', () => {
  const s = storage()
  s.setItem('events', '{broken')
  assert.throws(() => readLocalStore(s, 'events', valid))
  assert.equal(s.getItem('events'), '{broken')
})
