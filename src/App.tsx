import Sidebar from './components/layout/Sidebar'
import DashboardPage from './pages/DashboardPage'

function App() {
  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <DashboardPage />
      </main>
    </div>
  )
}

export default App