import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { CSSProperties } from 'react'
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
  keyId: string
  label: string
  iconSrc?: string
  iconMask?: string
  onClick: () => void
}

type SocialIconItem = {
  id: string
  keyId: string
  order: number
  label: string
  icon: string
  color: string
  light?: boolean
  onClick: () => void
}

const figmaAsset = (name: string) => encodeURI(`/figma/${name}`)
const avatarFallbackSrc = figmaAsset('Снимок экрана 2026-03-26 в 15.46.46 1@3x.webp')
const heroBgRightSrc = figmaAsset('My First Weavy_Gemini 3 (Nano Banana Pro)_2026-03-28_19-51-14 1@3x.webp')

const PHONE_TYPES = ['phone', 'mobile', 'office', 'home']

const CONTACT_ICON_FIGMA: Record<string, string> = {
  phone: figmaAsset('call_1062678 1@3x.png'),
  mobile: figmaAsset('call_1062678 1@3x.png'),
  office: figmaAsset('call_1062678 1@3x.png'),
  home: figmaAsset('call_1062678 1@3x.png'),
  whatsapp: figmaAsset('whatsapp_739247 1@3x.png'),
  telegram: figmaAsset('telegram 1@3x.png'),
  instagram: figmaAsset('instagram_739244 1@3x.png'),
  viber: figmaAsset('viber_2190481 1@3x.png'),
  email: figmaAsset('email_347722 1@3x.png'),
  tiktok: figmaAsset('tik-tok 1@3x.png'),
  gallery: figmaAsset('image 13@3x.png'),
  location: figmaAsset('placeholder_1180413 1@3x.png')
}

const CONTACT_LABELS: Record<string, string> = {
  phone: 'Mobile',
  mobile: 'Mobile',
  office: 'Office',
  home: 'Home',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  instagram: 'Instagram',
  email: 'Email',
  gallery: 'Gallery',
  location: 'Location'
}

const SOCIAL_ICON_FILE: Record<string, { file: string; color: string; light?: boolean }> = {
  phone: { file: '/icons/call.svg', color: '#22c55e' },
  mobile: { file: '/icons/call.svg', color: '#22c55e' },
  office: { file: '/icons/call.svg', color: '#22c55e' },
  home: { file: '/icons/call.svg', color: '#22c55e' },
  email: { file: '/icons/email.svg', color: '#ea4335' },
  website: { file: '/icons/website.svg', color: '#7c3aed' },
  location: { file: '/icons/location.svg', color: '#ff3b30' },
  whatsapp: { file: '/icons/whatsapp.svg', color: '#25d366' },
  telegram: { file: '/icons/telegram.svg', color: '#2aabee' },
  instagram: { file: '/icons/instagram.svg', color: '#f77737' },
  viber: { file: '/icons/viber.svg', color: '#7360f2' },
  tiktok: { file: '/icons/tiktok.svg', color: '#00f2ea' },
  youtube: { file: '/icons/youtube.svg', color: '#ff0000' },
  vk: { file: '/icons/vk.svg', color: '#4a76a8' },
  twitter: { file: '/icons/twitter.svg', color: '#1d9bf0' },
  facebook: { file: '/icons/facebook.svg', color: '#1877f2' },
  linkedin: { file: '/icons/linkedin.svg', color: '#0a66c2' },
  gallery: { file: '/icons/gallery.svg', color: '#9ca3af' },
  appstore: { file: '/icons/appstore.svg', color: '#147efb' },
  playstore: { file: '/icons/playstore.svg', color: '#34a853' }
}


const resolveAvatarSrc = (value?: string) => {
  const avatarUrl = (value || '').trim()
  if (!avatarUrl) return avatarFallbackSrc

  // Guard against accidentally using full-card background as avatar image.
  const invalidAvatarMarkers = ['/figma/home-1x.png', '/figma/home-from-pdf.png', '/figma/home-from-pdf.webp', 'My First Weavy_Gemini']
  if (invalidAvatarMarkers.some((marker) => avatarUrl.includes(marker))) {
    return avatarFallbackSrc
  }

  return resolveMediaUrl(avatarUrl)
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

const toExternalUrl = (url: string) => {
  if (!url) return url
  if (url.startsWith('/')) return resolveMediaUrl(url)
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

const toCompactAddress = (value: string) => {
  const raw = normalizeAddress(value)
  if (!raw) return ''

  const parts = raw
    .split(',')
    .map((part) => normalizeAddress(part))
    .filter(Boolean)

  if (parts.length <= 2) return parts.join(', ')

  const street = parts[0]
  const country = parts[parts.length - 1]
  const middle = parts.slice(1, -1)
  const cityOrVillage = middle[0] || ''

  return [street, cityOrVillage, country].filter(Boolean).join(', ')
}

const parseAddressField = (value: string): { label: string; mapsUrl: string } => {
  const trimmed = value.trim()
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const u = new URL(trimmed)
      const placeMatch = u.pathname.match(/\/maps\/place\/([^/@]+)/)
      if (placeMatch) {
        return { label: decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')), mapsUrl: trimmed }
      }
      const q = u.searchParams.get('q')
      if (q) return { label: q, mapsUrl: trimmed }
    } catch { /* not a URL */ }
  }
  return { label: trimmed, mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(trimmed)}` }
}

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
  const [locationModal, setLocationModal] = useState<{ label: string; mapsUrl: string; embedUrl: string } | null>(null)
  const [showMoreContacts, setShowMoreContacts] = useState(false)
  const [showServicesMode, setShowServicesMode] = useState(false)
  const [showGalleryMode, setShowGalleryMode] = useState(false)
  const [galleryPreviewUrl, setGalleryPreviewUrl] = useState<string | null>(null)
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

  const getFirstLinkByTypes = (types: string[]) => {
    return card?.links?.find((link) => link.is_visible && types.includes((link.type || '').toLowerCase()))
  }

  const getSocialIcon = (type: string) => {
    const key = type.toLowerCase()
    if (SOCIAL_ICON_FILE[key]) return SOCIAL_ICON_FILE[key]
    if (key === 'opencollective') return { file: '/icons/open-collective.svg', color: '#297adc' }
    if (key === 'buymeacoffee') return { file: '/icons/buymeacoffee.svg', color: '#ffdd00', light: true }
    if (key === 'cashapp') return { file: '/icons/cashapp.svg', color: '#00d632' }
    if (key === 'yelp') return { file: '/icons/yelp.svg', color: '#d32323' }
    if (key === 'peertube') return { file: '/icons/peertube.svg', color: '#f1680d' }
    if (key === 'funkwhale') return { file: '/icons/funkwhale.svg', color: '#009fe3' }
    return { file: `/icons/${key}.svg`, color: '#f8f8f8' }
  }

  const openExternal = (type: string, url?: string) => {
    if (!url) return
    trackEvent('click', { link_type: type })
    window.location.href = toExternalUrl(url)
  }

  const openByType = (type: string, url: string) => {
    if (!url) return
    const t = type.toLowerCase()
    if (PHONE_TYPES.includes(t)) {
      const raw = url.replace(/^tel:/i, '').trim()
      const digitsOnly = raw.replace(/\D/g, '')
      const formatted = raw.startsWith('+') ? raw.replace(/\s+/g, '') : `+${digitsOnly}`
      openExternal('phone', `tel:${formatted}`)
      return
    }
    if (t === 'location') {
      const parsed = parseAddressField(url)
      const compactLabel = toCompactAddress(parsed.label)
      trackEvent('click', { link_type: 'location' })
      setLocationModal({
        label: compactLabel || parsed.label,
        mapsUrl: parsed.mapsUrl,
        embedUrl: `https://www.google.com/maps?q=${encodeURIComponent(parsed.label)}&output=embed`
      })
      return
    }
    openExternal(t, url)
  }

  const openGallery = () => {
    trackEvent('click', { link_type: 'gallery' })
    if (galleryImages.length > 0) {
      setShowServicesMode(false)
      setShowMoreContacts(false)
      setShowGalleryMode(true)
      return
    }

    const galleryLink = getFirstLinkByTypes(['gallery'])
    if (galleryLink?.url) {
      window.location.href = toExternalUrl(galleryLink.url)
      return
    }
    if (card?.portfolio_url) {
      window.location.href = toExternalUrl(card.portfolio_url)
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

  const galleryImages = useMemo(() => {
    if (!card) return [] as string[]
    return (card.media || [])
      .filter((item) => (item.type || 'image').toLowerCase() === 'image' && item.file_url)
      .map((item) => resolveMediaUrl(item.file_url))
      .filter(Boolean)
  }, [card])

  const contactRows = useMemo(() => {
    if (!card) return [] as ContactRow[]
    const visibleLinks = (card.links || []).filter((link) => link?.is_visible && link?.url)
      .map((link, index) => ({ ...link, type: (link.type || '').toLowerCase(), _idx: index }))

    const consumed = new Set<number>()

    const rowFromLink = (link: { type: string; url: string; _idx: number }): ContactRow => {
      let label = CONTACT_LABELS[link.type] || link.type.charAt(0).toUpperCase() + link.type.slice(1)

      if (PHONE_TYPES.includes(link.type)) {
        label = formatPhoneDisplay(link.url.replace(/^tel:/i, '').trim())
      } else if (link.type === 'email') {
        label = link.url.replace(/^mailto:/i, '').trim() || 'Email'
      } else if (link.type === 'location') {
        label = toCompactAddress(parseAddressField(link.url).label)
      }

      const onClick = () => {
        if (link.type === 'gallery') {
          openGallery()
          return
        }
        openByType(link.type, link.url)
      }

      const iconSrc = CONTACT_ICON_FIGMA[link.type]
      return {
        id: link.type,
        keyId: `${link.type}-${link._idx}`,
        label,
        iconSrc,
        iconMask: iconSrc ? undefined : `/icons/${link.type}.svg`,
        onClick
      }
    }

    const phones: Array<{ type: string; url: string; _idx: number }> = []
    for (const type of PHONE_TYPES) {
      for (const link of visibleLinks) {
        if (link.type === type) {
          consumed.add(link._idx)
          phones.push(link)
        }
      }
    }

    const takeFirst = (type: string) => {
      const found = visibleLinks.find((link) => !consumed.has(link._idx) && link.type === type)
      if (!found) return null
      consumed.add(found._idx)
      return found
    }

    const gallery = takeFirst('gallery')
    const whatsapp = takeFirst('whatsapp')
    const telegram = takeFirst('telegram')
    const email = takeFirst('email')
    const instagram = takeFirst('instagram')
    const location = takeFirst('location')

    const additional = visibleLinks.filter((link) => !consumed.has(link._idx))

    const orderedWithoutLocation = [
      ...phones,
      ...(gallery ? [gallery] : []),
      ...(whatsapp ? [whatsapp] : []),
      ...(telegram ? [telegram] : []),
      ...(email ? [email] : []),
      ...(instagram ? [instagram] : []),
      ...additional
    ]

    const maxMain = location ? 6 : 7
    const mainLinks = orderedWithoutLocation.slice(0, maxMain)
    if (location) {
      mainLinks.push(location)

      const galleryInMainIndex = mainLinks.findIndex((link) => link.type === 'gallery')
      const locationIndex = mainLinks.findIndex((link) => link.type === 'location')
      if (galleryInMainIndex !== -1 && locationIndex !== -1 && galleryInMainIndex !== locationIndex - 1) {
        const [galleryLink] = mainLinks.splice(galleryInMainIndex, 1)
        const nextLocationIndex = mainLinks.findIndex((link) => link.type === 'location')
        mainLinks.splice(nextLocationIndex, 0, galleryLink)
      }
    }

    return mainLinks.map(rowFromLink)
  }, [card])

  const socialIconItems = useMemo<SocialIconItem[]>(() => {
    if (!card) return []

    const items: SocialIconItem[] = []
    const pushItem = (id: string, keyId: string, order: number, label: string, onClick: () => void) => {
      const meta = getSocialIcon(id)
      items.push({ id, keyId, order, label, onClick, icon: meta.file, color: meta.color, light: meta.light })
    }

    for (let idx = 0; idx < (card.links || []).length; idx++) {
      const link = card.links[idx]
      if (!link?.type || !link?.url) continue
      if (link.is_visible === false) continue
      const type = link.type.toLowerCase()
      pushItem(type, `${type}-${idx}`, idx, type, () => {
        if (type === 'gallery') {
          openGallery()
          return
        }
        openByType(type, link.url)
      })
    }

    return items.sort((a, b) => a.order - b.order)
  }, [card])

  const servicesList = useMemo(() => {
    if (!card) return []
    return (card.services || []).filter((service) => service?.is_visible !== false && (service.title || service.description))
  }, [card])

  const showAltMode = showMoreContacts || showServicesMode || showGalleryMode

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
              <div className={`dbc-bg-left${showAltMode ? ' dbc-bg-left--plain' : ''}`} aria-hidden="true" />

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

              {contactRows.length > 0 && (
              <div className={`dbc-contacts${showAltMode ? ' dbc-home-mode--hidden' : ''}`} aria-label="Contacts">
                {contactRows.map((row) => (
                  <button key={row.keyId} type="button" className="dbc-contact-row" onClick={row.onClick} aria-label={row.label}>
                    {row.iconSrc ? (
                      <img src={row.iconSrc} alt="" aria-hidden="true" className="dbc-contact-icon" loading="lazy" decoding="async" />
                    ) : (
                      <span
                        className="dbc-contact-icon dbc-contact-icon-mask"
                        style={{
                          WebkitMaskImage: `url(${row.iconMask})`,
                          maskImage: `url(${row.iconMask})`
                        } as CSSProperties}
                      />
                    )}
                    <span className={`dbc-contact-label${row.id === 'location' ? ' dbc-contact-label--wrap' : ''}`}>{row.label}</span>
                  </button>
                ))}
                {socialIconItems.length > 0 && (
                  <button
                    type="button"
                    className="dbc-more-contact"
                    onClick={() => {
                      setShowGalleryMode(false)
                      setShowServicesMode(false)
                      setShowMoreContacts(true)
                    }}
                    aria-label="More contact"
                  >
                    More contact...
                  </button>
                )}
              </div>
              )}

              <div className={`dbc-home-mode${showAltMode ? ' dbc-home-mode--hidden' : ''}`}>
                <div className="dbc-actions" aria-label="Actions">
                <button type="button" className="dbc-action-btn" onClick={handleSaveContact} aria-label="Save contact">
                  <img src={figmaAsset('Rectangle 69@3x.png')} alt="" aria-hidden="true" className="dbc-action-bg" loading="lazy" decoding="async" />
                  <span className="dbc-action-text">Save contact</span>
                </button>
                {servicesList.length > 0 && (
                <button
                  type="button"
                  className="dbc-action-btn"
                  onClick={() => {
                    setShowGalleryMode(false)
                    setShowMoreContacts(false)
                    setShowServicesMode(true)
                  }}
                  aria-label="Services"
                >
                  <img src={figmaAsset('Rectangle 70@3x.png')} alt="" aria-hidden="true" className="dbc-action-bg" loading="lazy" decoding="async" />
                  <span className="dbc-action-text">Services</span>
                </button>
                )}
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
              </div>

              <div className={`dbc-social-mode${showMoreContacts ? ' is-active' : ''}`} aria-hidden={!showMoreContacts}>
                <button
                  type="button"
                  className="dbc-social-back"
                  onClick={() => setShowMoreContacts(false)}
                  aria-label="Back"
                >
                  ←
                </button>

                <div className="dbc-social-grid" aria-label="Social links">
                  {socialIconItems.map((item) => (
                    <button
                      key={item.keyId}
                      type="button"
                      className={`dbc-social-item${item.light ? ' is-light' : ''}`}
                      onClick={item.onClick}
                      aria-label={item.label}
                    >
                      <span
                        className="dbc-social-icon-mask"
                        style={{
                          WebkitMaskImage: `url(${item.icon})`,
                          maskImage: `url(${item.icon})`,
                          backgroundColor: item.color
                        } as CSSProperties}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className={`dbc-gallery-mode${showGalleryMode ? ' is-active' : ''}`} aria-hidden={!showGalleryMode}>
                <button
                  type="button"
                  className="dbc-social-back"
                  onClick={() => {
                    setShowGalleryMode(false)
                    setGalleryPreviewUrl(null)
                  }}
                  aria-label="Back"
                >
                  ←
                </button>

                <div className="dbc-gallery-grid" aria-label="Gallery photos">
                  {galleryImages.map((src, idx) => (
                    <button
                      key={`${src}-${idx}`}
                      type="button"
                      className="dbc-gallery-item"
                      onClick={() => setGalleryPreviewUrl(src)}
                    >
                      <img src={src} alt={`Gallery ${idx + 1}`} loading="lazy" decoding="async" />
                    </button>
                  ))}
                </div>
              </div>

              <div className={`dbc-services-mode${showServicesMode ? ' is-active' : ''}`} aria-hidden={!showServicesMode}>
                <button
                  type="button"
                  className="dbc-social-back"
                  onClick={() => setShowServicesMode(false)}
                  aria-label="Back"
                >
                  ←
                </button>

                <div className="dbc-services-list" aria-label="Services">
                  {servicesList.map((service, idx) => (
                    <article key={`${service.title}-${idx}`} className="dbc-service-item">
                      <h4>{service.title || 'Service'}</h4>
                      {service.description && <p>{service.description}</p>}
                    </article>
                  ))}
                </div>
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

      {locationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setLocationModal(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-200 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">{locationModal.label || 'Location'}</p>
            </div>

            <iframe
              title="Location map"
              src={locationModal.embedUrl}
              className="h-[320px] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />

            <div className="flex gap-2 border-t border-gray-200 p-3">
              <button
                type="button"
                className="flex-1 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white"
                onClick={() => setLocationModal(null)}
              >
                Закрыть
              </button>
              <button
                type="button"
                className="flex-1 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900"
                onClick={() => {
                  window.location.href = locationModal.mapsUrl
                }}
              >
                Открыть в картах
              </button>
            </div>
          </div>
        </div>
      )}

      {galleryPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setGalleryPreviewUrl(null)}>
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-2" onClick={(e) => e.stopPropagation()}>
            <img src={galleryPreviewUrl} alt="Gallery preview" className="h-auto w-full rounded-xl" />
          </div>
        </div>
      )}
    </div>
  )
}
