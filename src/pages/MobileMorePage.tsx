import {
    BarChart3,
    LayoutDashboard,
    Settings,
    ShoppingCart,
} from 'lucide-react'
import { Link } from 'react-router-dom'

function MobileMorePage() {
    return (
        <div className="dashboard mobile-more-page">
            <header className="page-header">
                <span className="page-eyebrow">BazaarFlow</span>
                <h1>Daha Fazla</h1>
                <p>Daha az kullanılan yönetim ekranlarına buradan ulaşın.</p>
            </header>

            <div className="mobile-more-grid">
                <Link to="/" className="mobile-more-item">
                    <LayoutDashboard size={24} />
                    <div>
                        <strong>Genel Bakış</strong>
                        <span>Günlük özet</span>
                    </div>
                </Link>

                <Link to="/sales" className="mobile-more-item">
                    <ShoppingCart size={24} />
                    <div>
                        <strong>Detaylı Satışlar</strong>
                        <span>Satış geçmişi ve düzenleme</span>
                    </div>
                </Link>

                <Link to="/reports" className="mobile-more-item">
                    <BarChart3 size={24} />
                    <div>
                        <strong>Raporlar</strong>
                        <span>Ayrıntılı analizler</span>
                    </div>
                </Link>

                <Link to="/settings" className="mobile-more-item">
                    <Settings size={24} />
                    <div>
                        <strong>Ayarlar</strong>
                        <span>Yedekleme ve uygulama ayarları</span>
                    </div>
                </Link>
            </div>
        </div>
    )
}

export default MobileMorePage
