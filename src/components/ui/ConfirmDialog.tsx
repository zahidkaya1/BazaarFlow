import {
    useEffect,
    useId,
    useRef,
} from 'react'
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

const FOCUSABLE_SELECTOR = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',')

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
    const dialogRef =
        useRef<HTMLElement>(null)
    const cancelButtonRef =
        useRef<HTMLButtonElement>(null)
    const onCancelRef =
        useRef(onCancel)
    const isConfirmingRef =
        useRef(isConfirming)

    useEffect(() => {
        onCancelRef.current = onCancel
    }, [onCancel])

    useEffect(() => {
        isConfirmingRef.current =
            isConfirming
    }, [isConfirming])

    useEffect(() => {
        if (!open) {
            return
        }

        const previouslyFocused =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null
        const previousOverflow =
            document.body.style.overflow

        document.body.style.overflow =
            'hidden'

        const focusTimer =
            window.setTimeout(() => {
                cancelButtonRef.current?.focus()
            }, 0)

        function handleKeyDown(
            event: KeyboardEvent,
        ) {
            const dialog =
                dialogRef.current

            if (!dialog) {
                return
            }

            if (event.key === 'Escape') {
                if (
                    !isConfirmingRef.current
                ) {
                    event.preventDefault()
                    onCancelRef.current()
                }

                return
            }

            if (event.key !== 'Tab') {
                return
            }

            const focusableElements =
                Array.from(
                    dialog.querySelectorAll<HTMLElement>(
                        FOCUSABLE_SELECTOR,
                    ),
                )

            if (
                focusableElements.length === 0
            ) {
                event.preventDefault()
                dialog.focus()
                return
            }

            const firstElement =
                focusableElements[0]!
            const lastElement =
                focusableElements[
                    focusableElements.length - 1
                ]!
            const activeElement =
                document.activeElement

            if (
                event.shiftKey &&
                (
                    activeElement ===
                        firstElement ||
                    !dialog.contains(
                        activeElement,
                    )
                )
            ) {
                event.preventDefault()
                lastElement.focus()
                return
            }

            if (
                !event.shiftKey &&
                activeElement === lastElement
            ) {
                event.preventDefault()
                firstElement.focus()
            }
        }

        document.addEventListener(
            'keydown',
            handleKeyDown,
        )

        return () => {
            window.clearTimeout(focusTimer)
            document.removeEventListener(
                'keydown',
                handleKeyDown,
            )
            document.body.style.overflow =
                previousOverflow

            if (
                previouslyFocused?.isConnected
            ) {
                previouslyFocused.focus()
            }
        }
    }, [open])

    if (!open) {
        return null
    }

    return (
        <div
            className="confirm-dialog-backdrop"
            role="presentation"
        >
            <section
                ref={dialogRef}
                className={`confirm-dialog confirm-dialog-${tone}`}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                aria-busy={isConfirming}
                tabIndex={-1}
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
                        ref={cancelButtonRef}
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
