import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import PublicCard from './pages/PublicCard'
import AdminLogin from './pages/admin/Login'
import AdminDashboard from './pages/admin/Dashboard'
import AdminEditor from './pages/admin/Editor'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/paulline-ferreira" replace />} />

        {/* Публичная визитка */}
        <Route path="/:slug" element={<PublicCard />} />
        
        {/* Админ-панель */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/card/:id" element={<AdminEditor />} />
        
        <Route path="*" element={<Navigate to="/paulline-ferreira" replace />} />
      </Routes>
    </Router>
  )
}

export default App
