import { db } from '../db/database'

import {
    BAZAARFLOW_BACKUP_APP,
    BAZAARFLOW_BACKUP_FORMAT_VERSION,
    type BazaarFlowBackup,
    type BazaarFlowBackupData,
} from '../types/backup'

import { rebuildFifoStateInCurrentTransaction } from './fifoService'

const MAX_BACKUP_FILE_SIZE_BYTES = 50 * 1024 * 1024

const BACKUP_DATA_KEYS: Array<
    keyof BazaarFlowBackupData
> = [
        'categories',
        'products',
        'inventoryLots',
        'sales',
        'saleItems',
        'inventoryAdjustments',
    ]

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
    )
}

function assertRowsHaveValidIds(
    rows: unknown[],
    label: string,
): void {
    const ids = new Set<string>()

    for (const row of rows) {
        if (!isRecord(row)) {
            throw new Error(
                `${label} verileri geçersiz kayıt içeriyor.`,
            )
        }

        if (
            typeof row.id !== 'string' ||
            row.id.trim().length === 0
        ) {
            throw new Error(
                `${label} içinde geçersiz kayıt kimliği bulundu.`,
            )
        }

        if (ids.has(row.id)) {
            throw new Error(
                `${label} içinde yinelenen kayıt kimliği bulundu: ${row.id}`,
            )
        }

        ids.add(row.id)
    }
}

function validateBackupReferences(
    backup: BazaarFlowBackup,
): void {
    const productIds = new Set(
        backup.data.products.map(
            (product) => product.id,
        ),
    )

    const inventoryLotIds = new Set(
        backup.data.inventoryLots.map(
            (lot) => lot.id,
        ),
    )

    const saleIds = new Set(
        backup.data.sales.map(
            (sale) => sale.id,
        ),
    )

    const adjustmentIds = new Set(
        backup.data.inventoryAdjustments.map(
            (adjustment) => adjustment.id,
        ),
    )

    for (const lot of backup.data.inventoryLots) {
        if (!productIds.has(lot.productId)) {
            throw new Error(
                `Stok partisi bulunmayan bir ürüne bağlı: ${lot.id}`,
            )
        }

        if (
            lot.sourceAdjustmentId &&
            !adjustmentIds.has(
                lot.sourceAdjustmentId,
            )
        ) {
            throw new Error(
                `Stok partisi bulunmayan bir düzeltmeye bağlı: ${lot.id}`,
            )
        }
    }

    for (const item of backup.data.saleItems) {
        if (!saleIds.has(item.saleId)) {
            throw new Error(
                `Satış kalemi bulunmayan bir satışa bağlı: ${item.id}`,
            )
        }

        if (!productIds.has(item.productId)) {
            throw new Error(
                `Satış kalemi bulunmayan bir ürüne bağlı: ${item.id}`,
            )
        }
    }

    for (
        const adjustment
        of backup.data.inventoryAdjustments
    ) {
        if (!productIds.has(adjustment.productId)) {
            throw new Error(
                `Stok düzeltmesi bulunmayan bir ürüne bağlı: ${adjustment.id}`,
            )
        }

        if (
            adjustment.linkedInventoryLotId &&
            !inventoryLotIds.has(
                adjustment.linkedInventoryLotId,
            )
        ) {
            throw new Error(
                `Stok düzeltmesi bulunmayan bir FIFO partisine bağlı: ${adjustment.id}`,
            )
        }
    }
}

function validateBackup(
    value: unknown,
): BazaarFlowBackup {
    if (!isRecord(value)) {
        throw new Error(
            'Seçilen dosya geçerli bir BazaarFlow yedeği değil.',
        )
    }

    if (value.app !== BAZAARFLOW_BACKUP_APP) {
        throw new Error(
            'Bu yedek BazaarFlow uygulamasına ait değil.',
        )
    }

    if (
        value.formatVersion !==
        BAZAARFLOW_BACKUP_FORMAT_VERSION
    ) {
        throw new Error(
            'Yedek dosyasının format sürümü desteklenmiyor.',
        )
    }

    if (
        typeof value.databaseVersion !== 'number' ||
        !Number.isFinite(value.databaseVersion) ||
        value.databaseVersion <= 0
    ) {
        throw new Error(
            'Yedek dosyasının veritabanı sürümü geçersiz.',
        )
    }

    if (value.databaseVersion > db.verno) {
        throw new Error(
            'Bu yedek daha yeni bir BazaarFlow veritabanı sürümüyle oluşturulmuş.',
        )
    }

    if (
        typeof value.exportedAt !== 'string' ||
        Number.isNaN(
            Date.parse(value.exportedAt),
        )
    ) {
        throw new Error(
            'Yedek dosyasının oluşturulma tarihi geçersiz.',
        )
    }

    if (!isRecord(value.data)) {
        throw new Error(
            'Yedek dosyasının veri bölümü geçersiz.',
        )
    }

    for (const key of BACKUP_DATA_KEYS) {
        const rows = value.data[key]

        if (!Array.isArray(rows)) {
            throw new Error(
                `Yedek dosyasında "${key}" bölümü bulunamadı.`,
            )
        }

        assertRowsHaveValidIds(
            rows,
            key,
        )
    }

    const backup = value as BazaarFlowBackup

    validateBackupReferences(backup)

    return backup
}

function createBackupFilename(
    exportedAt: string,
): string {
    const safeDate = exportedAt
        .replaceAll(':', '-')
        .replace(/\.\d{3}Z$/, 'Z')

    return `bazaarflow-yedek-${safeDate}.json`
}

async function createBackup(): Promise<BazaarFlowBackup> {
    const [
        categories,
        products,
        inventoryLots,
        sales,
        saleItems,
        inventoryAdjustments,
    ] = await Promise.all([
        db.categories.toArray(),
        db.products.toArray(),
        db.inventoryLots.toArray(),
        db.sales.toArray(),
        db.saleItems.toArray(),
        db.inventoryAdjustments.toArray(),
    ])

    return {
        app: BAZAARFLOW_BACKUP_APP,
        formatVersion:
            BAZAARFLOW_BACKUP_FORMAT_VERSION,
        databaseVersion: db.verno,
        exportedAt: new Date().toISOString(),
        data: {
            categories,
            products,
            inventoryLots,
            sales,
            saleItems,
            inventoryAdjustments,
        },
    }
}

async function downloadBackup(): Promise<string> {
    const backup = await createBackup()

    const filename = createBackupFilename(
        backup.exportedAt,
    )

    const json = JSON.stringify(
        backup,
        null,
        2,
    )

    const blob = new Blob(
        [json],
        {
            type: 'application/json;charset=utf-8',
        },
    )

    const url = URL.createObjectURL(blob)

    const anchor =
        document.createElement('a')

    anchor.href = url
    anchor.download = filename

    document.body.appendChild(anchor)

    anchor.click()
    anchor.remove()

    window.setTimeout(() => {
        URL.revokeObjectURL(url)
    }, 0)

    return filename
}

async function readBackupFile(
    file: File,
): Promise<BazaarFlowBackup> {
    if (
        file.size >
        MAX_BACKUP_FILE_SIZE_BYTES
    ) {
        throw new Error(
            'Yedek dosyası 50 MB sınırını aşıyor.',
        )
    }

    let parsed: unknown

    try {
        parsed = JSON.parse(
            await file.text(),
        )
    } catch {
        throw new Error(
            'Yedek dosyası geçerli JSON içermiyor.',
        )
    }

    return validateBackup(parsed)
}

async function restoreBackup(
    backupInput: BazaarFlowBackup,
): Promise<void> {
    const backup =
        validateBackup(backupInput)

    await db.transaction(
        'rw',
        [
            db.categories,
            db.products,
            db.inventoryLots,
            db.sales,
            db.saleItems,
            db.inventoryAllocations,
            db.inventoryAdjustments,
            db.inventoryAdjustmentAllocations,
        ],
        async () => {
            /*
             * Önce mevcut veriler temizlenir.
             *
             * İşlem tek Dexie transaction içinde
             * gerçekleştiği için herhangi bir adım
             * başarısız olursa eski veriler otomatik
             * olarak geri gelir.
             */
            await db.inventoryAdjustmentAllocations.clear()
            await db.inventoryAllocations.clear()
            await db.saleItems.clear()
            await db.sales.clear()
            await db.inventoryAdjustments.clear()
            await db.inventoryLots.clear()
            await db.products.clear()
            await db.categories.clear()

            if (backup.data.categories.length > 0) {
                await db.categories.bulkAdd(
                    backup.data.categories,
                )
            }

            if (backup.data.products.length > 0) {
                await db.products.bulkAdd(
                    backup.data.products,
                )
            }

            if (
                backup.data.inventoryLots.length > 0
            ) {
                await db.inventoryLots.bulkAdd(
                    backup.data.inventoryLots,
                )
            }

            if (backup.data.sales.length > 0) {
                await db.sales.bulkAdd(
                    backup.data.sales,
                )
            }

            if (backup.data.saleItems.length > 0) {
                await db.saleItems.bulkAdd(
                    backup.data.saleItems,
                )
            }

            if (
                backup.data.inventoryAdjustments
                    .length > 0
            ) {
                await db.inventoryAdjustments.bulkAdd(
                    backup.data.inventoryAdjustments,
                )
            }

            /*
             * quantityRemaining ve iki allocation
             * tablosu türetilmiş FIFO durumudur.
             *
             * Yedek geri yüklendikten sonra mevcut
             * satış ve düzeltme geçmişinden yeniden
             * hesaplanır. Böylece bozuk veya eski
             * türetilmiş veriler taşınmaz.
             */
            await rebuildFifoStateInCurrentTransaction()
        },
    )
}

export const backupService = {
    createBackup,
    downloadBackup,
    readBackupFile,
    restoreBackup,
}