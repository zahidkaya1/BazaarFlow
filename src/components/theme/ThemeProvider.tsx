import {
    type ReactNode,
    useEffect,
    useState,
} from 'react'

import { themeService } from '../../services/themeService'
import type {
    ResolvedTheme,
    ThemePreference,
} from '../../types/theme'
import {
    ThemeContext,
    type ThemeContextValue,
} from './themeContext'

function ThemeProvider({
    children,
}: {
    children: ReactNode
}) {
    const [preference, setPreferenceState] =
        useState<ThemePreference>(() =>
            themeService.getThemePreference(),
        )

    const [systemTheme, setSystemTheme] =
        useState<ResolvedTheme>(() =>
            themeService.getSystemTheme(),
        )

    const resolvedTheme = themeService.resolveTheme(
        preference,
        systemTheme,
    )

    useEffect(() => {
        if (
            typeof window === 'undefined' ||
            !window.matchMedia
        ) {
            return undefined
        }

        const mediaQuery = window.matchMedia(
            '(prefers-color-scheme: dark)',
        )

        const handleChange = () => {
            setSystemTheme(
                mediaQuery.matches
                    ? 'dark'
                    : 'light',
            )
        }

        mediaQuery.addEventListener(
            'change',
            handleChange,
        )

        return () => {
            mediaQuery.removeEventListener(
                'change',
                handleChange,
            )
        }
    }, [])

    useEffect(() => {
        themeService.applyThemeToDocument(
            preference,
            resolvedTheme,
        )
    }, [preference, resolvedTheme])

    const setPreference = (
        nextPreference: ThemePreference,
    ) => {
        themeService.saveThemePreference(
            nextPreference,
        )
        setPreferenceState(nextPreference)
    }

    const value: ThemeContextValue = {
        preference,
        resolvedTheme,
        setPreference,
    }

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    )
}

export default ThemeProvider
