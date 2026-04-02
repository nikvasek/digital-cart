import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

interface Analytics {
  views: number
  clicks: number
  saves: number
  leads: number
}

interface CardItem {
  id: string
  slug: string
  full_name: string
  title: string
  is_active: boolean
}

interface LinkItem {
  id?: string
  type: string
  url: string
  is_visible: boolean
}

interface ServiceItem {
  id?: string
  title: string
  description: string
  is_visible: boolean
}

interface MediaItem {
  id?: string
  file_url: string
  type: string
}

interface CardDetails extends CardItem {
  company_name: string
  bio: string
  avatar_url: string
  logo_url: string
  language_default: string
  address: string
  website: string
  portfolio_url: string
  links: LinkItem[]
  services: ServiceItem[]
  media: MediaItem[]
}

type SectionId =
  | 'dashboard'
  | 'my-cards'
  | 'edit-card'
  | 'social-links'
  | 'services'
  | 'gallery'
  | 'settings'
  | 'analytics'

const SECTIONS: Array<{ id: SectionId; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'my-cards', label: 'My Cards' },
  { id: 'edit-card', label: 'Edit Card' },
  { id: 'social-links', label: 'Social Links' },
  { id: 'services', label: 'Services' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'settings', label: 'Settings' },
  { id: 'analytics', label: 'Analytics' }
]

const MOBILE_SECTION_LABELS: Record<SectionId, string> = {
  dashboard: 'Панель управления',
  'my-cards': 'Мои карточки',
  'edit-card': 'Редактировать карточку',
  'social-links': 'Социальные ссылки',
  services: 'Сервисы',
  gallery: 'Галерея',
  settings: 'Настройки',
  analytics: 'Аналитика'
}

const sparkline = [12, 18, 16, 24, 30, 27, 35]

const reorder = <T,>(items: T[], from: number, to: number) => {
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

const defaultCardDetails = (card: CardItem): CardDetails => ({
  ...card,
  company_name: '',
  bio: '',
  avatar_url: '',
  logo_url: '',
  language_default: 'en',
  address: '',
  website: '',
  portfolio_url: '',
  links: [],
  services: [],
  media: []
})

export default function Dashboard() {
  const navigate = useNavigate()
  const mobileNavRefs = useRef<Partial<Record<SectionId, HTMLButtonElement | null>>>({})
  const [cards, setCards] = useState<CardItem[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string>('')
  const [selectedSection, setSelectedSection] = useState<SectionId>('dashboard')
  const [cardData, setCardData] = useState<CardDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [galleryView, setGalleryView] = useState<'grid' | 'list'>('grid')
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (!selectedCardId) return
    void loadCardDetails(selectedCardId)
  }, [selectedCardId])

  useEffect(() => {
    const el = mobileNavRefs.current[selectedSection]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [selectedSection])

  const selectedCard = useMemo(() => cards.find((card) => card.id === selectedCardId), [cards, selectedCardId])

  const dashboardStats = useMemo(() => {
    return [
      { label: 'Views', value: analytics?.views ?? 0, accent: '#1f2937' },
      { label: 'Clicks', value: analytics?.clicks ?? 0, accent: '#374151' },
      { label: 'Saves', value: analytics?.saves ?? 0, accent: '#4b5563' },
      { label: 'Leads', value: analytics?.leads ?? 0, accent: '#111827' }
    ]
  }, [analytics])

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        navigate('/admin/login')
        return
      }

      const config = { headers: { Authorization: `Bearer ${token}` } }
      const [cardsResponse, analyticsResponse] = await Promise.all([
        axios.get('/api/admin/cards', config),
        axios.get('/api/admin/analytics', config)
      ])

      const nextCards: CardItem[] = cardsResponse.data
      setCards(nextCards)
      setAnalytics(analyticsResponse.data)

      if (nextCards.length > 0) {
        setSelectedCardId(nextCards[0].id)
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        navigate('/admin/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadCardDetails = async (cardId: string) => {
    try {
      const token = localStorage.getItem('token')
      const config = { headers: { Authorization: `Bearer ${token}` } }
      const response = await axios.get(`/api/admin/card/${cardId}`, config)
      setCardData(response.data)
    } catch {
      const fallback = cards.find((card) => card.id === cardId)
      if (fallback) setCardData(defaultCardDetails(fallback))
    }
  }

  const saveCard = async () => {
    if (!cardData) return

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const config = { headers: { Authorization: `Bearer ${token}` } }
      await axios.patch(`/api/admin/card/${cardData.id}`, cardData, config)
      await loadData()
      alert('Card saved')
    } catch {
      alert('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const updateCard = (patch: Partial<CardDetails>) => {
    if (!cardData) return
    setCardData({ ...cardData, ...patch })
  }

  const handleDropLinks = (toIndex: number) => {
    if (dragIndex === null || !cardData) return
    setCardData({ ...cardData, links: reorder(cardData.links, dragIndex, toIndex) })
    setDragIndex(null)
  }

  const handleDropMedia = (toIndex: number) => {
    if (dragIndex === null || !cardData) return
    setCardData({ ...cardData, media: reorder(cardData.media, dragIndex, toIndex) })
    setDragIndex(null)
  }

  const logout = () => {
    localStorage.removeItem('token')
    navigate('/admin/login')
  }

  if (loading) {
    return (
      <div className="admin-shell flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className={`admin-shell ${themeMode === 'dark' ? 'admin-shell-dark' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-head">
          <h1>Apple Admin</h1>
          <p>Control center</p>
        </div>

        <div className="admin-card-switcher">
          <p className="admin-sidebar-label">My Cards</p>
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => setSelectedCardId(card.id)}
              className={`admin-card-chip ${card.id === selectedCardId ? 'is-active' : ''}`}
            >
              <span>
                <strong>{card.full_name}</strong>
                <small>/{card.slug}</small>
              </span>
              <em>{card.is_active ? 'Active' : 'Draft'}</em>
            </button>
          ))}
        </div>

        <nav className="admin-nav">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setSelectedSection(section.id)}
              className={`admin-nav-item ${selectedSection === section.id ? 'is-active' : ''}`}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <button type="button" className="admin-ghost danger" onClick={logout}>Logout</button>
      </aside>

      <main className="admin-main">
        <header className="admin-header glass-card">
          <div>
            <h2>{SECTIONS.find((section) => section.id === selectedSection)?.label}</h2>
            <p>{selectedCard ? `${selectedCard.full_name} · /${selectedCard.slug}` : 'No selected card'}</p>
          </div>
          <button type="button" className="admin-primary" onClick={saveCard} disabled={saving || !cardData}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </header>

        <div className="admin-mobile-nav-wrap" aria-label="Навигация по разделам">
          <nav className="admin-mobile-nav" role="tablist" aria-orientation="horizontal">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                ref={(node) => {
                  mobileNavRefs.current[section.id] = node
                }}
                type="button"
                role="tab"
                aria-selected={selectedSection === section.id}
                onClick={() => setSelectedSection(section.id)}
                className={`admin-mobile-nav-item ${selectedSection === section.id ? 'is-active' : ''}`}
              >
                {MOBILE_SECTION_LABELS[section.id]}
              </button>
            ))}
          </nav>
        </div>

        {selectedSection === 'dashboard' && (
          <section className="admin-grid">
            <div className="glass-card stat-grid">
              {dashboardStats.map((item) => (
                <article key={item.label} className="stat-card" style={{ ['--accent' as any]: item.accent }}>
                  <p>{item.label}</p>
                  <h3>{item.value}</h3>
                  <span className="sparkline" aria-hidden="true">
                    {sparkline.map((point, index) => (
                      <i key={index} style={{ height: `${point}%` }}></i>
                    ))}
                  </span>
                </article>
              ))}
            </div>

            <div className="glass-card activity-feed">
              <h3>Recent Activity</h3>
              <ul>
                <li><b>Card updated</b><span>2 min ago</span></li>
                <li><b>New lead received</b><span>12 min ago</span></li>
                <li><b>QR download</b><span>21 min ago</span></li>
                <li><b>Language switched</b><span>1 h ago</span></li>
              </ul>
            </div>

            <div className="glass-card quick-actions">
              <h3>Quick Actions</h3>
              <div>
                <button type="button" className="admin-ghost" onClick={() => setSelectedSection('edit-card')}>Edit Card</button>
                <button type="button" className="admin-ghost" onClick={() => setSelectedSection('social-links')}>Manage Links</button>
                <button type="button" className="admin-ghost" onClick={() => setSelectedSection('analytics')}>Open Analytics</button>
              </div>
            </div>
          </section>
        )}

        {selectedSection === 'my-cards' && (
          <section className="glass-card section-stack">
            <h3>Card Profiles</h3>
            <p>Switch between profiles from sidebar. Active card details are shown below.</p>
            {selectedCard && (
              <div className="card-summary">
                <h4>{selectedCard.full_name}</h4>
                <p>{selectedCard.title}</p>
                <code>/{selectedCard.slug}</code>
              </div>
            )}
          </section>
        )}

        {selectedSection === 'edit-card' && cardData && (
          <section className="admin-two-col">
            <div className="glass-card form-grid">
              <h3>Edit Card</h3>
              <label>Name<input value={cardData.full_name || ''} onChange={(e) => updateCard({ full_name: e.target.value })} /></label>
              <label>Title<input value={cardData.title || ''} onChange={(e) => updateCard({ title: e.target.value })} /></label>
              <label>Company<input value={cardData.company_name || ''} onChange={(e) => updateCard({ company_name: e.target.value })} /></label>
              <label>Bio<textarea rows={3} value={cardData.bio || ''} onChange={(e) => updateCard({ bio: e.target.value })}></textarea></label>
              <label>Avatar URL<input value={cardData.avatar_url || ''} onChange={(e) => updateCard({ avatar_url: e.target.value })} /></label>
              <label>Cover / Logo URL<input value={cardData.logo_url || ''} onChange={(e) => updateCard({ logo_url: e.target.value })} /></label>
            </div>

            <div className="glass-card live-preview">
              <h3>Live Preview</h3>
              <div className="preview-card">
                <img src={cardData.avatar_url || cardData.logo_url || '/figma/home-from-pdf.png'} alt="avatar" loading="lazy" />
                <h4>{cardData.full_name || 'Name'}</h4>
                <p>{cardData.title || 'Title'}</p>
                <small>{cardData.bio || 'Bio preview appears here'}</small>
              </div>
            </div>
          </section>
        )}

        {selectedSection === 'social-links' && cardData && (
          <section className="glass-card section-stack">
            <div className="section-head-row">
              <h3>Social Links</h3>
              <button
                type="button"
                className="admin-ghost"
                onClick={() => updateCard({ links: [...cardData.links, { type: 'instagram', url: '', is_visible: true }] })}
              >
                Add Link
              </button>
            </div>
            {cardData.links.map((link, index) => (
              <div
                key={`${link.type}-${index}`}
                className="sortable-item"
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDropLinks(index)}
              >
                <span className="drag-mark">⋮⋮</span>
                <input
                  value={link.type}
                  onChange={(e) => {
                    const next = [...cardData.links]
                    next[index] = { ...next[index], type: e.target.value }
                    updateCard({ links: next })
                  }}
                />
                <input
                  value={link.url}
                  onChange={(e) => {
                    const next = [...cardData.links]
                    next[index] = { ...next[index], url: e.target.value }
                    updateCard({ links: next })
                  }}
                />
                <label className="toggle-wrap">
                  <input
                    type="checkbox"
                    checked={link.is_visible}
                    onChange={(e) => {
                      const next = [...cardData.links]
                      next[index] = { ...next[index], is_visible: e.target.checked }
                      updateCard({ links: next })
                    }}
                  />
                  Visible
                </label>
              </div>
            ))}
          </section>
        )}

        {selectedSection === 'services' && cardData && (
          <section className="glass-card section-stack">
            <div className="section-head-row">
              <h3>Services</h3>
              <button
                type="button"
                className="admin-ghost"
                onClick={() => updateCard({ services: [...cardData.services, { title: '', description: '', is_visible: true }] })}
              >
                Add Service
              </button>
            </div>
            {cardData.services.map((service, index) => (
              <div key={index} className="service-item">
                <input
                  placeholder="Service title"
                  value={service.title}
                  onChange={(e) => {
                    const next = [...cardData.services]
                    next[index] = { ...next[index], title: e.target.value }
                    updateCard({ services: next })
                  }}
                />
                <textarea
                  rows={2}
                  placeholder="Description"
                  value={service.description}
                  onChange={(e) => {
                    const next = [...cardData.services]
                    next[index] = { ...next[index], description: e.target.value }
                    updateCard({ services: next })
                  }}
                ></textarea>
              </div>
            ))}
          </section>
        )}

        {selectedSection === 'gallery' && cardData && (
          <section className="glass-card section-stack">
            <div className="section-head-row">
              <h3>Gallery</h3>
              <div className="view-toggle">
                <button type="button" className={galleryView === 'grid' ? 'is-active' : ''} onClick={() => setGalleryView('grid')}>Grid</button>
                <button type="button" className={galleryView === 'list' ? 'is-active' : ''} onClick={() => setGalleryView('list')}>List</button>
              </div>
            </div>

            <div className={galleryView === 'grid' ? 'media-grid' : 'media-list'}>
              {cardData.media.map((item, index) => (
                <article
                  key={`${item.file_url}-${index}`}
                  className="media-item"
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDropMedia(index)}
                >
                  <img src={item.file_url} alt="media" loading="lazy" onClick={() => setPreviewUrl(item.file_url)} />
                  <div>
                    <strong>{item.type || 'image'}</strong>
                    <small>{item.file_url.includes('video') ? 'Video album' : 'Default album'}</small>
                  </div>
                </article>
              ))}
            </div>

            {previewUrl && (
              <div className="lightbox" onClick={() => setPreviewUrl('')}>
                <img src={previewUrl} alt="preview" />
              </div>
            )}
          </section>
        )}

        {selectedSection === 'settings' && (
          <section className="glass-card section-stack form-grid">
            <h3>Settings</h3>
            <label>Profile Email<input defaultValue="admin@example.com" /></label>
            <label>New Password<input type="password" placeholder="••••••••" /></label>
            <label>Notification Email<input defaultValue="on" /></label>
            <label>Language
              <select defaultValue="en">
                <option value="en">English</option>
                <option value="ru">Russian</option>
              </select>
            </label>
            <label>Theme
              <select value={themeMode} onChange={(e) => setThemeMode(e.target.value as 'light' | 'dark')}>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label>Domain URL<input value={window.location.origin} readOnly /></label>
          </section>
        )}

        {selectedSection === 'analytics' && (
          <section className="glass-card section-stack">
            <div className="section-head-row">
              <h3>Analytics</h3>
              <div className="date-filters">
                <input type="date" />
                <input type="date" />
                <button type="button" className="admin-ghost">Export CSV</button>
              </div>
            </div>

            <div className="analytics-grid">
              <article><h4>Visitor Trend</h4><p>{analytics?.views ?? 0} total views</p></article>
              <article><h4>Link Clicks</h4><p>{analytics?.clicks ?? 0} total clicks</p></article>
              <article><h4>Geo Split</h4><p>EU 46% · US 33% · Other 21%</p></article>
              <article><h4>Devices</h4><p>Mobile 68% · Desktop 32%</p></article>
              <article><h4>Traffic Sources</h4><p>Direct 51% · Social 27% · Search 22%</p></article>
              <article><h4>Leads</h4><p>{analytics?.leads ?? 0} captured leads</p></article>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
