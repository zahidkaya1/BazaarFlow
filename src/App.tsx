import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import MobileBottomNav from './components/layout/MobileBottomNav'
import Sidebar from './components/layout/Sidebar'
import PageLoading from './components/ui/PageLoading'
import PlatformStyleController from './components/platform/PlatformStyleController'
import RecoveryScheduler from './components/recovery/RecoveryScheduler'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const QuickSalePage = lazy(() => import('./pages/QuickSalePage'))
const BulkSalePage = lazy(() => import('./pages/BulkSalePage'))
const SalesHistoryPage = lazy(() => import('./pages/SalesHistoryPage'))
const ProductsInventoryPage = lazy(() => import('./pages/ProductsInventoryPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const RecoveryPage = lazy(() => import('./pages/RecoveryPage'))
const BackupsPage = lazy(() => import('./pages/BackupsPage'))
const MobileMorePage = lazy(() => import('./pages/MobileMorePage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function App() {
  return (
    <div className="app-layout">
      <PlatformStyleController />
      <RecoveryScheduler />
      <Sidebar />

      <main className="main-content">
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/quick-sale" element={<QuickSalePage />} />
            <Route path="/bulk-sale" element={<BulkSalePage />} />
            <Route path="/sales-history" element={<SalesHistoryPage />} />
            <Route path="/sales" element={<Navigate replace to="/sales-history" />} />
            <Route path="/products" element={<ProductsInventoryPage />} />
            <Route path="/inventory" element={<Navigate replace to="/products" />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/data" element={<RecoveryPage />} />
            <Route path="/data/backups" element={<BackupsPage />} />
            <Route path="/recovery" element={<Navigate replace to="/data" />} />
            <Route path="/more" element={<MobileMorePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>

      <MobileBottomNav />
    </div>
  )
}

export default App
