import { watch, onBeforeUnmount, type Ref } from 'vue'

// Shared across nested dialogs: only the last close restores the page scroll.
let locks = 0
let restorePage: (() => void) | undefined

export function useModalDialog(
  dialog: Ref<HTMLDialogElement | undefined>,
  close: () => void,
) {
  let release: (() => void) | undefined
  let startedOutside = false
  const outside = (event: MouseEvent) => {
    const element = dialog.value
    if (!element || event.target !== element) return false
    const rect = element.getBoundingClientRect()
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
  }
  const onBackdropPointerDown = (event: PointerEvent) => {
    startedOutside = outside(event)
  }
  const onBackdropClick = (event: MouseEvent) => {
    if (startedOutside && outside(event)) close()
    startedOutside = false
  }

  watch(
    dialog,
    (element) => {
      release?.()
      release = undefined
      if (!element) return
      const previousFocus = document.activeElement as HTMLElement | null
      if (locks++ === 0) {
        const scrollY = window.scrollY
        const body = document.body
        const original = body.getAttribute('style')
        Object.assign(body.style, {
          position: 'fixed',
          top: `-${scrollY}px`,
          width: '100%',
          overflow: 'hidden',
        })
        restorePage = () => {
          if (original === null) body.removeAttribute('style')
          else body.setAttribute('style', original)
          window.scrollTo(0, scrollY)
        }
      }
      const viewport = window.visualViewport
      const resize = () => {
        element.style.setProperty(
          '--dialog-top',
          `${viewport?.offsetTop ?? 0}px`,
        )
        element.style.setProperty(
          '--dialog-height',
          `${viewport?.height ?? window.innerHeight}px`,
        )
      }
      resize()
      viewport?.addEventListener('resize', resize)
      viewport?.addEventListener('scroll', resize)
      element.showModal()
      // Avoid opening the software keyboard before the user chooses a field.
      element.focus({ preventScroll: true })
      release = () => {
        viewport?.removeEventListener('resize', resize)
        viewport?.removeEventListener('scroll', resize)
        element.close()
        if (--locks === 0) {
          restorePage?.()
          restorePage = undefined
        }
        if (previousFocus?.isConnected)
          previousFocus.focus({ preventScroll: true })
      }
    },
    { flush: 'post' },
  )

  onBeforeUnmount(() => release?.())
  return { onBackdropPointerDown, onBackdropClick }
}
