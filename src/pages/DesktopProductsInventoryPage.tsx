import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
    Boxes,
    ChevronRight,
    CircleAlert,
    Layers3,
    PackageCheck,
    PackagePlus,
    Pencil,
    Power,
    Search,
    SlidersHorizontal,
    Tags,
    Trash2,
    Warehouse,
    X,
} from 'lucide-react'

import {
    CategoryManagerDialog,
    ProductEditorDialog,
    StockAdjustmentDialog,
    StockEntryDialog,
    type ProductsInventoryFeedback,
} from '../components/productsInventory/ProductsInventoryDialogs'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { categoryService } from '../services/categoryService'
import { inventoryService } from '../services/inventoryService'
import { productService } from '../services/productService'
import type { Category } from '../types/category'
import type { InventoryLot } from '../types/inventoryLot'
import type { Product } from '../types/product'
import { formatDisplayDate } from '../utils/dateOnly'
import { formatMoneyFromMinor } from '../utils/money'
import {
    getProductStockLabel,
    getProductStockState,
    type ProductStockState,
} from '../utils/productStock'

type StockFilter =
    | 'all'
    | 'normal'
    | 'low'
    | 'out'
    | 'passive'

type DialogState =
    | { kind: 'new-product' }
    | { kind: 'edit-product'; productId: string }
    | { kind: 'stock-entry'; productId?: string }
    | { kind: 'stock-adjustment'; productId: string }
    | { kind: 'categories' }
    | null

type FeedbackState = {
    message: string
    tone: 'success' | 'error'
} | null

function normalizeSearch(value: string): string {
    return value
        .trim()
        .toLocaleLowerCase('tr-TR')
}

function getStatusClass(state: ProductStockState): string {
    return `pi-stock-status pi-stock-status-${state}`
}

function DesktopProductsInventoryPage() {
    const data = useLiveQuery(
        async () => {
            const [categories, products, lots] = await Promise.all([
                categoryService.getAll(),
                productService.getAll(),
                inventoryService.getAll(),
            ])

            return { categories, products, lots }
        },
        [],
        {
            categories: [] as Category[],
            products: [] as Product[],
            lots: [] as InventoryLot[],
        },
    )

    const { categories, products, lots } = data

    const [search, setSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('all')
    const [stockFilter, setStockFilter] =
        useState<StockFilter>('all')
    const [selectedProductId, setSelectedProductId] =
        useState<string | null>(null)
    const [dialog, setDialog] = useState<DialogState>(null)
    const [feedback, setFeedback] = useState<FeedbackState>(null)
    const [detailFeedback, setDetailFeedback] = useState<FeedbackState>(null)
    const [busyProductId, setBusyProductId] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const categoryMap = useMemo(
        () =>
            new Map(
                categories.map((category) => [category.id, category.name]),
            ),
        [categories],
    )

    const stockByProduct = useMemo(() => {
        const map = new Map<string, number>()

        for (const lot of lots) {
            map.set(
                lot.productId,
                (map.get(lot.productId) ?? 0) + lot.quantityRemaining,
            )
        }

        return map
    }, [lots])

    const stockValueByProduct = useMemo(() => {
        const map = new Map<string, number>()

        for (const lot of lots) {
            map.set(
                lot.productId,
                (map.get(lot.productId) ?? 0) +
                    lot.quantityRemaining * lot.unitCostMinor,
            )
        }

        return map
    }, [lots])

    const selectedProduct = selectedProductId
        ? products.find((product) => product.id === selectedProductId)
        : undefined

    const selectedLots = useMemo(
        () =>
            selectedProductId
                ? lots.filter(
                    (lot) =>
                        lot.productId === selectedProductId &&
                        lot.quantityRemaining > 0,
                )
                : [],
        [lots, selectedProductId],
    )

    const activeProductCount = products.filter(
        (product) => product.isActive,
    ).length
    const totalStock = lots.reduce(
        (total, lot) => total + lot.quantityRemaining,
        0,
    )
    const totalStockValueMinor = lots.reduce(
        (total, lot) =>
            total + lot.quantityRemaining * lot.unitCostMinor,
        0,
    )
    const lowStockCount = products.filter((product) => {
        if (!product.isActive) {
            return false
        }

        const stock = stockByProduct.get(product.id) ?? 0
        return getProductStockState(product, stock) !== 'normal'
    }).length

    const filteredProducts = useMemo(() => {
        const query = normalizeSearch(search)

        return products
            .filter((product) => {
                if (
                    categoryFilter !== 'all' &&
                    (product.categoryId ?? '') !== categoryFilter
                ) {
                    return false
                }

                const currentStock = stockByProduct.get(product.id) ?? 0
                const state = getProductStockState(product, currentStock)

                if (stockFilter === 'passive') {
                    if (product.isActive) {
                        return false
                    }
                } else {
                    if (!product.isActive) {
                        return false
                    }

                    if (
                        stockFilter !== 'all' &&
                        state !== stockFilter
                    ) {
                        return false
                    }
                }

                if (!query) {
                    return true
                }

                const searchable = normalizeSearch(
                    [
                        product.name,
                        product.sku ?? '',
                        product.categoryId
                            ? categoryMap.get(product.categoryId) ?? ''
                            : '',
                    ].join(' '),
                )

                return searchable.includes(query)
            })
            .sort((first, second) => {
                const firstStock = stockByProduct.get(first.id) ?? 0
                const secondStock = stockByProduct.get(second.id) ?? 0
                const firstState = getProductStockState(first, firstStock)
                const secondState = getProductStockState(second, secondStock)
                const priority: Record<ProductStockState, number> = {
                    out: 0,
                    low: 1,
                    normal: 2,
                }

                if (priority[firstState] !== priority[secondState]) {
                    return priority[firstState] - priority[secondState]
                }

                return first.name.localeCompare(second.name, 'tr-TR')
            })
    }, [
        products,
        search,
        categoryFilter,
        stockFilter,
        stockByProduct,
        categoryMap,
    ])

    const editingProduct =
        dialog?.kind === 'edit-product'
            ? products.find((product) => product.id === dialog.productId)
            : undefined

    const stockEntryProductId =
        dialog?.kind === 'stock-entry' ? dialog.productId : undefined

    const adjustmentProduct =
        dialog?.kind === 'stock-adjustment'
            ? products.find((product) => product.id === dialog.productId)
            : undefined

    const handleFeedback: ProductsInventoryFeedback = (
        message,
        tone = 'success',
    ) => {
        setFeedback({ message, tone })
    }

    function openProductDetails(productId: string) {
        setDetailFeedback(null)
        setSelectedProductId(productId)
    }

    async function toggleProduct(product: Product) {
        if (busyProductId) {
            return
        }

        setFeedback(null)
        setDetailFeedback(null)
        setBusyProductId(product.id)

        try {
            await productService.setActive(product.id, !product.isActive)
            const message = product.isActive
                ? 'Ürün pasife alındı.'
                : 'Ürün tekrar aktifleştirildi.'
            setDetailFeedback({ message, tone: 'success' })
            handleFeedback(message)
        } catch (caughtError) {
            const message = caughtError instanceof Error
                ? caughtError.message
                : 'Ürün durumu değiştirilemedi.'
            setDetailFeedback({ message, tone: 'error' })
            handleFeedback(message, 'error')
        } finally {
            setBusyProductId(null)
        }
    }

    async function requestDelete(product: Product) {
        if (busyProductId || isDeleting) {
            return
        }

        setFeedback(null)
        setBusyProductId(product.id)

        try {
            const check = await productService.getDeletionCheck(product.id)

            if (!check.canDelete) {
                throw new Error(
                    check.reason ?? 'Ürün kalıcı olarak silinemiyor.',
                )
            }

            setDeleteTarget(product)
        } catch (caughtError) {
            const message = caughtError instanceof Error
                ? caughtError.message
                : 'Ürün silme durumu kontrol edilemedi.'
            setDetailFeedback({ message, tone: 'error' })
            handleFeedback(message, 'error')
        } finally {
            setBusyProductId(null)
        }
    }

    async function confirmDelete() {
        if (!deleteTarget || isDeleting) {
            return
        }

        setIsDeleting(true)

        try {
            await productService.deletePermanently(deleteTarget.id)

            if (selectedProductId === deleteTarget.id) {
                setSelectedProductId(null)
            }

            handleFeedback('Ürün kalıcı olarak silindi.')
            setDeleteTarget(null)
        } catch (caughtError) {
            handleFeedback(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Ürün silinemedi.',
                'error',
            )
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="dashboard pi-page pi-desktop-page">
            <header className="pi-page-header">
                <div>
                    <span className="page-eyebrow">BazaarFlow</span>
                    <h1>Ürünler & Stok</h1>
                    <p>
                        Ürün kataloğunu, stok miktarlarını ve FIFO partilerini
                        tek merkezden yönetin.
                    </p>
                </div>

                <div className="pi-header-actions">
                    <button
                        type="button"
                        className="pi-button pi-button-secondary"
                        onClick={() => setDialog({ kind: 'categories' })}
                    >
                        <Tags size={17} />
                        Kategoriler
                    </button>
                    <button
                        type="button"
                        className="pi-button pi-button-secondary"
                        onClick={() => setDialog({ kind: 'stock-entry' })}
                    >
                        <PackagePlus size={17} />
                        Stok Girişi
                    </button>
                    <button
                        type="button"
                        className="pi-button pi-button-primary"
                        onClick={() => setDialog({ kind: 'new-product' })}
                    >
                        <Boxes size={17} />
                        Yeni Ürün
                    </button>
                </div>
            </header>

            {feedback && (
                <div
                    className={`form-message ${feedback.tone === 'error'
                        ? 'form-message-error'
                        : 'form-message-success'
                    }`}
                    role="status"
                >
                    {feedback.message}
                </div>
            )}

            <section className="pi-summary-grid">
                <article>
                    <span className="pi-summary-icon">
                        <Boxes size={19} />
                    </span>
                    <div>
                        <span>Aktif ürün</span>
                        <strong>{activeProductCount}</strong>
                    </div>
                </article>
                <article>
                    <span className="pi-summary-icon">
                        <PackageCheck size={19} />
                    </span>
                    <div>
                        <span>Toplam stok</span>
                        <strong>{totalStock} adet</strong>
                    </div>
                </article>
                <article>
                    <span className="pi-summary-icon pi-summary-icon-warning">
                        <CircleAlert size={19} />
                    </span>
                    <div>
                        <span>Düşük / tükenen</span>
                        <strong>{lowStockCount}</strong>
                    </div>
                </article>
                <article>
                    <span className="pi-summary-icon">
                        <Warehouse size={19} />
                    </span>
                    <div>
                        <span>Stok değeri</span>
                        <strong>
                            {formatMoneyFromMinor(totalStockValueMinor)}
                        </strong>
                    </div>
                </article>
            </section>

            <section className="dashboard-panel pi-products-panel">
                <div className="pi-toolbar">
                    <label className="pi-search-field">
                        <Search size={17} />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Ürün, SKU veya kategori ara..."
                        />
                    </label>

                    <label className="pi-filter-field">
                        <Tags size={15} />
                        <select
                            value={categoryFilter}
                            onChange={(event) =>
                                setCategoryFilter(event.target.value)
                            }
                        >
                            <option value="all">Tüm kategoriler</option>
                            {categories.map((category) => (
                                <option
                                    key={category.id}
                                    value={category.id}
                                >
                                    {category.name}
                                    {!category.isActive ? ' (Pasif)' : ''}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="pi-filter-field">
                        <SlidersHorizontal size={15} />
                        <select
                            value={stockFilter}
                            onChange={(event) =>
                                setStockFilter(
                                    event.target.value as StockFilter,
                                )
                            }
                        >
                            <option value="all">Aktif ürünler</option>
                            <option value="normal">Normal stok</option>
                            <option value="low">Düşük stok</option>
                            <option value="out">Tükenen</option>
                            <option value="passive">Pasif ürünler</option>
                        </select>
                    </label>
                </div>

                <div className="pi-table-meta">
                    <strong>{filteredProducts.length} ürün</strong>
                    <span>
                        Satıra tıklayarak FIFO partilerini ve ürün işlemlerini
                        açabilirsiniz.
                    </span>
                </div>

                {filteredProducts.length === 0 ? (
                    <div className="pi-empty-state">
                        <Boxes size={30} />
                        <strong>Bu filtrelerde ürün bulunamadı</strong>
                        <span>Aramayı veya stok filtresini değiştirebilirsiniz.</span>
                    </div>
                ) : (
                    <div className="pi-table-wrapper">
                        <table className="pi-product-table">
                            <thead>
                                <tr>
                                    <th>Ürün</th>
                                    <th>Kategori</th>
                                    <th>Satış</th>
                                    <th>Stok</th>
                                    <th>Min.</th>
                                    <th>Stok durumu</th>
                                    <th>İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((product) => {
                                    const currentStock =
                                        stockByProduct.get(product.id) ?? 0
                                    const state = getProductStockState(
                                        product,
                                        currentStock,
                                    )

                                    return (
                                        <tr
                                            key={product.id}
                                            className={!product.isActive
                                                ? 'is-passive'
                                                : ''}
                                            onClick={() =>
                                                openProductDetails(product.id)
                                            }
                                        >
                                            <td>
                                                <div className="pi-product-cell">
                                                    <span className="pi-product-avatar">
                                                        {product.name
                                                            .trim()
                                                            .charAt(0)
                                                            .toLocaleUpperCase('tr-TR') ||
                                                            'Ü'}
                                                    </span>
                                                    <div>
                                                        <strong>
                                                            {product.name}
                                                        </strong>
                                                        <span>
                                                            {product.sku ??
                                                                'SKU yok'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {product.categoryId
                                                    ? categoryMap.get(
                                                        product.categoryId,
                                                    ) ?? 'Bilinmeyen kategori'
                                                    : 'Kategorisiz'}
                                            </td>
                                            <td className="pi-money-cell">
                                                {formatMoneyFromMinor(
                                                    product.defaultSalePriceMinor,
                                                )}
                                            </td>
                                            <td>
                                                <strong className="pi-stock-number">
                                                    {currentStock}
                                                </strong>{' '}
                                                adet
                                            </td>
                                            <td>{product.minimumStock}</td>
                                            <td>
                                                {product.isActive ? (
                                                    <span
                                                        className={getStatusClass(
                                                            state,
                                                        )}
                                                    >
                                                        {getProductStockLabel(
                                                            state,
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="pi-stock-status pi-stock-status-passive">
                                                        Pasif
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <div
                                                    className="pi-row-actions"
                                                    onClick={(event) =>
                                                        event.stopPropagation()
                                                    }
                                                >
                                                    <button
                                                        type="button"
                                                        className="pi-table-action"
                                                        onClick={() =>
                                                            setDialog({
                                                                kind: 'stock-entry',
                                                                productId:
                                                                    product.id,
                                                            })
                                                        }
                                                        disabled={!product.isActive}
                                                    >
                                                        <PackagePlus size={14} />
                                                        Stok
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="pi-table-action"
                                                        onClick={() =>
                                                            openProductDetails(
                                                                product.id,
                                                            )
                                                        }
                                                    >
                                                        Detay
                                                        <ChevronRight size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {selectedProduct && (
                <>
                    <div
                        className="pi-drawer-backdrop"
                        onClick={() => setSelectedProductId(null)}
                    />
                    <aside
                        className="pi-product-drawer"
                        aria-label={`${selectedProduct.name} detayları`}
                    >
                        <header className="pi-drawer-header">
                            <div>
                                <span>Ürün detayı</span>
                                <h2>{selectedProduct.name}</h2>
                                <p>
                                    {selectedProduct.categoryId
                                        ? categoryMap.get(
                                            selectedProduct.categoryId,
                                        ) ?? 'Bilinmeyen kategori'
                                        : 'Kategorisiz'}
                                    {selectedProduct.sku
                                        ? ` • ${selectedProduct.sku}`
                                        : ''}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="pi-icon-button"
                                aria-label="Detayı kapat"
                                onClick={() => setSelectedProductId(null)}
                            >
                                <X size={19} />
                            </button>
                        </header>

                        <div className="pi-drawer-content">
                            {detailFeedback && (
                                <div
                                    className={`form-message ${detailFeedback.tone === 'error' ? 'form-message-error' : 'form-message-success'} pi-detail-feedback`}
                                    role="status"
                                >
                                    {detailFeedback.message}
                                </div>
                            )}
                            <div className="pi-drawer-metrics">
                                <article>
                                    <span>Satış fiyatı</span>
                                    <strong>
                                        {formatMoneyFromMinor(
                                            selectedProduct.defaultSalePriceMinor,
                                        )}
                                    </strong>
                                </article>
                                <article>
                                    <span>Mevcut stok</span>
                                    <strong>
                                        {stockByProduct.get(
                                            selectedProduct.id,
                                        ) ?? 0}{' '}
                                        adet
                                    </strong>
                                </article>
                                <article>
                                    <span>Minimum stok</span>
                                    <strong>
                                        {selectedProduct.minimumStock} adet
                                    </strong>
                                </article>
                                <article>
                                    <span>Stok değeri</span>
                                    <strong>
                                        {formatMoneyFromMinor(
                                            stockValueByProduct.get(
                                                selectedProduct.id,
                                            ) ?? 0,
                                        )}
                                    </strong>
                                </article>
                            </div>

                            <div className="pi-drawer-actions">
                                <button
                                    type="button"
                                    className="pi-button pi-button-primary"
                                    disabled={!selectedProduct.isActive}
                                    onClick={() =>
                                        setDialog({
                                            kind: 'stock-entry',
                                            productId: selectedProduct.id,
                                        })
                                    }
                                >
                                    <PackagePlus size={16} />
                                    Stok Ekle
                                </button>
                                <button
                                    type="button"
                                    className="pi-button pi-button-secondary"
                                    onClick={() =>
                                        setDialog({
                                            kind: 'stock-adjustment',
                                            productId: selectedProduct.id,
                                        })
                                    }
                                >
                                    <SlidersHorizontal size={16} />
                                    Stok Düzelt
                                </button>
                                <button
                                    type="button"
                                    className="pi-button pi-button-secondary"
                                    onClick={() =>
                                        setDialog({
                                            kind: 'edit-product',
                                            productId: selectedProduct.id,
                                        })
                                    }
                                >
                                    <Pencil size={16} />
                                    Ürünü Düzenle
                                </button>
                            </div>

                            <section className="pi-lot-section">
                                <div className="pi-section-heading">
                                    <div>
                                        <span>FIFO</span>
                                        <h3>Aktif stok partileri</h3>
                                    </div>
                                    <Layers3 size={19} />
                                </div>

                                {selectedLots.length === 0 ? (
                                    <div className="pi-empty-compact">
                                        Bu ürün için kullanılabilir stok partisi yok.
                                    </div>
                                ) : (
                                    <div className="pi-lot-list">
                                        {selectedLots.map((lot, index) => (
                                            <article key={lot.id}>
                                                <span className="pi-lot-order">
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <strong>
                                                        {lot.quantityRemaining}
                                                        {' / '}
                                                        {lot.quantityReceived}{' '}
                                                        adet
                                                    </strong>
                                                    <span>
                                                        {formatDisplayDate(
                                                            lot.purchaseDate,
                                                        )}
                                                        {' • '}
                                                        {lot.entryType ===
                                                        'opening'
                                                            ? 'Açılış'
                                                            : lot.entryType ===
                                                                'adjustment'
                                                              ? 'Düzeltme'
                                                              : 'Alış'}
                                                    </span>
                                                </div>
                                                <strong>
                                                    {formatMoneyFromMinor(
                                                        lot.unitCostMinor,
                                                    )}
                                                </strong>
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </section>

                            <section className="pi-danger-zone">
                                <div>
                                    <strong>Ürün durumu</strong>
                                    <span>
                                        Kullanılmış ürünler kalıcı silinmez;
                                        geçmiş kayıtları korumak için pasife
                                        alınır.
                                    </span>
                                </div>
                                <div className="pi-danger-actions">
                                    <button
                                        type="button"
                                        className="pi-button pi-button-secondary"
                                        disabled={busyProductId !== null}
                                        onClick={() =>
                                            void toggleProduct(selectedProduct)
                                        }
                                    >
                                        <Power size={16} />
                                        {selectedProduct.isActive
                                            ? 'Pasife Al'
                                            : 'Aktifleştir'}
                                    </button>
                                    <button
                                        type="button"
                                        className="pi-button pi-button-danger"
                                        disabled={busyProductId !== null}
                                        onClick={() =>
                                            void requestDelete(selectedProduct)
                                        }
                                    >
                                        <Trash2 size={16} />
                                        Sil
                                    </button>
                                </div>
                            </section>
                        </div>
                    </aside>
                </>
            )}

            {dialog?.kind === 'new-product' && (
                <ProductEditorDialog
                    key="new-product"
                    categories={categories}
                    onClose={() => setDialog(null)}
                    onFeedback={handleFeedback}
                />
            )}

            {dialog?.kind === 'edit-product' && editingProduct && (
                <ProductEditorDialog
                    key={editingProduct.id}
                    product={editingProduct}
                    categories={categories}
                    onClose={() => setDialog(null)}
                    onFeedback={handleFeedback}
                />
            )}

            {dialog?.kind === 'stock-entry' && (
                <StockEntryDialog
                    key={`stock-${stockEntryProductId ?? 'all'}`}
                    products={products}
                    initialProductId={stockEntryProductId}
                    onClose={() => setDialog(null)}
                    onFeedback={handleFeedback}
                />
            )}

            {dialog?.kind === 'stock-adjustment' && adjustmentProduct && (
                <StockAdjustmentDialog
                    key={`adjust-${adjustmentProduct.id}`}
                    product={adjustmentProduct}
                    currentStock={
                        stockByProduct.get(adjustmentProduct.id) ?? 0
                    }
                    onClose={() => setDialog(null)}
                    onFeedback={handleFeedback}
                />
            )}

            {dialog?.kind === 'categories' && (
                <CategoryManagerDialog
                    categories={categories}
                    onClose={() => setDialog(null)}
                    onFeedback={handleFeedback}
                />
            )}

            <ConfirmDialog
                open={deleteTarget !== null}
                title="Ürünü kalıcı olarak sil?"
                description={
                    deleteTarget
                        ? `“${deleteTarget.name}” hiç kullanılmadığı için kalıcı olarak silinebilir. Bu işlem geri alınamaz.`
                        : ''
                }
                confirmLabel="Kalıcı Olarak Sil"
                pendingLabel="Siliniyor..."
                tone="danger"
                isConfirming={isDeleting}
                onConfirm={confirmDelete}
                onCancel={() => {
                    if (!isDeleting) {
                        setDeleteTarget(null)
                    }
                }}
            />
        </div>
    )
}

export default DesktopProductsInventoryPage
