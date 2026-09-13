import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
    Ban,
    CalendarDays,
    Pencil,
    Save,
    Search,
    ShoppingCart,
    Trash2,
    X,
} from 'lucide-react'
import { productService } from '../services/productService'
import {
    getSaleItemDiscountMinor,
    getSaleItemRevenueMinor,
    salesService,
    type SaleHistoryRecord,
} from '../services/salesService'
import type { Product } from '../types/product'
import {
    formatMoneyFromMinor,
    parseMoneyToMinor,
} from '../utils/money'

type DraftSaleItem = {
    productId: string
    productName: string
    quantity: number
    listUnitPriceMinor: number
    actualUnitPriceMinor: number
    basketDiscountMinor?: number
    discountReason?: string
}

type SaleHistoryStatusFilter =
    | 'all'
    | 'completed'
    | 'cancelled'

const QUICK_SALE_DISCOUNT_REASON =
    'Sepet yuvarlama indirimi'

function normalizeSearch(value: string): string {
    return value
        .trim()
        .toLocaleLowerCase('tr-TR')
}

function rebuildFilteredHistoryRecord(
    record: SaleHistoryRecord,
    items: SaleHistoryRecord['items'],
): SaleHistoryRecord {
    const totalQuantity = items.reduce(
        (total, item) =>
            total + item.quantity,
        0,
    )

    const listTotalMinor = items.reduce(
        (total, item) =>
            total +
            item.quantity *
            item.listUnitPriceMinor,
        0,
    )

    const revenueMinor = items.reduce(
        (total, item) =>
            total +
            item.revenueMinor,
        0,
    )

    const discountMinor = items.reduce(
        (total, item) =>
            total +
            item.discountMinor,
        0,
    )

    const costMinor = items.reduce(
        (total, item) =>
            total + item.costMinor,
        0,
    )

    return {
        ...record,
        items,
        totalQuantity,
        listTotalMinor,
        revenueMinor,
        discountMinor,
        costMinor,
        grossProfitMinor:
            revenueMinor - costMinor,
    }
}

function formatDate(value: string): string {
    const [year, month, day] =
        value.split('-')

    return `${day}.${month}.${year}`
}

function clearBasketDiscounts(
    items: DraftSaleItem[],
): DraftSaleItem[] {
    return items.map((item) => {
        const hadBasketDiscount =
            (item.basketDiscountMinor ?? 0) > 0

        return {
            ...item,
            basketDiscountMinor: undefined,
            discountReason:
                hadBasketDiscount &&
                    item.discountReason ===
                    QUICK_SALE_DISCOUNT_REASON
                    ? undefined
                    : item.discountReason,
        }
    })
}

function SalesHistoryPage() {
    const products = useLiveQuery(
        () => productService.getAll(),
        [],
        [] as Product[],
    )

    const saleHistory = useLiveQuery(
        () => salesService.getHistory(),
        [],
        [] as SaleHistoryRecord[],
    )

    const [historyStartDate, setHistoryStartDate] =
        useState('')

    const [historyEndDate, setHistoryEndDate] =
        useState('')

    const [historySearch, setHistorySearch] =
        useState('')

    const [historyStatus, setHistoryStatus] =
        useState<SaleHistoryStatusFilter>('all')

    const [editingSaleId, setEditingSaleId] =
        useState<string | null>(null)

    const [saleDate, setSaleDate] =
        useState('')

    const [saleNote, setSaleNote] =
        useState('')

    const [draftItems, setDraftItems] =
        useState<DraftSaleItem[]>([])

    const [message, setMessage] =
        useState('')

    const [error, setError] =
        useState('')

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

    const filteredSaleHistory = useMemo(() => {
        const query =
            normalizeSearch(historySearch)

        return saleHistory
            .filter((record) => {
                if (
                    historyStartDate &&
                    record.sale.saleDate <
                    historyStartDate
                ) {
                    return false
                }

                if (
                    historyEndDate &&
                    record.sale.saleDate >
                    historyEndDate
                ) {
                    return false
                }

                if (
                    historyStatus !== 'all' &&
                    record.sale.status !==
                    historyStatus
                ) {
                    return false
                }

                return true
            })
            .map((record) => {
                if (!query) {
                    return record
                }

                const matchingItems =
                    record.items.filter(
                        (item) => {
                            const currentProduct =
                                productMap.get(
                                    item.productId,
                                )

                            const searchableText =
                                normalizeSearch(
                                    [
                                        item.productName,
                                        currentProduct?.name ??
                                        '',
                                        currentProduct?.sku ??
                                        '',
                                    ].join(' '),
                                )

                            return searchableText.includes(
                                query,
                            )
                        },
                    )

                if (
                    matchingItems.length === 0
                ) {
                    return null
                }

                return rebuildFilteredHistoryRecord(
                    record,
                    matchingItems,
                )
            })
            .filter(
                (
                    record,
                ): record is SaleHistoryRecord =>
                    record !== null,
            )
    }, [
        saleHistory,
        productMap,
        historyStartDate,
        historyEndDate,
        historySearch,
        historyStatus,
    ])

    const completedHistory =
        filteredSaleHistory.filter(
            (record) =>
                record.sale.status ===
                'completed',
        )

    const historyTotalQuantity =
        completedHistory.reduce(
            (total, record) =>
                total +
                record.totalQuantity,
            0,
        )

    const historyRevenueMinor =
        completedHistory.reduce(
            (total, record) =>
                total +
                record.revenueMinor,
            0,
        )

    const historyCostMinor =
        completedHistory.reduce(
            (total, record) =>
                total +
                record.costMinor,
            0,
        )

    const historyGrossProfitMinor =
        completedHistory.reduce(
            (total, record) =>
                total +
                record.grossProfitMinor,
            0,
        )

    const editingDraftRevenueMinor =
        draftItems.reduce(
            (total, item) =>
                total +
                getSaleItemRevenueMinor(
                    item,
                ),
            0,
        )

    const editingDraftDiscountMinor =
        draftItems.reduce(
            (total, item) =>
                total +
                getSaleItemDiscountMinor(
                    item,
                ),
            0,
        )

    const hasHistoryFilters =
        historyStartDate !== '' ||
        historyEndDate !== '' ||
        historySearch.trim() !== '' ||
        historyStatus !== 'all'

    function clearFeedback() {
        setMessage('')
        setError('')
    }

    function clearHistoryFilters() {
        setHistoryStartDate('')
        setHistoryEndDate('')
        setHistorySearch('')
        setHistoryStatus('all')
    }

    function resetEditor() {
        setEditingSaleId(null)
        setSaleDate('')
        setSaleNote('')
        setDraftItems([])
    }

    function startEditingSale(
        record: SaleHistoryRecord,
    ) {
        if (
            record.sale.status ===
            'cancelled'
        ) {
            return
        }

        const fullRecord =
            saleHistory.find(
                (candidate) =>
                    candidate.sale.id ===
                    record.sale.id,
            ) ?? record

        clearFeedback()

        setEditingSaleId(
            fullRecord.sale.id,
        )

        setSaleDate(
            fullRecord.sale.saleDate,
        )

        setSaleNote(
            fullRecord.sale.note ?? '',
        )

        setDraftItems(
            fullRecord.items.map(
                (item) => ({
                    productId:
                        item.productId,

                    productName:
                        item.productName,

                    quantity:
                        item.quantity,

                    listUnitPriceMinor:
                        item.listUnitPriceMinor,

                    actualUnitPriceMinor:
                        item.actualUnitPriceMinor,

                    basketDiscountMinor:
                        item.basketDiscountMinor,

                    discountReason:
                        item.discountReason,
                }),
            ),
        )

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        })

        setMessage(
            'Satış düzenleme moduna alındı.',
        )
    }

    function stopEditingSale() {
        resetEditor()
        clearFeedback()
    }

    function updateDraftItemProduct(
        itemIndex: number,
        nextProductId: string,
    ) {
        clearFeedback()

        const nextProduct =
            products.find(
                (product) =>
                    product.id ===
                    nextProductId,
            )

        if (!nextProduct) {
            setError(
                'Seçilen ürün bulunamadı.',
            )
            return
        }

        const duplicateProduct =
            draftItems.some(
                (item, index) =>
                    index !== itemIndex &&
                    item.productId ===
                    nextProductId,
            )

        if (duplicateProduct) {
            setError(
                'Aynı ürün bir satışta yalnızca bir kez bulunabilir.',
            )
            return
        }

        setDraftItems((current) =>
            clearBasketDiscounts(
                current.map(
                    (item, index) =>
                        index ===
                            itemIndex
                            ? {
                                ...item,
                                productId:
                                    nextProduct.id,
                                productName:
                                    nextProduct.name,
                                listUnitPriceMinor:
                                    nextProduct.defaultSalePriceMinor,
                                actualUnitPriceMinor:
                                    nextProduct.defaultSalePriceMinor,
                            }
                            : item,
                ),
            ),
        )
    }

    function updateDraftItemQuantity(
        itemIndex: number,
        value: string,
    ) {
        clearFeedback()

        const parsedQuantity =
            Number(value)

        if (
            !Number.isSafeInteger(
                parsedQuantity,
            ) ||
            parsedQuantity < 0
        ) {
            return
        }

        setDraftItems((current) =>
            clearBasketDiscounts(
                current.map(
                    (item, index) =>
                        index ===
                            itemIndex
                            ? {
                                ...item,
                                quantity:
                                    parsedQuantity,
                            }
                            : item,
                ),
            ),
        )
    }

    function updateDraftItemPrice(
        itemIndex: number,
        value: string,
    ) {
        clearFeedback()

        if (value.trim() === '') {
            setDraftItems((current) =>
                clearBasketDiscounts(
                    current.map(
                        (item, index) =>
                            index ===
                                itemIndex
                                ? {
                                    ...item,
                                    actualUnitPriceMinor:
                                        0,
                                }
                                : item,
                    ),
                ),
            )

            return
        }

        try {
            const priceMinor =
                parseMoneyToMinor(value)

            setDraftItems((current) =>
                clearBasketDiscounts(
                    current.map(
                        (item, index) =>
                            index ===
                                itemIndex
                                ? {
                                    ...item,
                                    actualUnitPriceMinor:
                                        priceMinor,
                                }
                                : item,
                    ),
                ),
            )
        } catch {
            // Kullanıcı fiyatı yazmayı tamamlayana kadar
            // geçersiz ara değerleri kaydetmiyoruz.
        }
    }

    function updateDraftItemDiscountReason(
        itemIndex: number,
        value: string,
    ) {
        setDraftItems((current) =>
            current.map(
                (item, index) =>
                    index === itemIndex
                        ? {
                            ...item,
                            discountReason:
                                value.trim() ||
                                undefined,
                        }
                        : item,
            ),
        )
    }

    function removeDraftItem(
        productIdToRemove: string,
    ) {
        clearFeedback()

        setDraftItems((current) =>
            clearBasketDiscounts(
                current.filter(
                    (item) =>
                        item.productId !==
                        productIdToRemove,
                ),
            ),
        )
    }

    async function handleSaveEditedSale() {
        clearFeedback()

        try {
            if (!editingSaleId) {
                return
            }

            if (
                draftItems.length === 0
            ) {
                throw new Error(
                    'Satışta en az bir ürün bulunmalıdır.',
                )
            }

            if (!saleDate) {
                throw new Error(
                    'Satış tarihi seçilmelidir.',
                )
            }

            for (
                const item of draftItems
            ) {
                if (
                    !Number.isSafeInteger(
                        item.quantity,
                    ) ||
                    item.quantity <= 0
                ) {
                    throw new Error(
                        'Satış adetleri sıfırdan büyük tam sayı olmalıdır.',
                    )
                }

                if (
                    !Number.isSafeInteger(
                        item.actualUnitPriceMinor,
                    ) ||
                    item.actualUnitPriceMinor <
                    0
                ) {
                    throw new Error(
                        'Satış fiyatları geçersiz.',
                    )
                }
            }

            await salesService.update(
                editingSaleId,
                {
                    saleDate,
                    note: saleNote,
                    items:
                        draftItems.map(
                            (item) => ({
                                productId:
                                    item.productId,

                                quantity:
                                    item.quantity,

                                listUnitPriceMinor:
                                    item.listUnitPriceMinor,

                                actualUnitPriceMinor:
                                    item.actualUnitPriceMinor,

                                basketDiscountMinor:
                                    item.basketDiscountMinor,

                                discountReason:
                                    item.discountReason,
                            }),
                        ),
                },
            )

            resetEditor()

            setMessage(
                'Satış güncellendi. Stok ve FIFO maliyeti otomatik yeniden hesaplandı.',
            )
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Satış güncellenemedi.',
            )
        }
    }

    async function handleCancelSale(
        record: SaleHistoryRecord,
    ) {
        if (
            record.sale.status ===
            'cancelled'
        ) {
            return
        }

        const confirmed =
            window.confirm(
                `${formatDate(
                    record.sale.saleDate,
                )} tarihli satış iptal edilsin mi?\n\n` +
                'Satış geçmişte kalacak ve bu satışın tükettiği stok geri yüklenecek.',
            )

        if (!confirmed) {
            return
        }

        clearFeedback()

        try {
            await salesService.cancel(
                record.sale.id,
            )

            if (
                editingSaleId ===
                record.sale.id
            ) {
                resetEditor()
            }

            setMessage(
                'Satış iptal edildi ve stoklar FIFO sırasına göre yeniden hesaplandı.',
            )
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Satış iptal edilemedi.',
            )
        }
    }

    return (
        <div className="dashboard">
            <header className="page-header">
                <span className="page-eyebrow">
                    BazaarFlow
                </span>

                <h1>Satış Geçmişi</h1>

                <p>
                    Hızlı Satış&apos;tan kaydedilen satışları
                    inceleyin, gerektiğinde düzenleyin veya
                    iptal edin.
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

            {editingSaleId && (
                <section className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <span className="page-eyebrow">
                                Kayıt Düzenleme
                            </span>

                            <h2>
                                Satışı Düzenle
                            </h2>

                            <p>
                                Değişiklikleri kaydettiğinizde stok
                                ve FIFO maliyeti otomatik yeniden
                                hesaplanır.
                            </p>
                        </div>
                    </div>

                    <div className="management-form">
                        <div className="form-row">
                            <label className="form-field">
                                <span>
                                    Satış tarihi
                                </span>

                                <input
                                    type="date"
                                    value={
                                        saleDate
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setSaleDate(
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    required
                                />
                            </label>

                            <label className="form-field">
                                <span>
                                    Satış notu
                                </span>

                                <input
                                    type="text"
                                    value={
                                        saleNote
                                    }
                                    onChange={(
                                        event,
                                    ) =>
                                        setSaleNote(
                                            event
                                                .target
                                                .value,
                                        )
                                    }
                                    placeholder="İsteğe bağlı"
                                />
                            </label>
                        </div>
                    </div>

                    <div className="product-table-wrapper">
                        <table className="product-table sales-table">
                            <thead>
                                <tr>
                                    <th>
                                        Ürün
                                    </th>
                                    <th>
                                        Adet
                                    </th>
                                    <th>
                                        Liste
                                    </th>
                                    <th>
                                        Satış
                                    </th>
                                    <th>
                                        İndirim
                                    </th>
                                    <th></th>
                                </tr>
                            </thead>

                            <tbody>
                                {draftItems.map(
                                    (
                                        item,
                                        index,
                                    ) => {
                                        const itemDiscount =
                                            getSaleItemDiscountMinor(
                                                item,
                                            )

                                        return (
                                            <tr
                                                key={`${item.productId}-${index}`}
                                            >
                                                <td>
                                                    <div className="sale-inline-product">
                                                        <select
                                                            className="sale-inline-select"
                                                            value={
                                                                item.productId
                                                            }
                                                            onChange={(
                                                                event,
                                                            ) =>
                                                                updateDraftItemProduct(
                                                                    index,
                                                                    event
                                                                        .target
                                                                        .value,
                                                                )
                                                            }
                                                        >
                                                            {products
                                                                .filter(
                                                                    (
                                                                        product,
                                                                    ) =>
                                                                        product.isActive ||
                                                                        product.id ===
                                                                        item.productId,
                                                                )
                                                                .map(
                                                                    (
                                                                        product,
                                                                    ) => (
                                                                        <option
                                                                            key={
                                                                                product.id
                                                                            }
                                                                            value={
                                                                                product.id
                                                                            }
                                                                        >
                                                                            {
                                                                                product.name
                                                                            }
                                                                            {!product.isActive
                                                                                ? ' (Pasif)'
                                                                                : ''}
                                                                        </option>
                                                                    ),
                                                                )}
                                                        </select>

                                                        <input
                                                            className="sale-inline-reason"
                                                            type="text"
                                                            value={
                                                                item.discountReason ??
                                                                ''
                                                            }
                                                            onChange={(
                                                                event,
                                                            ) =>
                                                                updateDraftItemDiscountReason(
                                                                    index,
                                                                    event
                                                                        .target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder="İndirim nedeni"
                                                        />

                                                        {(item.basketDiscountMinor ??
                                                            0) >
                                                            0 && (
                                                                <span className="sale-item-reason">
                                                                    Sepet indirimi:{' '}
                                                                    -
                                                                    {formatMoneyFromMinor(
                                                                        item.basketDiscountMinor ??
                                                                        0,
                                                                    )}
                                                                </span>
                                                            )}
                                                    </div>
                                                </td>

                                                <td>
                                                    <input
                                                        className="sale-inline-quantity"
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        value={
                                                            item.quantity
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateDraftItemQuantity(
                                                                index,
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                        aria-label={`${item.productName} satış adedi`}
                                                    />
                                                </td>

                                                <td>
                                                    {formatMoneyFromMinor(
                                                        item.listUnitPriceMinor,
                                                    )}
                                                </td>

                                                <td>
                                                    <input
                                                        className="sale-inline-price"
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={
                                                            item.actualUnitPriceMinor /
                                                            100
                                                        }
                                                        onChange={(
                                                            event,
                                                        ) =>
                                                            updateDraftItemPrice(
                                                                index,
                                                                event
                                                                    .target
                                                                    .value,
                                                            )
                                                        }
                                                        aria-label={`${item.productName} satış fiyatı`}
                                                    />
                                                </td>

                                                <td>
                                                    {formatMoneyFromMinor(
                                                        itemDiscount,
                                                    )}
                                                </td>

                                                <td>
                                                    <button
                                                        type="button"
                                                        className="action-button action-button-danger"
                                                        onClick={() =>
                                                            removeDraftItem(
                                                                item.productId,
                                                            )
                                                        }
                                                        aria-label={`${item.productName} satırını sil`}
                                                    >
                                                        <Trash2
                                                            size={
                                                                15
                                                            }
                                                        />
                                                        Satırı Sil
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    },
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="sale-actions">
                        <div className="sale-history-totals">
                            <span>
                                Ciro
                                <strong>
                                    {formatMoneyFromMinor(
                                        editingDraftRevenueMinor,
                                    )}
                                </strong>
                            </span>

                            <span>
                                İndirim
                                <strong>
                                    {formatMoneyFromMinor(
                                        editingDraftDiscountMinor,
                                    )}
                                </strong>
                            </span>
                        </div>

                        <button
                            type="button"
                            className="primary-button"
                            disabled={
                                draftItems.length ===
                                0
                            }
                            onClick={() =>
                                void handleSaveEditedSale()
                            }
                        >
                            <Save size={18} />
                            Değişiklikleri Kaydet
                        </button>

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={
                                stopEditingSale
                            }
                        >
                            <X size={18} />
                            Düzenlemeden Vazgeç
                        </button>
                    </div>
                </section>
            )}

            <section className="sales-history-section">
                <div className="sales-history-header">
                    <div>
                        <span className="page-eyebrow">
                            Kayıt Arşivi
                        </span>

                        <h2>
                            Satışlar
                        </h2>

                        <p>
                            Tarih, ürün ve satış durumuna göre
                            geçmiş kayıtları inceleyin.
                        </p>
                    </div>

                    {hasHistoryFilters && (
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={
                                clearHistoryFilters
                            }
                        >
                            Filtreleri Temizle
                        </button>
                    )}
                </div>

                <div className="sales-history-filters">
                    <label className="history-filter-field">
                        <span>
                            Başlangıç tarihi
                        </span>

                        <div className="history-filter-control">
                            <CalendarDays
                                size={16}
                            />

                            <input
                                type="date"
                                value={
                                    historyStartDate
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setHistoryStartDate(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                            />
                        </div>
                    </label>

                    <label className="history-filter-field">
                        <span>
                            Bitiş tarihi
                        </span>

                        <div className="history-filter-control">
                            <CalendarDays
                                size={16}
                            />

                            <input
                                type="date"
                                value={
                                    historyEndDate
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setHistoryEndDate(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                            />
                        </div>
                    </label>

                    <label className="history-filter-field history-search-field">
                        <span>
                            Ürün / SKU ara
                        </span>

                        <div className="history-filter-control">
                            <Search
                                size={16}
                            />

                            <input
                                type="search"
                                value={
                                    historySearch
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setHistorySearch(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Örn. Sade Şal veya SAD-001"
                            />
                        </div>
                    </label>

                    <label className="history-filter-field">
                        <span>
                            Durum
                        </span>

                        <select
                            className="history-status-select"
                            value={
                                historyStatus
                            }
                            onChange={(
                                event,
                            ) =>
                                setHistoryStatus(
                                    event
                                        .target
                                        .value as SaleHistoryStatusFilter,
                                )
                            }
                        >
                            <option value="all">
                                Tüm satışlar
                            </option>

                            <option value="completed">
                                Tamamlandı
                            </option>

                            <option value="cancelled">
                                İptal Edildi
                            </option>
                        </select>
                    </label>
                </div>

                <div className="history-summary-grid">
                    <article className="summary-card">
                        <span className="summary-card-title">
                            Satılan Ürün
                        </span>

                        <strong className="summary-card-value">
                            {
                                historyTotalQuantity
                            }
                        </strong>

                        <span className="summary-card-description">
                            Seçilen dönemdeki toplam adet
                        </span>
                    </article>

                    <article className="summary-card">
                        <span className="summary-card-title">
                            Ciro
                        </span>

                        <strong className="summary-card-value">
                            {formatMoneyFromMinor(
                                historyRevenueMinor,
                            )}
                        </strong>

                        <span className="summary-card-description">
                            İptal edilmeyen satışlar
                        </span>
                    </article>

                    <article className="summary-card">
                        <span className="summary-card-title">
                            Maliyet
                        </span>

                        <strong className="summary-card-value">
                            {formatMoneyFromMinor(
                                historyCostMinor,
                            )}
                        </strong>

                        <span className="summary-card-description">
                            FIFO maliyeti
                        </span>
                    </article>

                    <article className="summary-card">
                        <span className="summary-card-title">
                            Brüt Kâr
                        </span>

                        <strong className="summary-card-value">
                            {formatMoneyFromMinor(
                                historyGrossProfitMinor,
                            )}
                        </strong>

                        <span className="summary-card-description">
                            Ciro - FIFO maliyeti
                        </span>
                    </article>
                </div>

                {filteredSaleHistory.length ===
                    0 ? (
                    <article className="dashboard-panel">
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                <ShoppingCart
                                    size={30}
                                    strokeWidth={
                                        1.5
                                    }
                                />
                            </div>

                            <div>
                                <strong>
                                    Filtreye uygun satış bulunamadı
                                </strong>

                                <p>
                                    Tarih, ürün veya durum filtrelerini
                                    değiştirerek tekrar deneyin.
                                </p>
                            </div>
                        </div>
                    </article>
                ) : (
                    <div className="sales-history-list">
                        {filteredSaleHistory.map(
                            (record) => (
                                <article
                                    key={
                                        record
                                            .sale
                                            .id
                                    }
                                    className={`sale-history-card ${record
                                        .sale
                                        .status ===
                                        'cancelled'
                                        ? 'sale-history-card-cancelled'
                                        : ''
                                        }`}
                                >
                                    <div className="sale-history-card-header">
                                        <div>
                                            <div className="sale-history-date-row">
                                                <strong>
                                                    {formatDate(
                                                        record
                                                            .sale
                                                            .saleDate,
                                                    )}
                                                </strong>

                                                <span
                                                    className={`sale-status-badge ${record
                                                        .sale
                                                        .status ===
                                                        'completed'
                                                        ? 'sale-status-completed'
                                                        : 'sale-status-cancelled'
                                                        }`}
                                                >
                                                    {record
                                                        .sale
                                                        .status ===
                                                        'completed'
                                                        ? 'Tamamlandı'
                                                        : 'İptal Edildi'}
                                                </span>
                                            </div>

                                            <span className="sale-history-meta">
                                                {
                                                    record.totalQuantity
                                                }{' '}
                                                ürün •{' '}
                                                {
                                                    record
                                                        .items
                                                        .length
                                                }{' '}
                                                farklı ürün
                                            </span>
                                        </div>

                                        {record
                                            .sale
                                            .status ===
                                            'completed' && (
                                                <div className="sale-history-right">
                                                    <div className="sale-history-totals">
                                                        <span>
                                                            Ciro

                                                            <strong>
                                                                {formatMoneyFromMinor(
                                                                    record.revenueMinor,
                                                                )}
                                                            </strong>
                                                        </span>

                                                        <span>
                                                            Maliyet

                                                            <strong>
                                                                {formatMoneyFromMinor(
                                                                    record.costMinor,
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
                                                    </div>

                                                    <div className="sale-history-actions">
                                                        <button
                                                            type="button"
                                                            className="action-button"
                                                            onClick={() =>
                                                                startEditingSale(
                                                                    record,
                                                                )
                                                            }
                                                        >
                                                            <Pencil
                                                                size={
                                                                    15
                                                                }
                                                            />
                                                            Düzenle
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="action-button action-button-danger"
                                                            onClick={() =>
                                                                void handleCancelSale(
                                                                    record,
                                                                )
                                                            }
                                                        >
                                                            <Ban
                                                                size={
                                                                    15
                                                                }
                                                            />
                                                            İptal Et
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                    </div>

                                    <div className="sale-history-items">
                                        {record.items.map(
                                            (
                                                item,
                                            ) => (
                                                <div
                                                    key={
                                                        item.id
                                                    }
                                                    className="sale-history-item"
                                                >
                                                    <div>
                                                        <strong>
                                                            {
                                                                item.productName
                                                            }
                                                        </strong>

                                                        {item.discountReason && (
                                                            <span>
                                                                {
                                                                    item.discountReason
                                                                }
                                                            </span>
                                                        )}

                                                        {(item.basketDiscountMinor ??
                                                            0) >
                                                            0 && (
                                                                <span>
                                                                    Sepet indirimi:{' '}
                                                                    -
                                                                    {formatMoneyFromMinor(
                                                                        item.basketDiscountMinor ??
                                                                        0,
                                                                    )}
                                                                </span>
                                                            )}
                                                    </div>

                                                    <div className="sale-history-item-values">
                                                        <span>
                                                            {
                                                                item.quantity
                                                            }{' '}
                                                            adet
                                                        </span>

                                                        <span>
                                                            {formatMoneyFromMinor(
                                                                item.actualUnitPriceMinor,
                                                            )}{' '}
                                                            / adet
                                                        </span>

                                                        {record
                                                            .sale
                                                            .status ===
                                                            'completed' && (
                                                                <span>
                                                                    Kâr:{' '}
                                                                    {formatMoneyFromMinor(
                                                                        item.grossProfitMinor,
                                                                    )}
                                                                </span>
                                                            )}
                                                    </div>
                                                </div>
                                            ),
                                        )}
                                    </div>

                                    {record.sale
                                        .note && (
                                            <div className="sale-history-note">
                                                <strong>
                                                    Not:
                                                </strong>{' '}
                                                {
                                                    record
                                                        .sale
                                                        .note
                                                }
                                            </div>
                                        )}
                                </article>
                            ),
                        )}
                    </div>
                )}
            </section>
        </div>
    )
}

export default SalesHistoryPage
