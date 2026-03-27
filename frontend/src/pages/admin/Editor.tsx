import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

interface LinkItem {
  id?: string
  type: string
  url: string
  is_visible: boolean
}

interface MediaItem {
  id?: string
  file_url: string
  type: string
}

interface ServiceItem {
  id?: string
  title: string
  description: string
  is_visible: boolean
}

interface CardData {
  id: string
  slug: string
  full_name: string
  title: string
  company_name: string
  phone: string
  email: string
  website: string
  bio: string
  avatar_url: string
  logo_url: string
  language_default: string
  is_active: boolean
  links: LinkItem[]
  media: MediaItem[]
  services: ServiceItem[]
}

const SOCIAL_TYPES = ['instagram', 'telegram', 'whatsapp', 'viber', 'tiktok', 'facebook', 'linkedin', 'youtube']

export default function Editor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [card, setCard] = useState<CardData | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCard()
  }, [id])

  const loadCard = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/admin/login')
        return
      }

      const response = await axios.get(`/api/admin/card/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setCard(response.data)
    } catch (error) {
      console.error('Failed to load card:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!card) return
    
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      await axios.patch(`/api/admin/card/${id}`, card, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      alert('Card updated successfully!')
    } catch (error) {
      alert('Failed to save card')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadQR = () => {
    window.open(`/api/admin/card/${id}/qr`, '_blank')
  }

  const addLink = () => {
    if (!card) return
    setCard({
      ...card,
      links: [...card.links, { type: 'instagram', url: '', is_visible: true }]
    })
  }

  const updateLink = (index: number, patch: Partial<LinkItem>) => {
    if (!card) return
    const next = [...card.links]
    next[index] = { ...next[index], ...patch }
    setCard({ ...card, links: next })
  }

  const removeLink = (index: number) => {
    if (!card) return
    setCard({ ...card, links: card.links.filter((_, i) => i !== index) })
  }

  const addService = () => {
    if (!card) return
    setCard({
      ...card,
      services: [...card.services, { title: '', description: '', is_visible: true }]
    })
  }

  const updateService = (index: number, patch: Partial<ServiceItem>) => {
    if (!card) return
    const next = [...card.services]
    next[index] = { ...next[index], ...patch }
    setCard({ ...card, services: next })
  }

  const removeService = (index: number) => {
    if (!card) return
    setCard({ ...card, services: card.services.filter((_, i) => i !== index) })
  }

  const addMedia = () => {
    if (!card) return
    setCard({ ...card, media: [...card.media, { file_url: '', type: 'image' }] })
  }

  const updateMedia = (index: number, patch: Partial<MediaItem>) => {
    if (!card) return
    const next = [...card.media]
    next[index] = { ...next[index], ...patch }
    setCard({ ...card, media: next })
  }

  const removeMedia = (index: number) => {
    if (!card) return
    setCard({ ...card, media: card.media.filter((_, i) => i !== index) })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!card) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Навигация */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleDownloadQR}
              className="px-4 py-2 bg-gray-200 text-black rounded-lg hover:bg-gray-300"
            >
              Download QR
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow p-6 space-y-6">
          <h2 className="text-2xl font-bold">Edit Card</h2>

          {/* Контакты и базовые данные */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={card.full_name}
                onChange={(e) => setCard({ ...card, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={card.title}
                onChange={(e) => setCard({ ...card, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company
              </label>
              <input
                type="text"
                value={card.company_name}
                onChange={(e) => setCard({ ...card, company_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slug
              </label>
              <input
                type="text"
                value={card.slug}
                onChange={(e) => setCard({ ...card, slug: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={card.phone}
                onChange={(e) => setCard({ ...card, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={card.email}
                onChange={(e) => setCard({ ...card, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <input
                type="url"
                value={card.website}
                onChange={(e) => setCard({ ...card, website: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                value={card.bio}
                onChange={(e) => setCard({ ...card, bio: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Avatar URL
              </label>
              <input
                type="url"
                value={card.avatar_url}
                onChange={(e) => setCard({ ...card, avatar_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                value={card.language_default}
                onChange={(e) => setCard({ ...card, language_default: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="ru">Russian</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={card.is_active}
                  onChange={(e) => setCard({ ...card, is_active: e.target.checked })}
                />
                <span className="text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>
          </div>

          {/* Соцсети */}
          <div className="pt-6 border-t space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Social links</h3>
              <button
                onClick={addLink}
                className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                + Add link
              </button>
            </div>

            {card.links.length === 0 && (
              <p className="text-sm text-gray-500">No social links yet</p>
            )}

            {card.links.map((link, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3 border rounded-lg">
                <div className="md:col-span-3">
                  <select
                    value={link.type}
                    onChange={(e) => updateLink(index, { type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {SOCIAL_TYPES.map((social) => (
                      <option key={social} value={social}>{social}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-7">
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => updateLink(index, { url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="md:col-span-1 flex justify-center">
                  <input
                    type="checkbox"
                    checked={link.is_visible}
                    onChange={(e) => updateLink(index, { is_visible: e.target.checked })}
                  />
                </div>
                <div className="md:col-span-1 flex justify-end">
                  <button
                    onClick={() => removeLink(index)}
                    className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Услуги */}
          <div className="pt-6 border-t space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Services</h3>
              <button
                onClick={addService}
                className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                + Add service
              </button>
            </div>

            {card.services.length === 0 && (
              <p className="text-sm text-gray-500">No services yet</p>
            )}

            {card.services.map((service, index) => (
              <div key={index} className="space-y-3 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-600">Service #{index + 1}</p>
                  <button
                    onClick={() => removeService(index)}
                    className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    Remove
                  </button>
                </div>

                <input
                  type="text"
                  value={service.title}
                  onChange={(e) => updateService(index, { title: e.target.value })}
                  placeholder="Service title"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />

                <textarea
                  value={service.description}
                  onChange={(e) => updateService(index, { description: e.target.value })}
                  rows={2}
                  placeholder="Description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />

                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={service.is_visible}
                    onChange={(e) => updateService(index, { is_visible: e.target.checked })}
                  />
                  Visible
                </label>
              </div>
            ))}
          </div>

          {/* Галерея */}
          <div className="pt-6 border-t space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Gallery</h3>
              <button
                onClick={addMedia}
                className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                + Add image
              </button>
            </div>

            {card.media.length === 0 && (
              <p className="text-sm text-gray-500">No gallery images yet</p>
            )}

            {card.media.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3 border rounded-lg">
                <div className="md:col-span-10">
                  <input
                    type="text"
                    value={item.file_url}
                    onChange={(e) => updateMedia(index, { file_url: e.target.value })}
                    placeholder="Image URL"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div className="md:col-span-1">
                  <select
                    value={item.type}
                    onChange={(e) => updateMedia(index, { type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="image">image</option>
                    <option value="video">video</option>
                  </select>
                </div>
                <div className="md:col-span-1 flex justify-end">
                  <button
                    onClick={() => removeMedia(index)}
                    className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Предпросмотр */}
          <div className="pt-6 border-t">
            <h3 className="font-semibold mb-2">Public URL:</h3>
            <a
              href={`/${card.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {window.location.origin}/{card.slug}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
