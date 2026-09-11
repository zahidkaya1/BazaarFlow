import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
    CalendarDays,
    CircleDollarSign,
    Download,
    PackageCheck,
    Search,
    TrendingUp,
    Trophy,
    WalletCards,
    Warehouse,
} from 'lucide-react'
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    type MouseHandlerDataParam,
} from 'recharts'
import { inventoryService } from '../services/inventoryService'
import { productService } from '../services/productService'
import {
    salesService,
    type SaleHistoryRecord,
} from '../services/salesService'
import type { InventoryLot } from '../types/inventoryLot'
import type { Product } from '../types/product'
import { formatMoneyFromMinor } from '../utils/money'

type ReportPeriod =
    | 'today'
    | 'week'
    | 'month'
    | 'year'
    | 'custom'

type DailyChartMode =
    | 'bar'
    | 'line'

type ProductReportRow = {
    productId: string
    productName: string
    sku?: string
    quantity: number
    transactionCount: number
    revenueMinor: number
    costMinor: number
    grossProfitMinor: number
    discountMinor: number
}

type DailyReportRow = {
    saleDate: string
    quantity: number
    transactionCount: number
    revenueMinor: number
    costMinor: number
    grossProfitMinor: number
    discountMinor: number
}

type TrendChartPoint = {
    key: string
    label: string
    detailLabel: string
    quantity: number
    transactionCount: number
    revenueMinor: number
    costMinor: number
    grossProfitMinor: number
    discountMinor: number
}

type ProductChartPoint = ProductReportRow

type ChartTooltipPayloadEntry = {
    payload?: unknown
}

type ChartTooltipProps = {
    active?: boolean
    payload?: readonly ChartTooltipPayloadEntry[]
}

function formatDateValue(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

function formatDisplayDate(value: string): string {
    const [year, month, day] = value.split('-')

    return `${day}.${month}.${year}`
}

function formatShortDisplayDate(
    value: string,
): string {
    const [, month, day] = value.split('-')

    return `${day}.${month}`
}

function formatChartProductName(
    value: string,
): string {
    if (value.length <= 16) {
        return value
    }

    return `${value.slice(0, 14)}…`
}

function formatProfitMargin(
    revenueMinor: number,
    grossProfitMinor: number,
): string {
    if (revenueMinor <= 0) {
        return '%0,0'
    }

    const margin =
        (grossProfitMinor / revenueMinor) * 100

    return `%${margin.toLocaleString(
        'tr-TR',
        {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
        },
    )}`
}

function renderMetricGrid(
    values: Array<{
        label: string
        value: string
    }>,
) {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns:
                    'repeat(2, minmax(0, 1fr))',
                gap: 8,
                marginTop: 10,
            }}
        >
            {values.map((item) => (
                <div
                    key={item.label}
                    style={{
                        padding: '8px 10px',
                        border:
                            '1px solid var(--color-border)',
                        borderRadius: 8,
                        background:
                            'var(--color-surface)',
                    }}
                >
                    <span
                        style={{
                            display: 'block',
                            marginBottom: 3,
                            color:
                                'var(--color-text-muted)',
                            fontSize: 11,
                        }}
                    >
                        {item.label}
                    </span>

                    <strong
                        style={{
                            display: 'block',
                            color:
                                'var(--color-text)',
                            fontSize: 13,
                        }}
                    >
                        {item.value}
                    </strong>
                </div>
            ))}
        </div>
    )
}

function renderTooltipMetricGrid(
    values: Array<{
        label: string
        value: string
    }>,
) {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns:
                    'repeat(2, minmax(0, 1fr))',
                gap: 8,
                marginTop: 10,
            }}
        >
            {values.map((item) => (
                <div
                    key={item.label}
                    style={{
                        padding: '8px 10px',
                        border:
                            '1px solid #e2e8f0',
                        borderRadius: 8,
                        background:
                            '#f8fafc',
                    }}
                >
                    <span
                        style={{
                            display: 'block',
                            marginBottom: 3,
                            color:
                                '#64748b',
                            fontSize: 11,
                        }}
                    >
                        {item.label}
                    </span>

                    <strong
                        style={{
                            display: 'block',
                            color:
                                '#0f172a',
                            fontSize: 13,
                        }}
                    >
                        {item.value}
                    </strong>
                </div>
            ))}
        </div>
    )
}

function TrendChartTooltip({
    active,
    payload,
}: ChartTooltipProps) {
    const point =
        payload?.[0]?.payload as
        | TrendChartPoint
        | undefined

    if (!active || !point) {
        return null
    }

    return (
        <div
            style={{
                minWidth: 230,
                padding: 12,
                border:
                    '1px solid #cbd5e1',
                borderRadius: 12,
                background:
                    '#ffffff',
                boxShadow:
                    '0 16px 40px rgba(15, 23, 42, 0.22)',
                position: 'relative',
                zIndex: 1000,
                opacity: 1,
            }}
        >
            <strong
                style={{
                    display: 'block',
                    marginBottom: 2,
                    color:
                        '#0f172a',
                }}
            >
                {point.detailLabel}
            </strong>

            <small
                style={{
                    color:
                        '#64748b',
                }}
            >
                Detayı sabitlemek için grafiğe tıklayın.
            </small>

            {renderTooltipMetricGrid([
                {
                    label: 'İşlem',
                    value:
                        `${point.transactionCount}`,
                },
                {
                    label: 'Satılan',
                    value:
                        `${point.quantity} adet`,
                },
                {
                    label: 'Ciro',
                    value:
                        formatMoneyFromMinor(
                            point.revenueMinor,
                        ),
                },
                {
                    label: 'Maliyet',
                    value:
                        formatMoneyFromMinor(
                            point.costMinor,
                        ),
                },
                {
                    label: 'Brüt Kâr',
                    value:
                        formatMoneyFromMinor(
                            point.grossProfitMinor,
                        ),
                },
                {
                    label: 'Kâr Marjı',
                    value:
                        formatProfitMargin(
                            point.revenueMinor,
                            point.grossProfitMinor,
                        ),
                },
                {
                    label: 'İndirim',
                    value:
                        formatMoneyFromMinor(
                            point.discountMinor,
                        ),
                },
            ])}
        </div>
    )
}

function ProductChartTooltip({
    active,
    payload,
}: ChartTooltipProps) {
    const point =
        payload?.[0]?.payload as
        | ProductChartPoint
        | undefined

    if (!active || !point) {
        return null
    }

    return (
        <div
            style={{
                minWidth: 240,
                padding: 12,
                border:
                    '1px solid #cbd5e1',
                borderRadius: 12,
                background:
                    '#ffffff',
                boxShadow:
                    '0 16px 40px rgba(15, 23, 42, 0.22)',
                position: 'relative',
                zIndex: 1000,
                opacity: 1,
            }}
        >
            <strong
                style={{
                    display: 'block',
                    color:
                        '#0f172a',
                }}
            >
                {point.productName}
            </strong>

            <small
                style={{
                    display: 'block',
                    marginTop: 2,
                    color:
                        '#64748b',
                }}
            >
                {point.sku
                    ? `SKU: ${point.sku}`
                    : 'SKU yok'}
            </small>

            <small
                style={{
                    display: 'block',
                    marginTop: 4,
                    color:
                        '#64748b',
                }}
            >
                Detayı sabitlemek için ürüne tıklayın.
            </small>

            {renderTooltipMetricGrid([
                {
                    label: 'İşlem',
                    value:
                        `${point.transactionCount}`,
                },
                {
                    label: 'Satılan',
                    value:
                        `${point.quantity} adet`,
                },
                {
                    label: 'Ciro',
                    value:
                        formatMoneyFromMinor(
                            point.revenueMinor,
                        ),
                },
                {
                    label: 'Maliyet',
                    value:
                        formatMoneyFromMinor(
                            point.costMinor,
                        ),
                },
                {
                    label: 'Brüt Kâr',
                    value:
                        formatMoneyFromMinor(
                            point.grossProfitMinor,
                        ),
                },
                {
                    label: 'Kâr Marjı',
                    value:
                        formatProfitMargin(
                            point.revenueMinor,
                            point.grossProfitMinor,
                        ),
                },
                {
                    label: 'İndirim',
                    value:
                        formatMoneyFromMinor(
                            point.discountMinor,
                        ),
                },
            ])}
        </div>
    )
}

function renderChartLegend() {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '10px 18px',
                paddingTop: 8,
                color: 'var(--color-text-muted)',
                fontSize: 13,
            }}
        >
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                }}
            >
                <span
                    style={{
                        width: 11,
                        height: 11,
                        borderRadius: 3,
                        background:
                            'var(--color-secondary)',
                    }}
                />
                Ciro
            </span>

            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                }}
            >
                <span
                    style={{
                        width: 11,
                        height: 11,
                        borderRadius: 3,
                        background:
                            'var(--color-primary)',
                    }}
                />
                Brüt Kâr
            </span>
        </div>
    )
}

function getDateValuesInRange(
    start: string,
    end: string,
): string[] {
    const [startYear, startMonth, startDay] =
        start.split('-').map(Number)

    const [endYear, endMonth, endDay] =
        end.split('-').map(Number)

    const current = new Date(
        startYear,
        startMonth - 1,
        startDay,
    )

    const last = new Date(
        endYear,
        endMonth - 1,
        endDay,
    )

    const values: string[] = []

    while (current <= last) {
        values.push(formatDateValue(current))

        current.setDate(
            current.getDate() + 1,
        )
    }

    return values
}

function sumDailyRows(
    dailyRows: Map<string, DailyReportRow>,
    dateValues: string[],
): {
    quantity: number
    transactionCount: number
    revenueMinor: number
    costMinor: number
    grossProfitMinor: number
    discountMinor: number
} {
    return dateValues.reduce(
        (totals, dateValue) => {
            const row =
                dailyRows.get(dateValue)

            totals.quantity +=
                row?.quantity ?? 0

            totals.transactionCount +=
                row?.transactionCount ?? 0

            totals.revenueMinor +=
                row?.revenueMinor ?? 0

            totals.costMinor +=
                row?.costMinor ?? 0

            totals.grossProfitMinor +=
                row?.grossProfitMinor ?? 0

            totals.discountMinor +=
                row?.discountMinor ?? 0

            return totals
        },
        {
            quantity: 0,
            transactionCount: 0,
            revenueMinor: 0,
            costMinor: 0,
            grossProfitMinor: 0,
            discountMinor: 0,
        },
    )
}

function getMonthShortLabel(
    month: number,
): string {
    const labels = [
        'Oca',
        'Şub',
        'Mar',
        'Nis',
        'May',
        'Haz',
        'Tem',
        'Ağu',
        'Eyl',
        'Eki',
        'Kas',
        'Ara',
    ]

    return labels[month - 1] ?? ''
}

function createDailyTrendData(
    dailyRows: Map<string, DailyReportRow>,
    start: string,
    end: string,
): TrendChartPoint[] {
    return getDateValuesInRange(
        start,
        end,
    ).map((saleDate) => {
        const day =
            dailyRows.get(saleDate)

        return {
            key: saleDate,
            label:
                formatShortDisplayDate(
                    saleDate,
                ),
            detailLabel:
                formatDisplayDate(
                    saleDate,
                ),
            quantity:
                day?.quantity ?? 0,
            transactionCount:
                day?.transactionCount ?? 0,
            revenueMinor:
                day?.revenueMinor ?? 0,
            costMinor:
                day?.costMinor ?? 0,
            grossProfitMinor:
                day?.grossProfitMinor ?? 0,
            discountMinor:
                day?.discountMinor ?? 0,
        }
    })
}

function createMonthlyWeekTrendData(
    dailyRows: Map<string, DailyReportRow>,
    start: string,
    end: string,
): TrendChartPoint[] {
    const dateValues =
        getDateValuesInRange(
            start,
            end,
        )

    const [, monthValue] =
        start.split('-')

    const month =
        Number(monthValue)

    const monthLabel =
        getMonthShortLabel(month)

    const points: TrendChartPoint[] = []

    for (
        let index = 0;
        index < dateValues.length;
        index += 7
    ) {
        const bucket =
            dateValues.slice(
                index,
                index + 7,
            )

        const firstDate =
            bucket[0]

        const lastDate =
            bucket[bucket.length - 1]

        if (!firstDate || !lastDate) {
            continue
        }

        const firstDay =
            Number(
                firstDate.slice(8, 10),
            )

        const lastDay =
            Number(
                lastDate.slice(8, 10),
            )

        const totals =
            sumDailyRows(
                dailyRows,
                bucket,
            )

        points.push({
            key:
                `${firstDate}:${lastDate}`,
            label:
                `${firstDay}–${lastDay} ${monthLabel}`,
            detailLabel:
                `${firstDay}–${lastDay} ${monthLabel} ${firstDate.slice(0, 4)}`,
            quantity:
                totals.quantity,
            transactionCount:
                totals.transactionCount,
            revenueMinor:
                totals.revenueMinor,
            costMinor:
                totals.costMinor,
            grossProfitMinor:
                totals.grossProfitMinor,
            discountMinor:
                totals.discountMinor,
        })
    }

    return points
}

function createYearlyMonthTrendData(
    dailyRows: Map<string, DailyReportRow>,
    start: string,
): TrendChartPoint[] {
    const [yearValue] =
        start.split('-')

    const year =
        Number(yearValue)

    return Array.from(
        { length: 12 },
        (_, monthIndex) => {
            const month =
                monthIndex + 1

            const firstDay =
                new Date(
                    year,
                    monthIndex,
                    1,
                )

            const lastDay =
                new Date(
                    year,
                    month,
                    0,
                )

            const totals =
                sumDailyRows(
                    dailyRows,
                    getDateValuesInRange(
                        formatDateValue(
                            firstDay,
                        ),
                        formatDateValue(
                            lastDay,
                        ),
                    ),
                )

            const monthKey =
                `${year}-${String(month).padStart(
                    2,
                    '0',
                )}`

            return {
                key: monthKey,
                label:
                    getMonthShortLabel(
                        month,
                    ),
                detailLabel:
                    `${getMonthShortLabel(
                        month,
                    )} ${year}`,
                quantity:
                    totals.quantity,
                transactionCount:
                    totals.transactionCount,
                revenueMinor:
                    totals.revenueMinor,
                costMinor:
                    totals.costMinor,
                grossProfitMinor:
                    totals.grossProfitMinor,
                discountMinor:
                    totals.discountMinor,
            }
        },
    )
}

function getTodayDateValue(): string {
    return formatDateValue(new Date())
}

function getWeekRange(): {
    start: string
    end: string
} {
    const today = new Date()
    const day = today.getDay()

    const mondayOffset =
        day === 0 ? -6 : 1 - day

    const monday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + mondayOffset,
    )

    const sunday = new Date(
        monday.getFullYear(),
        monday.getMonth(),
        monday.getDate() + 6,
    )

    return {
        start: formatDateValue(monday),
        end: formatDateValue(sunday),
    }
}

function getMonthRange(): {
    start: string
    end: string
} {
    const today = new Date()

    const firstDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
    )

    const lastDay = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
    )

    return {
        start: formatDateValue(firstDay),
        end: formatDateValue(lastDay),
    }
}

function getYearRange(): {
    start: string
    end: string
} {
    const today = new Date()

    return {
        start: `${today.getFullYear()}-01-01`,
        end: `${today.getFullYear()}-12-31`,
    }
}

function getPeriodLabel(period: ReportPeriod): string {
    switch (period) {
        case 'today':
            return 'Bugün'
        case 'week':
            return 'Bu Hafta'
        case 'month':
            return 'Bu Ay'
        case 'year':
            return 'Bu Yıl'
        case 'custom':
            return 'Özel Tarih'
    }
}

function normalizeSearch(value: string): string {
    return value
        .trim()
        .toLocaleLowerCase('tr-TR')
}

function filterRecordItems(
    record: SaleHistoryRecord,
    query: string,
    productMap: Map<string, Product>,
): SaleHistoryRecord | null {
    if (!query) {
        return record
    }

    const matchingItems = record.items.filter(
        (item) => {
            const product = productMap.get(
                item.productId,
            )

            const searchableText =
                normalizeSearch(
                    [
                        item.productName,
                        product?.name ?? '',
                        product?.sku ?? '',
                    ].join(' '),
                )

            return searchableText.includes(query)
        },
    )

    if (matchingItems.length === 0) {
        return null
    }

    const totalQuantity = matchingItems.reduce(
        (total, item) =>
            total + item.quantity,
        0,
    )

    const listTotalMinor = matchingItems.reduce(
        (total, item) =>
            total +
            item.quantity *
            item.listUnitPriceMinor,
        0,
    )

    const revenueMinor = matchingItems.reduce(
        (total, item) =>
            total +
            item.revenueMinor,
        0,
    )

    const discountMinor = matchingItems.reduce(
        (total, item) =>
            total +
            item.discountMinor,
        0,
    )

    const costMinor = matchingItems.reduce(
        (total, item) =>
            total + item.costMinor,
        0,
    )

    return {
        ...record,
        items: matchingItems,
        totalQuantity,
        listTotalMinor,
        revenueMinor,
        discountMinor,
        costMinor,
        grossProfitMinor:
            revenueMinor - costMinor,
    }
}

function formatCsvMoney(minor: number): string {
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

function ReportsPage() {
    const data = useLiveQuery(
        async () => {
            const [products, lots, history] =
                await Promise.all([
                    productService.getAll(),
                    inventoryService.getAll(),
                    salesService.getHistory(),
                ])

            return {
                products,
                lots,
                history,
            }
        },
        [],
        {
            products: [] as Product[],
            lots: [] as InventoryLot[],
            history: [] as SaleHistoryRecord[],
        },
    )

    const [period, setPeriod] =
        useState<ReportPeriod>('month')

    const monthRange = useMemo(
        () => getMonthRange(),
        [],
    )

    const [customStartDate, setCustomStartDate] =
        useState(monthRange.start)

    const [customEndDate, setCustomEndDate] =
        useState(monthRange.end)

    const [productSearch, setProductSearch] =
        useState('')

    const [dailyChartMode, setDailyChartMode] =
        useState<DailyChartMode>('bar')

    const [
        selectedTrendKey,
        setSelectedTrendKey,
    ] = useState<string | null>(null)

    const [
        selectedProductId,
        setSelectedProductId,
    ] = useState<string | null>(null)

    const effectiveDailyChartMode: DailyChartMode =
        period === 'today'
            ? 'bar'
            : dailyChartMode

    const productMap = useMemo(
        () =>
            new Map(
                data.products.map((product) => [
                    product.id,
                    product,
                ]),
            ),
        [data.products],
    )

    const reportRange = useMemo(() => {
        switch (period) {
            case 'today': {
                const today = getTodayDateValue()

                return {
                    start: today,
                    end: today,
                }
            }

            case 'week':
                return getWeekRange()

            case 'month':
                return getMonthRange()

            case 'year':
                return getYearRange()

            case 'custom':
                return {
                    start: customStartDate,
                    end: customEndDate,
                }
        }
    }, [
        period,
        customStartDate,
        customEndDate,
    ])

    const filteredHistory = useMemo(() => {
        const query = normalizeSearch(
            productSearch,
        )

        return data.history
            .filter(
                (record) =>
                    record.sale.saleDate >=
                    reportRange.start &&
                    record.sale.saleDate <=
                    reportRange.end,
            )
            .map((record) =>
                filterRecordItems(
                    record,
                    query,
                    productMap,
                ),
            )
            .filter(
                (
                    record,
                ): record is SaleHistoryRecord =>
                    record !== null,
            )
    }, [
        data.history,
        reportRange,
        productSearch,
        productMap,
    ])

    const completedRecords =
        filteredHistory.filter(
            (record) =>
                record.sale.status === 'completed',
        )

    const cancelledRecords =
        filteredHistory.filter(
            (record) =>
                record.sale.status === 'cancelled',
        )

    const totalQuantity =
        completedRecords.reduce(
            (total, record) =>
                total + record.totalQuantity,
            0,
        )

    const totalRevenueMinor =
        completedRecords.reduce(
            (total, record) =>
                total + record.revenueMinor,
            0,
        )

    const totalCostMinor =
        completedRecords.reduce(
            (total, record) =>
                total + record.costMinor,
            0,
        )

    const totalGrossProfitMinor =
        completedRecords.reduce(
            (total, record) =>
                total + record.grossProfitMinor,
            0,
        )

    const totalDiscountMinor =
        completedRecords.reduce(
            (total, record) =>
                total + record.discountMinor,
            0,
        )

    const averageUnitPriceMinor =
        totalQuantity > 0
            ? Math.round(
                totalRevenueMinor /
                totalQuantity,
            )
            : 0

    const grossMarginPercent =
        totalRevenueMinor > 0
            ? (
                (totalGrossProfitMinor /
                    totalRevenueMinor) *
                100
            ).toFixed(1)
            : '0,0'

    const currentInventoryValueMinor =
        data.lots.reduce(
            (total, lot) =>
                total +
                lot.quantityRemaining *
                lot.unitCostMinor,
            0,
        )

    const productRows = new Map<
        string,
        ProductReportRow
    >()

    for (const record of completedRecords) {
        for (const item of record.items) {
            const product =
                productMap.get(item.productId)

            const current =
                productRows.get(item.productId) ?? {
                    productId: item.productId,

                    productName:
                        product?.name ??
                        item.productName,

                    sku: product?.sku,

                    quantity: 0,
                    transactionCount: 0,

                    revenueMinor: 0,
                    costMinor: 0,
                    grossProfitMinor: 0,
                    discountMinor: 0,
                }

            current.quantity += item.quantity
            current.transactionCount += 1

            const itemRevenue =
                item.revenueMinor

            const itemDiscount =
                item.discountMinor

            current.revenueMinor += itemRevenue
            current.costMinor += item.costMinor

            current.grossProfitMinor +=
                itemRevenue - item.costMinor

            current.discountMinor +=
                itemDiscount

            productRows.set(
                item.productId,
                current,
            )
        }
    }

    const productPerformance =
        Array.from(productRows.values()).sort(
            (first, second) =>
                second.grossProfitMinor -
                first.grossProfitMinor,
        )

    const dailyRows = new Map<
        string,
        DailyReportRow
    >()

    for (const record of completedRecords) {
        const current =
            dailyRows.get(
                record.sale.saleDate,
            ) ?? {
                saleDate:
                    record.sale.saleDate,

                quantity: 0,
                transactionCount: 0,

                revenueMinor: 0,
                costMinor: 0,
                grossProfitMinor: 0,
                discountMinor: 0,
            }

        current.quantity +=
            record.totalQuantity

        current.transactionCount += 1

        current.revenueMinor +=
            record.revenueMinor

        current.costMinor +=
            record.costMinor

        current.grossProfitMinor +=
            record.grossProfitMinor

        current.discountMinor +=
            record.discountMinor

        dailyRows.set(
            record.sale.saleDate,
            current,
        )
    }

    const dailyPerformance =
        Array.from(dailyRows.values()).sort(
            (first, second) =>
                second.saleDate.localeCompare(
                    first.saleDate,
                ),
        )

    const dailyChartData: TrendChartPoint[] =
        period === 'month'
            ? effectiveDailyChartMode === 'bar'
                ? createMonthlyWeekTrendData(
                    dailyRows,
                    reportRange.start,
                    reportRange.end,
                )
                : createDailyTrendData(
                    dailyRows,
                    reportRange.start,
                    reportRange.end,
                )
            : period === 'year'
                ? createYearlyMonthTrendData(
                    dailyRows,
                    reportRange.start,
                )
                : createDailyTrendData(
                    dailyRows,
                    reportRange.start,
                    reportRange.end,
                )

    const dailyChartDescription =
        period === 'month'
            ? effectiveDailyChartMode === 'bar'
                ? 'Seçilen ayın haftalık ciro ve brüt kâr karşılaştırması.'
                : 'Seçilen ayın günlük ciro ve brüt kâr eğilimi.'
            : period === 'year'
                ? 'Seçilen yılın aylık ciro ve brüt kâr eğilimi.'
                : period === 'week'
                    ? 'Haftanın 7 günündeki ciro ve brüt kâr değişimi.'
                    : 'Seçilen dönemde ciro ve brüt kâr değişimi.'

    const dailyChartMaxBarSize =
        period === 'today'
            ? 90
            : period === 'week'
                ? 38
                : period === 'month'
                    ? 52
                    : period === 'year'
                        ? 28
                        : 38

    const dailyChartCategoryGap =
        period === 'week'
            ? '14%'
            : period === 'month'
                ? '18%'
                : period === 'year'
                    ? '22%'
                    : '28%'

    const dailyChartXAxisInterval =
        period === 'month' &&
            effectiveDailyChartMode === 'line'
            ? 4
            : 0

    const productChartData: ProductChartPoint[] =
        [...productPerformance]
            .sort(
                (first, second) =>
                    second.revenueMinor -
                    first.revenueMinor,
            )
            .slice(0, 6)

    const selectedTrendDetail =
        dailyChartData.find(
            (item) =>
                item.key === selectedTrendKey,
        ) ?? null

    const selectedProductDetail =
        productChartData.find(
            (item) =>
                item.productId ===
                selectedProductId,
        ) ?? null

    const bestSeller =
        [...productPerformance].sort(
            (first, second) =>
                second.quantity -
                first.quantity,
        )[0]

    const highestRevenueProduct =
        [...productPerformance].sort(
            (first, second) =>
                second.revenueMinor -
                first.revenueMinor,
        )[0]

    const mostProfitableProduct =
        [...productPerformance].sort(
            (first, second) =>
                second.grossProfitMinor -
                first.grossProfitMinor,
        )[0]

    function handleTrendChartClick(
        eventData: MouseHandlerDataParam,
    ) {
        const index =
            Number(
                eventData.activeTooltipIndex,
            )

        if (
            !Number.isInteger(index) ||
            index < 0
        ) {
            return
        }

        const point =
            dailyChartData[index]

        if (!point) {
            return
        }

        setSelectedTrendKey(
            (current) =>
                current === point.key
                    ? null
                    : point.key,
        )
    }

    function handleProductChartClick(
        eventData: MouseHandlerDataParam,
    ) {
        const index =
            Number(
                eventData.activeTooltipIndex,
            )

        if (
            !Number.isInteger(index) ||
            index < 0
        ) {
            return
        }

        const point =
            productChartData[index]

        if (!point) {
            return
        }

        setSelectedProductId(
            (current) =>
                current === point.productId
                    ? null
                    : point.productId,
        )
    }

    const canExportCsv =
        completedRecords.length > 0

    function handleExportCsv() {
        if (!canExportCsv) {
            return
        }

        const rows: Array<
            Array<string | number>
        > = [
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
                    'Sepet İndirimi',
                    'FIFO Maliyeti',
                    'Brüt Kâr',
                    'Brüt Kâr Marjı (%)',
                    'İndirim Nedeni',
                    'Satış Notu',
                ],
            ]

        for (const record of completedRecords) {
            for (const item of record.items) {
                const product =
                    productMap.get(item.productId)

                const listTotalMinor =
                    item.quantity *
                    item.listUnitPriceMinor

                const revenueMinor =
                    item.revenueMinor

                const discountMinor =
                    item.discountMinor

                const grossProfitMinor =
                    item.grossProfitMinor

                const grossMarginPercent =
                    revenueMinor > 0
                        ? (
                            (grossProfitMinor /
                                revenueMinor) *
                            100
                        )
                            .toFixed(1)
                            .replace('.', ',')
                        : '0,0'

                rows.push([
                    formatDisplayDate(
                        record.sale.saleDate,
                    ),

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
                        listTotalMinor,
                    ),

                    formatCsvMoney(
                        revenueMinor,
                    ),

                    formatCsvMoney(
                        discountMinor,
                    ),

                    formatCsvMoney(
                        item.basketDiscountMinor ?? 0,
                    ),

                    formatCsvMoney(
                        item.costMinor,
                    ),

                    formatCsvMoney(
                        grossProfitMinor,
                    ),

                    grossMarginPercent,

                    item.discountReason ?? '',

                    record.sale.note ?? '',
                ])
            }
        }

        const csvContent =
            '\uFEFF' +
            rows
                .map(createCsvRow)
                .join('\r\n')

        const blob = new Blob(
            [csvContent],
            {
                type: 'text/csv;charset=utf-8;',
            },
        )

        const objectUrl =
            URL.createObjectURL(blob)

        const link =
            document.createElement('a')

        link.href = objectUrl

        link.download =
            `bazaarflow-satis-raporu_${reportRange.start}_${reportRange.end}.csv`

        document.body.appendChild(link)

        link.click()
        link.remove()

        URL.revokeObjectURL(objectUrl)
    }

    return (
        <div className="dashboard">
            <header className="page-header">
                <span className="page-eyebrow">
                    BazaarFlow
                </span>

                <h1>Raporlar</h1>

                <p>
                    Satış, kârlılık ve ürün
                    performansınızı dönem bazında
                    analiz edin.
                </p>
            </header>

            <section className="reports-toolbar">
                <div className="reports-period-selector">
                    {(
                        [
                            'today',
                            'week',
                            'month',
                            'year',
                            'custom',
                        ] as ReportPeriod[]
                    ).map((item) => (
                        <button
                            key={item}
                            type="button"
                            className={`reports-period-button ${period === item
                                ? 'reports-period-button-active'
                                : ''
                                }`}
                            onClick={() =>
                                setPeriod(item)
                            }
                        >
                            {getPeriodLabel(item)}
                        </button>
                    ))}
                </div>

                <div className="reports-toolbar-actions">
                    <label className="reports-search-field">
                        <Search size={16} />

                        <input
                            type="search"
                            value={productSearch}
                            onChange={(event) =>
                                setProductSearch(
                                    event.target.value,
                                )
                            }
                            placeholder="Ürün veya SKU ara..."
                        />
                    </label>

                    <button
                        type="button"
                        className="reports-export-button"
                        disabled={!canExportCsv}
                        onClick={handleExportCsv}
                    >
                        <Download size={16} />
                        CSV İndir
                    </button>
                </div>
            </section>

            {period === 'custom' && (
                <section className="reports-custom-range">
                    <label className="history-filter-field">
                        <span>Başlangıç tarihi</span>

                        <div className="history-filter-control">
                            <CalendarDays size={16} />

                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(event) =>
                                    setCustomStartDate(
                                        event.target.value,
                                    )
                                }
                            />
                        </div>
                    </label>

                    <label className="history-filter-field">
                        <span>Bitiş tarihi</span>

                        <div className="history-filter-control">
                            <CalendarDays size={16} />

                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(event) =>
                                    setCustomEndDate(
                                        event.target.value,
                                    )
                                }
                            />
                        </div>
                    </label>
                </section>
            )}

            <div className="reports-range-info">
                {formatDisplayDate(
                    reportRange.start,
                )}{' '}
                —{' '}
                {formatDisplayDate(
                    reportRange.end,
                )}
            </div>

            <section className="reports-summary-grid">
                <article className="summary-card">
                    <span className="summary-card-title">
                        Ciro
                    </span>

                    <strong className="summary-card-value">
                        {formatMoneyFromMinor(
                            totalRevenueMinor,
                        )}
                    </strong>

                    <span className="summary-card-description">
                        Tamamlanan satışlardan
                    </span>
                </article>

                <article className="summary-card">
                    <span className="summary-card-title">
                        FIFO Maliyeti
                    </span>

                    <strong className="summary-card-value">
                        {formatMoneyFromMinor(
                            totalCostMinor,
                        )}
                    </strong>

                    <span className="summary-card-description">
                        Satılan ürünlerin maliyeti
                    </span>
                </article>

                <article className="summary-card">
                    <span className="summary-card-title">
                        Brüt Kâr
                    </span>

                    <strong className="summary-card-value">
                        {formatMoneyFromMinor(
                            totalGrossProfitMinor,
                        )}
                    </strong>

                    <span className="summary-card-description">
                        Marj %{grossMarginPercent}
                    </span>
                </article>

                <article className="summary-card">
                    <span className="summary-card-title">
                        Satılan Ürün
                    </span>

                    <strong className="summary-card-value">
                        {totalQuantity}
                    </strong>

                    <span className="summary-card-description">
                        Toplam adet
                    </span>
                </article>

                <article className="summary-card">
                    <span className="summary-card-title">
                        Satış İşlemi
                    </span>

                    <strong className="summary-card-value">
                        {completedRecords.length}
                    </strong>

                    <span className="summary-card-description">
                        Tamamlanan işlem
                    </span>
                </article>

                <article className="summary-card">
                    <span className="summary-card-title">
                        Toplam İndirim
                    </span>

                    <strong className="summary-card-value">
                        {formatMoneyFromMinor(
                            totalDiscountMinor,
                        )}
                    </strong>

                    <span className="summary-card-description">
                        Dönemde verilen indirim
                    </span>
                </article>

                <article className="summary-card">
                    <span className="summary-card-title">
                        Ortalama Birim Fiyat
                    </span>

                    <strong className="summary-card-value">
                        {formatMoneyFromMinor(
                            averageUnitPriceMinor,
                        )}
                    </strong>

                    <span className="summary-card-description">
                        Ciro / satılan adet
                    </span>
                </article>

                <article className="summary-card">
                    <span className="summary-card-title">
                        İptal Edilen
                    </span>

                    <strong className="summary-card-value">
                        {cancelledRecords.length}
                    </strong>

                    <span className="summary-card-description">
                        Toplamlara dahil değil
                    </span>
                </article>
            </section>

            <section className="reports-leader-grid">
                <article className="reports-leader-card">
                    <PackageCheck size={20} />

                    <span>En Çok Satan</span>

                    <strong>
                        {bestSeller
                            ? bestSeller.productName
                            : '—'}
                    </strong>

                    <small>
                        {bestSeller
                            ? `${bestSeller.quantity} adet`
                            : 'Henüz veri yok'}
                    </small>
                </article>

                <article className="reports-leader-card">
                    <WalletCards size={20} />

                    <span>En Çok Ciro</span>

                    <strong>
                        {highestRevenueProduct
                            ? highestRevenueProduct.productName
                            : '—'}
                    </strong>

                    <small>
                        {highestRevenueProduct
                            ? formatMoneyFromMinor(
                                highestRevenueProduct.revenueMinor,
                            )
                            : 'Henüz veri yok'}
                    </small>
                </article>

                <article className="reports-leader-card">
                    <Trophy size={20} />

                    <span>En Kârlı Ürün</span>

                    <strong>
                        {mostProfitableProduct
                            ? mostProfitableProduct.productName
                            : '—'}
                    </strong>

                    <small>
                        {mostProfitableProduct
                            ? formatMoneyFromMinor(
                                mostProfitableProduct.grossProfitMinor,
                            )
                            : 'Henüz veri yok'}
                    </small>
                </article>

                <article className="reports-leader-card">
                    <Warehouse size={20} />

                    <span>Mevcut Stok Değeri</span>

                    <strong>
                        {formatMoneyFromMinor(
                            currentInventoryValueMinor,
                        )}
                    </strong>

                    <small>
                        Bugünkü elde kalan stok
                    </small>
                </article>
            </section>

            <section className="reports-chart-grid">
                <article className="dashboard-panel reports-chart-panel">
                    <div className="panel-header">
                        <div>
                            <h2>
                                Ciro & Brüt Kâr Eğilimi
                            </h2>

                            <p>
                                {dailyChartDescription}
                            </p>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                            }}
                        >
                            {period !== 'today' && (
                                <div
                                    role="group"
                                    aria-label="Grafik görünümü"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: 3,
                                        border:
                                            '1px solid var(--color-border)',
                                        borderRadius: 10,
                                        background:
                                            'var(--color-surface-subtle, transparent)',
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setDailyChartMode(
                                                'bar',
                                            )
                                        }
                                        aria-pressed={
                                            effectiveDailyChartMode ===
                                            'bar'
                                        }
                                        style={{
                                            border: 'none',
                                            borderRadius: 7,
                                            padding:
                                                '6px 10px',
                                            cursor: 'pointer',
                                            font: 'inherit',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color:
                                                effectiveDailyChartMode ===
                                                    'bar'
                                                    ? 'var(--color-text)'
                                                    : 'var(--color-text-muted)',
                                            background:
                                                effectiveDailyChartMode ===
                                                    'bar'
                                                    ? 'var(--color-surface)'
                                                    : 'transparent',
                                            boxShadow:
                                                effectiveDailyChartMode ===
                                                    'bar'
                                                    ? '0 1px 3px rgba(15, 23, 42, 0.10)'
                                                    : 'none',
                                        }}
                                    >
                                        Sütun
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setDailyChartMode(
                                                'line',
                                            )
                                        }
                                        aria-pressed={
                                            effectiveDailyChartMode ===
                                            'line'
                                        }
                                        style={{
                                            border: 'none',
                                            borderRadius: 7,
                                            padding:
                                                '6px 10px',
                                            cursor: 'pointer',
                                            font: 'inherit',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color:
                                                effectiveDailyChartMode ===
                                                    'line'
                                                    ? 'var(--color-text)'
                                                    : 'var(--color-text-muted)',
                                            background:
                                                effectiveDailyChartMode ===
                                                    'line'
                                                    ? 'var(--color-surface)'
                                                    : 'transparent',
                                            boxShadow:
                                                effectiveDailyChartMode ===
                                                    'line'
                                                    ? '0 1px 3px rgba(15, 23, 42, 0.10)'
                                                    : 'none',
                                        }}
                                    >
                                        Çizgi
                                    </button>
                                </div>
                            )}

                            <TrendingUp size={19} />
                        </div>
                    </div>

                    {dailyPerformance.length === 0 ? (
                        <div className="empty-state empty-state-compact">
                            <TrendingUp
                                size={30}
                                strokeWidth={1.5}
                            />

                            <div>
                                <strong>
                                    Grafik verisi bulunamadı
                                </strong>

                                <p>
                                    Seçilen dönemde tamamlanan
                                    satış bulunmuyor.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="reports-chart-container">
                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                            >
                                {effectiveDailyChartMode === 'bar' ? (
                                    <BarChart
                                        data={dailyChartData}
                                        onClick={
                                            handleTrendChartClick
                                        }
                                        margin={{
                                            top: 8,
                                            right: 12,
                                            left: 4,
                                            bottom: 8,
                                        }}
                                        barCategoryGap={
                                            dailyChartCategoryGap
                                        }
                                        barGap={5}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            vertical={false}
                                        />

                                        <XAxis
                                            dataKey="label"
                                            interval={
                                                dailyChartXAxisInterval
                                            }
                                            minTickGap={8}
                                            tick={{
                                                fontSize: 10,
                                            }}
                                            tickLine={false}
                                            axisLine={false}
                                        />

                                        <YAxis
                                            tickFormatter={(value) =>
                                                formatMoneyFromMinor(
                                                    Number(value),
                                                )
                                            }
                                            tick={{
                                                fontSize: 10,
                                            }}
                                            tickLine={false}
                                            axisLine={false}
                                            width={78}
                                        />

                                        <Tooltip
                                            cursor={{
                                                fill:
                                                    'rgba(15, 23, 42, 0.035)',
                                            }}
                                            wrapperStyle={{
                                                zIndex: 1000,
                                                pointerEvents:
                                                    'none',
                                                outline:
                                                    'none',
                                            }}
                                            content={
                                                <TrendChartTooltip />
                                            }
                                        />

                                        <Legend
                                            content={() =>
                                                renderChartLegend()
                                            }
                                        />

                                        <Bar
                                            dataKey="revenueMinor"
                                            cursor="pointer"
                                            name="Ciro"
                                            fill="var(--color-secondary)"
                                            radius={[
                                                6,
                                                6,
                                                0,
                                                0,
                                            ]}
                                            maxBarSize={
                                                dailyChartMaxBarSize
                                            }
                                        />

                                        <Bar
                                            dataKey="grossProfitMinor"
                                            cursor="pointer"
                                            name="Brüt Kâr"
                                            fill="var(--color-primary)"
                                            radius={[
                                                6,
                                                6,
                                                0,
                                                0,
                                            ]}
                                            maxBarSize={
                                                dailyChartMaxBarSize
                                            }
                                        />
                                    </BarChart>
                                ) : (
                                    <LineChart
                                        data={dailyChartData}
                                        onClick={
                                            handleTrendChartClick
                                        }
                                        margin={{
                                            top: 8,
                                            right: 12,
                                            left: 4,
                                            bottom: 4,
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            vertical={false}
                                        />

                                        <XAxis
                                            dataKey="label"
                                            interval={
                                                dailyChartXAxisInterval
                                            }
                                            minTickGap={8}
                                            tick={{
                                                fontSize: 10,
                                            }}
                                            tickLine={false}
                                            axisLine={false}
                                        />

                                        <YAxis
                                            tickFormatter={(value) =>
                                                formatMoneyFromMinor(
                                                    Number(value),
                                                )
                                            }
                                            tick={{
                                                fontSize: 10,
                                            }}
                                            tickLine={false}
                                            axisLine={false}
                                            width={78}
                                        />

                                        <Tooltip
                                            cursor={{
                                                stroke:
                                                    'rgba(15, 23, 42, 0.20)',
                                                strokeDasharray:
                                                    '4 4',
                                            }}
                                            wrapperStyle={{
                                                zIndex: 1000,
                                                pointerEvents:
                                                    'none',
                                                outline:
                                                    'none',
                                            }}
                                            content={
                                                <TrendChartTooltip />
                                            }
                                        />

                                        <Legend
                                            content={() =>
                                                renderChartLegend()
                                            }
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="revenueMinor"
                                            cursor="pointer"
                                            name="Ciro"
                                            stroke="var(--color-secondary)"
                                            strokeWidth={2}
                                            dot={{
                                                r: 3,
                                            }}
                                            activeDot={{
                                                r: 5,
                                            }}
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="grossProfitMinor"
                                            cursor="pointer"
                                            name="Brüt Kâr"
                                            stroke="var(--color-primary)"
                                            strokeWidth={2}
                                            dot={{
                                                r: 3,
                                            }}
                                            activeDot={{
                                                r: 5,
                                            }}
                                        />
                                    </LineChart>
                                )}
                            </ResponsiveContainer>
                        </div>
                    )}

                    {selectedTrendDetail && (
                        <div
                            style={{
                                marginTop: 14,
                                padding: 14,
                                border:
                                    '1px solid var(--color-border)',
                                borderRadius: 12,
                                background:
                                    'var(--color-surface)',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems:
                                        'flex-start',
                                    justifyContent:
                                        'space-between',
                                    gap: 12,
                                }}
                            >
                                <div>
                                    <strong
                                        style={{
                                            display:
                                                'block',
                                            color:
                                                'var(--color-text)',
                                        }}
                                    >
                                        {selectedTrendDetail.detailLabel}
                                    </strong>

                                    <small
                                        style={{
                                            color:
                                                'var(--color-text-muted)',
                                        }}
                                    >
                                        Seçilen dönem detayı
                                    </small>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedTrendKey(
                                            null,
                                        )
                                    }
                                    style={{
                                        border:
                                            '1px solid var(--color-border)',
                                        borderRadius: 8,
                                        padding:
                                            '5px 9px',
                                        cursor:
                                            'pointer',
                                        background:
                                            'transparent',
                                        color:
                                            'var(--color-text-muted)',
                                        font:
                                            'inherit',
                                        fontSize: 12,
                                    }}
                                >
                                    Kapat
                                </button>
                            </div>

                            {renderMetricGrid([
                                {
                                    label:
                                        'İşlem',
                                    value:
                                        `${selectedTrendDetail.transactionCount}`,
                                },
                                {
                                    label:
                                        'Satılan',
                                    value:
                                        `${selectedTrendDetail.quantity} adet`,
                                },
                                {
                                    label:
                                        'Ciro',
                                    value:
                                        formatMoneyFromMinor(
                                            selectedTrendDetail.revenueMinor,
                                        ),
                                },
                                {
                                    label:
                                        'Maliyet',
                                    value:
                                        formatMoneyFromMinor(
                                            selectedTrendDetail.costMinor,
                                        ),
                                },
                                {
                                    label:
                                        'Brüt Kâr',
                                    value:
                                        formatMoneyFromMinor(
                                            selectedTrendDetail.grossProfitMinor,
                                        ),
                                },
                                {
                                    label:
                                        'Kâr Marjı',
                                    value:
                                        formatProfitMargin(
                                            selectedTrendDetail.revenueMinor,
                                            selectedTrendDetail.grossProfitMinor,
                                        ),
                                },
                                {
                                    label:
                                        'İndirim',
                                    value:
                                        formatMoneyFromMinor(
                                            selectedTrendDetail.discountMinor,
                                        ),
                                },
                            ])}
                        </div>
                    )}
                </article>

                <article className="dashboard-panel reports-chart-panel">
                    <div className="panel-header">
                        <div>
                            <h2>
                                Ürün Ciro & Kâr Karşılaştırması
                            </h2>

                            <p>
                                Cirosu en yüksek ilk 6
                                ürünün performansı.
                            </p>
                        </div>

                        <Trophy size={19} />
                    </div>

                    {productChartData.length === 0 ? (
                        <div className="empty-state empty-state-compact">
                            <Trophy
                                size={30}
                                strokeWidth={1.5}
                            />

                            <div>
                                <strong>
                                    Ürün verisi bulunamadı
                                </strong>

                                <p>
                                    Dönemi veya ürün filtresini
                                    değiştirebilirsiniz.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="reports-chart-container">
                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                            >
                                <BarChart
                                    data={productChartData}
                                    onClick={
                                        handleProductChartClick
                                    }
                                    margin={{
                                        top: 8,
                                        right: 12,
                                        left: 4,
                                        bottom: 8,
                                    }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        vertical={false}
                                    />

                                    <XAxis
                                        dataKey="productName"
                                        tickFormatter={
                                            formatChartProductName
                                        }
                                        interval={0}
                                        height={44}
                                        tick={{
                                            fontSize: 10,
                                        }}
                                        tickLine={false}
                                        axisLine={false}
                                    />

                                    <YAxis
                                        tickFormatter={(value) =>
                                            formatMoneyFromMinor(
                                                Number(value),
                                            )
                                        }
                                        tick={{
                                            fontSize: 10,
                                        }}
                                        tickLine={false}
                                        axisLine={false}
                                        width={78}
                                    />

                                    <Tooltip
                                        cursor={{
                                            fill:
                                                'rgba(15, 23, 42, 0.035)',
                                        }}
                                        wrapperStyle={{
                                            zIndex: 1000,
                                            pointerEvents:
                                                'none',
                                            outline:
                                                'none',
                                        }}
                                        content={
                                            <ProductChartTooltip />
                                        }
                                    />

                                    <Legend
                                        content={() =>
                                            renderChartLegend()
                                        }
                                    />

                                    <Bar
                                        dataKey="revenueMinor"
                                        cursor="pointer"
                                        name="Ciro"
                                        fill="var(--color-secondary)"
                                        radius={[
                                            4,
                                            4,
                                            0,
                                            0,
                                        ]}
                                    />

                                    <Bar
                                        dataKey="grossProfitMinor"
                                        cursor="pointer"
                                        name="Brüt Kâr"
                                        fill="var(--color-primary)"
                                        radius={[
                                            4,
                                            4,
                                            0,
                                            0,
                                        ]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {selectedProductDetail && (
                        <div
                            style={{
                                marginTop: 14,
                                padding: 14,
                                border:
                                    '1px solid var(--color-border)',
                                borderRadius: 12,
                                background:
                                    'var(--color-surface)',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems:
                                        'flex-start',
                                    justifyContent:
                                        'space-between',
                                    gap: 12,
                                }}
                            >
                                <div>
                                    <strong
                                        style={{
                                            display:
                                                'block',
                                            color:
                                                'var(--color-text)',
                                        }}
                                    >
                                        {selectedProductDetail.productName}
                                    </strong>

                                    <small
                                        style={{
                                            color:
                                                'var(--color-text-muted)',
                                        }}
                                    >
                                        {selectedProductDetail.sku
                                            ? `SKU: ${selectedProductDetail.sku}`
                                            : 'SKU yok'}
                                    </small>
                                </div>

                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelectedProductId(
                                            null,
                                        )
                                    }
                                    style={{
                                        border:
                                            '1px solid var(--color-border)',
                                        borderRadius: 8,
                                        padding:
                                            '5px 9px',
                                        cursor:
                                            'pointer',
                                        background:
                                            'transparent',
                                        color:
                                            'var(--color-text-muted)',
                                        font:
                                            'inherit',
                                        fontSize: 12,
                                    }}
                                >
                                    Kapat
                                </button>
                            </div>

                            {renderMetricGrid([
                                {
                                    label:
                                        'İşlem',
                                    value:
                                        `${selectedProductDetail.transactionCount}`,
                                },
                                {
                                    label:
                                        'Satılan',
                                    value:
                                        `${selectedProductDetail.quantity} adet`,
                                },
                                {
                                    label:
                                        'Ciro',
                                    value:
                                        formatMoneyFromMinor(
                                            selectedProductDetail.revenueMinor,
                                        ),
                                },
                                {
                                    label:
                                        'Maliyet',
                                    value:
                                        formatMoneyFromMinor(
                                            selectedProductDetail.costMinor,
                                        ),
                                },
                                {
                                    label:
                                        'Brüt Kâr',
                                    value:
                                        formatMoneyFromMinor(
                                            selectedProductDetail.grossProfitMinor,
                                        ),
                                },
                                {
                                    label:
                                        'Kâr Marjı',
                                    value:
                                        formatProfitMargin(
                                            selectedProductDetail.revenueMinor,
                                            selectedProductDetail.grossProfitMinor,
                                        ),
                                },
                                {
                                    label:
                                        'İndirim',
                                    value:
                                        formatMoneyFromMinor(
                                            selectedProductDetail.discountMinor,
                                        ),
                                },
                            ])}
                        </div>
                    )}
                </article>
            </section>

            <section className="dashboard-panel reports-table-panel">
                <div className="panel-header">
                    <div>
                        <h2>Ürün Performansı</h2>

                        <p>
                            Seçilen dönemde tamamlanan
                            satışların ürün bazlı analizi.
                        </p>
                    </div>
                </div>

                {productPerformance.length === 0 ? (
                    <div className="empty-state">
                        <TrendingUp
                            size={30}
                            strokeWidth={1.5}
                        />

                        <div>
                            <strong>
                                Rapor verisi bulunamadı
                            </strong>

                            <p>
                                Dönemi veya ürün filtresini
                                değiştirebilirsiniz.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="product-table-wrapper">
                        <table className="product-table reports-table">
                            <thead>
                                <tr>
                                    <th>Ürün</th>
                                    <th>SKU</th>
                                    <th>Adet</th>
                                    <th>Ciro</th>
                                    <th>Maliyet</th>
                                    <th>Brüt Kâr</th>
                                    <th>Marj</th>
                                    <th>İndirim</th>
                                </tr>
                            </thead>

                            <tbody>
                                {productPerformance.map(
                                    (item) => {
                                        const margin =
                                            item.revenueMinor > 0
                                                ? (
                                                    (item.grossProfitMinor /
                                                        item.revenueMinor) *
                                                    100
                                                ).toFixed(1)
                                                : '0,0'

                                        return (
                                            <tr
                                                key={item.productId}
                                            >
                                                <td>
                                                    <strong>
                                                        {item.productName}
                                                    </strong>
                                                </td>

                                                <td>
                                                    {item.sku ?? '—'}
                                                </td>

                                                <td>
                                                    {item.quantity}
                                                </td>

                                                <td>
                                                    {formatMoneyFromMinor(
                                                        item.revenueMinor,
                                                    )}
                                                </td>

                                                <td>
                                                    {formatMoneyFromMinor(
                                                        item.costMinor,
                                                    )}
                                                </td>

                                                <td>
                                                    {formatMoneyFromMinor(
                                                        item.grossProfitMinor,
                                                    )}
                                                </td>

                                                <td>
                                                    %{margin}
                                                </td>

                                                <td>
                                                    {formatMoneyFromMinor(
                                                        item.discountMinor,
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    },
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="dashboard-panel reports-table-panel">
                <div className="panel-header">
                    <div>
                        <h2>Günlük Satış Kırılımı</h2>

                        <p>
                            Seçilen dönemdeki günlük
                            satış ve kârlılık özeti.
                        </p>
                    </div>
                </div>

                {dailyPerformance.length === 0 ? (
                    <div className="empty-state">
                        <CircleDollarSign
                            size={30}
                            strokeWidth={1.5}
                        />

                        <div>
                            <strong>
                                Günlük veri bulunamadı
                            </strong>

                            <p>
                                Bu dönemde tamamlanan satış
                                bulunmuyor.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="product-table-wrapper">
                        <table className="product-table reports-table">
                            <thead>
                                <tr>
                                    <th>Tarih</th>
                                    <th>İşlem</th>
                                    <th>Adet</th>
                                    <th>Ciro</th>
                                    <th>Maliyet</th>
                                    <th>Brüt Kâr</th>
                                    <th>İndirim</th>
                                </tr>
                            </thead>

                            <tbody>
                                {dailyPerformance.map(
                                    (day) => (
                                        <tr key={day.saleDate}>
                                            <td>
                                                <strong>
                                                    {formatDisplayDate(
                                                        day.saleDate,
                                                    )}
                                                </strong>
                                            </td>

                                            <td>
                                                {day.transactionCount}
                                            </td>

                                            <td>
                                                {day.quantity}
                                            </td>

                                            <td>
                                                {formatMoneyFromMinor(
                                                    day.revenueMinor,
                                                )}
                                            </td>

                                            <td>
                                                {formatMoneyFromMinor(
                                                    day.costMinor,
                                                )}
                                            </td>

                                            <td>
                                                {formatMoneyFromMinor(
                                                    day.grossProfitMinor,
                                                )}
                                            </td>

                                            <td>
                                                {formatMoneyFromMinor(
                                                    day.discountMinor,
                                                )}
                                            </td>
                                        </tr>
                                    ),
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    )
}

export default ReportsPage