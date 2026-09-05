export type SaleStatus = 'completed' | 'cancelled'

export type Sale = {
    id: string
    saleDate: string

    status: SaleStatus
    note?: string

    createdAt: string
    updatedAt: string
}

export type SaleItem = {
    id: string
    saleId: string
    productId: string

    productNameSnapshot?: string

    quantity: number

    listUnitPriceMinor: number
    actualUnitPriceMinor: number

    discountReason?: string

    createdAt: string
    updatedAt: string
}

export type InventoryAllocation = {
    id: string
    saleItemId: string
    inventoryLotId: string

    quantity: number
    unitCostMinor: number

    createdAt: string
}