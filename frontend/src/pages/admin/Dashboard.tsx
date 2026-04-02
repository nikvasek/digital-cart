import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { PLATFORMS, getPlatform } from '../../lib/platforms'

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
    { id: 'dashboard', label: 'Панель' },
    { id: 'edit-card', label: 'Карточка' },
    { id: 'social-links', label: 'Ссылки' },
    { id: 'services', label: 'Услуги' },
    { id: 'gallery', label: 'Галерея' },
    { id: 'settings', label: 'Настройки' },
    { id: 'analytics', label: 'Аналитика' }
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
    if (hasProtocol(value)) return value

    const kind = type.toLowerCase()
    const cleaned = value.replace(/^@/, '').replace(/^\$/, '')
    const digitsOnly = value.replace(/\D/g, '')

    // ── Contacts ──────────────────────────────────────────────
    if (kind === 'email') {
        return /@/.test(value) ? `mailto:${value}` : value
    }

    if (kind === 'phone' || kind === 'mobile' || kind === 'office' || kind === 'home') {
        if (digitsOnly) return `tel:${value.startsWith('+') ? value.replace(/\s/g, '') : `+${digitsOnly}`}`
        return value
    }

    if (kind === 'sms') {
        return `sms:${digitsOnly ? (value.startsWith('+') ? value.replace(/\s/g, '') : `+${digitsOnly}`) : cleaned}`
    }

    if (kind === 'whatsapp') {
        if (value.includes('wa.me/') || value.includes('whatsapp.com/')) return value
        if (digitsOnly) return `https://wa.me/${digitsOnly}`
        return `https://wa.me/${cleaned}`
    }

    if (kind === 'viber') {
        if (value.startsWith('viber://')) return value
        if (digitsOnly) return `viber://chat?number=${value.startsWith('+') ? value.replace(/\s/g, '') : `+${digitsOnly}`}`
        return `viber://chat?number=${cleaned}`
    }

    if (kind === 'wechat') return `weixin://dl/chat?${cleaned}`
    if (kind === 'xmpp') return `xmpp:${value}`

    if (kind === 'skype') {
        return `skype:${cleaned}?chat`
    }

    // ── Social networks ───────────────────────────────────────
    if (kind === 'instagram') {
        if (value.includes('instagram.com/')) return value
        return `https://instagram.com/${cleaned}`
    }

    if (kind === 'facebook') {
        if (value.includes('facebook.com/')) return value
        return `https://facebook.com/${cleaned}`
    }

    if (kind === 'twitter') {
        if (value.includes('twitter.com/') || value.includes('x.com/')) return value
        return `https://twitter.com/${cleaned}`
    }

    if (kind === 'linkedin') {
        if (value.includes('linkedin.com/')) return value
        return `https://www.linkedin.com/in/${cleaned.replace(/^in\//, '')}`
    }

    if (kind === 'youtube') {
        if (value.includes('youtube.com/') || value.includes('youtu.be/')) return value
        if (cleaned.startsWith('UC')) return `https://www.youtube.com/channel/${cleaned}`
        return `https://www.youtube.com/@${cleaned}`
    }

    if (kind === 'tiktok') {
        if (value.includes('tiktok.com/')) return value
        const handle = cleaned.startsWith('@') ? cleaned : `@${cleaned}`
        return `https://www.tiktok.com/${handle}`
    }

    if (kind === 'snapchat') {
        if (value.includes('snapchat.com/')) return value
        return `https://www.snapchat.com/add/${cleaned}`
    }

    if (kind === 'tumblr') {
        return `https://${cleaned}.tumblr.com/`
    }

    if (kind === 'reddit') {
        if (value.includes('reddit.com/')) return value
        return `https://reddit.com/user/${cleaned}`
    }

    if (kind === 'cashapp') {
        const handle = value.startsWith('$') ? value : `$${cleaned}`
        return `https://cash.app/${handle}`
    }

    // ── Generic: use platform href prefix ─────────────────────
    const platform = PLATFORMS.find((p) => p.id === kind)
    if (platform?.href) {
        return `${platform.href}${cleaned}${platform.hrefEnd ?? ''}`
    }

    return `https://${value}`
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
    const [filterPicker, setFilterPicker] = useState('')
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
            { label: 'Просмотры', value: analytics?.views ?? 0, accent: '#1f2937' },
            { label: 'Клики', value: analytics?.clicks ?? 0, accent: '#374151' },
            { label: 'Сохранения', value: analytics?.saves ?? 0, accent: '#4b5563' },
            { label: 'Лиды', value: analytics?.leads ?? 0, accent: '#111827' }
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
                    <p>Панель управления</p>
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

                <button type="button" className="admin-ghost danger" onClick={logout}>Выйти</button>
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
                                    {card.full_name} ({card.is_active ? 'Активна' : 'Черновик'})
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
                            <h3>Последние события</h3>
                            <ul>
                                <li><b>Карточка обновлена</b><span>2 мин назад</span></li>
                                <li><b>Новый лид</b><span>12 мин назад</span></li>
                                <li><b>Скачан QR</b><span>21 мин назад</span></li>
                                <li><b>Язык переключён</b><span>1 ч назад</span></li>
                            </ul>
                        </div>

                        <div className="glass-card quick-actions">
                            <h3>Быстрые действия</h3>
                            <div>
                                <button type="button" className="admin-ghost" onClick={() => setSelectedSection('edit-card')}>Редактировать</button>
                                <button type="button" className="admin-ghost" onClick={() => setSelectedSection('social-links')}>Ссылки</button>
                                <button type="button" className="admin-ghost" onClick={() => setSelectedSection('analytics')}>Аналитика</button>
                            </div>
                        </div>
                    </section>
                )}

                {selectedSection === 'edit-card' && cardData && (
                    <section className="admin-two-col">
                        <div className="glass-card form-grid">
                            <h3>Редактировать карточку</h3>
                            <label>Имя<input value={cardData.full_name || ''} onChange={(e) => updateCard({ full_name: e.target.value })} /></label>
                            <label>Должность<input value={cardData.title || ''} onChange={(e) => updateCard({ title: e.target.value })} /></label>
                            <label>Компания<input value={cardData.company_name || ''} onChange={(e) => updateCard({ company_name: e.target.value })} /></label>
                            <label>Телефон<input type="tel" value={cardData.phone || ''} placeholder="+375 29 000 00 00" onChange={(e) => updateCard({ phone: e.target.value })} /></label>
                            <label>Email<input type="email" value={cardData.email || ''} placeholder="name@example.com" onChange={(e) => updateCard({ email: e.target.value })} /></label>
                            <label>О себе<textarea rows={3} value={cardData.bio || ''} onChange={(e) => updateCard({ bio: e.target.value })}></textarea></label>
                            <label>Адрес / Google Maps<input value={cardData.address || ''} placeholder="Kalvariyskaya 42 или https://maps.google.com/…" onChange={(e) => updateCard({ address: e.target.value })} /></label>
                            <label>Галерея (URL)<input value={cardData.portfolio_url || ''} placeholder="https://…" onChange={(e) => updateCard({ portfolio_url: e.target.value })} /></label>
                            <label>Фото (URL)<input value={cardData.avatar_url || ''} onChange={(e) => updateCard({ avatar_url: e.target.value })} /></label>
                            <label>Обложка / Лого (URL)<input value={cardData.logo_url || ''} onChange={(e) => updateCard({ logo_url: e.target.value })} /></label>
                        </div>

                        <div className="glass-card live-preview">
                            <h3>Предпросмотр</h3>
                            <div className="preview-card">
                                <img src={cardData.avatar_url || cardData.logo_url || '/figma/home-from-pdf.webp'} alt="avatar" loading="lazy" />
                                <h4>{cardData.full_name || 'Имя'}</h4>
                                <p>{cardData.title || 'Должность'}</p>
                                <small>{cardData.bio || 'Описание будет здесь'}</small>
                            </div>
                        </div>
                    </section>
                )}

                {selectedSection === 'social-links' && cardData && (
                    <section className="glass-card section-stack">
                        <div className="section-head-row">
                            <h3>Контакты и ссылки</h3>
                        </div>

                        {/* ── Active link rows ── */}
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
                                    <span className="link-row-drag">⋮⋮</span>

                                    <span
                                        className="link-row-badge"
                                        style={{ background: platform.color }}
                                    >
                                        <span
                                            className="link-icon-mask"
                                            style={{
                                                WebkitMaskImage: `url(${platform.icon})`,
                                                maskImage: `url(${platform.icon})`,
                                                backgroundColor: platform.light ? '#222' : '#fff',
                                            } as React.CSSProperties}
                                        />
                                    </span>

                                    <div className="link-row-body">
                                        <span className="link-row-label">{platform.label}</span>
                                        <input
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
                                    </div>

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
                                        {link.is_visible ? '👁' : '🙈'}
                                    </button>

                                    <button
                                        type="button"
                                        className="link-row-remove"
                                        title="Удалить"
                                        onClick={() => updateCard({ links: cardData.links.filter((_, i) => i !== index) })}
                                    >
                                        ✕
                                    </button>
                                </div>
                            )
                        })}

                        {/* ── Platform picker — always visible ── */}
                        <div className="link-picker-wrap">
                            <input
                                className="link-picker-search"
                                type="text"
                                placeholder="Поиск платформы"
                                value={filterPicker}
                                onChange={(e) => setFilterPicker(e.target.value)}
                            />
                            {(() => {
                                const q = filterPicker.trim().toLowerCase()
                                const filtered = PLATFORMS.filter((p) =>
                                    p.label.toLowerCase().includes(q)
                                )
                                if (!filtered.length) return (
                                    <p className="link-picker-empty">Платформа не найдена</p>
                                )
                                return (
                                    <div className="link-picker-grid">
                                        {filtered.map((p) => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                className={`link-picker-btn${p.light ? ' is-light' : ''}`}
                                                style={{ background: p.color }}
                                                onClick={() => {
                                                    updateCard({ links: [...cardData.links, { type: p.id, url: '', is_visible: true }] })
                                                    setFilterPicker('')
                                                }}
                                            >
                                                <span
                                                    className="link-icon-mask"
                                                    style={{
                                                        WebkitMaskImage: `url(${p.icon})`,
                                                        maskImage: `url(${p.icon})`,
                                                        backgroundColor: p.light ? '#222' : '#fff',
                                                    } as React.CSSProperties}
                                                />
                                                <span>{p.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )
                            })()}
                        </div>
                    </section>
                )}

                {selectedSection === 'services' && cardData && (
                    <section className="glass-card section-stack">
                        <div className="section-head-row">
                            <h3>Услуги</h3>
                            <button
                                type="button"
                                className="admin-ghost"
                                onClick={() => updateCard({ services: [...cardData.services, { title: '', description: '', is_visible: true }] })}
                            >
                                Добавить услугу
                            </button>
                        </div>
                        {cardData.services.map((service, index) => (
                            <div key={index} className="service-item">
                                <input
                                    placeholder="Название"
                                    value={service.title}
                                    onChange={(e) => {
                                        const next = [...cardData.services]
                                        next[index] = { ...next[index], title: e.target.value }
                                        updateCard({ services: next })
                                    }}
                                />
                                <textarea
                                    rows={2}
                                    placeholder="Описание"
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
                            <h3>Галерея</h3>
                            <div className="view-toggle">
                                <button type="button" className={galleryView === 'grid' ? 'is-active' : ''} onClick={() => setGalleryView('grid')}>Сетка</button>
                                <button type="button" className={galleryView === 'list' ? 'is-active' : ''} onClick={() => setGalleryView('list')}>Список</button>
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
                                        <strong>{item.type || 'фото'}</strong>
                                        <small>{item.file_url.includes('video') ? 'Видео' : 'Фото'}</small>
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
                        <h3>Настройки</h3>
                        <label>Email профиля<input defaultValue="admin@example.com" /></label>
                        <label>Новый пароль<input type="password" placeholder="••••••••" /></label>
                        <label>Email уведомлений<input defaultValue="on" /></label>
                        <label>Язык интерфейса
                            <select defaultValue="en">
                                <option value="en">Английский</option>
                                <option value="ru">Русский</option>
                            </select>
                        </label>
                        <label>Тема
                            <select value={themeMode} onChange={(e) => setThemeMode(e.target.value as 'light' | 'dark')}>
                                <option value="light">Светлая</option>
                                <option value="dark">Тёмная</option>
                            </select>
                        </label>
                        <label>URL домена<input value={window.location.origin} readOnly /></label>
                    </section>
                )}

                {selectedSection === 'analytics' && (
                    <section className="glass-card section-stack">
                        <div className="section-head-row">
                            <h3>Аналитика</h3>
                            <div className="date-filters">
                                <input type="date" />
                                <input type="date" />
                                <button type="button" className="admin-ghost">Экспорт CSV</button>
                            </div>
                        </div>

                        <div className="analytics-grid">
                            <article><h4>Просмотры</h4><p>{analytics?.views ?? 0} всего</p></article>
                            <article><h4>Клики по ссылкам</h4><p>{analytics?.clicks ?? 0} всего</p></article>
                            <article><h4>География</h4><p>EU 46% · US 33% · Другие 21%</p></article>
                            <article><h4>Устройства</h4><p>Мобильные 68% · ПК 32%</p></article>
                            <article><h4>Источники</h4><p>Прямые 51% · Соцсети 27% · Поиск 22%</p></article>
                            <article><h4>Лиды</h4><p>{analytics?.leads ?? 0} лидов</p></article>
                        </div>
                    </section>
                )}
            </main>
        </div>
    )
}
