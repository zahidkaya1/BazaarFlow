import { useMemo, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
    AlertTriangle,
    Boxes,
    PackagePlus,
    Search,
} from 'lucide-react'
import { inventoryService } from '../services/inventoryService'
import { productService } from '../services/productService'
import type {
    InventoryEntryType,
    InventoryLot,
} from '../types/inventoryLot'
import type { Product } from '../types/product'
import {
    formatMoneyFromMinor,
    parseMoneyToMinor,
} from '../utils/money'

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

function getEntryTypeLabel(
    entryType: InventoryEntryType,
): string {
    return entryType === 'opening'
        ? 'Açılış Stoku'
        : 'Stok Alımı'
}

function normalizeSearch(value: string): string {
    return value
        .trim()
        .toLocaleLowerCase('tr-TR')
}

function InventoryPage() {
    const data = useLiveQuery(
        async () => {
            const [products, lots] = await Promise.all([
                productService.getAll(),
                inventoryService.getAll(),
            ])

            return {
                products,
                lots,
            }
        },
        [],
        {
            products: [] as Product[],
            lots: [] as InventoryLot[],
        },
    )

    const products = data.products
    const lots = data.lots

    const [entryType, setEntryType] =
        useState<InventoryEntryType>('purchase')

    const [productId, setProductId] = useState('')

    const [purchaseDate, setPurchaseDate] = useState(
        getTodayDateValue(),
    )

    const [quantityReceived, setQuantityReceived] =
        useState('')

    const [unitCost, setUnitCost] = useState('')
    const [note, setNote] = useState('')

    const [stockSearch, setStockSearch] = useState('')
    const [historySearch, setHistorySearch] = useState('')

    const [
        showPassiveProducts,
        setShowPassiveProducts,
    ] = useState(false)

    const [
        showZeroStockProducts,
        setShowZeroStockProducts,
    ] = useState(false)

    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const activeProducts = useMemo(
        () =>
            products.filter(
                (product) => product.isActive,
            ),
        [products],
    )

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
            const remainingValue =
                lot.quantityRemaining *
                lot.unitCostMinor

            values.set(
                lot.productId,
                (values.get(lot.productId) ?? 0) +
                remainingValue,
            )
        }

        return values
    }, [lots])

    const totalQuantity = lots.reduce(
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
            products.filter((product) => {
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
            }),
        [products, stockByProduct],
    )

    const activeStockedProductCount =
        activeProducts.filter(
            (product) =>
                (stockByProduct.get(product.id) ?? 0) >
                0,
        ).length

    const filteredProducts = useMemo(() => {
        const query = normalizeSearch(stockSearch)

        return products
            .filter((product) => {
                if (
                    !showPassiveProducts &&
                    !product.isActive
                ) {
                    return false
                }

                const currentStock =
                    stockByProduct.get(product.id) ?? 0

                if (
                    !showZeroStockProducts &&
                    currentStock <= 0
                ) {
                    return false
                }

                if (!query) {
                    return true
                }

                const searchableText = normalizeSearch(
                    `${product.name} ${product.sku ?? ''}`,
                )

                return searchableText.includes(query)
            })
            .sort((first, second) => {
                const firstStock =
                    stockByProduct.get(first.id) ?? 0

                const secondStock =
                    stockByProduct.get(second.id) ?? 0

                const firstIsLow =
                    first.isActive &&
                    first.minimumStock > 0 &&
                    firstStock <= first.minimumStock

                const secondIsLow =
                    second.isActive &&
                    second.minimumStock > 0 &&
                    secondStock <= second.minimumStock

                if (firstIsLow !== secondIsLow) {
                    return firstIsLow ? -1 : 1
                }

                return first.name.localeCompare(
                    second.name,
                    'tr',
                )
            })
    }, [
        products,
        stockByProduct,
        stockSearch,
        showPassiveProducts,
        showZeroStockProducts,
    ])

    const filteredLots = useMemo(() => {
        const query = normalizeSearch(historySearch)

        if (!query) {
            return lots
        }

        return lots.filter((lot) => {
            const product = productMap.get(
                lot.productId,
            )

            const searchableText =
                normalizeSearch(
                    [
                        product?.name ?? '',
                        product?.sku ?? '',
                        lot.note ?? '',
                        lot.purchaseDate,
                        getEntryTypeLabel(lot.entryType),
                    ].join(' '),
                )

            return searchableText.includes(query)
        })
    }, [lots, productMap, historySearch])

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()

        setMessage('')
        setError('')

        try {
            const quantity = Number(
                quantityReceived,
            )

            if (
                !Number.isSafeInteger(quantity) ||
                quantity <= 0
            ) {
                throw new Error(
                    'Stok adedi sıfırdan büyük tam sayı olmalıdır.',
                )
            }

            const unitCostMinor =
                parseMoneyToMinor(unitCost)

            await inventoryService.create({
                productId,
                entryType,
                purchaseDate,
                quantityReceived: quantity,
                unitCostMinor,
                note,
            })

            setQuantityReceived('')
            setUnitCost('')
            setNote('')

            setMessage(
                entryType === 'opening'
                    ? 'Açılış stoku başarıyla kaydedildi.'
                    : 'Stok alımı başarıyla kaydedildi.',
            )
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Stok girişi kaydedilemedi.',
            )
        }
    }

    return (
        <div className="dashboard">
            <header className="page-header">
                <span className="page-eyebrow">
                    BazaarFlow
                </span>

                <h1>Stok</h1>

                <p>
                    Stok alımlarını, açılış
                    stoklarını ve eldeki ürünleri
                    parti bazında yönetin.
                </p>
            </header>

            {(message || error) && (
                <div
                    className={`form-message ${error
                        ? 'form-message-error'
                        : 'form-message-success'
                        }`}
                    role="status"
                >
                    {error || message}
                </div>
            )}

            <section className="inventory-summary-grid">
                <article className="summary-card">
                    <div className="summary-card-header">
                        <span className="summary-card-icon">
                            <Boxes
                                size={21}
                                strokeWidth={1.8}
                            />
                        </span>

                        <span className="summary-card-title">
                            Mevcut Stok
                        </span>
                    </div>

                    <strong className="summary-card-value">
                        {totalQuantity}
                    </strong>

                    <span className="summary-card-description">
                        Eldeki toplam ürün adedi
                    </span>
                </article>

                <article className="summary-card">
                    <div className="summary-card-header">
                        <span className="summary-card-icon">
                            <PackagePlus
                                size={21}
                                strokeWidth={1.8}
                            />
                        </span>

                        <span className="summary-card-title">
                            Stok Maliyeti
                        </span>
                    </div>

                    <strong className="summary-card-value">
                        {formatMoneyFromMinor(
                            totalInventoryValueMinor,
                        )}
                    </strong>

                    <span className="summary-card-description">
                        Eldeki ürünlerin toplam alış
                        maliyeti
                    </span>
                </article>

                <article className="summary-card">
                    <div className="summary-card-header">
                        <span
                            className={`summary-card-icon ${lowStockProducts.length > 0
                                ? 'summary-card-icon-warning'
                                : ''
                                }`}
                        >
                            <AlertTriangle
                                size={21}
                                strokeWidth={1.8}
                            />
                        </span>

                        <span className="summary-card-title">
                            Düşük Stok
                        </span>
                    </div>

                    <strong className="summary-card-value">
                        {lowStockProducts.length}
                    </strong>

                    <span className="summary-card-description">
                        Minimum seviyeye ulaşan aktif
                        ürün
                    </span>
                </article>

                <article className="summary-card">
                    <div className="summary-card-header">
                        <span className="summary-card-icon">
                            <Boxes
                                size={21}
                                strokeWidth={1.8}
                            />
                        </span>

                        <span className="summary-card-title">
                            Stokta Ürün
                        </span>
                    </div>

                    <strong className="summary-card-value">
                        {activeStockedProductCount}
                    </strong>

                    <span className="summary-card-description">
                        Stoğu bulunan aktif ürün çeşidi
                    </span>
                </article>
            </section>

            <section className="inventory-layout">
                <article className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Stok Girişi</h2>

                            <p>
                                Normal alım veya uygulama
                                öncesinden kalan açılış
                                stoku ekleyin.
                            </p>
                        </div>
                    </div>

                    <form
                        className="management-form"
                        onSubmit={handleSubmit}
                    >
                        <label className="form-field">
                            <span>Giriş türü</span>

                            <select
                                value={entryType}
                                onChange={(event) =>
                                    setEntryType(
                                        event.target
                                            .value as InventoryEntryType,
                                    )
                                }
                            >
                                <option value="purchase">
                                    Normal Stok Alımı
                                </option>

                                <option value="opening">
                                    Açılış Stoku
                                </option>
                            </select>
                        </label>

                        {entryType === 'opening' && (
                            <div className="inventory-info-box">
                                Açılış stoku, BazaarFlow'u
                                kullanmaya başlamadan önce
                                elinizde bulunan ürünleri
                                sisteme aktarmak içindir.
                            </div>
                        )}

                        <label className="form-field">
                            <span>Ürün</span>

                            <select
                                value={productId}
                                onChange={(event) =>
                                    setProductId(
                                        event.target.value,
                                    )
                                }
                                required
                            >
                                <option value="">
                                    Ürün seçin
                                </option>

                                {activeProducts.map(
                                    (product) => (
                                        <option
                                            key={product.id}
                                            value={product.id}
                                        >
                                            {product.name}
                                            {product.sku
                                                ? ` · ${product.sku}`
                                                : ''}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>

                        <label className="form-field">
                            <span>
                                {entryType === 'opening'
                                    ? 'Açılış tarihi'
                                    : 'Alış tarihi'}
                            </span>

                            <input
                                type="date"
                                value={purchaseDate}
                                onChange={(event) =>
                                    setPurchaseDate(
                                        event.target.value,
                                    )
                                }
                                required
                            />
                        </label>

                        <div className="form-row">
                            <label className="form-field">
                                <span>
                                    {entryType === 'opening'
                                        ? 'Mevcut adet'
                                        : 'Alınan adet'}
                                </span>

                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={quantityReceived}
                                    onChange={(event) =>
                                        setQuantityReceived(
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Örn. 30"
                                    required
                                />
                            </label>

                            <label className="form-field">
                                <span>Birim maliyet</span>

                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={unitCost}
                                    onChange={(event) =>
                                        setUnitCost(
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Örn. 35,00"
                                    required
                                />
                            </label>
                        </div>

                        <label className="form-field">
                            <span>Not</span>

                            <input
                                type="text"
                                value={note}
                                onChange={(event) =>
                                    setNote(event.target.value)
                                }
                                placeholder="İsteğe bağlı"
                            />
                        </label>

                        <button
                            className="primary-button"
                            type="submit"
                        >
                            <PackagePlus size={18} />

                            {entryType === 'opening'
                                ? 'Açılış Stoku Ekle'
                                : 'Stok Alımı Ekle'}
                        </button>
                    </form>
                </article>

                <article className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Mevcut Stoklar</h2>

                            <p>
                                Ürün bazında stok, maliyet
                                ve minimum stok seviyeleri.
                            </p>
                        </div>
                    </div>

                    <div className="inventory-stock-toolbar">
                        <label className="inventory-search-field">
                            <Search size={16} />

                            <input
                                type="search"
                                value={stockSearch}
                                onChange={(event) =>
                                    setStockSearch(
                                        event.target.value,
                                    )
                                }
                                placeholder="Ürün veya SKU ara..."
                            />
                        </label>

                        <div className="inventory-filter-options">
                            <label className="inventory-filter-option">
                                <input
                                    type="checkbox"
                                    checked={
                                        showPassiveProducts
                                    }
                                    onChange={(event) =>
                                        setShowPassiveProducts(
                                            event.target.checked,
                                        )
                                    }
                                />

                                <span>
                                    Pasif ürünleri göster
                                </span>
                            </label>

                            <label className="inventory-filter-option">
                                <input
                                    type="checkbox"
                                    checked={
                                        showZeroStockProducts
                                    }
                                    onChange={(event) =>
                                        setShowZeroStockProducts(
                                            event.target.checked,
                                        )
                                    }
                                />

                                <span>
                                    Sıfır stokları göster
                                </span>
                            </label>
                        </div>
                    </div>

                    {products.length === 0 ? (
                        <div className="empty-state empty-state-compact">
                            <div>
                                <strong>
                                    Henüz ürün bulunmuyor
                                </strong>

                                <p>
                                    Stok eklemek için önce bir
                                    ürün oluşturun.
                                </p>
                            </div>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="inventory-filter-empty">
                            <strong>
                                Filtreye uygun ürün bulunamadı
                            </strong>

                            <span>
                                Arama veya görünürlük
                                filtrelerini değiştirebilirsiniz.
                            </span>
                        </div>
                    ) : (
                        <div className="stock-list">
                            {filteredProducts.map(
                                (product) => {
                                    const currentStock =
                                        stockByProduct.get(
                                            product.id,
                                        ) ?? 0

                                    const stockValueMinor =
                                        stockValueByProduct.get(
                                            product.id,
                                        ) ?? 0

                                    const isLowStock =
                                        product.isActive &&
                                        product.minimumStock > 0 &&
                                        currentStock <=
                                        product.minimumStock

                                    return (
                                        <div
                                            key={product.id}
                                            className={`stock-list-item stock-list-item-detailed ${isLowStock
                                                ? 'stock-list-item-low'
                                                : ''
                                                }`}
                                        >
                                            <div className="stock-product-details">
                                                <div className="stock-product-title-row">
                                                    <strong>
                                                        {product.name}
                                                    </strong>

                                                    {product.sku && (
                                                        <span className="stock-product-sku">
                                                            {product.sku}
                                                        </span>
                                                    )}

                                                    {!product.isActive && (
                                                        <span className="stock-product-passive">
                                                            Pasif
                                                        </span>
                                                    )}

                                                    {isLowStock && (
                                                        <span className="stock-low-badge">
                                                            <AlertTriangle
                                                                size={12}
                                                            />
                                                            Düşük Stok
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="stock-product-meta">
                                                    <span>
                                                        Minimum stok:{' '}
                                                        <strong>
                                                            {
                                                                product.minimumStock
                                                            }
                                                        </strong>
                                                    </span>

                                                    <span>
                                                        Stok değeri:{' '}
                                                        <strong>
                                                            {formatMoneyFromMinor(
                                                                stockValueMinor,
                                                            )}
                                                        </strong>
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="stock-product-quantity">
                                                <strong>
                                                    {currentStock}
                                                </strong>

                                                <span>adet</span>
                                            </div>
                                        </div>
                                    )
                                },
                            )}
                        </div>
                    )}
                </article>
            </section>

            <section className="dashboard-panel inventory-lots-panel">
                <div className="panel-header inventory-history-header">
                    <div>
                        <h2>Stok Geçmişi</h2>

                        <p>
                            {filteredLots.length} /{' '}
                            {lots.length} stok kaydı
                            gösteriliyor.
                        </p>
                    </div>

                    <label className="inventory-search-field inventory-history-search">
                        <Search size={16} />

                        <input
                            type="search"
                            value={historySearch}
                            onChange={(event) =>
                                setHistorySearch(
                                    event.target.value,
                                )
                            }
                            placeholder="Geçmişte ara..."
                        />
                    </label>
                </div>

                {lots.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <PackagePlus
                                size={30}
                                strokeWidth={1.5}
                            />
                        </div>

                        <div>
                            <strong>
                                Henüz stok kaydı yok
                            </strong>

                            <p>
                                Normal stok alımı veya
                                açılış stoku
                                oluşturabilirsiniz.
                            </p>
                        </div>
                    </div>
                ) : filteredLots.length === 0 ? (
                    <div className="inventory-filter-empty">
                        <strong>
                            Aramayla eşleşen stok kaydı yok
                        </strong>

                        <span>
                            Ürün adı, SKU, not veya tarih
                            ile arayabilirsiniz.
                        </span>
                    </div>
                ) : (
                    <div className="product-table-wrapper">
                        <table className="product-table inventory-table">
                            <thead>
                                <tr>
                                    <th>Tür</th>
                                    <th>Tarih</th>
                                    <th>Ürün</th>
                                    <th>Giren</th>
                                    <th>Kalan</th>
                                    <th>Birim Maliyet</th>
                                    <th>Kalan Değer</th>
                                    <th>Not</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredLots.map((lot) => {
                                    const product =
                                        productMap.get(
                                            lot.productId,
                                        )

                                    return (
                                        <tr key={lot.id}>
                                            <td>
                                                <span
                                                    className={`inventory-type-badge ${lot.entryType ===
                                                        'opening'
                                                        ? 'inventory-type-opening'
                                                        : 'inventory-type-purchase'
                                                        }`}
                                                >
                                                    {getEntryTypeLabel(
                                                        lot.entryType,
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                {formatDate(
                                                    lot.purchaseDate,
                                                )}
                                            </td>

                                            <td>
                                                <div className="inventory-history-product">
                                                    <strong>
                                                        {product?.name ??
                                                            'Bilinmeyen ürün'}
                                                    </strong>

                                                    {product?.sku && (
                                                        <span>
                                                            {product.sku}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td>
                                                {lot.quantityReceived}
                                            </td>

                                            <td>
                                                {lot.quantityRemaining}
                                            </td>

                                            <td>
                                                {formatMoneyFromMinor(
                                                    lot.unitCostMinor,
                                                )}
                                            </td>

                                            <td>
                                                {formatMoneyFromMinor(
                                                    lot.quantityRemaining *
                                                    lot.unitCostMinor,
                                                )}
                                            </td>

                                            <td>
                                                {lot.note ?? '—'}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    )
}

export default InventoryPage