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

    basketDiscountMinor?: number
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

        revenueMinor: number
        discountMinor: number

        costMinor: number
        grossProfitMinor: number
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

export type SaleHistorySummary = {
    transactionCount: number
    totalQuantity: number

    listTotalMinor: number
    revenueMinor: number
    discountMinor: number

    costMinor: number
    grossProfitMinor: number
}

export type ProductSalesQuantity = {
    productId: string
    quantity: number
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


type SalePricingInput = {
    quantity: number
    listUnitPriceMinor: number
    actualUnitPriceMinor: number
    basketDiscountMinor?: number
}

export function getSaleItemRevenueMinor(
    item: SalePricingInput,
): number {
    const baseRevenueMinor =
        item.quantity *
        item.actualUnitPriceMinor

    return Math.max(
        0,
        baseRevenueMinor -
        (item.basketDiscountMinor ?? 0),
    )
}

export function getSaleItemDiscountMinor(
    item: SalePricingInput,
): number {
    const unitDiscountMinor =
        Math.max(
            0,
            item.listUnitPriceMinor -
            item.actualUnitPriceMinor,
        ) * item.quantity

    return (
        unitDiscountMinor +
        (item.basketDiscountMinor ?? 0)
    )
}

/*
 * Sepet indirimi, satırların indirim öncesi tutarlarına
 * göre oransal dağıtılır. Math.floor sonrası kalan kuruşlar
 * en büyük kesir payına sahip satırlara birer kuruş verilerek
 * dağıtılır; böylece kayıt toplamı hedef tutarla birebir eşleşir.
 */
export function distributeBasketDiscountMinor(
    lineAmountsMinor: number[],
    targetTotalMinor: number,
): number[] {
    if (
        !Number.isSafeInteger(targetTotalMinor) ||
        targetTotalMinor < 0
    ) {
        throw new Error(
            'Geçerli bir sepet toplamı seçilmelidir.',
        )
    }

    for (const amount of lineAmountsMinor) {
        if (
            !Number.isSafeInteger(amount) ||
            amount < 0
        ) {
            throw new Error(
                'Sepet satır tutarları geçersiz.',
            )
        }
    }

    const basketTotalMinor =
        lineAmountsMinor.reduce(
            (total, amount) =>
                total + amount,
            0,
        )

    if (targetTotalMinor > basketTotalMinor) {
        throw new Error(
            'Yuvarlanan tutar sepet toplamından büyük olamaz.',
        )
    }

    const discountMinor =
        basketTotalMinor -
        targetTotalMinor

    if (
        discountMinor === 0 ||
        basketTotalMinor === 0
    ) {
        return lineAmountsMinor.map(() => 0)
    }

    const allocations =
        lineAmountsMinor.map((amount, index) => {
            const exactShare =
                discountMinor *
                amount /
                basketTotalMinor

            const floorShare =
                Math.floor(exactShare)

            return {
                index,
                floorShare,
                fraction:
                    exactShare -
                    floorShare,
            }
        })

    let remainingMinor =
        discountMinor -
        allocations.reduce(
            (total, item) =>
                total +
                item.floorShare,
            0,
        )

    allocations.sort(
        (first, second) =>
            second.fraction -
            first.fraction ||
            first.index -
            second.index,
    )

    for (
        let index = 0;
        remainingMinor > 0;
        index += 1
    ) {
        const allocation =
            allocations[
            index %
            allocations.length
            ]

        allocation.floorShare += 1
        remainingMinor -= 1
    }

    const result =
        new Array<number>(
            lineAmountsMinor.length,
        ).fill(0)

    for (const allocation of allocations) {
        result[allocation.index] =
            allocation.floorShare
    }

    return result
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
    const products =
        await db.products.bulkGet(
            inputs.map(
                (input) => input.productId,
            ),
        )

    const saleItems: SaleItem[] = []

    for (
        let index = 0;
        index < inputs.length;
        index += 1
    ) {
        const input = inputs[index]
        const product = products[index]

        if (!input || !product) {
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

        const basketDiscountMinor =
            input.basketDiscountMinor ?? 0

        validateMoney(
            basketDiscountMinor,
        )

        const baseRevenueMinor =
            input.quantity *
            actualUnitPriceMinor

        if (
            basketDiscountMinor >
            baseRevenueMinor
        ) {
            throw new Error(
                'Sepet indirimi ürün satırının tutarından büyük olamaz.',
            )
        }

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

            basketDiscountMinor:
                basketDiscountMinor > 0
                    ? basketDiscountMinor
                    : undefined,

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


function createEmptySummary(): SaleHistorySummary {
    return {
        transactionCount: 0,
        totalQuantity: 0,

        listTotalMinor: 0,
        revenueMinor: 0,
        discountMinor: 0,

        costMinor: 0,
        grossProfitMinor: 0,
    }
}

async function getSalesByDateRange(
    startDate: string,
    endDate: string,
): Promise<Sale[]> {
    if (
        startDate.length !== 10 ||
        endDate.length !== 10 ||
        startDate > endDate
    ) {
        return []
    }

    return db.sales
        .where('saleDate')
        .between(
            startDate,
            endDate,
            true,
            true,
        )
        .toArray()
}

async function buildHistoryForSales(
    sales: Sale[],
): Promise<SaleHistoryRecord[]> {
    if (sales.length === 0) {
        return []
    }

    const saleIds =
        sales.map((sale) => sale.id)

    const saleItems =
        await db.saleItems
            .where('saleId')
            .anyOf(saleIds)
            .toArray()

    const saleItemIds =
        saleItems.map((item) => item.id)

    const allocations =
        saleItemIds.length > 0
            ? await db.inventoryAllocations
                .where('saleItemId')
                .anyOf(saleItemIds)
                .toArray()
            : []

    const productIds =
        Array.from(
            new Set(
                saleItems.map(
                    (item) => item.productId,
                ),
            ),
        )

    const products =
        productIds.length > 0
            ? await db.products.bulkGet(
                productIds,
            )
            : []

    const productNames =
        new Map<string, string>()

    products.forEach(
        (product, index) => {
            if (product) {
                productNames.set(
                    productIds[index],
                    product.name,
                )
            }
        },
    )

    const itemsBySale =
        new Map<string, SaleItem[]>()

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
        new Map<string, number>()

    for (const allocation of allocations) {
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

    return [...sales]
        .sort(sortSalesDescending)
        .map((sale) => {
            const items = (
                itemsBySale.get(
                    sale.id,
                ) ?? []
            ).map(
                (item): SaleHistoryItem => {
                    const costMinor =
                        costBySaleItem.get(
                            item.id,
                        ) ?? 0

                    const revenueMinor =
                        getSaleItemRevenueMinor(
                            item,
                        )

                    const discountMinor =
                        getSaleItemDiscountMinor(
                            item,
                        )

                    return {
                        ...item,

                        productName:
                            item.productNameSnapshot ??
                            productNames.get(
                                item.productId,
                            ) ??
                            'Bilinmeyen ürün',

                        revenueMinor,
                        discountMinor,

                        costMinor,

                        grossProfitMinor:
                            revenueMinor -
                            costMinor,
                    }
                },
            )

            const totalQuantity =
                items.reduce(
                    (total, item) =>
                        total + item.quantity,
                    0,
                )

            const listTotalMinor =
                items.reduce(
                    (total, item) =>
                        total +
                        item.quantity *
                        item.listUnitPriceMinor,
                    0,
                )

            const revenueMinor =
                items.reduce(
                    (total, item) =>
                        total + item.revenueMinor,
                    0,
                )

            const discountMinor =
                items.reduce(
                    (total, item) =>
                        total + item.discountMinor,
                    0,
                )

            const costMinor =
                items.reduce(
                    (total, item) =>
                        total + item.costMinor,
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
}

async function buildSummaryForSales(
    sales: Sale[],
): Promise<SaleHistorySummary> {
    const completedSales =
        sales.filter(
            (sale) =>
                sale.status === 'completed',
        )

    if (completedSales.length === 0) {
        return createEmptySummary()
    }

    const saleIds =
        completedSales.map(
            (sale) => sale.id,
        )

    const saleItems =
        await db.saleItems
            .where('saleId')
            .anyOf(saleIds)
            .toArray()

    const saleItemIds =
        saleItems.map((item) => item.id)

    const allocations =
        saleItemIds.length > 0
            ? await db.inventoryAllocations
                .where('saleItemId')
                .anyOf(saleItemIds)
                .toArray()
            : []

    let totalQuantity = 0
    let listTotalMinor = 0
    let revenueMinor = 0
    let discountMinor = 0
    let costMinor = 0

    for (const item of saleItems) {
        totalQuantity += item.quantity

        listTotalMinor +=
            item.quantity *
            item.listUnitPriceMinor

        revenueMinor +=
            getSaleItemRevenueMinor(item)

        discountMinor +=
            getSaleItemDiscountMinor(item)
    }

    for (const allocation of allocations) {
        costMinor +=
            allocation.quantity *
            allocation.unitCostMinor
    }

    return {
        transactionCount:
            completedSales.length,
        totalQuantity,

        listTotalMinor,
        revenueMinor,
        discountMinor,

        costMinor,
        grossProfitMinor:
            revenueMinor - costMinor,
    }
}

async function getRecentSales(
    limit: number,
): Promise<Sale[]> {
    if (
        !Number.isSafeInteger(limit) ||
        limit <= 0
    ) {
        return []
    }

    const result: Sale[] = []
    let beforeDate: string | undefined

    while (result.length < limit) {
        const anchor =
            beforeDate === undefined
                ? await db.sales
                    .orderBy('saleDate')
                    .last()
                : await db.sales
                    .where('saleDate')
                    .below(beforeDate)
                    .last()

        if (!anchor) {
            break
        }

        const sameDateSales =
            await db.sales
                .where('saleDate')
                .equals(anchor.saleDate)
                .toArray()

        sameDateSales.sort(
            sortSalesDescending,
        )

        result.push(...sameDateSales)
        beforeDate = anchor.saleDate
    }

    return result
        .sort(sortSalesDescending)
        .slice(0, limit)
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
        const sales =
            await db.sales.toArray()

        return buildHistoryForSales(
            sales,
        )
    },

    async getHistoryByDateRange(
        startDate: string,
        endDate: string,
    ): Promise<SaleHistoryRecord[]> {
        const sales =
            await getSalesByDateRange(
                startDate,
                endDate,
            )

        return buildHistoryForSales(
            sales,
        )
    },

    async getSummaryByDateRange(
        startDate: string,
        endDate: string,
    ): Promise<SaleHistorySummary> {
        const sales =
            await getSalesByDateRange(
                startDate,
                endDate,
            )

        return buildSummaryForSales(
            sales,
        )
    },

    async getRecentHistory(
        limit = 5,
    ): Promise<SaleHistoryRecord[]> {
        const sales =
            await getRecentSales(limit)

        return buildHistoryForSales(
            sales,
        )
    },

    async getCompletedProductQuantities(): Promise<
        ProductSalesQuantity[]
    > {
        const completedSales =
            await db.sales
                .where('status')
                .equals('completed')
                .toArray()

        if (completedSales.length === 0) {
            return []
        }

        const saleItems =
            await db.saleItems
                .where('saleId')
                .anyOf(
                    completedSales.map(
                        (sale) => sale.id,
                    ),
                )
                .toArray()

        const quantities =
            new Map<string, number>()

        for (const item of saleItems) {
            quantities.set(
                item.productId,
                (quantities.get(
                    item.productId,
                ) ?? 0) +
                item.quantity,
            )
        }

        return Array.from(
            quantities.entries(),
            ([productId, quantity]) => ({
                productId,
                quantity,
            }),
        )
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
