import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
    AlertTriangle,
    Boxes,
    ChevronRight,
    CircleDollarSign,
    PackageCheck,
    ReceiptText,
    TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import MobilePageHeader from '../components/mobile/MobilePageHeader'
import { inventoryService } from '../services/inventoryService'
import { productService } from '../services/productService'
import {
    salesService,
    type SaleHistoryRecord,
    type SaleHistorySummary,
} from '../services/salesService'
import type { InventoryLot } from '../types/inventoryLot'
import type { Product } from '../types/product'
import { formatDisplayDate, getTodayDateValue } from '../utils/dateOnly'
import { formatMoneyFromMinor } from '../utils/money'


function MobileDashboardPage() {
    const today = getTodayDateValue()

    const data = useLiveQuery(
        async () => {
            const [
                products,
                lots,
                todaySummary,
                recentSales,
            ] = await Promise.all([
                productService.getAll(),
                inventoryService.getAll(),
                salesService.getSummaryByDateRange(
                    today,
                    today,
                ),
                salesService.getRecentHistory(
                    5,
                ),
            ])

            return {
                products,
                lots,
                todaySummary,
                recentSales,
            }
        },
        [today],
        {
            products: [] as Product[],
            lots: [] as InventoryLot[],
            todaySummary: {
                transactionCount: 0,
                totalQuantity: 0,
                listTotalMinor: 0,
                revenueMinor: 0,
                discountMinor: 0,
                costMinor: 0,
                grossProfitMinor: 0,
            } as SaleHistorySummary,
            recentSales:
                [] as SaleHistoryRecord[],
        },
    )

    const stockByProduct = useMemo(
        () => {
            const stock =
                new Map<string, number>()

            for (const lot of data.lots) {
                stock.set(
                    lot.productId,
                    (stock.get(
                        lot.productId,
                    ) ?? 0) +
                        lot.quantityRemaining,
                )
            }

            return stock
        },
        [data.lots],
    )

    const totalStock = useMemo(
        () =>
            data.lots.reduce(
                (total, lot) =>
                    total +
                    lot.quantityRemaining,
                0,
            ),
        [data.lots],
    )

    const lowStockProducts =
        useMemo(
            () =>
                data.products
                    .filter((product) => {
                        if (
                            !product.isActive ||
                            product.minimumStock <=
                                0
                        ) {
                            return false
                        }

                        const currentStock =
                            stockByProduct.get(
                                product.id,
                            ) ?? 0

                        return (
                            currentStock <=
                            product.minimumStock
                        )
                    })
                    .sort(
                        (
                            first,
                            second,
                        ) =>
                            (stockByProduct.get(
                                first.id,
                            ) ?? 0) -
                            (stockByProduct.get(
                                second.id,
                            ) ?? 0),
                    )
                    .slice(0, 5),
            [
                data.products,
                stockByProduct,
            ],
        )

    const activeProductCount =
        useMemo(
            () =>
                data.products.filter(
                    (product) =>
                        product.isActive,
                ).length,
            [data.products],
        )

    return (
        <div className="mobile-page-shell mobile-screen mobile-dashboard-page">
            <MobilePageHeader title="Genel Bakış" />

            <div className="mobile-page-scroll">
            <section className="mobile-dashboard-summary-grid">
                <article className="mobile-dashboard-summary-card">
                    <span className="mobile-dashboard-summary-icon">
                        <CircleDollarSign
                            size={17}
                        />
                    </span>

                    <span>Ciro</span>

                    <strong>
                        {formatMoneyFromMinor(
                            data.todaySummary
                                .revenueMinor,
                        )}
                    </strong>
                </article>

                <article className="mobile-dashboard-summary-card mobile-dashboard-summary-card-profit">
                    <span className="mobile-dashboard-summary-icon">
                        <TrendingUp size={17} />
                    </span>

                    <span>Brüt Kâr</span>

                    <strong>
                        {formatMoneyFromMinor(
                            data.todaySummary
                                .grossProfitMinor,
                        )}
                    </strong>
                </article>

                <article className="mobile-dashboard-summary-card">
                    <span className="mobile-dashboard-summary-icon">
                        <ReceiptText size={17} />
                    </span>

                    <span>Satış</span>

                    <strong>
                        {
                            data.todaySummary
                                .transactionCount
                        }
                    </strong>
                </article>

                <article className="mobile-dashboard-summary-card">
                    <span className="mobile-dashboard-summary-icon">
                        <PackageCheck size={17} />
                    </span>

                    <span>Satılan</span>

                    <strong>
                        {
                            data.todaySummary
                                .totalQuantity
                        }{' '}
                        adet
                    </strong>
                </article>
            </section>

            <section className="mobile-dashboard-stock-strip">
                <div>
                    <span>
                        <Boxes size={16} />
                        Mevcut stok
                    </span>

                    <strong>
                        {totalStock} adet
                    </strong>
                </div>

                <div>
                    <span>Aktif ürün</span>
                    <strong>
                        {activeProductCount}
                    </strong>
                </div>

                <div>
                    <span>Düşük stok</span>
                    <strong>
                        {
                            lowStockProducts.length
                        }
                    </strong>
                </div>
            </section>

            <section className="mobile-dashboard-section">
                <div className="mobile-dashboard-section-heading">
                    <div>
                        <strong>
                            Düşük Stok
                        </strong>

                        <span>
                            Minimum seviyeye ulaşanlar
                        </span>
                    </div>

                    <Link
                        to="/inventory"
                        className="mobile-dashboard-section-link"
                    >
                        Stok
                        <ChevronRight
                            size={14}
                        />
                    </Link>
                </div>

                {lowStockProducts.length ===
                0 ? (
                    <div className="mobile-dashboard-empty">
                        <PackageCheck
                            size={20}
                        />

                        <div>
                            <strong>
                                Stoklar yeterli
                            </strong>

                            <span>
                                Düşük stoklu aktif
                                ürün bulunmuyor.
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="mobile-dashboard-list">
                        {lowStockProducts.map(
                            (product) => {
                                const currentStock =
                                    stockByProduct.get(
                                        product.id,
                                    ) ?? 0

                                return (
                                    <article
                                        key={
                                            product.id
                                        }
                                        className="mobile-dashboard-low-stock-row"
                                    >
                                        <span className="mobile-dashboard-warning-icon">
                                            <AlertTriangle
                                                size={
                                                    16
                                                }
                                            />
                                        </span>

                                        <div>
                                            <strong>
                                                {
                                                    product.name
                                                }
                                            </strong>

                                            <span>
                                                {product.sku ??
                                                    'SKU yok'}
                                            </span>
                                        </div>

                                        <div className="mobile-dashboard-low-stock-value">
                                            <strong>
                                                {
                                                    currentStock
                                                }
                                            </strong>

                                            <span>
                                                min.{' '}
                                                {
                                                    product.minimumStock
                                                }
                                            </span>
                                        </div>
                                    </article>
                                )
                            },
                        )}
                    </div>
                )}
            </section>

            <section className="mobile-dashboard-section">
                <div className="mobile-dashboard-section-heading">
                    <div>
                        <strong>
                            Son Satışlar
                        </strong>

                        <span>
                            En yeni 5 kayıt
                        </span>
                    </div>

                    <Link
                        to="/history"
                        className="mobile-dashboard-section-link"
                    >
                        Tümü
                        <ChevronRight
                            size={14}
                        />
                    </Link>
                </div>

                {data.recentSales.length ===
                0 ? (
                    <div className="mobile-dashboard-empty">
                        <ReceiptText
                            size={20}
                        />

                        <div>
                            <strong>
                                Henüz satış yok
                            </strong>

                            <span>
                                İlk satışınız burada
                                görünecek.
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="mobile-dashboard-list">
                        {data.recentSales.map(
                            (record) => (
                                <article
                                    key={
                                        record.sale.id
                                    }
                                    className={`mobile-dashboard-sale-row ${
                                        record.sale
                                            .status ===
                                        'cancelled'
                                            ? 'mobile-dashboard-sale-row-cancelled'
                                            : ''
                                    }`}
                                >
                                    <div className="mobile-dashboard-sale-main">
                                        <strong>
                                            {record.items
                                                .map(
                                                    (
                                                        item,
                                                    ) =>
                                                        item.productName,
                                                )
                                                .join(
                                                    ', ',
                                                )}
                                        </strong>

                                        <span>
                                            {formatDisplayDate(
                                                record
                                                    .sale
                                                    .saleDate,
                                            )}{' '}
                                            ·{' '}
                                            {
                                                record.totalQuantity
                                            }{' '}
                                            adet
                                        </span>
                                    </div>

                                    <div className="mobile-dashboard-sale-value">
                                        {record.sale
                                            .status ===
                                        'completed' ? (
                                            <>
                                                <strong>
                                                    {formatMoneyFromMinor(
                                                        record.revenueMinor,
                                                    )}
                                                </strong>

                                                <span>
                                                    +
                                                    {formatMoneyFromMinor(
                                                        record.grossProfitMinor,
                                                    )}{' '}
                                                    kâr
                                                </span>
                                            </>
                                        ) : (
                                            <span>
                                                İptal
                                            </span>
                                        )}
                                    </div>
                                </article>
                            ),
                        )}
                    </div>
                )}
            </section>
            </div>
        </div>
    )
}

export default MobileDashboardPage
