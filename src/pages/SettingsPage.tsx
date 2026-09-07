import {
    Download,
    FileCheck2,
    HardDriveDownload,
    ShieldCheck,
    Upload,
} from 'lucide-react'
import {
    useRef,
    useState,
} from 'react'

import { backupService } from '../services/backupService'
import type { BazaarFlowBackup } from '../types/backup'

type ActionState =
    | 'idle'
    | 'exporting'
    | 'reading'
    | 'restoring'

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

function SettingsPage() {
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

    const isBusy =
        actionState !== 'idle'

    async function handleDownloadBackup() {
        try {
            setActionState('exporting')
            setMessage(null)

            const fileName =
                await backupService.downloadBackup()

            setMessage({
                type: 'success',
                text: `Yedek başarıyla oluşturuldu: ${fileName}`,
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
        event: React.ChangeEvent<HTMLInputElement>,
    ) {
        const file =
            event.target.files?.[0]

        /*
         * Aynı dosyanın daha sonra tekrar
         * seçilebilmesi için input temizlenir.
         */
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
                text: 'Yedek dosyası doğrulandı. Geri yüklemeden önce aşağıdaki bilgileri kontrol edin.',
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

    async function handleRestoreBackup() {
        if (
            !pendingBackup ||
            isBusy
        ) {
            return
        }

        const confirmed =
            window.confirm(
                [
                    'Bu işlem mevcut BazaarFlow verilerinin tamamını seçilen yedekle değiştirecek.',
                    '',
                    'Ürünler, stoklar, satışlar ve stok düzeltmeleri geri yüklenecek.',
                    '',
                    'Devam etmek istediğinize emin misiniz?',
                ].join('\n'),
            )

        if (!confirmed) {
            return
        }

        try {
            setActionState('restoring')
            setMessage(null)

            await backupService.restoreBackup(
                pendingBackup.backup,
            )

            setPendingBackup(null)

            setMessage({
                type: 'success',
                text: 'Yedek başarıyla geri yüklendi. FIFO stok durumu satış ve düzeltme geçmişinden yeniden hesaplandı.',
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

    const backupData =
        pendingBackup?.backup.data

    return (
        <section className="dashboard">
            <header className="page-header">
                <span className="page-eyebrow">
                    Ayarlar
                </span>

                <h1>Uygulama Ayarları</h1>

                <p>
                    BazaarFlow verilerinizi
                    yedekleyin ve gerektiğinde
                    güvenli şekilde geri yükleyin.
                </p>
            </header>

            {message && (
                <div
                    className={`form-message ${message.type === 'success'
                        ? 'form-message-success'
                        : 'form-message-error'
                        }`}
                >
                    {message.text}
                </div>
            )}

            <div className="settings-info-card">
                <div className="settings-info-icon">
                    <ShieldCheck size={20} />
                </div>

                <div>
                    <strong>
                        Verileriniz bu cihazda saklanır
                    </strong>

                    <p>
                        BazaarFlow local-first çalışır.
                        Düzenli JSON yedeği almak veri
                        kaybına karşı en önemli güvenlik
                        adımıdır.
                    </p>
                </div>
            </div>

            <div className="settings-grid">
                <article className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Yedek Oluştur</h2>

                            <p>
                                Mevcut tüm işletme
                                verilerinizi JSON dosyası
                                olarak kaydedin.
                            </p>
                        </div>

                        <HardDriveDownload
                            size={19}
                        />
                    </div>

                    <div className="settings-panel-content">
                        <div className="settings-feature-list">
                            <span>
                                <FileCheck2 size={15} />
                                Ürünler ve kategoriler
                            </span>

                            <span>
                                <FileCheck2 size={15} />
                                FIFO stok partileri
                            </span>

                            <span>
                                <FileCheck2 size={15} />
                                Satış geçmişi
                            </span>

                            <span>
                                <FileCheck2 size={15} />
                                Stok düzeltmeleri
                            </span>
                        </div>

                        <p className="settings-helper-text">
                            FIFO allocation kayıtları
                            yedeğe doğrudan yazılmaz.
                            Geri yükleme sırasında ana
                            kayıtlardan yeniden hesaplanır.
                        </p>

                        <button
                            type="button"
                            className="primary-button"
                            disabled={isBusy}
                            onClick={
                                handleDownloadBackup
                            }
                        >
                            <Download size={16} />

                            {actionState ===
                                'exporting'
                                ? 'Yedek hazırlanıyor...'
                                : 'JSON Yedeğini İndir'}
                        </button>
                    </div>
                </article>

                <article className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Yedekten Geri Yükle</h2>

                            <p>
                                Daha önce oluşturulan bir
                                BazaarFlow JSON yedeğini
                                doğrulayın ve geri yükleyin.
                            </p>
                        </div>

                        <Upload size={19} />
                    </div>

                    <div className="settings-panel-content">
                        <div className="settings-danger-box">
                            <strong>
                                Mevcut veriler değiştirilecek
                            </strong>

                            <span>
                                Geri yükleme işlemi mevcut
                                veritabanını seçilen yedekteki
                                kayıtlarla değiştirir.
                            </span>
                        </div>

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
                            className="secondary-button"
                            disabled={isBusy}
                            onClick={
                                handleChooseBackup
                            }
                        >
                            <Upload size={16} />

                            {actionState === 'reading'
                                ? 'Yedek doğrulanıyor...'
                                : 'Yedek Dosyası Seç'}
                        </button>
                    </div>
                </article>
            </div>

            {pendingBackup &&
                backupData && (
                    <article className="dashboard-panel settings-backup-preview">
                        <div className="panel-header">
                            <div>
                                <h2>
                                    Geri Yükleme Önizlemesi
                                </h2>

                                <p>
                                    Dosya doğrulandı. İşleme
                                    başlamadan önce içeriği
                                    kontrol edin.
                                </p>
                            </div>

                            <FileCheck2 size={19} />
                        </div>

                        <div className="settings-preview-meta">
                            <div>
                                <span>Dosya</span>
                                <strong>
                                    {
                                        pendingBackup.fileName
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Yedek tarihi
                                </span>
                                <strong>
                                    {formatBackupDate(
                                        pendingBackup.backup
                                            .exportedAt,
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Format sürümü
                                </span>
                                <strong>
                                    v
                                    {
                                        pendingBackup.backup
                                            .formatVersion
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Veritabanı sürümü
                                </span>
                                <strong>
                                    v
                                    {
                                        pendingBackup.backup
                                            .databaseVersion
                                    }
                                </strong>
                            </div>
                        </div>

                        <div className="settings-backup-counts">
                            <div>
                                <span>Ürün</span>
                                <strong>
                                    {
                                        backupData.products
                                            .length
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>Kategori</span>
                                <strong>
                                    {
                                        backupData.categories
                                            .length
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Stok Partisi
                                </span>
                                <strong>
                                    {
                                        backupData
                                            .inventoryLots.length
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>Satış</span>
                                <strong>
                                    {
                                        backupData.sales
                                            .length
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Satış Kalemi
                                </span>
                                <strong>
                                    {
                                        backupData.saleItems
                                            .length
                                    }
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Stok Düzeltmesi
                                </span>
                                <strong>
                                    {
                                        backupData
                                            .inventoryAdjustments
                                            .length
                                    }
                                </strong>
                            </div>
                        </div>

                        <div className="settings-restore-actions">
                            <button
                                type="button"
                                className="secondary-button"
                                disabled={isBusy}
                                onClick={() => {
                                    setPendingBackup(null)
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
                                    handleRestoreBackup
                                }
                            >
                                <Upload size={16} />

                                {actionState ===
                                    'restoring'
                                    ? 'Geri yükleniyor...'
                                    : 'Bu Yedeği Geri Yükle'}
                            </button>
                        </div>
                    </article>
                )}
        </section>
    )
}

export default SettingsPage