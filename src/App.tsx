import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import MobileBottomNav from './components/layout/MobileBottomNav'
import Sidebar from './components/layout/Sidebar'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const QuickSalePage = lazy(() => import('./pages/QuickSalePage'))
const SalesPage = lazy(() => import('./pages/SalesPage'))
const InventoryPage = lazy(() => import('./pages/InventoryPage'))
const ProductsPage = lazy(() => import('./pages/ProductsPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const MobileMorePage = lazy(() => import('./pages/MobileMorePage'))

function RouteFallback() {
  return (
    <div className="dashboard">
      <div className="empty-state empty-state-compact" role="status">
        <strong>Yükleniyor...</strong>
      </div>
    </div>
  )
}

function App() {
  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Suspense fallback={<RouteFallback />}>
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
        </Suspense>
      </main>

      <MobileBottomNav />
    </div>
  )
}

export default App
