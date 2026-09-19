import {
    ArchiveRestore,
    Boxes,
    Minus,
    PackagePlus,
    Pencil,
    Plus,
    Power,
    Save,
    Trash2,
    X,
} from 'lucide-react'
import {
    useMemo,
    useState,
    type FormEvent,
    type ReactNode,
} from 'react'

import ConfirmDialog from '../ui/ConfirmDialog'
import { categoryService } from '../../services/categoryService'
import { inventoryAdjustmentService } from '../../services/inventoryAdjustmentService'
import { inventoryService } from '../../services/inventoryService'
import { productService } from '../../services/productService'
import type { Category } from '../../types/category'
import type { InventoryAdjustmentDirection } from '../../types/inventoryAdjustment'
import type { InventoryEntryType } from '../../types/inventoryLot'
import type { Product } from '../../types/product'
import { getTodayDateValue } from '../../utils/dateOnly'
import { parseMoneyToMinor } from '../../utils/money'

export type ProductsInventoryFeedback = (
    message: string,
    tone?: 'success' | 'error',
) => void

type DialogShellProps = {
    eyebrow: string
    title: string
    description?: string
    wide?: boolean
    onClose: () => void
    children: ReactNode
}

function DialogShell({
    eyebrow,
    title,
    description,
    wide = false,
    onClose,
    children,
}: DialogShellProps) {
    return (
        <div
            className="pi-dialog-backdrop"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose()
                }
            }}
        >
            <section
                className={`pi-dialog ${wide ? 'pi-dialog-wide' : ''}`}
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                <header className="pi-dialog-header">
                    <div>
                        <span>{eyebrow}</span>
                        <h2>{title}</h2>
                        {description && <p>{description}</p>}
                    </div>

                    <button
                        type="button"
                        className="pi-icon-button"
                        aria-label="Pencereyi kapat"
                        onClick={onClose}
                    >
                        <X size={19} />
                    </button>
                </header>

                <div className="pi-dialog-body">
                    {children}
                </div>
            </section>
        </div>
    )
}

type ProductEditorDialogProps = {
    product?: Product
    categories: Category[]
    onClose: () => void
    onFeedback: ProductsInventoryFeedback
}

export function ProductEditorDialog({
    product,
    categories,
    onClose,
    onFeedback,
}: ProductEditorDialogProps) {
    const [name, setName] = useState(product?.name ?? '')
    const [sku, setSku] = useState(product?.sku ?? '')
    const [categoryId, setCategoryId] = useState(
        product?.categoryId ?? '',
    )
    const [price, setPrice] = useState(
        product
            ? (product.defaultSalePriceMinor / 100)
                .toFixed(2)
                .replace('.', ',')
            : '',
    )
    const [minimumStock, setMinimumStock] = useState(
        String(product?.minimumStock ?? 0),
    )
    const [isSaving, setIsSaving] = useState(false)
    const [localError, setLocalError] = useState('')

    const selectableCategories = useMemo(
        () =>
            categories.filter(
                (category) =>
                    category.isActive ||
                    category.id === product?.categoryId,
            ),
        [categories, product?.categoryId],
    )

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()

        if (isSaving) {
            return
        }

        setLocalError('')
        setIsSaving(true)

        try {
            const parsedMinimumStock = Number(minimumStock)

            if (
                !Number.isSafeInteger(parsedMinimumStock) ||
                parsedMinimumStock < 0
            ) {
                throw new Error(
                    'Minimum stok negatif olmayan tam sayı olmalıdır.',
                )
            }

            const input = {
                name,
                sku,
                categoryId,
                defaultSalePriceMinor: parseMoneyToMinor(price),
                minimumStock: parsedMinimumStock,
            }

            if (product) {
                await productService.update(product.id, input)
                onFeedback('Ürün başarıyla güncellendi.')
            } else {
                await productService.create(input)
                onFeedback('Ürün başarıyla oluşturuldu.')
            }

            onClose()
        } catch (caughtError) {
            setLocalError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Ürün kaydedilemedi.',
            )
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <DialogShell
            eyebrow={product ? 'Ürün düzenleme' : 'Yeni ürün'}
            title={product ? product.name : 'Ürün Ekle'}
            description="Satış, kategori ve minimum stok bilgilerini tek yerden yönetin."
            onClose={onClose}
        >
            {localError && (
                <div className="form-message form-message-error pi-dialog-feedback" role="status">
                    {localError}
                </div>
            )}
            <form className="pi-form" onSubmit={handleSubmit}>
                <label className="pi-field pi-field-span-2">
                    <span>Ürün adı</span>
                    <input
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Örn. Sade Şal"
                        autoFocus
                        required
                    />
                </label>

                <label className="pi-field">
                    <span>SKU / Ürün kodu</span>
                    <input
                        type="text"
                        value={sku}
                        onChange={(event) => setSku(event.target.value)}
                        placeholder="İsteğe bağlı"
                    />
                </label>

                <label className="pi-field">
                    <span>Kategori</span>
                    <select
                        value={categoryId}
                        onChange={(event) =>
                            setCategoryId(event.target.value)
                        }
                    >
                        <option value="">Kategorisiz</option>
                        {selectableCategories.map((category) => (
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

                <label className="pi-field">
                    <span>Satış fiyatı</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={price}
                        onChange={(event) => setPrice(event.target.value)}
                        placeholder="Örn. 60,00"
                        required
                    />
                </label>

                <label className="pi-field">
                    <span>Minimum stok</span>
                    <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={minimumStock}
                        onChange={(event) =>
                            setMinimumStock(event.target.value)
                        }
                        required
                    />
                </label>

                <div className="pi-form-actions pi-field-span-2">
                    <button
                        type="button"
                        className="pi-button pi-button-secondary"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        Vazgeç
                    </button>

                    <button
                        type="submit"
                        className="pi-button pi-button-primary"
                        disabled={isSaving}
                    >
                        <Save size={17} />
                        {isSaving
                            ? 'Kaydediliyor...'
                            : product
                                ? 'Değişiklikleri Kaydet'
                                : 'Ürünü Ekle'}
                    </button>
                </div>
            </form>
        </DialogShell>
    )
}

type StockEntryDialogProps = {
    products: Product[]
    initialProductId?: string
    onClose: () => void
    onFeedback: ProductsInventoryFeedback
}

export function StockEntryDialog({
    products,
    initialProductId = '',
    onClose,
    onFeedback,
}: StockEntryDialogProps) {
    const activeProducts = useMemo(
        () => products.filter((product) => product.isActive),
        [products],
    )

    const [productId, setProductId] = useState(initialProductId)
    const [entryType, setEntryType] =
        useState<InventoryEntryType>('purchase')
    const [purchaseDate, setPurchaseDate] = useState(
        getTodayDateValue(),
    )
    const [quantity, setQuantity] = useState('')
    const [unitCost, setUnitCost] = useState('')
    const [note, setNote] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [localError, setLocalError] = useState('')

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()

        if (isSaving) {
            return
        }

        setLocalError('')
        setIsSaving(true)

        try {
            const parsedQuantity = Number(quantity)

            if (
                !Number.isSafeInteger(parsedQuantity) ||
                parsedQuantity <= 0
            ) {
                throw new Error(
                    'Stok adedi sıfırdan büyük tam sayı olmalıdır.',
                )
            }

            await inventoryService.create({
                productId,
                entryType,
                purchaseDate,
                quantityReceived: parsedQuantity,
                unitCostMinor: parseMoneyToMinor(unitCost),
                note,
            })

            const productName =
                products.find((product) => product.id === productId)?.name ??
                'Ürün'

            onFeedback(
                `${productName} stoğa eklendi • ${parsedQuantity} adet`,
            )
            onClose()
        } catch (caughtError) {
            setLocalError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Stok girişi kaydedilemedi.',
            )
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <DialogShell
            eyebrow="FIFO stok partisi"
            title="Stok Girişi"
            description="Her stok girişi alış maliyetiyle ayrı bir FIFO partisi oluşturur."
            onClose={onClose}
        >
            {localError && (
                <div className="form-message form-message-error pi-dialog-feedback" role="status">
                    {localError}
                </div>
            )}
            <form className="pi-form" onSubmit={handleSubmit}>
                <label className="pi-field pi-field-span-2">
                    <span>Ürün</span>
                    <select
                        value={productId}
                        onChange={(event) => setProductId(event.target.value)}
                        required
                    >
                        <option value="">Ürün seçin</option>
                        {activeProducts.map((product) => (
                            <option key={product.id} value={product.id}>
                                {product.name}
                                {product.sku ? ` · ${product.sku}` : ''}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="pi-field">
                    <span>Giriş türü</span>
                    <select
                        value={entryType}
                        onChange={(event) =>
                            setEntryType(
                                event.target.value as InventoryEntryType,
                            )
                        }
                    >
                        <option value="purchase">Normal alış</option>
                        <option value="opening">Açılış stoku</option>
                    </select>
                </label>

                <label className="pi-field">
                    <span>Tarih</span>
                    <input
                        type="date"
                        value={purchaseDate}
                        onChange={(event) =>
                            setPurchaseDate(event.target.value)
                        }
                        required
                    />
                </label>

                <label className="pi-field">
                    <span>Adet</span>
                    <input
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        value={quantity}
                        onChange={(event) => setQuantity(event.target.value)}
                        placeholder="Örn. 20"
                        required
                    />
                </label>

                <label className="pi-field">
                    <span>Alış fiyatı / adet</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={unitCost}
                        onChange={(event) => setUnitCost(event.target.value)}
                        placeholder="Örn. 35,00"
                        required
                    />
                </label>

                <label className="pi-field pi-field-span-2">
                    <span>Not</span>
                    <input
                        type="text"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="İsteğe bağlı"
                    />
                </label>

                <div className="pi-info-box pi-field-span-2">
                    Satışlar daha sonra bu partileri tarih sırasına göre FIFO ile
                    tüketecek.
                </div>

                <div className="pi-form-actions pi-field-span-2">
                    <button
                        type="button"
                        className="pi-button pi-button-secondary"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        Vazgeç
                    </button>
                    <button
                        type="submit"
                        className="pi-button pi-button-primary"
                        disabled={isSaving}
                    >
                        <PackagePlus size={17} />
                        {isSaving ? 'Kaydediliyor...' : 'Stoka Ekle'}
                    </button>
                </div>
            </form>
        </DialogShell>
    )
}

type StockAdjustmentDialogProps = {
    product: Product
    currentStock: number
    onClose: () => void
    onFeedback: ProductsInventoryFeedback
}

export function StockAdjustmentDialog({
    product,
    currentStock,
    onClose,
    onFeedback,
}: StockAdjustmentDialogProps) {
    const [direction, setDirection] =
        useState<InventoryAdjustmentDirection>('decrease')
    const [date, setDate] = useState(getTodayDateValue())
    const [quantity, setQuantity] = useState('')
    const [unitCost, setUnitCost] = useState('')
    const [reason, setReason] = useState('')
    const [note, setNote] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [localError, setLocalError] = useState('')

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()

        if (isSaving) {
            return
        }

        setLocalError('')
        setIsSaving(true)

        try {
            const parsedQuantity = Number(quantity)

            if (
                !Number.isSafeInteger(parsedQuantity) ||
                parsedQuantity <= 0
            ) {
                throw new Error(
                    'Düzeltme adedi sıfırdan büyük tam sayı olmalıdır.',
                )
            }

            if (
                direction === 'decrease' &&
                parsedQuantity > currentStock
            ) {
                throw new Error(
                    `Stok ${currentStock} adet. Bundan daha fazla stok azaltılamaz.`,
                )
            }

            await inventoryAdjustmentService.create({
                productId: product.id,
                adjustmentDate: date,
                direction,
                quantity: parsedQuantity,
                unitCostMinor:
                    direction === 'increase'
                        ? parseMoneyToMinor(unitCost)
                        : undefined,
                reason,
                note,
            })

            onFeedback(
                `${product.name} stoğu ${direction === 'increase' ? 'artırıldı' : 'azaltıldı'} • ${parsedQuantity} adet`,
            )
            onClose()
        } catch (caughtError) {
            setLocalError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Stok düzeltmesi kaydedilemedi.',
            )
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <DialogShell
            eyebrow="Manuel stok hareketi"
            title="Stok Düzelt"
            description={`${product.name} • Güncel stok ${currentStock} adet`}
            onClose={onClose}
        >
            {localError && (
                <div className="form-message form-message-error pi-dialog-feedback" role="status">
                    {localError}
                </div>
            )}
            <form className="pi-form" onSubmit={handleSubmit}>
                <div className="pi-segmented pi-field-span-2">
                    <button
                        type="button"
                        className={
                            direction === 'decrease' ? 'is-active' : ''
                        }
                        onClick={() => {
                            setDirection('decrease')
                            setUnitCost('')
                        }}
                    >
                        <Minus size={16} />
                        Stok Azalt
                    </button>
                    <button
                        type="button"
                        className={
                            direction === 'increase' ? 'is-active' : ''
                        }
                        onClick={() => setDirection('increase')}
                    >
                        <Plus size={16} />
                        Stok Artır
                    </button>
                </div>

                <label className="pi-field">
                    <span>Tarih</span>
                    <input
                        type="date"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        required
                    />
                </label>

                <label className="pi-field">
                    <span>Adet</span>
                    <input
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        value={quantity}
                        onChange={(event) => setQuantity(event.target.value)}
                        placeholder="Örn. 2"
                        required
                    />
                </label>

                {direction === 'increase' && (
                    <label className="pi-field pi-field-span-2">
                        <span>Birim maliyet</span>
                        <input
                            type="text"
                            inputMode="decimal"
                            value={unitCost}
                            onChange={(event) => setUnitCost(event.target.value)}
                            placeholder="Örn. 35,00"
                            required
                        />
                    </label>
                )}

                <label className="pi-field pi-field-span-2">
                    <span>Neden</span>
                    <input
                        type="text"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Örn. Sayım farkı, hasarlı ürün"
                        required
                    />
                </label>

                <label className="pi-field pi-field-span-2">
                    <span>Not</span>
                    <input
                        type="text"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="İsteğe bağlı"
                    />
                </label>

                <div className="pi-info-box pi-field-span-2">
                    {direction === 'increase'
                        ? 'Artış, girdiğiniz maliyetle yeni bir FIFO partisi oluşturur.'
                        : 'Azalış, seçilen tarihte FIFO sırasına göre mevcut partilerden düşülür.'}
                </div>

                <div className="pi-form-actions pi-field-span-2">
                    <button
                        type="button"
                        className="pi-button pi-button-secondary"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        Vazgeç
                    </button>
                    <button
                        type="submit"
                        className="pi-button pi-button-primary"
                        disabled={isSaving}
                    >
                        <Save size={17} />
                        {isSaving ? 'Kaydediliyor...' : 'Düzeltmeyi Kaydet'}
                    </button>
                </div>
            </form>
        </DialogShell>
    )
}

type CategoryManagerDialogProps = {
    categories: Category[]
    onClose: () => void
    onFeedback: ProductsInventoryFeedback
}

export function CategoryManagerDialog({
    categories,
    onClose,
    onFeedback,
}: CategoryManagerDialogProps) {
    const [name, setName] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [busyId, setBusyId] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [localMessage, setLocalMessage] = useState('')
    const [localError, setLocalError] = useState('')

    function resetForm() {
        setName('')
        setEditingId(null)
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()

        if (isSaving) {
            return
        }

        setLocalMessage('')
        setLocalError('')
        setIsSaving(true)

        try {
            if (editingId) {
                await categoryService.update(editingId, { name })
                setLocalMessage('Kategori başarıyla güncellendi.')
                onFeedback('Kategori başarıyla güncellendi.')
            } else {
                await categoryService.create({ name })
                setLocalMessage('Kategori başarıyla oluşturuldu.')
                onFeedback('Kategori başarıyla oluşturuldu.')
            }

            resetForm()
        } catch (caughtError) {
            setLocalError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Kategori kaydedilemedi.',
            )
        } finally {
            setIsSaving(false)
        }
    }

    async function toggleCategory(category: Category) {
        if (busyId) {
            return
        }

        setLocalMessage('')
        setLocalError('')
        setBusyId(category.id)

        try {
            await categoryService.setActive(
                category.id,
                !category.isActive,
            )
            const message = category.isActive
                ? 'Kategori pasife alındı.'
                : 'Kategori tekrar aktifleştirildi.'
            setLocalMessage(message)
            onFeedback(message)
        } catch (caughtError) {
            setLocalError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Kategori durumu değiştirilemedi.',
            )
        } finally {
            setBusyId(null)
        }
    }

    async function requestDelete(category: Category) {
        if (busyId || isDeleting) {
            return
        }

        setLocalMessage('')
        setLocalError('')
        setBusyId(category.id)

        try {
            const check = await categoryService.getDeletionCheck(category.id)

            if (!check.canDelete) {
                throw new Error(
                    check.reason ?? 'Kategori kalıcı olarak silinemiyor.',
                )
            }

            setDeleteTarget(category)
        } catch (caughtError) {
            setLocalError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Kategori silme durumu kontrol edilemedi.',
            )
        } finally {
            setBusyId(null)
        }
    }

    async function confirmDelete() {
        if (!deleteTarget || isDeleting) {
            return
        }

        setIsDeleting(true)

        try {
            await categoryService.deletePermanently(deleteTarget.id)
            setLocalMessage('Kategori kalıcı olarak silindi.')
            setLocalError('')
            onFeedback('Kategori kalıcı olarak silindi.')

            if (editingId === deleteTarget.id) {
                resetForm()
            }

            setDeleteTarget(null)
        } catch (caughtError) {
            setLocalError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Kategori silinemedi.',
            )
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <>
            <DialogShell
                eyebrow="Katalog düzeni"
                title="Kategorileri Yönet"
                description="Kategorileri ana ürün ekranını kalabalıklaştırmadan yönetin."
                wide
                onClose={onClose}
            >
                {(localMessage || localError) && (
                    <div
                        className={`form-message ${localError ? 'form-message-error' : 'form-message-success'} pi-dialog-feedback`}
                        role="status"
                    >
                        {localError || localMessage}
                    </div>
                )}
                <div className="pi-category-layout">
                    <form
                        className="pi-category-form"
                        onSubmit={handleSubmit}
                    >
                        <span className="pi-section-kicker">
                            {editingId ? 'Kategoriyi düzenle' : 'Yeni kategori'}
                        </span>
                        <label className="pi-field">
                            <span>Kategori adı</span>
                            <input
                                type="text"
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                placeholder="Örn. Şal"
                                required
                            />
                        </label>

                        <div className="pi-category-form-actions">
                            {editingId && (
                                <button
                                    type="button"
                                    className="pi-button pi-button-secondary"
                                    onClick={resetForm}
                                    disabled={isSaving}
                                >
                                    Vazgeç
                                </button>
                            )}
                            <button
                                type="submit"
                                className="pi-button pi-button-primary"
                                disabled={isSaving}
                            >
                                {editingId ? (
                                    <Save size={16} />
                                ) : (
                                    <Plus size={16} />
                                )}
                                {isSaving
                                    ? 'Kaydediliyor...'
                                    : editingId
                                        ? 'Kaydet'
                                        : 'Kategori Ekle'}
                            </button>
                        </div>
                    </form>

                    <div className="pi-category-list-panel">
                        <div className="pi-category-list-heading">
                            <div>
                                <strong>Kategoriler</strong>
                                <span>{categories.length} kayıt</span>
                            </div>
                            <Boxes size={20} />
                        </div>

                        <div className="pi-category-list">
                            {categories.length === 0 ? (
                                <div className="pi-empty-compact">
                                    Henüz kategori bulunmuyor.
                                </div>
                            ) : (
                                categories.map((category) => (
                                    <article
                                        key={category.id}
                                        className="pi-category-row"
                                    >
                                        <div>
                                            <strong>{category.name}</strong>
                                            <span
                                                className={`pi-mini-status ${category.isActive ? 'is-active' : 'is-passive'}`}
                                            >
                                                {category.isActive
                                                    ? 'Aktif'
                                                    : 'Pasif'}
                                            </span>
                                        </div>

                                        <div className="pi-category-actions">
                                            <button
                                                type="button"
                                                className="pi-icon-action"
                                                title="Düzenle"
                                                disabled={busyId !== null}
                                                onClick={() => {
                                                    setEditingId(category.id)
                                                    setName(category.name)
                                                }}
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                type="button"
                                                className="pi-icon-action"
                                                title={
                                                    category.isActive
                                                        ? 'Pasife al'
                                                        : 'Aktifleştir'
                                                }
                                                disabled={busyId !== null}
                                                onClick={() =>
                                                    void toggleCategory(category)
                                                }
                                            >
                                                {category.isActive ? (
                                                    <Power size={15} />
                                                ) : (
                                                    <ArchiveRestore size={15} />
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                className="pi-icon-action pi-icon-action-danger"
                                                title="Kalıcı sil"
                                                disabled={busyId !== null}
                                                onClick={() =>
                                                    void requestDelete(category)
                                                }
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </article>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </DialogShell>

            <ConfirmDialog
                open={deleteTarget !== null}
                title="Kategoriyi kalıcı olarak sil?"
                description={
                    deleteTarget
                        ? `“${deleteTarget.name}” kalıcı olarak silinecek. Bu işlem geri alınamaz.`
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
        </>
    )
}

