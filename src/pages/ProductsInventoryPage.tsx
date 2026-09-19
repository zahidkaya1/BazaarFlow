import { createResponsivePage } from '../components/createResponsivePage'

const ProductsInventoryPage = createResponsivePage({
    desktop: () => import('./DesktopProductsInventoryPage'),
    mobile: () => import('./MobileProductsInventoryPage'),
    fallback: 'Ürünler ve stok hazırlanıyor...',
})

export default ProductsInventoryPage
