import { db } from '../db/database'
import type { Category } from '../types/category'
import { createId } from '../utils/createId'

export type CreateCategoryInput = {
    name: string
    description?: string
}

export type UpdateCategoryInput = {
    name?: string
    description?: string
}

function normalizeName(value: string): string {
    return value.trim()
}

async function ensureCategoryNameAvailable(
    name: string,
    excludedId?: string,
): Promise<void> {
    const normalizedName = normalizeName(name).toLocaleLowerCase('tr-TR')
    const categories = await db.categories.toArray()

    const duplicate = categories.some(
        (category) =>
            category.id !== excludedId &&
            category.name.trim().toLocaleLowerCase('tr-TR') === normalizedName,
    )

    if (duplicate) {
        throw new Error('Bu isimde bir kategori zaten mevcut.')
    }
}

export const categoryService = {
    async getAll(): Promise<Category[]> {
        const categories = await db.categories.toArray()

        return categories.sort((a, b) =>
            a.name.localeCompare(b.name, 'tr-TR'),
        )
    },

    async getById(id: string): Promise<Category | undefined> {
        return db.categories.get(id)
    },

    async create(input: CreateCategoryInput): Promise<Category> {
        const name = normalizeName(input.name)

        if (!name) {
            throw new Error('Kategori adı boş bırakılamaz.')
        }

        await ensureCategoryNameAvailable(name)

        const now = new Date().toISOString()

        const category: Category = {
            id: createId(),
            name,
            description: input.description?.trim() || undefined,
            isActive: true,
            createdAt: now,
            updatedAt: now,
        }

        await db.categories.add(category)

        return category
    },

    async update(
        id: string,
        input: UpdateCategoryInput,
    ): Promise<Category> {
        const current = await db.categories.get(id)

        if (!current) {
            throw new Error('Kategori bulunamadı.')
        }

        const name =
            input.name !== undefined
                ? normalizeName(input.name)
                : current.name

        if (!name) {
            throw new Error('Kategori adı boş bırakılamaz.')
        }

        await ensureCategoryNameAvailable(name, id)

        const updated: Category = {
            ...current,
            name,
            description:
                input.description !== undefined
                    ? input.description.trim() || undefined
                    : current.description,
            updatedAt: new Date().toISOString(),
        }

        await db.categories.put(updated)

        return updated
    },

    async setActive(id: string, isActive: boolean): Promise<Category> {
        const current = await db.categories.get(id)

        if (!current) {
            throw new Error('Kategori bulunamadı.')
        }

        const updated: Category = {
            ...current,
            isActive,
            updatedAt: new Date().toISOString(),
        }

        await db.categories.put(updated)

        return updated
    },
}