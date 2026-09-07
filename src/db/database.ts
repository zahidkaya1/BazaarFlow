import Dexie, { type Table } from 'dexie'
import type { Category } from '../types/category'
import type { InventoryLot } from '../types/inventoryLot'
import type { AppSettings } from '../types/appSettings'
import type {
    InventoryAdjustment,
    InventoryAdjustmentAllocation,
} from '../types/inventoryAdjustment'
import type { Product } from '../types/product'
import type {
    InventoryAllocation,
    Sale,
    SaleItem,
} from '../types/sale'

class BazaarFlowDatabase extends Dexie {
    appSettings!: Table<AppSettings, string>
    categories!: Table<Category, string>
    products!: Table<Product, string>
    inventoryLots!: Table<InventoryLot, string>

    sales!: Table<Sale, string>
    saleItems!: Table<SaleItem, string>
    inventoryAllocations!: Table<InventoryAllocation, string>

    inventoryAdjustments!: Table<
        InventoryAdjustment,
        string
    >

    inventoryAdjustmentAllocations!: Table<
        InventoryAdjustmentAllocation,
        string
    >

    constructor() {
        super('BazaarFlowDatabase')

        this.version(1).stores({
            categories: '&id, name, isActive, createdAt, updatedAt',
            products:
                '&id, name, sku, categoryId, isActive, createdAt, updatedAt',
        })

        this.version(2).stores({
            categories: '&id, name, isActive, createdAt, updatedAt',
            products:
                '&id, name, sku, categoryId, isActive, createdAt, updatedAt',
            inventoryLots:
                '&id, productId, purchaseDate, quantityRemaining, [productId+purchaseDate], createdAt, updatedAt',
        })

        this.version(3)
            .stores({
                categories: '&id, name, isActive, createdAt, updatedAt',

                products:
                    '&id, name, sku, categoryId, isActive, createdAt, updatedAt',

                inventoryLots:
                    '&id, productId, entryType, purchaseDate, quantityRemaining, [productId+purchaseDate], [productId+entryType], createdAt, updatedAt',
            })
            .upgrade(async (transaction) => {
                await transaction
                    .table('inventoryLots')
                    .toCollection()
                    .modify((lot: InventoryLot) => {
                        if (!lot.entryType) {
                            lot.entryType = 'purchase'
                        }
                    })
            })

        this.version(4).stores({
            categories: '&id, name, isActive, createdAt, updatedAt',

            products:
                '&id, name, sku, categoryId, isActive, createdAt, updatedAt',

            inventoryLots:
                '&id, productId, entryType, purchaseDate, quantityRemaining, [productId+purchaseDate], [productId+entryType], createdAt, updatedAt',

            sales:
                '&id, saleDate, status, createdAt, updatedAt',

            saleItems:
                '&id, saleId, productId, [saleId+productId], createdAt, updatedAt',

            inventoryAllocations:
                '&id, saleItemId, inventoryLotId, [saleItemId+inventoryLotId], createdAt',
        })

        this.version(5).stores({
            categories:
                '&id, name, isActive, createdAt, updatedAt',

            products:
                '&id, name, sku, categoryId, isActive, createdAt, updatedAt',

            inventoryLots:
                '&id, productId, entryType, sourceAdjustmentId, purchaseDate, quantityRemaining, [productId+purchaseDate], [productId+entryType], createdAt, updatedAt',

            sales:
                '&id, saleDate, status, createdAt, updatedAt',

            saleItems:
                '&id, saleId, productId, [saleId+productId], createdAt, updatedAt',

            inventoryAllocations:
                '&id, saleItemId, inventoryLotId, [saleItemId+inventoryLotId], createdAt',

            inventoryAdjustments:
                '&id, productId, adjustmentDate, direction, [productId+adjustmentDate], [productId+direction], createdAt, updatedAt',

            inventoryAdjustmentAllocations:
                '&id, adjustmentId, inventoryLotId, [adjustmentId+inventoryLotId], createdAt',
        })

        this.version(6).stores({
            categories:
                '&id, name, isActive, createdAt, updatedAt',

            products:
                '&id, name, sku, categoryId, isActive, createdAt, updatedAt',

            inventoryLots:
                '&id, productId, entryType, sourceAdjustmentId, purchaseDate, quantityRemaining, [productId+purchaseDate], [productId+entryType], createdAt, updatedAt',

            sales:
                '&id, saleDate, status, createdAt, updatedAt',

            saleItems:
                '&id, saleId, productId, [saleId+productId], createdAt, updatedAt',

            inventoryAllocations:
                '&id, saleItemId, inventoryLotId, [saleItemId+inventoryLotId], createdAt',

            inventoryAdjustments:
                '&id, productId, adjustmentDate, direction, [productId+adjustmentDate], [productId+direction], createdAt, updatedAt',

            inventoryAdjustmentAllocations:
                '&id, adjustmentId, inventoryLotId, [adjustmentId+inventoryLotId], createdAt',

            appSettings:
                '&id',
        })
    }
}

export const db = new BazaarFlowDatabase()