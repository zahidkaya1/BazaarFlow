import {
    Download,
    FileCheck2,
    FileSpreadsheet,
    HardDriveDownload,
    ShieldCheck,
    Upload,
} from 'lucide-react'
import {
    useRef,
    useState,
    type ChangeEvent,
} from 'react'

import MobilePageHeader from '../components/mobile/MobilePageHeader'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { backupService } from '../services/backupService'
import { productService } from '../services/productService'
import {
    salesService,
    type SaleHistoryRecord,
} from '../services/salesService'
import type { BazaarFlowBackup } from '../types/backup'
import type { Product } from '../types/product'

type ActionState =
    | 'idle'
    | 'exporting'
    | 'reading'
    | 'restoring'
    | 'csv-exporting'

type SettingsMessage =
    | {
        type: 'success' | 'error'
        text: string
    }
    | null

type PendingBackup = {
    fileName: string
    backup: BazaarFlowBackup
}

function getErrorMessage(
    error: unknown,
): string {
    if (error instanceof Error) {
        return error.message
    }

    return 'Beklenmeyen bir hata oluştu.'
}

function formatBackupDate(
    value: string,
): string {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return new Intl.DateTimeFormat(
        'tr-TR',
        {
            dateStyle: 'medium',
            timeStyle: 'short',
        },
    ).format(date)
}

function formatCsvMoney(
    minor: number,
): string {
    return (minor / 100)
        .toFixed(2)
        .replace('.', ',')
}

function escapeCsvCell(
    value: string | number,
): string {
    const text = String(value)

    if (
        text.includes(';') ||
        text.includes('"') ||
        text.includes('\n') ||
        text.includes('\r')
    ) {
        return `"${text.replaceAll('"', '""')}"`
    }

    return text
}

function createCsvRow(
    values: Array<string | number>,
): string {
    return values
        .map(escapeCsvCell)
        .join(';')
}

function downloadSalesCsv(
    history: SaleHistoryRecord[],
    products: Product[],
): void {
    const productMap =
        new Map(
            products.map((product) => [
                product.id,
                product,
            ]),
        )

    const rows: Array<
        Array<string | number>
    > = [
        [
            'Tarih',
            'Satış ID',
            'Ürün',
            'SKU',
            'Adet',
            'Liste Birim Fiyatı',
            'Satış Birim Fiyatı',
            'Liste Toplamı',
            'Ciro',
            'İndirim',
            'FIFO Maliyeti',
            'Brüt Kâr',
            'İndirim Nedeni',
            'Satış Notu',
        ],
    ]

    for (const record of history) {
        if (
            record.sale.status !==
            'completed'
        ) {
            continue
        }

        for (const item of record.items) {
            const product =
                productMap.get(
                    item.productId,
                )

            rows.push([
                record.sale.saleDate,
                record.sale.id,
                product?.name ??
                    item.productName,
                product?.sku ?? '',
                item.quantity,
                formatCsvMoney(
                    item.listUnitPriceMinor,
                ),
                formatCsvMoney(
                    item.actualUnitPriceMinor,
                ),
                formatCsvMoney(
                    item.listUnitPriceMinor *
                        item.quantity,
                ),
                formatCsvMoney(
                    item.revenueMinor,
                ),
                formatCsvMoney(
                    item.discountMinor,
                ),
                formatCsvMoney(
                    item.costMinor,
                ),
                formatCsvMoney(
                    item.grossProfitMinor,
                ),
                item.discountReason ?? '',
                record.sale.note ?? '',
            ])
        }
    }

    const content =
        '\uFEFF' +
        rows
            .map(createCsvRow)
            .join('\r\n')

    const blob =
        new Blob(
            [content],
            {
                type: 'text/csv;charset=utf-8;',
            },
        )

    const objectUrl =
        URL.createObjectURL(blob)

    const link =
        document.createElement('a')

    link.href = objectUrl
    link.download =
        `bazaarflow-satislar_${new Date()
            .toISOString()
            .slice(0, 10)}.csv`

    document.body.appendChild(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(objectUrl)
}

function MobileSettingsPage() {
    const fileInputRef =
        useRef<HTMLInputElement>(null)

    const [
        actionState,
        setActionState,
    ] = useState<ActionState>('idle')

    const [
        message,
        setMessage,
    ] = useState<SettingsMessage>(null)

    const [
        pendingBackup,
        setPendingBackup,
    ] = useState<PendingBackup | null>(
        null,
    )

    const [
        isRestoreConfirmOpen,
        setIsRestoreConfirmOpen,
    ] = useState(false)

    const isBusy =
        actionState !== 'idle'

    const backupData =
        pendingBackup?.backup.data

    async function handleDownloadBackup() {
        try {
            setActionState('exporting')
            setMessage(null)

            const fileName =
                await backupService.downloadBackup()

            setMessage({
                type: 'success',
                text: `Yedek oluşturuldu: ${fileName}`,
            })
        } catch (error) {
            setMessage({
                type: 'error',
                text: getErrorMessage(error),
            })
        } finally {
            setActionState('idle')
        }
    }

    async function handleDownloadCsv() {
        try {
            setActionState(
                'csv-exporting',
            )
            setMessage(null)

            const [
                history,
                products,
            ] = await Promise.all([
                salesService.getHistory(),
                productService.getAll(),
            ])

            const hasCompletedSale =
                history.some(
                    (record) =>
                        record.sale.status ===
                        'completed',
                )

            if (!hasCompletedSale) {
                throw new Error(
                    'CSV oluşturmak için tamamlanmış satış bulunamadı.',
                )
            }

            downloadSalesCsv(
                history,
                products,
            )

            setMessage({
                type: 'success',
                text: 'Satış CSV dosyası oluşturuldu.',
            })
        } catch (error) {
            setMessage({
                type: 'error',
                text: getErrorMessage(error),
            })
        } finally {
            setActionState('idle')
        }
    }

    function handleChooseBackup() {
        if (isBusy) {
            return
        }

        fileInputRef.current?.click()
    }

    async function handleBackupFileChange(
        event: ChangeEvent<HTMLInputElement>,
    ) {
        const file =
            event.target.files?.[0]

        event.target.value = ''

        if (!file) {
            return
        }

        try {
            setActionState('reading')
            setMessage(null)
            setPendingBackup(null)

            const backup =
                await backupService.readBackupFile(
                    file,
                )

            setPendingBackup({
                fileName: file.name,
                backup,
            })

            setMessage({
                type: 'success',
                text: 'Yedek doğrulandı. İçeriği kontrol edip geri yüklemeyi onaylayabilirsiniz.',
            })
        } catch (error) {
            setMessage({
                type: 'error',
                text: getErrorMessage(error),
            })
        } finally {
            setActionState('idle')
        }
    }

    function requestRestoreBackup() {
        if (
            !pendingBackup ||
            isBusy
        ) {
            return
        }

        setIsRestoreConfirmOpen(true)
    }

    async function handleRestoreBackup() {
        if (
            !pendingBackup ||
            isBusy
        ) {
            return
        }

        setIsRestoreConfirmOpen(false)

        try {
            setActionState('restoring')
            setMessage(null)

            await backupService.restoreBackup(
                pendingBackup.backup,
            )

            setPendingBackup(null)

            setMessage({
                type: 'success',
                text: 'Yedek geri yüklendi. FIFO stok durumu yeniden hesaplandı.',
            })
        } catch (error) {
            setMessage({
                type: 'error',
                text: getErrorMessage(error),
            })
        } finally {
            setActionState('idle')
        }
    }

    return (
        <div className="mobile-page-shell">
            <MobilePageHeader
                title="Ayarlar"
                description="Yedekleme, geri yükleme ve veri dışa aktarma işlemleri."
            />

            {message && (
                <div
                    className={`form-message ${
                        message.type ===
                        'success'
                            ? 'form-message-success'
                            : 'form-message-error'
                    }`}
                >
                    {message.text}
                </div>
            )}

            <section className="mobile-settings-info-card">
                <span className="mobile-settings-info-icon">
                    <ShieldCheck size={18} />
                </span>

                <div>
                    <strong>
                        Veriler bu cihazda saklanır
                    </strong>

                    <span>
                        Düzenli JSON yedeği almak
                        veri kaybına karşı en güvenli
                        yöntemdir.
                    </span>
                </div>
            </section>

            <section className="mobile-settings-section">
                <div className="mobile-settings-section-title">
                    <span>Veriler</span>
                </div>

                <button
                    type="button"
                    className="mobile-settings-action-card"
                    disabled={isBusy}
                    onClick={
                        handleDownloadBackup
                    }
                >
                    <span className="mobile-settings-action-icon">
                        <HardDriveDownload
                            size={19}
                        />
                    </span>

                    <span className="mobile-settings-action-copy">
                        <strong>
                            Yedek Oluştur
                        </strong>

                        <small>
                            Tüm verileri JSON
                            olarak indir
                        </small>
                    </span>

                    <Download size={17} />
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="settings-file-input"
                    onChange={
                        handleBackupFileChange
                    }
                />

                <button
                    type="button"
                    className="mobile-settings-action-card"
                    disabled={isBusy}
                    onClick={
                        handleChooseBackup
                    }
                >
                    <span className="mobile-settings-action-icon mobile-settings-action-icon-warning">
                        <Upload size={19} />
                    </span>

                    <span className="mobile-settings-action-copy">
                        <strong>
                            Yedeği Geri Yükle
                        </strong>

                        <small>
                            JSON yedeğini seç ve
                            doğrula
                        </small>
                    </span>

                    <Upload size={17} />
                </button>
            </section>

            <section className="mobile-settings-section">
                <div className="mobile-settings-section-title">
                    <span>Dışa Aktarma</span>
                </div>

                <button
                    type="button"
                    className="mobile-settings-action-card"
                    disabled={isBusy}
                    onClick={
                        handleDownloadCsv
                    }
                >
                    <span className="mobile-settings-action-icon">
                        <FileSpreadsheet
                            size={19}
                        />
                    </span>

                    <span className="mobile-settings-action-copy">
                        <strong>
                            Satışları CSV İndir
                        </strong>

                        <small>
                            Tüm tamamlanmış
                            satışları dışa aktar
                        </small>
                    </span>

                    <Download size={17} />
                </button>
            </section>

            {pendingBackup &&
                backupData && (
                    <section className="mobile-settings-preview">
                        <div className="mobile-settings-preview-title">
                            <span className="mobile-settings-action-icon">
                                <FileCheck2
                                    size={18}
                                />
                            </span>

                            <div>
                                <strong>
                                    Yedek Hazır
                                </strong>

                                <span>
                                    Geri yüklemeden
                                    önce kontrol edin.
                                </span>
                            </div>
                        </div>

                        <div className="mobile-settings-preview-meta">
                            <div>
                                <span>
                                    Dosya
                                </span>
                                <strong>
                                    {
                                        pendingBackup.fileName
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Tarih
                                </span>
                                <strong>
                                    {formatBackupDate(
                                        pendingBackup.backup
                                            .exportedAt,
                                    )}
                                </strong>
                            </div>
                        </div>

                        <div className="mobile-settings-count-grid">
                            <div>
                                <span>Ürün</span>
                                <strong>
                                    {
                                        backupData
                                            .products
                                            .length
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Kategori
                                </span>
                                <strong>
                                    {
                                        backupData
                                            .categories
                                            .length
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Stok
                                </span>
                                <strong>
                                    {
                                        backupData
                                            .inventoryLots
                                            .length
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Satış
                                </span>
                                <strong>
                                    {
                                        backupData
                                            .sales
                                            .length
                                    }
                                </strong>
                            </div>
                        </div>

                        <div className="mobile-settings-restore-actions">
                            <button
                                type="button"
                                className="secondary-button"
                                disabled={isBusy}
                                onClick={() => {
                                    setPendingBackup(
                                        null,
                                    )
                                    setMessage(null)
                                }}
                            >
                                Vazgeç
                            </button>

                            <button
                                type="button"
                                className="primary-button settings-restore-button"
                                disabled={isBusy}
                                onClick={
                                    requestRestoreBackup
                                }
                            >
                                <Upload size={16} />

                                {actionState ===
                                    'restoring'
                                    ? 'Geri yükleniyor...'
                                    : 'Geri Yükle'}
                            </button>
                        </div>
                    </section>
                )}

            <section className="mobile-settings-app-card">
                <span className="mobile-settings-app-icon">
                    <img
                        src="/brand/bazaarflow-app-icon.png"
                        alt=""
                        width={22}
                        height={22}
                        draggable={false}
                        style={{
                            display: 'block',
                            width: 22,
                            height: 22,
                            borderRadius: 7,
                        }}
                    />
                </span>

                <div>
                    <strong>
                        BazaarFlow
                    </strong>

                    <span>
                        v0.1.0 · Local-first ·
                        IndexedDB
                    </span>
                </div>
            </section>

            <ConfirmDialog
                open={isRestoreConfirmOpen}
                title="Yedeği Geri Yükle"
                description="Bu işlem mevcut BazaarFlow verilerinin tamamını seçilen yedekle değiştirecek. Ürünler, stoklar, satışlar ve stok düzeltmeleri yedekteki durumla değiştirilecek."
                confirmLabel="Geri Yükle"
                pendingLabel="Geri yükleniyor..."
                tone="warning"
                isConfirming={actionState === 'restoring'}
                onCancel={() =>
                    setIsRestoreConfirmOpen(false)
                }
                onConfirm={handleRestoreBackup}
            />
        </div>
    )
}

export default MobileSettingsPage
