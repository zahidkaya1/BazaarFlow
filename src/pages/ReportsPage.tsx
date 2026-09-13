import {
    lazy,
    Suspense,
    useEffect,
    useState,
} from 'react'

const DesktopReportsPage = lazy(
    () => import('./DesktopReportsPage'),
)

const MobileReportsPage = lazy(
    () => import('./MobileReportsPage'),
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

function ReportsPage() {
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
                    Raporlar hazırlanıyor...
                </div>
            }
        >
            {isMobile ? (
                <MobileReportsPage />
            ) : (
                <DesktopReportsPage />
            )}
        </Suspense>
    )
}

export default ReportsPage
