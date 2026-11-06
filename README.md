# Moment

SPA de cuentas atrás con Nuxt 3, Vue 3, TypeScript y CSS propio. Sin backend ni rutas adicionales.

## Desarrollo

```sh
npm install
npm run dev
```

Para probar desde un iPhone en la misma red, usa la dirección de red que muestra Nuxt (por ejemplo `http://192.168.x.x:3000`). Los identificadores funcionan también en HTTP local. Los scripts de producción usan `.nuxt-production` para no sobrescribir los archivos temporales del servidor de desarrollo.

## Validación y publicación estática

```sh
npm run typecheck
npm run generate
```

Publica `.output/public` en cualquier hosting estático.

## Estructura

- `app.vue`: composición de la pantalla, filtros y selección.
- `components/EventCard.vue`: tarjeta de evento.
- `components/EventModal.vue`: formulario nativo con validación y diálogo accesible.
- `composables/useEvents.ts`: carga, validación, persistencia y reloj compartido.
- `components/CategoryManager.vue`: creación y edición con vista previa, colores y selector de símbolos.
- `components/CategorySymbol.vue`: representación común de iconos y emojis.
- `composables/useCategories.ts`: categorías y persistencia independiente.
- `types/event.ts`: modelo del evento y funciones de fechas.
- `types/category.ts` y `types/symbols.ts`: categorías, paleta y catálogo de símbolos.
- `assets/css/main.css`: diseño adaptable, transiciones y movimiento reducido.

Los eventos se guardan en IndexedDB, en la base de datos `moment`, dentro del almacén `events`. Los ejemplos se crean solo en la primera visita. El usuario puede crear, editar, eliminar, marcar favoritos, buscar, filtrar y ordenar. Las fechas se introducen en hora local y se almacenan como ISO. Los eventos vencidos aparecen en Pasados. No hay sincronización entre dispositivos; borrar los datos del navegador elimina los eventos. La aplicación muestra un aviso si el almacenamiento falla. Google Fonts es opcional: el diseño incluye fuentes de reserva.

## Categorías personalizadas

Usa **Personalizar categorías**, encima de los filtros o dentro del formulario de un evento. Puedes crear categorías y editar las existentes, eligiendo nombre, seis colores, 24 iconos de Lucide o 12 emojis. La vista previa cambia al seleccionar. Los nombres vacíos o duplicados no se aceptan. Las ediciones conservan el identificador de la categoría y actualizan todos sus eventos sin cambiar sus fechas ni datos.

Las categorías se guardan en el almacén `categories` de IndexedDB. Al abrir esta versión por primera vez se migran automáticamente los datos antiguos de `moment.events.v1` y `moment.categories.v1`; sus originales en `localStorage` no se borran ni modifican.

## Persistencia y comprobación

IndexedDB usa la base de datos `moment` (versión 1) y los almacenes `events`, `categories` y `meta`. Cada cambio escribe únicamente su registro; los cambios de favorito y la comprobación de nombres de categoría se realizan dentro de una transacción. Se confirma el guardado solo con `transaction.complete`, y los formularios permanecen abiertos ante un error o aborto.

La migración de las dos listas antiguas y el marcador `initialized` se guardan en una única transacción. Las listas vacías se respetan. Si los datos antiguos no se pueden leer o validar, la migración se aborta y se muestra un aviso, sin crear ejemplos ni modificar los originales. Se puede leer una copia `.backup` de la versión anterior, si existe. Después de migrar, IndexedDB es la fuente de datos: no se vuelven a importar datos antiguos al vaciar la lista. Los ejemplos solo se crean para una instalación nueva.

Las vistas se actualizan mediante BroadcastChannel, al volver a primer plano y mediante `pageshow`. Se solicita almacenamiento persistente como protección adicional, pero el navegador puede rechazarlo. IndexedDB no es una copia de seguridad externa: borrar los datos del sitio puede eliminarlo. No hay copia en servidor ni sincronización entre dispositivos. Navegación privada, otra dirección (incluido HTTP frente a HTTPS), otro navegador o la app de pantalla de inicio pueden usar almacenes diferentes.

Pruebas (Node 22.6+; la prueba de Chrome usa un perfil temporal aislado y admite `CHROME_BIN`):

```sh
node --experimental-strip-types --test tests/localStore.test.mjs
npm run generate
node tests/storage-browser.mjs
```

Comprueban migración intacta, reinicio completo del navegador, escrituras simultáneas entre pestañas, transacciones abortadas después de que una petición haya tenido éxito, reintento de categorías y persistencia de listas vacías.

Para la comprobación adicional con WebKit y tamaño de iPhone, instala Playwright y su navegador WebKit en el entorno de pruebas y ejecuta `node tests/storage-webkit.mjs`. Admite `PLAYWRIGHT_MODULE` para una instalación externa y `WEBKIT_EXECUTABLE` para un ejecutable personalizado. Esta prueba incluye la reversión de una migración inválida. La emulación de WebKit no sustituye una prueba final en un iPhone real.

## Momento destacado

El bloque superior muestra el evento futuro más cercano por fecha y hora, sin prioridad de favoritos e independientemente de los filtros de tarjetas. Al llegar su hora, pasa al siguiente evento pendiente. Usa el color y símbolo de su categoría, fecha y hora locales y una cuenta atrás adaptable a móvil.

La prueba `node tests/featured-webkit.mjs` (con el mismo entorno Playwright/WebKit) comprueba la prioridad cronológica frente a favoritos, independencia de filtros, relevo al vencer, estado vacío y tamaños de móvil y escritorio.
