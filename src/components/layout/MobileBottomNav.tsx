import {
    Boxes,
    Ellipsis,
    PackagePlus,
    Zap,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

const mobileNavigationItems = [
    { label: 'Satış', path: '/quick-sale', icon: Zap },
    { label: 'Stok', path: '/inventory', icon: PackagePlus },
    { label: 'Ürünler', path: '/products', icon: Boxes },
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
                        <Icon size={22} strokeWidth={1.9} />
                        <span>{item.label}</span>
                    </NavLink>
                )
            })}
        </nav>
    )
}

export default MobileBottomNav
