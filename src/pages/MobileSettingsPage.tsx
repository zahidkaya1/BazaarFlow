import {
    ChevronRight,
    ArchiveRestore,
    Info,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import MobilePageHeader from '../components/mobile/MobilePageHeader'

function MobileSettingsPage() {
    const navigate = useNavigate()

    return (
        <div className="mobile-page-shell">
            <MobilePageHeader
                title="Ayarlar"
                description="BazaarFlow tercihleri ve veri yönetimi."
            />

            <section className="mobile-settings-section">
                <div className="mobile-settings-section-title">
                    <span>Veriler</span>
                </div>

                <button
                    type="button"
                    className="mobile-settings-action-card"
                    onClick={() => navigate('/data')}
                >
                    <span className="mobile-settings-action-icon">
                        <ArchiveRestore size={19} />
                    </span>

                    <span className="mobile-settings-action-copy">
                        <strong>Veriler</strong>
                        <small>
                            Kayıt geçmişi ve yedekler
                        </small>
                    </span>

                    <ChevronRight size={17} />
                </button>
            </section>

            <section className="mobile-settings-section">
                <div className="mobile-settings-section-title">
                    <span>Uygulama</span>
                </div>

                <div className="mobile-settings-static-card">
                    <span className="mobile-settings-action-icon">
                        <Info size={19} />
                    </span>

                    <span className="mobile-settings-action-copy">
                        <strong>BazaarFlow</strong>
                        <small>v0.1.0 · Local-first</small>
                    </span>
                </div>
            </section>
        </div>
    )
}

export default MobileSettingsPage
