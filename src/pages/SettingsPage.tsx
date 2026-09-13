import { createResponsivePage } from '../components/createResponsivePage'

const SettingsPage =
    createResponsivePage({
        desktop: () =>
            import('./DesktopSettingsPage'),
        mobile: () =>
            import('./MobileSettingsPage'),
        fallback:
            'Ayarlar hazırlanıyor...',
    })

export default SettingsPage
