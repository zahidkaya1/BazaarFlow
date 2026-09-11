import { useLiveQuery } from 'dexie-react-hooks'
import {
    BarChart3,
    ChevronRight,
    CircleDollarSign,
    LayoutDashboard,
    ReceiptText,
    Settings,
    ShoppingCart,
    TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
    salesService,
    type SaleHistoryRecord,
} from '../services/salesService'
import { formatMoneyFromMinor } from '../utils/money'

function getTodayDateValue(): string {
    const now = new Date()

    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
}

function MobileMorePage() {
    const saleHistory = useLiveQuery(
        () => salesService.getHistory(),
        [],
        [] as SaleHistoryRecord[],
    )

    const today = getTodayDateValue()

    const todayCompletedSales = saleHistory.filter(
        (record) =>
            record.sale.saleDate === today &&
            record.sale.status === 'completed',
    )

    const todayRevenueMinor = todayCompletedSales.reduce(
        (total, record) => total + record.revenueMinor,
        0,
    )

    const todayGrossProfitMinor = todayCompletedSales.reduce(
        (total, record) => total + record.grossProfitMinor,
        0,
    )

    const todayQuantity = todayCompletedSales.reduce(
        (total, record) => total + record.totalQuantity,
        0,
    )

    return (
        <div className="dashboard mobile-more-page">
            <header className="page-header mobile-more-header">
                <span className="page-eyebrow">BazaarFlow</span>
                <h1>Daha Fazla</h1>
                <p>
                    Günün özetini görün ve ayrıntılı yönetim
                    ekranlarına ulaşın.
                </p>
            </header>

            <section className="mobile-more-today">
                <div className="mobile-more-section-heading">
                    <div>
                        <span>BUGÜN</span>
                        <strong>Günlük Özet</strong>
                    </div>

                    <Link to="/" className="mobile-more-summary-link">
                        Genel Bakış
                        <ChevronRight size={15} />
                    </Link>
                </div>

                <div className="mobile-more-summary-grid">
                    <article className="mobile-more-summary-card">
                        <span className="mobile-more-summary-icon">
                            <CircleDollarSign
                                size={18}
                                strokeWidth={1.9}
                            />
                        </span>

                        <div>
                            <span>Ciro</span>
                            <strong>
                                {formatMoneyFromMinor(
                                    todayRevenueMinor,
                                )}
                            </strong>
                        </div>
                    </article>

                    <article className="mobile-more-summary-card">
                        <span className="mobile-more-summary-icon">
                            <ReceiptText
                                size={18}
                                strokeWidth={1.9}
                            />
                        </span>

                        <div>
                            <span>Satış</span>
                            <strong>
                                {todayCompletedSales.length}
                            </strong>
                            <small>
                                {todayQuantity} ürün
                            </small>
                        </div>
                    </article>

                    <article className="mobile-more-summary-card">
                        <span className="mobile-more-summary-icon">
                            <TrendingUp
                                size={18}
                                strokeWidth={1.9}
                            />
                        </span>

                        <div>
                            <span>Brüt Kâr</span>
                            <strong>
                                {formatMoneyFromMinor(
                                    todayGrossProfitMinor,
                                )}
                            </strong>
                        </div>
                    </article>
                </div>
            </section>

            <section className="mobile-more-tools">
                <div className="mobile-more-section-heading">
                    <div>
                        <span>YÖNETİM</span>
                        <strong>Diğer Ekranlar</strong>
                    </div>
                </div>

                <div className="mobile-more-grid">
                    <Link to="/sales" className="mobile-more-item">
                        <span className="mobile-more-item-icon">
                            <ShoppingCart size={21} />
                        </span>

                        <div>
                            <strong>Detaylı Satışlar</strong>
                            <span>
                                Geçmiş satışları görüntüleyin,
                                düzenleyin veya iptal edin.
                            </span>
                        </div>

                        <ChevronRight
                            className="mobile-more-item-arrow"
                            size={18}
                        />
                    </Link>

                    <Link to="/reports" className="mobile-more-item">
                        <span className="mobile-more-item-icon">
                            <BarChart3 size={21} />
                        </span>

                        <div>
                            <strong>Raporlar</strong>
                            <span>
                                Ciro, kârlılık ve ürün
                                performansını inceleyin.
                            </span>
                        </div>

                        <ChevronRight
                            className="mobile-more-item-arrow"
                            size={18}
                        />
                    </Link>

                    <Link to="/" className="mobile-more-item">
                        <span className="mobile-more-item-icon">
                            <LayoutDashboard size={21} />
                        </span>

                        <div>
                            <strong>Genel Bakış</strong>
                            <span>
                                Dashboard ve ayrıntılı günlük
                                durumu açın.
                            </span>
                        </div>

                        <ChevronRight
                            className="mobile-more-item-arrow"
                            size={18}
                        />
                    </Link>

                    <Link to="/settings" className="mobile-more-item">
                        <span className="mobile-more-item-icon">
                            <Settings size={21} />
                        </span>

                        <div>
                            <strong>Ayarlar ve Yedekleme</strong>
                            <span>
                                Yedek oluşturun, geri yükleyin ve
                                uygulama ayarlarını yönetin.
                            </span>
                        </div>

                        <ChevronRight
                            className="mobile-more-item-arrow"
                            size={18}
                        />
                    </Link>
                </div>
            </section>
        </div>
    )
}

export default MobileMorePage
