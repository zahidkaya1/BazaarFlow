import { createContext } from 'react'

import type {
    ColorTheme,
    ResolvedTheme,
    ThemePreference,
} from '../../types/theme'

export type ThemeContextValue = {
    preference: ThemePreference
    resolvedTheme: ResolvedTheme
    colorTheme: ColorTheme
    setPreference: (
        preference: ThemePreference,
    ) => void
    setColorTheme: (
        colorTheme: ColorTheme,
    ) => void
}

export const ThemeContext =
    createContext<ThemeContextValue | null>(null)
