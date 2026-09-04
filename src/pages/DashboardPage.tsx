import {
    Banknote,
    CircleDollarSign,
    PackageCheck,
    TrendingUp,
} from 'lucide-react'

const summaryCards = [
    {
        title: 'Bugünkü Ciro',
        value: '₺0,00',
        description: 'Bugün gerçekleşen satışlar',
        icon: Banknote,
    },
    {
        title: 'Brüt Kâr',
        value: '₺0,00',
        description: 'Satışlardan elde edilen brüt kâr',
        icon: TrendingUp,
    },
    {
        title: 'Satılan Ürün',
        value: '0',
        description: 'Bugün satılan toplam ürün',
        icon: PackageCheck,
    },
    {
        title: 'Toplam İndirim',
        value: '₺0,00',
        description: 'Bugün uygulanan indirimler',
        icon: CircleDollarSign,
    },
]

function DashboardPage() {
    return (
        <div className="dashboard">
            <header className="page-header">
                <div>
                    <span className="page-eyebrow">BazaarFlow</span>
                    <h1>Genel Bakış</h1>
                    <p>Satış, stok ve kârlılık durumunuzu buradan takip edin.</p>
                </div>
            </header>

            <section className="summary-grid" aria-label="Günlük özet">
                {summaryCards.map((card) => {
                    const Icon = card.icon

                    return (
                        <article key={card.title} className="summary-card">
                            <div className="summary-card-header">
                                <span className="summary-card-icon">
                                    <Icon size={21} strokeWidth={1.8} />
                                </span>

                                <span className="summary-card-title">{card.title}</span>
                            </div>

                            <strong className="summary-card-value">{card.value}</strong>

                            <span className="summary-card-description">
                                {card.description}
                            </span>
                        </article>
                    )
                })}
            </section>

            <section className="dashboard-grid">
                <article className="dashboard-panel dashboard-panel-large">
                    <div className="panel-header">
                        <div>
                            <h2>Son Satışlar</h2>
                            <p>En son kaydedilen satış işlemleri.</p>
                        </div>
                    </div>

                    <div className="empty-state">
                        <ShoppingCartEmptyIcon />

                        <div>
                            <strong>Henüz satış kaydı yok</strong>
                            <p>İlk satışınızı eklediğinizde burada görüntülenecek.</p>
                        </div>
                    </div>
                </article>

                <article className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Düşük Stok</h2>
                            <p>Minimum stok seviyesine yaklaşan ürünler.</p>
                        </div>
                    </div>

                    <div className="empty-state empty-state-compact">
                        <PackageCheck size={28} strokeWidth={1.5} />

                        <div>
                            <strong>Stok verisi bulunmuyor</strong>
                            <p>Ürün ve stok eklediğinizde burada gösterilecek.</p>
                        </div>
                    </div>
                </article>
            </section>
        </div>
    )
}

function ShoppingCartEmptyIcon() {
    return (
        <div className="empty-state-icon" aria-hidden="true">
            <PackageCheck size={32} strokeWidth={1.5} />
        </div>
    )
}

export default DashboardPage