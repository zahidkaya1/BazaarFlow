export type InventoryAdjustmentDirection =
    | 'increase'
    | 'decrease'

export type InventoryAdjustment = {
    id: string
    productId: string

    adjustmentDate: string
    direction: InventoryAdjustmentDirection

    quantity: number

    /*
     * Yalnızca stok artışında kullanılır.
     * Artan stok yeni bir FIFO partisi oluşturacağı için
     * maliyet bilgisi korunmalıdır.
     */
    unitCostMinor?: number

    reason: string
    note?: string

    /*
     * Stok artışı bir InventoryLot oluşturur.
     * Böylece düzeltme kaydı ile oluşan FIFO partisi
     * arasında kalıcı bağlantı kurulur.
     */
    linkedInventoryLotId?: string

    createdAt: string
    updatedAt: string
}

export type InventoryAdjustmentAllocation = {
    id: string
    adjustmentId: string
    inventoryLotId: string

    quantity: number
    unitCostMinor: number

    createdAt: string
}