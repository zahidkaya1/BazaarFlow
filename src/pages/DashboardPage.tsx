import {
    lazy,
    Suspense,
    useEffect,
    useState,
} from 'react'

const DesktopDashboardPage = lazy(
    () => import('./DesktopDashboardPage'),
)

const MobileDashboardPage = lazy(
    () => import('./MobileDashboardPage'),
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

function DashboardPage() {
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
                    Genel bakış hazırlanıyor...
                </div>
            }
        >
            {isMobile ? (
                <MobileDashboardPage />
            ) : (
                <DesktopDashboardPage />
            )}
        </Suspense>
    )
}

export default DashboardPage
