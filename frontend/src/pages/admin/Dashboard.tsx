import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import Cropper, { type Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps'
import { scaleQuantize } from 'd3-scale'

// ── Platform definitions ──────────────────────────────────
const PLATFORMS: Array<{
    id: string
    label: string
    color: string
    icon: string
    placeholder: string
    href?: string
    hrefEnd?: string
    light?: boolean
    category: 'contact' | 'social'
}> = [
        // ── Contacts ────────────────────────────────────────────
        { id: 'phone', label: 'Mobile', category: 'contact', color: '#16a34a', icon: '/icons/call.svg', placeholder: '+XX XXXXX XXXXX', href: 'tel:' },
        { id: 'office', label: 'Office', category: 'contact', color: '#15803d', icon: '/icons/call.svg', placeholder: '+XX XXXXX XXXXX', href: 'tel:' },
        { id: 'home', label: 'Home', category: 'contact', color: '#22c55e', icon: '/icons/call.svg', placeholder: '+XX XXXXX XXXXX', href: 'tel:' },
        { id: 'sms', label: 'SMS', category: 'contact', color: '#0ea5e9', icon: '/icons/sms.svg', placeholder: '+XX XXXXX XXXXX', href: 'sms:' },
        { id: 'email', label: 'Email', category: 'contact', color: '#ea4335', icon: '/icons/email.svg', placeholder: 'info@example.com', href: 'mailto:' },
        { id: 'website', label: 'Website', category: 'contact', color: '#7c3aed', icon: '/icons/website.svg', placeholder: 'https://example.com' },
        { id: 'store', label: 'Store', category: 'contact', color: '#d97706', icon: '/icons/store.svg', placeholder: 'https://example.com/store' },
        { id: 'location', label: 'Location', category: 'contact', color: '#ef4444', icon: '/icons/location.svg', placeholder: 'https://osm.org/go/location' },
        { id: 'whatsapp', label: 'WhatsApp', category: 'contact', color: '#25d366', icon: '/icons/whatsapp.svg', placeholder: 'https://wa.me/profileID' },
        { id: 'telegram', label: 'Telegram', category: 'contact', color: '#2aabee', icon: '/icons/telegram.svg', placeholder: 'username', href: 'https://t.me/' },
        { id: 'signal', label: 'Signal', category: 'contact', color: '#3a76f0', icon: '/icons/signal.svg', placeholder: '+XXXXXXXXXXXX', href: 'https://signal.me/#p/' },
        { id: 'matrix', label: 'Matrix', category: 'contact', color: '#111827', icon: '/icons/matrix.svg', placeholder: '@username:matrix.org', href: 'https://matrix.to/#/' },
        { id: 'viber', label: 'Viber', category: 'contact', color: '#7360f2', icon: '/icons/viber.svg', placeholder: 'XX XXXXX XXXXX' },
        { id: 'messenger', label: 'Messenger', category: 'contact', color: '#0084ff', icon: '/icons/messenger.svg', placeholder: 'username', href: 'https://m.me/' },
        { id: 'skype', label: 'Skype', category: 'contact', color: '#00aff0', icon: '/icons/skype.svg', placeholder: 'username' },
        { id: 'line', label: 'Line', category: 'contact', color: '#06c755', icon: '/icons/line.svg', placeholder: 'LINE ID', href: 'https://line.me/ti/p/' },
        { id: 'wechat', label: 'WeChat', category: 'contact', color: '#07c160', icon: '/icons/wechat.svg', placeholder: 'WeChat ID' },
        { id: 'xmpp', label: 'XMPP', category: 'contact', color: '#0ea5a4', icon: '/icons/xmpp.svg', placeholder: 'XMPP ID', href: 'xmpp:' },
        { id: 'calendar', label: 'Calendar', category: 'contact', color: '#6366f1', icon: '/icons/calendar.svg', placeholder: 'https://example.com/calendarID' },
        // ── Social networks ──────────────────────────────────────
        { id: 'instagram', label: 'Instagram', category: 'social', color: '#ffffff', icon: '/icons/instagram.svg', placeholder: 'username', href: 'https://instagram.com/', light: true },
        { id: 'threads', label: 'Threads', category: 'social', color: '#000000', icon: '/icons/threads.svg', placeholder: '@username', href: 'https://www.threads.net/' },
        { id: 'pixelfed', label: 'Pixelfed', category: 'social', color: '#8d59a8', icon: '/icons/pixelfed.svg', placeholder: 'https://pixelfed.social/username' },
        { id: 'facebook', label: 'Facebook', category: 'social', color: '#1877f2', icon: '/icons/facebook.svg', placeholder: 'username or pagename', href: 'https://facebook.com/' },
        { id: 'diaspora', label: 'Diaspora', category: 'social', color: '#000000', icon: '/icons/diaspora.svg', placeholder: 'https://diaspora.social/username' },
        { id: 'friendica', label: 'Friendica', category: 'social', color: '#1d6e9a', icon: '/icons/friendica.svg', placeholder: 'https://friendica.social/username' },
        { id: 'twitter', label: 'Twitter', category: 'social', color: '#1da1f2', icon: '/icons/twitter.svg', placeholder: 'username', href: 'https://twitter.com/' },
        { id: 'mastodon', label: 'Mastodon', category: 'social', color: '#2b90d9', icon: '/icons/mastodon.svg', placeholder: 'https://mastodon.social/@username' },
        { id: 'linkedin', label: 'LinkedIn', category: 'social', color: '#0077b5', icon: '/icons/linkedin.svg', placeholder: 'in/username or company/companyname' },
        { id: 'youtube', label: 'YouTube', category: 'social', color: '#ff0000', icon: '/icons/youtube.svg', placeholder: 'channel name or ID', href: 'https://youtube.com/' },
        { id: 'vimeo', label: 'Vimeo', category: 'social', color: '#1ab7ea', icon: '/icons/vimeo.svg', placeholder: 'channelname', href: 'https://vimeo.com/' },
        { id: 'peertube', label: 'Peertube', category: 'social', color: '#f1680d', icon: '/icons/peertube.svg', placeholder: 'https://peertube.video/channelname' },
        { id: 'pinterest', label: 'Pinterest', category: 'social', color: '#bd081c', icon: '/icons/pinterest.svg', placeholder: 'username', href: 'https://pinterest.com/' },
        { id: 'behance', label: 'Behance', category: 'social', color: '#1769ff', icon: '/icons/behance.svg', placeholder: 'username', href: 'https://behance.net/' },
        { id: 'dribbble', label: 'Dribbble', category: 'social', color: '#ea4c89', icon: '/icons/dribbble.svg', placeholder: 'username', href: 'https://dribbble.com/' },
        { id: 'reddit', label: 'Reddit', category: 'social', color: '#ff5700', icon: '/icons/reddit.svg', placeholder: 'username', href: 'https://reddit.com/user/' },
        { id: 'vk', label: 'VK', category: 'social', color: '#4a76a8', icon: '/icons/vk.svg', placeholder: 'pagename', href: 'https://vk.com/' },
        { id: 'snapchat', label: 'Snapchat', category: 'social', color: '#fffc00', icon: '/icons/snapchat.svg', placeholder: 'username', href: 'https://www.snapchat.com/add/', light: true },
        { id: 'tiktok', label: 'TikTok', category: 'social', color: '#010101', icon: '/icons/tiktok.svg', placeholder: 'username', href: 'https://tiktok.com/@' },
        { id: 'tumblr', label: 'Tumblr', category: 'social', color: '#2c4762', icon: '/icons/tumblr.svg', placeholder: 'username', href: 'https://', hrefEnd: '.tumblr.com/' },
        { id: 'quora', label: 'Quora', category: 'social', color: '#a82400', icon: '/icons/quora.svg', placeholder: 'username', href: 'https://quora.com/' },
        { id: 'medium', label: 'Medium', category: 'social', color: '#000000', icon: '/icons/medium.svg', placeholder: 'https://medium.com/publication_name' },
        { id: 'discord', label: 'Discord', category: 'social', color: '#7289da', icon: '/icons/discord.svg', placeholder: 'https://discord.gg/invitecode' },
        { id: 'twitch', label: 'Twitch', category: 'social', color: '#9146ff', icon: '/icons/twitch.svg', placeholder: 'username', href: 'https://twitch.tv/' },
        { id: 'spotify', label: 'Spotify', category: 'social', color: '#1ed760', icon: '/icons/spotify.svg', placeholder: 'username', href: 'https://open.spotify.com/user/' },
        { id: 'soundcloud', label: 'Soundcloud', category: 'social', color: '#ff3300', icon: '/icons/soundcloud.svg', placeholder: 'username', href: 'https://soundcloud.com/' },
        { id: 'funkwhale', label: 'Funkwhale', category: 'social', color: '#009fe3', icon: '/icons/funkwhale.svg', placeholder: 'https://funkwhale.audio/username' },
        { id: 'github', label: 'GitHub', category: 'social', color: '#333333', icon: '/icons/github.svg', placeholder: 'username', href: 'https://github.com/' },
        { id: 'gitlab', label: 'GitLab', category: 'social', color: '#171321', icon: '/icons/gitlab.svg', placeholder: 'username', href: 'https://gitlab.com/' },
        { id: 'codeberg', label: 'Codeberg', category: 'social', color: '#2185d0', icon: '/icons/codeberg.svg', placeholder: 'username', href: 'https://codeberg.org/' },
        { id: 'artstation', label: 'ArtStation', category: 'social', color: '#171717', icon: '/icons/artstation.svg', placeholder: 'username', href: 'https://www.artstation.com/' },
        { id: 'patreon', label: 'Patreon', category: 'social', color: '#FF424D', icon: '/icons/patreon.svg', placeholder: 'username', href: 'https://patreon.com/' },
        { id: 'paypal', label: 'PayPal', category: 'social', color: '#003087', icon: '/icons/paypal.svg', placeholder: 'username', href: 'https://paypal.me/' },
        { id: 'opencollective', label: 'Open Collective', category: 'social', color: '#297adc', icon: '/icons/open-collective.svg', placeholder: 'projectname', href: 'https://opencollective.com/' },
        { id: 'buymeacoffee', label: 'Buy me a coffee', category: 'social', color: '#ffdd00', icon: '/icons/buymeacoffee.svg', placeholder: 'username', href: 'https://www.buymeacoffee.com/', light: true },
        { id: 'cashapp', label: 'Cash App', category: 'social', color: '#00d632', icon: '/icons/cashapp.svg', placeholder: '$username', href: 'https://cash.app/$' },
        { id: 'siilo', label: 'Siilo', category: 'social', color: '#17233b', icon: '/icons/siilo.svg', placeholder: 'userID', href: 'https://app.siilo.com/qr/' },
        { id: 'appstore', label: 'App Store', category: 'social', color: '#147efb', icon: '/icons/appstore.svg', placeholder: 'https://apps.apple.com/in/app/…' },
        { id: 'playstore', label: 'Play Store', category: 'social', color: '#01875f', icon: '/icons/playstore.svg', placeholder: 'https://play.google.com/store/…' },
        { id: 'yelp', label: 'Yelp', category: 'social', color: '#d32323', icon: '/icons/yelp.svg', placeholder: 'bizname', href: 'https://yelp.com/' },
    ]

const getPlatform = (id: string) =>
    PLATFORMS.find((p) => p.id === id) ?? { id, label: id, color: '#555', icon: '', placeholder: '', category: 'social' as const }

const WORLD_GEO_URL = 'https://cdn.jsdelivr.net/gh/datasets/geo-countries@master/data/countries.geojson'

const COUNTRY_NAME_TO_ISO2: Record<string, string> = {
    'dhekelia sovereign base area': 'CY',
    somaliland: 'SO',
    france: 'FR',
    norway: 'NO',
    kosovo: 'XK',
    'us naval base guantanamo bay': 'CU',
    'brazilian island': 'BR',
    'northern cyprus': 'CY',
    'cyprus no mans area': 'CY',
    'siachen glacier': 'IN',
    'baykonur cosmodrome': 'KZ',
    'southern patagonian ice field': 'AR',
    'bir tawil': 'EG',
    taiwan: 'TW',
    'indian ocean territories': 'AU',
    'coral sea islands': 'AU',
    'spratly islands': 'PH',
    'clipperton island': 'FR',
    'ashmore and cartier islands': 'AU',
    'bajo nuevo bank petrel is': 'CO',
    'serranilla bank': 'CO',
    'scarborough reef': 'PH',
    'akrotiri sovereign base area': 'CY'
}

const normalizeCountryNameKey = (value: string) =>
    (value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()

const readIso2FromGeoProperties = (props: Record<string, unknown>) => {
    const raw = (
        (props.ISO_A2 as string)
        || (props.iso_a2 as string)
        || (props.ISO2 as string)
        || (props.iso2 as string)
        || (props['Alpha-2'] as string)
        || (props['ISO3166-1-Alpha-2'] as string)
        || ''
    ).toUpperCase()

    if (/^[A-Z]{2}$/.test(raw)) return raw
    const hyphenMatch = raw.match(/^[A-Z]{2}-([A-Z]{2})$/)
    if (hyphenMatch?.[1]) return hyphenMatch[1]

    const name = ((props.name as string) || '').trim()
    const byName = COUNTRY_NAME_TO_ISO2[normalizeCountryNameKey(name)]
    return byName || ''
}

const getDefaultMapZoom = () => {
    if (typeof window === 'undefined') return 1.15
    return window.innerWidth <= 720 ? 1.45 : 1.15
}

interface AnalyticsTotals {
    views: number
    unique_visitors: number
    returning_visitors: number
    saves: number
    save_rate_percent: number
    clicks: number
    shares: number
    leads: number
}

interface AnalyticsSeriesPoint {
    day: string
    views: number
    saves: number
    unique_visitors: number
}

interface AnalyticsSharePoint {
    share_method: string
    platform: string
    count: number
}

interface AnalyticsGeoPoint {
    country: string
    region: string
    city: string
    views: number
}

interface AnalyticsSourcePoint {
    referrer: string
    views: number
}

interface AnalyticsReport {
    period: string
    from: string
    to: string
    card_id: string | null
    totals: AnalyticsTotals
    timeseries: AnalyticsSeriesPoint[]
    share_breakdown: AnalyticsSharePoint[]
    geo: AnalyticsGeoPoint[]
    sources: AnalyticsSourcePoint[]
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

const hasLinkType = (links: LinkItem[], types: string[]) =>
    links.some((link) => types.includes((link.type || '').toLowerCase()))

const mergeCoreContactLinks = (card: CardDetails): CardDetails => {
    const links = [...(card.links || [])]

    if (card.phone && !hasLinkType(links, ['phone', 'mobile', 'office', 'home'])) {
        links.unshift({ type: 'phone', url: card.phone, is_visible: true })
    }

    if (card.email && !hasLinkType(links, ['email'])) {
        links.unshift({ type: 'email', url: card.email, is_visible: true })
    }

    if (card.address && !hasLinkType(links, ['location'])) {
        links.unshift({ type: 'location', url: card.address, is_visible: true })
    }

    return { ...card, links }
}

const getFirstLinkValue = (links: LinkItem[], types: string[]) =>
    links.find((link) => types.includes((link.type || '').toLowerCase()))?.url ?? ''

const compactAddress = (value: string) => {
    const normalized = value.replace(/\s+/g, ' ').trim()
    if (!normalized) return ''

    const parts = normalized
        .split(',')
        .map((part) => part.replace(/\s+/g, ' ').trim())
        .filter(Boolean)

    if (parts.length <= 2) return parts.join(', ')

    const street = parts[0]
    const country = parts[parts.length - 1]
    const cityOrVillage = parts.slice(1, -1)[0] || ''

    return [street, cityOrVillage, country].filter(Boolean).join(', ')
}

const toAddressLabel = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ''

    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const u = new URL(trimmed)
            const placeMatch = u.pathname.match(/\/maps\/place\/([^/@]+)/)
            if (placeMatch?.[1]) {
                return compactAddress(decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))).slice(0, 255)
            }
            const q = u.searchParams.get('q')
            if (q) return compactAddress(q).slice(0, 255)
        } catch {
            // ignore malformed url and fallback to raw value
        }
    }

    return compactAddress(trimmed).slice(0, 255)
}

const resolveMediaUrl = (value?: string) => {
    const raw = (value || '').trim()
    if (!raw) return ''
    if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) return raw

    const apiBase = (axios.defaults.baseURL || '').toString().replace(/\/$/, '')
    if (raw.startsWith('/')) {
        return apiBase ? `${apiBase}${raw}` : raw
    }

    return raw
}

const getCoreFieldsFromLinks = (links: LinkItem[], current: Pick<CardDetails, 'phone' | 'email' | 'address'>) => {
    const phoneRaw = getFirstLinkValue(links, ['phone', 'mobile', 'office', 'home'])
    const emailRaw = getFirstLinkValue(links, ['email'])
    const addressRaw = getFirstLinkValue(links, ['location'])

    return {
        phone: (phoneRaw ? phoneRaw : current.phone || '').replace(/^tel:/i, '').trim(),
        email: (emailRaw ? emailRaw : current.email || '').replace(/^mailto:/i, '').trim(),
        address: toAddressLabel(addressRaw ? addressRaw : current.address || '')
    }
}

const isGalleryLink = (link: LinkItem) => (link.type || '').toLowerCase() === 'gallery'
const isLocationLink = (link: LinkItem) => (link.type || '').toLowerCase() === 'location'

const ensureGalleryLinkPlacement = (links: LinkItem[]) => {
    const gallery = links.find(isGalleryLink)
    if (!gallery) return links

    const rest = links.filter((link) => !isGalleryLink(link))
    const locationIndex = rest.findIndex(isLocationLink)
    if (locationIndex === -1) return [...rest, gallery]

    return [...rest.slice(0, locationIndex), gallery, ...rest.slice(locationIndex)]
}

const getDefaultGalleryLinkUrl = (card: CardDetails) => {
    const firstMedia = card.media.find((item) => (item.type || 'image').toLowerCase() === 'image' && item.file_url)?.file_url
    return firstMedia || card.portfolio_url || 'https://res.cloudinary.com/'
}

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
})

const getCroppedAvatarBlob = async (src: string, crop: Area) => {
    const image = await loadImage(src)
    const size = 800

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not available')

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, size, size)

    return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Failed to create cropped image'))
                return
            }
            resolve(blob)
        }, 'image/jpeg', 0.92)
    })
}

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
    const mediaInputRef = useRef<HTMLInputElement | null>(null)
    const avatarInputRef = useRef<HTMLInputElement | null>(null)
    const [cards, setCards] = useState<CardItem[]>([])
    const [analytics, setAnalytics] = useState<AnalyticsReport | null>(null)
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
    const [uploadingMedia, setUploadingMedia] = useState(false)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [resettingAnalytics, setResettingAnalytics] = useState(false)
    const [analyticsLoading, setAnalyticsLoading] = useState(false)
    const [analyticsPeriod, setAnalyticsPeriod] = useState<'day' | 'week' | 'month' | 'custom'>('month')
    const [analyticsFrom, setAnalyticsFrom] = useState('')
    const [analyticsTo, setAnalyticsTo] = useState('')
    const [analyticsAutoRefreshSec, setAnalyticsAutoRefreshSec] = useState<number>(30)
    const [selectedGeoCountry, setSelectedGeoCountry] = useState<string>('')
    const [geoMapZoom, setGeoMapZoom] = useState<number>(getDefaultMapZoom)
    const [avatarEditorOpen, setAvatarEditorOpen] = useState(false)
    const [avatarCropSource, setAvatarCropSource] = useState('')
    const [avatarCropObjectUrl, setAvatarCropObjectUrl] = useState<string | null>(null)
    const [avatarCrop, setAvatarCrop] = useState({ x: 0, y: 0 })
    const [avatarZoom, setAvatarZoom] = useState(1)
    const [avatarCroppedAreaPixels, setAvatarCroppedAreaPixels] = useState<Area | null>(null)

    useEffect(() => {
        void loadData()
    }, [])

    useEffect(() => {
        if (!selectedCardId) return
        void loadCardDetails(selectedCardId)
    }, [selectedCardId])

    useEffect(() => {
        if (!selectedCardId) return
        if (selectedSection !== 'analytics') return
        void fetchAnalytics()
    }, [selectedCardId, analyticsPeriod, analyticsFrom, analyticsTo, selectedSection])

    useEffect(() => {
        if (!analyticsAutoRefreshSec || analyticsAutoRefreshSec <= 0) return
        if (!selectedCardId) return
        if (selectedSection !== 'analytics') return

        const id = setInterval(() => {
            void fetchAnalytics()
        }, analyticsAutoRefreshSec * 1000)

        return () => clearInterval(id)
    }, [analyticsAutoRefreshSec, selectedCardId, analyticsPeriod, analyticsFrom, analyticsTo, selectedSection])

    useEffect(() => {
        const el = mobileNavRefs.current[selectedSection]
        if (!el) return
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }, [selectedSection])

    useEffect(() => {
        return () => {
            if (avatarCropObjectUrl) {
                URL.revokeObjectURL(avatarCropObjectUrl)
            }
        }
    }, [avatarCropObjectUrl])

    const dashboardStats = useMemo(() => {
        return [
            { label: 'Просмотры', value: analytics?.totals.views ?? 0, accent: '#1f2937' },
            { label: 'Уникальные', value: analytics?.totals.unique_visitors ?? 0, accent: '#374151' },
            { label: 'Сохранения', value: analytics?.totals.saves ?? 0, accent: '#4b5563' },
            { label: 'Лиды', value: analytics?.totals.leads ?? 0, accent: '#111827' }
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
            const cardsResponse = await axios.get('/api/admin/cards', config)

            const nextCards: CardItem[] = cardsResponse.data
            setCards(nextCards)

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

    const fetchAnalytics = async (overrideCardId?: string) => {
        try {
            const token = localStorage.getItem('token')
            if (!token) return

            setAnalyticsLoading(true)
            const params: Record<string, string> = {
                period: analyticsPeriod
            }

            const targetCardId = overrideCardId ?? selectedCardId
            if (targetCardId) params.card_id = targetCardId

            if (analyticsPeriod === 'custom') {
                if (analyticsFrom) params.from = analyticsFrom
                if (analyticsTo) params.to = analyticsTo
            }

            const response = await axios.get('/api/admin/analytics', {
                headers: { Authorization: `Bearer ${token}` },
                params
            })

            setAnalytics(response.data)
        } catch (error: any) {
            const message = error?.response?.data?.error || 'Failed to load analytics'
            alert(message)
        } finally {
            setAnalyticsLoading(false)
        }
    }

    const exportAnalyticsCsv = async () => {
        try {
            const token = localStorage.getItem('token')
            if (!token) {
                navigate('/admin/login')
                return
            }

            const params: Record<string, string> = {
                period: analyticsPeriod
            }

            if (selectedCardId) params.card_id = selectedCardId
            if (analyticsPeriod === 'custom') {
                if (analyticsFrom) params.from = analyticsFrom
                if (analyticsTo) params.to = analyticsTo
            }

            const response = await axios.get('/api/admin/analytics/export', {
                headers: { Authorization: `Bearer ${token}` },
                params,
                responseType: 'blob'
            })

            const blobUrl = URL.createObjectURL(response.data)
            const a = document.createElement('a')
            a.href = blobUrl
            a.download = 'analytics.csv'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(blobUrl)
        } catch (error: any) {
            const message = error?.response?.data?.error || 'Failed to export analytics'
            alert(message)
        }
    }

    const loadCardDetails = async (cardId: string) => {
        try {
            const token = localStorage.getItem('token')
            const config = { headers: { Authorization: `Bearer ${token}` } }
            const response = await axios.get(`/api/admin/card/${cardId}`, config)
            setCardData(mergeCoreContactLinks(response.data))
        } catch {
            const fallback = cards.find((card) => card.id === cardId)
            if (fallback) setCardData(mergeCoreContactLinks(defaultCardDetails(fallback)))
        }
    }

    const saveCard = async () => {
        if (!cardData) return

        setSaving(true)
        try {
            const token = localStorage.getItem('token')
            const config = { headers: { Authorization: `Bearer ${token}` } }
            const links = normalizeLinksForSave(cardData.links)
            const core = getCoreFieldsFromLinks(links, cardData)
            const payload: CardDetails = {
                ...cardData,
                phone: core.phone,
                email: core.email,
                address: core.address,
                links
            }
            await axios.patch(`/api/admin/card/${cardData.id}`, payload, config)
            await loadData()
            alert('Card saved')
        } catch (error: any) {
            const details = error?.response?.data?.details
            if (Array.isArray(details) && details.length > 0) {
                alert(`Failed to save:\n${details.join('\n')}`)
            } else if (error?.response?.data?.error) {
                alert(`Failed to save: ${error.response.data.error}`)
            } else {
                alert('Failed to save')
            }
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

    const uploadImageFile = async (file: File) => {
        const token = localStorage.getItem('token')
        const formData = new FormData()
        formData.append('file', file)

        const response = await axios.post('/api/admin/media/upload', formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            }
        })

        return response.data?.url as string | undefined
    }

    const deleteUploadedMedia = async (url: string) => {
        if (!url) return
        const token = localStorage.getItem('token')
        await axios.delete('/api/admin/media', {
            headers: { Authorization: `Bearer ${token}` },
            data: { url }
        })
    }

    const uploadGalleryFiles = async (fileList: FileList | null) => {
        if (!cardData || !fileList || fileList.length === 0) return

        setUploadingMedia(true)
        try {
            const uploadedUrls: string[] = []

            for (const file of Array.from(fileList)) {
                const uploadedUrl = await uploadImageFile(file)
                if (uploadedUrl) {
                    uploadedUrls.push(uploadedUrl)
                }
            }

            if (uploadedUrls.length > 0) {
                setCardData((prev) => {
                    if (!prev) return prev
                    return {
                        ...prev,
                        media: [
                            ...prev.media,
                            ...uploadedUrls.map((url) => ({ file_url: url, type: 'image' as const }))
                        ]
                    }
                })
            }
        } catch (error: any) {
            const message = error?.response?.data?.error || 'Upload failed'
            alert(`Не удалось загрузить изображение: ${message}`)
        } finally {
            if (mediaInputRef.current) mediaInputRef.current.value = ''
            setUploadingMedia(false)
        }
    }

    const resetAvatarEditor = () => {
        if (avatarCropObjectUrl) {
            URL.revokeObjectURL(avatarCropObjectUrl)
        }
        setAvatarEditorOpen(false)
        setAvatarCropSource('')
        setAvatarCropObjectUrl(null)
        setAvatarCrop({ x: 0, y: 0 })
        setAvatarZoom(1)
        setAvatarCroppedAreaPixels(null)
        if (avatarInputRef.current) avatarInputRef.current.value = ''
    }

    const openAvatarEditor = (src: string, objectUrl?: string) => {
        if (!src) {
            alert('Сначала выберите фото аватара')
            return
        }

        if (avatarCropObjectUrl) {
            URL.revokeObjectURL(avatarCropObjectUrl)
        }

        setAvatarCropObjectUrl(objectUrl || null)
        setAvatarCropSource(src)
        setAvatarCrop({ x: 0, y: 0 })
        setAvatarZoom(1)
        setAvatarCroppedAreaPixels(null)
        setAvatarEditorOpen(true)
    }

    const handleAvatarFilePick = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            alert('Поддерживаются только изображения')
            return
        }

        const objectUrl = URL.createObjectURL(file)
        openAvatarEditor(objectUrl, objectUrl)
    }

    const applyAvatarCrop = async () => {
        if (!cardData || !avatarCropSource || !avatarCroppedAreaPixels) {
            alert('Выберите область кадрирования')
            return
        }

        setUploadingAvatar(true)
        try {
            const croppedBlob = await getCroppedAvatarBlob(avatarCropSource, avatarCroppedAreaPixels)
            const file = new File([croppedBlob], `avatar-${cardData.id}.jpg`, { type: 'image/jpeg' })
            const uploadedUrl = await uploadImageFile(file)

            if (uploadedUrl) {
                if (cardData.avatar_url) {
                    try {
                        await deleteUploadedMedia(cardData.avatar_url)
                    } catch {
                        // Do not block avatar update when old image cleanup fails.
                    }
                }
                updateCard({ avatar_url: uploadedUrl })
            }

            resetAvatarEditor()
        } catch (error: any) {
            const message = error?.response?.data?.error || error?.message || 'Crop/upload failed'
            alert(`Не удалось применить кроп: ${message}`)
        } finally {
            setUploadingAvatar(false)
        }
    }

    const removeAvatarFile = async () => {
        if (!cardData?.avatar_url) return

        try {
            await deleteUploadedMedia(cardData.avatar_url)
        } catch (error: any) {
            const message = error?.response?.data?.error || 'Delete failed'
            alert(`Не удалось удалить аватар: ${message}`)
            return
        }

        updateCard({ avatar_url: '' })
    }

    const removeGalleryFile = async (index: number) => {
        if (!cardData) return
        const item = cardData.media[index]
        if (!item?.file_url) return

        try {
            await deleteUploadedMedia(item.file_url)
        } catch (error: any) {
            const message = error?.response?.data?.error || 'Delete failed'
            alert(`Не удалось удалить изображение: ${message}`)
            return
        }

        updateCard({ media: cardData.media.filter((_, i) => i !== index) })
    }

    const resetAnalytics = async () => {
        const token = localStorage.getItem('token')
        if (!token) {
            navigate('/admin/login')
            return
        }

        const confirmed = window.confirm('Сбросить статистику для выбранной карточки? Это действие необратимо.')
        if (!confirmed) return

        try {
            setResettingAnalytics(true)
            await axios.post(
                '/api/admin/analytics/reset',
                { card_id: selectedCardId || undefined },
                { headers: { Authorization: `Bearer ${token}` } }
            )
            await fetchAnalytics()
        } catch (error: any) {
            const message = error?.response?.data?.error || 'Reset failed'
            alert(`Не удалось сбросить статистику: ${message}`)
        } finally {
            setResettingAnalytics(false)
        }
    }

    const geoCountryRows = useMemo(() => {
        const byCountry = new Map<string, number>()
        for (const item of analytics?.geo || []) {
            const key = (item.country || 'Unknown').toUpperCase()
            byCountry.set(key, (byCountry.get(key) || 0) + (item.views || 0))
        }
        return Array.from(byCountry.entries())
            .map(([country, views]) => ({ country, views }))
            .sort((a, b) => b.views - a.views)
    }, [analytics])

    const geoSelectedRegions = useMemo(() => {
        if (!selectedGeoCountry) return [] as Array<{ region: string; views: number }>
        const byRegion = new Map<string, number>()
        for (const item of analytics?.geo || []) {
            if ((item.country || 'Unknown').toUpperCase() !== selectedGeoCountry.toUpperCase()) continue
            const region = item.region || 'Unknown'
            byRegion.set(region, (byRegion.get(region) || 0) + (item.views || 0))
        }
        return Array.from(byRegion.entries())
            .map(([region, views]) => ({ region, views }))
            .sort((a, b) => b.views - a.views)
    }, [analytics, selectedGeoCountry])

    const geoSelectedCities = useMemo(() => {
        if (!selectedGeoCountry) return [] as Array<{ city: string; views: number }>
        const byCity = new Map<string, number>()
        for (const item of analytics?.geo || []) {
            if ((item.country || 'Unknown').toUpperCase() !== selectedGeoCountry.toUpperCase()) continue
            const city = item.city || 'Unknown'
            byCity.set(city, (byCity.get(city) || 0) + (item.views || 0))
        }
        return Array.from(byCity.entries())
            .map(([city, views]) => ({ city, views }))
            .sort((a, b) => b.views - a.views)
            .slice(0, 10)
    }, [analytics, selectedGeoCountry])

    const geoMaxViews = useMemo(
        () => Math.max(1, ...geoCountryRows.map((item) => item.views)),
        [geoCountryRows]
    )

    const geoColorScale = useMemo(
        () => scaleQuantize<string>().domain([0, geoMaxViews]).range(['#eef2ff', '#c7d2fe', '#a5b4fc', '#6366f1', '#3730a3']),
        [geoMaxViews]
    )

    const geoViewsByCountry = useMemo(() => {
        const map = new Map<string, number>()
        geoCountryRows.forEach((item) => map.set(item.country.toUpperCase(), item.views))
        return map
    }, [geoCountryRows])

    const zoomInGeoMap = () => {
        setGeoMapZoom((prev) => Math.min(4, Number((prev + 0.3).toFixed(2))))
    }

    const zoomOutGeoMap = () => {
        setGeoMapZoom((prev) => Math.max(1, Number((prev - 0.3).toFixed(2))))
    }

    const resetGeoMap = () => {
        setGeoMapZoom(getDefaultMapZoom())
        setSelectedGeoCountry('')
    }

    const isGalleryVisible = !!cardData?.links.some((link) => isGalleryLink(link) && link.is_visible !== false)

    const toggleGalleryVisibility = (enabled: boolean) => {
        if (!cardData) return

        const links = [...cardData.links]
        const galleryIndex = links.findIndex(isGalleryLink)

        if (!enabled) {
            if (galleryIndex !== -1) {
                links[galleryIndex] = { ...links[galleryIndex], is_visible: false }
                updateCard({ links })
            }
            return
        }

        if (galleryIndex !== -1) {
            const current = links[galleryIndex]
            links[galleryIndex] = {
                ...current,
                is_visible: true,
                url: (current.url || '').trim() || getDefaultGalleryLinkUrl(cardData)
            }
            updateCard({ links: ensureGalleryLinkPlacement(links) })
            return
        }

        const nextLinks = [...links, { type: 'gallery', url: getDefaultGalleryLinkUrl(cardData), is_visible: true }]
        updateCard({ links: ensureGalleryLinkPlacement(nextLinks) })
    }

    const logout = () => {
        const selectedCardSlug =
            cardData?.slug || cards.find((card) => card.id === selectedCardId)?.slug || cards[0]?.slug || ''
        localStorage.removeItem('token')
        navigate(selectedCardSlug ? `/${selectedCardSlug}` : '/')
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

                    <button type="button" className="admin-ghost danger admin-mobile-logout" onClick={logout}>
                        Выйти
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
                        <div className="glass-card section-head-row admin-dashboard-head">
                            <h3>Панель</h3>
                            <button
                                type="button"
                                className="admin-ghost danger"
                                onClick={() => {
                                    void resetAnalytics()
                                }}
                                disabled={resettingAnalytics || !selectedCardId}
                            >
                                {resettingAnalytics ? 'Сброс…' : 'Сбросить статистику'}
                            </button>
                        </div>

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
                    </section>
                )}

                {selectedSection === 'edit-card' && cardData && (
                    <section className="admin-two-col">
                        <div className="glass-card form-grid">
                            <h3>Редактировать карточку</h3>
                            <label>Имя<input value={cardData.full_name || ''} onChange={(e) => updateCard({ full_name: e.target.value })} /></label>
                            <label>Должность<input value={cardData.title || ''} onChange={(e) => updateCard({ title: e.target.value })} /></label>
                            <label>Компания<input value={cardData.company_name || ''} onChange={(e) => updateCard({ company_name: e.target.value })} /></label>
                            <label>Слоган<textarea rows={3} value={cardData.bio || ''} onChange={(e) => updateCard({ bio: e.target.value })}></textarea></label>
                            <div className="avatar-actions">
                                <input
                                    ref={avatarInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleAvatarFilePick}
                                />
                                <button
                                    type="button"
                                    className="admin-ghost avatar-action-btn is-primary"
                                    disabled={uploadingAvatar}
                                    onClick={() => avatarInputRef.current?.click()}
                                >
                                    {uploadingAvatar ? 'Обработка…' : 'Загрузить аватар'}
                                </button>
                                <button
                                    type="button"
                                    className="admin-ghost avatar-action-btn is-primary"
                                    disabled={uploadingAvatar || !cardData.avatar_url}
                                    onClick={() => openAvatarEditor(resolveMediaUrl(cardData.avatar_url))}
                                >
                                    Редактировать аватар
                                </button>
                                <button
                                    type="button"
                                    className="admin-ghost avatar-action-btn is-danger"
                                    disabled={uploadingAvatar || !cardData.avatar_url}
                                    onClick={() => {
                                        void removeAvatarFile()
                                    }}
                                >
                                    Удалить аватар
                                </button>
                            </div>
                        </div>

                        <div className="glass-card live-preview">
                            <h3>Предпросмотр</h3>
                            <div className="preview-card">
                                <img src={resolveMediaUrl(cardData.avatar_url || cardData.logo_url) || '/figma/home-from-pdf.webp'} alt="avatar" loading="lazy" />
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
                                <input
                                    ref={mediaInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                        void uploadGalleryFiles(e.target.files)
                                    }}
                                />
                                <button
                                    type="button"
                                    className="admin-ghost"
                                    disabled={uploadingMedia}
                                    onClick={() => mediaInputRef.current?.click()}
                                >
                                    {uploadingMedia ? 'Загрузка…' : 'Загрузить фото'}
                                </button>
                                <button type="button" className={galleryView === 'grid' ? 'is-active' : ''} onClick={() => setGalleryView('grid')}>Сетка</button>
                                <button type="button" className={galleryView === 'list' ? 'is-active' : ''} onClick={() => setGalleryView('list')}>Список</button>
                            </div>
                        </div>

                        <label className="gallery-toggle">
                            <input
                                type="checkbox"
                                checked={isGalleryVisible}
                                onChange={(e) => toggleGalleryVisibility(e.target.checked)}
                            />
                            <span>Показывать Gallery в основной секции контактов</span>
                        </label>

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
                                    <img src={resolveMediaUrl(item.file_url)} alt="media" loading="lazy" onClick={() => setPreviewUrl(resolveMediaUrl(item.file_url))} />
                                    <button
                                        type="button"
                                        className="media-delete-x"
                                        aria-label="Удалить фото"
                                        onClick={() => {
                                            void removeGalleryFile(index)
                                        }}
                                    >
                                        ×
                                    </button>
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
                                <select
                                    value={analyticsPeriod}
                                    onChange={(e) => setAnalyticsPeriod(e.target.value as 'day' | 'week' | 'month' | 'custom')}
                                    title="Период"
                                >
                                    <option value="day">День</option>
                                    <option value="week">Неделя</option>
                                    <option value="month">Месяц</option>
                                    <option value="custom">Произвольный</option>
                                </select>
                                {analyticsPeriod === 'custom' && (
                                    <>
                                        <input
                                            type="date"
                                            value={analyticsFrom}
                                            onChange={(e) => setAnalyticsFrom(e.target.value)}
                                            title="Дата начала"
                                        />
                                        <input
                                            type="date"
                                            value={analyticsTo}
                                            onChange={(e) => setAnalyticsTo(e.target.value)}
                                            title="Дата окончания"
                                        />
                                    </>
                                )}
                                <select
                                    value={analyticsAutoRefreshSec}
                                    onChange={(e) => setAnalyticsAutoRefreshSec(Number(e.target.value))}
                                    title="Автообновление"
                                >
                                    <option value={0}>Без автообновления</option>
                                    <option value={15}>Обновлять: 15с</option>
                                    <option value={30}>Обновлять: 30с</option>
                                    <option value={60}>Обновлять: 60с</option>
                                </select>
                                <button type="button" className="admin-ghost" onClick={() => void fetchAnalytics()}>
                                    Обновить
                                </button>
                                <button type="button" className="admin-ghost" onClick={() => void exportAnalyticsCsv()}>
                                    Экспорт CSV
                                </button>
                            </div>
                        </div>

                        <div className="analytics-totals-compact">
                            <div className="analytics-total-row"><span>Просмотры</span><strong>{analytics?.totals.views ?? 0} всего</strong></div>
                            <div className="analytics-total-row"><span>Уникальные посетители</span><strong>{analytics?.totals.unique_visitors ?? 0}</strong></div>
                            <div className="analytics-total-row"><span>Повторные визиты</span><strong>{analytics?.totals.returning_visitors ?? 0}</strong></div>
                            <div className="analytics-total-row"><span>Сохранить контакт</span><strong>{analytics?.totals.saves ?? 0} ({analytics?.totals.save_rate_percent ?? 0}%)</strong></div>
                            <div className="analytics-total-row"><span>Поделиться</span><strong>{analytics?.totals.shares ?? 0}</strong></div>
                            <div className="analytics-total-row"><span>Лиды</span><strong>{analytics?.totals.leads ?? 0}</strong></div>
                        </div>

                        <div className="analytics-grid" style={{ marginTop: 10 }}>
                            <article style={{ gridColumn: 'span 2' }}>
                                <h4>Динамика Save contact по дням</h4>
                                <div className="analytics-series-table">
                                    {(analytics?.timeseries || []).map((point) => (
                                        <div key={point.day} className="analytics-series-row">
                                            <span>{new Date(point.day).toLocaleDateString()}</span>
                                            <span>Views: {point.views}</span>
                                            <span>Saves: {point.saves}</span>
                                            <span>Unique: {point.unique_visitors}</span>
                                        </div>
                                    ))}
                                    {(analytics?.timeseries || []).length === 0 && <p>Нет данных за выбранный период</p>}
                                </div>
                            </article>

                            <article>
                                <h4>Поделиться по платформам</h4>
                                <div className="analytics-series-table">
                                    {(analytics?.share_breakdown || []).map((row, idx) => (
                                        <div key={`${row.share_method}-${row.platform}-${idx}`} className="analytics-series-row">
                                            <span>{row.share_method}</span>
                                            <span>{row.platform}</span>
                                            <span>{row.count}</span>
                                        </div>
                                    ))}
                                    {(analytics?.share_breakdown || []).length === 0 && <p>Нет событий share</p>}
                                </div>
                            </article>
                        </div>

                        <div className="analytics-grid" style={{ marginTop: 10 }}>
                            <article style={{ gridColumn: 'span 2' }}>
                                <h4>Карта просмотров</h4>
                                <div className="analytics-map-toolbar">
                                    <button type="button" className="admin-ghost" onClick={zoomOutGeoMap}>-</button>
                                    <span>Zoom: {geoMapZoom.toFixed(2)}x</span>
                                    <button type="button" className="admin-ghost" onClick={zoomInGeoMap}>+</button>
                                    <button type="button" className="admin-ghost" onClick={resetGeoMap}>Сброс</button>
                                </div>
                                <ComposableMap
                                    className="analytics-world-map"
                                    projectionConfig={{ scale: 130 }}
                                    style={{ width: '100%', height: 'auto' }}
                                >
                                    <ZoomableGroup zoom={geoMapZoom}>
                                        <Geographies geography={WORLD_GEO_URL}>
                                            {({ geographies }: { geographies: any[] }) =>
                                                geographies.map((geo: any) => {
                                                    const props = (geo.properties || {}) as Record<string, unknown>
                                                    const code = readIso2FromGeoProperties(props)
                                                    const views = geoViewsByCountry.get(code) || 0
                                                    return (
                                                        <Geography
                                                            key={geo.rsmKey}
                                                            geography={geo}
                                                            onClick={() => {
                                                                if (code) setSelectedGeoCountry(code)
                                                            }}
                                                            style={{
                                                                default: { fill: views > 0 ? geoColorScale(views) : '#f3f4f6', stroke: '#d1d5db', outline: 'none' },
                                                                hover: { fill: '#93c5fd', stroke: '#9ca3af', outline: 'none' },
                                                                pressed: { fill: '#60a5fa', stroke: '#6b7280', outline: 'none' }
                                                            }}
                                                        />
                                                    )
                                                })
                                            }
                                        </Geographies>
                                    </ZoomableGroup>
                                </ComposableMap>
                            </article>

                            <article>
                                <h4>Гео детализация</h4>
                                <div className="analytics-series-table">
                                    {!selectedGeoCountry && geoCountryRows.slice(0, 10).map((row) => (
                                        <div key={row.country} className="analytics-series-row">
                                            <button
                                                type="button"
                                                className="admin-ghost"
                                                onClick={() => setSelectedGeoCountry(row.country)}
                                            >
                                                {row.country}
                                            </button>
                                            <span>{row.views}</span>
                                        </div>
                                    ))}

                                    {!!selectedGeoCountry && (
                                        <>
                                            <div className="analytics-series-row">
                                                <button type="button" className="admin-ghost" onClick={() => setSelectedGeoCountry('')}>
                                                    ← Назад к странам
                                                </button>
                                            </div>
                                            {geoSelectedRegions.map((row) => (
                                                <div key={row.region} className="analytics-series-row">
                                                    <span>{row.region}</span>
                                                    <span>{row.views}</span>
                                                </div>
                                            ))}
                                            {geoSelectedCities.map((row) => (
                                                <div key={row.city} className="analytics-series-row">
                                                    <small>{row.city}</small>
                                                    <small>{row.views}</small>
                                                </div>
                                            ))}
                                        </>
                                    )}

                                    {geoCountryRows.length === 0 && <p>Нет геоданных</p>}
                                </div>
                            </article>
                        </div>

                        {analyticsLoading && <p>Обновление аналитики…</p>}
                    </section>
                )}

                {avatarEditorOpen && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4">
                        <div className="w-full max-w-[24rem] rounded-xl bg-white p-4 shadow-2xl md:max-w-[24rem]">
                            <h3 className="text-lg font-semibold">Редактор аватара</h3>
                            <p className="mt-1 text-sm text-gray-600">Перетаскивайте фото и меняйте масштаб. Будет сохранен квадрат.</p>

                            <div className="relative mt-4 w-full aspect-square overflow-hidden rounded-lg bg-black">
                                <Cropper
                                    image={avatarCropSource}
                                    crop={avatarCrop}
                                    zoom={avatarZoom}
                                    aspect={1}
                                    cropShape="rect"
                                    showGrid
                                    objectFit="contain"
                                    onCropChange={setAvatarCrop}
                                    onZoomChange={setAvatarZoom}
                                    onCropComplete={(_, croppedAreaPixels) => setAvatarCroppedAreaPixels(croppedAreaPixels)}
                                />
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700">Масштаб</label>
                                <input
                                    type="range"
                                    min={1}
                                    max={3}
                                    step={0.01}
                                    value={avatarZoom}
                                    onChange={(e) => setAvatarZoom(Number(e.target.value))}
                                    className="mt-2 w-full"
                                />
                            </div>

                            <div className="mt-4 flex justify-end gap-2">
                                <button
                                    type="button"
                                    className="admin-ghost"
                                    onClick={resetAvatarEditor}
                                    disabled={uploadingAvatar}
                                >
                                    Отмена
                                </button>
                                <button
                                    type="button"
                                    className="admin-save"
                                    onClick={() => {
                                        void applyAvatarCrop()
                                    }}
                                    disabled={uploadingAvatar}
                                >
                                    {uploadingAvatar ? 'Сохранение…' : 'Применить'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
