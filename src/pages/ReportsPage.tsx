import { createResponsivePage } from '../components/createResponsivePage'

const ReportsPage =
    createResponsivePage({
        desktop: () =>
            import('./DesktopReportsPage'),
        mobile: () =>
            import('./MobileReportsPage'),
        fallback:
            'Raporlar hazırlanıyor...',
    })

export default ReportsPage
