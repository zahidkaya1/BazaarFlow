export type InventoryEntryType = 'purchase' | 'opening'

export type InventoryLot = {
    id: string
    productId: string

    entryType: InventoryEntryType
    purchaseDate: string

    quantityReceived: number
    quantityRemaining: number

    unitCostMinor: number

    note?: string

    createdAt: string
    updatedAt: string
}