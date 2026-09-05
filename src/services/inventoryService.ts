import { db } from '../db/database'
import type {
    InventoryEntryType,
    InventoryLot,
} from '../types/inventoryLot'
import { createId } from '../utils/createId'
import { compareInventoryLotsForFifo } from '../utils/inventoryLotOrder'
import { rebuildFifoStateInCurrentTransaction } from './fifoService'

export type CreateInventoryLotInput = {
    productId: string
    entryType: InventoryEntryType
    purchaseDate: string
    quantityReceived: number
    unitCostMinor: number
    note?: string
}

function normalizeOptionalText(value?: string): string | undefined {
    const normalized = value?.trim()

    return normalized || undefined
}

function validateQuantity(quantity: number): void {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
        throw new Error(
            'Stok adedi sıfırdan büyük tam sayı olmalıdır.',
        )
    }
}

function validateMoney(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error(
            'Birim alış maliyeti negatif olmayan geçerli bir tutar olmalıdır.',
        )
    }
}

function validateDateOnly(value: string): void {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

    if (!match) {
        throw new Error('Geçerli bir stok tarihi girilmelidir.')
    }

    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])

    const date = new Date(Date.UTC(year, month - 1, day))

    const isValid =
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day

    if (!isValid) {
        throw new Error('Geçerli bir stok tarihi girilmelidir.')
    }
}

async function ensureProductExists(productId: string): Promise<void> {
    const product = await db.products.get(productId)

    if (!product) {
        throw new Error('Seçilen ürün bulunamadı.')
    }
}


export const inventoryService = {
    async getAll(): Promise<InventoryLot[]> {
        const lots = await db.inventoryLots.toArray()

        return lots.sort(compareInventoryLotsForFifo)
    },

    async getById(id: string): Promise<InventoryLot | undefined> {
        return db.inventoryLots.get(id)
    },

    async getByProductId(
        productId: string,
    ): Promise<InventoryLot[]> {
        const lots = await db.inventoryLots
            .where('productId')
            .equals(productId)
            .toArray()

        return lots.sort(compareInventoryLotsForFifo)
    },

    async getAvailableLotsForProduct(
        productId: string,
    ): Promise<InventoryLot[]> {
        const lots = await db.inventoryLots
            .where('productId')
            .equals(productId)
            .toArray()

        return lots
            .filter((lot) => lot.quantityRemaining > 0)
            .sort(compareInventoryLotsForFifo)
    },

    async getCurrentStock(productId: string): Promise<number> {
        const lots = await db.inventoryLots
            .where('productId')
            .equals(productId)
            .toArray()

        return lots.reduce(
            (total, lot) => total + lot.quantityRemaining,
            0,
        )
    },

    async create(
        input: CreateInventoryLotInput,
    ): Promise<InventoryLot> {
        const productId = input.productId.trim()
        const purchaseDate = input.purchaseDate.trim()

        if (!productId) {
            throw new Error('Ürün seçilmelidir.')
        }

        if (
            input.entryType !== 'purchase' &&
            input.entryType !== 'opening'
        ) {
            throw new Error('Geçerli bir stok giriş türü seçilmelidir.')
        }

        validateDateOnly(purchaseDate)
        validateQuantity(input.quantityReceived)
        validateMoney(input.unitCostMinor)

        await ensureProductExists(productId)

        const now = new Date().toISOString()

        const lot: InventoryLot = {
            id: createId(),
            productId,
            entryType: input.entryType,
            purchaseDate,
            quantityReceived: input.quantityReceived,
            quantityRemaining: input.quantityReceived,
            unitCostMinor: input.unitCostMinor,
            note: normalizeOptionalText(input.note),
            createdAt: now,
            updatedAt: now,
        }

        return db.transaction(
            'rw',
            [
                db.inventoryLots,
                db.sales,
                db.saleItems,
                db.inventoryAllocations,
            ],
            async () => {
                await db.inventoryLots.add(lot)

                await rebuildFifoStateInCurrentTransaction()

                return lot
            },
        )
    },
}