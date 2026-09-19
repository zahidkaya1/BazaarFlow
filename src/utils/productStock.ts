import type { Product } from '../types/product'

export type ProductStockState =
    | 'normal'
    | 'low'
    | 'out'

export function getProductStockState(
    product: Product,
    currentStock: number,
): ProductStockState {
    if (currentStock <= 0) {
        return 'out'
    }

    if (
        product.minimumStock > 0 &&
        currentStock <= product.minimumStock
    ) {
        return 'low'
    }

    return 'normal'
}

export function getProductStockLabel(
    state: ProductStockState,
): string {
    if (state === 'out') {
        return 'Tükendi'
    }

    if (state === 'low') {
        return 'Düşük'
    }

    return 'Normal'
}
