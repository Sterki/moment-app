// Run after npm run generate: node tests/storage-browser.mjs (requires Google Chrome).
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, extname } from 'node:path'
import { createServer } from 'node:http'
const profile = await mkdtemp(join(tmpdir(), 'moment-storage-'))
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
    const data = await readFile(file)
    res.setHeader(
      'Content-Type',
      {
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.html': 'text/html',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
      }[extname(file)] || 'application/octet-stream',
    )
    res.end(data)
  } catch {
    res.writeHead(404).end()
  }
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const url = `http://127.0.0.1:${server.address().port}/`
let chrome,
  clients = []
const delay = (ms) => new Promise((r) => setTimeout(r, ms))
async function client(wsUrl) {
  const ws = new WebSocket(wsUrl)
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.id) {
      pending.get(m.id)?.(m)
      pending.delete(m.id)
    }
  })
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const n = ++id
      pending.set(n, (m) =>
        m.error ? reject(Error(JSON.stringify(m.error))) : resolve(m.result),
      )
      ws.send(JSON.stringify({ id: n, method, params }))
    })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })
    if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails))
    return r.result.value
  }
  const wait = async (expression) => {
    for (let n = 0; n < 100; n++) {
      if (await evaluate(expression)) return
      await delay(50)
    }
    throw Error('Timed out: ' + expression)
  }
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.method === 'Runtime.exceptionThrown')
      console.error(JSON.stringify(m.params))
  })
  await send('Runtime.enable')
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  })
  const c = { send, evaluate, wait, ws }
  clients.push(c)
  return c
}
async function openBrowser(legacy) {
  chrome = spawn(
    process.env.CHROME_BIN || 'google-chrome',
    [
      '--headless',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--no-sandbox',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
  let output = ''
  const endpoint = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error(output)), 15000)
    chrome.stderr.on('data', (d) => {
      output += d
      const m = output.match(/DevTools listening on (ws:\/\/[^\s]+)/)
      if (m) {
        clearTimeout(timeout)
        resolve(m[1])
      }
    })
    chrome.once('error', reject)
  })
  const origin = endpoint.replace('ws:', 'http:').split('/devtools/')[0]
  const pages = await (await fetch(origin + '/json')).json()
  const c = await client(
    pages.find((p) => p.type === 'page').webSocketDebuggerUrl,
  )
  await c.send('Page.enable')
  if (legacy)
    await c.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `for(const [key,value] of Object.entries(${JSON.stringify(legacy)})) localStorage.setItem(key,value)`,
    })
  await c.send('Page.navigate', { url })
  try {
    await c.wait(
      "document.querySelector('.intro .primary') && !document.querySelector('.intro .primary').disabled",
    )
  } catch (e) {
    console.error(await c.evaluate('document.documentElement.outerHTML'))
    throw e
  }
  return { c, origin }
}
async function closeBrowser(c) {
  const exited = new Promise((r) => chrome.once('exit', r))
  await c.send('Browser.close').catch(() => {})
  await exited
  for (const c of clients) c.ws.close()
  clients = []
}
async function save(c, title) {
  await c.send('Page.bringToFront')
  await c.evaluate("document.querySelector('.intro .primary').click()")
  await c.wait("document.querySelector('.modal')?.open")
  await c.evaluate(
    `(()=>{const title=document.querySelector('.modal input:not([type])');title.value=${JSON.stringify(title)};title.dispatchEvent(new Event('input',{bubbles:true}));const date=document.querySelector('input[type=datetime-local]');date.value='2030-12-20T12:00';date.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.modal form').requestSubmit()})()`,
  )
}
const legacyEvent = {
  id: 'legacy-event',
  title: 'Mi evento anterior',
  date: '2030-12-20T12:00:00.000Z',
  category: 'legacy-category',
  note: 'Conservar mi nota',
  favorite: true,
  createdAt: 12345,
}
const legacyCategory = {
  id: 'legacy-category',
  label: 'Mi categoría anterior',
  emoji: 'music',
  color: 'rose',
}
const legacy = {
  'moment.events.v1': JSON.stringify([legacyEvent]),
  'moment.categories.v1': JSON.stringify([legacyCategory]),
}
const read = (c, store) =>
  c.evaluate(
    `new Promise((resolve,reject)=>{const r=indexedDB.open('moment',1);r.onsuccess=()=>{const db=r.result;const tx=db.transaction(${JSON.stringify(store)});const q=tx.objectStore(${JSON.stringify(store)}).getAll();tx.oncomplete=()=>{resolve(q.result);db.close()};tx.onabort=()=>reject(tx.error)}})`,
  )
const click = async (c, selector) => {
  await c.send('Page.bringToFront')
  return c.evaluate(
    `document.querySelector(${JSON.stringify(selector)}).click()`,
  )
}
const input = (c, selector, value) =>
  c.evaluate(
    `(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}))})()`,
  )
try {
  let { c, origin } = await openBrowser(legacy)
  assert.deepEqual(await read(c, 'events'), [legacyEvent])
  assert.deepEqual(await read(c, 'categories'), [legacyCategory])
  for (const [key, value] of Object.entries(legacy))
    assert.equal(
      await c.evaluate(`localStorage.getItem(${JSON.stringify(key)})`),
      value,
    )
  console.log(
    'OK: migración de eventos y categorías conserva todos los campos y los originales',
  )
  await save(c, 'Persistencia al cerrar Chrome')
  await c.wait("!document.querySelector('.modal')")
  await closeBrowser(c)
  ;({ c, origin } = await openBrowser())
  assert.equal(
    (await read(c, 'events')).some(
      (e) => e.title === 'Persistencia al cerrar Chrome',
    ),
    true,
  )
  console.log(
    'OK: IndexedDB conserva eventos después de cerrar y reiniciar el navegador completo',
  )
  const target = await c.send('Target.createTarget', { url })
  const pages = await (await fetch(origin + '/json')).json()
  const second = await client(
    pages.find((p) => p.id === target.targetId).webSocketDebuggerUrl,
  )
  await second.wait(
    "document.querySelector('.intro .primary') && !document.querySelector('.intro .primary').disabled",
  )
  await Promise.all([save(c, 'Concurrente A'), save(second, 'Concurrente B')])
  await c.wait("!document.querySelector('.modal')")
  await second.wait("!document.querySelector('.modal')")
  assert.equal(
    (await read(c, 'events')).filter((e) => e.title.startsWith('Concurrente'))
      .length,
    2,
  )
  await c.wait("document.body.textContent.includes('Concurrente B')")
  console.log(
    'OK: dos pestañas crean simultáneamente sin perder registros y actualizan la vista',
  )
  // An individual request may succeed and still be rolled back: only tx.complete is success.
  await c.evaluate(
    "window.realPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value){const r=window.realPut.call(this,value);if(this.name==='events')r.addEventListener('success',()=>this.transaction.abort());return r}",
  )
  await save(c, 'Transacción abortada')
  await c.wait("document.querySelector('.modal .storage-warning')")
  assert.equal(
    (await read(c, 'events')).some((e) => e.title === 'Transacción abortada'),
    false,
  )
  assert.equal(
    await c.evaluate("document.querySelector('.modal input').value"),
    'Transacción abortada',
  )
  await c.evaluate(
    "IDBObjectStore.prototype.put=window.realPut;document.querySelector('[aria-label=Cerrar]').click()",
  )
  console.log(
    'OK: un aborto tras request.success no anuncia guardado ni descarta el formulario',
  )
  await click(c, '.manage-categories-button')
  await c.wait("document.querySelector('.category-manager')?.open")
  await click(c, '.category-manager .modal-submit')
  await input(c, '.category-manager input', 'Categoría nueva')
  await c.evaluate(
    "window.realPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value){const r=window.realPut.call(this,value);if(this.name==='categories')r.addEventListener('success',()=>this.transaction.abort());return r};document.querySelector('.category-manager form').requestSubmit()",
  )
  await c.wait("document.querySelector('.category-form-error')")
  assert.equal((await read(c, 'categories')).length, 1)
  assert.equal(
    await c.evaluate("document.querySelector('.category-manager input').value"),
    'Categoría nueva',
  )
  await c.evaluate(
    "IDBObjectStore.prototype.put=window.realPut;document.querySelector('.category-manager form').requestSubmit()",
  )
  await c.wait("document.querySelector('.category-success')")
  assert.equal((await read(c, 'categories')).length, 2)
  await click(c, '[aria-label="Cerrar categorías"]')
  console.log(
    'OK: categoría fallida permanece en el formulario y se guarda al reintentar',
  )
  // Delete using the UI and prove that old localStorage data cannot resurrect it.
  while ((await read(c, 'events')).length) {
    await click(c, '[aria-label="Eliminar evento"]')
    await c.wait("document.querySelector('.delete-modal')?.open")
    await click(c, '.delete-modal .primary')
    await c.wait("!document.querySelector('.delete-modal')")
    await c.wait("!document.querySelector('.cards-leave-active')")
  }
  await c.send('Page.reload')
  await c.wait(
    "document.querySelector('.intro .primary') && !document.querySelector('.intro .primary').disabled",
  )
  assert.equal((await read(c, 'events')).length, 0)
  assert.equal(
    await c.evaluate("document.querySelectorAll('.event-card').length"),
    0,
  )
  assert.equal(
    await c.evaluate("localStorage.getItem('moment.events.v1')"),
    legacy['moment.events.v1'],
  )
  console.log(
    'OK: eliminar todos los eventos no vuelve a importar los antiguos ni recrea ejemplos',
  )
  await closeBrowser(c)
  ;({ c } = await openBrowser())
  assert.equal((await read(c, 'events')).length, 0)
  assert.equal((await read(c, 'categories')).length, 2)
  console.log('OK: lista vacía y categorías también persisten tras reiniciar')
  await closeBrowser(c)
} finally {
  for (const c of clients) c.ws.close()
  chrome?.kill()
  server.close()
  await rm(profile, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  })
}
