import {
    Boxes,
    ChartNoAxesCombined,
    LayoutDashboard,
    PackagePlus,
    Settings,
    ShoppingCart,
} from 'lucide-react'

const navigationItems = [
    {
        label: 'Genel Bakış',
        icon: LayoutDashboard,
        active: true,
    },
    {
        label: 'Satış',
        icon: ShoppingCart,
        active: false,
    },
    {
        label: 'Stok',
        icon: PackagePlus,
        active: false,
    },
    {
        label: 'Ürünler',
        icon: Boxes,
        active: false,
    },
    {
        label: 'Raporlar',
        icon: ChartNoAxesCombined,
        active: false,
    },
]

function Sidebar() {
    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="brand-logo" aria-hidden="true">
                    B
                </div>

                <div className="brand-text">
                    <span className="brand-name">BazaarFlow</span>
                    <span className="brand-description">Satış & Stok Takibi</span>
                </div>
            </div>

            <nav className="sidebar-navigation" aria-label="Ana menü">
                {navigationItems.map((item) => {
                    const Icon = item.icon

                    return (
                        <button
                            key={item.label}
                            type="button"
                            className={`navigation-item ${item.active ? 'navigation-item-active' : ''
                                }`}
                        >
                            <Icon size={20} strokeWidth={1.8} />
                            <span>{item.label}</span>
                        </button>
                    )
                })}
            </nav>

            <div className="sidebar-footer">
                <button type="button" className="navigation-item">
                    <Settings size={20} strokeWidth={1.8} />
                    <span>Ayarlar</span>
                </button>
            </div>
        </aside>
    )
}

export default Sidebar