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
import {
    distributeBasketDiscountMinor,
    salesService,
} from '../services/salesService'
import type { InventoryLot } from '../types/inventoryLot'
import type { Product } from '../types/product'
import { formatMoneyFromMinor } from '../utils/money'

type QuickSaleCartEntry = {
    quantity: number
}

type QuickSaleCart = Record<string, QuickSaleCartEntry>

function getTodayDateValue(): string {
    const now = new Date()

    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

function getRoundingTargets(
    totalMinor: number,
): number[] {
    if (totalMinor <= 0) {
        return []
    }

    /*
     * Pazarcı kullanımında 39 TL gibi teknik olarak yakın ama
     * pratikte yuvarlak olmayan tutarları göstermiyoruz.
     *
     * 40 TL     -> 35 / 30 / 20
     * 167,50 TL -> 165 / 160 / 150
     * 180 TL    -> 175 / 170 / 160
     *
     * İlk seçenek en yakın alt 5 TL katı, sonraki seçenekler
     * ise alt 10 TL katlarıdır.
     */
    if (totalMinor >= 1000) {
        const nearestFiveMinor =
            Math.floor(
                (totalMinor - 1) /
                500,
            ) * 500

        const nearestTenMinor =
            Math.floor(
                (totalMinor - 1) /
                1000,
            ) * 1000

        const targets = new Set<number>()

        if (
            nearestFiveMinor > 0 &&
            nearestFiveMinor < totalMinor
        ) {
            targets.add(nearestFiveMinor)
        }

        if (
            nearestTenMinor > 0 &&
            nearestTenMinor < totalMinor
        ) {
            targets.add(nearestTenMinor)
        }

        let nextTenMinor =
            nearestTenMinor - 1000

        while (
            targets.size < 3 &&
            nextTenMinor > 0
        ) {
            targets.add(nextTenMinor)
            nextTenMinor -= 1000
        }

        return Array.from(targets)
            .sort(
                (first, second) =>
                    second - first,
            )
            .slice(0, 3)
    }

    /*
     * 10 TL altındaki küçük tutarlarda tam TL üzerinden
     * sade öneriler üretmek daha doğal.
     */
    const nearestLiraMinor =
        Math.floor(
            (totalMinor - 1) /
            100,
        ) * 100

    return [
        nearestLiraMinor,
        nearestLiraMinor - 100,
        nearestLiraMinor - 200,
    ].filter(
        (target) =>
            target > 0 &&
            target < totalMinor,
    )
}

function QuickSalePage() {
    const data = useLiveQuery(
        async () => {
            const [products, lots] =
                await Promise.all([
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

    const [cart, setCart] =
        useState<QuickSaleCart>({})

    const [
        basketTargetTotalMinor,
        setBasketTargetTotalMinor,
    ] = useState<number | null>(null)

    const [
        isDiscountPanelOpen,
        setIsDiscountPanelOpen,
    ] = useState(false)

    const [message, setMessage] =
        useState('')

    const [error, setError] =
        useState('')

    const [isSaving, setIsSaving] =
        useState(false)

    const activeProducts = useMemo(
        () =>
            data.products
                .filter(
                    (product) =>
                        product.isActive,
                )
                .slice(0, 10),
        [data.products],
    )

    const stockByProduct =
        useMemo(() => {
            const result =
                new Map<string, number>()

            for (const lot of data.lots) {
                result.set(
                    lot.productId,
                    (
                        result.get(
                            lot.productId,
                        ) ?? 0
                    ) +
                    lot.quantityRemaining,
                )
            }

            return result
        }, [data.lots])

    const productMap = useMemo(
        () =>
            new Map(
                activeProducts.map(
                    (product) => [
                        product.id,
                        product,
                    ],
                ),
            ),
        [activeProducts],
    )

    const cartItems = useMemo(
        () =>
            Object.entries(cart)
                .map(
                    (
                        [
                            productId,
                            entry,
                        ],
                    ) => {
                        const product =
                            productMap.get(
                                productId,
                            )

                        if (
                            !product ||
                            entry.quantity <= 0
                        ) {
                            return null
                        }

                        return {
                            product,
                            entry,
                        }
                    },
                )
                .filter(
                    (
                        item,
                    ): item is {
                        product: Product
                        entry: QuickSaleCartEntry
                    } =>
                        item !== null,
                ),
        [cart, productMap],
    )

    const totalQuantity =
        cartItems.reduce(
            (total, item) =>
                total +
                item.entry.quantity,
            0,
        )

    const listTotalMinor =
        cartItems.reduce(
            (total, item) =>
                total +
                item.entry.quantity *
                item.product
                    .defaultSalePriceMinor,
            0,
        )

    const effectiveBasketTargetTotalMinor =
        basketTargetTotalMinor !== null &&
            basketTargetTotalMinor >= 0 &&
            basketTargetTotalMinor < listTotalMinor
            ? basketTargetTotalMinor
            : null

    const totalMinor =
        effectiveBasketTargetTotalMinor ??
        listTotalMinor

    const discountTotalMinor =
        Math.max(
            0,
            listTotalMinor -
            totalMinor,
        )

    const roundingTargets =
        useMemo(
            () =>
                getRoundingTargets(
                    listTotalMinor,
                ),
            [listTotalMinor],
        )

    const basketDiscountAllocations =
        useMemo(
            () =>
                effectiveBasketTargetTotalMinor ===
                    null
                    ? cartItems.map(
                        () => 0,
                    )
                    : distributeBasketDiscountMinor(
                        cartItems.map(
                            ({
                                product,
                                entry,
                            }) =>
                                entry.quantity *
                                product
                                    .defaultSalePriceMinor,
                        ),
                        effectiveBasketTargetTotalMinor,
                    ),
            [
                cartItems,
                effectiveBasketTargetTotalMinor,
            ],
        )

    function clearFeedback() {
        setMessage('')
        setError('')
    }

    function resetBasketRounding() {
        setBasketTargetTotalMinor(null)
        setIsDiscountPanelOpen(false)
    }

    function addProduct(
        product: Product,
    ) {
        clearFeedback()
        setBasketTargetTotalMinor(null)

        const stock =
            stockByProduct.get(
                product.id,
            ) ?? 0

        setCart((current) => {
            const currentEntry =
                current[product.id]

            const currentQuantity =
                currentEntry?.quantity ?? 0

            if (
                stock <= 0 ||
                currentQuantity >= stock
            ) {
                return current
            }

            return {
                ...current,
                [product.id]: {
                    quantity:
                        currentQuantity + 1,
                },
            }
        })
    }

    function decreaseProduct(
        productId: string,
    ) {
        clearFeedback()
        setBasketTargetTotalMinor(null)

        setCart((current) => {
            const currentEntry =
                current[productId]

            if (!currentEntry) {
                return current
            }

            if (
                currentEntry.quantity <= 1
            ) {
                const next = {
                    ...current,
                }

                delete next[productId]

                return next
            }

            return {
                ...current,
                [productId]: {
                    quantity:
                        currentEntry.quantity -
                        1,
                },
            }
        })
    }

    function removeProduct(
        productId: string,
    ) {
        clearFeedback()
        setBasketTargetTotalMinor(null)

        setCart((current) => {
            const next = {
                ...current,
            }

            delete next[productId]

            return next
        })
    }

    function clearCart() {
        clearFeedback()
        setCart({})
        resetBasketRounding()
    }

    function openDiscountPanel() {
        clearFeedback()

        if (
            cartItems.length === 0
        ) {
            return
        }

        setIsDiscountPanelOpen(true)
    }

    function applyRoundingTarget(
        targetMinor: number,
    ) {
        clearFeedback()

        if (
            targetMinor < 0 ||
            targetMinor >=
            listTotalMinor
        ) {
            setError(
                'Geçerli bir yuvarlama tutarı seçin.',
            )
            return
        }

        setBasketTargetTotalMinor(
            targetMinor,
        )

        setIsDiscountPanelOpen(false)
    }

    async function completeSale() {
        clearFeedback()

        if (isSaving) {
            return
        }

        try {
            if (
                cartItems.length === 0
            ) {
                throw new Error(
                    'Satışı tamamlamak için sepete ürün ekleyin.',
                )
            }

            for (
                const {
                    product,
                    entry,
                } of cartItems
            ) {
                const currentStock =
                    stockByProduct.get(
                        product.id,
                    ) ?? 0

                if (
                    entry.quantity >
                    currentStock
                ) {
                    throw new Error(
                        `${product.name} için yeterli stok bulunmuyor.`,
                    )
                }
            }

            setIsSaving(true)

            const saleDate =
                getTodayDateValue()

            const items =
                cartItems.map(
                    (
                        {
                            product,
                            entry,
                        },
                        index,
                    ) => {
                        const basketDiscountMinor =
                            basketDiscountAllocations[
                            index
                            ] ?? 0

                        return {
                            productId:
                                product.id,

                            quantity:
                                entry.quantity,

                            listUnitPriceMinor:
                                product
                                    .defaultSalePriceMinor,

                            actualUnitPriceMinor:
                                product
                                    .defaultSalePriceMinor,

                            basketDiscountMinor:
                                basketDiscountMinor >
                                    0
                                    ? basketDiscountMinor
                                    : undefined,

                            discountReason:
                                basketDiscountMinor >
                                    0
                                    ? 'Sepet yuvarlama indirimi'
                                    : undefined,
                        }
                    },
                )

            /*
             * POS ayrı bir FIFO motoru oluşturmaz.
             * Stok tüketimi aynı FIFO servisiyle doğrulanır,
             * sepet indirimi yalnızca satış gelirine dağıtılır.
             */
            await fifoService.previewSale(
                saleDate,
                items.map(
                    (item) => ({
                        productId:
                            item.productId,
                        quantity:
                            item.quantity,
                    }),
                ),
            )

            await salesService.create({
                saleDate,
                items,
            })

            setCart({})
            resetBasketRounding()

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
                    <span className="page-eyebrow">
                        BazaarFlow POS
                    </span>

                    <h1>Hızlı Satış</h1>

                    <p>
                        Ürüne dokunun, sepete ekleyin ve
                        satışınızı hızlıca tamamlayın.
                    </p>
                </div>

                <div className="quick-sale-header-badge">
                    <Zap size={18} />
                    <span>
                        {totalQuantity} ürün
                    </span>
                </div>
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

            <div className="quick-sale-layout">
                <section className="quick-sale-products">
                    <div className="quick-sale-section-header">
                        <div>
                            <h2>Ürünler</h2>
                            <p>
                                Her dokunuş sepete 1 adet ekler.
                            </p>
                        </div>

                        <span>
                            {activeProducts.length}/10
                        </span>
                    </div>

                    {activeProducts.length === 0 ? (
                        <div className="quick-sale-empty">
                            <ShoppingCart size={34} />
                            <strong>
                                Aktif ürün bulunamadı
                            </strong>
                            <span>
                                Önce Ürünler ekranından aktif ürün ekleyin.
                            </span>
                        </div>
                    ) : (
                        <div className="quick-sale-product-grid">
                            {activeProducts.map(
                                (product) => {
                                    const stock =
                                        stockByProduct.get(
                                            product.id,
                                        ) ?? 0

                                    const cartQuantity =
                                        cart[
                                            product.id
                                        ]?.quantity ?? 0

                                    const unavailable =
                                        stock <= 0

                                    const reachedStock =
                                        cartQuantity >=
                                        stock

                                    return (
                                        <button
                                            key={
                                                product.id
                                            }
                                            type="button"
                                            className={`quick-sale-product-button ${unavailable
                                                    ? 'quick-sale-product-button-disabled'
                                                    : ''
                                                }`}
                                            disabled={
                                                unavailable ||
                                                reachedStock
                                            }
                                            onClick={() =>
                                                addProduct(
                                                    product,
                                                )
                                            }
                                        >
                                            {cartQuantity >
                                                0 && (
                                                    <span className="quick-sale-product-count">
                                                        ×
                                                        {
                                                            cartQuantity
                                                        }
                                                    </span>
                                                )}

                                            <strong>
                                                {
                                                    product.name
                                                }
                                            </strong>

                                            {product.sku && (
                                                <small>
                                                    {
                                                        product.sku
                                                    }
                                                </small>
                                            )}

                                            <span className="quick-sale-product-price">
                                                {formatMoneyFromMinor(
                                                    product.defaultSalePriceMinor,
                                                )}
                                            </span>

                                            <span
                                                className={`quick-sale-product-stock ${stock <=
                                                        0
                                                        ? 'quick-sale-product-stock-empty'
                                                        : ''
                                                    }`}
                                            >
                                                {stock >
                                                    0
                                                    ? `${stock} stok`
                                                    : 'Stok yok'}
                                            </span>
                                        </button>
                                    )
                                },
                            )}
                        </div>
                    )}
                </section>

                <aside className="quick-sale-cart">
                    <div className="quick-sale-section-header">
                        <div>
                            <h2>Sepet</h2>
                            <p>
                                Satış özeti
                            </p>
                        </div>

                        <ShoppingCart size={20} />
                    </div>

                    {cartItems.length === 0 ? (
                        <div className="quick-sale-cart-empty">
                            <ShoppingCart
                                size={34}
                                strokeWidth={1.5}
                            />

                            <strong>
                                Sepet boş
                            </strong>

                            <span>
                                Satışa başlamak için bir ürüne dokunun.
                            </span>
                        </div>
                    ) : (
                        <div className="quick-sale-cart-items">
                            {cartItems.map(
                                ({
                                    product,
                                    entry,
                                }) => {
                                    const stock =
                                        stockByProduct.get(
                                            product.id,
                                        ) ?? 0

                                    return (
                                        <article
                                            key={
                                                product.id
                                            }
                                            className="quick-sale-cart-item"
                                        >
                                            <div className="quick-sale-cart-item-info">
                                                <div>
                                                    <strong>
                                                        {
                                                            product.name
                                                        }
                                                    </strong>
                                                </div>

                                                <span>
                                                    {formatMoneyFromMinor(
                                                        product.defaultSalePriceMinor,
                                                    )}{' '}
                                                    / adet
                                                </span>
                                            </div>

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
                                                        <Minus
                                                            size={
                                                                16
                                                            }
                                                        />
                                                    </button>

                                                    <strong>
                                                        {
                                                            entry.quantity
                                                        }
                                                    </strong>

                                                    <button
                                                        type="button"
                                                        aria-label={`${product.name} artır`}
                                                        disabled={
                                                            entry.quantity >=
                                                            stock
                                                        }
                                                        onClick={() =>
                                                            addProduct(
                                                                product,
                                                            )
                                                        }
                                                    >
                                                        <Plus
                                                            size={
                                                                16
                                                            }
                                                        />
                                                    </button>
                                                </div>

                                                <strong className="quick-sale-line-total">
                                                    {formatMoneyFromMinor(
                                                        product.defaultSalePriceMinor *
                                                        entry.quantity,
                                                    )}
                                                </strong>

                                                <button
                                                    type="button"
                                                    className="quick-sale-remove-button"
                                                    aria-label={`${product.name} sepetten çıkar`}
                                                    onClick={() =>
                                                        removeProduct(
                                                            product.id,
                                                        )
                                                    }
                                                >
                                                    <Trash2
                                                        size={
                                                            17
                                                        }
                                                    />
                                                </button>
                                            </div>
                                        </article>
                                    )
                                },
                            )}
                        </div>
                    )}

                    <div className="quick-sale-cart-footer">
                        <div className="quick-sale-total-row">
                            <span>
                                Toplam adet
                            </span>
                            <strong>
                                {totalQuantity}
                            </strong>
                        </div>

                        {discountTotalMinor >
                            0 && (
                                <div className="quick-sale-discount-total">
                                    <span>
                                        Sepet indirimi
                                    </span>
                                    <strong>
                                        -
                                        {formatMoneyFromMinor(
                                            discountTotalMinor,
                                        )}
                                    </strong>
                                </div>
                            )}

                        <div className="quick-sale-grand-total">
                            <span>
                                TOPLAM
                            </span>

                            <strong>
                                {formatMoneyFromMinor(
                                    totalMinor,
                                )}
                            </strong>
                        </div>

                        <button
                            type="button"
                            className="quick-sale-discount-button"
                            disabled={
                                cartItems.length ===
                                0 ||
                                isSaving
                            }
                            onClick={
                                openDiscountPanel
                            }
                        >
                            <Percent size={17} />
                            Toplamı Yuvarla
                        </button>

                        <button
                            type="button"
                            className="quick-sale-complete-button"
                            disabled={
                                cartItems.length ===
                                0 ||
                                isSaving
                            }
                            onClick={() =>
                                void completeSale()
                            }
                        >
                            {isSaving
                                ? 'SATIŞ KAYDEDİLİYOR...'
                                : 'SATIŞI TAMAMLA'}
                        </button>

                        <button
                            type="button"
                            className="quick-sale-clear-button"
                            disabled={
                                cartItems.length ===
                                0 ||
                                isSaving
                            }
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
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setIsDiscountPanelOpen(
                                false,
                            )
                        }
                    }}
                >
                    <section
                        className="quick-sale-discount-panel quick-sale-rounding-panel"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="quick-sale-rounding-title"
                    >
                        <div className="quick-sale-discount-header">
                            <div>
                                <span>
                                    Sepet İndirimi
                                </span>

                                <h2 id="quick-sale-rounding-title">
                                    Toplamı Yuvarla
                                </h2>
                            </div>

                            <button
                                type="button"
                                aria-label="Kapat"
                                onClick={() =>
                                    setIsDiscountPanelOpen(
                                        false,
                                    )
                                }
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="quick-sale-rounding-content">
                            <div className="quick-sale-rounding-current">
                                <span>
                                    Normal sepet toplamı
                                </span>

                                <strong>
                                    {formatMoneyFromMinor(
                                        listTotalMinor,
                                    )}
                                </strong>
                            </div>

                            <div className="quick-sale-rounding-help">
                                Pazarlık sonrası müşteriden alınacak
                                yakın toplamı seçin. İndirim ürünlere
                                fiyatları oranında otomatik dağıtılır.
                            </div>

                            <div className="quick-sale-rounding-options">
                                {roundingTargets.map(
                                    (target) => (
                                        <button
                                            key={
                                                target
                                            }
                                            type="button"
                                            className={
                                                effectiveBasketTargetTotalMinor ===
                                                    target
                                                    ? 'quick-sale-rounding-option-active'
                                                    : ''
                                            }
                                            onClick={() =>
                                                applyRoundingTarget(
                                                    target,
                                                )
                                            }
                                        >
                                            <span>
                                                Müşteriden Al
                                            </span>

                                            <strong>
                                                {formatMoneyFromMinor(
                                                    target,
                                                )}
                                            </strong>

                                            <small>
                                                -
                                                {formatMoneyFromMinor(
                                                    listTotalMinor -
                                                    target,
                                                )}
                                            </small>
                                        </button>
                                    ),
                                )}
                            </div>

                            {roundingTargets.length ===
                                0 && (
                                    <div className="quick-sale-rounding-empty">
                                        Bu sepet için uygun bir alt
                                        yuvarlama seçeneği oluşmadı.
                                    </div>
                                )}

                            <button
                                type="button"
                                className="quick-sale-rounding-reset"
                                disabled={
                                    effectiveBasketTargetTotalMinor ===
                                    null
                                }
                                onClick={
                                    resetBasketRounding
                                }
                            >
                                İndirimi Kaldır
                            </button>
                        </div>
                    </section>
                </div>
            )}
        </div>
    )
}

export default QuickSalePage
