type PlaceholderPageProps = {
    title: string
    description: string
}

function PlaceholderPage({
    title,
    description,
}: PlaceholderPageProps) {
    return (
        <div className="dashboard">
            <header className="page-header">
                <span className="page-eyebrow">BazaarFlow</span>
                <h1>{title}</h1>
                <p>{description}</p>
            </header>

            <section className="dashboard-panel">
                <div className="empty-state">
                    <div>
                        <strong>{title} modülü hazırlanıyor</strong>
                        <p>
                            Bu bölüm sonraki geliştirme adımlarında işlevsel hale getirilecek.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default PlaceholderPage