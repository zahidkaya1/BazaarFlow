import { useId } from 'react'
import { AlertTriangle, X } from 'lucide-react'

type ConfirmDialogTone =
    | 'warning'
    | 'danger'

type ConfirmDialogProps = {
    open: boolean
    title: string
    description: string
    confirmLabel: string
    pendingLabel?: string
    cancelLabel?: string
    tone?: ConfirmDialogTone
    isConfirming?: boolean
    onConfirm: () => void | Promise<void>
    onCancel: () => void
}

function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel,
    pendingLabel = 'İşleniyor...',
    cancelLabel = 'Vazgeç',
    tone = 'warning',
    isConfirming = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const titleId = useId()
    const descriptionId = useId()

    if (!open) {
        return null
    }

    return (
        <div
            className="confirm-dialog-backdrop"
            role="presentation"
        >
            <section
                className={`confirm-dialog confirm-dialog-${tone}`}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                aria-busy={isConfirming}
            >
                <div className="confirm-dialog-header">
                    <span
                        className="confirm-dialog-icon"
                        aria-hidden="true"
                    >
                        <AlertTriangle
                            size={20}
                            strokeWidth={2}
                        />
                    </span>

                    <div className="confirm-dialog-heading">
                        <span>
                            {tone === 'danger'
                                ? 'Dikkat'
                                : 'Onay gerekli'}
                        </span>

                        <h2 id={titleId}>
                            {title}
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="confirm-dialog-close"
                        onClick={onCancel}
                        disabled={isConfirming}
                        aria-label="Pencereyi kapat"
                    >
                        <X size={18} />
                    </button>
                </div>

                <p
                    id={descriptionId}
                    className="confirm-dialog-description"
                >
                    {description}
                </p>

                <div className="confirm-dialog-actions">
                    <button
                        type="button"
                        className="secondary-button"
                        onClick={onCancel}
                        disabled={isConfirming}
                    >
                        {cancelLabel}
                    </button>

                    <button
                        type="button"
                        className={`confirm-dialog-confirm-button confirm-dialog-confirm-${tone}`}
                        onClick={() => {
                            void onConfirm()
                        }}
                        disabled={isConfirming}
                    >
                        {isConfirming
                            ? pendingLabel
                            : confirmLabel}
                    </button>
                </div>
            </section>
        </div>
    )
}

export default ConfirmDialog
