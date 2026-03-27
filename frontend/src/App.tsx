import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import PublicCard from './pages/PublicCard'
import AdminLogin from './pages/admin/Login'
import AdminDashboard from './pages/admin/Dashboard'
import AdminEditor from './pages/admin/Editor'
import NotFound from './pages/NotFound'

function App() {
  return (
    <Router>
      <Routes>
        {/* Публичная визитка */}
        <Route path="/:slug" element={<PublicCard />} />
        
        {/* Админ-панель */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/card/:id" element={<AdminEditor />} />
        
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  )
}

export default App
