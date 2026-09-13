import { createResponsivePage } from '../components/createResponsivePage'

const InventoryPage =
    createResponsivePage({
        desktop: () =>
            import('./DesktopInventoryPage'),
        mobile: () =>
            import('./MobileInventoryPage'),
        fallback:
            'Stok hazırlanıyor...',
    })

export default InventoryPage
