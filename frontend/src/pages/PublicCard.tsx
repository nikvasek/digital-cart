import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'

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

type ContactRow = {
  id: string
  label: string
  iconSrc: string
  onClick: () => void
  isVisible: boolean
}

const figmaAsset = (name: string) => encodeURI(`/figma/${name}`)
const avatarFallbackSrc = figmaAsset('Снимок экрана 2026-03-26 в 15.46.46 1@3x.webp')
const heroBgRightSrc = figmaAsset('My First Weavy_Gemini 3 (Nano Banana Pro)_2026-03-28_19-51-14 1@3x.webp')
const heroBgLeftSrc = figmaAsset('Rectangle 71@3x.webp')

const resolveAvatarSrc = (value?: string) => {
  const avatarUrl = (value || '').trim()
  if (!avatarUrl) return avatarFallbackSrc

  // Guard against accidentally using full-card background as avatar image.
  const invalidAvatarMarkers = ['/figma/home-1x.png', '/figma/home-from-pdf.png', '/figma/home-from-pdf.webp', 'My First Weavy_Gemini']
  if (invalidAvatarMarkers.some((marker) => avatarUrl.includes(marker))) {
    return avatarFallbackSrc
  }

  return avatarUrl
}

const toExternalUrl = (url: string) => {
  if (!url) return url
  return /^[a-z][a-z\d+.-]*:/i.test(url) ? url : `https://${url}`
}

const formatPhoneDisplay = (value: string) => {
  const cleaned = value.trim()
  if (!cleaned) return cleaned

  const digits = cleaned.replace(/\D/g, '')
  if (digits.length === 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`
  }

  return cleaned
}

const normalizeAddress = (value: string) => value.replace(/\s+/g, ' ').trim()

const preloadImage = (src: string) => new Promise<void>((resolve) => {
  if (!src) {
    resolve()
    return
  }

  const image = new Image()
  image.decoding = 'async'
  image.onload = () => resolve()
  image.onerror = () => resolve()
  image.src = src
})

const preloadCriticalAssets = async (avatarUrl?: string) => {
  const criticalImages = [
    heroBgRightSrc,
    heroBgLeftSrc,
    resolveAvatarSrc(avatarUrl),
    figmaAsset('call_1062678 1@3x.png'),
    figmaAsset('whatsapp_739247 1@3x.png'),
    figmaAsset('telegram 1@3x.png'),
    figmaAsset('instagram_739244 1@3x.png'),
    figmaAsset('viber_2190481 1@3x.png'),
    figmaAsset('email_347722 1@3x.png'),
    figmaAsset('tik-tok 1@3x.png'),
    figmaAsset('placeholder_1180413 1@3x.png'),
    figmaAsset('image 13@3x.png')
  ]

  await Promise.allSettled(criticalImages.map((src) => preloadImage(src)))
}

export default function PublicCard() {
  const { slug } = useParams<{ slug: string }>()
  const { t, i18n } = useTranslation()
  const [card, setCard] = useState<CardData | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void loadCard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setLoading(true)
    try {
      setLoadError(false)
      const response = await axios.get(`/api/public/card/${slug}`)
      await preloadCriticalAssets(response.data.avatar_url)
      setCard(response.data)
      await i18n.changeLanguage(response.data.language_default)

      void axios.post('/api/public/events', {
        card_id: response.data.id,
        event_type: 'view'
      })
    } catch (error) {
      console.error('Failed to load card:', error)
      setLoadError(true)
      setCard(null)
    } finally {
      setLoading(false)
    }
  }

  const getLinkByType = (type: string) => {
    return card?.links?.find((link) => link.is_visible && link.type.toLowerCase() === type.toLowerCase())?.url
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
    if (!card) return
    trackEvent('click', { link_type: 'location' })
    if (card.address) {
      window.location.href = `https://maps.google.com/?q=${encodeURIComponent(card.address)}`
      return
    }

    if (card.website) {
      window.location.href = toExternalUrl(card.website)
    }
  }

  const openGallery = () => {
    trackEvent('click', { link_type: 'gallery' })
    if (card?.portfolio_url) {
      window.location.href = toExternalUrl(card.portfolio_url)
      return
    }

    const firstImage = card?.media?.find((item) => (item.type || 'image').toLowerCase() === 'image' && item.file_url)?.file_url
    if (firstImage) {
      window.location.href = toExternalUrl(firstImage)
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
          url
        })
      } catch {
        // user cancelled share dialog
      }
    } else {
      await navigator.clipboard.writeText(url)
      alert('Link copied to clipboard')
    }

    trackEvent('share')
  }

  const addToHomeHint = async () => {
    await navigator.clipboard.writeText(window.location.href)
    alert('Open browser menu and tap “Add to Home Screen”. Link copied.')
  }

  const submitLead = async (e: FormEvent<HTMLFormElement>) => {
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
    } catch {
      alert('Error submitting form')
    }
  }

  const contactRows = useMemo<ContactRow[]>(() => {
    if (!card) return []

    return [
      {
        id: 'phone',
        label: formatPhoneDisplay(card.phone || ''),
        iconSrc: figmaAsset('call_1062678 1@3x.png'),
        onClick: openTel,
        isVisible: Boolean(card.phone)
      },
      {
        id: 'whatsapp',
        label: 'WhatsApp',
        iconSrc: figmaAsset('whatsapp_739247 1@3x.png'),
        onClick: () => openExternal('whatsapp', getLinkByType('whatsapp')),
        isVisible: Boolean(getLinkByType('whatsapp'))
      },
      {
        id: 'telegram',
        label: 'Telegram',
        iconSrc: figmaAsset('telegram 1@3x.png'),
        onClick: () => openExternal('telegram', getLinkByType('telegram')),
        isVisible: Boolean(getLinkByType('telegram'))
      },
      {
        id: 'instagram',
        label: 'Instagram',
        iconSrc: figmaAsset('instagram_739244 1@3x.png'),
        onClick: () => openExternal('instagram', getLinkByType('instagram')),
        isVisible: Boolean(getLinkByType('instagram'))
      },
      {
        id: 'viber',
        label: 'Viber',
        iconSrc: figmaAsset('viber_2190481 1@3x.png'),
        onClick: () => openExternal('viber', getLinkByType('viber')),
        isVisible: Boolean(getLinkByType('viber'))
      },
      {
        id: 'email',
        label: card.email || 'Email',
        iconSrc: figmaAsset('email_347722 1@3x.png'),
        onClick: openEmail,
        isVisible: Boolean(card.email)
      },
      {
        id: 'tiktok',
        label: 'Tik tok',
        iconSrc: figmaAsset('tik-tok 1@3x.png'),
        onClick: () => openExternal('tiktok', getLinkByType('tiktok')),
        isVisible: Boolean(getLinkByType('tiktok'))
      },
      {
        id: 'gallery',
        label: 'Gallery',
        iconSrc: figmaAsset('placeholder_1180413 1@3x.png'),
        onClick: openGallery,
        isVisible: Boolean(
          card.portfolio_url
          || card.media?.some((item) => (item.type || 'image').toLowerCase() === 'image' && item.file_url)
        )
      },
      {
        id: 'location',
        label: normalizeAddress(card.address || card.company_name || 'Location'),
        iconSrc: figmaAsset('image 13@3x.png'),
        onClick: openLocation,
        isVisible: Boolean(card.address || card.website)
      }
    ].filter((row) => row.isVisible)
  }, [card])

  if (!loading && !card) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
        <p className="text-xl text-gray-300">{loadError ? 'Failed to load card' : 'Card not found'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="mx-auto w-full sm:max-w-[430px]">
        <div className="home-card-frame relative w-full overflow-hidden bg-[#111]">

          {/* Spinner — fades out when card is ready */}
          <div className={`dbc-spinner-overlay${loading ? ' dbc-spinner-overlay--show' : ''}`} aria-hidden={!loading}>
            <span className="dbc-spinner" />
          </div>

          {/* Card content — fades in when card is ready */}
          <div className={`dbc-card-reveal${!loading && card ? ' dbc-card-reveal--show' : ''}`}>
          {card && (<>
          <img
            src={heroBgRightSrc}
            alt="Background"
            className="dbc-bg-right"
            fetchPriority="high"
            loading="eager"
            decoding="async"
            draggable={false}
          />
          <img
            src={heroBgLeftSrc}
            alt=""
            aria-hidden="true"
            className="dbc-bg-left"
            fetchPriority="high"
            loading="eager"
            decoding="async"
            draggable={false}
          />

          <div className="dbc-avatar-shell">
            <img src={resolveAvatarSrc(card.avatar_url)} alt={card.full_name} className="dbc-avatar" fetchPriority="high" loading="eager" decoding="async" />
          </div>

          <h1 className="dbc-name">{card.full_name}</h1>
          <p className="dbc-bio">{card.bio}</p>
          <p className="dbc-title">{card.title}</p>

          <div className="dbc-lang" role="group" aria-label="Language switcher">
            <button type="button" className="dbc-lang-btn" onClick={() => i18n.changeLanguage('ru')} aria-label="Russian">
              RU
            </button>
            <button type="button" className="dbc-lang-btn" onClick={() => i18n.changeLanguage('en')} aria-label="English">
              ENG
            </button>
          </div>

          <div className="dbc-contacts" aria-label="Contacts">
            {contactRows.map((row) => (
              <button key={row.id} type="button" className="dbc-contact-row" onClick={row.onClick} aria-label={row.label}>
                <img src={row.iconSrc} alt="" aria-hidden="true" className="dbc-contact-icon" loading="lazy" decoding="async" />
                <span className="dbc-contact-label">{row.label}</span>
              </button>
            ))}
          </div>

          <div className="dbc-actions" aria-label="Actions">
            <button type="button" className="dbc-action-btn" onClick={handleSaveContact} aria-label="Save contact">
              <img src={figmaAsset('Rectangle 69@3x.png')} alt="" aria-hidden="true" className="dbc-action-bg" loading="lazy" decoding="async" />
              <span className="dbc-action-text">Save contact</span>
            </button>
            <button type="button" className="dbc-action-btn" onClick={() => setShowQR(true)} aria-label="Show QR">
              <img src={figmaAsset('Rectangle 70@3x.png')} alt="" aria-hidden="true" className="dbc-action-bg" loading="lazy" decoding="async" />
              <span className="dbc-action-text">Show QR</span>
            </button>
            <button type="button" className="dbc-action-btn dbc-action-btn--gold" onClick={() => setShowLeadForm((prev) => !prev)} aria-label="Book now">
              <img src={figmaAsset('Rectangle 66@3x.png')} alt="" aria-hidden="true" className="dbc-action-bg" loading="lazy" decoding="async" />
              <span className="dbc-action-text dbc-action-text--gold">BOOK NOW</span>
            </button>
            <button type="button" className="dbc-action-btn" onClick={() => void addToHomeHint()} aria-label="Add to Home">
              <img src={figmaAsset('Rectangle 72@3x.png')} alt="" aria-hidden="true" className="dbc-action-bg" loading="lazy" decoding="async" />
              <span className="dbc-action-text">Add to Home</span>
            </button>
            <button type="button" className="dbc-action-btn" onClick={() => void handleShare()} aria-label="Share">
              <img src={figmaAsset('Rectangle 73@3x.png')} alt="" aria-hidden="true" className="dbc-action-bg" loading="lazy" decoding="async" />
              <span className="dbc-action-text">SHARE</span>
            </button>
          </div>

          <button
            type="button"
            className="dbc-admin-hitbox"
            onClick={() => {
              window.location.href = '/admin/login'
            }}
            aria-label="Admin panel"
          />
          </>)}
          </div>
        </div>

        {!loading && card && showLeadForm && (
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
