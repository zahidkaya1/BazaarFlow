import { LoaderCircle } from 'lucide-react'

type PageLoadingProps = {
    message?: string
}

function PageLoading({
    message = 'Sayfa yükleniyor...',
}: PageLoadingProps) {
    return (
        <div
            className="page-loading"
            role="status"
            aria-live="polite"
        >
            <div className="page-loading-card">
                <span
                    className="page-loading-icon"
                    aria-hidden="true"
                >
                    <LoaderCircle
                        size={22}
                        strokeWidth={2}
                    />
                </span>

                <div>
                    <strong>{message}</strong>
                    <span>
                        BazaarFlow hazırlanıyor.
                    </span>
                </div>
            </div>
        </div>
    )
}

export default PageLoading
