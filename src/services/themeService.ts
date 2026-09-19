import type {
    ColorTheme,
    ResolvedTheme,
    ThemePreference,
} from '../types/theme'

const THEME_STORAGE_KEY = 'bazaarflow.theme'
const COLOR_THEME_STORAGE_KEY = 'bazaarflow.colorTheme'

const isThemePreference = (
    value: string | null,
): value is ThemePreference =>
    value === 'system' ||
    value === 'light' ||
    value === 'dark'

const isColorTheme = (
    value: string | null,
): value is ColorTheme =>
    value === 'bazaarflow' ||
    value === 'ocean' ||
    value === 'indigo' ||
    value === 'violet' ||
    value === 'rose' ||
    value === 'sunset' ||
    value === 'graphite'

const getSystemTheme = (): ResolvedTheme => {
    if (
        typeof window !== 'undefined' &&
        window.matchMedia?.(
            '(prefers-color-scheme: dark)',
        ).matches
    ) {
        return 'dark'
    }

    return 'light'
}

const resolveTheme = (
    preference: ThemePreference,
    systemTheme: ResolvedTheme = getSystemTheme(),
): ResolvedTheme =>
    preference === 'system'
        ? systemTheme
        : preference

const getThemePreference = (): ThemePreference => {
    if (typeof window === 'undefined') {
        return 'system'
    }

    try {
        const storedValue = window.localStorage.getItem(
            THEME_STORAGE_KEY,
        )

        return isThemePreference(storedValue)
            ? storedValue
            : 'system'
    } catch {
        return 'system'
    }
}

const getColorTheme = (): ColorTheme => {
    if (typeof window === 'undefined') {
        return 'bazaarflow'
    }

    try {
        const storedValue = window.localStorage.getItem(
            COLOR_THEME_STORAGE_KEY,
        )

        return isColorTheme(storedValue)
            ? storedValue
            : 'bazaarflow'
    } catch {
        return 'bazaarflow'
    }
}

const saveThemePreference = (
    preference: ThemePreference,
) => {
    if (typeof window === 'undefined') {
        return
    }

    try {
        window.localStorage.setItem(
            THEME_STORAGE_KEY,
            preference,
        )
    } catch {
        // Local storage kullanılamıyorsa tema yine oturum boyunca çalışır.
    }
}

const saveColorTheme = (
    colorTheme: ColorTheme,
) => {
    if (typeof window === 'undefined') {
        return
    }

    try {
        window.localStorage.setItem(
            COLOR_THEME_STORAGE_KEY,
            colorTheme,
        )
    } catch {
        // Local storage kullanılamıyorsa renk teması yine oturum boyunca çalışır.
    }
}

const applyThemeToDocument = (
    preference: ThemePreference,
    resolvedTheme: ResolvedTheme,
    colorTheme: ColorTheme,
) => {
    if (typeof document === 'undefined') {
        return
    }

    const root = document.documentElement
    root.dataset.theme = resolvedTheme
    root.dataset.themePreference = preference
    root.dataset.colorTheme = colorTheme
    root.style.colorScheme = resolvedTheme

    const themeColor =
        resolvedTheme === 'dark'
            ? '#0b1110'
            : '#f7f9f8'

    document
        .querySelector<HTMLMetaElement>(
            'meta[name="theme-color"]',
        )
        ?.setAttribute('content', themeColor)
}

export const themeService = {
    storageKey: THEME_STORAGE_KEY,
    colorStorageKey: COLOR_THEME_STORAGE_KEY,
    getSystemTheme,
    resolveTheme,
    getThemePreference,
    getColorTheme,
    saveThemePreference,
    saveColorTheme,
    applyThemeToDocument,
}
