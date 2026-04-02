import { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import PublicCard from './pages/PublicCard'

// Admin routes are lazy-loaded — they add ~150 KB that public visitors never need
const AdminLogin = lazy(() => import('./pages/admin/Login'))
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminEditor = lazy(() => import('./pages/admin/Editor'))

function App() {
  return (
    <Router>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Navigate to="/paulline-ferreira" replace />} />

          {/* Публичная визитка */}
          <Route path="/:slug" element={<PublicCard />} />

          {/* Админ-панель (lazy) */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/card/:id" element={<AdminEditor />} />

          <Route path="*" element={<Navigate to="/paulline-ferreira" replace />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App
