import { useMemo, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { PackagePlus } from 'lucide-react'
import { inventoryService } from '../services/inventoryService'
import { productService } from '../services/productService'
import type { InventoryLot } from '../types/inventoryLot'
import type { Product } from '../types/product'
import { getTodayDateValue } from '../utils/dateOnly'
import { parseMoneyToMinor } from '../utils/money'

function MobileInventoryPage() {
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

    const products = data.products
    const lots = data.lots

    const [productId, setProductId] =
        useState('')

    const [
        quantityReceived,
        setQuantityReceived,
    ] = useState('')

    const [unitCost, setUnitCost] =
        useState('')

    const [message, setMessage] =
        useState('')

    const [error, setError] =
        useState('')

    const activeProducts = useMemo(
        () =>
            products.filter(
                (product) => product.isActive,
            ),
        [products],
    )

    const stockByProduct = useMemo(() => {
        const stock =
            new Map<string, number>()

        for (const lot of lots) {
            stock.set(
                lot.productId,
                (stock.get(lot.productId) ?? 0) +
                    lot.quantityRemaining,
            )
        }

        return stock
    }, [lots])

    const selectedProduct =
        useMemo(
            () =>
                activeProducts.find(
                    (product) =>
                        product.id ===
                        productId,
                ),
            [
                activeProducts,
                productId,
            ],
        )

    const selectedProductStock =
        selectedProduct
            ? stockByProduct.get(
                selectedProduct.id,
            ) ?? 0
            : null

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault()

        setMessage('')
        setError('')

        try {
            if (!productId) {
                throw new Error(
                    'Stok eklenecek ürünü seçin.',
                )
            }

            const quantity =
                Number(quantityReceived)

            if (
                !Number.isSafeInteger(
                    quantity,
                ) ||
                quantity <= 0
            ) {
                throw new Error(
                    'Stok adedi sıfırdan büyük tam sayı olmalıdır.',
                )
            }

            const unitCostMinor =
                parseMoneyToMinor(
                    unitCost,
                )

            await inventoryService.create({
                productId,
                entryType: 'purchase',
                purchaseDate:
                    getTodayDateValue(),
                quantityReceived:
                    quantity,
                unitCostMinor,
                note: '',
            })

            setQuantityReceived('')
            setUnitCost('')

            setMessage(
                `${selectedProduct?.name ?? 'Ürün'} stoğa eklendi • ${quantity} adet`,
            )
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : 'Stok girişi kaydedilemedi.',
            )
        }
    }

    return (
        <div className="dashboard inventory-page">
            <header className="page-header">
                <span className="page-eyebrow">
                    BazaarFlow
                </span>

                <h1>Stok</h1>

                <p>
                    Stok alımlarını, açılış
                    stoklarını ve eldeki ürünleri
                    parti bazında yönetin.
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

            <section className="mobile-inventory-view">
                <article className="mobile-stock-card">
                    <div className="mobile-stock-card-header">
                        <span className="mobile-stock-card-icon">
                            <PackagePlus
                                size={22}
                                strokeWidth={1.9}
                            />
                        </span>

                        <div>
                            <h2>
                                Stok Ekle
                            </h2>

                            <p>
                                Ürünü seçin, adedi ve alış fiyatını girin.
                            </p>
                        </div>
                    </div>

                    <form
                        className="mobile-stock-form"
                        onSubmit={
                            handleSubmit
                        }
                    >
                        <label className="mobile-stock-field">
                            <span>Ürün</span>

                            <select
                                value={productId}
                                onChange={(
                                    event,
                                ) =>
                                    setProductId(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                required
                            >
                                <option value="">
                                    Ürün seçin
                                </option>

                                {activeProducts.map(
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
                                            {product.sku
                                                ? ` · ${product.sku}`
                                                : ''}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>

                        {selectedProduct && (
                            <div className="mobile-stock-current">
                                <div>
                                    <span>
                                        Seçili ürün
                                    </span>

                                    <strong>
                                        {
                                            selectedProduct.name
                                        }
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        Mevcut stok
                                    </span>

                                    <strong>
                                        {
                                            selectedProductStock ??
                                            0
                                        }{' '}
                                        adet
                                    </strong>
                                </div>
                            </div>
                        )}

                        <label className="mobile-stock-field">
                            <span>Adet</span>

                            <input
                                type="number"
                                min="1"
                                step="1"
                                inputMode="numeric"
                                value={
                                    quantityReceived
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setQuantityReceived(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Örn. 20"
                                required
                            />
                        </label>

                        <label className="mobile-stock-field">
                            <span>
                                Alış fiyatı / adet
                            </span>

                            <input
                                type="text"
                                inputMode="decimal"
                                value={unitCost}
                                onChange={(
                                    event,
                                ) =>
                                    setUnitCost(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="Örn. 35,00"
                                required
                            />
                        </label>

                        <button
                            type="submit"
                            className="mobile-stock-submit"
                            disabled={
                                !productId ||
                                !quantityReceived ||
                                !unitCost
                            }
                        >
                            <PackagePlus
                                size={19}
                            />
                            STOKA EKLE
                        </button>
                    </form>
                </article>

                <p className="mobile-stock-helper">
                    Bugünün tarihiyle normal stok alımı olarak kaydedilir.
                    Her giriş FIFO için ayrı bir stok partisi oluşturur.
                </p>
            </section>
        </div>
    )
}

export default MobileInventoryPage
