import type { AppSettings } from './appSettings'
import type { Category } from './category'
import type { InventoryAdjustment } from './inventoryAdjustment'
import type { InventoryLot } from './inventoryLot'
import type { Product } from './product'
import type { Sale, SaleItem } from './sale'

export const BAZAARFLOW_BACKUP_APP = 'BazaarFlow' as const
export const BAZAARFLOW_BACKUP_FORMAT_VERSION = 1 as const

export type BazaarFlowBackupData = {
    /**
     * v1'in eski yedekleri bu alanı içermeyebilir.
     * Bu nedenle geriye dönük uyumluluk için opsiyoneldir.
     */
    appSettings?: AppSettings[]
    categories: Category[]
    products: Product[]
    inventoryLots: InventoryLot[]
    sales: Sale[]
    saleItems: SaleItem[]
    inventoryAdjustments: InventoryAdjustment[]
}

export type BazaarFlowBackup = {
    app: typeof BAZAARFLOW_BACKUP_APP
    formatVersion: typeof BAZAARFLOW_BACKUP_FORMAT_VERSION
    databaseVersion: number
    exportedAt: string
    data: BazaarFlowBackupData
}
