export type AppPlatform = 'windows' | 'android' | 'web'
export type UiMode = 'desktop' | 'mobile'

const MOBILE_QUERY = '(max-width: 768px)'

type TauriAwareWindow = Window & {
    __TAURI__?: unknown
}

function isTauriRuntime(): boolean {
    if (typeof window === 'undefined') {
        return false
    }

    return Boolean(
        (window as TauriAwareWindow).__TAURI__,
    )
}

function detectPlatform(): AppPlatform {
    if (typeof navigator === 'undefined') {
        return 'web'
    }

    if (!isTauriRuntime()) {
        return 'web'
    }

    const userAgent = navigator.userAgent

    if (/android/i.test(userAgent)) {
        return 'android'
    }

    if (/windows/i.test(userAgent)) {
        return 'windows'
    }

    return 'web'
}

function detectUiMode(): UiMode {
    if (
        typeof window === 'undefined' ||
        typeof window.matchMedia !== 'function'
    ) {
        return 'desktop'
    }

    return window.matchMedia(MOBILE_QUERY).matches
        ? 'mobile'
        : 'desktop'
}

function applyPlatformAttributes(): void {
    if (typeof document === 'undefined') {
        return
    }

    const root = document.documentElement
    const platform = detectPlatform()
    const uiMode = detectUiMode()

    root.dataset.appPlatform = platform
    root.dataset.uiMode = uiMode
    root.classList.toggle(
        'is-native-app',
        platform !== 'web',
    )
}

function watchPlatformChanges(): () => void {
    applyPlatformAttributes()

    if (
        typeof window === 'undefined' ||
        typeof window.matchMedia !== 'function'
    ) {
        return () => undefined
    }

    const mobileQuery = window.matchMedia(
        MOBILE_QUERY,
    )

    const handleChange = () => {
        applyPlatformAttributes()
    }

    mobileQuery.addEventListener(
        'change',
        handleChange,
    )

    window.addEventListener(
        'orientationchange',
        handleChange,
    )

    return () => {
        mobileQuery.removeEventListener(
            'change',
            handleChange,
        )

        window.removeEventListener(
            'orientationchange',
            handleChange,
        )
    }
}

export const platformUiService = {
    apply: applyPlatformAttributes,
    watch: watchPlatformChanges,
}
