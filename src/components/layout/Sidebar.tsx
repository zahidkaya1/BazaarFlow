import {
    Boxes,
    ChartNoAxesCombined,
    LayoutDashboard,
    ListPlus,
    ReceiptText,
    Settings,
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
        label: 'Toplu Satış',
        path: '/bulk-sale',
        icon: ListPlus,
    },
    {
        label: 'Satış Geçmişi',
        path: '/sales-history',
        icon: ReceiptText,
    },
    {
        label: 'Ürünler & Stok',
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
                    <img
                        src="/brand/bazaarflow-app-icon.png"
                        alt=""
                        width={42}
                        height={42}
                        draggable={false}
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'block',
                            objectFit: 'cover',
                            borderRadius: 'inherit',
                        }}
                    />
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
                            <span className="navigation-icon" aria-hidden="true">
                                <Icon size={19} strokeWidth={1.9} />
                            </span>
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
                    <span className="navigation-icon" aria-hidden="true">
                        <Settings size={19} strokeWidth={1.9} />
                    </span>
                    <span>Ayarlar</span>
                </NavLink>
            </div>
        </aside>
    )
}

export default Sidebar
