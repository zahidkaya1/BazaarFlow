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

type FifoLotBucket = {
    lots: InventoryLot[]
    cursor: number
}

type FifoLotPool = Map<string, FifoLotBucket>

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

        ...adjustments.map(
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

function buildSaleItemsBySale(
    saleItems: SaleItem[],
): Map<string, SaleItem[]> {
    const itemsBySale =
        new Map<string, SaleItem[]>()

    for (const item of saleItems) {
        const current =
            itemsBySale.get(item.saleId) ?? []

        current.push(item)
        itemsBySale.set(item.saleId, current)
    }

    for (const items of itemsBySale.values()) {
        items.sort(compareSaleItems)
    }

    return itemsBySale
}

/*
 * Lotlar ürün bazında yalnızca bir kez gruplanıp FIFO sırasına
 * sokulur. Tüketim olayları zaten kronolojik işlendiği için her
 * satışta tekrar filter + sort yapmak yerine ürünün imleci ileri
 * taşınır. Tükenen lotlara bir daha dönülmez.
 */
function buildFifoLotPool(
    lots: InventoryLot[],
): FifoLotPool {
    const pool: FifoLotPool = new Map()

    for (const lot of lots) {
        const bucket = pool.get(lot.productId)

        if (bucket) {
            bucket.lots.push(lot)
            continue
        }

        pool.set(lot.productId, {
            lots: [lot],
            cursor: 0,
        })
    }

    for (const bucket of pool.values()) {
        bucket.lots.sort(
            compareInventoryLotsForFifo,
        )
    }

    return pool
}

function allocateFromLotPool(
    pool: FifoLotPool,
    productId: string,
    eventDate: string,
    quantity: number,
    insufficientMessage: (missing: number) => string,
): FifoAllocationSlice[] {
    let quantityToAllocate = quantity

    const slices: FifoAllocationSlice[] = []
    const bucket = pool.get(productId)

    if (!bucket) {
        throw new Error(
            insufficientMessage(quantityToAllocate),
        )
    }

    let index = bucket.cursor

    while (
        quantityToAllocate > 0 &&
        index < bucket.lots.length
    ) {
        const lot = bucket.lots[index]

        /*
         * Lotlar purchaseDate sırasına göre dizili. Bu lot henüz
         * satış tarihinde mevcut değilse sonraki lotlar da mevcut
         * değildir; burada durmak yeterlidir.
         */
        if (lot.purchaseDate > eventDate) {
            break
        }

        if (lot.quantityRemaining <= 0) {
            index += 1
            continue
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

        if (lot.quantityRemaining <= 0) {
            index += 1
        }
    }

    bucket.cursor = index

    if (quantityToAllocate > 0) {
        throw new Error(
            insufficientMessage(quantityToAllocate),
        )
    }

    return slices
}

async function getSaleItemsForSales(
    sales: Sale[],
): Promise<SaleItem[]> {
    if (sales.length === 0) {
        return []
    }

    return db.saleItems
        .where('saleId')
        .anyOf(
            sales.map((sale) => sale.id),
        )
        .toArray()
}


type SaleCapacityConsumptionEvent = {
    productId: string
    date: string
    createdAt: string
    id: string
    quantity: number
}

function compareSaleCapacityEvents(
    first: SaleCapacityConsumptionEvent,
    second: SaleCapacityConsumptionEvent,
): number {
    const dateComparison =
        first.date.localeCompare(
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

    return first.id.localeCompare(
        second.id,
    )
}

function buildSaleCapacityByProduct(
    saleDate: string,
    lots: InventoryLot[],
    sales: Sale[],
    saleItems: SaleItem[],
    adjustments: InventoryAdjustment[],
): Record<string, number> {
    const lotsByProduct =
        new Map<string, InventoryLot[]>()

    for (const lot of lots) {
        const current =
            lotsByProduct.get(
                lot.productId,
            ) ?? []

        current.push(lot)
        lotsByProduct.set(
            lot.productId,
            current,
        )
    }

    for (
        const productLots of
        lotsByProduct.values()
    ) {
        productLots.sort(
            (first, second) => {
                const dateComparison =
                    first.purchaseDate.localeCompare(
                        second.purchaseDate,
                    )

                if (
                    dateComparison !== 0
                ) {
                    return dateComparison
                }

                const createdComparison =
                    first.createdAt.localeCompare(
                        second.createdAt,
                    )

                if (
                    createdComparison !== 0
                ) {
                    return createdComparison
                }

                return first.id.localeCompare(
                    second.id,
                )
            },
        )
    }

    const saleById =
        new Map(
            sales.map((sale) => [
                sale.id,
                sale,
            ]),
        )

    const eventsByProduct =
        new Map<
            string,
            SaleCapacityConsumptionEvent[]
        >()

    function addConsumptionEvent(
        event: SaleCapacityConsumptionEvent,
    ) {
        const current =
            eventsByProduct.get(
                event.productId,
            ) ?? []

        current.push(event)

        eventsByProduct.set(
            event.productId,
            current,
        )
    }

    for (const item of saleItems) {
        const sale =
            saleById.get(item.saleId)

        if (!sale) {
            continue
        }

        addConsumptionEvent({
            productId: item.productId,
            date: sale.saleDate,
            createdAt:
                sale.createdAt,
            id:
                `sale:${sale.id}:${item.id}`,
            quantity: item.quantity,
        })
    }

    for (
        const adjustment of
        adjustments
    ) {
        addConsumptionEvent({
            productId:
                adjustment.productId,
            date:
                adjustment.adjustmentDate,
            createdAt:
                adjustment.createdAt,
            id:
                `adjustment:${adjustment.id}`,
            quantity:
                adjustment.quantity,
        })
    }

    const productIds =
        new Set<string>([
            ...lotsByProduct.keys(),
            ...eventsByProduct.keys(),
        ])

    const capacityByProduct:
        Record<string, number> = {}

    /*
     * Yeni toplu satış, seçilen gün içinde "şimdi" oluşturulacağı
     * için aynı tarihli mevcut kayıtların arkasına yerleşir.
     * Sonraki tarihli kayıtları da bozmaması gerektiğinden yalnız
     * seçilen gündeki bakiye değil, o noktadan sonraki en düşük
     * stok bakiyesi kapasiteyi belirler.
     */
    const insertionCreatedAt =
        new Date().toISOString()

    for (const productId of productIds) {
        const productLots =
            lotsByProduct.get(
                productId,
            ) ?? []

        const events = [
            ...(eventsByProduct.get(
                productId,
            ) ?? []),

            {
                productId,
                date: saleDate,
                createdAt:
                    insertionCreatedAt,
                id:
                    '__bulk_sale_capacity__',
                quantity: 0,
            },
        ].sort(
            compareSaleCapacityEvents,
        )

        let lotIndex = 0
        let balance = 0

        let insertionReached = false
        let capacity =
            Number.POSITIVE_INFINITY

        for (const event of events) {
            while (
                lotIndex <
                productLots.length &&
                productLots[
                    lotIndex
                ].purchaseDate <=
                event.date
            ) {
                balance +=
                    productLots[
                        lotIndex
                    ].quantityReceived

                lotIndex += 1
            }

            if (
                event.id ===
                '__bulk_sale_capacity__'
            ) {
                insertionReached = true
                capacity = balance
                continue
            }

            balance -= event.quantity

            if (insertionReached) {
                capacity = Math.min(
                    capacity,
                    balance,
                )
            }
        }

        capacityByProduct[
            productId
        ] = Math.max(
            0,
            Number.isFinite(capacity)
                ? capacity
                : 0,
        )
    }

    return capacityByProduct
}

function validatePreviewItems(
    previewItems: FifoPreviewItem[],
): void {
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
}

export async function rebuildFifoStateInCurrentTransaction(): Promise<void> {
    const [lots, sales, adjustments] =
        await Promise.all([
            db.inventoryLots.toArray(),

            db.sales
                .where('status')
                .equals('completed')
                .toArray(),

            db.inventoryAdjustments
                .where('direction')
                .equals('decrease')
                .toArray(),
        ])

    const saleItems =
        await getSaleItemsForSales(sales)

    for (const lot of lots) {
        lot.quantityRemaining =
            lot.quantityReceived
    }

    await Promise.all([
        db.inventoryAllocations.clear(),
        db.inventoryAdjustmentAllocations.clear(),
    ])

    const itemsBySale =
        buildSaleItemsBySale(saleItems)

    const lotPool = buildFifoLotPool(lots)

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
            const items =
                itemsBySale.get(
                    event.sale.id,
                ) ?? []

            for (const item of items) {
                const slices =
                    allocateFromLotPool(
                        lotPool,
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

        const slices =
            allocateFromLotPool(
                lotPool,
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

    async getSaleCapacityByDate(
        saleDate: string,
    ): Promise<Record<string, number>> {
        if (!saleDate) {
            throw new Error(
                'Satış tarihi seçilmelidir.',
            )
        }

        const [
            lots,
            sales,
            adjustments,
        ] = await Promise.all([
            db.inventoryLots.toArray(),

            db.sales
                .where('status')
                .equals('completed')
                .toArray(),

            db.inventoryAdjustments
                .where('direction')
                .equals('decrease')
                .toArray(),
        ])

        const saleItems =
            await getSaleItemsForSales(
                sales,
            )

        return buildSaleCapacityByProduct(
            saleDate,
            lots,
            sales,
            saleItems,
            adjustments,
        )
    },

    async previewSale(
        saleDate: string,
        previewItems: FifoPreviewItem[],
        options: FifoPreviewOptions = {},
    ): Promise<FifoPreviewResult> {
        validatePreviewItems(previewItems)

        const [
            storedLots,
            allStoredSales,
            storedAdjustments,
        ] = await Promise.all([
            db.inventoryLots.toArray(),

            db.sales
                .where('status')
                .equals('completed')
                .toArray(),

            db.inventoryAdjustments
                .where('direction')
                .equals('decrease')
                .toArray(),
        ])

        const allStoredSaleItems =
            await getSaleItemsForSales(
                allStoredSales,
            )

        const lots = storedLots.map(
            (lot) => ({
                ...lot,
                quantityRemaining:
                    lot.quantityReceived,
            }),
        )

        let storedSales = allStoredSales
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
             * Düzenlenen satış aynı gün içindeki eski kronolojik
             * konumunu ve kimliğini korur. Böylece önizleme ile
             * gerçek güncelleme aynı sırada çalışır.
             */
            previewCreatedAt =
                replacedSale.createdAt

            previewSaleId = replacedSale.id

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

        const previewSaleItems: SaleItem[] =
            previewItems.map(
                (item, index) => ({
                    id: `__fifo_preview_item_${index}__`,
                    saleId: previewSaleId,
                    productId: item.productId,
                    quantity: item.quantity,
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
            buildSaleItemsBySale(
                allSaleItems,
            )

        const lotPool =
            buildFifoLotPool(lots)

        const previewItemIndexById =
            new Map(
                previewSaleItems.map(
                    (item, index) => [
                        item.id,
                        index,
                    ],
                ),
            )

        const allocations:
            FifoPreviewAllocation[] = []

        const itemResults:
            FifoPreviewItemResult[] =
            previewItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                totalCostMinor: 0,
            }))

        const events = buildConsumptionEvents(
            allSales,
            storedAdjustments,
        )

        for (const event of events) {
            if (
                event.kind === 'adjustment'
            ) {
                allocateFromLotPool(
                    lotPool,
                    event.adjustment.productId,
                    event.adjustment.adjustmentDate,
                    event.adjustment.quantity,
                    () =>
                        'Mevcut geçmiş kayıtlar yeniden hesaplandığında bir stok düzeltmesi için stok yetersiz kalıyor.',
                )

                continue
            }

            const items =
                itemsBySale.get(
                    event.sale.id,
                ) ?? []

            for (const item of items) {
                const isPreviewSale =
                    event.sale.id ===
                    previewSaleId

                const slices =
                    allocateFromLotPool(
                        lotPool,
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
                    previewItemIndexById.get(
                        item.id,
                    )

                if (
                    previewItemIndex ===
                    undefined
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
