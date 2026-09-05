import Dexie, { type Table } from 'dexie'
import type { Category } from '../types/category'
import type { InventoryLot } from '../types/inventoryLot'
import type { Product } from '../types/product'
import type {
    InventoryAllocation,
    Sale,
    SaleItem,
} from '../types/sale'

class BazaarFlowDatabase extends Dexie {
    categories!: Table<Category, string>
    products!: Table<Product, string>
    inventoryLots!: Table<InventoryLot, string>

    sales!: Table<Sale, string>
    saleItems!: Table<SaleItem, string>
    inventoryAllocations!: Table<InventoryAllocation, string>

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
    }
}

export const db = new BazaarFlowDatabase()