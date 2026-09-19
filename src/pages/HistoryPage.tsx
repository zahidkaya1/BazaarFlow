import { createResponsivePage } from '../components/createResponsivePage'

const HistoryPage = createResponsivePage({
    desktop: () => import('./SalesHistoryPage'),
    mobile: () => import('./MobileHistoryPage'),
    fallback: 'Geçmiş hazırlanıyor...',
})

export default HistoryPage
