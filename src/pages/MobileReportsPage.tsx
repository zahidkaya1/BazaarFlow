import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
    CircleDollarSign,
    PackageCheck,
    TrendingUp,
    Trophy,
    WalletCards,
} from 'lucide-react'
import MobilePageHeader from '../components/mobile/MobilePageHeader'
import { productService } from '../services/productService'
import {
    salesService,
    type SaleHistoryRecord,
} from '../services/salesService'
import type { Product } from '../types/product'
import { formatDateValue, formatDisplayDate } from '../utils/dateOnly'
import { formatMoneyFromMinor } from '../utils/money'

type MobileReportPeriod =
    | 'today'
    | 'week'
    | 'month'
    | 'year'

type ProductReportRow = {
    productId: string
    productName: string
    quantity: number
    transactionCount: number
    revenueMinor: number
    costMinor: number
    grossProfitMinor: number
}

type DailyReportRow = {
    saleDate: string
    quantity: number
    transactionCount: number
    revenueMinor: number
    costMinor: number
    grossProfitMinor: number
}


function getRange(
    period: MobileReportPeriod,
): {
    start: string
    end: string
} {
    const today = new Date()

    if (period === 'today') {
        const value =
            formatDateValue(today)

        return {
            start: value,
            end: value,
        }
    }

    if (period === 'week') {
        const day =
            today.getDay()

        const mondayOffset =
            day === 0
                ? -6
                : 1 - day

        const monday = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() +
                mondayOffset,
        )

        const sunday = new Date(
            monday.getFullYear(),
            monday.getMonth(),
            monday.getDate() + 6,
        )

        return {
            start:
                formatDateValue(
                    monday,
                ),
            end:
                formatDateValue(
                    sunday,
                ),
        }
    }

    if (period === 'month') {
        const firstDay =
            new Date(
                today.getFullYear(),
                today.getMonth(),
                1,
            )

        const lastDay =
            new Date(
                today.getFullYear(),
                today.getMonth() + 1,
                0,
            )

        return {
            start:
                formatDateValue(
                    firstDay,
                ),
            end:
                formatDateValue(
                    lastDay,
                ),
        }
    }

    return {
        start:
            `${today.getFullYear()}-01-01`,
        end:
            `${today.getFullYear()}-12-31`,
    }
}

function getPeriodLabel(
    period: MobileReportPeriod,
): string {
    switch (period) {
        case 'today':
            return 'Bugün'
        case 'week':
            return 'Hafta'
        case 'month':
            return 'Ay'
        case 'year':
            return 'Yıl'
    }
}

function MobileReportsPage() {
    const [period, setPeriod] =
        useState<MobileReportPeriod>(
            'month',
        )

    const reportRange = useMemo(
        () => getRange(period),
        [period],
    )

    const data = useLiveQuery(
        async () => {
            const [
                products,
                history,
            ] = await Promise.all([
                productService.getAll(),
                salesService.getHistoryByDateRange(
                    reportRange.start,
                    reportRange.end,
                ),
            ])

            return {
                products,
                history,
            }
        },
        [
            reportRange.start,
            reportRange.end,
        ],
        {
            products:
                [] as Product[],
            history:
                [] as SaleHistoryRecord[],
        },
    )

    const completedRecords =
        useMemo(
            () =>
                data.history.filter(
                    (record) =>
                        record.sale
                            .status ===
                        'completed',
                ),
            [data.history],
        )

    const summary = useMemo(
        () =>
            completedRecords.reduce(
                (totals, record) => {
                    totals.quantity +=
                        record.totalQuantity

                    totals.transactionCount +=
                        1

                    totals.revenueMinor +=
                        record.revenueMinor

                    totals.costMinor +=
                        record.costMinor

                    totals.grossProfitMinor +=
                        record.grossProfitMinor

                    return totals
                },
                {
                    quantity: 0,
                    transactionCount: 0,
                    revenueMinor: 0,
                    costMinor: 0,
                    grossProfitMinor: 0,
                },
            ),
        [completedRecords],
    )

    const productMap = useMemo(
        () =>
            new Map(
                data.products.map(
                    (product) => [
                        product.id,
                        product,
                    ],
                ),
            ),
        [data.products],
    )

    const productPerformance =
        useMemo(() => {
            const rows =
                new Map<
                    string,
                    ProductReportRow
                >()

            for (
                const record of
                    completedRecords
            ) {
                for (
                    const item of
                        record.items
                ) {
                    const product =
                        productMap.get(
                            item.productId,
                        )

                    const current =
                        rows.get(
                            item.productId,
                        ) ?? {
                            productId:
                                item.productId,

                            productName:
                                product?.name ??
                                item.productName,

                            quantity: 0,
                            transactionCount:
                                0,

                            revenueMinor:
                                0,
                            costMinor: 0,
                            grossProfitMinor:
                                0,
                        }

                    current.quantity +=
                        item.quantity

                    current.transactionCount +=
                        1

                    current.revenueMinor +=
                        item.revenueMinor

                    current.costMinor +=
                        item.costMinor

                    current.grossProfitMinor +=
                        item.grossProfitMinor

                    rows.set(
                        item.productId,
                        current,
                    )
                }
            }

            return Array.from(
                rows.values(),
            )
        }, [
            completedRecords,
            productMap,
        ])

    const bestSeller =
        useMemo(
            () =>
                [...productPerformance]
                    .sort(
                        (
                            first,
                            second,
                        ) =>
                            second.quantity -
                                first.quantity ||
                            second.revenueMinor -
                                first.revenueMinor,
                    )[0] ?? null,
            [productPerformance],
        )

    const mostProfitable =
        useMemo(
            () =>
                [...productPerformance]
                    .sort(
                        (
                            first,
                            second,
                        ) =>
                            second.grossProfitMinor -
                                first.grossProfitMinor ||
                            second.quantity -
                                first.quantity,
                    )[0] ?? null,
            [productPerformance],
        )

    const dailyPerformance =
        useMemo(() => {
            const rows =
                new Map<
                    string,
                    DailyReportRow
                >()

            for (
                const record of
                    completedRecords
            ) {
                const saleDate =
                    record.sale.saleDate

                const current =
                    rows.get(
                        saleDate,
                    ) ?? {
                        saleDate,
                        quantity: 0,
                        transactionCount:
                            0,
                        revenueMinor: 0,
                        costMinor: 0,
                        grossProfitMinor:
                            0,
                    }

                current.quantity +=
                    record.totalQuantity

                current.transactionCount +=
                    1

                current.revenueMinor +=
                    record.revenueMinor

                current.costMinor +=
                    record.costMinor

                current.grossProfitMinor +=
                    record.grossProfitMinor

                rows.set(
                    saleDate,
                    current,
                )
            }

            return Array.from(
                rows.values(),
            )
                .sort(
                    (
                        first,
                        second,
                    ) =>
                        second.saleDate.localeCompare(
                            first.saleDate,
                        ),
                )
                .slice(0, 7)
        }, [completedRecords])

    const grossMargin =
        summary.revenueMinor > 0
            ? (
                  (summary.grossProfitMinor /
                      summary.revenueMinor) *
                  100
              ).toLocaleString(
                  'tr-TR',
                  {
                      minimumFractionDigits:
                          1,
                      maximumFractionDigits:
                          1,
                  },
              )
            : '0,0'

    return (
        <div className="mobile-page-shell">
            <MobilePageHeader
                title="Raporlar"
                description="Satış ve kârlılığı hızlıca takip edin."
            />

            <div
                className="mobile-reports-periods"
                aria-label="Rapor dönemi"
            >
                {(
                    [
                        'today',
                        'week',
                        'month',
                        'year',
                    ] as MobileReportPeriod[]
                ).map((item) => (
                    <button
                        key={item}
                        type="button"
                        className={
                            period ===
                            item
                                ? 'mobile-reports-period mobile-reports-period-active'
                                : 'mobile-reports-period'
                        }
                        onClick={() =>
                            setPeriod(
                                item,
                            )
                        }
                    >
                        {getPeriodLabel(
                            item,
                        )}
                    </button>
                ))}
            </div>

            <div className="mobile-reports-range">
                {formatDisplayDate(
                    reportRange.start,
                )}
                {reportRange.start !==
                    reportRange.end &&
                    ` – ${formatDisplayDate(
                        reportRange.end,
                    )}`}
            </div>

            <section className="mobile-reports-summary-grid">
                <article className="mobile-reports-summary-card">
                    <span className="mobile-reports-summary-icon">
                        <CircleDollarSign
                            size={17}
                        />
                    </span>

                    <span>Ciro</span>

                    <strong>
                        {formatMoneyFromMinor(
                            summary.revenueMinor,
                        )}
                    </strong>
                </article>

                <article className="mobile-reports-summary-card">
                    <span className="mobile-reports-summary-icon">
                        <WalletCards
                            size={17}
                        />
                    </span>

                    <span>Maliyet</span>

                    <strong>
                        {formatMoneyFromMinor(
                            summary.costMinor,
                        )}
                    </strong>
                </article>

                <article className="mobile-reports-summary-card mobile-reports-summary-card-profit">
                    <span className="mobile-reports-summary-icon">
                        <TrendingUp
                            size={17}
                        />
                    </span>

                    <span>Brüt Kâr</span>

                    <strong>
                        {formatMoneyFromMinor(
                            summary.grossProfitMinor,
                        )}
                    </strong>
                </article>

                <article className="mobile-reports-summary-card">
                    <span className="mobile-reports-summary-icon">
                        <PackageCheck
                            size={17}
                        />
                    </span>

                    <span>Satılan</span>

                    <strong>
                        {summary.quantity}{' '}
                        adet
                    </strong>
                </article>
            </section>

            <div className="mobile-reports-meta">
                <span>
                    {
                        summary.transactionCount
                    }{' '}
                    satış
                </span>

                <span>
                    Brüt marj %{grossMargin}
                </span>
            </div>

            {completedRecords.length ===
            0 ? (
                <section className="mobile-reports-empty">
                    <strong>
                        Bu dönemde satış yok
                    </strong>

                    <span>
                        Farklı bir dönem
                        seçebilirsiniz.
                    </span>
                </section>
            ) : (
                <>
                    <section className="mobile-reports-highlights">
                        <article className="mobile-reports-highlight-card">
                            <span className="mobile-reports-highlight-icon">
                                <Trophy
                                    size={17}
                                />
                            </span>

                            <div>
                                <small>
                                    En Çok
                                    Satan
                                </small>

                                <strong>
                                    {
                                        bestSeller?.productName
                                    }
                                </strong>

                                <span>
                                    {
                                        bestSeller?.quantity
                                    }{' '}
                                    adet ·{' '}
                                    {formatMoneyFromMinor(
                                        bestSeller?.revenueMinor ??
                                            0,
                                    )}
                                </span>
                            </div>
                        </article>

                        <article className="mobile-reports-highlight-card">
                            <span className="mobile-reports-highlight-icon">
                                <TrendingUp
                                    size={17}
                                />
                            </span>

                            <div>
                                <small>
                                    En Kârlı
                                </small>

                                <strong>
                                    {
                                        mostProfitable?.productName
                                    }
                                </strong>

                                <span>
                                    {formatMoneyFromMinor(
                                        mostProfitable?.grossProfitMinor ??
                                            0,
                                    )}{' '}
                                    brüt kâr
                                </span>
                            </div>
                        </article>
                    </section>

                    <section className="mobile-reports-days">
                        <div className="mobile-reports-section-title">
                            <div>
                                <span>
                                    Günlük
                                    Özet
                                </span>

                                <small>
                                    Son 7 kayıtlı
                                    gün
                                </small>
                            </div>
                        </div>

                        <div className="mobile-reports-day-list">
                            {dailyPerformance.map(
                                (day) => (
                                    <article
                                        key={
                                            day.saleDate
                                        }
                                        className="mobile-reports-day-row"
                                    >
                                        <div className="mobile-reports-day-date">
                                            <strong>
                                                {formatDisplayDate(
                                                    day.saleDate,
                                                )}
                                            </strong>

                                            <span>
                                                {
                                                    day.transactionCount
                                                }{' '}
                                                satış ·{' '}
                                                {
                                                    day.quantity
                                                }{' '}
                                                adet
                                            </span>
                                        </div>

                                        <div className="mobile-reports-day-money">
                                            <strong>
                                                {formatMoneyFromMinor(
                                                    day.revenueMinor,
                                                )}
                                            </strong>

                                            <span>
                                                +
                                                {formatMoneyFromMinor(
                                                    day.grossProfitMinor,
                                                )}{' '}
                                                kâr
                                            </span>
                                        </div>
                                    </article>
                                ),
                            )}
                        </div>
                    </section>
                </>
            )}
        </div>
    )
}

export default MobileReportsPage
