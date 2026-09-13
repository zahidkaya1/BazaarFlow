import {
    lazy,
    Suspense,
    useEffect,
    useState,
} from 'react'

const DesktopSettingsPage = lazy(
    () => import('./DesktopSettingsPage'),
)

const MobileSettingsPage = lazy(
    () => import('./MobileSettingsPage'),
)

const MOBILE_QUERY = '(max-width: 768px)'

function getIsMobile(): boolean {
    if (typeof window === 'undefined') {
        return false
    }

    return window.matchMedia(
        MOBILE_QUERY,
    ).matches
}

function SettingsPage() {
    const [isMobile, setIsMobile] =
        useState(getIsMobile)

    useEffect(() => {
        const mediaQuery =
            window.matchMedia(
                MOBILE_QUERY,
            )

        const handleChange = (
            event: MediaQueryListEvent,
        ) => {
            setIsMobile(
                event.matches,
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

    return (
        <Suspense
            fallback={
                <div className="page-loading">
                    Ayarlar hazırlanıyor...
                </div>
            }
        >
            {isMobile ? (
                <MobileSettingsPage />
            ) : (
                <DesktopSettingsPage />
            )}
        </Suspense>
    )
}

export default SettingsPage
