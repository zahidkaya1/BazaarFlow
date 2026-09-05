import ProductsPage from './pages/ProductsPage'
import InventoryPage from './pages/InventoryPage'
import SalesPage from './pages/SalesPage'
import { Route, Routes } from 'react-router-dom'
import PlaceholderPage from './components/common/PlaceholderPage'
import Sidebar from './components/layout/Sidebar'
import DashboardPage from './pages/DashboardPage'

function App() {
  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />

          <Route path="/sales" element={<SalesPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/products" element={<ProductsPage />} />

          <Route
            path="/reports"
            element={
              <PlaceholderPage
                title="Raporlar"
                description="Satış, ciro, maliyet ve kârlılık raporlarını inceleyin."
              />
            }
          />

          <Route
            path="/settings"
            element={
              <PlaceholderPage
                title="Ayarlar"
                description="BazaarFlow uygulama tercihlerini yönetin."
              />
            }
          />
        </Routes>
      </main>
    </div>
  )
}

export default App