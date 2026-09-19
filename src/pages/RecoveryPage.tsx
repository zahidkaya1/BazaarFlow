import {
    ArrowLeft,
    ChevronRight,
    FileSpreadsheet,
    FolderArchive,
    MoreVertical,
    Save,
    ShieldCheck,
} from 'lucide-react'
import {
    useCallback,
    useEffect,
    useState,
} from 'react'
import { useNavigate } from 'react-router-dom'

import SettingsStatusCard, {
    type SettingsStatus,
} from '../components/settings/SettingsStatusCard'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { exportService } from '../services/exportService'
import { recoveryService } from '../services/recoveryService'
import type { RecoveryPointMeta } from '../types/recovery'

type BusyState =
    | 'idle'
    | 'loading'
    | 'saving'
    | 'restoring'
    | 'csv-exporting'

function getErrorMessage(error: unknown): string {
    return error instanceof Error
        ? error.message
        : 'Beklenmeyen bir hata oluştu.'
}

function isSameLocalDay(
    first: Date,
    second: Date,
): boolean {
    return (
        first.getFullYear() === second.getFullYear() &&
        first.getMonth() === second.getMonth() &&
        first.getDate() === second.getDate()
    )
}

function formatPointDate(value: string): string {
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

function formatLastSaved(value: string): string {
    const timestamp = Date.parse(value)

    if (Number.isNaN(timestamp)) {
        return 'Yakın zamanda'
    }

    const elapsed = Date.now() - timestamp

    if (elapsed < 60_000) {
        return 'Az önce'
    }

    if (elapsed < 60 * 60_000) {
        return `${Math.max(1, Math.floor(elapsed / 60_000))} dk önce`
    }

    if (elapsed < 24 * 60 * 60_000) {
        return `${Math.max(1, Math.floor(elapsed / (60 * 60_000)))} sa önce`
    }

    return formatPointDate(value)
}

function getSimplePointLabel(
    point: RecoveryPointMeta,
): string {
    switch (point.kind) {
        case 'action':
            return point.reason
        case 'before_restore':
            return 'Geri yüklemeden önce'
        case 'manual':
            return 'Manuel kayıt'
        case 'imported':
            return 'İçe aktarılan kayıt'
        case 'automatic':
        case 'hourly':
        case 'daily':
            return 'Otomatik kayıt'
    }
}

function RecoveryPage() {
    const navigate = useNavigate()

    const [points, setPoints] =
        useState<RecoveryPointMeta[]>([])
    const [busyState, setBusyState] =
        useState<BusyState>('loading')
    const [status, setStatus] =
        useState<SettingsStatus | null>(null)
    const [selectedPoint, setSelectedPoint] =
        useState<RecoveryPointMeta | null>(null)
    const [isMenuOpen, setIsMenuOpen] =
        useState(false)

    const isBusy = busyState !== 'idle'
    const latestPoint = points[0]

    const load = useCallback(async () => {
        try {
            const nextPoints = await recoveryService.listPoints()

            setPoints(
                nextPoints.sort(
                    (a, b) =>
                        Date.parse(b.createdAt) -
                        Date.parse(a.createdAt),
                ),
            )
        } catch (error) {
            setStatus({
                type: 'error',
                title: 'Veriler açılamadı',
                detail: getErrorMessage(error),
            })
        }
    }, [])

    useEffect(() => {
        let cancelled = false

        void recoveryService.listPoints()
            .then((nextPoints) => {
                if (cancelled) {
                    return
                }

                setPoints(
                    nextPoints.sort(
                        (a, b) =>
                            Date.parse(b.createdAt) -
                            Date.parse(a.createdAt),
                    ),
                )
            })
            .catch((error: unknown) => {
                if (cancelled) {
                    return
                }

                setStatus({
                    type: 'error',
                    title: 'Veriler açılamadı',
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

    async function handleCreateManualPoint() {
        try {
            setBusyState('saving')
            setStatus(null)

            await recoveryService.createManualPoint()
            await load()

            setStatus({
                type: 'success',
                title: 'Kayıt oluşturuldu',
                detail: 'Mevcut verileriniz güvenli şekilde kaydedildi.',
            })
        } catch (error) {
            setStatus({
                type: 'error',
                title: 'Kayıt oluşturulamadı',
                detail: getErrorMessage(error),
            })
        } finally {
            setBusyState('idle')
        }
    }

    async function handleRestore() {
        if (!selectedPoint) {
            return
        }

        const point = selectedPoint
        setSelectedPoint(null)

        try {
            setBusyState('restoring')
            setStatus(null)

            await recoveryService.restorePoint(point.id)
            await load()

            setStatus({
                type: 'success',
                title: 'Kayıt geri yüklendi',
                detail: 'Verileriniz seçtiğiniz zamandaki haline getirildi.',
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

    async function handleExportCsv() {
        setIsMenuOpen(false)

        try {
            setBusyState('csv-exporting')
            setStatus(null)

            await exportService.downloadSalesCsv()

            setStatus({
                type: 'success',
                title: 'Satışlar dışa aktarıldı',
                detail: 'CSV dosyanız hazırlandı.',
            })
        } catch (error) {
            setStatus({
                type: 'error',
                title: 'CSV oluşturulamadı',
                detail: getErrorMessage(error),
            })
        } finally {
            setBusyState('idle')
        }
    }

    return (
        <section className="data-center-page mobile-screen">
            <header className="data-center-header">
                <button
                    type="button"
                    className="data-center-icon-button"
                    aria-label="Geri dön"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft size={20} />
                </button>

                <div className="data-center-title-copy">
                    <h1>Veriler</h1>
                    <p>Verileriniz otomatik olarak korunur.</p>
                </div>

                <div className="data-center-menu-wrap">
                    <button
                        type="button"
                        className="data-center-icon-button"
                        aria-label="Veri seçenekleri"
                        disabled={isBusy}
                        onClick={() => setIsMenuOpen((value) => !value)}
                    >
                        <MoreVertical size={21} />
                    </button>

                    {isMenuOpen && (
                        <div className="data-center-menu">
                            <button
                                type="button"
                                onClick={() => {
                                    void handleExportCsv()
                                }}
                            >
                                <FileSpreadsheet size={17} />
                                Satışları CSV aktar
                            </button>
                        </div>
                    )}
                </div>
            </header>

            <div className="mobile-page-scroll data-center-scroll">
            {status && (
                <SettingsStatusCard
                    status={status}
                    onDismiss={() => setStatus(null)}
                />
            )}

            <section className="data-center-protection-card">
                <span className="data-center-protection-icon">
                    <ShieldCheck size={25} />
                </span>

                <div>
                    <strong>Verileriniz korunuyor</strong>
                    <span>
                        {latestPoint
                            ? `Son kayıt: ${formatLastSaved(latestPoint.createdAt)}`
                            : 'İlk kayıt hazırlanıyor'}
                    </span>
                </div>

                <span className="data-center-live-dot" aria-hidden="true" />
            </section>

            <button
                type="button"
                className="primary-button data-center-save-button"
                disabled={isBusy}
                onClick={() => {
                    void handleCreateManualPoint()
                }}
            >
                <Save size={17} />
                {busyState === 'saving'
                    ? 'Kaydediliyor...'
                    : 'Şimdi Kaydet'}
            </button>

            <button
                type="button"
                className="data-center-backups-link"
                disabled={isBusy}
                onClick={() => navigate('/data/backups')}
            >
                <span className="data-center-backups-icon">
                    <FolderArchive size={20} />
                </span>
                <span className="data-center-backups-copy">
                    <strong>Yedekler</strong>
                    <small>
                        Uzun süreli saklama ve cihazlar arası taşıma
                    </small>
                </span>
                <ChevronRight size={18} />
            </button>

            <section className="data-center-list-section">
                <div className="data-center-list-heading">
                    <h2>Kayıtlar</h2>
                </div>

                {busyState === 'loading' && points.length === 0 ? (
                    <div className="data-center-empty">
                        Kayıtlar hazırlanıyor...
                    </div>
                ) : points.length === 0 ? (
                    <div className="data-center-empty">
                        <ShieldCheck size={28} />
                        <strong>Henüz kayıt yok</strong>
                        <span>
                            BazaarFlow veriler değiştikçe otomatik olarak kayıt oluşturacak.
                        </span>
                    </div>
                ) : (
                    <div className="data-center-list">
                        {points.map((point) => (
                            <button
                                key={point.id}
                                type="button"
                                className="data-center-record"
                                disabled={isBusy}
                                onClick={() => setSelectedPoint(point)}
                            >
                                <span className="data-center-record-date">
                                    {formatPointDate(point.createdAt)}
                                </span>

                                <span className="data-center-record-label">
                                    {getSimplePointLabel(point)}
                                </span>

                                <ChevronRight size={18} />
                            </button>
                        ))}
                    </div>
                )}
            </section>
            </div>

            <ConfirmDialog
                open={selectedPoint !== null}
                title="Bu kayda dön"
                description={
                    selectedPoint
                        ? `${formatPointDate(selectedPoint.createdAt)} tarihindeki verilere dönülecek. Şu anki durumunuz da otomatik olarak korunacak.`
                        : ''
                }
                confirmLabel="Bu Kayda Dön"
                pendingLabel="Geri yükleniyor..."
                tone="warning"
                isConfirming={busyState === 'restoring'}
                onCancel={() => setSelectedPoint(null)}
                onConfirm={handleRestore}
            />
        </section>
    )
}

export default RecoveryPage
