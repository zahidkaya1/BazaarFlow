import Dexie, { type Table } from 'dexie'
import type { Category } from '../types/category'
import type { Product } from '../types/product'

class BazaarFlowDatabase extends Dexie {
    categories!: Table<Category, string>
    products!: Table<Product, string>

    constructor() {
        super('BazaarFlowDatabase')

        this.version(1).stores({
            categories: '&id, name, isActive, createdAt, updatedAt',
            products:
                '&id, name, sku, categoryId, isActive, createdAt, updatedAt',
        })
    }
}

export const db = new BazaarFlowDatabase()