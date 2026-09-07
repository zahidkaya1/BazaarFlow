import { db } from '../db/database'
import type {
    Sale,
    SaleItem,
} from '../types/sale'
import { createId } from '../utils/createId'
import { rebuildFifoStateInCurrentTransaction } from './fifoService'

export type CreateSaleItemInput = {
    productId: string
    quantity: number

    listUnitPriceMinor?: number
    actualUnitPriceMinor?: number

    discountReason?: string
}

export type CreateSaleInput = {
    saleDate: string
    note?: string
    items: CreateSaleItemInput[]
}

export type UpdateSaleInput =
    CreateSaleInput

export type SaleHistoryItem =
    SaleItem & {
        productName: string
        costMinor: number
    }

export type SaleHistoryRecord = {
    sale: Sale
    items: SaleHistoryItem[]

    totalQuantity: number

    listTotalMinor: number
    revenueMinor: number
    discountMinor: number

    costMinor: number
    grossProfitMinor: number
}

function normalizeOptionalText(
    value?: string,
): string | undefined {
    const normalized = value?.trim()

    return normalized || undefined
}

function validateDateOnly(
    value: string,
): void {
    const match =
        /^(\d{4})-(\d{2})-(\d{2})$/.exec(
            value,
        )

    if (!match) {
        throw new Error(
            'Geçerli bir satış tarihi girilmelidir.',
        )
    }

    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])

    const date = new Date(
        Date.UTC(
            year,
            month - 1,
            day,
        ),
    )

    const isValid =
        date.getUTCFullYear() === year &&
        date.getUTCMonth() ===
        month - 1 &&
        date.getUTCDate() === day

    if (!isValid) {
        throw new Error(
            'Geçerli bir satış tarihi girilmelidir.',
        )
    }
}

function validateQuantity(
    value: number,
): void {
    if (
        !Number.isSafeInteger(value) ||
        value <= 0
    ) {
        throw new Error(
            'Satış adedi sıfırdan büyük tam sayı olmalıdır.',
        )
    }
}

function validateMoney(
    value: number,
): void {
    if (
        !Number.isSafeInteger(value) ||
        value < 0
    ) {
        throw new Error(
            'Geçerli bir satış fiyatı girilmelidir.',
        )
    }
}

function validateSaleItems(
    items: CreateSaleItemInput[],
): void {
    if (items.length === 0) {
        throw new Error(
            'Satışta en az bir ürün bulunmalıdır.',
        )
    }

    const uniqueProductIds =
        new Set<string>()

    for (const item of items) {
        if (
            uniqueProductIds.has(
                item.productId,
            )
        ) {
            throw new Error(
                'Aynı ürün bir satışta yalnızca bir kez bulunabilir.',
            )
        }

        uniqueProductIds.add(
            item.productId,
        )

        validateQuantity(
            item.quantity,
        )
    }
}

async function buildSaleItems(
    saleId: string,
    inputs: CreateSaleItemInput[],
    timestamp: string,
): Promise<SaleItem[]> {
    const saleItems: SaleItem[] = []

    for (const input of inputs) {
        const product =
            await db.products.get(
                input.productId,
            )

        if (!product) {
            throw new Error(
                'Satıştaki ürün bulunamadı.',
            )
        }

        const listUnitPriceMinor =
            input.listUnitPriceMinor ??
            product.defaultSalePriceMinor

        const actualUnitPriceMinor =
            input.actualUnitPriceMinor ??
            listUnitPriceMinor

        validateMoney(
            listUnitPriceMinor,
        )

        validateMoney(
            actualUnitPriceMinor,
        )

        saleItems.push({
            id: createId(),
            saleId,
            productId:
                product.id,

            /*
             * Ürünün adı sonradan değişse bile
             * geçmiş satış kaydı satış anındaki
             * adı koruyabilsin.
             */
            productNameSnapshot:
                product.name,

            quantity:
                input.quantity,

            listUnitPriceMinor,
            actualUnitPriceMinor,

            discountReason:
                normalizeOptionalText(
                    input.discountReason,
                ),

            createdAt:
                timestamp,
            updatedAt:
                timestamp,
        })
    }

    return saleItems
}

function sortSalesDescending(
    first: Sale,
    second: Sale,
): number {
    const dateComparison =
        second.saleDate.localeCompare(
            first.saleDate,
        )

    if (dateComparison !== 0) {
        return dateComparison
    }

    const createdComparison =
        second.createdAt.localeCompare(
            first.createdAt,
        )

    if (createdComparison !== 0) {
        return createdComparison
    }

    return second.id.localeCompare(
        first.id,
    )
}

export const salesService = {
    async getAll(): Promise<Sale[]> {
        const sales =
            await db.sales.toArray()

        return sales.sort(
            sortSalesDescending,
        )
    },

    async getById(
        id: string,
    ): Promise<
        Sale | undefined
    > {
        return db.sales.get(id)
    },

    async getItemsBySaleId(
        saleId: string,
    ): Promise<SaleItem[]> {
        return db.saleItems
            .where('saleId')
            .equals(saleId)
            .toArray()
    },

    async getHistory(): Promise<
        SaleHistoryRecord[]
    > {
        const [
            sales,
            saleItems,
            allocations,
            products,
        ] = await Promise.all([
            db.sales.toArray(),
            db.saleItems.toArray(),
            db.inventoryAllocations.toArray(),
            db.products.toArray(),
        ])

        const productNames =
            new Map(
                products.map(
                    (product) => [
                        product.id,
                        product.name,
                    ],
                ),
            )

        const itemsBySale =
            new Map<
                string,
                SaleItem[]
            >()

        for (const item of saleItems) {
            const current =
                itemsBySale.get(
                    item.saleId,
                ) ?? []

            current.push(item)

            itemsBySale.set(
                item.saleId,
                current,
            )
        }

        const costBySaleItem =
            new Map<
                string,
                number
            >()

        for (
            const allocation of
            allocations
        ) {
            const cost =
                allocation.quantity *
                allocation.unitCostMinor

            costBySaleItem.set(
                allocation.saleItemId,
                (costBySaleItem.get(
                    allocation.saleItemId,
                ) ?? 0) + cost,
            )
        }

        return sales
            .sort(
                sortSalesDescending,
            )
            .map((sale) => {
                const items = (
                    itemsBySale.get(
                        sale.id,
                    ) ?? []
                ).map(
                    (
                        item,
                    ): SaleHistoryItem => ({
                        ...item,

                        productName:
                            item.productNameSnapshot ??
                            productNames.get(
                                item.productId,
                            ) ??
                            'Bilinmeyen ürün',

                        costMinor:
                            costBySaleItem.get(
                                item.id,
                            ) ?? 0,
                    }),
                )

                const totalQuantity =
                    items.reduce(
                        (
                            total,
                            item,
                        ) =>
                            total +
                            item.quantity,
                        0,
                    )

                const listTotalMinor =
                    items.reduce(
                        (
                            total,
                            item,
                        ) =>
                            total +
                            item.quantity *
                            item.listUnitPriceMinor,
                        0,
                    )

                const revenueMinor =
                    items.reduce(
                        (
                            total,
                            item,
                        ) =>
                            total +
                            item.quantity *
                            item.actualUnitPriceMinor,
                        0,
                    )

                const discountMinor =
                    items.reduce(
                        (
                            total,
                            item,
                        ) => {
                            const difference =
                                item.listUnitPriceMinor -
                                item.actualUnitPriceMinor

                            return (
                                total +
                                Math.max(
                                    0,
                                    difference,
                                ) *
                                item.quantity
                            )
                        },
                        0,
                    )

                const costMinor =
                    items.reduce(
                        (
                            total,
                            item,
                        ) =>
                            total +
                            item.costMinor,
                        0,
                    )

                return {
                    sale,
                    items,

                    totalQuantity,

                    listTotalMinor,
                    revenueMinor,
                    discountMinor,

                    costMinor,

                    grossProfitMinor:
                        revenueMinor -
                        costMinor,
                }
            })
    },

    async create(
        input: CreateSaleInput,
    ): Promise<Sale> {
        const saleDate =
            input.saleDate.trim()

        validateDateOnly(
            saleDate,
        )

        validateSaleItems(
            input.items,
        )

        return db.transaction(
            'rw',
            [
                db.products,
                db.inventoryLots,
                db.sales,
                db.saleItems,
                db.inventoryAllocations,
                db.inventoryAdjustments,
                db.inventoryAdjustmentAllocations,
            ],
            async () => {
                const now =
                    new Date().toISOString()

                const sale: Sale = {
                    id: createId(),
                    saleDate,
                    status:
                        'completed',
                    note: normalizeOptionalText(
                        input.note,
                    ),
                    createdAt: now,
                    updatedAt: now,
                }

                const saleItems =
                    await buildSaleItems(
                        sale.id,
                        input.items,
                        now,
                    )

                await db.sales.add(
                    sale,
                )

                await db.saleItems.bulkAdd(
                    saleItems,
                )

                await rebuildFifoStateInCurrentTransaction()

                return sale
            },
        )
    },

    async update(
        id: string,
        input: UpdateSaleInput,
    ): Promise<Sale> {
        const saleDate =
            input.saleDate.trim()

        validateDateOnly(
            saleDate,
        )

        validateSaleItems(
            input.items,
        )

        return db.transaction(
            'rw',
            [
                db.products,
                db.inventoryLots,
                db.sales,
                db.saleItems,
                db.inventoryAllocations,
                db.inventoryAdjustments,
                db.inventoryAdjustmentAllocations,
            ],
            async () => {
                const current =
                    await db.sales.get(
                        id,
                    )

                if (!current) {
                    throw new Error(
                        'Düzenlenecek satış bulunamadı.',
                    )
                }

                if (
                    current.status ===
                    'cancelled'
                ) {
                    throw new Error(
                        'İptal edilmiş satış düzenlenemez.',
                    )
                }

                const now =
                    new Date().toISOString()

                const updated: Sale = {
                    ...current,
                    saleDate,
                    note: normalizeOptionalText(
                        input.note,
                    ),
                    updatedAt: now,
                }

                /*
                 * Eski satış kalemlerini kaldırıp
                 * yeni haliyle oluşturuyoruz.
                 * FIFO allocations aşağıdaki rebuild
                 * sırasında baştan oluşturulur.
                 */
                await db.saleItems
                    .where('saleId')
                    .equals(id)
                    .delete()

                const newItems =
                    await buildSaleItems(
                        id,
                        input.items,
                        now,
                    )

                await db.saleItems.bulkAdd(
                    newItems,
                )

                await db.sales.put(
                    updated,
                )

                await rebuildFifoStateInCurrentTransaction()

                return updated
            },
        )
    },

    async cancel(
        id: string,
    ): Promise<Sale> {
        return db.transaction(
            'rw',
            [
                db.inventoryLots,
                db.sales,
                db.saleItems,
                db.inventoryAllocations,
                db.inventoryAdjustments,
                db.inventoryAdjustmentAllocations,
            ],
            async () => {
                const current =
                    await db.sales.get(
                        id,
                    )

                if (!current) {
                    throw new Error(
                        'İptal edilecek satış bulunamadı.',
                    )
                }

                if (
                    current.status ===
                    'cancelled'
                ) {
                    return current
                }

                const updated: Sale = {
                    ...current,
                    status:
                        'cancelled',
                    updatedAt:
                        new Date().toISOString(),
                }

                await db.sales.put(
                    updated,
                )

                /*
                 * Satış artık completed olmadığı için
                 * FIFO yeniden hesaplandığında bu satış
                 * stok tüketmeyecek. Stok düzeltmeleri
                 * ise aynı kronolojik motorda korunur.
                 */
                await rebuildFifoStateInCurrentTransaction()

                return updated
            },
        )
    },
}
