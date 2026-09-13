import { useMemo, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
    CalendarDays,
    ListPlus,
    ReceiptText,
    Save,
    Trash2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { fifoService } from '../services/fifoService'
import { productService } from '../services/productService'
import {
    distributeBasketDiscountMinor,
    salesService,
} from '../services/salesService'
import type { Product } from '../types/product'
import { formatMoneyFromMinor } from '../utils/money'
import { getSaleRoundingTargets } from '../utils/saleRounding'

type BulkSaleItem = {
    productId: string
    productName: string
    quantity: number
    unitPriceMinor: number
}

function getTodayDateValue(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}


function formatDate(value: string): string {
    const [year, month, day] =
        value.split('-')

    return `${day}.${month}.${year}`
}

function BulkSalePage() {
    const [saleDate, setSaleDate] = useState(
        getTodayDateValue(),
    )

    const products = useLiveQuery(
        () => productService.getAll(),
        [],
        [] as Product[],
    )

    const saleCapacityByProduct =
        useLiveQuery(
            () =>
                fifoService.getSaleCapacityByDate(
                    saleDate,
                ),
            [saleDate],
        )

    const activeProducts = useMemo(
        () =>
            products.filter(
                (product) => product.isActive,
            ),
        [products],
    )

    const [productId, setProductId] = useState('')
    const [quantity, setQuantity] = useState('1')
    const [saleNote, setSaleNote] = useState('')

    const [items, setItems] = useState<BulkSaleItem[]>([])

    const [basketTargetTotalMinor, setBasketTargetTotalMinor] =
        useState<number | null>(null)

    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    const selectedProduct = useMemo(
        () =>
            activeProducts.find(
                (product) => product.id === productId,
            ),
        [activeProducts, productId],
    )

    const selectedProductCapacity =
        selectedProduct &&
            saleCapacityByProduct
            ? saleCapacityByProduct[
            selectedProduct.id
            ] ?? 0
            : null

    const selectedProductPlannedQuantity =
        selectedProduct
            ? items.find(
                (item) =>
                    item.productId ===
                    selectedProduct.id,
            )?.quantity ?? 0
            : 0

    const selectedProductRemainingCapacity =
        selectedProductCapacity === null
            ? null
            : Math.max(
                0,
                selectedProductCapacity -
                selectedProductPlannedQuantity,
            )

    const hasInvalidDateStock =
        saleCapacityByProduct !==
        undefined &&
        items.some(
            (item) =>
                item.quantity >
                (saleCapacityByProduct[
                    item.productId
                ] ?? 0),
        )

    const totalQuantity = items.reduce(
        (total, item) => total + item.quantity,
        0,
    )

    const listTotalMinor = items.reduce(
        (total, item) =>
            total + item.quantity * item.unitPriceMinor,
        0,
    )

    const effectiveBasketTargetTotalMinor =
        basketTargetTotalMinor !== null &&
            basketTargetTotalMinor >= 0 &&
            basketTargetTotalMinor < listTotalMinor
            ? basketTargetTotalMinor
            : null

    const totalMinor =
        effectiveBasketTargetTotalMinor ?? listTotalMinor

    const discountMinor = Math.max(
        0,
        listTotalMinor - totalMinor,
    )

    const roundingTargets = useMemo(
        () => getSaleRoundingTargets(listTotalMinor),
        [listTotalMinor],
    )

    function clearFeedback() {
        setMessage('')
        setError('')
    }

    function resetRounding() {
        setBasketTargetTotalMinor(null)
    }

    function handleAddItem(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()
        clearFeedback()

        try {
            if (!selectedProduct) {
                throw new Error(
                    'Toplu satışa eklemek için bir ürün seçin.',
                )
            }

            const parsedQuantity = Number(quantity)

            if (
                !Number.isSafeInteger(parsedQuantity) ||
                parsedQuantity <= 0
            ) {
                throw new Error(
                    'Satış adedi sıfırdan büyük tam sayı olmalıdır.',
                )
            }

            if (
                saleCapacityByProduct ===
                undefined
            ) {
                throw new Error(
                    'Seçilen tarih için stok durumu hesaplanıyor. Birkaç saniye sonra tekrar deneyin.',
                )
            }

            const currentPlannedQuantity =
                items.find(
                    (item) =>
                        item.productId ===
                        selectedProduct.id,
                )?.quantity ?? 0

            const availableCapacity =
                saleCapacityByProduct[
                selectedProduct.id
                ] ?? 0

            if (
                currentPlannedQuantity +
                parsedQuantity >
                availableCapacity
            ) {
                const remainingCapacity =
                    Math.max(
                        0,
                        availableCapacity -
                        currentPlannedQuantity,
                    )

                throw new Error(
                    `${selectedProduct.name} için ${formatDate(
                        saleDate,
                    )} tarihinde en fazla ${remainingCapacity} adet daha eklenebilir.`,
                )
            }

            setItems((current) => {
                const existing = current.find(
                    (item) =>
                        item.productId === selectedProduct.id,
                )

                if (existing) {
                    return current.map((item) =>
                        item.productId === selectedProduct.id
                            ? {
                                ...item,
                                quantity:
                                    item.quantity + parsedQuantity,
                            }
                            : item,
                    )
                }

                return [
                    ...current,
                    {
                        productId: selectedProduct.id,
                        productName: selectedProduct.name,
                        quantity: parsedQuantity,
                        unitPriceMinor:
                            selectedProduct.defaultSalePriceMinor,
                    },
                ]
            })

            resetRounding()
            setProductId('')
            setQuantity('1')
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Ürün toplu satışa eklenemedi.',
            )
        }
    }

    function updateItemQuantity(
        productIdToUpdate: string,
        value: string,
    ) {
        clearFeedback()

        const parsedQuantity = Number(value)

        if (
            !Number.isSafeInteger(parsedQuantity) ||
            parsedQuantity < 0
        ) {
            return
        }

        const dateCapacity =
            saleCapacityByProduct?.[
            productIdToUpdate
            ]

        if (
            dateCapacity !== undefined &&
            parsedQuantity >
            dateCapacity
        ) {
            const product =
                products.find(
                    (candidate) =>
                        candidate.id ===
                        productIdToUpdate,
                )

            setError(
                `${product?.name ?? 'Ürün'} için ${formatDate(
                    saleDate,
                )} tarihinde en fazla ${dateCapacity} adet eklenebilir.`,
            )

            return
        }

        setItems((current) =>
            current
                .map((item) =>
                    item.productId === productIdToUpdate
                        ? {
                            ...item,
                            quantity: parsedQuantity,
                        }
                        : item,
                )
                .filter((item) => item.quantity > 0),
        )

        resetRounding()
    }

    function removeItem(productIdToRemove: string) {
        clearFeedback()

        setItems((current) =>
            current.filter(
                (item) =>
                    item.productId !== productIdToRemove,
            ),
        )

        resetRounding()
    }

    async function handleSaveSale() {
        clearFeedback()

        if (isSaving) {
            return
        }

        try {
            if (items.length === 0) {
                throw new Error(
                    'Kaydetmek için en az bir ürün ekleyin.',
                )
            }

            if (
                saleCapacityByProduct ===
                undefined
            ) {
                throw new Error(
                    'Seçilen tarih için stok durumu hesaplanıyor. Birkaç saniye sonra tekrar deneyin.',
                )
            }

            const invalidItem =
                items.find(
                    (item) =>
                        item.quantity >
                        (saleCapacityByProduct[
                            item.productId
                        ] ?? 0),
                )

            if (invalidItem) {
                const dateCapacity =
                    saleCapacityByProduct[
                    invalidItem.productId
                    ] ?? 0

                throw new Error(
                    `${invalidItem.productName} için ${formatDate(
                        saleDate,
                    )} tarihinde en fazla ${dateCapacity} adet eklenebilir.`,
                )
            }

            const allocations =
                effectiveBasketTargetTotalMinor === null
                    ? items.map(() => 0)
                    : distributeBasketDiscountMinor(
                        items.map(
                            (item) =>
                                item.quantity *
                                item.unitPriceMinor,
                        ),
                        effectiveBasketTargetTotalMinor,
                    )

            setIsSaving(true)

            const fifoPreview = await fifoService.previewSale(
                saleDate,
                items.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                })),
            )

            await salesService.create({
                saleDate,
                note: saleNote,
                items: items.map((item, index) => {
                    const basketDiscountMinor =
                        allocations[index] ?? 0

                    return {
                        productId: item.productId,
                        quantity: item.quantity,
                        listUnitPriceMinor: item.unitPriceMinor,
                        actualUnitPriceMinor: item.unitPriceMinor,
                        basketDiscountMinor:
                            basketDiscountMinor > 0
                                ? basketDiscountMinor
                                : undefined,
                        discountReason:
                            basketDiscountMinor > 0
                                ? 'Sepet yuvarlama indirimi'
                                : undefined,
                    }
                }),
            })

            const savedRevenueMinor = totalMinor
            const savedProfitMinor =
                savedRevenueMinor - fifoPreview.totalCostMinor

            setItems([])
            setSaleNote('')
            resetRounding()

            setMessage(
                `Toplu satış kaydedildi • Ciro ${formatMoneyFromMinor(
                    savedRevenueMinor,
                )} • FIFO ${formatMoneyFromMinor(
                    fifoPreview.totalCostMinor,
                )} • Kâr ${formatMoneyFromMinor(savedProfitMinor)}`,
            )
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Toplu satış kaydedilemedi.',
            )
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="dashboard">
            <header className="page-header quick-sale-header">
                <div>
                    <span className="page-eyebrow">
                        BazaarFlow
                    </span>

                    <h1>Toplu Satış</h1>

                    <p>
                        Unutulan veya geçmiş tarihli satışları
                        tek işlemde ekleyin. FIFO maliyeti kayıt
                        sırasında otomatik hesaplanır.
                    </p>
                </div>

                <div className="form-actions">
                    <Link
                        to="/sales-history"
                        className="secondary-button"
                    >
                        <ReceiptText size={18} />
                        Satış Geçmişi
                    </Link>
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

            <section className="sales-summary-grid">
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
                        Liste Toplamı
                    </span>
                    <strong className="summary-card-value">
                        {formatMoneyFromMinor(listTotalMinor)}
                    </strong>
                    <span className="summary-card-description">
                        İndirimsiz toplam
                    </span>
                </article>

                <article className="summary-card">
                    <span className="summary-card-title">
                        Sepet İndirimi
                    </span>
                    <strong className="summary-card-value">
                        {formatMoneyFromMinor(discountMinor)}
                    </strong>
                    <span className="summary-card-description">
                        Toplama uygulanan indirim
                    </span>
                </article>

                <article className="summary-card">
                    <span className="summary-card-title">
                        Ödenecek
                    </span>
                    <strong className="summary-card-value">
                        {formatMoneyFromMinor(totalMinor)}
                    </strong>
                    <span className="summary-card-description">
                        Kaydedilecek ciro
                    </span>
                </article>
            </section>

            <section className="sales-layout">
                <article className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Satış Bilgileri</h2>
                            <p>
                                Tarihi seçin ve ürünleri toplu
                                satış listesine ekleyin.
                            </p>
                        </div>
                    </div>

                    <div className="management-form">
                        <label className="form-field">
                            <span>Satış tarihi</span>

                            <div className="history-filter-control">
                                <CalendarDays size={16} />
                                <input
                                    type="date"
                                    value={saleDate}
                                    onChange={(event) => {
                                        setSaleDate(event.target.value)
                                        resetRounding()
                                        clearFeedback()
                                    }}
                                    required
                                />
                            </div>
                        </label>

                        <form
                            className="sale-item-form"
                            onSubmit={handleAddItem}
                        >
                            <label className="form-field">
                                <span>Ürün</span>
                                <select
                                    value={productId}
                                    onChange={(event) => {
                                        setProductId(event.target.value)
                                        clearFeedback()
                                    }}
                                    required
                                >
                                    <option value="">
                                        Ürün seçin
                                    </option>

                                    {activeProducts.map((product) => {
                                        const dateCapacity =
                                            saleCapacityByProduct?.[
                                            product.id
                                            ]

                                        const plannedQuantity =
                                            items.find(
                                                (item) =>
                                                    item.productId ===
                                                    product.id,
                                            )?.quantity ?? 0

                                        const remainingCapacity =
                                            dateCapacity === undefined
                                                ? null
                                                : Math.max(
                                                    0,
                                                    dateCapacity -
                                                    plannedQuantity,
                                                )

                                        return (
                                            <option
                                                key={product.id}
                                                value={product.id}
                                                disabled={
                                                    remainingCapacity === 0
                                                }
                                            >
                                                {product.name}
                                                {product.sku
                                                    ? ` • ${product.sku}`
                                                    : ''}
                                                {remainingCapacity === null
                                                    ? ' • stok hesaplanıyor'
                                                    : ` • ${remainingCapacity} adet eklenebilir`}
                                            </option>
                                        )
                                    })}
                                </select>
                            </label>

                            {selectedProduct && (
                                <div className="sale-default-price">
                                    <span>
                                        Normal satış fiyatı:{' '}
                                        <strong>
                                            {formatMoneyFromMinor(
                                                selectedProduct.defaultSalePriceMinor,
                                            )}
                                        </strong>
                                    </span>

                                    <span>
                                        {formatDate(saleDate)} tarihinde
                                        eklenebilir stok:{' '}
                                        <strong>
                                            {selectedProductRemainingCapacity ===
                                                null
                                                ? 'Hesaplanıyor...'
                                                : `${selectedProductRemainingCapacity} adet`}
                                        </strong>
                                    </span>

                                    <small>
                                        Sonraki tarihli mevcut satış ve stok
                                        düzeltmelerini bozmadan eklenebilecek
                                        miktar.
                                    </small>
                                </div>
                            )}

                            <label className="form-field">
                                <span>Adet</span>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={quantity}
                                    onChange={(event) =>
                                        setQuantity(event.target.value)
                                    }
                                    required
                                />
                            </label>

                            <button
                                className="primary-button"
                                type="submit"
                            >
                                <ListPlus size={18} />
                                Listeye Ekle
                            </button>
                        </form>

                        <label className="form-field">
                            <span>Satış notu</span>
                            <input
                                type="text"
                                value={saleNote}
                                onChange={(event) =>
                                    setSaleNote(event.target.value)
                                }
                                placeholder="Örn. 11 Eylül unutulan satışlar"
                            />
                        </label>
                    </div>
                </article>

                <article className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Toplu Satış Listesi</h2>
                            <p>
                                {items.length} farklı ürün •{' '}
                                {totalQuantity} adet
                            </p>
                        </div>
                    </div>

                    {items.length === 0 ? (
                        <div className="empty-state empty-state-compact">
                            <ListPlus size={30} strokeWidth={1.5} />
                            <div>
                                <strong>Liste boş</strong>
                                <p>
                                    Soldaki formdan unutulan satış
                                    ürünlerini ekleyin.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="product-table-wrapper">
                            <table className="product-table">
                                <thead>
                                    <tr>
                                        <th>Ürün</th>
                                        <th>Adet</th>
                                        <th>Tarihte Stok</th>
                                        <th>Birim Fiyat</th>
                                        <th>Tutar</th>
                                        <th></th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {items.map((item) => (
                                        <tr key={item.productId}>
                                            <td>
                                                <strong>
                                                    {item.productName}
                                                </strong>
                                            </td>

                                            <td>
                                                <input
                                                    className="sale-inline-quantity"
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={item.quantity}
                                                    onChange={(event) =>
                                                        updateItemQuantity(
                                                            item.productId,
                                                            event.target.value,
                                                        )
                                                    }
                                                    aria-label={`${item.productName} satış adedi`}
                                                />
                                            </td>

                                            <td>
                                                {saleCapacityByProduct ===
                                                    undefined ? (
                                                    'Hesaplanıyor...'
                                                ) : (
                                                    <>
                                                        <strong>
                                                            {saleCapacityByProduct[
                                                                item.productId
                                                            ] ?? 0}{' '}
                                                            adet
                                                        </strong>

                                                        {item.quantity >
                                                            (saleCapacityByProduct[
                                                                item.productId
                                                            ] ?? 0) && (
                                                                <span className="sale-item-reason">
                                                                    Bu tarih için stok
                                                                    yetersiz
                                                                </span>
                                                            )}
                                                    </>
                                                )}
                                            </td>

                                            <td>
                                                {formatMoneyFromMinor(
                                                    item.unitPriceMinor,
                                                )}
                                            </td>

                                            <td>
                                                <strong>
                                                    {formatMoneyFromMinor(
                                                        item.quantity *
                                                        item.unitPriceMinor,
                                                    )}
                                                </strong>
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className="action-button action-button-danger"
                                                    onClick={() =>
                                                        removeItem(item.productId)
                                                    }
                                                    aria-label={`${item.productName} ürününü listeden çıkar`}
                                                >
                                                    <Trash2 size={15} />
                                                    Çıkar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {items.length > 0 && (
                        <>
                            <div className="sale-actions">
                                <strong>Toplamı Yuvarla</strong>

                                {roundingTargets.map((target) => (
                                    <button
                                        key={target}
                                        type="button"
                                        className="secondary-button"
                                        onClick={() => {
                                            setBasketTargetTotalMinor(target)
                                            clearFeedback()
                                        }}
                                    >
                                        {formatMoneyFromMinor(target)}
                                    </button>
                                ))}

                                {effectiveBasketTargetTotalMinor !==
                                    null && (
                                        <button
                                            type="button"
                                            className="secondary-button"
                                            onClick={resetRounding}
                                        >
                                            İndirimi Kaldır
                                        </button>
                                    )}
                            </div>

                            <div className="sale-actions">
                                <button
                                    type="button"
                                    className="primary-button"
                                    disabled={
                                        isSaving ||
                                        saleCapacityByProduct ===
                                        undefined ||
                                        hasInvalidDateStock
                                    }
                                    onClick={() =>
                                        void handleSaveSale()
                                    }
                                >
                                    <Save size={18} />
                                    {isSaving
                                        ? 'Kaydediliyor...'
                                        : 'Toplu Satışı Kaydet'}
                                </button>
                            </div>
                        </>
                    )}
                </article>
            </section>
        </div>
    )
}

export default BulkSalePage
