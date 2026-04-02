import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

// ── Platform definitions ──────────────────────────────────
const PLATFORMS: Array<{
    id: string
    label: string
    color: string
    icon: string
    placeholder: string
}> = [
    { id: 'phone',     label: 'Phone',     color: '#2db37b', icon: '/figma/call_1062678 1@3x.png',         placeholder: '+375 29 000 00 00' },
    { id: 'whatsapp',  label: 'WhatsApp',  color: '#25D366', icon: '/figma/whatsapp_739247 1@3x.png',      placeholder: 'wa.me/375…' },
    { id: 'telegram',  label: 'Telegram',  color: '#2AABEE', icon: '/figma/telegram 1@3x.png',             placeholder: 't.me/username' },
    { id: 'instagram', label: 'Instagram', color: '#E1306C', icon: '/figma/instagram_739244 1@3x.png',     placeholder: 'instagram.com/…' },
    { id: 'viber',     label: 'Viber',     color: '#7360F2', icon: '/figma/viber_2190481 1@3x.png',        placeholder: 'viber://chat?number=…' },
    { id: 'email',     label: 'Email',     color: '#e07654', icon: '/figma/email_347722 1@3x.png',         placeholder: 'name@example.com' },
    { id: 'tiktok',    label: 'TikTok',    color: '#010101', icon: '/figma/tik-tok 1@3x.png',              placeholder: 'tiktok.com/@username' },
    { id: 'facebook',  label: 'Facebook',  color: '#1877F2', icon: '',                                     placeholder: 'facebook.com/…' },
    { id: 'linkedin',  label: 'LinkedIn',  color: '#0A66C2', icon: '',                                     placeholder: 'linkedin.com/in/…' },
    { id: 'youtube',   label: 'YouTube',   color: '#FF0000', icon: '',                                     placeholder: 'youtube.com/@…' },
    { id: 'website',   label: 'Website',   color: '#6b7280', icon: '/figma/placeholder_1180413 1@3x.png',  placeholder: 'https://example.com' },
    { id: 'location',  label: 'Location',  color: '#f59e0b', icon: '/figma/image 13@3x.png',               placeholder: 'Google Maps link or address' },
]

const getPlatform = (id: string) =>
    PLATFORMS.find((p) => p.id === id) ?? { id, label: id, color: '#444', icon: '', placeholder: '' }

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
    phone: string
    email: string
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
    | 'edit-card'
    | 'social-links'
    | 'services'
    | 'gallery'
    | 'settings'
    | 'analytics'

const SECTIONS: Array<{ id: SectionId; label: string }> = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'edit-card', label: 'Edit Card' },
    { id: 'social-links', label: 'Social Links' },
    { id: 'services', label: 'Services' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'settings', label: 'Settings' },
    { id: 'analytics', label: 'Analytics' }
]

const MOBILE_SECTION_LABELS: Record<SectionId, string> = {
    dashboard: 'Панель управления',
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

const hasProtocol = (value: string) => /^[a-z][a-z\d+.-]*:/i.test(value)

const normalizeSocialInput = (type: string, rawValue: string) => {
    const value = rawValue.trim()
    if (!value) return ''

    const kind = type.toLowerCase()
    const cleaned = value.replace(/^@/, '')
    const digits = value.replace(/[^\d+]/g, '')
    const digitsOnly = value.replace(/\D/g, '')

    if (kind === 'email') {
        if (value.startsWith('mailto:')) return value
        return /@/.test(value) ? `mailto:${value}` : value
    }

    if (kind === 'phone') {
        if (value.startsWith('tel:')) return value
        if (digits) return `tel:${digits.startsWith('+') ? digits : `+${digitsOnly}`}`
        return value
    }

    if (kind === 'whatsapp') {
        if (value.includes('wa.me/') || value.includes('whatsapp.com/') || hasProtocol(value)) return value
        if (digitsOnly) return `https://wa.me/${digitsOnly}`
        return `https://wa.me/${cleaned}`
    }

    if (kind === 'telegram') {
        if (value.includes('t.me/') || hasProtocol(value)) return value
        return `https://t.me/${cleaned}`
    }

    if (kind === 'viber') {
        if (value.startsWith('viber://') || hasProtocol(value)) return value
        if (digits) return `viber://chat?number=${digits.startsWith('+') ? digits : `+${digitsOnly}`}`
        return `viber://chat?number=${cleaned}`
    }

    if (kind === 'instagram') {
        if (value.includes('instagram.com/') || hasProtocol(value)) return value
        return `https://instagram.com/${cleaned}`
    }

    if (kind === 'tiktok') {
        if (value.includes('tiktok.com/') || hasProtocol(value)) return value
        return `https://www.tiktok.com/${cleaned.startsWith('@') ? cleaned : `@${cleaned}`}`
    }

    if (kind === 'facebook') {
        if (value.includes('facebook.com/') || hasProtocol(value)) return value
        return `https://facebook.com/${cleaned}`
    }

    if (kind === 'linkedin') {
        if (value.includes('linkedin.com/') || hasProtocol(value)) return value
        return `https://www.linkedin.com/in/${cleaned.replace(/^in\//, '')}`
    }

    if (kind === 'youtube') {
        if (value.includes('youtube.com/') || value.includes('youtu.be/') || hasProtocol(value)) return value
        if (cleaned.startsWith('UC')) return `https://www.youtube.com/channel/${cleaned}`
        return `https://www.youtube.com/@${cleaned}`
    }

    return hasProtocol(value) ? value : `https://${value}`
}

const normalizeLinksForSave = (links: LinkItem[]) => links.map((link) => ({
    ...link,
    url: normalizeSocialInput(link.type, link.url)
}))

const defaultCardDetails = (card: CardItem): CardDetails => ({
    ...card,
    company_name: '',
    phone: '',
    email: '',
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
    const [showLinkPicker, setShowLinkPicker] = useState(false)
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
            const payload: CardDetails = {
                ...cardData,
                links: normalizeLinksForSave(cardData.links)
            }
            await axios.patch(`/api/admin/card/${cardData.id}`, payload, config)
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
                <section className="admin-top-controls glass-card">
                    <div className="admin-card-picker">
                        <label htmlFor="card-picker">Выбор карточки</label>
                        <select
                            id="card-picker"
                            value={selectedCardId}
                            onChange={(e) => setSelectedCardId(e.target.value)}
                        >
                            {cards.map((card) => (
                                <option key={card.id} value={card.id}>
                                    {card.full_name} ({card.is_active ? 'Active' : 'Draft'})
                                </option>
                            ))}
                        </select>
                    </div>

                    <button type="button" className="admin-primary admin-save-top" onClick={saveCard} disabled={saving || !cardData}>
                        {saving ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                </section>

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

                {selectedSection === 'edit-card' && cardData && (
                    <section className="admin-two-col">
                        <div className="glass-card form-grid">
                            <h3>Edit Card</h3>
                            <label>Name<input value={cardData.full_name || ''} onChange={(e) => updateCard({ full_name: e.target.value })} /></label>
                            <label>Title<input value={cardData.title || ''} onChange={(e) => updateCard({ title: e.target.value })} /></label>
                            <label>Company<input value={cardData.company_name || ''} onChange={(e) => updateCard({ company_name: e.target.value })} /></label>
                            <label>Phone<input type="tel" value={cardData.phone || ''} placeholder="+375 29 000 00 00" onChange={(e) => updateCard({ phone: e.target.value })} /></label>
                            <label>Email<input type="email" value={cardData.email || ''} placeholder="name@example.com" onChange={(e) => updateCard({ email: e.target.value })} /></label>
                            <label>Bio<textarea rows={3} value={cardData.bio || ''} onChange={(e) => updateCard({ bio: e.target.value })}></textarea></label>
                            <label>Avatar URL<input value={cardData.avatar_url || ''} onChange={(e) => updateCard({ avatar_url: e.target.value })} /></label>
                            <label>Cover / Logo URL<input value={cardData.logo_url || ''} onChange={(e) => updateCard({ logo_url: e.target.value })} /></label>
                        </div>

                        <div className="glass-card live-preview">
                            <h3>Live Preview</h3>
                            <div className="preview-card">
                                <img src={cardData.avatar_url || cardData.logo_url || '/figma/home-from-pdf.webp'} alt="avatar" loading="lazy" />
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
                                onClick={() => setShowLinkPicker((v) => !v)}
                            >
                                {showLinkPicker ? '✕ Закрыть' : '+ Добавить'}
                            </button>
                        </div>

                        {/* ── Platform picker grid ── */}
                        {showLinkPicker && (
                            <div className="link-picker-grid">
                                {PLATFORMS.map((platform) => (
                                    <button
                                        key={platform.id}
                                        type="button"
                                        className="link-picker-btn"
                                        onClick={() => {
                                            updateCard({ links: [...cardData.links, { type: platform.id, url: '', is_visible: true }] })
                                            setShowLinkPicker(false)
                                        }}
                                    >
                                        <span
                                            className="link-picker-icon"
                                            style={{ background: platform.color }}
                                        >
                                            {platform.icon
                                                ? <img src={platform.icon} alt="" />
                                                : <span>{platform.label[0]}</span>
                                            }
                                        </span>
                                        <span className="link-picker-label">{platform.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* ── Link rows ── */}
                        {cardData.links.map((link, index) => {
                            const platform = getPlatform(link.type)
                            return (
                                <div
                                    key={`${link.type}-${index}`}
                                    className="link-row"
                                    draggable
                                    onDragStart={() => setDragIndex(index)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => handleDropLinks(index)}
                                >
                                    <span className="link-row-drag" title="Drag to reorder">⋮⋮</span>

                                    {/* Icon badge */}
                                    <span
                                        className="link-row-badge"
                                        style={{ background: platform.color }}
                                        title={platform.label}
                                    >
                                        {platform.icon
                                            ? <img src={platform.icon} alt={platform.label} />
                                            : <span>{platform.label[0]}</span>
                                        }
                                    </span>

                                    {/* Input */}
                                    <input
                                        className="link-row-input"
                                        value={link.url}
                                        placeholder={platform.placeholder}
                                        onChange={(e) => {
                                            const next = [...cardData.links]
                                            next[index] = { ...next[index], url: e.target.value }
                                            updateCard({ links: next })
                                        }}
                                        onBlur={(e) => {
                                            const normalized = normalizeSocialInput(link.type, e.target.value)
                                            if (normalized === e.target.value) return
                                            const next = [...cardData.links]
                                            next[index] = { ...next[index], url: normalized }
                                            updateCard({ links: next })
                                        }}
                                        aria-label={`${platform.label} URL`}
                                    />

                                    {/* Visible toggle */}
                                    <button
                                        type="button"
                                        className={`link-row-vis${link.is_visible ? ' is-on' : ''}`}
                                        title={link.is_visible ? 'Скрыть' : 'Показать'}
                                        onClick={() => {
                                            const next = [...cardData.links]
                                            next[index] = { ...next[index], is_visible: !link.is_visible }
                                            updateCard({ links: next })
                                        }}
                                    >
                                        {link.is_visible ? '👁' : '🚫'}
                                    </button>

                                    {/* Remove */}
                                    <button
                                        type="button"
                                        className="link-row-remove"
                                        title="Удалить"
                                        onClick={() => {
                                            const next = cardData.links.filter((_, i) => i !== index)
                                            updateCard({ links: next })
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            )
                        })}

                        {cardData.links.length === 0 && !showLinkPicker && (
                            <p className="link-empty">Нет ссылок. Нажмите «+ Добавить» чтобы выбрать платформу.</p>
                        )}
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
