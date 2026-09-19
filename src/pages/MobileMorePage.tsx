import { useLiveQuery } from 'dexie-react-hooks'
import {
    BarChart3,
    ChevronRight,
    CircleDollarSign,
    LayoutDashboard,
    PackageCheck,
    ReceiptText,
    Settings,
    TrendingUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import MobilePageHeader from '../components/mobile/MobilePageHeader'
import {
    salesService,
    type SaleHistorySummary,
} from '../services/salesService'
import { getTodayDateValue } from '../utils/dateOnly'
import { formatMoneyFromMinor } from '../utils/money'


function MobileMorePage() {
    const today = getTodayDateValue()

    const todaySummary = useLiveQuery(
        () =>
            salesService.getSummaryByDateRange(
                today,
                today,
            ),
        [today],
        {
            transactionCount: 0,
            totalQuantity: 0,
            listTotalMinor: 0,
            revenueMinor: 0,
            discountMinor: 0,
            costMinor: 0,
            grossProfitMinor: 0,
        } as SaleHistorySummary,
    )

    return (
        <div className="mobile-page-shell">
            <MobilePageHeader
                title="Daha Fazla"
            />

            <section className="mobile-more-compact-today">
                <div className="mobile-more-compact-section-heading">
                    <div>
                        <span>BUGÜN</span>
                        <strong>
                            Günlük Özet
                        </strong>
                    </div>

                </div>

                <div className="mobile-more-compact-summary-grid">
                    <article>
                        <span className="mobile-more-compact-summary-icon">
                            <CircleDollarSign
                                size={16}
                            />
                        </span>

                        <div>
                            <span>Ciro</span>
                            <strong>
                                {formatMoneyFromMinor(
                                    todaySummary.revenueMinor,
                                )}
                            </strong>
                        </div>
                    </article>

                    <article>
                        <span className="mobile-more-compact-summary-icon">
                            <TrendingUp
                                size={16}
                            />
                        </span>

                        <div>
                            <span>
                                Brüt Kâr
                            </span>
                            <strong>
                                {formatMoneyFromMinor(
                                    todaySummary.grossProfitMinor,
                                )}
                            </strong>
                        </div>
                    </article>

                    <article>
                        <span className="mobile-more-compact-summary-icon">
                            <ReceiptText
                                size={16}
                            />
                        </span>

                        <div>
                            <span>Satış</span>
                            <strong>
                                {
                                    todaySummary.transactionCount
                                }
                            </strong>
                        </div>
                    </article>

                    <article>
                        <span className="mobile-more-compact-summary-icon">
                            <PackageCheck
                                size={16}
                            />
                        </span>

                        <div>
                            <span>
                                Satılan
                            </span>
                            <strong>
                                {
                                    todaySummary.totalQuantity
                                }{' '}
                                adet
                            </strong>
                        </div>
                    </article>
                </div>
            </section>

            <section className="mobile-more-compact-menu">
                <span className="mobile-more-compact-menu-title">
                    DİĞER EKRANLAR
                </span>

                <div className="mobile-more-compact-menu-list">
                    <Link
                        to="/reports"
                        className="mobile-more-compact-menu-item"
                    >
                        <span className="mobile-more-compact-menu-icon">
                            <BarChart3
                                size={19}
                            />
                        </span>

                        <div>
                            <strong>
                                Raporlar
                            </strong>

                            <span>
                                Ciro ve kârlılık
                            </span>
                        </div>

                        <ChevronRight
                            size={17}
                        />
                    </Link>

                    <Link
                        to="/"
                        className="mobile-more-compact-menu-item"
                    >
                        <span className="mobile-more-compact-menu-icon">
                            <LayoutDashboard
                                size={19}
                            />
                        </span>

                        <div>
                            <strong>
                                Genel Bakış
                            </strong>

                            <span>
                                Günlük durum
                            </span>
                        </div>

                        <ChevronRight
                            size={17}
                        />
                    </Link>

                    <Link
                        to="/settings"
                        className="mobile-more-compact-menu-item"
                    >
                        <span className="mobile-more-compact-menu-icon">
                            <Settings
                                size={19}
                            />
                        </span>

                        <div>
                            <strong>
                                Ayarlar
                            </strong>

                            <span>
                                Yedekleme ve dışa aktarma
                            </span>
                        </div>

                        <ChevronRight
                            size={17}
                        />
                    </Link>
                </div>
            </section>
        </div>
    )
}

export default MobileMorePage
