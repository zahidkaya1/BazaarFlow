import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
    Minus,
    Percent,
    Plus,
    ShoppingCart,
    Trash2,
    X,
    Zap,
} from 'lucide-react'
import { fifoService } from '../services/fifoService'
import { inventoryService } from '../services/inventoryService'
import { productService } from '../services/productService'
import { salesService } from '../services/salesService'
import type { InventoryLot } from '../types/inventoryLot'
import type { Product } from '../types/product'
import {
    formatMoneyFromMinor,
    parseMoneyToMinor,
} from '../utils/money'

type QuickSaleCartEntry = {
    quantity: number
    actualUnitPriceMinor: number
    discountReason?: string
}

type QuickSaleCart = Record<string, QuickSaleCartEntry>

function getTodayDateValue(): string {
    const now = new Date()

    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

function formatMoneyInput(minor: number): string {
    return (minor / 100).toFixed(2).replace('.', ',')
}

function QuickSalePage() {
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

    const [cart, setCart] = useState<QuickSaleCart>({})
    const [isDiscountPanelOpen, setIsDiscountPanelOpen] = useState(false)
    const [discountProductId, setDiscountProductId] = useState('')
    const [discountPrice, setDiscountPrice] = useState('')
    const [discountReason, setDiscountReason] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const activeProducts = useMemo(
        () =>
            data.products
                .filter((product) => product.isActive)
                .slice(0, 10),
        [data.products],
    )

    const stockByProduct = useMemo(() => {
        const result = new Map<string, number>()

        for (const lot of data.lots) {
            result.set(
                lot.productId,
                (result.get(lot.productId) ?? 0) + lot.quantityRemaining,
            )
        }

        return result
    }, [data.lots])

    const productMap = useMemo(
        () =>
            new Map(
                activeProducts.map((product) => [product.id, product]),
            ),
        [activeProducts],
    )

    const cartItems = useMemo(
        () =>
            Object.entries(cart)
                .map(([productId, entry]) => {
                    const product = productMap.get(productId)

                    if (!product || entry.quantity <= 0) {
                        return null
                    }

                    return {
                        product,
                        entry,
                    }
                })
                .filter(
                    (
                        item,
                    ): item is {
                        product: Product
                        entry: QuickSaleCartEntry
                    } => item !== null,
                ),
        [cart, productMap],
    )

    const totalQuantity = cartItems.reduce(
        (total, item) => total + item.entry.quantity,
        0,
    )

    const listTotalMinor = cartItems.reduce(
        (total, item) =>
            total +
            item.entry.quantity * item.product.defaultSalePriceMinor,
        0,
    )

    const totalMinor = cartItems.reduce(
        (total, item) =>
            total + item.entry.quantity * item.entry.actualUnitPriceMinor,
        0,
    )

    const discountTotalMinor = Math.max(0, listTotalMinor - totalMinor)

    const selectedDiscountProduct = productMap.get(discountProductId)

    function clearFeedback() {
        setMessage('')
        setError('')
    }

    function addProduct(product: Product) {
        clearFeedback()

        const stock = stockByProduct.get(product.id) ?? 0

        setCart((current) => {
            const currentEntry = current[product.id]
            const currentQuantity = currentEntry?.quantity ?? 0

            if (stock <= 0 || currentQuantity >= stock) {
                return current
            }

            return {
                ...current,
                [product.id]: {
                    quantity: currentQuantity + 1,
                    actualUnitPriceMinor:
                        currentEntry?.actualUnitPriceMinor ??
                        product.defaultSalePriceMinor,
                    discountReason: currentEntry?.discountReason,
                },
            }
        })
    }

    function decreaseProduct(productId: string) {
        clearFeedback()

        setCart((current) => {
            const currentEntry = current[productId]

            if (!currentEntry) {
                return current
            }

            if (currentEntry.quantity <= 1) {
                const next = { ...current }

                delete next[productId]

                return next
            }

            return {
                ...current,
                [productId]: {
                    ...currentEntry,
                    quantity: currentEntry.quantity - 1,
                },
            }
        })
    }

    function removeProduct(productId: string) {
        clearFeedback()

        setCart((current) => {
            const next = { ...current }

            delete next[productId]

            return next
        })
    }

    function closeDiscountPanel() {
        setIsDiscountPanelOpen(false)
        setDiscountProductId('')
        setDiscountPrice('')
        setDiscountReason('')
    }

    function clearCart() {
        clearFeedback()
        setCart({})
        closeDiscountPanel()
    }

    function loadDiscountDraft(productId: string) {
        const product = productMap.get(productId)
        const entry = cart[productId]

        if (!product || !entry) {
            return
        }

        setDiscountProductId(productId)
        setDiscountPrice(formatMoneyInput(entry.actualUnitPriceMinor))
        setDiscountReason(entry.discountReason ?? '')
    }

    function openDiscountPanel() {
        clearFeedback()

        const firstItem = cartItems[0]

        if (!firstItem) {
            return
        }

        loadDiscountDraft(firstItem.product.id)
        setIsDiscountPanelOpen(true)
    }

    function saveSpecialPrice() {
        clearFeedback()

        try {
            if (!selectedDiscountProduct) {
                throw new Error('Özel fiyat uygulanacak ürünü seçin.')
            }

            const currentEntry = cart[selectedDiscountProduct.id]

            if (!currentEntry) {
                throw new Error('Seçilen ürün sepette bulunamadı.')
            }

            const actualUnitPriceMinor = parseMoneyToMinor(discountPrice)

            setCart((current) => ({
                ...current,
                [selectedDiscountProduct.id]: {
                    ...currentEntry,
                    actualUnitPriceMinor,
                    discountReason: discountReason.trim() || undefined,
                },
            }))

            closeDiscountPanel()
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Özel fiyat uygulanamadı.',
            )
        }
    }

    function resetSelectedSpecialPrice() {
        clearFeedback()

        if (!selectedDiscountProduct) {
            return
        }

        const currentEntry = cart[selectedDiscountProduct.id]

        if (!currentEntry) {
            return
        }

        setCart((current) => ({
            ...current,
            [selectedDiscountProduct.id]: {
                ...currentEntry,
                actualUnitPriceMinor:
                    selectedDiscountProduct.defaultSalePriceMinor,
                discountReason: undefined,
            },
        }))

        setDiscountPrice(
            formatMoneyInput(selectedDiscountProduct.defaultSalePriceMinor),
        )
        setDiscountReason('')
    }

    async function completeSale() {
        clearFeedback()

        if (isSaving) {
            return
        }

        try {
            if (cartItems.length === 0) {
                throw new Error(
                    'Satışı tamamlamak için sepete ürün ekleyin.',
                )
            }

            for (const { product, entry } of cartItems) {
                const currentStock = stockByProduct.get(product.id) ?? 0

                if (entry.quantity > currentStock) {
                    throw new Error(
                        `${product.name} için yeterli stok bulunmuyor.`,
                    )
                }
            }

            setIsSaving(true)

            const saleDate = getTodayDateValue()

            const items = cartItems.map(({ product, entry }) => ({
                productId: product.id,
                quantity: entry.quantity,
                listUnitPriceMinor: product.defaultSalePriceMinor,
                actualUnitPriceMinor: entry.actualUnitPriceMinor,
                discountReason: entry.discountReason,
            }))

            /*
             * POS ekranı ayrı bir satış motoru oluşturmaz.
             * Normal satış ekranıyla aynı FIFO kontrolünü ve aynı
             * salesService kaydını kullanır.
             */
            await fifoService.previewSale(
                saleDate,
                items.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                })),
            )

            await salesService.create({
                saleDate,
                items,
            })

            setCart({})
            closeDiscountPanel()

            setMessage(
                `Satış tamamlandı • ${totalQuantity} adet • ${formatMoneyFromMinor(
                    totalMinor,
                )}`,
            )
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Satış tamamlanamadı.',
            )
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="dashboard quick-sale-page">
            <header className="page-header quick-sale-header">
                <div>
                    <span className="page-eyebrow">BazaarFlow POS</span>
                    <h1>Hızlı Satış</h1>
                    <p>
                        Ürüne dokunun, sepete ekleyin ve satışınızı hızlıca
                        tamamlayın.
                    </p>
                </div>

                <div className="quick-sale-header-badge">
                    <Zap size={18} />
                    <span>{totalQuantity} ürün</span>
                </div>
            </header>

            {(message || error) && (
                <div
                    className={`form-message ${error ? 'form-message-error' : 'form-message-success'
                        }`}
                    role="status"
                >
                    {error || message}
                </div>
            )}

            <div className="quick-sale-layout">
                <section className="quick-sale-products">
                    <div className="quick-sale-section-header">
                        <div>
                            <h2>Ürünler</h2>
                            <p>Her dokunuş sepete 1 adet ekler.</p>
                        </div>

                        <span>{activeProducts.length}/10</span>
                    </div>

                    {activeProducts.length === 0 ? (
                        <div className="quick-sale-empty">
                            <ShoppingCart size={34} />
                            <strong>Aktif ürün bulunamadı</strong>
                            <span>
                                Önce Ürünler ekranından aktif ürün ekleyin.
                            </span>
                        </div>
                    ) : (
                        <div className="quick-sale-product-grid">
                            {activeProducts.map((product) => {
                                const stock =
                                    stockByProduct.get(product.id) ?? 0
                                const cartQuantity =
                                    cart[product.id]?.quantity ?? 0
                                const unavailable = stock <= 0
                                const reachedStock = cartQuantity >= stock

                                return (
                                    <button
                                        key={product.id}
                                        type="button"
                                        className={`quick-sale-product-button ${unavailable
                                            ? 'quick-sale-product-button-disabled'
                                            : ''
                                            }`}
                                        disabled={unavailable || reachedStock}
                                        onClick={() => addProduct(product)}
                                    >
                                        {cartQuantity > 0 && (
                                            <span className="quick-sale-product-count">
                                                ×{cartQuantity}
                                            </span>
                                        )}

                                        <strong>{product.name}</strong>

                                        {product.sku && (
                                            <small>{product.sku}</small>
                                        )}

                                        <span className="quick-sale-product-price">
                                            {formatMoneyFromMinor(
                                                product.defaultSalePriceMinor,
                                            )}
                                        </span>

                                        <span
                                            className={`quick-sale-product-stock ${stock <= 0
                                                ? 'quick-sale-product-stock-empty'
                                                : ''
                                                }`}
                                        >
                                            {stock > 0
                                                ? `${stock} stok`
                                                : 'Stok yok'}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </section>

                <aside className="quick-sale-cart">
                    <div className="quick-sale-section-header">
                        <div>
                            <h2>Sepet</h2>
                            <p>Satış özeti</p>
                        </div>

                        <ShoppingCart size={20} />
                    </div>

                    {cartItems.length === 0 ? (
                        <div className="quick-sale-cart-empty">
                            <ShoppingCart size={34} strokeWidth={1.5} />
                            <strong>Sepet boş</strong>
                            <span>
                                Satışa başlamak için bir ürüne dokunun.
                            </span>
                        </div>
                    ) : (
                        <div className="quick-sale-cart-items">
                            {cartItems.map(({ product, entry }) => {
                                const stock =
                                    stockByProduct.get(product.id) ?? 0
                                const hasSpecialPrice =
                                    entry.actualUnitPriceMinor !==
                                    product.defaultSalePriceMinor

                                return (
                                    <article
                                        key={product.id}
                                        className="quick-sale-cart-item"
                                    >
                                        <div className="quick-sale-cart-item-info">
                                            <div>
                                                <strong>{product.name}</strong>

                                                {hasSpecialPrice && (
                                                    <span className="quick-sale-special-price-badge">
                                                        Özel fiyat
                                                    </span>
                                                )}
                                            </div>

                                            <span>
                                                {formatMoneyFromMinor(
                                                    entry.actualUnitPriceMinor,
                                                )}{' '}
                                                / adet
                                            </span>
                                        </div>

                                        {entry.discountReason && (
                                            <div className="quick-sale-discount-reason">
                                                {entry.discountReason}
                                            </div>
                                        )}

                                        <div className="quick-sale-cart-item-bottom">
                                            <div className="quick-sale-quantity-control">
                                                <button
                                                    type="button"
                                                    aria-label={`${product.name} azalt`}
                                                    onClick={() =>
                                                        decreaseProduct(
                                                            product.id,
                                                        )
                                                    }
                                                >
                                                    <Minus size={16} />
                                                </button>

                                                <strong>
                                                    {entry.quantity}
                                                </strong>

                                                <button
                                                    type="button"
                                                    aria-label={`${product.name} artır`}
                                                    disabled={
                                                        entry.quantity >= stock
                                                    }
                                                    onClick={() =>
                                                        addProduct(product)
                                                    }
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>

                                            <strong className="quick-sale-line-total">
                                                {formatMoneyFromMinor(
                                                    entry.actualUnitPriceMinor *
                                                    entry.quantity,
                                                )}
                                            </strong>

                                            <button
                                                type="button"
                                                className="quick-sale-remove-button"
                                                aria-label={`${product.name} sepetten çıkar`}
                                                onClick={() =>
                                                    removeProduct(product.id)
                                                }
                                            >
                                                <Trash2 size={17} />
                                            </button>
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    )}

                    <div className="quick-sale-cart-footer">
                        <div className="quick-sale-total-row">
                            <span>Toplam adet</span>
                            <strong>{totalQuantity}</strong>
                        </div>

                        {discountTotalMinor > 0 && (
                            <div className="quick-sale-discount-total">
                                <span>İndirim</span>
                                <strong>
                                    -
                                    {formatMoneyFromMinor(
                                        discountTotalMinor,
                                    )}
                                </strong>
                            </div>
                        )}

                        <div className="quick-sale-grand-total">
                            <span>TOPLAM</span>
                            <strong>
                                {formatMoneyFromMinor(totalMinor)}
                            </strong>
                        </div>

                        <button
                            type="button"
                            className="quick-sale-discount-button"
                            disabled={cartItems.length === 0 || isSaving}
                            onClick={openDiscountPanel}
                        >
                            <Percent size={17} />
                            İndirim / Özel Fiyat
                        </button>

                        <button
                            type="button"
                            className="quick-sale-complete-button"
                            disabled={cartItems.length === 0 || isSaving}
                            onClick={() => void completeSale()}
                        >
                            {isSaving
                                ? 'SATIŞ KAYDEDİLİYOR...'
                                : 'SATIŞI TAMAMLA'}
                        </button>

                        <button
                            type="button"
                            className="quick-sale-clear-button"
                            disabled={cartItems.length === 0 || isSaving}
                            onClick={clearCart}
                        >
                            Sepeti Temizle
                        </button>
                    </div>
                </aside>
            </div>

            {isDiscountPanelOpen && (
                <div
                    className="quick-sale-modal-backdrop"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closeDiscountPanel()
                        }
                    }}
                >
                    <section
                        className="quick-sale-discount-panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="quick-sale-discount-title"
                    >
                        <div className="quick-sale-discount-header">
                            <div>
                                <span>Fiyat Düzenle</span>
                                <h2 id="quick-sale-discount-title">
                                    İndirim / Özel Fiyat
                                </h2>
                            </div>

                            <button
                                type="button"
                                aria-label="Kapat"
                                onClick={closeDiscountPanel}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="quick-sale-discount-content">
                            <div className="quick-sale-discount-products">
                                {cartItems.map(({ product, entry }) => (
                                    <button
                                        key={product.id}
                                        type="button"
                                        className={
                                            discountProductId === product.id
                                                ? 'quick-sale-discount-product-active'
                                                : ''
                                        }
                                        onClick={() =>
                                            loadDiscountDraft(product.id)
                                        }
                                    >
                                        <strong>{product.name}</strong>
                                        <span>{entry.quantity} adet</span>
                                    </button>
                                ))}
                            </div>

                            {selectedDiscountProduct && (
                                <>
                                    <div className="quick-sale-list-price">
                                        <span>Liste fiyatı</span>
                                        <strong>
                                            {formatMoneyFromMinor(
                                                selectedDiscountProduct.defaultSalePriceMinor,
                                            )}
                                        </strong>
                                    </div>

                                    <label className="quick-sale-discount-field">
                                        <span>Satış fiyatı</span>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={discountPrice}
                                            onChange={(event) =>
                                                setDiscountPrice(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Örn. 55,00"
                                            autoFocus
                                        />
                                    </label>

                                    <label className="quick-sale-discount-field">
                                        <span>
                                            İndirim nedeni
                                            <small>İsteğe bağlı</small>
                                        </span>
                                        <input
                                            type="text"
                                            value={discountReason}
                                            onChange={(event) =>
                                                setDiscountReason(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Örn. Müşteri indirimi"
                                        />
                                    </label>
                                </>
                            )}
                        </div>

                        <div className="quick-sale-discount-actions">
                            <button
                                type="button"
                                className="quick-sale-reset-price-button"
                                onClick={resetSelectedSpecialPrice}
                            >
                                Liste Fiyatına Dön
                            </button>

                            <button
                                type="button"
                                className="quick-sale-save-price-button"
                                onClick={saveSpecialPrice}
                            >
                                Fiyatı Uygula
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    )
}

export default QuickSalePage
