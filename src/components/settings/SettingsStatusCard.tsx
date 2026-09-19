import {
    AlertCircle,
    CheckCircle2,
    FileText,
    X,
} from 'lucide-react'

export type SettingsStatus = {
    type: 'success' | 'error'
    title: string
    detail?: string
    fileName?: string
}

type SettingsStatusCardProps = {
    status: SettingsStatus
    onDismiss?: () => void
}

function SettingsStatusCard({
    status,
    onDismiss,
}: SettingsStatusCardProps) {
    const isSuccess =
        status.type === 'success'

    return (
        <div
            className={`settings-status-card settings-status-card-${status.type}`}
            role={isSuccess ? 'status' : 'alert'}
        >
            <span className="settings-status-icon">
                {isSuccess ? (
                    <CheckCircle2 size={19} />
                ) : (
                    <AlertCircle size={19} />
                )}
            </span>

            <div className="settings-status-copy">
                <strong>{status.title}</strong>

                {status.detail && (
                    <span>{status.detail}</span>
                )}

                {status.fileName && (
                    <span className="settings-status-file">
                        <FileText size={14} />
                        <span title={status.fileName}>
                            {status.fileName}
                        </span>
                    </span>
                )}
            </div>

            {onDismiss && (
                <button
                    type="button"
                    className="settings-status-dismiss"
                    aria-label="Bildirimi kapat"
                    onClick={onDismiss}
                >
                    <X size={16} />
                </button>
            )}
        </div>
    )
}

export default SettingsStatusCard
