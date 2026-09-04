export type Product = {
    id: string
    name: string

    sku?: string
    categoryId?: string

    defaultSalePriceMinor: number
    minimumStock: number

    isActive: boolean
    note?: string

    createdAt: string
    updatedAt: string
}