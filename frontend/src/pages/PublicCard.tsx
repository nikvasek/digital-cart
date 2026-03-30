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

const toExternalUrl = (url: string) => {
  if (!url) return url
  return /^[a-z][a-z\d+.-]*:/i.test(url) ? url : `https://${url}`
}

const formatPhone = (phone: string) => {
  const d = phone.replace(/\D/g, '')
  if (d.length === 12 && d.startsWith('375')) {
    return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`
  }
  return phone
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
    alert('Open browser menu and tap "Add to Home Screen". Link copied.')
  }

  const getLinkByType = (type: string) => {
    return card?.links?.find(
      (link) => link.is_visible && link.type.toLowerCase() === type.toLowerCase()
    )?.url
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

  /* ── Contact row definitions ─────────────────────────── */
  const contacts = [
    {
      id: 'phone',
      icon: '/figma/call.png',
      label: card ? formatPhone(card.phone) : '',
      onClick: openTel
    },
    {
      id: 'whatsapp',
      icon: '/figma/whatsapp.png',
      label: 'WhatsApp',
      onClick: () => openExternal('whatsapp', getLinkByType('whatsapp'))
    },
    {
      id: 'telegram',
      icon: '/figma/telegram.png',
      label: 'Telegram',
      onClick: () => openExternal('telegram', getLinkByType('telegram'))
    },
    {
      id: 'instagram',
      icon: '/figma/instagram.png',
      label: 'Instagram',
      onClick: () => openExternal('instagram', getLinkByType('instagram'))
    },
    {
      id: 'viber',
      icon: '/figma/viber.png',
      label: 'Viber',
      onClick: () => openExternal('viber', getLinkByType('viber'))
    },
    {
      id: 'email',
      icon: '/figma/email.png',
      label: 'Email',
      onClick: openEmail
    },
    {
      id: 'tiktok',
      icon: '/figma/tiktok.png',
      label: 'Tik tok',
      onClick: () => openExternal('tiktok', getLinkByType('tiktok'))
    },
    {
      id: 'gallery',
      icon: '/figma/gallery-1.png',
      label: t('gallery'),
      onClick: openGallery
    },
    {
      id: 'location',
      icon: '/figma/location.png',
      label: 'Kalvariyskaya 42',
      onClick: openLocation
    }
  ]

  /* ── Loading / error states ──────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30" />
      </div>
    )
  }

  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f]">
        <p className="text-xl text-gray-400">Card not found</p>
      </div>
    )
  }

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="mx-auto w-full max-w-[430px] min-h-screen relative overflow-hidden card-bg">
        {/* ── Language toggle ──────────────────────────── */}
        <div className="flex items-center justify-end gap-1 pt-5 pr-5">
          <button
            onClick={() => i18n.changeLanguage('ru')}
            className={`lang-btn ${
              i18n.language === 'ru' ? 'lang-btn--active' : 'lang-btn--inactive'
            }`}
          >
            RU
          </button>
          <span className="text-white/25 text-sm select-none">/</span>
          <button
            onClick={() => i18n.changeLanguage('en')}
            className={`lang-btn ${
              i18n.language === 'en' ? 'lang-btn--active' : 'lang-btn--inactive'
            }`}
          >
            ENG
          </button>
        </div>

        {/* ── Profile header ──────────────────────────── */}
        <div className="flex items-start gap-2 px-4 mt-1">
          {/* Left: avatar + name + tagline */}
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="avatar-wrap">
              <img
                src={card.avatar_url || '/figma/home-from-pdf.png'}
                alt={card.full_name}
                className="avatar-photo"
              />
              <img
                src="/figma/ramka-2x.png"
                alt=""
                className="avatar-frame"
                draggable={false}
              />
            </div>

            <h1 className="font-script text-[28px] text-white mt-1 whitespace-nowrap leading-tight">
              {card.full_name}
            </h1>
            <p className="font-script text-[#E87A2F] text-[15px] mt-0.5 leading-snug">
              {card.bio}
            </p>
          </div>

          {/* Right: service description */}
          <div className="flex-1 pt-8 pl-1">
            <h2 className="font-decorative text-[18px] text-white leading-snug text-center">
              {card.title}
            </h2>
          </div>
        </div>

        {/* ── Main content: contacts + actions ─────────── */}
        <div className="flex gap-3 px-4 mt-8">
          {/* Left column — contacts */}
          <div className="flex-1 min-w-0">
            {contacts.map((c) => (
              <button key={c.id} onClick={c.onClick} className="contact-row">
                <img src={c.icon} alt="" className="contact-icon" />
                <span className="truncate">{c.label}</span>
              </button>
            ))}
          </div>

          {/* Right column — action buttons */}
          <div className="w-[148px] flex-shrink-0 space-y-2.5 pt-6">
            <button onClick={handleSaveContact} className="action-btn">
              {t('saveContact')}
            </button>
            <button onClick={() => setShowQR(true)} className="action-btn">
              {t('showQR')}
            </button>
            <button
              onClick={() => setShowLeadForm((prev) => !prev)}
              className="action-btn-gold"
            >
              {t('bookNow')}
            </button>
            <button onClick={addToHomeHint} className="action-btn">
              {t('addToHome')}
            </button>
            <button
              onClick={() => void handleShare()}
              className="action-btn action-btn-uppercase"
            >
              {t('share')}
            </button>
          </div>
        </div>

        {/* ── Lead form (collapsible) ─────────────────── */}
        {showLeadForm && (
          <section className="mx-4 mt-6 rounded-2xl border border-white/10 bg-[#1a1a1a] p-5">
            <h2 className="mb-4 text-lg font-semibold">{t('leaveContact')}</h2>
            <form onSubmit={submitLead} className="space-y-3">
              <input
                type="text"
                name="name"
                placeholder={t('name')}
                required
                className="lead-input"
              />
              <input
                type="tel"
                name="phone"
                placeholder={t('phone')}
                required
                className="lead-input"
              />
              <input
                type="email"
                name="email"
                placeholder={t('email')}
                className="lead-input"
              />
              <label className="flex items-start gap-2 text-xs text-gray-300">
                <input
                  type="checkbox"
                  name="consent"
                  required
                  className="mt-0.5"
                />
                <span>{t('consent')}</span>
              </label>
              <button
                type="submit"
                className="w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-black"
              >
                {t('submit')}
              </button>
            </form>
          </section>
        )}

        {/* Bottom spacer */}
        <div className="h-32" />
      </div>

      {/* ── QR modal ──────────────────────────────────── */}
      {showQR && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowQR(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
                window.location.href
              )}`}
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
