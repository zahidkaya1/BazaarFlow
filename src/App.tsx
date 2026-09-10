import { Route, Routes } from 'react-router-dom'
import MobileBottomNav from './components/layout/MobileBottomNav'
import Sidebar from './components/layout/Sidebar'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import MobileMorePage from './pages/MobileMorePage'
import ProductsPage from './pages/ProductsPage'
import QuickSalePage from './pages/QuickSalePage'
import ReportsPage from './pages/ReportsPage'
import SalesPage from './pages/SalesPage'
import SettingsPage from './pages/SettingsPage'

function App() {
  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/quick-sale" element={<QuickSalePage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/more" element={<MobileMorePage />} />
        </Routes>
      </main>

      <MobileBottomNav />
    </div>
  )
}

export default App
