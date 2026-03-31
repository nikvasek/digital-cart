import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import typography from '../figma/typography.json'

interface CardData {
  id: string
  slug: string
  full_name: string
  title: string
  company_name: string
  phone: string
  email: string
  address: string
  website: string
  portfolio_url: string
  bio: string
  avatar_url: string
  logo_url: string
  language_default: string
  links: Array<{ type: string; url: string; is_visible: boolean }>
  media: Array<{ file_url: string; type: string }>
  services: Array<{ title: string; description: string; is_visible: boolean }>
}

const createFallbackCard = (slugParam?: string): CardData => ({
  id: 'local-demo-card',
  slug: slugParam || 'paulline-ferreira',
  full_name: 'Paulline Ferreira',
  title: "Custom men's haircuts and beard styling",
  company_name: 'Digital Business Card',
  phone: '+375 29 232 73 82',
  email: 'paulline@example.com',
  address: 'Kalvariyskaya 42, Minsk',
  website: 'kalvariyskaya42.by',
  portfolio_url: 'https://example.com/portfolio',
  bio: 'Eyes are drawn to uniqueness.',
  avatar_url: '/figma/home-from-pdf.png',
  logo_url: '',
  language_default: 'en',
  links: [
    { type: 'instagram', url: 'https://instagram.com', is_visible: true },
    { type: 'telegram', url: 'https://t.me', is_visible: true },
    { type: 'whatsapp', url: 'https://wa.me/375292327382', is_visible: true },
    { type: 'tiktok', url: 'https://www.tiktok.com', is_visible: true },
    { type: 'viber', url: 'viber://chat?number=%2B375292327382', is_visible: true },
    { type: 'facebook', url: 'https://www.facebook.com/paulline', is_visible: true },
    { type: 'linkedin', url: 'https://www.linkedin.com/in/paulline', is_visible: true },
    { type: 'youtube', url: 'https://www.youtube.com/@paulline', is_visible: true }
  ],
  media: [],
  services: []
})

type Hotspot = {
  id: string
  onClick: () => void
  label: string
}

type ContactItem = {
  id: string
  text: string
  onClick: () => void
  icon: string
}

type TypographyField = {
  textLayerName: string
  x: number
  y: number
  width: number
  height: number
  fontFamily: string
  fontWeight: number
  fontSize: number
  lineHeight: number
  letterSpacing: number
  textAlign: 'left' | 'center' | 'right' | 'justify'
  color: string
}

type TypographyData = {
  frame: { width: number; height: number }
  fields: Record<string, TypographyField>
}

const typographyData = typography as TypographyData
const frameWidth = typographyData.frame.width || 375
const frameHeight = typographyData.frame.height || 820

const toPercent = (value: number, max: number) => `${(value / max) * 100}%`

const getFieldStyle = (field?: TypographyField): CSSProperties | undefined => {
  if (!field) return undefined

  return {
    left: toPercent(field.x, frameWidth),
    top: toPercent(field.y, frameHeight),
    width: toPercent(field.width, frameWidth),
    height: toPercent(field.height, frameHeight),
    fontFamily: field.fontFamily || 'inherit',
    fontWeight: field.fontWeight || 400,
    fontSize: field.fontSize ? `${field.fontSize}px` : undefined,
    lineHeight: field.lineHeight ? `${field.lineHeight}px` : undefined,
    letterSpacing: field.letterSpacing ? `${field.letterSpacing}px` : undefined,
    textAlign: field.textAlign || 'left',
    color: field.color || '#FFFFFF'
  }
}

const getAutoScale = (value: string, thresholds: Array<{ max: number; scale: number }>) => {
  const length = value.trim().length
  for (const item of thresholds) {
    if (length <= item.max) return item.scale
  }
  return thresholds[thresholds.length - 1]?.scale ?? 1
}

const applyScale = (style: CSSProperties | undefined, scale: number): CSSProperties | undefined => {
  if (!style || scale === 1) return style
  const fontSize = style.fontSize ? `calc(${style.fontSize} * ${scale})` : undefined
  const lineHeight = style.lineHeight ? `calc(${style.lineHeight} * ${scale})` : undefined

  return {
    ...style,
    fontSize,
    lineHeight
  }
}

const formatPhoneDisplay = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return trimmed
  const digits = trimmed.replace(/\D/g, '')

  if (digits.length === 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`
  }

  return trimmed
}

const normalizeAddress = (value: string) => value.replace(/\s+/g, ' ').trim()

const toExternalUrl = (url: string) => {
  if (!url) return url
  return /^[a-z][a-z\d+.-]*:/i.test(url) ? url : `https://${url}`
}

const iconByType = {
  phone: '/figma/call.png',
  whatsapp: '/figma/whatsapp.png',
  telegram: '/figma/telegram.png',
  instagram: '/figma/instagram.png',
  viber: '/figma/viber.png',
  email: '/figma/email.png',
  tiktok: '/figma/tiktok.png',
  gallery: '/figma/gallery-1.png',
  location: '/figma/location.png'
} as const

export default function PublicCard() {
  const { slug } = useParams<{ slug: string }>()
  const { t, i18n } = useTranslation()
  const [card, setCard] = useState<CardData | null>(null)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCard()
  }, [slug])

  const trackEvent = (event_type: string, metadata?: Record<string, unknown>) => {
    axios
      .post('/api/public/events', {
        card_id: card?.id,
        event_type,
        metadata
      })
      .catch(() => undefined)
  }

  const loadCard = async () => {
    try {
      const response = await axios.get(`/api/public/card/${slug}`)
      setCard(response.data)
      i18n.changeLanguage(response.data.language_default)

      axios.post('/api/public/events', {
        card_id: response.data.id,
        event_type: 'view'
      })
    } catch (error) {
      console.error('Failed to load card:', error)
      const fallback = createFallbackCard(slug)
      setCard(fallback)
      i18n.changeLanguage(fallback.language_default)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveContact = () => {
    const baseUrl = (axios.defaults.baseURL || '').toString().replace(/\/$/, '')
    window.location.href = `${baseUrl}/api/public/card/${slug}/vcard`
    trackEvent('save_vcard')
  }

  const handleShare = async () => {
    const url = window.location.href

    if (navigator.share) {
      try {
        await navigator.share({
          title: card?.full_name,
          text: `${card?.title} at ${card?.company_name}`,
          url: url
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      await navigator.clipboard.writeText(url)
      alert('Link copied to clipboard')
    }

    trackEvent('share')
  }

  const openExternal = (type: string, url?: string) => {
    if (!url) return
    trackEvent('click', { link_type: type })
    window.location.href = toExternalUrl(url)
  }

  const openTel = () => {
    if (!card?.phone) return
    trackEvent('click', { link_type: 'phone' })
    window.location.href = `tel:${card.phone.replace(/\s+/g, '')}`
  }

  const openEmail = () => {
    if (!card?.email) return
    trackEvent('click', { link_type: 'email' })
    window.location.href = `mailto:${card.email}`
  }

  const openLocation = () => {
    if (!card?.address) return
    trackEvent('click', { link_type: 'location' })
    window.location.href = `https://maps.google.com/?q=${encodeURIComponent(card.address)}`
  }

  const openGallery = () => {
    trackEvent('click', { link_type: 'gallery' })
    if (card?.portfolio_url) {
      window.location.href = toExternalUrl(card.portfolio_url)
    }
  }

  const addToHomeHint = async () => {
    await navigator.clipboard.writeText(window.location.href)
    alert('Open browser menu and tap “Add to Home Screen”. Link copied.')
  }

  const openAdminPanel = () => {
    window.location.href = '/admin/login'
  }

  const getLinkByType = (type: string) => {
    return card?.links?.find((link) => link.is_visible && link.type.toLowerCase() === type.toLowerCase())?.url
  }

  const submitLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    
    try {
      await axios.post(`/api/public/card/${slug}/lead`, {
        name: formData.get('name'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        consent_marketing: formData.get('consent') === 'on'
      })
      
      alert(t('thankYou'))
      setShowLeadForm(false)
      form.reset()
    } catch (error) {
      alert('Error submitting form')
    }
  }

  const contactItems: ContactItem[] = []

  if (card?.phone) {
    contactItems.push({
      id: 'phone',
      text: formatPhoneDisplay(card.phone),
      onClick: openTel,
      icon: iconByType.phone
    })
  }

  const whatsappUrl = getLinkByType('whatsapp')
  if (whatsappUrl) {
    contactItems.push({
      id: 'whatsapp',
      text: 'WhatsApp',
      onClick: () => openExternal('whatsapp', whatsappUrl),
      icon: iconByType.whatsapp
    })
  }

  const telegramUrl = getLinkByType('telegram')
  if (telegramUrl) {
    contactItems.push({
      id: 'telegram',
      text: 'Telegram',
      onClick: () => openExternal('telegram', telegramUrl),
      icon: iconByType.telegram
    })
  }

  const instagramUrl = getLinkByType('instagram')
  if (instagramUrl) {
    contactItems.push({
      id: 'instagram',
      text: 'Instagram',
      onClick: () => openExternal('instagram', instagramUrl),
      icon: iconByType.instagram
    })
  }

  const viberUrl = getLinkByType('viber')
  if (viberUrl) {
    contactItems.push({
      id: 'viber',
      text: 'Viber',
      onClick: () => openExternal('viber', viberUrl),
      icon: iconByType.viber
    })
  }

  if (card?.email) {
    contactItems.push({
      id: 'email',
      text: 'Email',
      onClick: openEmail,
      icon: iconByType.email
    })
  }

  const tiktokUrl = getLinkByType('tiktok')
  if (tiktokUrl) {
    contactItems.push({
      id: 'tiktok',
      text: 'TikTok',
      onClick: () => openExternal('tiktok', tiktokUrl),
      icon: iconByType.tiktok
    })
  }

  if (card?.portfolio_url) {
    contactItems.push({
      id: 'gallery',
      text: 'Gallery',
      onClick: openGallery,
      icon: iconByType.gallery
    })
  }

  if (card?.address) {
    contactItems.push({
      id: 'location',
      text: normalizeAddress(card.address),
      onClick: openLocation,
      icon: iconByType.location
    })
  }

  const hotspots: Hotspot[] = [
    { id: 'save-contact', onClick: handleSaveContact, label: 'Save contact' },
    { id: 'show-qr', onClick: () => setShowQR(true), label: 'Show QR' },
    {
      id: 'book-now',
      onClick: () => setShowLeadForm((prev) => !prev),
      label: 'Book now'
    },
    { id: 'add-home', onClick: addToHomeHint, label: 'Add to Home' },
    { id: 'share', onClick: () => void handleShare(), label: 'Share' },
    { id: 'admin', onClick: openAdminPanel, label: 'Admin panel' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">Card not found</p>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="mx-auto w-full sm:max-w-[430px]">
        <div className="home-card-frame relative w-full overflow-hidden">
          <img
            src="/figma/background-no-text.png"
            srcSet="/figma/background-no-text.png 375w, /figma/background-no-text@2x.png 750w"
            sizes="(min-width: 430px) 430px, 100vw"
            alt="Business card"
            className="h-full w-full select-none"
            draggable={false}
          />

          {/* Dynamic text overlays from typography.json */}
          <div
            className="card-text card-text--clamp-3"
            style={applyScale(
              getFieldStyle(typographyData.fields.name),
              getAutoScale(card.full_name, [
                { max: 18, scale: 1 },
                { max: 26, scale: 0.92 },
                { max: 34, scale: 0.84 }
              ])
            )}
          >
            {card.full_name}
          </div>
          <div
            className="card-text card-text--clamp-3"
            style={applyScale(
              getFieldStyle(typographyData.fields.title),
              getAutoScale(card.title, [
                { max: 28, scale: 1 },
                { max: 40, scale: 0.92 },
                { max: 52, scale: 0.84 }
              ])
            )}
          >
            {card.title}
          </div>
          <div className="card-text card-text--clamp-3" style={getFieldStyle(typographyData.fields.bio)}>
            {card.bio}
          </div>
          {contactItems.length > 0 && (
            <div className="card-links" aria-label="Contacts">
              {contactItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="card-link"
                  onClick={item.onClick}
                  aria-label={item.text}
                >
                  <span className="card-link__icon">
                    <img src={item.icon} alt="" aria-hidden="true" />
                  </span>
                  <span className="card-link__text">{item.text}</span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => i18n.changeLanguage('ru')}
            className="hs hs-lang-ru"
            aria-label="Russian"
          />
          <button
            onClick={() => i18n.changeLanguage('en')}
            className="hs hs-lang-en"
            aria-label="English"
          />

          {hotspots.map((spot) => (
            <button
              key={spot.id}
              onClick={spot.onClick}
              className={`hs hs-${spot.id}`}
              aria-label={spot.label}
            />
          ))}
        </div>

        {showLeadForm && (
          <section className="mt-4 rounded-3xl border border-white/10 bg-[#1a1a1a] p-5">
            <h2 className="mb-4 text-lg font-semibold">{t('leaveContact')}</h2>
            <form onSubmit={submitLead} className="space-y-3">
              <input
                type="text"
                name="name"
                placeholder={t('name')}
                required
                className="w-full rounded-xl border border-white/20 bg-[#222] px-4 py-3 text-sm text-white outline-none"
              />
              <input
                type="tel"
                name="phone"
                placeholder={t('phone')}
                required
                className="w-full rounded-xl border border-white/20 bg-[#222] px-4 py-3 text-sm text-white outline-none"
              />
              <input
                type="email"
                name="email"
                placeholder={t('email')}
                className="w-full rounded-xl border border-white/20 bg-[#222] px-4 py-3 text-sm text-white outline-none"
              />
              <label className="flex items-start gap-2 text-xs text-gray-300">
                <input type="checkbox" name="consent" required className="mt-0.5" />
                <span>{t('consent')}</span>
              </label>
              <button type="submit" className="w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-black">
                {t('submit')}
              </button>
            </form>
          </section>
        )}
      </div>

      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowQR(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(window.location.href)}`}
              alt="QR Code"
              className="mx-auto"
            />
            <button
              className="mt-4 w-full rounded-full bg-black px-4 py-2 text-sm font-semibold text-white"
              onClick={() => setShowQR(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
