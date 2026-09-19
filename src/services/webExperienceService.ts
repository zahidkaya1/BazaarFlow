type TauriAwareWindow = Window & {
  __TAURI__?: unknown
}

type StandaloneAwareNavigator = Navigator & {
  standalone?: boolean
}

const DISPLAY_MODE_QUERY = '(display-mode: standalone)'

function isWebRuntime(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return !(window as TauriAwareWindow).__TAURI__
}

function resolveDisplayMode(): 'browser' | 'standalone' {
  if (typeof window === 'undefined') {
    return 'browser'
  }

  const standaloneMedia = window.matchMedia?.(DISPLAY_MODE_QUERY).matches ?? false
  const iosStandalone = Boolean((navigator as StandaloneAwareNavigator).standalone)

  return standaloneMedia || iosStandalone
    ? 'standalone'
    : 'browser'
}

function applyWebState(): void {
  if (!isWebRuntime() || typeof document === 'undefined') {
    return
  }

  const root = document.documentElement
  root.dataset.webDisplayMode = resolveDisplayMode()
  root.dataset.networkStatus = navigator.onLine ? 'online' : 'offline'
}

function watchWebState(): () => void {
  if (!isWebRuntime()) {
    return () => undefined
  }

  applyWebState()

  const displayModeQuery = window.matchMedia?.(DISPLAY_MODE_QUERY)
  const handleChange = () => applyWebState()

  displayModeQuery?.addEventListener('change', handleChange)
  window.addEventListener('online', handleChange)
  window.addEventListener('offline', handleChange)
  window.addEventListener('pageshow', handleChange)

  return () => {
    displayModeQuery?.removeEventListener('change', handleChange)
    window.removeEventListener('online', handleChange)
    window.removeEventListener('offline', handleChange)
    window.removeEventListener('pageshow', handleChange)
  }
}

async function registerServiceWorker(): Promise<void> {
  if (
    !isWebRuntime() ||
    !import.meta.env.PROD ||
    !('serviceWorker' in navigator)
  ) {
    return
  }

  try {
    const baseUrl = import.meta.env.BASE_URL || '/'
    const registration = await navigator.serviceWorker.register(
      `${baseUrl}sw.js`,
      { scope: baseUrl },
    )

    void registration.update()
  } catch (error) {
    console.warn('BazaarFlow service worker kaydı başarısız oldu.', error)
  }
}

export const webExperienceService = {
  apply: applyWebState,
  watch: watchWebState,
  registerServiceWorker,
}
