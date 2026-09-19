import {
    ArrowLeft,
    Download,
    FolderOpen,
    Plus,
    RotateCcw,
    Trash2,
    Upload,
} from 'lucide-react'
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
} from 'react'
import { useNavigate } from 'react-router-dom'

import SettingsStatusCard, {
    type SettingsStatus,
} from '../components/settings/SettingsStatusCard'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { backupService } from '../services/backupService'
import { dataBackupService } from '../services/dataBackupService'
import type {
    DataBackupBackendInfo,
    DataBackupMeta,
} from '../types/dataBackup'

type BusyState =
    | 'idle'
    | 'loading'
    | 'creating'
    | 'importing'
    | 'restoring'
    | 'exporting'
    | 'deleting'
    | 'opening-folder'

function getErrorMessage(error: unknown): string {
    return error instanceof Error
        ? error.message
        : 'Beklenmeyen bir hata oluştu.'
}

function isSameLocalDay(first: Date, second: Date): boolean {
    return (
        first.getFullYear() === second.getFullYear() &&
        first.getMonth() === second.getMonth() &&
        first.getDate() === second.getDate()
    )
}

function formatBackupDate(value: string): string {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return 'Yakın zamanda'
    }

    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)

    const time = new Intl.DateTimeFormat('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)

    if (isSameLocalDay(date, now)) {
        return `Bugün, ${time}`
    }

    if (isSameLocalDay(date, yesterday)) {
        return `Dün, ${time}`
    }

    return new Intl.DateTimeFormat('tr-TR', {
        day: 'numeric',
        month: 'long',
        year:
            date.getFullYear() === now.getFullYear()
                ? undefined
                : 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

function BackupsPage() {
    const navigate = useNavigate()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [backups, setBackups] = useState<DataBackupMeta[]>([])
    const [backendInfo, setBackendInfo] =
        useState<DataBackupBackendInfo | null>(null)
    const [busyState, setBusyState] =
        useState<BusyState>('loading')
    const [status, setStatus] =
        useState<SettingsStatus | null>(null)
    const [restoreTarget, setRestoreTarget] =
        useState<DataBackupMeta | null>(null)
    const [deleteTarget, setDeleteTarget] =
        useState<DataBackupMeta | null>(null)

    const isBusy = busyState !== 'idle'

    const load = useCallback(async () => {
        const [nextBackups, nextBackend] = await Promise.all([
            dataBackupService.listBackups(),
            dataBackupService.getBackendInfo(),
        ])

        setBackups(
            nextBackups.sort(
                (a, b) =>
                    Date.parse(b.createdAt) -
                    Date.parse(a.createdAt),
            ),
        )
        setBackendInfo(nextBackend)
    }, [])

    useEffect(() => {
        let cancelled = false

        void Promise.all([
            dataBackupService.listBackups(),
            dataBackupService.getBackendInfo(),
        ])
            .then(([nextBackups, nextBackend]) => {
                if (cancelled) {
                    return
                }

                setBackups(
                    nextBackups.sort(
                        (a, b) =>
                            Date.parse(b.createdAt) -
                            Date.parse(a.createdAt),
                    ),
                )
                setBackendInfo(nextBackend)
            })
            .catch((error: unknown) => {
                if (cancelled) {
                    return
                }

                setStatus({
                    type: 'error',
                    title: 'Yedekler açılamadı',
                    detail: getErrorMessage(error),
                })
            })
            .finally(() => {
                if (!cancelled) {
                    setBusyState('idle')
                }
            })

        return () => {
            cancelled = true
        }
    }, [])

    async function handleCreateBackup() {
        try {
            setBusyState('creating')
            setStatus(null)

            await dataBackupService.createBackup()
            await load()

            setStatus({
                type: 'success',
                title: 'Yedek oluşturuldu',
                detail: 'Mevcut verileriniz yedeklerinize eklendi.',
            })
        } catch (error) {
            setStatus({
                type: 'error',
                title: 'Yedek oluşturulamadı',
                detail: getErrorMessage(error),
            })
        } finally {
            setBusyState('idle')
        }
    }

    function handleChooseBackup() {
        if (!isBusy) {
            fileInputRef.current?.click()
        }
    }

    async function handleBackupFileChange(
        event: ChangeEvent<HTMLInputElement>,
    ) {
        const file = event.target.files?.[0]
        event.target.value = ''

        if (!file) {
            return
        }

        try {
            setBusyState('importing')
            setStatus(null)

            const backup = await backupService.readBackupFile(file)
            await dataBackupService.importBackup(backup)
            await load()

            setStatus({
                type: 'success',
                title: 'Yedek eklendi',
                detail: 'Seçtiğiniz yedek artık BazaarFlow yedekleri arasında.',
            })
        } catch (error) {
            setStatus({
                type: 'error',
                title: 'Yedek eklenemedi',
                detail: getErrorMessage(error),
            })
        } finally {
            setBusyState('idle')
        }
    }

    async function handleRestore() {
        if (!restoreTarget) {
            return
        }

        const target = restoreTarget
        setRestoreTarget(null)

        try {
            setBusyState('restoring')
            setStatus(null)

            await dataBackupService.restoreBackup(target.id)

            setStatus({
                type: 'success',
                title: 'Yedek geri yüklendi',
                detail: 'Verileriniz seçtiğiniz yedekteki haline getirildi.',
            })
        } catch (error) {
            setStatus({
                type: 'error',
                title: 'Geri yükleme başarısız',
                detail: getErrorMessage(error),
            })
        } finally {
            setBusyState('idle')
        }
    }

    async function handleExport(id: string) {
        try {
            setBusyState('exporting')
            setStatus(null)

            await dataBackupService.exportBackup(id)

            setStatus({
                type: 'success',
                title: 'Yedek dışa aktarıldı',
                detail: backendInfo?.backend === 'native-files'
                    ? 'Taşınabilir yedek, BazaarFlow yedek alanına hazırlandı.'
                    : 'Taşınabilir yedek cihazınıza gönderildi.',
            })
        } catch (error) {
            setStatus({
                type: 'error',
                title: 'Yedek dışa aktarılamadı',
                detail: getErrorMessage(error),
            })
        } finally {
            setBusyState('idle')
        }
    }

    async function handleDelete() {
        if (!deleteTarget) {
            return
        }

        const target = deleteTarget
        setDeleteTarget(null)

        try {
            setBusyState('deleting')
            setStatus(null)

            await dataBackupService.deleteBackup(target.id)
            await load()

            setStatus({
                type: 'success',
                title: 'Yedek silindi',
                detail: 'Seçtiğiniz yedek kaldırıldı.',
            })
        } catch (error) {
            setStatus({
                type: 'error',
                title: 'Yedek silinemedi',
                detail: getErrorMessage(error),
            })
        } finally {
            setBusyState('idle')
        }
    }

    async function handleOpenFolder() {
        try {
            setBusyState('opening-folder')
            setStatus(null)
            await dataBackupService.openFolder()
        } catch (error) {
            setStatus({
                type: 'error',
                title: 'Yedek klasörü açılamadı',
                detail: getErrorMessage(error),
            })
        } finally {
            setBusyState('idle')
        }
    }

    return (
        <section className="data-center-page backup-center-page">
            <header className="data-center-header backup-center-header">
                <button
                    type="button"
                    className="data-center-icon-button"
                    aria-label="Verilere dön"
                    onClick={() => navigate('/data')}
                >
                    <ArrowLeft size={20} />
                </button>

                <div className="data-center-title-copy">
                    <h1>Yedekler</h1>
                    <p>Uzun süre saklamak veya başka cihaza taşımak için.</p>
                </div>

                {backendInfo?.canOpenFolder ? (
                    <button
                        type="button"
                        className="data-center-icon-button"
                        aria-label="Yedek klasörünü aç"
                        disabled={isBusy}
                        onClick={() => {
                            void handleOpenFolder()
                        }}
                    >
                        <FolderOpen size={20} />
                    </button>
                ) : (
                    <span aria-hidden="true" />
                )}
            </header>

            <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="settings-file-input"
                onChange={handleBackupFileChange}
            />

            {status && (
                <SettingsStatusCard
                    status={status}
                    onDismiss={() => setStatus(null)}
                />
            )}

            <section className="backup-center-actions">
                <button
                    type="button"
                    className="primary-button backup-center-primary-action"
                    disabled={isBusy}
                    onClick={() => {
                        void handleCreateBackup()
                    }}
                >
                    <Plus size={18} />
                    {busyState === 'creating'
                        ? 'Oluşturuluyor...'
                        : 'Yeni Yedek Oluştur'}
                </button>

                <button
                    type="button"
                    className="backup-center-secondary-action"
                    disabled={isBusy}
                    onClick={handleChooseBackup}
                >
                    <Upload size={18} />
                    {busyState === 'importing'
                        ? 'Ekleniyor...'
                        : 'Dışarıdan Yedek Ekle'}
                </button>
            </section>

            <section className="data-center-list-section">
                <div className="data-center-list-heading">
                    <h2>Yedekleriniz</h2>
                </div>

                {busyState === 'loading' && backups.length === 0 ? (
                    <div className="data-center-empty">
                        Yedekler hazırlanıyor...
                    </div>
                ) : backups.length === 0 ? (
                    <div className="data-center-empty">
                        <FolderOpen size={28} />
                        <strong>Henüz yedek yok</strong>
                        <span>
                            İhtiyaç duyduğunuzda geri dönebilmek veya başka cihaza taşımak için bir yedek oluşturabilirsiniz.
                        </span>
                    </div>
                ) : (
                    <div className="backup-center-list">
                        {backups.map((backup) => (
                            <article
                                key={backup.id}
                                className="backup-center-record"
                            >
                                <div className="backup-center-record-copy">
                                    <strong>
                                        {formatBackupDate(backup.createdAt)}
                                    </strong>
                                    <span>
                                        {backup.origin === 'imported'
                                            ? 'İçe aktarılan yedek'
                                            : 'BazaarFlow yedeği'}
                                    </span>
                                </div>

                                <div className="backup-center-record-actions">
                                    <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => setRestoreTarget(backup)}
                                    >
                                        <RotateCcw size={15} />
                                        Geri Yükle
                                    </button>

                                    <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => {
                                            void handleExport(backup.id)
                                        }}
                                    >
                                        <Download size={15} />
                                        Dışa Aktar
                                    </button>

                                    <button
                                        type="button"
                                        className="backup-center-delete-button"
                                        aria-label="Yedeği sil"
                                        disabled={isBusy}
                                        onClick={() => setDeleteTarget(backup)}
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <ConfirmDialog
                open={restoreTarget !== null}
                title="Bu yedeğe dön"
                description={
                    restoreTarget
                        ? `${formatBackupDate(restoreTarget.createdAt)} tarihindeki yedek geri yüklenecek. Şu anki durumunuz önce otomatik olarak korunacak.`
                        : ''
                }
                confirmLabel="Yedeği Geri Yükle"
                pendingLabel="Geri yükleniyor..."
                tone="warning"
                isConfirming={busyState === 'restoring'}
                onCancel={() => setRestoreTarget(null)}
                onConfirm={handleRestore}
            />

            <ConfirmDialog
                open={deleteTarget !== null}
                title="Yedeği sil"
                description="Bu yedek kalıcı olarak silinecek. Otomatik veri kayıtlarınız etkilenmez."
                confirmLabel="Yedeği Sil"
                pendingLabel="Siliniyor..."
                tone="danger"
                isConfirming={busyState === 'deleting'}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            />
        </section>
    )
}

export default BackupsPage
