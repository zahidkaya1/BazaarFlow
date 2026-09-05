import type {
    InventoryEntryType,
    InventoryLot,
} from '../types/inventoryLot'

function getEntryTypePriority(
    entryType: InventoryEntryType,
): number {
    return entryType === 'opening' ? 0 : 1
}

export function compareInventoryLotsForFifo(
    first: InventoryLot,
    second: InventoryLot,
): number {
    const dateComparison = first.purchaseDate.localeCompare(
        second.purchaseDate,
    )

    if (dateComparison !== 0) {
        return dateComparison
    }

    const typeComparison =
        getEntryTypePriority(first.entryType) -
        getEntryTypePriority(second.entryType)

    if (typeComparison !== 0) {
        return typeComparison
    }

    const createdComparison = first.createdAt.localeCompare(
        second.createdAt,
    )

    if (createdComparison !== 0) {
        return createdComparison
    }

    return first.id.localeCompare(second.id)
}