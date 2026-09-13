import { createResponsivePage } from '../components/createResponsivePage'

const DashboardPage =
    createResponsivePage({
        desktop: () =>
            import('./DesktopDashboardPage'),
        mobile: () =>
            import('./MobileDashboardPage'),
        fallback:
            'Genel bakış hazırlanıyor...',
    })

export default DashboardPage
