// Run after npm run generate: node tests/storage-browser.mjs (requires Google Chrome).
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
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

const click = (c, selector) =>
  c.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)
const fill = (c, selector, value) =>
  c.evaluate(
    `(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('input',{bubbles:true}))})()`,
  )
const read = (c, store, key) =>
  c.evaluate(
    `new Promise((resolve,reject)=>{const r=indexedDB.open('moment',1);r.onsuccess=()=>{const db=r.result;const tx=db.transaction(${JSON.stringify(store)});const q=${key === undefined ? `tx.objectStore(${JSON.stringify(store)}).getAll()` : `tx.objectStore(${JSON.stringify(store)}).get(${JSON.stringify(key)})`};tx.oncomplete=()=>{resolve(q.result);db.close()};tx.onabort=()=>reject(tx.error)}})`,
  )
const openAppearance = async (c) => {
  await click(c, '.appearance-trigger')
  await c.wait("document.querySelector('.appearance-menu')?.open")
}
try {
  let { c, origin } = await openBrowser()
  await c.wait("!document.querySelector('.appearance-trigger').disabled")
  const originalEvents = await read(c, 'events')
  await openAppearance(c)
  await click(c, '.background-options button:nth-child(6)')
  await c.wait(
    "document.querySelector('.app-surface').classList.contains('theme-dark')",
  )
  assert.equal(
    await c.evaluate('document.body.style.position'),
    'fixed',
    'preview retains scroll lock',
  )
  await click(c, '.appearance-actions .secondary')
  await c.wait("!document.querySelector('.appearance-menu')")
  assert.equal(
    await c.evaluate(
      "document.querySelector('.app-surface').classList.contains('theme-dark')",
    ),
    false,
  )
  assert.equal(await read(c, 'meta', 'appearance.v1'), undefined)
  console.log(
    'OK: vista previa y Cancelar no persisten; bloqueo de scroll intacto',
  )
  await openAppearance(c)
  await click(c, '.background-options button:nth-child(6)')
  await click(c, '.motion-options button:nth-child(3)')
  await c.evaluate(
    "document.querySelector('.appearance-menu form').requestSubmit()",
  )
  await c.wait("!document.querySelector('.appearance-menu')")
  assert.equal((await read(c, 'meta', 'appearance.v1')).background, 'night')
  await closeBrowser(c)
  ;({ c, origin } = await openBrowser())
  await c.wait("!document.querySelector('.appearance-trigger').disabled")
  assert.equal(
    await c.evaluate(
      "document.querySelector('.app-surface').classList.contains('theme-dark')",
    ),
    true,
  )
  assert.equal(
    await c.evaluate(
      "document.querySelectorAll('.appearance-background').length",
    ),
    0,
    'reduced motion',
  )
  await c.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
  })
  await c.wait("document.querySelectorAll('.appearance-spark').length===12")
  assert.equal(
    await c.evaluate(
      "[...document.querySelectorAll('.appearance-spark')].every(e=>parseFloat(getComputedStyle(e).width)>=8 && parseFloat(getComputedStyle(e).width)<=16)",
    ),
    true,
  )
  console.log(
    'OK: preferencias tras reiniciar, Reducir movimiento y destellos pequeños',
  )
  await openAppearance(c)
  for (const width of [320, 375, 430, 768, 1440]) {
    await c.send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 850,
      deviceScaleFactor: 1,
      mobile: width < 800,
    })
    await c.send('Emulation.setTouchEmulationEnabled', { enabled: width < 800 })
    assert.equal(
      await c.evaluate('document.documentElement.scrollWidth<=innerWidth'),
      true,
      `page overflow ${width}`,
    )
    assert.equal(
      await c.evaluate(
        "document.querySelector('.appearance-menu').scrollWidth<=document.querySelector('.appearance-menu').clientWidth",
      ),
      true,
      `menu overflow ${width}`,
    )
  }
  await c.send('Emulation.setDeviceMetricsOverride', {
    width: 375,
    height: 812,
    deviceScaleFactor: 1,
    mobile: true,
  })
  let shot = await c.send('Page.captureScreenshot', {})
  await writeFile(
    '/tmp/moment-appearance-night.png',
    Buffer.from(shot.data, 'base64'),
  )
  await fill(c, '#appearance-color', '#ffffff')
  await c.wait(
    "!document.querySelector('.app-surface').classList.contains('theme-dark')",
  )
  await fill(c, '#appearance-color', '#152433')
  await c.wait(
    "document.querySelector('.app-surface').classList.contains('theme-dark')",
  )
  await c.evaluate(
    "window.originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,key){const r=window.originalPut.apply(this,arguments);if(this.name==='meta'&&key==='appearance.v1')r.addEventListener('success',()=>this.transaction.abort());return r};document.querySelector('.appearance-menu form').requestSubmit()",
  )
  await c.wait("document.querySelector('.appearance-menu .storage-warning')")
  assert.equal((await read(c, 'meta', 'appearance.v1')).background, 'night')
  await c.evaluate('IDBObjectStore.prototype.put=window.originalPut')
  await click(c, '.appearance-actions .secondary')
  console.log(
    'OK: color personalizado adapta contraste; fallo de guardado conserva menú y preferencias anteriores',
  )
  await click(c, '.manage-categories-button')
  await c.wait("document.querySelector('.category-manager')?.open")
  await click(c, '.category-manager .modal-submit')
  await fill(c, '.category-manager input', 'Equipo')
  await click(c, '.symbol-tabs button:last-child')
  await c.wait("document.querySelector('.emoji-picker')")
  assert.ok(
    (await c.evaluate(
      "document.querySelectorAll('.emoji-results button').length",
    )) >= 200,
  )
  await fill(c, '.emoji-search input', 'graduacion')
  await c.wait("document.querySelectorAll('.emoji-results button').length===1")
  await fill(c, '.emoji-search input', 'zzzzzz')
  await c.wait("document.querySelector('.emoji-results [role=status]')")
  await fill(c, '.custom-emoji input', 'work')
  await click(c, '.custom-emoji button')
  await c.wait("document.querySelector('.emoji-picker [role=alert]')")
  await fill(c, '.custom-emoji input', '👩🏽‍💻')
  await click(c, '.custom-emoji button')
  await c.wait(
    "document.querySelector('.category-preview').textContent.includes('👩🏽‍💻')",
  )
  await c.evaluate(
    "document.querySelector('.category-manager form').requestSubmit()",
  )
  await c.wait("document.querySelector('.category-success')")
  assert.equal(
    (await read(c, 'categories')).find((v) => v.label === 'Equipo').emoji,
    '👩🏽‍💻',
  )
  await click(c, '[aria-label="Cerrar categorías"]')
  await c.send('Page.reload')
  await c.wait("document.body.textContent.includes('Equipo')")
  assert.deepEqual(await read(c, 'events'), originalEvents)
  console.log(
    'OK: más de 200 emojis, búsqueda sin acentos, emoji personalizado persistente; eventos intactos',
  )
  await openAppearance(c)
  await c.evaluate(
    "[...document.querySelectorAll('.appearance-menu .text-button')].find(e=>e.textContent.includes('Restablecer')).click()",
  )
  await c.evaluate(
    "document.querySelector('.appearance-menu form').requestSubmit()",
  )
  await c.wait("!document.querySelector('.appearance-menu')")
  assert.deepEqual(await read(c, 'meta', 'appearance.v1'), {
    background: 'original',
    color: '#fafbf7',
    motion: 'none',
  })
  console.log('OK: restablecer guarda los valores originales')
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
