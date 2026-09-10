import {
    Boxes,
    ChartNoAxesCombined,
    LayoutDashboard,
    PackagePlus,
    Settings,
    ShoppingCart,
    Zap,
} from 'lucide-react'

import { NavLink } from 'react-router-dom'

const navigationItems = [
    {
        label: 'Genel Bakış',
        path: '/',
        icon: LayoutDashboard,
    },
    {
        label: 'Hızlı Satış',
        path: '/quick-sale',
        icon: Zap,
    },
    {
        label: 'Satış',
        path: '/sales',
        icon: ShoppingCart,
    },
    {
        label: 'Stok',
        path: '/inventory',
        icon: PackagePlus,
    },
    {
        label: 'Ürünler',
        path: '/products',
        icon: Boxes,
    },
    {
        label: 'Raporlar',
        path: '/reports',
        icon: ChartNoAxesCombined,
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
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) =>
                                `navigation-item ${isActive ? 'navigation-item-active' : ''
                                }`
                            }
                        >
                            <Icon size={20} strokeWidth={1.8} />
                            <span>{item.label}</span>
                        </NavLink>
                    )
                })}
            </nav>

            <div className="sidebar-footer">
                <NavLink
                    to="/settings"
                    className={({ isActive }) =>
                        `navigation-item ${isActive ? 'navigation-item-active' : ''
                        }`
                    }
                >
                    <Settings size={20} strokeWidth={1.8} />
                    <span>Ayarlar</span>
                </NavLink>
            </div>
        </aside>
    )
}

export default Sidebar