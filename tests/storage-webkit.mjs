// Optional WebKit check: install playwright and its WebKit browser first.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir, networkInterfaces } from 'node:os'
import { resolve, join, extname } from 'node:path'
const { webkit, devices } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
)
const root = await mkdtemp(join(tmpdir(), 'moment-webkit-'))
const server = createServer(async (req, res) => {
  try {
    const file = resolve(
      '.output/public',
      '.' +
        new URL(req.url, 'http://localhost').pathname.replace(
          /\/$/,
          '/index.html',
        ),
    )
    res.setHeader(
      'Content-Type',
      {
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.html': 'text/html',
        '.svg': 'image/svg+xml',
      }[extname(file)] || 'application/octet-stream',
    )
    res.end(await readFile(file))
  } catch {
    res.writeHead(404).end()
  }
})
await new Promise((r) => server.listen(0, '0.0.0.0', r))
const url = `http://127.0.0.1:${server.address().port}/`
let context
async function open(name, legacy, target = url) {
  context = await webkit.launchPersistentContext(join(root, name), {
    ...devices['iPhone 13'],
    headless: true,
    reducedMotion: 'reduce',
    ...(process.env.WEBKIT_EXECUTABLE
      ? { executablePath: process.env.WEBKIT_EXECUTABLE }
      : {}),
  })
  if (legacy)
    await context.addInitScript((data) => {
      for (const [key, value] of Object.entries(data))
        localStorage.setItem(key, value)
    }, legacy)
  const page = await context.newPage()
  page.on('pageerror', (e) => console.error(e.message))
  await page.goto(target)
  return page
}
const ready = (page) =>
  page.waitForFunction(
    () =>
      document.querySelector('.intro .primary') &&
      !document.querySelector('.intro .primary').disabled,
  )
const read = (page, store) =>
  page.evaluate(
    (store) =>
      new Promise((resolve, reject) => {
        const r = indexedDB.open('moment', 1)
        r.onsuccess = () => {
          const db = r.result
          const tx = db.transaction(store)
          const q = tx.objectStore(store).getAll()
          tx.oncomplete = () => {
            resolve(q.result)
            db.close()
          }
          tx.onabort = () => reject(tx.error)
        }
      }),
    store,
  )
async function save(page, title) {
  await page.locator('.intro .primary').click()
  await page.locator('.modal input:not([type])').fill(title)
  await page.locator('input[type=datetime-local]').fill('2030-12-20T12:00')
  await page.locator('.modal-submit').click()
}
const oldEvent = {
  id: 'old',
  title: 'Evento anterior Safari',
  date: '2030-12-20T12:00:00.000Z',
  category: 'custom',
  note: 'Mi nota',
  favorite: true,
  createdAt: 100,
}
const oldCategory = {
  id: 'custom',
  label: 'Mi categoría',
  emoji: 'music',
  color: 'rose',
}
const legacy = {
  'moment.events.v1': JSON.stringify([oldEvent]),
  'moment.categories.v1': JSON.stringify([oldCategory]),
}
try {
  let page = await open('existing', legacy)
  await ready(page)
  assert.deepEqual(await read(page, 'events'), [oldEvent])
  assert.deepEqual(await read(page, 'categories'), [oldCategory])
  for (const [key, value] of Object.entries(legacy))
    assert.equal(
      await page.evaluate((key) => localStorage.getItem(key), key),
      value,
    )
  await save(page, 'Guardado con WebKit')
  await page.locator('.modal').waitFor({ state: 'detached' })
  const other = await context.newPage()
  await other.goto(url)
  await ready(other)
  await Promise.all([save(page, 'WebKit A'), save(other, 'WebKit B')])
  await page.locator('.modal').waitFor({ state: 'detached' })
  await other.locator('.modal').waitFor({ state: 'detached' })
  assert.equal(
    (await read(page, 'events')).filter((e) => e.title.startsWith('WebKit '))
      .length,
    2,
  )
  await page.waitForFunction(() =>
    document.body.textContent.includes('WebKit B'),
  )
  await other.close()
  console.log(
    'OK WebKit/iPhone: migración intacta y escrituras simultáneas entre pestañas',
  )
  await page.evaluate(() => {
    window.realPut = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value) {
      const r = window.realPut.call(this, value)
      if (this.name === 'events')
        r.addEventListener('success', () => this.transaction.abort())
      return r
    }
  })
  await save(page, 'No confirmar aborto')
  await page.locator('.modal .storage-warning').waitFor()
  assert.equal(
    (await read(page, 'events')).some((e) => e.title === 'No confirmar aborto'),
    false,
  )
  assert.equal(
    await page.locator('.modal input:not([type])').inputValue(),
    'No confirmar aborto',
  )
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = window.realPut
  })
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click()
  await context.close()
  page = await open('existing')
  await ready(page)
  assert.equal(
    (await read(page, 'events')).some((e) => e.title === 'Guardado con WebKit'),
    true,
  )
  console.log(
    'OK WebKit: confirmación solo tras commit y datos conservados después de reiniciar',
  )
  const oldCard = page
    .locator('.event-card')
    .filter({ hasText: 'Evento anterior Safari' })
  await oldCard.getByRole('button', { name: 'Quitar de favoritos' }).click()
  await page.waitForFunction(() =>
    document.querySelector('.event-card .favorite[aria-pressed=false]'),
  )
  assert.equal(
    (await read(page, 'events')).find((e) => e.id === 'old').favorite,
    false,
  )
  await oldCard.getByRole('button', { name: 'Editar evento' }).click()
  await page
    .locator('.modal input:not([type])')
    .fill('Evento editado en WebKit')
  await page.locator('.manage-from-event').click()
  await page.locator('.category-manager .modal-submit').click()
  await page.locator('.category-manager input').fill('Categoría desde evento')
  await page.locator('.category-manager button[type=submit]').click()
  await page.locator('.category-success').waitFor()
  await page.getByRole('button', { name: 'Cerrar categorías' }).click()
  await page
    .locator('.category-picker button')
    .filter({ hasText: 'Categoría desde evento' })
    .click()
  await page.locator('.modal-submit').click()
  await page.locator('.modal').waitFor({ state: 'detached' })
  const changed = (await read(page, 'events')).find((e) => e.id === 'old')
  assert.equal(changed.title, 'Evento editado en WebKit')
  assert.equal(changed.favorite, false)
  assert.equal(
    (await read(page, 'categories')).find((c) => c.id === changed.category)
      .label,
    'Categoría desde evento',
  )
  console.log(
    'OK WebKit: favoritos, edición y categoría creada desde el formulario quedan guardados',
  )

  await page.evaluate(() => {
    localStorage.setItem('moment.events.v1', '{stale')
    localStorage.setItem('moment.categories.v1', '{stale')
  })
  await page.reload()
  await ready(page)
  assert.equal(
    (await read(page, 'events')).some((e) => e.title === 'Guardado con WebKit'),
    true,
  )
  console.log(
    'OK WebKit: tras migrar, datos antiguos dañados no afectan a IndexedDB',
  )
  while ((await read(page, 'events')).length) {
    await page
      .getByRole('button', { name: 'Eliminar evento', exact: true })
      .first()
      .click()
    await page.locator('.delete-modal .primary').click()
    await page.locator('.delete-modal').waitFor({ state: 'detached' })
    await page.locator('.cards-leave-active').waitFor({ state: 'detached' })
  }
  await context.close()
  page = await open('existing')
  await ready(page)
  assert.equal((await read(page, 'events')).length, 0)
  assert.equal((await read(page, 'categories')).length, 2)
  console.log(
    'OK WebKit: una lista vacía no resucita eventos ni ejemplos al reiniciar',
  )
  await context.close()
  page = await open('broken', {
    'moment.events.v1': legacy['moment.events.v1'],
    'moment.categories.v1': '{broken',
  })
  await page.locator('.storage-warning').waitFor()
  assert.equal((await read(page, 'events')).length, 0)
  assert.equal((await read(page, 'categories')).length, 0)
  const marker = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const r = indexedDB.open('moment', 1)
        r.onsuccess = () => {
          const db = r.result
          const tx = db.transaction('meta')
          const q = tx.objectStore('meta').get('initialized')
          tx.oncomplete = () => {
            resolve(q.result === true)
            db.close()
          }
        }
      }),
  )
  assert.equal(marker, false)
  assert.equal(
    await page.evaluate(() => localStorage.getItem('moment.categories.v1')),
    '{broken',
  )
  console.log(
    'OK WebKit: migración inválida aborta todo y conserva los originales sin crear ejemplos',
  )
  await context.close()
  page = await open('empty', { 'moment.events.v1': '[]' })
  await ready(page)
  assert.equal((await read(page, 'events')).length, 0)
  assert.equal((await read(page, 'categories')).length, 4)
  console.log('OK WebKit: lista vacía antigua se migra sin añadir ejemplos')
  await context.close()
  const lan = Object.values(networkInterfaces())
    .flat()
    .find(
      (address) => address && address.family === 'IPv4' && !address.internal,
    )
  if (lan) {
    const lanURL = `http://${lan.address}:${server.address().port}/`
    page = await open('lan', undefined, lanURL)
    await ready(page)
    assert.equal(await page.evaluate(() => isSecureContext), false)
    assert.equal(
      await page.evaluate(() => typeof crypto.randomUUID),
      'undefined',
    )
    assert.equal((await read(page, 'events')).length, 3)
    await page.locator('.manage-categories-button').click()
    await page.locator('.category-manager .modal-submit').click()
    await page
      .locator('.category-manager input')
      .fill('Categoría por red local')
    await page.locator('.category-manager button[type=submit]').click()
    await page.locator('.category-success').waitFor()
    assert.equal(
      (await read(page, 'categories')).some(
        (c) => c.label === 'Categoría por red local',
      ),
      true,
    )
    await page.getByRole('button', { name: 'Cerrar categorías' }).click()
    await save(page, 'Evento por red local HTTP')
    await page.locator('.modal').waitFor({ state: 'detached' })
    await context.close()
    page = await open('lan', undefined, lanURL)
    await ready(page)
    assert.equal(
      (await read(page, 'events')).some(
        (e) => e.title === 'Evento por red local HTTP',
      ),
      true,
    )
    console.log(
      'OK WebKit HTTP por IP local: carga, categoría, evento y reinicio sin randomUUID',
    )
    await context.close()
  } else {
    throw Error('La prueba HTTP por IP necesita una interfaz IPv4 local')
  }
} finally {
  await context?.close()
  server.close()
  await rm(root, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  })
}
