// Optional WebKit check: install playwright and its WebKit browser first.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join, extname } from 'node:path'
const { webkit, devices } = await import(
  process.env.PLAYWRIGHT_MODULE || 'playwright'
)
const root = await mkdtemp(join(tmpdir(), 'moment-featured-'))
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
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const url = `http://127.0.0.1:${server.address().port}/`
let context
async function open(name, legacy, clock, mobile = true) {
  context = await webkit.launchPersistentContext(join(root, name), {
    ...(mobile
      ? devices['iPhone 13']
      : { viewport: { width: 1440, height: 1000 } }),
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
  await page.clock.install({ time: clock })
  await page.goto(url)
  return page
}
const ready = (page) =>
  page.waitForFunction(
    () =>
      document.querySelector('.intro .primary') &&
      !document.querySelector('.intro .primary').disabled,
  )

const fixed = new Date('2030-01-01T12:00:00Z')
const make = (id, title, offset, favorite, category) => ({
  id,
  title,
  date: new Date(+fixed + offset).toISOString(),
  category,
  note: 'Una pequeña ilusión para compartir.',
  favorite,
  createdAt: 100,
})
const events = [
  make('near', 'Un café con alguien especial', 10000, false, 'coffee'),
  make('favorite', 'Un viaje muy esperado', 86400000, true, 'travel'),
  make('past', 'Un evento pasado', -1000, true, 'travel'),
]
const legacy = {
  'moment.events.v1': JSON.stringify(events),
  'moment.categories.v1': JSON.stringify([
    { id: 'coffee', label: 'Pequeños planes', emoji: 'coffee', color: 'sage' },
    { id: 'travel', label: 'Viajes', emoji: 'plane', color: 'sky' },
  ]),
}
try {
  let page = await open('featured', legacy, fixed)
  await ready(page)
  assert.equal(
    await page.locator('#featured-title').innerText(),
    events[0].title,
  )
  assert.equal(
    await page.locator('.hero-category-label').innerText(),
    'Pequeños planes',
  )
  assert.equal(
    await page.locator('.hero-countdown-heading').innerText(),
    'Ya casi está aquí.',
  )
  await page.getByRole('tab', { name: /Favoritos/ }).click()
  await page.locator('.search input').fill('viaje')
  await page.locator('.sort-control select').selectOption('name')
  assert.equal(
    await page.locator('#featured-title').innerText(),
    events[0].title,
  )
  console.log(
    'OK: fecha más cercana gana a favoritos y no depende de filtros ni ordenación',
  )
  for (const width of [320, 375, 430, 768]) {
    await page.setViewportSize({ width, height: 900 })
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `Overflow at ${width}`,
    )
    assert.equal(
      await page
        .locator('.hero')
        .evaluate((e) => e.scrollWidth <= e.clientWidth),
      true,
      `Hero overflow at ${width}`,
    )
  }
  await page.setViewportSize({ width: 375, height: 812 })
  await page.screenshot({
    path: '/tmp/moment-featured-mobile.png',
    fullPage: true,
  })
  await page.clock.fastForward(11000)
  await page.waitForFunction(
    () =>
      document.querySelector('#featured-title')?.textContent ===
      'Un viaje muy esperado',
  )
  assert.equal(
    await page.locator('.hero').evaluate((e) => e.classList.contains('sky')),
    true,
  )
  console.log(
    'OK: al vencer el destacado, pasa al siguiente y actualiza su categoría',
  )
  await context.close()
  page = await open('featured', undefined, new Date(+fixed + 11000), false)
  await ready(page)
  assert.equal(
    await page.locator('#featured-title').innerText(),
    'Un viaje muy esperado',
  )
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  )
  await page.screenshot({
    path: '/tmp/moment-featured-desktop.png',
    fullPage: true,
  })
  await page.clock.fastForward(86400000)
  await page.waitForFunction(
    () =>
      document.querySelector('#featured-title')?.textContent ===
      'Todo empieza con una ilusión.',
  )
  assert.equal(await page.locator('.hero-countdown').count(), 0)
  console.log(
    'OK: escritorio y estado sin próximos eventos; nunca destaca un evento pasado',
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
