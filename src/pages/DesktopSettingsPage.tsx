import {
    ArrowRight,
    ArchiveRestore,
    Info,
    Palette,
    ShieldCheck,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import ThemeSelector from '../components/settings/ThemeSelector'

function DesktopSettingsPage() {
    const navigate = useNavigate()

    return (
        <section className="dashboard">
            <header className="page-header">
                <span className="page-eyebrow">Ayarlar</span>
                <h1>Ayarlar</h1>
                <p>
                    BazaarFlow tercihlerini ve verilerinizi tek yerden yönetin.
                </p>
            </header>

            <div className="settings-grid settings-grid-data-tools">
                <article className="dashboard-panel settings-data-center-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Veriler</h2>
                            <p>
                                Otomatik kayıtlar, geri yükleme ve yedekler tek merkezde.
                            </p>
                        </div>
                        <ArchiveRestore size={20} />
                    </div>

                    <div className="settings-panel-content">
                        <div className="settings-feature-list settings-feature-list-single">
                            <span>
                                <ShieldCheck size={15} />
                                Veriler otomatik korunur
                            </span>
                            <span>
                                <ShieldCheck size={15} />
                                Yanlış işlemlerden önce kayıt alınır
                            </span>
                            <span>
                                <ShieldCheck size={15} />
                                Yedekler aynı kayıt sistemiyle çalışır
                            </span>
                        </div>

                        <button
                            type="button"
                            className="primary-button"
                            onClick={() => navigate('/data')}
                        >
                            Verileri Aç
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </article>

                <article className="dashboard-panel settings-theme-panel">
                    <div className="panel-header">
                        <div>
                            <h2>Görünüm</h2>
                            <p>
                                Uygulamanın açık veya koyu görünümünü seçin.
                            </p>
                        </div>
                        <Palette size={20} />
                    </div>

                    <div className="settings-panel-content">
                        <ThemeSelector />
                    </div>
                </article>

                <article className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2>BazaarFlow</h2>
                            <p>Uygulama bilgileri.</p>
                        </div>
                        <Info size={20} />
                    </div>

                    <div className="settings-panel-content">
                        <p className="settings-helper-text">
                            v0.1.0 · Local-first · IndexedDB
                        </p>
                    </div>
                </article>
            </div>
        </section>
    )
}

export default DesktopSettingsPage
