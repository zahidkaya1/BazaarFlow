import ProductsPage from './pages/ProductsPage'
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

          <Route
            path="/sales"
            element={
              <PlaceholderPage
                title="Satış"
                description="Yeni satışları kaydedin ve geçmiş satışları yönetin."
              />
            }
          />

          <Route
            path="/inventory"
            element={
              <PlaceholderPage
                title="Stok"
                description="Stok girişlerini, partileri ve mevcut stok durumunu yönetin."
              />
            }
          />

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