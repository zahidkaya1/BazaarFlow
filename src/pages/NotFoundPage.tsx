import { ArrowLeft, SearchX } from 'lucide-react'
import { Link } from 'react-router-dom'

function NotFoundPage() {
    return (
        <div className="dashboard not-found-page">
            <section className="not-found-card">
                <span
                    className="not-found-icon"
                    aria-hidden="true"
                >
                    <SearchX
                        size={30}
                        strokeWidth={1.8}
                    />
                </span>

                <span className="page-eyebrow">
                    404
                </span>

                <h1>Sayfa bulunamadı</h1>

                <p>
                    Açmaya çalıştığınız BazaarFlow sayfası bulunamadı
                    veya artık kullanılamıyor.
                </p>

                <div className="not-found-actions">
                    <Link
                        to="/"
                        className="primary-button"
                    >
                        <ArrowLeft size={17} />
                        Genel Bakışa Dön
                    </Link>
                </div>
            </section>
        </div>
    )
}

export default NotFoundPage
