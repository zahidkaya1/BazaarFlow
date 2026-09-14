import {
    lazy,
    Suspense,
    useSyncExternalStore,
    type ComponentType,
} from 'react'
import PageLoading from './ui/PageLoading'

const MOBILE_QUERY = '(max-width: 768px)'

type PageModule = {
    default: ComponentType
}

type ResponsivePageOptions = {
    desktop: () => Promise<PageModule>
    mobile: () => Promise<PageModule>
    fallback: string
}

let mobileMediaQuery: MediaQueryList | null =
    null

function getMobileMediaQuery():
    | MediaQueryList
    | null {
    if (typeof window === 'undefined') {
        return null
    }

    if (!mobileMediaQuery) {
        mobileMediaQuery =
            window.matchMedia(
                MOBILE_QUERY,
            )
    }

    return mobileMediaQuery
}

function getMobileSnapshot(): boolean {
    return (
        getMobileMediaQuery()?.matches ??
        false
    )
}

function subscribeToMobileQuery(
    onStoreChange: () => void,
): () => void {
    const mediaQuery =
        getMobileMediaQuery()

    if (!mediaQuery) {
        return () => undefined
    }

    const handleChange = () => {
        onStoreChange()
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
}

function useIsMobileViewport(): boolean {
    return useSyncExternalStore(
        subscribeToMobileQuery,
        getMobileSnapshot,
        () => false,
    )
}

export function createResponsivePage({
    desktop,
    mobile,
    fallback,
}: ResponsivePageOptions) {
    const DesktopPage = lazy(desktop)
    const MobilePage = lazy(mobile)

    function ResponsivePage() {
        const isMobile =
            useIsMobileViewport()

        return (
            <Suspense
                fallback={
                    <PageLoading
                        message={fallback}
                    />
                }
            >
                {isMobile ? (
                    <MobilePage />
                ) : (
                    <DesktopPage />
                )}
            </Suspense>
        )
    }

    return ResponsivePage
}
