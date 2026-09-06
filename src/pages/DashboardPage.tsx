import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import {
    AlertTriangle,
    Banknote,
    Boxes,
    CircleDollarSign,
    PackageCheck,
    ShoppingCart,
    TrendingUp,
    Trophy,
    Warehouse,
} from 'lucide-react'
import { inventoryService } from '../services/inventoryService'
import { productService } from '../services/productService'
import {
    salesService,
    type SaleHistoryRecord,
} from '../services/salesService'
import type { InventoryLot } from '../types/inventoryLot'
import type { Product } from '../types/product'
import { formatMoneyFromMinor } from '../utils/money'

function getTodayDateValue(): string {
    const now = new Date()

    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

function formatDate(value: string): string {
    const [year, month, day] = value.split('-')

    return `${day}.${month}.${year}`
}

function DashboardPage() {
    const dashboardData = useLiveQuery(
        async () => {
            const [products, lots, saleHistory] =
                await Promise.all([
                    productService.getAll(),
                    inventoryService.getAll(),
                    salesService.getHistory(),
                ])

            return {
                products,
                lots,
                saleHistory,
            }
        },
        [],
        {
            products: [] as Product[],
            lots: [] as InventoryLot[],
            saleHistory: [] as SaleHistoryRecord[],
        },
    )

    const {
        products,
        lots,
        saleHistory,
    } = dashboardData

    const today = getTodayDateValue()

    const productMap = useMemo(
        () =>
            new Map(
                products.map((product) => [
                    product.id,
                    product,
                ]),
            ),
        [products],
    )

    const stockByProduct = useMemo(() => {
        const stock = new Map<string, number>()

        for (const lot of lots) {
            stock.set(
                lot.productId,
                (stock.get(lot.productId) ?? 0) +
                lot.quantityRemaining,
            )
        }

        return stock
    }, [lots])

    const stockValueByProduct = useMemo(() => {
        const values = new Map<string, number>()

        for (const lot of lots) {
            const value =
                lot.quantityRemaining *
                lot.unitCostMinor

            values.set(
                lot.productId,
                (values.get(lot.productId) ?? 0) +
                value,
            )
        }

        return values
    }, [lots])

    const completedSales = saleHistory.filter(
        (record) =>
            record.sale.status === 'completed',
    )

    const todaySales = completedSales.filter(
        (record) =>
            record.sale.saleDate === today,
    )

    const todayRevenueMinor = todaySales.reduce(
        (total, record) =>
            total + record.revenueMinor,
        0,
    )

    const todayGrossProfitMinor =
        todaySales.reduce(
            (total, record) =>
                total + record.grossProfitMinor,
            0,
        )

    const todayQuantity = todaySales.reduce(
        (total, record) =>
            total + record.totalQuantity,
        0,
    )

    const todayDiscountMinor =
        todaySales.reduce(
            (total, record) =>
                total + record.discountMinor,
            0,
        )

    const totalStock = lots.reduce(
        (total, lot) =>
            total + lot.quantityRemaining,
        0,
    )

    const totalInventoryValueMinor =
        lots.reduce(
            (total, lot) =>
                total +
                lot.quantityRemaining *
                lot.unitCostMinor,
            0,
        )

    const lowStockProducts = useMemo(
        () =>
            products
                .filter((product) => {
                    if (!product.isActive) {
                        return false
                    }

                    if (product.minimumStock <= 0) {
                        return false
                    }

                    const currentStock =
                        stockByProduct.get(product.id) ?? 0

                    return (
                        currentStock <= product.minimumStock
                    )
                })
                .sort((first, second) => {
                    const firstStock =
                        stockByProduct.get(first.id) ?? 0

                    const secondStock =
                        stockByProduct.get(second.id) ?? 0

                    return firstStock - secondStock
                }),
        [products, stockByProduct],
    )

    const recentSales = saleHistory.slice(0, 5)

    const bestSellingQuantities =
        new Map<string, number>()

    for (const record of completedSales) {
        for (const item of record.items) {
            bestSellingQuantities.set(
                item.productId,
                (bestSellingQuantities.get(
                    item.productId,
                ) ?? 0) + item.quantity,
            )
        }
    }

    const bestSellingProducts =
        Array.from(
            bestSellingQuantities.entries(),
        )
            .map(([productId, quantity]) => ({
                productId,
                quantity,

                productName:
                    productMap.get(productId)?.name ??
                    'Bilinmeyen ürün',

                sku:
                    productMap.get(productId)?.sku,
            }))
            .sort(
                (first, second) =>
                    second.quantity - first.quantity,
            )
            .slice(0, 5)

    const summaryCards = [
        {
            title: 'Bugünkü Ciro',
            value: formatMoneyFromMinor(
                todayRevenueMinor,
            ),
            description: 'Bugün tamamlanan satışlar',
            icon: Banknote,
        },
        {
            title: 'Brüt Kâr',
            value: formatMoneyFromMinor(
                todayGrossProfitMinor,
            ),
            description: 'Bugünkü FIFO bazlı brüt kâr',
            icon: TrendingUp,
        },
        {
            title: 'Satılan Ürün',
            value: String(todayQuantity),
            description: 'Bugün satılan toplam adet',
            icon: PackageCheck,
        },
        {
            title: 'Toplam İndirim',
            value: formatMoneyFromMinor(
                todayDiscountMinor,
            ),
            description: 'Bugün uygulanan indirimler',
            icon: CircleDollarSign,
        },
        {
            title: 'Mevcut Stok',
            value: String(totalStock),
            description: 'Eldeki toplam ürün adedi',
            icon: Boxes,
        },
        {
            title: 'Stok Değeri',
            value: formatMoneyFromMinor(
                totalInventoryValueMinor,
            ),
            description: 'Eldeki stokların FIFO maliyeti',
            icon: Warehouse,
        },
    ]

    return (
        <div className="dashboard">
            <header className="page-header">
                <div>
                    <span className="page-eyebrow">
                        BazaarFlow
                    </span>

                    <h1>Genel Bakış</h1>

                    <p>
                        Satış, stok ve kârlılık durumunuzu
                        canlı olarak takip edin.
                    </p>
                </div>
            </header>

            <section
                className="summary-grid dashboard-summary-grid"
                aria-label="Günlük özet"
            >
                {summaryCards.map((card) => {
                    const Icon = card.icon

                    return (
                        <article
                            key={card.title}
                            className="summary-card"
                        >
                            <div className="summary-card-header">
                                <span className="summary-card-icon">
                                    <Icon
                                        size={21}
                                        strokeWidth={1.8}
                                    />
                                </span>

                                <span className="summary-card-title">
                                    {card.title}
                                </span>
                            </div>

                            <strong className="summary-card-value">
                                {card.value}
                            </strong>

                            <span className="summary-card-description">
                                {card.description}
                            </span>
                        </article>
                    )
                })}
            </section>

            <section className="dashboard-grid">
                <article className="dashboard-panel dashboard-panel-large">
                    <div className="panel-header">
                        <div>
                            <h2>Son Satışlar</h2>

                            <p>
                                En son kaydedilen satış işlemleri.
                            </p>
                        </div>

                        <Link
                            className="dashboard-panel-link"
                            to="/sales"
                        >
                            Tüm satışlar
                        </Link>
                    </div>

                    {recentSales.length === 0 ? (
                        <div className="empty-state">
                            <div
                                className="empty-state-icon"
                                aria-hidden="true"
                            >
                                <ShoppingCart
                                    size={32}
                                    strokeWidth={1.5}
                                />
                            </div>

                            <div>
                                <strong>
                                    Henüz satış kaydı yok
                                </strong>

                                <p>
                                    İlk satışınızı eklediğinizde
                                    burada görüntülenecek.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="dashboard-sales-list">
                            {recentSales.map((record) => (
                                <div
                                    key={record.sale.id}
                                    className={`dashboard-sale-row ${record.sale.status ===
                                        'cancelled'
                                        ? 'dashboard-sale-row-cancelled'
                                        : ''
                                        }`}
                                >
                                    <div className="dashboard-sale-main">
                                        <div className="dashboard-sale-title">
                                            <strong>
                                                {record.items
                                                    .map((item) => {
                                                        const product =
                                                            productMap.get(
                                                                item.productId,
                                                            )

                                                        return product?.sku
                                                            ? `${item.productName} · ${product.sku}`
                                                            : item.productName
                                                    })
                                                    .join(', ')}
                                            </strong>

                                            <span
                                                className={`sale-status-badge ${record.sale.status ===
                                                    'completed'
                                                    ? 'sale-status-completed'
                                                    : 'sale-status-cancelled'
                                                    }`}
                                            >
                                                {record.sale.status ===
                                                    'completed'
                                                    ? 'Tamamlandı'
                                                    : 'İptal Edildi'}
                                            </span>
                                        </div>

                                        <span className="dashboard-sale-meta">
                                            {formatDate(
                                                record.sale.saleDate,
                                            )}{' '}
                                            • {record.totalQuantity} adet
                                        </span>
                                    </div>

                                    <div className="dashboard-sale-values">
                                        {record.sale.status ===
                                            'completed' ? (
                                            <>
                                                <span>
                                                    Ciro
                                                    <strong>
                                                        {formatMoneyFromMinor(
                                                            record.revenueMinor,
                                                        )}
                                                    </strong>
                                                </span>

                                                <span>
                                                    Kâr
                                                    <strong>
                                                        {formatMoneyFromMinor(
                                                            record.grossProfitMinor,
                                                        )}
                                                    </strong>
                                                </span>
                                            </>
                                        ) : (
                                            <span className="dashboard-cancelled-text">
                                                Toplamlara dahil değil
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </article>

                <article className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Düşük Stok</h2>

                            <p>
                                Minimum stok seviyesine ulaşan
                                ürünler.
                            </p>
                        </div>

                        <Link
                            className="dashboard-panel-link"
                            to="/inventory"
                        >
                            Stoka git
                        </Link>
                    </div>

                    {lowStockProducts.length === 0 ? (
                        <div className="empty-state empty-state-compact">
                            <PackageCheck
                                size={28}
                                strokeWidth={1.5}
                            />

                            <div>
                                <strong>
                                    Düşük stoklu ürün yok
                                </strong>

                                <p>
                                    Aktif ürünlerin stok seviyeleri
                                    yeterli görünüyor.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="dashboard-low-stock-list">
                            {lowStockProducts
                                .slice(0, 6)
                                .map((product) => {
                                    const currentStock =
                                        stockByProduct.get(
                                            product.id,
                                        ) ?? 0

                                    return (
                                        <div
                                            key={product.id}
                                            className="dashboard-low-stock-row"
                                        >
                                            <div>
                                                <strong>
                                                    {product.name}
                                                </strong>

                                                <span>
                                                    {product.sku ??
                                                        'SKU yok'}
                                                </span>
                                            </div>

                                            <div className="dashboard-low-stock-value">
                                                <AlertTriangle
                                                    size={15}
                                                />

                                                <strong>
                                                    {currentStock}
                                                </strong>

                                                <span>
                                                    / min.{' '}
                                                    {product.minimumStock}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                        </div>
                    )}
                </article>
            </section>

            <section className="dashboard-secondary-grid">
                <article className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>En Çok Satan Ürünler</h2>

                            <p>
                                Tamamlanan tüm satışlara göre.
                            </p>
                        </div>
                    </div>

                    {bestSellingProducts.length === 0 ? (
                        <div className="empty-state empty-state-compact">
                            <Trophy
                                size={28}
                                strokeWidth={1.5}
                            />

                            <div>
                                <strong>
                                    Henüz sıralama yok
                                </strong>

                                <p>
                                    Satış yaptıkça ürünler burada
                                    sıralanacak.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="dashboard-ranking-list">
                            {bestSellingProducts.map(
                                (item, index) => (
                                    <div
                                        key={item.productId}
                                        className="dashboard-ranking-row"
                                    >
                                        <span className="dashboard-ranking-position">
                                            {index + 1}
                                        </span>

                                        <div className="dashboard-ranking-product">
                                            <strong>
                                                {item.productName}
                                            </strong>

                                            {item.sku && (
                                                <span>{item.sku}</span>
                                            )}
                                        </div>

                                        <strong className="dashboard-ranking-value">
                                            {item.quantity} adet
                                        </strong>
                                    </div>
                                ),
                            )}
                        </div>
                    )}
                </article>

                <article className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Stok Özeti</h2>

                            <p>
                                Mevcut stokların hızlı görünümü.
                            </p>
                        </div>
                    </div>

                    <div className="dashboard-stock-overview">
                        <div>
                            <span>Aktif ürün</span>

                            <strong>
                                {
                                    products.filter(
                                        (product) =>
                                            product.isActive,
                                    ).length
                                }
                            </strong>
                        </div>

                        <div>
                            <span>Düşük stok</span>

                            <strong>
                                {lowStockProducts.length}
                            </strong>
                        </div>

                        <div>
                            <span>Toplam adet</span>

                            <strong>{totalStock}</strong>
                        </div>

                        <div>
                            <span>Stok değeri</span>

                            <strong>
                                {formatMoneyFromMinor(
                                    totalInventoryValueMinor,
                                )}
                            </strong>
                        </div>
                    </div>

                    {products.length > 0 && (
                        <div className="dashboard-stock-value-list">
                            {products
                                .filter(
                                    (product) =>
                                        (stockByProduct.get(
                                            product.id,
                                        ) ?? 0) > 0,
                                )
                                .sort(
                                    (first, second) =>
                                        (stockValueByProduct.get(
                                            second.id,
                                        ) ?? 0) -
                                        (stockValueByProduct.get(
                                            first.id,
                                        ) ?? 0),
                                )
                                .slice(0, 5)
                                .map((product) => (
                                    <div
                                        key={product.id}
                                        className="dashboard-stock-value-row"
                                    >
                                        <div>
                                            <strong>
                                                {product.name}
                                            </strong>

                                            <span>
                                                {stockByProduct.get(
                                                    product.id,
                                                ) ?? 0}{' '}
                                                adet
                                            </span>
                                        </div>

                                        <strong>
                                            {formatMoneyFromMinor(
                                                stockValueByProduct.get(
                                                    product.id,
                                                ) ?? 0,
                                            )}
                                        </strong>
                                    </div>
                                ))}
                        </div>
                    )}
                </article>
            </section>
        </div>
    )
}

export default DashboardPage