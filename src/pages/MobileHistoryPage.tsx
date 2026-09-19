import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
    ArrowDown,
    ArrowUp,
    CalendarDays,
    ChevronRight,
    PackagePlus,
    Pencil,
    ReceiptText,
    Search,
    Trash2,
    X,
} from 'lucide-react'

import MobilePageHeader from '../components/mobile/MobilePageHeader'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import {
    inventoryAdjustmentService,
    type InventoryAdjustmentHistoryRecord,
} from '../services/inventoryAdjustmentService'
import { inventoryService } from '../services/inventoryService'
import { productService } from '../services/productService'
import {
    salesService,
    type SaleHistoryRecord,
} from '../services/salesService'
import type { InventoryLot } from '../types/inventoryLot'
import type { Product } from '../types/product'
import {
    formatDateValue,
    formatDisplayDate,
    getTodayDateValue,
} from '../utils/dateOnly'
import {
    formatMoneyFromMinor,
    parseMoneyToMinor,
} from '../utils/money'

type HistoryTab = 'sales' | 'stock'
type HistoryPeriod = 'all' | 'today' | '7d' | '30d'

type FeedbackState = {
    message: string
    tone: 'success' | 'error'
} | null

type StockMovement = {
    id: string
    productId: string
    productName: string
    date: string
    createdAt: string
    direction: 'increase' | 'decrease'
    quantity: number
    valueMinor: number
    title: string
    description: string
    unitCostMinor?: number
}

type SaleDraftItem = {
    id: string
    productId: string
    productName: string
    quantity: string
    actualPrice: string
    listUnitPriceMinor: number
    basketDiscountMinor?: number
    discountReason?: string
}

function normalizeSearch(value: string): string {
    return value.trim().toLocaleLowerCase('tr-TR')
}

function getPeriodStart(period: HistoryPeriod): string | null {
    if (period === 'all') {
        return null
    }

    const date = new Date()

    if (period === '7d') {
        date.setDate(date.getDate() - 6)
    }

    if (period === '30d') {
        date.setDate(date.getDate() - 29)
    }

    return period === 'today'
        ? getTodayDateValue()
        : formatDateValue(date)
}

function formatCreatedTime(value: string): string {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return ''
    }

    return new Intl.DateTimeFormat('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

function MobileHistoryPage() {
    const data = useLiveQuery(
        async () => {
            const [sales, lots, adjustments, products] = await Promise.all([
                salesService.getHistory(),
                inventoryService.getAll(),
                inventoryAdjustmentService.getHistory(),
                productService.getAll(),
            ])

            return { sales, lots, adjustments, products }
        },
        [],
        {
            sales: [] as SaleHistoryRecord[],
            lots: [] as InventoryLot[],
            adjustments: [] as InventoryAdjustmentHistoryRecord[],
            products: [] as Product[],
        },
    )

    const { sales, lots, adjustments, products } = data

    const [tab, setTab] = useState<HistoryTab>('sales')
    const [period, setPeriod] = useState<HistoryPeriod>('30d')
    const [search, setSearch] = useState('')
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
    const [selectedMovementId, setSelectedMovementId] =
        useState<string | null>(null)
    const [feedback, setFeedback] = useState<FeedbackState>(null)
    const [cancelTarget, setCancelTarget] = useState<SaleHistoryRecord | null>(
        null,
    )
    const [isCancelling, setIsCancelling] = useState(false)
    const [editingSaleId, setEditingSaleId] = useState<string | null>(null)
    const [editSaleDate, setEditSaleDate] = useState('')
    const [editSaleNote, setEditSaleNote] = useState('')
    const [draftItems, setDraftItems] = useState<SaleDraftItem[]>([])
    const [isSavingEdit, setIsSavingEdit] = useState(false)

    const productMap = useMemo(
        () => new Map(products.map((product) => [product.id, product])),
        [products],
    )

    const stockMovements = useMemo<StockMovement[]>(() => {
        const entries: StockMovement[] = []

        for (const lot of lots) {
            if (lot.entryType === 'adjustment') {
                continue
            }

            const product = productMap.get(lot.productId)

            entries.push({
                id: `lot-${lot.id}`,
                productId: lot.productId,
                productName: product?.name ?? 'Bilinmeyen ürün',
                date: lot.purchaseDate,
                createdAt: lot.createdAt,
                direction: 'increase',
                quantity: lot.quantityReceived,
                valueMinor: lot.quantityReceived * lot.unitCostMinor,
                unitCostMinor: lot.unitCostMinor,
                title:
                    lot.entryType === 'opening'
                        ? 'Açılış stoku'
                        : 'Stok girişi',
                description:
                    lot.note ??
                    (lot.entryType === 'opening'
                        ? 'Açılış stok partisi'
                        : 'Normal alış'),
            })
        }

        for (const record of adjustments) {
            const adjustment = record.adjustment

            entries.push({
                id: `adjustment-${adjustment.id}`,
                productId: adjustment.productId,
                productName: record.productName,
                date: adjustment.adjustmentDate,
                createdAt: adjustment.createdAt,
                direction: adjustment.direction,
                quantity: adjustment.quantity,
                valueMinor: record.valueMinor,
                unitCostMinor: adjustment.unitCostMinor,
                title:
                    adjustment.direction === 'increase'
                        ? 'Stok düzeltmesi • artış'
                        : 'Stok düzeltmesi • azalış',
                description: [adjustment.reason, adjustment.note]
                    .filter(Boolean)
                    .join(' • '),
            })
        }

        return entries.sort((first, second) => {
            const dateComparison = second.date.localeCompare(first.date)

            if (dateComparison !== 0) {
                return dateComparison
            }

            return second.createdAt.localeCompare(first.createdAt)
        })
    }, [lots, adjustments, productMap])

    const periodStart = getPeriodStart(period)
    const query = normalizeSearch(search)

    const filteredSales = useMemo(
        () =>
            sales.filter((record) => {
                if (periodStart && record.sale.saleDate < periodStart) {
                    return false
                }

                if (!query) {
                    return true
                }

                const searchable = normalizeSearch(
                    [
                        record.sale.note ?? '',
                        ...record.items.map((item) => item.productName),
                    ].join(' '),
                )

                return searchable.includes(query)
            }),
        [sales, periodStart, query],
    )

    const filteredMovements = useMemo(
        () =>
            stockMovements.filter((movement) => {
                if (periodStart && movement.date < periodStart) {
                    return false
                }

                if (!query) {
                    return true
                }

                return normalizeSearch(
                    `${movement.productName} ${movement.title} ${movement.description}`,
                ).includes(query)
            }),
        [stockMovements, periodStart, query],
    )

    const selectedSale = selectedSaleId
        ? sales.find((record) => record.sale.id === selectedSaleId)
        : undefined
    const selectedMovement = selectedMovementId
        ? stockMovements.find((movement) => movement.id === selectedMovementId)
        : undefined

    const draftTotalMinor = useMemo(
        () =>
            draftItems.reduce((total, item) => {
                const quantity = Number(item.quantity)

                if (!Number.isSafeInteger(quantity) || quantity <= 0) {
                    return total
                }

                try {
                    return (
                        total +
                        quantity * parseMoneyToMinor(item.actualPrice) -
                        (item.basketDiscountMinor ?? 0)
                    )
                } catch {
                    return total
                }
            }, 0),
        [draftItems],
    )

    function startEditing(record: SaleHistoryRecord) {
        if (record.sale.status === 'cancelled') {
            return
        }

        setEditingSaleId(record.sale.id)
        setEditSaleDate(record.sale.saleDate)
        setEditSaleNote(record.sale.note ?? '')
        setDraftItems(
            record.items.map((item) => ({
                id: item.id,
                productId: item.productId,
                productName: item.productName,
                quantity: String(item.quantity),
                actualPrice: (item.actualUnitPriceMinor / 100)
                    .toFixed(2)
                    .replace('.', ','),
                listUnitPriceMinor: item.listUnitPriceMinor,
                basketDiscountMinor: item.basketDiscountMinor,
                discountReason: item.discountReason,
            })),
        )
    }

    function stopEditing() {
        setEditingSaleId(null)
        setDraftItems([])
        setEditSaleDate('')
        setEditSaleNote('')
    }

    async function saveEditedSale() {
        if (!editingSaleId || isSavingEdit) {
            return
        }

        setIsSavingEdit(true)
        setFeedback(null)

        try {
            const items = draftItems.map((item) => {
                const quantity = Number(item.quantity)

                if (!Number.isSafeInteger(quantity) || quantity <= 0) {
                    throw new Error(
                        `${item.productName} için geçerli bir adet girin.`,
                    )
                }

                return {
                    productId: item.productId,
                    quantity,
                    listUnitPriceMinor: item.listUnitPriceMinor,
                    actualUnitPriceMinor: parseMoneyToMinor(
                        item.actualPrice,
                    ),
                    basketDiscountMinor: item.basketDiscountMinor,
                    discountReason: item.discountReason,
                }
            })

            await salesService.update(editingSaleId, {
                saleDate: editSaleDate,
                note: editSaleNote,
                items,
            })

            setFeedback({
                message: 'Satış başarıyla güncellendi.',
                tone: 'success',
            })
            stopEditing()
        } catch (caughtError) {
            setFeedback({
                message:
                    caughtError instanceof Error
                        ? caughtError.message
                        : 'Satış güncellenemedi.',
                tone: 'error',
            })
        } finally {
            setIsSavingEdit(false)
        }
    }

    async function confirmCancel() {
        if (!cancelTarget || isCancelling) {
            return
        }

        setIsCancelling(true)
        setFeedback(null)

        try {
            await salesService.cancel(cancelTarget.sale.id)
            setFeedback({
                message: 'Satış iptal edildi ve FIFO stokları yeniden hesaplandı.',
                tone: 'success',
            })
            setCancelTarget(null)
        } catch (caughtError) {
            setFeedback({
                message:
                    caughtError instanceof Error
                        ? caughtError.message
                        : 'Satış iptal edilemedi.',
                tone: 'error',
            })
        } finally {
            setIsCancelling(false)
        }
    }

    return (
        <div className="mobile-page-shell mh-page">
            <MobilePageHeader title="Geçmiş" />

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

            <div className="mh-tabs">
                <button
                    type="button"
                    className={tab === 'sales' ? 'is-active' : ''}
                    onClick={() => setTab('sales')}
                >
                    <ReceiptText size={17} />
                    Satışlar
                </button>
                <button
                    type="button"
                    className={tab === 'stock' ? 'is-active' : ''}
                    onClick={() => setTab('stock')}
                >
                    <PackagePlus size={17} />
                    Stok
                </button>
            </div>

            <label className="mh-search">
                <Search size={17} />
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={
                        tab === 'sales'
                            ? 'Ürün veya satış notu ara'
                            : 'Ürün veya hareket nedeni ara'
                    }
                />
            </label>

            <div className="mh-periods">
                {([
                    ['today', 'Bugün'],
                    ['7d', '7 Gün'],
                    ['30d', '30 Gün'],
                    ['all', 'Tümü'],
                ] as const).map(([value, label]) => (
                    <button
                        key={value}
                        type="button"
                        className={period === value ? 'is-active' : ''}
                        onClick={() => setPeriod(value)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'sales' ? (
                <section className="mh-list">
                    {filteredSales.length === 0 ? (
                        <div className="mh-empty">
                            <ReceiptText size={27} />
                            <strong>Satış kaydı bulunamadı</strong>
                            <span>Filtreleri değiştirerek tekrar deneyin.</span>
                        </div>
                    ) : (
                        filteredSales.map((record) => (
                            <button
                                key={record.sale.id}
                                type="button"
                                className={`mh-sale-card ${record.sale.status === 'cancelled' ? 'is-cancelled' : ''}`}
                                onClick={() =>
                                    setSelectedSaleId(record.sale.id)
                                }
                            >
                                <div className="mh-card-topline">
                                    <div>
                                        <strong>
                                            {formatDisplayDate(
                                                record.sale.saleDate,
                                            )}
                                        </strong>
                                        <span>
                                            {formatCreatedTime(
                                                record.sale.createdAt,
                                            )}
                                        </span>
                                    </div>
                                    <span
                                        className={`mh-sale-status ${record.sale.status === 'cancelled' ? 'is-cancelled' : ''}`}
                                    >
                                        {record.sale.status === 'cancelled'
                                            ? 'İptal'
                                            : 'Tamamlandı'}
                                    </span>
                                </div>

                                <div className="mh-sale-products">
                                    {record.items
                                        .slice(0, 2)
                                        .map((item) => (
                                            <span key={item.id}>
                                                {item.productName} ×{' '}
                                                {item.quantity}
                                            </span>
                                        ))}
                                    {record.items.length > 2 && (
                                        <span>
                                            +{record.items.length - 2} ürün
                                        </span>
                                    )}
                                </div>

                                <div className="mh-card-bottomline">
                                    <span>
                                        {record.totalQuantity} adet •{' '}
                                        {record.items.length} kalem
                                    </span>
                                    <strong>
                                        {formatMoneyFromMinor(
                                            record.revenueMinor,
                                        )}
                                    </strong>
                                    <ChevronRight size={17} />
                                </div>
                            </button>
                        ))
                    )}
                </section>
            ) : (
                <section className="mh-list">
                    {filteredMovements.length === 0 ? (
                        <div className="mh-empty">
                            <PackagePlus size={27} />
                            <strong>Stok hareketi bulunamadı</strong>
                            <span>Filtreleri değiştirerek tekrar deneyin.</span>
                        </div>
                    ) : (
                        filteredMovements.map((movement) => (
                            <button
                                key={movement.id}
                                type="button"
                                className="mh-stock-card"
                                onClick={() =>
                                    setSelectedMovementId(movement.id)
                                }
                            >
                                <span
                                    className={`mh-movement-icon ${movement.direction === 'increase' ? 'is-increase' : 'is-decrease'}`}
                                >
                                    {movement.direction === 'increase' ? (
                                        <ArrowUp size={17} />
                                    ) : (
                                        <ArrowDown size={17} />
                                    )}
                                </span>
                                <div>
                                    <strong>{movement.productName}</strong>
                                    <span>{movement.title}</span>
                                    <small>
                                        {formatDisplayDate(movement.date)} •{' '}
                                        {formatCreatedTime(movement.createdAt)}
                                    </small>
                                </div>
                                <div className="mh-movement-value">
                                    <strong>
                                        {movement.direction === 'increase'
                                            ? '+'
                                            : '-'}
                                        {movement.quantity}
                                    </strong>
                                    <span>adet</span>
                                </div>
                                <ChevronRight size={17} />
                            </button>
                        ))
                    )}
                </section>
            )}

            {selectedSale && (
                <div
                    className="mpi-sheet-backdrop"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setSelectedSaleId(null)
                            stopEditing()
                        }
                    }}
                >
                    <section
                        className="mpi-detail-sheet mh-detail-sheet"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Satış detayı"
                    >
                        <div className="mpi-sheet-handle" />
                        <header className="mpi-sheet-header">
                            <div>
                                <span>SATIŞ DETAYI</span>
                                <h2>
                                    {formatDisplayDate(
                                        selectedSale.sale.saleDate,
                                    )}
                                </h2>
                                <p>
                                    {selectedSale.totalQuantity} adet •{' '}
                                    {selectedSale.items.length} kalem
                                </p>
                            </div>
                            <button
                                type="button"
                                className="pi-icon-button"
                                aria-label="Satış detayını kapat"
                                onClick={() => {
                                    setSelectedSaleId(null)
                                    stopEditing()
                                }}
                            >
                                <X size={19} />
                            </button>
                        </header>

                        <div className="mpi-sheet-scroll">
                            {editingSaleId === selectedSale.sale.id ? (
                                <div className="mh-editor">
                                    <label className="pi-field">
                                        <span>Satış tarihi</span>
                                        <input
                                            type="date"
                                            value={editSaleDate}
                                            onChange={(event) =>
                                                setEditSaleDate(
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </label>

                                    <div className="mh-editor-items">
                                        {draftItems.map((item, index) => (
                                            <article key={item.id}>
                                                <strong>
                                                    {item.productName}
                                                </strong>
                                                <div>
                                                    <label className="pi-field">
                                                        <span>Adet</span>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            step="1"
                                                            inputMode="numeric"
                                                            value={item.quantity}
                                                            onChange={(event) =>
                                                                setDraftItems(
                                                                    (current) =>
                                                                        current.map(
                                                                            (
                                                                                draft,
                                                                                draftIndex,
                                                                            ) =>
                                                                                draftIndex ===
                                                                                index
                                                                                    ? {
                                                                                        ...draft,
                                                                                        quantity:
                                                                                            event
                                                                                                .target
                                                                                                .value,
                                                                                    }
                                                                                    : draft,
                                                                        ),
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                    <label className="pi-field">
                                                        <span>Satış fiyatı</span>
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            value={
                                                                item.actualPrice
                                                            }
                                                            onChange={(event) =>
                                                                setDraftItems(
                                                                    (current) =>
                                                                        current.map(
                                                                            (
                                                                                draft,
                                                                                draftIndex,
                                                                            ) =>
                                                                                draftIndex ===
                                                                                index
                                                                                    ? {
                                                                                        ...draft,
                                                                                        actualPrice:
                                                                                            event
                                                                                                .target
                                                                                                .value,
                                                                                    }
                                                                                    : draft,
                                                                        ),
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                </div>
                                            </article>
                                        ))}
                                    </div>

                                    <label className="pi-field">
                                        <span>Satış notu</span>
                                        <input
                                            type="text"
                                            value={editSaleNote}
                                            onChange={(event) =>
                                                setEditSaleNote(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="İsteğe bağlı"
                                        />
                                    </label>

                                    <div className="mh-editor-total">
                                        <span>Yeni satış toplamı</span>
                                        <strong>
                                            {formatMoneyFromMinor(
                                                draftTotalMinor,
                                            )}
                                        </strong>
                                    </div>

                                    <div className="mh-detail-actions">
                                        <button
                                            type="button"
                                            className="pi-button pi-button-secondary"
                                            onClick={stopEditing}
                                            disabled={isSavingEdit}
                                        >
                                            Vazgeç
                                        </button>
                                        <button
                                            type="button"
                                            className="pi-button pi-button-primary"
                                            onClick={() =>
                                                void saveEditedSale()
                                            }
                                            disabled={isSavingEdit}
                                        >
                                            {isSavingEdit
                                                ? 'Kaydediliyor...'
                                                : 'Satışı Güncelle'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="mh-detail-summary">
                                        <article>
                                            <span>Ciro</span>
                                            <strong>
                                                {formatMoneyFromMinor(
                                                    selectedSale.revenueMinor,
                                                )}
                                            </strong>
                                        </article>
                                        <article>
                                            <span>Maliyet</span>
                                            <strong>
                                                {formatMoneyFromMinor(
                                                    selectedSale.costMinor,
                                                )}
                                            </strong>
                                        </article>
                                        <article>
                                            <span>Brüt kâr</span>
                                            <strong>
                                                {formatMoneyFromMinor(
                                                    selectedSale.grossProfitMinor,
                                                )}
                                            </strong>
                                        </article>
                                    </div>

                                    <div className="mh-detail-items">
                                        {selectedSale.items.map((item) => (
                                            <article key={item.id}>
                                                <div>
                                                    <strong>
                                                        {item.productName}
                                                    </strong>
                                                    <span>
                                                        {item.quantity} ×{' '}
                                                        {formatMoneyFromMinor(
                                                            item.actualUnitPriceMinor,
                                                        )}
                                                    </span>
                                                </div>
                                                <strong>
                                                    {formatMoneyFromMinor(
                                                        item.revenueMinor,
                                                    )}
                                                </strong>
                                            </article>
                                        ))}
                                    </div>

                                    {selectedSale.sale.note && (
                                        <div className="mh-note-box">
                                            <span>Not</span>
                                            <strong>
                                                {selectedSale.sale.note}
                                            </strong>
                                        </div>
                                    )}

                                    {selectedSale.sale.status === 'completed' && (
                                        <div className="mh-detail-actions">
                                            <button
                                                type="button"
                                                className="pi-button pi-button-secondary"
                                                onClick={() =>
                                                    startEditing(selectedSale)
                                                }
                                            >
                                                <Pencil size={16} />
                                                Düzenle
                                            </button>
                                            <button
                                                type="button"
                                                className="pi-button pi-button-danger"
                                                onClick={() =>
                                                    setCancelTarget(selectedSale)
                                                }
                                            >
                                                <Trash2 size={16} />
                                                Satışı İptal Et
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </section>
                </div>
            )}

            {selectedMovement && (
                <div
                    className="mpi-sheet-backdrop"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setSelectedMovementId(null)
                        }
                    }}
                >
                    <section
                        className="mpi-detail-sheet mh-movement-sheet"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Stok hareketi detayı"
                    >
                        <div className="mpi-sheet-handle" />
                        <header className="mpi-sheet-header">
                            <div>
                                <span>STOK HAREKETİ</span>
                                <h2>{selectedMovement.productName}</h2>
                                <p>{selectedMovement.title}</p>
                            </div>
                            <button
                                type="button"
                                className="pi-icon-button"
                                aria-label="Hareket detayını kapat"
                                onClick={() => setSelectedMovementId(null)}
                            >
                                <X size={19} />
                            </button>
                        </header>

                        <div className="mpi-sheet-scroll">
                            <div className="mh-movement-hero">
                                <span
                                    className={
                                        selectedMovement.direction ===
                                        'increase'
                                            ? 'is-increase'
                                            : 'is-decrease'
                                    }
                                >
                                    {selectedMovement.direction === 'increase'
                                        ? '+'
                                        : '-'}
                                    {selectedMovement.quantity} adet
                                </span>
                                <strong>
                                    {formatMoneyFromMinor(
                                        selectedMovement.valueMinor,
                                    )}
                                </strong>
                            </div>

                            <div className="mh-movement-detail-grid">
                                <article>
                                    <CalendarDays size={17} />
                                    <span>Tarih</span>
                                    <strong>
                                        {formatDisplayDate(
                                            selectedMovement.date,
                                        )}
                                    </strong>
                                </article>
                                {selectedMovement.unitCostMinor !==
                                    undefined && (
                                    <article>
                                        <PackagePlus size={17} />
                                        <span>Birim maliyet</span>
                                        <strong>
                                            {formatMoneyFromMinor(
                                                selectedMovement.unitCostMinor,
                                            )}
                                        </strong>
                                    </article>
                                )}
                            </div>

                            {selectedMovement.description && (
                                <div className="mh-note-box">
                                    <span>Açıklama</span>
                                    <strong>
                                        {selectedMovement.description}
                                    </strong>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}

            <ConfirmDialog
                open={cancelTarget !== null}
                title="Satışı iptal et?"
                description={
                    cancelTarget
                        ? `${formatDisplayDate(cancelTarget.sale.saleDate)} tarihli ${formatMoneyFromMinor(cancelTarget.revenueMinor)} tutarındaki satış iptal edilecek. FIFO stokları otomatik yeniden hesaplanacak.`
                        : ''
                }
                confirmLabel="Satışı İptal Et"
                pendingLabel="İptal ediliyor..."
                tone="danger"
                isConfirming={isCancelling}
                onConfirm={confirmCancel}
                onCancel={() => {
                    if (!isCancelling) {
                        setCancelTarget(null)
                    }
                }}
            />
        </div>
    )
}

export default MobileHistoryPage
