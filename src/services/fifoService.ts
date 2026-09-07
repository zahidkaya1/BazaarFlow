import { db } from '../db/database'
import type {
    InventoryAdjustment,
    InventoryAdjustmentAllocation,
} from '../types/inventoryAdjustment'
import type {
    InventoryAllocation,
    Sale,
    SaleItem,
} from '../types/sale'
import type { InventoryLot } from '../types/inventoryLot'
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

type FifoAllocationSlice = {
    inventoryLotId: string
    quantity: number
    unitCostMinor: number
}

type FifoConsumptionEvent =
    | {
        kind: 'sale'
        date: string
        createdAt: string
        id: string
        sale: Sale
    }
    | {
        kind: 'adjustment'
        date: string
        createdAt: string
        id: string
        adjustment: InventoryAdjustment
    }

function compareConsumptionEvents(
    first: FifoConsumptionEvent,
    second: FifoConsumptionEvent,
): number {
    const dateComparison = first.date.localeCompare(
        second.date,
    )

    if (dateComparison !== 0) {
        return dateComparison
    }

    const createdComparison =
        first.createdAt.localeCompare(
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
    const createdComparison =
        first.createdAt.localeCompare(
            second.createdAt,
        )

    if (createdComparison !== 0) {
        return createdComparison
    }

    return first.id.localeCompare(second.id)
}

function buildConsumptionEvents(
    sales: Sale[],
    adjustments: InventoryAdjustment[],
): FifoConsumptionEvent[] {
    const events: FifoConsumptionEvent[] = [
        ...sales.map(
            (sale): FifoConsumptionEvent => ({
                kind: 'sale',
                date: sale.saleDate,
                createdAt: sale.createdAt,
                id: sale.id,
                sale,
            }),
        ),

        ...adjustments
            .filter(
                (adjustment) =>
                    adjustment.direction ===
                    'decrease',
            )
            .map(
                (
                    adjustment,
                ): FifoConsumptionEvent => ({
                    kind: 'adjustment',
                    date: adjustment.adjustmentDate,
                    createdAt: adjustment.createdAt,
                    id: adjustment.id,
                    adjustment,
                }),
            ),
    ]

    return events.sort(compareConsumptionEvents)
}

function allocateFromLots(
    lots: InventoryLot[],

    productId: string,
    eventDate: string,
    quantity: number,
    insufficientMessage: (missing: number) => string,
): FifoAllocationSlice[] {
    let quantityToAllocate = quantity

    const slices: FifoAllocationSlice[] = []

    const availableLots = lots
        .filter(
            (lot) =>
                lot.productId === productId &&
                lot.purchaseDate <= eventDate &&
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

        slices.push({
            inventoryLotId: lot.id,
            quantity: allocatedQuantity,
            unitCostMinor: lot.unitCostMinor,
        })
    }

    if (quantityToAllocate > 0) {
        throw new Error(
            insufficientMessage(quantityToAllocate),
        )
    }

    return slices
}

export async function rebuildFifoStateInCurrentTransaction(): Promise<void> {
    const [
        lots,
        sales,
        saleItems,
        adjustments,
    ] = await Promise.all([
        db.inventoryLots.toArray(),

        db.sales
            .where('status')
            .equals('completed')
            .toArray(),

        db.saleItems.toArray(),

        db.inventoryAdjustments
            .where('direction')
            .equals('decrease')
            .toArray(),
    ])

    for (const lot of lots) {
        lot.quantityRemaining =
            lot.quantityReceived
    }

    await Promise.all([
        db.inventoryAllocations.clear(),
        db.inventoryAdjustmentAllocations.clear(),
    ])

    const itemsBySale =
        new Map<string, SaleItem[]>()

    for (const item of saleItems) {
        const current =
            itemsBySale.get(item.saleId) ?? []

        current.push(item)

        itemsBySale.set(
            item.saleId,
            current,
        )
    }

    const saleAllocations:
        InventoryAllocation[] = []

    const adjustmentAllocations:
        InventoryAdjustmentAllocation[] = []

    const allocationCreatedAt =
        new Date().toISOString()

    const events = buildConsumptionEvents(
        sales,
        adjustments,
    )

    for (const event of events) {
        if (event.kind === 'sale') {
            const items = (
                itemsBySale.get(
                    event.sale.id,
                ) ?? []
            ).sort(compareSaleItems)

            for (const item of items) {
                const slices =
                    allocateFromLots(
                        lots,
                        item.productId,
                        event.sale.saleDate,
                        item.quantity,
                        (missing) =>
                            `Satış tarihinde yeterli stok bulunmuyor. Eksik adet: ${missing}`,
                    )

                for (const slice of slices) {
                    saleAllocations.push({
                        id: createId(),
                        saleItemId: item.id,
                        inventoryLotId:
                            slice.inventoryLotId,
                        quantity:
                            slice.quantity,
                        unitCostMinor:
                            slice.unitCostMinor,
                        createdAt:
                            allocationCreatedAt,
                    })
                }
            }

            continue
        }

        const slices = allocateFromLots(
            lots,
            event.adjustment.productId,
            event.adjustment.adjustmentDate,
            event.adjustment.quantity,
            (missing) =>
                `Stok düzeltmesi tarihinde yeterli stok bulunmuyor. Eksik adet: ${missing}`,
        )

        for (const slice of slices) {
            adjustmentAllocations.push({
                id: createId(),
                adjustmentId:
                    event.adjustment.id,
                inventoryLotId:
                    slice.inventoryLotId,
                quantity: slice.quantity,
                unitCostMinor:
                    slice.unitCostMinor,
                createdAt:
                    allocationCreatedAt,
            })
        }
    }

    await db.inventoryLots.bulkPut(lots)

    if (saleAllocations.length > 0) {
        await db.inventoryAllocations.bulkAdd(
            saleAllocations,
        )
    }

    if (
        adjustmentAllocations.length > 0
    ) {
        await db.inventoryAdjustmentAllocations.bulkAdd(
            adjustmentAllocations,
        )
    }
}

export const fifoService = {
    async previewSale(
        saleDate: string,
        previewItems: FifoPreviewItem[],
        options: FifoPreviewOptions = {},
    ): Promise<FifoPreviewResult> {
        const [
            storedLots,
            allStoredSales,
            allStoredSaleItems,
            storedAdjustments,
        ] = await Promise.all([
            db.inventoryLots.toArray(),

            db.sales
                .where('status')
                .equals('completed')
                .toArray(),

            db.saleItems.toArray(),

            db.inventoryAdjustments
                .where('direction')
                .equals('decrease')
                .toArray(),
        ])

        if (previewItems.length === 0) {
            throw new Error(
                'FIFO hesaplamak için en az bir ürün bulunmalıdır.',
            )
        }

        for (const item of previewItems) {
            if (
                !Number.isSafeInteger(
                    item.quantity,
                ) ||
                item.quantity <= 0
            ) {
                throw new Error(
                    'FIFO hesaplamasında satış adedi geçersiz.',
                )
            }
        }

        const lots = storedLots.map(
            (lot) => ({
                ...lot,
                quantityRemaining:
                    lot.quantityReceived,
            }),
        )

        let storedSales =
            allStoredSales

        let storedSaleItems =
            allStoredSaleItems

        let previewCreatedAt =
            new Date().toISOString()

        let previewSaleId =
            '__fifo_preview_sale__'

        if (options.replacingSaleId) {
            const replacedSale =
                allStoredSales.find(
                    (sale) =>
                        sale.id ===
                        options.replacingSaleId,
                )

            if (!replacedSale) {
                throw new Error(
                    'Düzenlenecek satış bulunamadı.',
                )
            }

            /*
             * Düzenlenen satış aynı gün içindeki
             * eski kronolojik konumunu ve kimliğini
             * korur. Böylece önizleme ile gerçek
             * güncelleme aynı sırada çalışır.
             */
            previewCreatedAt =
                replacedSale.createdAt

            previewSaleId =
                replacedSale.id

            storedSales =
                allStoredSales.filter(
                    (sale) =>
                        sale.id !==
                        options.replacingSaleId,
                )

            storedSaleItems =
                allStoredSaleItems.filter(
                    (item) =>
                        item.saleId !==
                        options.replacingSaleId,
                )
        }

        const previewSale: Sale = {
            id: previewSaleId,
            saleDate,
            status: 'completed',
            createdAt: previewCreatedAt,
            updatedAt: previewCreatedAt,
        }

        const previewSaleItems:
            SaleItem[] =
            previewItems.map(
                (item, index) => ({
                    id: `__fifo_preview_item_${index}__`,
                    saleId: previewSaleId,
                    productId:
                        item.productId,
                    quantity:
                        item.quantity,
                    listUnitPriceMinor: 0,
                    actualUnitPriceMinor: 0,
                    createdAt:
                        previewCreatedAt,
                    updatedAt:
                        previewCreatedAt,
                }),
            )

        const allSales = [
            ...storedSales,
            previewSale,
        ]

        const allSaleItems = [
            ...storedSaleItems,
            ...previewSaleItems,
        ]

        const itemsBySale =
            new Map<string, SaleItem[]>()

        for (const item of allSaleItems) {
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

        const allocations:
            FifoPreviewAllocation[] = []

        const itemResults:
            FifoPreviewItemResult[] =
            previewItems.map(
                (item) => ({
                    productId:
                        item.productId,
                    quantity:
                        item.quantity,
                    totalCostMinor: 0,
                }),
            )

        const events =
            buildConsumptionEvents(
                allSales,
                storedAdjustments,
            )

        for (const event of events) {
            if (
                event.kind ===
                'adjustment'
            ) {
                allocateFromLots(
                    lots,
                    event.adjustment.productId,
                    event.adjustment.adjustmentDate,
                    event.adjustment.quantity,
                    () =>
                        'Mevcut geçmiş kayıtlar yeniden hesaplandığında bir stok düzeltmesi için stok yetersiz kalıyor.',
                )

                continue
            }

            const items = (
                itemsBySale.get(
                    event.sale.id,
                ) ?? []
            ).sort(compareSaleItems)

            for (const item of items) {
                const isPreviewSale =
                    event.sale.id ===
                    previewSaleId

                const slices =
                    allocateFromLots(
                        lots,
                        item.productId,
                        event.sale.saleDate,
                        item.quantity,
                        (missing) =>
                            isPreviewSale
                                ? `Satış tarihinde yeterli stok bulunmuyor. Eksik adet: ${missing}`
                                : 'Mevcut geçmiş kayıtlar yeniden hesaplandığında stok yetersiz kalıyor.',
                    )

                if (!isPreviewSale) {
                    continue
                }

                const previewItemIndex =
                    previewSaleItems.findIndex(
                        (previewItem) =>
                            previewItem.id ===
                            item.id,
                    )

                if (
                    previewItemIndex < 0
                ) {
                    continue
                }

                for (const slice of slices) {
                    const allocationCost =
                        slice.quantity *
                        slice.unitCostMinor

                    itemResults[
                        previewItemIndex
                    ].totalCostMinor +=
                        allocationCost

                    allocations.push({
                        itemIndex:
                            previewItemIndex,
                        inventoryLotId:
                            slice.inventoryLotId,
                        quantity:
                            slice.quantity,
                        unitCostMinor:
                            slice.unitCostMinor,
                    })
                }
            }
        }

        const totalCostMinor =
            itemResults.reduce(
                (total, item) =>
                    total +
                    item.totalCostMinor,
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
                db.inventoryAdjustments,
                db.inventoryAdjustmentAllocations,
            ],
            async () => {
                await rebuildFifoStateInCurrentTransaction()
            },
        )
    },
}
