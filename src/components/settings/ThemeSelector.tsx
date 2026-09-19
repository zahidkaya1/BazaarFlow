import {
    Monitor,
    Moon,
    Sun,
} from 'lucide-react'

import { useTheme } from '../theme/useTheme'
import type { ThemePreference } from '../../types/theme'

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

function ThemeSelector({
    compact = false,
}: {
    compact?: boolean
}) {
    const {
        preference,
        resolvedTheme,
        setPreference,
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
        </div>
    )
}

export default ThemeSelector
