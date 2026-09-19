import {
    Boxes,
    Ellipsis,
    History,
    Zap,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

const mobileNavigationItems = [
    { label: 'Satış', path: '/quick-sale', icon: Zap },
    { label: 'Ürün & Stok', path: '/products', icon: Boxes },
    { label: 'Geçmiş', path: '/history', icon: History },
    { label: 'Daha Fazla', path: '/more', icon: Ellipsis },
]

function MobileBottomNav() {
    return (
        <nav className="mobile-bottom-nav" aria-label="Mobil menü">
            {mobileNavigationItems.map((item) => {
                const Icon = item.icon

                return (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `mobile-bottom-nav-item ${isActive
                                ? 'mobile-bottom-nav-item-active'
                                : ''
                            }`
                        }
                    >
                        <span className="mobile-bottom-nav-icon" aria-hidden="true">
                            <Icon size={21} strokeWidth={1.9} />
                        </span>
                        <span className="mobile-bottom-nav-label">{item.label}</span>
                    </NavLink>
                )
            })}
        </nav>
    )
}

export default MobileBottomNav
