import { db } from '../db/database'
import type {
    InventoryAdjustment,
    InventoryAdjustmentDirection,
} from '../types/inventoryAdjustment'
import type { InventoryLot } from '../types/inventoryLot'
import { createId } from '../utils/createId'
import { rebuildFifoStateInCurrentTransaction } from './fifoService'

export type CreateInventoryAdjustmentInput = {
    productId: string

    adjustmentDate: string
    direction: InventoryAdjustmentDirection

    quantity: number

    /*
     * Yalnızca increase için zorunludur.
     * Artan stok yeni bir FIFO lotu oluşturur.
     */
    unitCostMinor?: number

    reason: string
    note?: string
}

export type InventoryAdjustmentHistoryRecord = {
    adjustment: InventoryAdjustment

    productName: string
    productSku?: string

    /*
     * increase: eklenen lotun toplam maliyeti
     * decrease: FIFO'dan tüketilen toplam maliyet
     */
    valueMinor: number
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
            'Geçerli bir stok düzeltme tarihi girilmelidir.',
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
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day

    if (!isValid) {
        throw new Error(
            'Geçerli bir stok düzeltme tarihi girilmelidir.',
        )
    }
}

function validateQuantity(
    quantity: number,
): void {
    if (
        !Number.isSafeInteger(quantity) ||
        quantity <= 0
    ) {
        throw new Error(
            'Düzeltme adedi sıfırdan büyük tam sayı olmalıdır.',
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
            'Birim maliyet negatif olmayan geçerli bir tutar olmalıdır.',
        )
    }
}

function validateDirection(
    direction: InventoryAdjustmentDirection,
): void {
    if (
        direction !== 'increase' &&
        direction !== 'decrease'
    ) {
        throw new Error(
            'Geçerli bir stok düzeltme yönü seçilmelidir.',
        )
    }
}

function sortAdjustmentsDescending(
    first: InventoryAdjustment,
    second: InventoryAdjustment,
): number {
    const dateComparison =
        second.adjustmentDate.localeCompare(
            first.adjustmentDate,
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

    return second.id.localeCompare(first.id)
}

export const inventoryAdjustmentService = {
    async getAll(): Promise<
        InventoryAdjustment[]
    > {
        const adjustments =
            await db.inventoryAdjustments.toArray()

        return adjustments.sort(
            sortAdjustmentsDescending,
        )
    },

    async getByProductId(
        productId: string,
    ): Promise<InventoryAdjustment[]> {
        const adjustments =
            await db.inventoryAdjustments
                .where('productId')
                .equals(productId)
                .toArray()

        return adjustments.sort(
            sortAdjustmentsDescending,
        )
    },

    async getHistory(): Promise<
        InventoryAdjustmentHistoryRecord[]
    > {
        const [
            adjustments,
            allocations,
            products,
        ] = await Promise.all([
            db.inventoryAdjustments.toArray(),
            db.inventoryAdjustmentAllocations.toArray(),
            db.products.toArray(),
        ])

        const productsById =
            new Map(
                products.map((product) => [
                    product.id,
                    product,
                ]),
            )

        const decreaseCostByAdjustment =
            new Map<string, number>()

        for (const allocation of allocations) {
            const cost =
                allocation.quantity *
                allocation.unitCostMinor

            decreaseCostByAdjustment.set(
                allocation.adjustmentId,
                (decreaseCostByAdjustment.get(
                    allocation.adjustmentId,
                ) ?? 0) + cost,
            )
        }

        return adjustments
            .sort(
                sortAdjustmentsDescending,
            )
            .map((adjustment) => {
                const product =
                    productsById.get(
                        adjustment.productId,
                    )

                const valueMinor =
                    adjustment.direction ===
                        'increase'
                        ? adjustment.quantity *
                        (adjustment.unitCostMinor ??
                            0)
                        : decreaseCostByAdjustment.get(
                            adjustment.id,
                        ) ?? 0

                return {
                    adjustment,
                    productName:
                        product?.name ??
                        'Bilinmeyen ürün',
                    productSku:
                        product?.sku,
                    valueMinor,
                }
            })
    },

    async create(
        input: CreateInventoryAdjustmentInput,
    ): Promise<InventoryAdjustment> {
        const productId =
            input.productId.trim()

        const adjustmentDate =
            input.adjustmentDate.trim()

        const reason =
            input.reason.trim()

        if (!productId) {
            throw new Error(
                'Ürün seçilmelidir.',
            )
        }

        if (!reason) {
            throw new Error(
                'Stok düzeltme nedeni girilmelidir.',
            )
        }

        validateDirection(
            input.direction,
        )

        validateDateOnly(
            adjustmentDate,
        )

        validateQuantity(
            input.quantity,
        )

        if (
            input.direction === 'increase'
        ) {
            if (
                input.unitCostMinor ===
                undefined
            ) {
                throw new Error(
                    'Stok artışında birim maliyet girilmelidir.',
                )
            }

            validateMoney(
                input.unitCostMinor,
            )
        }

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
                const product =
                    await db.products.get(
                        productId,
                    )

                if (!product) {
                    throw new Error(
                        'Seçilen ürün bulunamadı.',
                    )
                }

                const now =
                    new Date().toISOString()

                const adjustmentId =
                    createId()

                const linkedInventoryLotId =
                    input.direction ===
                        'increase'
                        ? createId()
                        : undefined

                const adjustment:
                    InventoryAdjustment = {
                    id: adjustmentId,
                    productId,

                    adjustmentDate,
                    direction:
                        input.direction,

                    quantity:
                        input.quantity,

                    unitCostMinor:
                        input.direction ===
                            'increase'
                            ? input.unitCostMinor
                            : undefined,

                    reason,
                    note: normalizeOptionalText(
                        input.note,
                    ),

                    linkedInventoryLotId,

                    createdAt: now,
                    updatedAt: now,
                }

                await db.inventoryAdjustments.add(
                    adjustment,
                )

                if (
                    input.direction ===
                    'increase'
                ) {
                    const unitCostMinor =
                        input.unitCostMinor

                    if (
                        unitCostMinor ===
                        undefined
                    ) {
                        throw new Error(
                            'Stok artışında birim maliyet girilmelidir.',
                        )
                    }

                    const lot: InventoryLot = {
                        id:
                            linkedInventoryLotId ??
                            createId(),

                        productId,

                        entryType:
                            'adjustment',

                        purchaseDate:
                            adjustmentDate,

                        quantityReceived:
                            input.quantity,

                        quantityRemaining:
                            input.quantity,

                        unitCostMinor,

                        sourceAdjustmentId:
                            adjustmentId,

                        note:
                            normalizeOptionalText(
                                input.note,
                            )
                                ? `${reason} — ${input.note?.trim()}`
                                : reason,

                        createdAt: now,
                        updatedAt: now,
                    }

                    await db.inventoryLots.add(
                        lot,
                    )
                }

                /*
                 * decrease ise FIFO bu kaydı tüketim
                 * olayı olarak işler.
                 *
                 * increase ise oluşturulan adjustment
                 * lotu FIFO havuzuna normal lot gibi
                 * katılır.
                 */
                await rebuildFifoStateInCurrentTransaction()

                return adjustment
            },
        )
    },
}
