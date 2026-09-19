import { productService } from './productService'
import {
    salesService,
    type SaleHistoryRecord,
} from './salesService'
import type { Product } from '../types/product'

export type CsvExportResult = {
    fileName: string
    saleCount: number
    rowCount: number
}

function formatCsvMoney(
    minor: number,
): string {
    return (minor / 100)
        .toFixed(2)
        .replace('.', ',')
}

function escapeCsvCell(
    value: string | number,
): string {
    const text = String(value)

    if (
        text.includes(';') ||
        text.includes('"') ||
        text.includes('\n') ||
        text.includes('\r')
    ) {
        return `"${text.replaceAll('"', '""')}"`
    }

    return text
}

function createCsvRow(
    values: Array<string | number>,
): string {
    return values
        .map(escapeCsvCell)
        .join(';')
}

function buildSalesCsv(
    history: SaleHistoryRecord[],
    products: Product[],
): {
    content: string
    saleCount: number
    rowCount: number
} {
    const productMap = new Map(
        products.map((product) => [
            product.id,
            product,
        ]),
    )

    const rows: Array<Array<string | number>> = [
        [
            'Tarih',
            'Satış ID',
            'Ürün',
            'SKU',
            'Adet',
            'Liste Birim Fiyatı',
            'Satış Birim Fiyatı',
            'Liste Toplamı',
            'Ciro',
            'İndirim',
            'FIFO Maliyeti',
            'Brüt Kâr',
            'İndirim Nedeni',
            'Satış Notu',
        ],
    ]

    let saleCount = 0
    let rowCount = 0

    for (const record of history) {
        if (
            record.sale.status !==
            'completed'
        ) {
            continue
        }

        saleCount += 1

        for (const item of record.items) {
            const product = productMap.get(
                item.productId,
            )

            rows.push([
                record.sale.saleDate,
                record.sale.id,
                product?.name ??
                    item.productName,
                product?.sku ?? '',
                item.quantity,
                formatCsvMoney(
                    item.listUnitPriceMinor,
                ),
                formatCsvMoney(
                    item.actualUnitPriceMinor,
                ),
                formatCsvMoney(
                    item.listUnitPriceMinor *
                        item.quantity,
                ),
                formatCsvMoney(
                    item.revenueMinor,
                ),
                formatCsvMoney(
                    item.discountMinor,
                ),
                formatCsvMoney(
                    item.costMinor,
                ),
                formatCsvMoney(
                    item.grossProfitMinor,
                ),
                item.discountReason ?? '',
                record.sale.note ?? '',
            ])

            rowCount += 1
        }
    }

    if (saleCount === 0) {
        throw new Error(
            'CSV oluşturmak için tamamlanmış satış bulunamadı.',
        )
    }

    return {
        content:
            '\uFEFF' +
            rows
                .map(createCsvRow)
                .join('\r\n'),
        saleCount,
        rowCount,
    }
}

function triggerDownload(
    content: string,
    fileName: string,
    type: string,
): void {
    const blob = new Blob(
        [content],
        { type },
    )

    const objectUrl =
        URL.createObjectURL(blob)

    const link =
        document.createElement('a')

    link.href = objectUrl
    link.download = fileName

    document.body.appendChild(link)
    link.click()
    link.remove()

    window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl)
    }, 0)
}

async function downloadSalesCsv(): Promise<CsvExportResult> {
    const [history, products] =
        await Promise.all([
            salesService.getHistory(),
            productService.getAll(),
        ])

    const result = buildSalesCsv(
        history,
        products,
    )

    const fileName =
        `bazaarflow-satislar-${new Date()
            .toISOString()
            .slice(0, 10)}.csv`

    triggerDownload(
        result.content,
        fileName,
        'text/csv;charset=utf-8;',
    )

    return {
        fileName,
        saleCount: result.saleCount,
        rowCount: result.rowCount,
    }
}

export const exportService = {
    downloadSalesCsv,
}
