import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'

interface Analytics {
  views: number
  clicks: number
  saves: number
  leads: number
}

interface Card {
  id: string
  slug: string
  full_name: string
  title: string
  is_active: boolean
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [cards, setCards] = useState<Card[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/admin/login')
        return
      }

      const config = {
        headers: { Authorization: `Bearer ${token}` }
      }

      const [cardsResponse, analyticsResponse] = await Promise.all([
        axios.get('/api/admin/cards', config),
        axios.get('/api/admin/analytics', config)
      ])

      setCards(cardsResponse.data)
      setAnalytics(analyticsResponse.data)
    } catch (error) {
      console.error('Failed to load data:', error)
      navigate('/admin/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Навигация */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Аналитика */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-sm text-gray-600 mb-1">{t('views')}</p>
              <p className="text-3xl font-bold">{analytics.views}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-sm text-gray-600 mb-1">{t('clicks')}</p>
              <p className="text-3xl font-bold">{analytics.clicks}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-sm text-gray-600 mb-1">{t('saves')}</p>
              <p className="text-3xl font-bold">{analytics.saves}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-sm text-gray-600 mb-1">{t('leads')}</p>
              <p className="text-3xl font-bold">{analytics.leads}</p>
            </div>
          </div>
        )}

        {/* Список визиток */}
        <div className="bg-white rounded-xl shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold">My Cards</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {cards.map((card) => (
              <div
                key={card.id}
                className="p-6 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                onClick={() => navigate(`/admin/card/${card.id}`)}
              >
                <div>
                  <h3 className="font-semibold text-lg">{card.full_name}</h3>
                  <p className="text-gray-600">{card.title}</p>
                  <p className="text-sm text-gray-500 mt-1">/{card.slug}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      card.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {card.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
