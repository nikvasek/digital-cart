import { useEffect, useState } from 'react'
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
  website: string
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
  phone: '+375292327382',
  email: 'paulline@example.com',
  website: 'kalvariyskaya42.by',
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

const toExternalUrl = (url: string) => {
  if (!url) return url
  return /^[a-z][a-z\d+.-]*:/i.test(url) ? url : `https://${url}`
}

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
    trackEvent('click', { link_type: 'location' })
    window.location.href = 'https://maps.google.com/?q=Kalvariyskaya+42+Minsk'
  }

  const openGallery = () => {
    trackEvent('click', { link_type: 'gallery' })
    // TODO: open gallery modal when media items available
  }

  const addToHomeHint = async () => {
    await navigator.clipboard.writeText(window.location.href)
    alert('Open browser menu and tap “Add to Home Screen”. Link copied.')
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

  const hotspots: Hotspot[] = [
    /* ── Contact / social rows (left side, top→bottom) ──── */
    { id: 'phone-row', onClick: openTel, label: 'Call phone' },
    {
      id: 'whatsapp',
      onClick: () => openExternal('whatsapp', getLinkByType('whatsapp')),
      label: 'WhatsApp'
    },
    {
      id: 'telegram',
      onClick: () => openExternal('telegram', getLinkByType('telegram')),
      label: 'Telegram'
    },
    {
      id: 'instagram',
      onClick: () => openExternal('instagram', getLinkByType('instagram')),
      label: 'Instagram'
    },
    {
      id: 'viber',
      onClick: () => openExternal('viber', getLinkByType('viber')),
      label: 'Viber'
    },
    { id: 'email-row', onClick: openEmail, label: 'Send email' },
    {
      id: 'tiktok',
      onClick: () => openExternal('tiktok', getLinkByType('tiktok')),
      label: 'TikTok'
    },
    { id: 'gallery', onClick: openGallery, label: 'Gallery' },
    { id: 'web-row', onClick: openLocation, label: 'Kalvariyskaya 42' },

    /* ── Action buttons (right side) ──────────────────────── */
    { id: 'save-contact', onClick: handleSaveContact, label: 'Save contact' },
    { id: 'show-qr', onClick: () => setShowQR(true), label: 'Show QR' },
    {
      id: 'book-now',
      onClick: () => setShowLeadForm((prev) => !prev),
      label: 'Book now'
    },
    { id: 'add-home', onClick: addToHomeHint, label: 'Add to Home' },
    { id: 'share', onClick: () => void handleShare(), label: 'Share' }
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
      <div className="mx-auto w-full max-w-[430px]">
        <div className="home-card-frame relative w-full overflow-hidden">
          <img
            src="/figma/home2-1x.png"
            srcSet="/figma/home2-1x.png 1x, /figma/home2-2x.png 2x, /figma/home2-3x.png 3x"
            alt="Business card"
            className="h-full w-full select-none"
            draggable={false}
            style={{ display: 'block' }}
          />

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
