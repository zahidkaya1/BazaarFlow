import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
    Boxes,
    ChevronRight,
    Layers3,
    PackagePlus,
    Pencil,
    Power,
    Search,
    SlidersHorizontal,
    Tags,
    Trash2,
    X,
} from 'lucide-react'

import MobilePageHeader from '../components/mobile/MobilePageHeader'
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

type MobileFilter = 'all' | 'low' | 'out' | 'passive'

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
    return value.trim().toLocaleLowerCase('tr-TR')
}

function statusClass(state: ProductStockState): string {
    return `pi-stock-status pi-stock-status-${state}`
}

function MobileProductsInventoryPage() {
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
    const [filter, setFilter] = useState<MobileFilter>('all')
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

    const filteredProducts = useMemo(() => {
        const query = normalizeSearch(search)

        return products
            .filter((product) => {
                const stock = stockByProduct.get(product.id) ?? 0
                const state = getProductStockState(product, stock)

                if (filter === 'passive') {
                    if (product.isActive) {
                        return false
                    }
                } else {
                    if (!product.isActive) {
                        return false
                    }

                    if (filter === 'low' && state !== 'low') {
                        return false
                    }

                    if (filter === 'out' && state !== 'out') {
                        return false
                    }
                }

                if (!query) {
                    return true
                }

                return normalizeSearch(
                    [
                        product.name,
                        product.sku ?? '',
                        product.categoryId
                            ? categoryMap.get(product.categoryId) ?? ''
                            : '',
                    ].join(' '),
                ).includes(query)
            })
            .sort((first, second) =>
                first.name.localeCompare(second.name, 'tr-TR'),
            )
    }, [products, search, filter, stockByProduct, categoryMap])

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

        setBusyProductId(product.id)
        setFeedback(null)

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

        setBusyProductId(product.id)
        setFeedback(null)

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

            setDeleteTarget(null)
            handleFeedback('Ürün kalıcı olarak silindi.')
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

    const totalStock = lots.reduce(
        (total, lot) => total + lot.quantityRemaining,
        0,
    )

    return (
        <div className="mobile-page-shell mobile-screen mobile-fixed-list-page mpi-page">
            <MobilePageHeader title="Ürünler & Stok" />

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

            <section className="mpi-hero">
                <div>
                    <strong>{products.length} ürün</strong>
                    <small>{totalStock} adet toplam stok</small>
                </div>
                <button
                    type="button"
                    className="mpi-category-button"
                    onClick={() => setDialog({ kind: 'categories' })}
                    aria-label="Kategorileri yönet"
                >
                    <Tags size={19} />
                </button>
            </section>

            <section className="mpi-actions">
                <button
                    type="button"
                    className="mpi-action-primary"
                    onClick={() => setDialog({ kind: 'new-product' })}
                >
                    <Boxes size={18} />
                    Yeni Ürün
                </button>
                <button
                    type="button"
                    className="mpi-action-secondary"
                    onClick={() => setDialog({ kind: 'stock-entry' })}
                >
                    <PackagePlus size={18} />
                    Stok Ekle
                </button>
            </section>

            <label className="mpi-search">
                <Search size={17} />
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Ürün, SKU veya kategori ara"
                />
            </label>

            <div className="mpi-filter-strip" role="group" aria-label="Ürün filtresi">
                {([
                    ['all', 'Tümü'],
                    ['low', 'Düşük'],
                    ['out', 'Tükendi'],
                    ['passive', 'Pasif'],
                ] as const).map(([value, label]) => (
                    <button
                        key={value}
                        type="button"
                        className={filter === value ? 'is-active' : ''}
                        onClick={() => setFilter(value)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <section className="mpi-list">
                {filteredProducts.length === 0 ? (
                    <div className="mpi-empty">
                        <Boxes size={28} />
                        <strong>Ürün bulunamadı</strong>
                        <span>Aramayı veya filtreyi değiştirebilirsiniz.</span>
                    </div>
                ) : (
                    filteredProducts.map((product) => {
                        const currentStock = stockByProduct.get(product.id) ?? 0
                        const state = getProductStockState(
                            product,
                            currentStock,
                        )

                        return (
                            <article
                                key={product.id}
                                className={`mpi-product-card ${!product.isActive ? 'is-passive' : ''}`}
                            >
                                <button
                                    type="button"
                                    className="mpi-card-main"
                                    onClick={() =>
                                        openProductDetails(product.id)
                                    }
                                >
                                    <div className="mpi-card-heading">
                                        <div className="mpi-card-avatar">
                                            {product.name
                                                .trim()
                                                .charAt(0)
                                                .toLocaleUpperCase('tr-TR') || 'Ü'}
                                        </div>
                                        <div>
                                            <strong>{product.name}</strong>
                                            <span>
                                                {product.categoryId
                                                    ? categoryMap.get(
                                                        product.categoryId,
                                                    ) ?? 'Bilinmeyen kategori'
                                                    : 'Kategorisiz'}
                                                {product.sku
                                                    ? ` • ${product.sku}`
                                                    : ''}
                                            </span>
                                        </div>
                                        <ChevronRight size={18} />
                                    </div>

                                    <div className="mpi-card-metrics">
                                        <div>
                                            <span>Satış</span>
                                            <strong>
                                                {formatMoneyFromMinor(
                                                    product.defaultSalePriceMinor,
                                                )}
                                            </strong>
                                        </div>
                                        <div>
                                            <span>Stok</span>
                                            <strong>{currentStock} adet</strong>
                                        </div>
                                        <div>
                                            <span>Durum</span>
                                            {product.isActive ? (
                                                <strong
                                                    className={statusClass(state)}
                                                >
                                                    {getProductStockLabel(state)}
                                                </strong>
                                            ) : (
                                                <strong className="pi-stock-status pi-stock-status-passive">
                                                    Pasif
                                                </strong>
                                            )}
                                        </div>
                                    </div>
                                </button>

                                <div className="mpi-card-actions">
                                    <button
                                        type="button"
                                        disabled={!product.isActive}
                                        onClick={() =>
                                            setDialog({
                                                kind: 'stock-entry',
                                                productId: product.id,
                                            })
                                        }
                                    >
                                        <PackagePlus size={16} />
                                        Stok Ekle
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openProductDetails(product.id)
                                        }
                                    >
                                        Detay
                                        <ChevronRight size={15} />
                                    </button>
                                </div>
                            </article>
                        )
                    })
                )}
            </section>

            {selectedProduct && (
                <div
                    className="mpi-sheet-backdrop"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setSelectedProductId(null)
                        }
                    }}
                >
                    <section
                        className="mpi-detail-sheet"
                        role="dialog"
                        aria-modal="true"
                        aria-label={`${selectedProduct.name} detayları`}
                    >
                        <div className="mpi-sheet-handle" />
                        <header className="mpi-sheet-header">
                            <div>
                                <span>ÜRÜN DETAYI</span>
                                <h2>{selectedProduct.name}</h2>
                                <p>
                                    {selectedProduct.categoryId
                                        ? categoryMap.get(
                                            selectedProduct.categoryId,
                                        ) ?? 'Bilinmeyen kategori'
                                        : 'Kategorisiz'}
                                </p>
                            </div>
                            <button
                                type="button"
                                className="pi-icon-button"
                                onClick={() => setSelectedProductId(null)}
                                aria-label="Detayı kapat"
                            >
                                <X size={19} />
                            </button>
                        </header>

                        <div className="mpi-sheet-scroll">
                            {detailFeedback && (
                                <div
                                    className={`form-message ${detailFeedback.tone === 'error' ? 'form-message-error' : 'form-message-success'} pi-detail-feedback`}
                                    role="status"
                                >
                                    {detailFeedback.message}
                                </div>
                            )}
                            <div className="mpi-detail-metrics">
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
                                    <span>Minimum</span>
                                    <strong>
                                        {selectedProduct.minimumStock} adet
                                    </strong>
                                </article>
                                <article>
                                    <span>Ürün durumu</span>
                                    <strong>
                                        {selectedProduct.isActive
                                            ? 'Aktif'
                                            : 'Pasif'}
                                    </strong>
                                </article>
                            </div>

                            <div className="mpi-detail-actions">
                                <button
                                    type="button"
                                    className="mpi-action-primary"
                                    disabled={!selectedProduct.isActive}
                                    onClick={() =>
                                        setDialog({
                                            kind: 'stock-entry',
                                            productId: selectedProduct.id,
                                        })
                                    }
                                >
                                    <PackagePlus size={17} />
                                    Stok Ekle
                                </button>
                                <button
                                    type="button"
                                    className="mpi-action-secondary"
                                    onClick={() =>
                                        setDialog({
                                            kind: 'stock-adjustment',
                                            productId: selectedProduct.id,
                                        })
                                    }
                                >
                                    <SlidersHorizontal size={17} />
                                    Düzelt
                                </button>
                            </div>

                            <section className="mpi-lots">
                                <div className="mpi-section-heading">
                                    <div>
                                        <span>FIFO</span>
                                        <strong>Aktif stok partileri</strong>
                                    </div>
                                    <Layers3 size={18} />
                                </div>

                                {selectedLots.length === 0 ? (
                                    <div className="pi-empty-compact">
                                        Kullanılabilir stok partisi yok.
                                    </div>
                                ) : (
                                    selectedLots.map((lot, index) => (
                                        <article key={lot.id}>
                                            <span>{index + 1}</span>
                                            <div>
                                                <strong>
                                                    {lot.quantityRemaining} adet
                                                </strong>
                                                <small>
                                                    {formatDisplayDate(
                                                        lot.purchaseDate,
                                                    )}
                                                    {' • '}
                                                    {formatMoneyFromMinor(
                                                        lot.unitCostMinor,
                                                    )}
                                                </small>
                                            </div>
                                        </article>
                                    ))
                                )}
                            </section>

                            <section className="mpi-manage-section">
                                <span>ÜRÜN İŞLEMLERİ</span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setDialog({
                                            kind: 'edit-product',
                                            productId: selectedProduct.id,
                                        })
                                    }
                                >
                                    <Pencil size={17} />
                                    Ürünü Düzenle
                                    <ChevronRight size={16} />
                                </button>
                                <button
                                    type="button"
                                    disabled={busyProductId !== null}
                                    onClick={() =>
                                        void toggleProduct(selectedProduct)
                                    }
                                >
                                    <Power size={17} />
                                    {selectedProduct.isActive
                                        ? 'Pasife Al'
                                        : 'Aktifleştir'}
                                    <ChevronRight size={16} />
                                </button>
                                <button
                                    type="button"
                                    className="is-danger"
                                    disabled={busyProductId !== null}
                                    onClick={() =>
                                        void requestDelete(selectedProduct)
                                    }
                                >
                                    <Trash2 size={17} />
                                    Kalıcı Sil
                                    <ChevronRight size={16} />
                                </button>
                            </section>
                        </div>
                    </section>
                </div>
            )}

            {dialog?.kind === 'new-product' && (
                <ProductEditorDialog
                    key="mobile-new-product"
                    categories={categories}
                    onClose={() => setDialog(null)}
                    onFeedback={handleFeedback}
                />
            )}

            {dialog?.kind === 'edit-product' && editingProduct && (
                <ProductEditorDialog
                    key={`mobile-edit-${editingProduct.id}`}
                    product={editingProduct}
                    categories={categories}
                    onClose={() => setDialog(null)}
                    onFeedback={handleFeedback}
                />
            )}

            {dialog?.kind === 'stock-entry' && (
                <StockEntryDialog
                    key={`mobile-stock-${stockEntryProductId ?? 'all'}`}
                    products={products}
                    initialProductId={stockEntryProductId}
                    onClose={() => setDialog(null)}
                    onFeedback={handleFeedback}
                />
            )}

            {dialog?.kind === 'stock-adjustment' && adjustmentProduct && (
                <StockAdjustmentDialog
                    key={`mobile-adjust-${adjustmentProduct.id}`}
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

export default MobileProductsInventoryPage
