import {
    Monitor,
    Moon,
    Sun,
} from 'lucide-react'

import { useTheme } from '../theme/useTheme'
import type {
    ColorTheme,
    ThemePreference,
} from '../../types/theme'

const themeOptions: Array<{
    value: ThemePreference
    label: string
    description: string
    icon: typeof Monitor
}> = [
    {
        value: 'system',
        label: 'Sistem',
        description: 'Cihaz ayarını kullan',
        icon: Monitor,
    },
    {
        value: 'light',
        label: 'Açık',
        description: 'Açık görünüm',
        icon: Sun,
    },
    {
        value: 'dark',
        label: 'Koyu',
        description: 'Koyu görünüm',
        icon: Moon,
    },
]

const colorOptions: Array<{
    value: ColorTheme
    label: string
    primary: string
    secondary: string
}> = [
    {
        value: 'bazaarflow',
        label: 'BazaarFlow',
        primary: '#16a34a',
        secondary: '#14b8a6',
    },
    {
        value: 'ocean',
        label: 'Mavi',
        primary: '#0284c7',
        secondary: '#06b6d4',
    },
    {
        value: 'indigo',
        label: 'Lacivert',
        primary: '#4f46e5',
        secondary: '#3b82f6',
    },
    {
        value: 'violet',
        label: 'Mor',
        primary: '#7c3aed',
        secondary: '#a855f7',
    },
    {
        value: 'rose',
        label: 'Pembe',
        primary: '#e11d48',
        secondary: '#ec4899',
    },
    {
        value: 'sunset',
        label: 'Turuncu',
        primary: '#ea580c',
        secondary: '#f59e0b',
    },
    {
        value: 'graphite',
        label: 'Grafit',
        primary: '#475569',
        secondary: '#64748b',
    },
]

function ThemeSelector({
    compact = false,
}: {
    compact?: boolean
}) {
    const {
        preference,
        resolvedTheme,
        colorTheme,
        setPreference,
        setColorTheme,
    } = useTheme()

    return (
        <div
            className={
                compact
                    ? 'theme-selector theme-selector-compact'
                    : 'theme-selector'
            }
        >
            <div
                className="theme-selector-options"
                role="group"
                aria-label="Görünüm teması"
            >
                {themeOptions.map((option) => {
                    const Icon = option.icon
                    const isActive =
                        preference === option.value

                    return (
                        <button
                            key={option.value}
                            type="button"
                            className={
                                isActive
                                    ? 'theme-option theme-option-active'
                                    : 'theme-option'
                            }
                            aria-pressed={isActive}
                            onClick={() =>
                                setPreference(
                                    option.value,
                                )
                            }
                        >
                            <Icon size={17} />

                            <span>
                                <strong>
                                    {option.label}
                                </strong>
                                {!compact && (
                                    <small>
                                        {
                                            option.description
                                        }
                                    </small>
                                )}
                            </span>
                        </button>
                    )
                })}
            </div>

            {!compact && preference === 'system' && (
                <p className="theme-selector-note">
                    Sistem ayarı şu anda{' '}
                    {resolvedTheme === 'dark'
                        ? 'koyu'
                        : 'açık'}{' '}
                    görünümü kullanıyor.
                </p>
            )}

            <div className="color-theme-section">
                <div className="color-theme-heading">
                    <strong>Renk</strong>
                    {!compact && (
                        <small>
                            Vurgu rengini seçin. Açık ve koyu görünümle birlikte çalışır.
                        </small>
                    )}
                </div>

                <div
                    className="color-theme-options"
                    role="group"
                    aria-label="Renk teması"
                >
                    {colorOptions.map((option) => {
                        const isActive =
                            colorTheme === option.value

                        return (
                            <button
                                key={option.value}
                                type="button"
                                className={
                                    isActive
                                        ? 'color-theme-option color-theme-option-active'
                                        : 'color-theme-option'
                                }
                                aria-pressed={isActive}
                                aria-label={`${option.label} renk teması`}
                                onClick={() =>
                                    setColorTheme(
                                        option.value,
                                    )
                                }
                            >
                                <span
                                    className="color-theme-swatch"
                                    aria-hidden="true"
                                    style={{
                                        background: `linear-gradient(135deg, ${option.primary} 0 50%, ${option.secondary} 50% 100%)`,
                                    }}
                                />
                                <span className="color-theme-label">
                                    {option.label}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default ThemeSelector
