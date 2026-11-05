# Moment

SPA de cuentas atrás con Nuxt 3, Vue 3, TypeScript y CSS propio. Sin backend ni rutas adicionales.

## Desarrollo

```sh
npm install
npm run dev
```

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

Los eventos se guardan en `localStorage`, bajo `moment.events.v1`. Los ejemplos se crean solo en la primera visita. El usuario puede crear, editar, eliminar, marcar favoritos, buscar, filtrar y ordenar. Las fechas se introducen en hora local y se almacenan como ISO. Los eventos vencidos aparecen en Pasados. No hay sincronización entre dispositivos; borrar los datos del navegador elimina los eventos. La aplicación muestra un aviso si el almacenamiento falla. Google Fonts es opcional: el diseño incluye fuentes de reserva.

## Categorías personalizadas

Usa **Personalizar categorías**, encima de los filtros o dentro del formulario de un evento. Puedes crear categorías y editar las existentes, eligiendo nombre, seis colores, 24 iconos de Lucide o 12 emojis. La vista previa cambia al seleccionar. Los nombres vacíos o duplicados no se aceptan. Las ediciones conservan el identificador de la categoría y actualizan todos sus eventos sin cambiar sus fechas ni datos.

Las categorías se almacenan en `moment.categories.v1`, conservando los eventos existentes en `moment.events.v1`. No se necesita migrar ni borrar los datos anteriores.
