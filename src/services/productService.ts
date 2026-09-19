import { db } from '../db/database'
import type { Product } from '../types/product'
import { createId } from '../utils/createId'
import { recoveryService } from './recoveryService'

export type CreateProductInput = {
    name: string
    sku?: string
    categoryId?: string
    defaultSalePriceMinor: number
    minimumStock?: number
    note?: string
}

export type UpdateProductInput = {
    name?: string
    sku?: string
    categoryId?: string
    defaultSalePriceMinor?: number
    minimumStock?: number
    note?: string
}

export type ProductDeletionCheck = {
    canDelete: boolean
    reason?: string
}

function normalizeOptionalText(value?: string): string | undefined {
    const normalized = value?.trim()

    return normalized || undefined
}

function validateMoney(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error(
            'Satış fiyatı negatif olmayan tam sayı biçiminde olmalıdır.',
        )
    }
}

function validateMinimumStock(value: number): void {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error(
            'Minimum stok değeri negatif olmayan tam sayı olmalıdır.',
        )
    }
}

async function ensureCategoryExists(categoryId?: string): Promise<void> {
    if (!categoryId) {
        return
    }

    const category = await db.categories.get(categoryId)

    if (!category) {
        throw new Error('Seçilen kategori bulunamadı.')
    }
}

async function ensureSkuAvailable(
    sku?: string,
    excludedId?: string,
): Promise<void> {
    if (!sku) {
        return
    }

    const normalizedSku = sku.trim().toLocaleLowerCase('tr-TR')
    const products = await db.products.toArray()

    const duplicate = products.some(
        (product) =>
            product.id !== excludedId &&
            product.sku?.trim().toLocaleLowerCase('tr-TR') === normalizedSku,
    )

    if (duplicate) {
        throw new Error('Bu SKU başka bir üründe kullanılıyor.')
    }
}

async function getDeletionCheck(id: string): Promise<ProductDeletionCheck> {
    const current = await db.products.get(id)

    if (!current) {
        throw new Error('Ürün bulunamadı.')
    }

    const [inventoryLotCount, saleItemCount, adjustmentCount] =
        await Promise.all([
            db.inventoryLots.where('productId').equals(id).count(),
            db.saleItems.where('productId').equals(id).count(),
            db.inventoryAdjustments.where('productId').equals(id).count(),
        ])

    if (saleItemCount > 0) {
        return {
            canDelete: false,
            reason:
                'Bu ürün satış geçmişinde kullanıldığı için kalıcı olarak silinemez. Geçmiş kayıtları korumak için ürünü pasife alın.',
        }
    }

    if (inventoryLotCount > 0 || adjustmentCount > 0) {
        return {
            canDelete: false,
            reason:
                'Bu ürün stok hareketlerinde kullanıldığı için kalıcı olarak silinemez. FIFO ve stok geçmişini korumak için ürünü pasife alın.',
        }
    }

    return { canDelete: true }
}

export const productService = {
    async getAll(): Promise<Product[]> {
        const products = await db.products.toArray()

        return products.sort((a, b) =>
            a.name.localeCompare(b.name, 'tr-TR'),
        )
    },

    async getById(id: string): Promise<Product | undefined> {
        return db.products.get(id)
    },

    async create(input: CreateProductInput): Promise<Product> {
        const name = input.name.trim()

        if (!name) {
            throw new Error('Ürün adı boş bırakılamaz.')
        }

        validateMoney(input.defaultSalePriceMinor)

        const minimumStock = input.minimumStock ?? 0
        validateMinimumStock(minimumStock)

        const sku = normalizeOptionalText(input.sku)
        const categoryId = normalizeOptionalText(input.categoryId)

        await ensureCategoryExists(categoryId)
        await ensureSkuAvailable(sku)

        const now = new Date().toISOString()

        const product: Product = {
            id: createId(),
            name,
            sku,
            categoryId,
            defaultSalePriceMinor: input.defaultSalePriceMinor,
            minimumStock,
            isActive: true,
            note: normalizeOptionalText(input.note),
            createdAt: now,
            updatedAt: now,
        }

        await db.products.add(product)

        return product
    },

    async update(
        id: string,
        input: UpdateProductInput,
    ): Promise<Product> {
        const current = await db.products.get(id)

        if (!current) {
            throw new Error('Ürün bulunamadı.')
        }

        const name =
            input.name !== undefined ? input.name.trim() : current.name

        if (!name) {
            throw new Error('Ürün adı boş bırakılamaz.')
        }

        const defaultSalePriceMinor =
            input.defaultSalePriceMinor ??
            current.defaultSalePriceMinor

        const minimumStock =
            input.minimumStock ?? current.minimumStock

        validateMoney(defaultSalePriceMinor)
        validateMinimumStock(minimumStock)

        const sku =
            input.sku !== undefined
                ? normalizeOptionalText(input.sku)
                : current.sku

        const categoryId =
            input.categoryId !== undefined
                ? normalizeOptionalText(input.categoryId)
                : current.categoryId

        await ensureCategoryExists(categoryId)
        await ensureSkuAvailable(sku, id)

        const updated: Product = {
            ...current,
            name,
            sku,
            categoryId,
            defaultSalePriceMinor,
            minimumStock,
            note:
                input.note !== undefined
                    ? normalizeOptionalText(input.note)
                    : current.note,
            updatedAt: new Date().toISOString(),
        }

        await db.products.put(updated)

        return updated
    },

    async setActive(id: string, isActive: boolean): Promise<Product> {
        const current = await db.products.get(id)

        if (!current) {
            throw new Error('Ürün bulunamadı.')
        }

        const updated: Product = {
            ...current,
            isActive,
            updatedAt: new Date().toISOString(),
        }

        await db.products.put(updated)

        return updated
    },

    async getDeletionCheck(id: string): Promise<ProductDeletionCheck> {
        return getDeletionCheck(id)
    },

    async deletePermanently(id: string): Promise<void> {
        const precheck = await getDeletionCheck(id)

        if (!precheck.canDelete) {
            throw new Error(
                precheck.reason ?? 'Ürün kalıcı olarak silinemiyor.',
            )
        }

        await recoveryService.createActionPoint(
            'Ürün kalıcı silinmeden önce',
        )

        await db.transaction(
            'rw',
            db.products,
            db.inventoryLots,
            db.saleItems,
            db.inventoryAdjustments,
            async () => {
                const check = await getDeletionCheck(id)

                if (!check.canDelete) {
                    throw new Error(
                        check.reason ?? 'Ürün kalıcı olarak silinemiyor.',
                    )
                }

                await db.products.delete(id)
            },
        )
    },
}
