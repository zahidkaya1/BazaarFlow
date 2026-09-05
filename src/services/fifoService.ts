import { db } from '../db/database'
import type {
    InventoryAllocation,
    Sale,
    SaleItem,
} from '../types/sale'
import { createId } from '../utils/createId'
import { compareInventoryLotsForFifo } from '../utils/inventoryLotOrder'


export type FifoPreviewItem = {
    productId: string
    quantity: number
}

export type FifoPreviewAllocation = {
    itemIndex: number
    inventoryLotId: string
    quantity: number
    unitCostMinor: number
}

export type FifoPreviewItemResult = {
    productId: string
    quantity: number
    totalCostMinor: number
}

export type FifoPreviewResult = {
    totalCostMinor: number
    items: FifoPreviewItemResult[]
    allocations: FifoPreviewAllocation[]
}

export type FifoPreviewOptions = {
    replacingSaleId?: string
}

function compareSales(
    first: Sale,
    second: Sale,
): number {
    const dateComparison = first.saleDate.localeCompare(
        second.saleDate,
    )

    if (dateComparison !== 0) {
        return dateComparison
    }

    const createdComparison = first.createdAt.localeCompare(
        second.createdAt,
    )

    if (createdComparison !== 0) {
        return createdComparison
    }

    return first.id.localeCompare(second.id)
}

function compareSaleItems(
    first: SaleItem,
    second: SaleItem,
): number {
    const createdComparison = first.createdAt.localeCompare(
        second.createdAt,
    )

    if (createdComparison !== 0) {
        return createdComparison
    }

    return first.id.localeCompare(second.id)
}

export async function rebuildFifoStateInCurrentTransaction(): Promise<void> {
    const [lots, sales, saleItems] = await Promise.all([
        db.inventoryLots.toArray(),
        db.sales.where('status').equals('completed').toArray(),
        db.saleItems.toArray(),
    ])

    for (const lot of lots) {
        lot.quantityRemaining = lot.quantityReceived
    }

    await db.inventoryAllocations.clear()

    const itemsBySale = new Map<string, SaleItem[]>()

    for (const item of saleItems) {
        const current = itemsBySale.get(item.saleId) ?? []

        current.push(item)
        itemsBySale.set(item.saleId, current)
    }

    const allocations: InventoryAllocation[] = []

    const orderedSales = sales.sort(compareSales)

    for (const sale of orderedSales) {
        const items = (
            itemsBySale.get(sale.id) ?? []
        ).sort(compareSaleItems)

        for (const item of items) {
            let quantityToAllocate = item.quantity

            const availableLots = lots
                .filter(
                    (lot) =>
                        lot.productId === item.productId &&
                        lot.purchaseDate <= sale.saleDate &&
                        lot.quantityRemaining > 0,
                )
                .sort(compareInventoryLotsForFifo)

            for (const lot of availableLots) {
                if (quantityToAllocate <= 0) {
                    break
                }

                const allocatedQuantity = Math.min(
                    quantityToAllocate,
                    lot.quantityRemaining,
                )

                lot.quantityRemaining -= allocatedQuantity
                quantityToAllocate -= allocatedQuantity

                allocations.push({
                    id: createId(),
                    saleItemId: item.id,
                    inventoryLotId: lot.id,
                    quantity: allocatedQuantity,
                    unitCostMinor: lot.unitCostMinor,
                    createdAt: new Date().toISOString(),
                })
            }

            if (quantityToAllocate > 0) {
                throw new Error(
                    `Satış tarihinde yeterli stok bulunmuyor. Eksik adet: ${quantityToAllocate}`,
                )
            }
        }
    }

    await db.inventoryLots.bulkPut(lots)

    if (allocations.length > 0) {
        await db.inventoryAllocations.bulkAdd(allocations)
    }
}

export const fifoService = {
    async previewSale(
        saleDate: string,
        previewItems: FifoPreviewItem[],
        options: FifoPreviewOptions = {},
    ): Promise<FifoPreviewResult> {
        const [storedLots, allStoredSales, allStoredSaleItems] =
            await Promise.all([
                db.inventoryLots.toArray(),
                db.sales.where('status').equals('completed').toArray(),
                db.saleItems.toArray(),
            ])

        if (previewItems.length === 0) {
            throw new Error(
                'FIFO hesaplamak için en az bir ürün bulunmalıdır.',
            )
        }

        for (const item of previewItems) {
            if (
                !Number.isSafeInteger(item.quantity) ||
                item.quantity <= 0
            ) {
                throw new Error(
                    'FIFO hesaplamasında satış adedi geçersiz.',
                )
            }
        }

        const lots = storedLots.map((lot) => ({
            ...lot,
            quantityRemaining: lot.quantityReceived,
        }))

        let storedSales = allStoredSales
        let storedSaleItems = allStoredSaleItems

        let previewCreatedAt = new Date().toISOString()

        if (options.replacingSaleId) {
            const replacedSale = allStoredSales.find(
                (sale) => sale.id === options.replacingSaleId,
            )

            if (!replacedSale) {
                throw new Error(
                    'Düzenlenecek satış bulunamadı.',
                )
            }

            /*
             * Düzenlenen satış, aynı gün içindeki eski kronolojik
             * konumunu korur. Böylece FIFO önizlemesi ile gerçek
             * güncelleme aynı sonucu üretir.
             */
            previewCreatedAt = replacedSale.createdAt

            storedSales = allStoredSales.filter(
                (sale) => sale.id !== options.replacingSaleId,
            )

            storedSaleItems = allStoredSaleItems.filter(
                (item) => item.saleId !== options.replacingSaleId,
            )
        }

        const previewSaleId = '__fifo_preview_sale__'

        const previewSale: Sale = {
            id: previewSaleId,
            saleDate,
            status: 'completed',
            createdAt: previewCreatedAt,
            updatedAt: previewCreatedAt,
        }

        const previewSaleItems: SaleItem[] = previewItems.map(
            (item, index) => ({
                id: `__fifo_preview_item_${index}__`,
                saleId: previewSaleId,
                productId: item.productId,
                quantity: item.quantity,
                listUnitPriceMinor: 0,
                actualUnitPriceMinor: 0,
                createdAt: previewCreatedAt,
                updatedAt: previewCreatedAt,
            }),
        )

        const allSales = [...storedSales, previewSale].sort(
            compareSales,
        )

        const allSaleItems = [
            ...storedSaleItems,
            ...previewSaleItems,
        ]

        const itemsBySale = new Map<string, SaleItem[]>()

        for (const item of allSaleItems) {
            const current = itemsBySale.get(item.saleId) ?? []

            current.push(item)
            itemsBySale.set(item.saleId, current)
        }

        const allocations: FifoPreviewAllocation[] = []

        const itemResults: FifoPreviewItemResult[] =
            previewItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                totalCostMinor: 0,
            }))

        for (const sale of allSales) {
            const items = (
                itemsBySale.get(sale.id) ?? []
            ).sort(compareSaleItems)

            for (const item of items) {
                let quantityToAllocate = item.quantity

                const availableLots = lots
                    .filter(
                        (lot) =>
                            lot.productId === item.productId &&
                            lot.purchaseDate <= sale.saleDate &&
                            lot.quantityRemaining > 0,
                    )
                    .sort(compareInventoryLotsForFifo)

                for (const lot of availableLots) {
                    if (quantityToAllocate <= 0) {
                        break
                    }

                    const allocatedQuantity = Math.min(
                        quantityToAllocate,
                        lot.quantityRemaining,
                    )

                    lot.quantityRemaining -= allocatedQuantity
                    quantityToAllocate -= allocatedQuantity

                    if (sale.id === previewSaleId) {
                        const previewItemIndex =
                            previewSaleItems.findIndex(
                                (previewItem) =>
                                    previewItem.id === item.id,
                            )

                        if (previewItemIndex >= 0) {
                            const allocationCost =
                                allocatedQuantity * lot.unitCostMinor

                            itemResults[
                                previewItemIndex
                            ].totalCostMinor += allocationCost

                            allocations.push({
                                itemIndex: previewItemIndex,
                                inventoryLotId: lot.id,
                                quantity: allocatedQuantity,
                                unitCostMinor: lot.unitCostMinor,
                            })
                        }
                    }
                }

                if (quantityToAllocate > 0) {
                    if (sale.id === previewSaleId) {
                        throw new Error(
                            `Satış tarihinde yeterli stok bulunmuyor. Eksik adet: ${quantityToAllocate}`,
                        )
                    }

                    throw new Error(
                        'Mevcut geçmiş kayıtlar yeniden hesaplandığında stok yetersiz kalıyor.',
                    )
                }
            }
        }

        const totalCostMinor = itemResults.reduce(
            (total, item) =>
                total + item.totalCostMinor,
            0,
        )

        return {
            totalCostMinor,
            items: itemResults,
            allocations,
        }
    },

    async rebuildAll(): Promise<void> {
        await db.transaction(
            'rw',
            [
                db.inventoryLots,
                db.sales,
                db.saleItems,
                db.inventoryAllocations,
            ],
            async () => {
                await rebuildFifoStateInCurrentTransaction()
            },
        )
    },
}
