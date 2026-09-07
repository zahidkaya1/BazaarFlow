export type InventoryEntryType =
    | 'purchase'
    | 'opening'
    | 'adjustment'

export type InventoryLot = {
    id: string
    productId: string

    entryType: InventoryEntryType
    purchaseDate: string

    quantityReceived: number
    quantityRemaining: number

    unitCostMinor: number

    /*
     * Lot manuel stok artışı sonucunda oluştuysa
     * ilgili düzeltme kaydına bağlanır.
     */
    sourceAdjustmentId?: string

    note?: string

    createdAt: string
    updatedAt: string
}