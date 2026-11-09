// Optional WebKit check: install playwright and its WebKit browser first.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join, extname } from 'node:path'
const { webkit, devices } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
)
const root = await mkdtemp(join(tmpdir(), 'moment-appearance-webkit-'))
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

async function menu(page) {
  await page.getByRole('button', { name: 'Apariencia', exact: true }).click()
  await page.locator('.appearance-menu').waitFor()
}
try {
  let page = await open('appearance')
  await ready(page)
  await page.waitForFunction(
    () => !document.querySelector('.appearance-trigger').disabled,
  )
  const events = await read(page, 'events')
  const originalCard = await page
    .locator('.event-card')
    .first()
    .evaluate((e) => getComputedStyle(e).backgroundImage)
  await menu(page)
  const cardPalettes = []
  for (const label of ['Amanecer', 'Lavanda', 'Océano', 'Bosque', 'Noche']) {
    await page
      .locator('.background-options button')
      .filter({ hasText: label })
      .click()
    cardPalettes.push(
      await page
        .locator('.event-card')
        .first()
        .evaluate((e) => getComputedStyle(e).backgroundImage),
    )
  }
  assert.equal(new Set(cardPalettes).size, 5)
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  assert.equal(
    await page
      .locator('.event-card')
      .first()
      .evaluate((e) => getComputedStyle(e).backgroundImage),
    originalCard,
  )
  console.log(
    'OK WebKit: cinco paletas distintas adaptan las tarjetas y Cancelar restaura su diseño',
  )
  await menu(page)
  await page
    .locator('.background-options button')
    .filter({ hasText: 'Noche' })
    .click()
  assert.equal(
    await page
      .locator('.app-surface')
      .evaluate((e) => e.classList.contains('theme-dark')),
    true,
  )
  assert.equal(await page.evaluate(() => document.body.style.position), 'fixed')
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  assert.equal(
    await page
      .locator('.app-surface')
      .evaluate((e) => e.classList.contains('theme-dark')),
    false,
  )
  await menu(page)
  await page
    .locator('.background-options button')
    .filter({ hasText: 'Noche' })
    .click()
  await page
    .locator('.motion-options button')
    .filter({ hasText: 'Destellos' })
    .click()
  await page.getByRole('button', { name: 'Guardar apariencia' }).click()
  await page.locator('.appearance-menu').waitFor({ state: 'detached' })
  await context.close()
  page = await open('appearance')
  await ready(page)
  await page.waitForFunction(() => document.querySelector('.theme-dark'))
  assert.equal(await page.locator('.appearance-background').count(), 0)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.waitForFunction(
    () => document.querySelectorAll('.appearance-spark').length === 12,
  )
  assert.equal(
    await page
      .locator('.appearance-spark')
      .evaluateAll((items) =>
        items.every(
          (e) =>
            parseFloat(getComputedStyle(e).width) >= 8 &&
            parseFloat(getComputedStyle(e).width) <= 16,
        ),
      ),
    true,
  )
  assert.equal(
    await page
      .locator('.appearance-background')
      .evaluate((e) => getComputedStyle(e).pointerEvents),
    'none',
  )
  console.log(
    'OK WebKit: paleta, persistencia, destellos visibles de 8–16 px y Reducir movimiento',
  )
  await menu(page)
  for (const width of [320, 375, 430, 768]) {
    await page.setViewportSize({ width, height: 812 })
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    )
    assert.equal(
      await page
        .locator('.appearance-menu')
        .evaluate((e) => e.scrollWidth <= e.clientWidth),
      true,
    )
  }
  await page.setViewportSize({ width: 375, height: 812 })
  await page.screenshot({ path: '/tmp/moment-appearance-webkit.png' })
  await page.getByRole('button', { name: 'Restablecer apariencia' }).click()
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  assert.equal(
    await page
      .locator('.app-surface')
      .evaluate((e) => e.classList.contains('theme-dark')),
    true,
  )
  await menu(page)
  await page
    .locator('.background-options button')
    .filter({ hasText: 'Océano' })
    .click()
  await page.evaluate(() => {
    window.originalPut = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (value, key) {
      const r = window.originalPut.apply(this, arguments)
      if (this.name === 'meta' && key === 'appearance.v1')
        r.addEventListener('success', () => this.transaction.abort())
      return r
    }
  })
  await page.getByRole('button', { name: 'Guardar apariencia' }).click()
  await page.locator('.appearance-menu .storage-warning').waitFor()
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = window.originalPut
  })
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  console.log(
    'OK WebKit: tamaños móviles, restauración cancelable y transacción abortada sin falso éxito',
  )
  await page
    .getByRole('button', { name: 'Personalizar categorías', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Nueva categoría', exact: true })
    .click()
  await page.locator('.category-manager input').fill('Familia')
  await page.getByRole('button', { name: 'Emojis', exact: true }).click()
  assert.ok((await page.locator('.emoji-results button').count()) >= 200)
  await page
    .getByRole('searchbox', { name: 'Buscar emojis' })
    .fill('graduacion')
  assert.equal(await page.locator('.emoji-results button').count(), 1)
  await page.getByRole('searchbox', { name: 'Buscar emojis' }).press('Enter')
  assert.equal(await page.locator('.category-manager form').count(), 1)
  await page.getByRole('textbox', { name: 'Emoji personalizado' }).fill('work')
  await page.getByRole('button', { name: 'Usar emoji' }).click()
  await page.locator('.emoji-picker [role=alert]').waitFor()
  await page.getByRole('textbox', { name: 'Emoji personalizado' }).fill('👨‍👩‍👧‍👦')
  await page.getByRole('button', { name: 'Usar emoji' }).click()
  await page.setViewportSize({ width: 320, height: 650 })
  assert.equal(
    await page
      .locator('.category-manager')
      .evaluate((e) => e.scrollWidth <= e.clientWidth),
    true,
  )
  await page.screenshot({ path: '/tmp/moment-emojis-webkit.png' })
  await page
    .getByRole('button', { name: 'Crear categoría', exact: true })
    .click()
  await page.locator('.category-success').waitFor()
  await page
    .getByRole('button', { name: 'Cerrar categorías', exact: true })
    .click()
  await page.reload()
  await ready(page)
  assert.equal(
    (await read(page, 'categories')).find((c) => c.label === 'Familia').emoji,
    '👨‍👩‍👧‍👦',
  )
  assert.deepEqual(await read(page, 'events'), events)
  console.log(
    'OK WebKit: 216 emojis, búsqueda sin acentos, Enter no guarda el formulario y familia compuesta persiste sin alterar eventos',
  )
  await page.setViewportSize({ width: 375, height: 812 })
  await page.screenshot({
    path: '/tmp/moment-night-cohesive.png',
    fullPage: true,
  })
  await menu(page)
  await page
    .locator('.background-options button')
    .filter({ hasText: 'Océano' })
    .click()
  await page
    .locator('.motion-options button')
    .filter({ hasText: 'Luz suave' })
    .click()
  await page.getByRole('button', { name: 'Guardar apariencia' }).click()
  await page.locator('.appearance-menu').waitFor({ state: 'detached' })
  await page.waitForFunction(
    () => document.querySelectorAll('.appearance-light').length === 3,
  )
  const before = await page
    .locator('.light-one')
    .evaluate((e) => getComputedStyle(e).transform)
  await page.waitForTimeout(500)
  assert.notEqual(
    await page
      .locator('.light-one')
      .evaluate((e) => getComputedStyle(e).transform),
    before,
  )
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.screenshot({ path: '/tmp/moment-ocean-cohesive.png' })
  await menu(page)
  await page
    .locator('.background-options button')
    .filter({ hasText: 'Amanecer' })
    .click()
  await page.getByRole('button', { name: 'Guardar apariencia' }).click()
  await page.locator('.appearance-menu').waitFor({ state: 'detached' })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.screenshot({
    path: '/tmp/moment-sunrise-cohesive.png',
    fullPage: true,
  })
  console.log(
    'OK WebKit: luces amplias en movimiento y revisión visual de Amanecer, Océano y Noche',
  )
  await context.close()
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
