import { useMemo, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Boxes, Pencil, Plus, Power, X } from 'lucide-react'
import { categoryService } from '../services/categoryService'
import { productService } from '../services/productService'
import type { Category } from '../types/category'
import type { Product } from '../types/product'
import {
    formatMoneyFromMinor,
    parseMoneyToMinor,
} from '../utils/money'

function ProductsPage() {
    const data = useLiveQuery(
        async () => {
            const [categories, products] = await Promise.all([
                categoryService.getAll(),
                productService.getAll(),
            ])

            return {
                categories,
                products,
            }
        },
        [],
        {
            categories: [] as Category[],
            products: [] as Product[],
        },
    )

    const categories = data.categories
    const products = data.products

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

    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const categoryMap = useMemo(
        () =>
            new Map(
                categories.map((category) => [category.id, category.name]),
            ),
        [categories],
    )

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
    }

    async function handleCategorySubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()
        clearFeedback()

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
        }
    }

    async function handleProductSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()
        clearFeedback()

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
    }

    async function toggleCategory(category: Category) {
        clearFeedback()

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
        }
    }

    async function toggleProduct(product: Product) {
        clearFeedback()

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
        }
    }

    return (
        <div className="dashboard">
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
                            <button className="primary-button" type="submit">
                                {editingCategoryId ? (
                                    <Pencil size={18} />
                                ) : (
                                    <Plus size={18} />
                                )}

                                {editingCategoryId
                                    ? 'Değişiklikleri Kaydet'
                                    : 'Kategori Ekle'}
                            </button>

                            {editingCategoryId && (
                                <button
                                    className="secondary-button"
                                    type="button"
                                    onClick={resetCategoryForm}
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
                                            onClick={() => void toggleCategory(category)}
                                        >
                                            <Power size={15} />

                                            {category.isActive
                                                ? 'Pasife Al'
                                                : 'Aktifleştir'}
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
                            <button className="primary-button" type="submit">
                                {editingProductId ? (
                                    <Pencil size={18} />
                                ) : (
                                    <Plus size={18} />
                                )}

                                {editingProductId
                                    ? 'Değişiklikleri Kaydet'
                                    : 'Ürün Ekle'}
                            </button>

                            {editingProductId && (
                                <button
                                    className="secondary-button"
                                    type="button"
                                    onClick={resetProductForm}
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
                                                    onClick={() =>
                                                        void toggleProduct(product)
                                                    }
                                                >
                                                    <Power size={15} />

                                                    {product.isActive
                                                        ? 'Pasife Al'
                                                        : 'Aktifleştir'}
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
        </div>
    )
}

export default ProductsPage