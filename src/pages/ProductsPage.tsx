import { useMemo, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Boxes, Pencil, Plus, Power, Trash2, X } from 'lucide-react'
import { categoryService } from '../services/categoryService'
import { inventoryService } from '../services/inventoryService'
import { productService } from '../services/productService'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import type { Category } from '../types/category'
import type { InventoryLot } from '../types/inventoryLot'
import type { Product } from '../types/product'
import {
    formatMoneyFromMinor,
    parseMoneyToMinor,
} from '../utils/money'

function ProductsPage() {
    const data = useLiveQuery(
        async () => {
            const [categories, products, lots] = await Promise.all([
                categoryService.getAll(),
                productService.getAll(),
                inventoryService.getAll(),
            ])

            return {
                categories,
                products,
                lots,
            }
        },
        [],
        {
            categories: [] as Category[],
            products: [] as Product[],
            lots: [] as InventoryLot[],
        },
    )

    const categories = data.categories
    const products = data.products
    const lots = data.lots

    const [categoryName, setCategoryName] = useState('')
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
        null,
    )

    const [productName, setProductName] = useState('')
    const [productSku, setProductSku] = useState('')
    const [productCategoryId, setProductCategoryId] = useState('')
    const [productPrice, setProductPrice] = useState('')
    const [minimumStock, setMinimumStock] = useState('0')
    const [editingProductId, setEditingProductId] = useState<string | null>(
        null,
    )
    const [isMobileProductFormOpen, setIsMobileProductFormOpen] =
        useState(false)

    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const [
        isCategorySaving,
        setIsCategorySaving,
    ] = useState(false)

    const [
        isProductSaving,
        setIsProductSaving,
    ] = useState(false)

    const [
        categoryActionId,
        setCategoryActionId,
    ] = useState<string | null>(null)

    const [
        productActionId,
        setProductActionId,
    ] = useState<string | null>(null)

    const [deletionTarget, setDeletionTarget] = useState<
        | { kind: 'product'; id: string; name: string }
        | { kind: 'category'; id: string; name: string }
        | null
    >(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const categoryMap = useMemo(
        () =>
            new Map(
                categories.map((category) => [category.id, category.name]),
            ),
        [categories],
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

    const editingProduct = editingProductId
        ? products.find((product) => product.id === editingProductId)
        : undefined

    const selectableCategories = categories.filter(
        (category) =>
            category.isActive ||
            category.id === editingProduct?.categoryId,
    )

    function clearFeedback() {
        setMessage('')
        setError('')
    }

    function resetCategoryForm() {
        setCategoryName('')
        setEditingCategoryId(null)
    }

    function resetProductForm() {
        setProductName('')
        setProductSku('')
        setProductCategoryId('')
        setProductPrice('')
        setMinimumStock('0')
        setEditingProductId(null)
        setIsMobileProductFormOpen(false)
    }

    function openMobileNewProductForm() {
        clearFeedback()
        resetProductForm()
        setIsMobileProductFormOpen(true)
    }

    async function handleCategorySubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()

        if (isCategorySaving) {
            return
        }

        clearFeedback()
        setIsCategorySaving(true)

        try {
            if (editingCategoryId) {
                await categoryService.update(editingCategoryId, {
                    name: categoryName,
                })

                setMessage('Kategori başarıyla güncellendi.')
            } else {
                await categoryService.create({
                    name: categoryName,
                })

                setMessage('Kategori başarıyla oluşturuldu.')
            }

            resetCategoryForm()
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Kategori kaydedilemedi.',
            )
        } finally {
            setIsCategorySaving(false)
        }
    }

    async function handleProductSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()

        if (isProductSaving) {
            return
        }

        clearFeedback()
        setIsProductSaving(true)

        try {
            const defaultSalePriceMinor =
                parseMoneyToMinor(productPrice)

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
                name: productName,
                sku: productSku,
                categoryId: productCategoryId,
                defaultSalePriceMinor,
                minimumStock: parsedMinimumStock,
            }

            if (editingProductId) {
                await productService.update(editingProductId, input)
                setMessage('Ürün başarıyla güncellendi.')
            } else {
                await productService.create(input)
                setMessage('Ürün başarıyla oluşturuldu.')
            }

            resetProductForm()
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Ürün kaydedilemedi.',
            )
        } finally {
            setIsProductSaving(false)
        }
    }

    function startCategoryEdit(category: Category) {
        clearFeedback()
        setEditingCategoryId(category.id)
        setCategoryName(category.name)
    }

    function startProductEdit(product: Product) {
        clearFeedback()

        setEditingProductId(product.id)
        setProductName(product.name)
        setProductSku(product.sku ?? '')
        setProductCategoryId(product.categoryId ?? '')
        setProductPrice(
            (product.defaultSalePriceMinor / 100)
                .toFixed(2)
                .replace('.', ','),
        )
        setMinimumStock(String(product.minimumStock))
        setIsMobileProductFormOpen(true)
    }

    async function toggleCategory(category: Category) {
        if (categoryActionId !== null) {
            return
        }

        clearFeedback()
        setCategoryActionId(category.id)

        try {
            await categoryService.setActive(
                category.id,
                !category.isActive,
            )

            setMessage(
                category.isActive
                    ? 'Kategori pasife alındı.'
                    : 'Kategori tekrar aktifleştirildi.',
            )
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Kategori durumu değiştirilemedi.',
            )
        } finally {
            setCategoryActionId(null)
        }
    }

    async function toggleProduct(product: Product) {
        if (productActionId !== null) {
            return
        }

        clearFeedback()
        setProductActionId(product.id)

        try {
            await productService.setActive(
                product.id,
                !product.isActive,
            )

            setMessage(
                product.isActive
                    ? 'Ürün pasife alındı.'
                    : 'Ürün tekrar aktifleştirildi.',
            )
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Ürün durumu değiştirilemedi.',
            )
        } finally {
            setProductActionId(null)
        }
    }

    async function requestCategoryDelete(category: Category) {
        if (categoryActionId !== null || isDeleting) {
            return
        }

        clearFeedback()
        setCategoryActionId(category.id)

        try {
            const check = await categoryService.getDeletionCheck(category.id)

            if (!check.canDelete) {
                setError(
                    check.reason ??
                    'Kategori kalıcı olarak silinemiyor.',
                )
                return
            }

            setDeletionTarget({
                kind: 'category',
                id: category.id,
                name: category.name,
            })
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Kategori silme durumu kontrol edilemedi.',
            )
        } finally {
            setCategoryActionId(null)
        }
    }

    async function requestProductDelete(product: Product) {
        if (productActionId !== null || isDeleting) {
            return
        }

        clearFeedback()
        setProductActionId(product.id)

        try {
            const check = await productService.getDeletionCheck(product.id)

            if (!check.canDelete) {
                setError(
                    check.reason ??
                    'Ürün kalıcı olarak silinemiyor.',
                )
                return
            }

            setDeletionTarget({
                kind: 'product',
                id: product.id,
                name: product.name,
            })
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Ürün silme durumu kontrol edilemedi.',
            )
        } finally {
            setProductActionId(null)
        }
    }

    async function confirmPermanentDelete() {
        if (!deletionTarget || isDeleting) {
            return
        }

        clearFeedback()
        setIsDeleting(true)

        try {
            if (deletionTarget.kind === 'product') {
                await productService.deletePermanently(deletionTarget.id)

                if (editingProductId === deletionTarget.id) {
                    resetProductForm()
                }

                setMessage('Ürün kalıcı olarak silindi.')
            } else {
                await categoryService.deletePermanently(deletionTarget.id)

                if (editingCategoryId === deletionTarget.id) {
                    resetCategoryForm()
                }

                setMessage('Kategori kalıcı olarak silindi.')
            }

            setDeletionTarget(null)
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Kayıt kalıcı olarak silinemedi.',
            )
        } finally {
            setIsDeleting(false)
        }
    }

    const isCategoryBusy =
        isCategorySaving ||
        categoryActionId !== null ||
        isDeleting

    const isProductBusy =
        isProductSaving ||
        productActionId !== null ||
        isDeleting

    return (
        <div className="dashboard products-page">
            <header className="page-header">
                <span className="page-eyebrow">BazaarFlow</span>
                <h1>Ürünler</h1>
                <p>
                    Ürün kataloğunuzu, kategorilerinizi ve satış fiyatlarınızı
                    yönetin.
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

            <section className="mobile-products-view">
                <div className="mobile-products-toolbar">
                    <div>
                        <strong>{products.length} ürün</strong>
                        <span>
                            Fiyat ve stok bilgilerini hızlıca yönetin.
                        </span>
                    </div>

                    <button
                        type="button"
                        className="mobile-product-add-button"
                        onClick={openMobileNewProductForm}
                    >
                        <Plus size={18} />
                        Yeni Ürün
                    </button>
                </div>

                {isMobileProductFormOpen && (
                    <article className="mobile-product-form-card">
                        <div className="mobile-product-form-header">
                            <div>
                                <span>
                                    {editingProductId
                                        ? 'Ürün düzenleme'
                                        : 'Yeni ürün'}
                                </span>

                                <h2>
                                    {editingProductId
                                        ? editingProduct?.name ?? 'Ürünü Düzenle'
                                        : 'Ürün Ekle'}
                                </h2>
                            </div>

                            <button
                                type="button"
                                aria-label="Formu kapat"
                                onClick={resetProductForm}
                                disabled={isProductBusy}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form
                            className="mobile-product-form"
                            onSubmit={handleProductSubmit}
                        >
                            <label className="mobile-product-field">
                                <span>Ürün adı</span>

                                <input
                                    type="text"
                                    value={productName}
                                    onChange={(event) =>
                                        setProductName(event.target.value)
                                    }
                                    placeholder="Örn. Sade Şal"
                                    required
                                />
                            </label>

                            <label className="mobile-product-field">
                                <span>Satış fiyatı</span>

                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={productPrice}
                                    onChange={(event) =>
                                        setProductPrice(event.target.value)
                                    }
                                    placeholder="Örn. 60,00"
                                    required
                                />
                            </label>

                            <details className="mobile-product-details">
                                <summary>Diğer bilgiler</summary>

                                <div className="mobile-product-details-content">
                                    <label className="mobile-product-field">
                                        <span>SKU / Ürün kodu</span>

                                        <input
                                            type="text"
                                            value={productSku}
                                            onChange={(event) =>
                                                setProductSku(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="İsteğe bağlı"
                                        />
                                    </label>

                                    <label className="mobile-product-field">
                                        <span>Kategori</span>

                                        <select
                                            value={productCategoryId}
                                            onChange={(event) =>
                                                setProductCategoryId(
                                                    event.target.value,
                                                )
                                            }
                                        >
                                            <option value="">
                                                Kategorisiz
                                            </option>

                                            {selectableCategories.map(
                                                (category) => (
                                                    <option
                                                        key={category.id}
                                                        value={category.id}
                                                    >
                                                        {category.name}
                                                        {!category.isActive
                                                            ? ' (Pasif)'
                                                            : ''}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </label>

                                    <label className="mobile-product-field">
                                        <span>Minimum stok</span>

                                        <input
                                            type="number"
                                            min="0"
                                            step="1"
                                            inputMode="numeric"
                                            value={minimumStock}
                                            onChange={(event) =>
                                                setMinimumStock(
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        />
                                    </label>
                                </div>
                            </details>

                            <button
                                type="submit"
                                className="mobile-product-save-button"
                                disabled={isProductBusy}
                            >
                                {editingProductId ? (
                                    <Pencil size={18} />
                                ) : (
                                    <Plus size={18} />
                                )}

                                {isProductSaving
                                    ? 'KAYDEDİLİYOR...'
                                    : editingProductId
                                        ? 'DEĞİŞİKLİKLERİ KAYDET'
                                        : 'ÜRÜNÜ EKLE'}
                            </button>
                        </form>
                    </article>
                )}

                {products.length === 0 ? (
                    <div className="mobile-products-empty">
                        <Boxes size={30} strokeWidth={1.5} />
                        <strong>Henüz ürün yok</strong>
                        <span>
                            İlk ürününüzü Yeni Ürün butonuyla ekleyin.
                        </span>
                    </div>
                ) : (
                    <div className="mobile-product-list">
                        {products.map((product) => {
                            const currentStock =
                                stockByProduct.get(product.id) ?? 0

                            return (
                                <article
                                    key={product.id}
                                    className={`mobile-product-card ${product.isActive
                                        ? ''
                                        : 'mobile-product-card-passive'
                                        }`}
                                >
                                    <div className="mobile-product-card-top">
                                        <div className="mobile-product-title">
                                            <div>
                                                <strong>
                                                    {product.name}
                                                </strong>

                                                {product.sku && (
                                                    <span>
                                                        {product.sku}
                                                    </span>
                                                )}
                                            </div>

                                            <span
                                                className={`status-badge ${product.isActive
                                                    ? 'status-badge-active'
                                                    : 'status-badge-passive'
                                                    }`}
                                            >
                                                {product.isActive
                                                    ? 'Aktif'
                                                    : 'Pasif'}
                                            </span>
                                        </div>

                                        <strong className="mobile-product-price">
                                            {formatMoneyFromMinor(
                                                product.defaultSalePriceMinor,
                                            )}
                                        </strong>
                                    </div>

                                    <div className="mobile-product-card-meta">
                                        <div>
                                            <span>Stok</span>
                                            <strong>
                                                {currentStock} adet
                                            </strong>
                                        </div>

                                        <div>
                                            <span>Kategori</span>
                                            <strong>
                                                {product.categoryId
                                                    ? categoryMap.get(
                                                        product.categoryId,
                                                    ) ??
                                                    'Bilinmeyen'
                                                    : 'Kategorisiz'}
                                            </strong>
                                        </div>
                                    </div>

                                    <div className="mobile-product-card-actions">
                                        <button
                                            type="button"
                                            className="mobile-product-edit-button"
                                            disabled={isProductBusy}
                                            onClick={() =>
                                                startProductEdit(product)
                                            }
                                        >
                                            <Pencil size={16} />
                                            Düzenle
                                        </button>

                                        <button
                                            type="button"
                                            className="mobile-product-power-button"
                                            disabled={isProductBusy}
                                            onClick={() =>
                                                void toggleProduct(product)
                                            }
                                        >
                                            <Power size={16} />
                                            {productActionId ===
                                                product.id
                                                ? 'İşleniyor...'
                                                : product.isActive
                                                    ? 'Pasife Al'
                                                    : 'Aktifleştir'}
                                        </button>

                                        <button
                                            type="button"
                                            className="mobile-product-power-button"
                                            disabled={isProductBusy}
                                            onClick={() =>
                                                void requestProductDelete(product)
                                            }
                                        >
                                            <Trash2 size={16} />
                                            Sil
                                        </button>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </section>

            <section className="product-management-grid">
                <article className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>
                                {editingCategoryId
                                    ? 'Kategori Düzenle'
                                    : 'Kategori Ekle'}
                            </h2>

                            <p>
                                {editingCategoryId
                                    ? 'Seçilen kategorinin bilgilerini güncelleyin.'
                                    : 'Ürünlerinizi gruplamak için kategori oluşturun.'}
                            </p>
                        </div>
                    </div>

                    <form
                        className="management-form"
                        onSubmit={handleCategorySubmit}
                    >
                        <label className="form-field">
                            <span>Kategori adı</span>

                            <input
                                type="text"
                                value={categoryName}
                                onChange={(event) =>
                                    setCategoryName(event.target.value)
                                }
                                placeholder="Örn. Şal"
                                required
                            />
                        </label>

                        <div className="form-actions">
                            <button
                                className="primary-button"
                                type="submit"
                                disabled={isCategoryBusy}
                            >
                                {editingCategoryId ? (
                                    <Pencil size={18} />
                                ) : (
                                    <Plus size={18} />
                                )}

                                {isCategorySaving
                                    ? 'Kaydediliyor...'
                                    : editingCategoryId
                                        ? 'Değişiklikleri Kaydet'
                                        : 'Kategori Ekle'}
                            </button>

                            {editingCategoryId && (
                                <button
                                    className="secondary-button"
                                    type="button"
                                    onClick={resetCategoryForm}
                                    disabled={isCategoryBusy}
                                >
                                    <X size={17} />
                                    Vazgeç
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="simple-list">
                        {categories.length === 0 ? (
                            <p className="list-empty">
                                Henüz kategori bulunmuyor.
                            </p>
                        ) : (
                            categories.map((category) => (
                                <div
                                    key={category.id}
                                    className="simple-list-item"
                                >
                                    <div className="list-item-main">
                                        <span>{category.name}</span>

                                        <span
                                            className={`status-badge ${category.isActive
                                                ? 'status-badge-active'
                                                : 'status-badge-passive'
                                                }`}
                                        >
                                            {category.isActive ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </div>

                                    <div className="item-actions">
                                        <button
                                            className="action-button"
                                            type="button"
                                            disabled={isCategoryBusy}
                                            onClick={() =>
                                                startCategoryEdit(category)
                                            }
                                        >
                                            <Pencil size={15} />
                                            Düzenle
                                        </button>

                                        <button
                                            className="action-button"
                                            type="button"
                                            disabled={isCategoryBusy}
                                            onClick={() => void toggleCategory(category)}
                                        >
                                            <Power size={15} />

                                            {categoryActionId ===
                                                category.id
                                                ? 'İşleniyor...'
                                                : category.isActive
                                                    ? 'Pasife Al'
                                                    : 'Aktifleştir'}
                                        </button>


                                        <button
                                            className="action-button"
                                            type="button"
                                            disabled={isCategoryBusy}
                                            onClick={() =>
                                                void requestCategoryDelete(category)
                                            }
                                        >
                                            <Trash2 size={15} />
                                            Sil
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </article>

                <article className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>
                                {editingProductId
                                    ? 'Ürün Düzenle'
                                    : 'Ürün Ekle'}
                            </h2>

                            <p>
                                {editingProductId
                                    ? 'Seçilen ürünün bilgilerini güncelleyin.'
                                    : 'Yeni bir ürünü kataloğa kaydedin.'}
                            </p>
                        </div>
                    </div>

                    <form
                        className="management-form"
                        onSubmit={handleProductSubmit}
                    >
                        <label className="form-field">
                            <span>Ürün adı</span>

                            <input
                                type="text"
                                value={productName}
                                onChange={(event) =>
                                    setProductName(event.target.value)
                                }
                                placeholder="Örn. Sade Şal"
                                required
                            />
                        </label>

                        <label className="form-field">
                            <span>SKU / Ürün kodu</span>

                            <input
                                type="text"
                                value={productSku}
                                onChange={(event) =>
                                    setProductSku(event.target.value)
                                }
                                placeholder="İsteğe bağlı"
                            />
                        </label>

                        <label className="form-field">
                            <span>Kategori</span>

                            <select
                                value={productCategoryId}
                                onChange={(event) =>
                                    setProductCategoryId(event.target.value)
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

                        <div className="form-row">
                            <label className="form-field">
                                <span>Satış fiyatı</span>

                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={productPrice}
                                    onChange={(event) =>
                                        setProductPrice(event.target.value)
                                    }
                                    placeholder="Örn. 60,00"
                                    required
                                />
                            </label>

                            <label className="form-field">
                                <span>Minimum stok</span>

                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={minimumStock}
                                    onChange={(event) =>
                                        setMinimumStock(event.target.value)
                                    }
                                    required
                                />
                            </label>
                        </div>

                        <div className="form-actions">
                            <button
                                className="primary-button"
                                type="submit"
                                disabled={isProductBusy}
                            >
                                {editingProductId ? (
                                    <Pencil size={18} />
                                ) : (
                                    <Plus size={18} />
                                )}

                                {isProductSaving
                                    ? 'Kaydediliyor...'
                                    : editingProductId
                                        ? 'Değişiklikleri Kaydet'
                                        : 'Ürün Ekle'}
                            </button>

                            {editingProductId && (
                                <button
                                    className="secondary-button"
                                    type="button"
                                    onClick={resetProductForm}
                                    disabled={isProductBusy}
                                >
                                    <X size={17} />
                                    Vazgeç
                                </button>
                            )}
                        </div>
                    </form>
                </article>
            </section>

            <section className="dashboard-panel products-panel">
                <div className="panel-header">
                    <div>
                        <h2>Ürün Listesi</h2>
                        <p>{products.length} ürün kayıtlı.</p>
                    </div>
                </div>

                {products.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Boxes size={30} strokeWidth={1.5} />
                        </div>

                        <div>
                            <strong>Henüz ürün eklenmedi</strong>
                            <p>
                                İlk ürününüzü yukarıdaki formdan
                                oluşturabilirsiniz.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="product-table-wrapper">
                        <table className="product-table">
                            <thead>
                                <tr>
                                    <th>Ürün</th>
                                    <th>Kategori</th>
                                    <th>SKU</th>
                                    <th>Satış Fiyatı</th>
                                    <th>Minimum Stok</th>
                                    <th>Durum</th>
                                    <th>İşlemler</th>
                                </tr>
                            </thead>

                            <tbody>
                                {products.map((product) => (
                                    <tr key={product.id}>
                                        <td>
                                            <strong>{product.name}</strong>
                                        </td>

                                        <td>
                                            {product.categoryId
                                                ? categoryMap.get(product.categoryId) ??
                                                'Bilinmeyen kategori'
                                                : 'Kategorisiz'}
                                        </td>

                                        <td>{product.sku ?? '—'}</td>

                                        <td>
                                            {formatMoneyFromMinor(
                                                product.defaultSalePriceMinor,
                                            )}
                                        </td>

                                        <td>{product.minimumStock}</td>

                                        <td>
                                            <span
                                                className={`status-badge ${product.isActive
                                                    ? 'status-badge-active'
                                                    : 'status-badge-passive'
                                                    }`}
                                            >
                                                {product.isActive ? 'Aktif' : 'Pasif'}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="table-actions">
                                                <button
                                                    className="action-button"
                                                    type="button"
                                                    disabled={isProductBusy}
                                                    onClick={() =>
                                                        startProductEdit(product)
                                                    }
                                                >
                                                    <Pencil size={15} />
                                                    Düzenle
                                                </button>

                                                <button
                                                    className="action-button"
                                                    type="button"
                                                    disabled={isProductBusy}
                                                    onClick={() =>
                                                        void toggleProduct(product)
                                                    }
                                                >
                                                    <Power size={15} />

                                                    {productActionId ===
                                                        product.id
                                                        ? 'İşleniyor...'
                                                        : product.isActive
                                                            ? 'Pasife Al'
                                                            : 'Aktifleştir'}
                                                </button>


                                                <button
                                                    className="action-button"
                                                    type="button"
                                                    disabled={isProductBusy}
                                                    onClick={() =>
                                                        void requestProductDelete(product)
                                                    }
                                                >
                                                    <Trash2 size={15} />
                                                    Sil
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <ConfirmDialog
                open={deletionTarget !== null}
                title={
                    deletionTarget?.kind === 'product'
                        ? 'Ürünü kalıcı olarak sil?'
                        : 'Kategoriyi kalıcı olarak sil?'
                }
                description={
                    deletionTarget
                        ? `“${deletionTarget.name}” kalıcı olarak silinecek. Bu işlem geri alınamaz.`
                        : ''
                }
                confirmLabel="Kalıcı Olarak Sil"
                pendingLabel="Siliniyor..."
                tone="danger"
                isConfirming={isDeleting}
                onConfirm={confirmPermanentDelete}
                onCancel={() => {
                    if (!isDeleting) {
                        setDeletionTarget(null)
                    }
                }}
            />
        </div>
    )
}

export default ProductsPage