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
}

const socialIconMap: Record<string, string> = {
  instagram: '/figma/instagram.png',
  telegram: '/figma/telegram.png',
  whatsapp: '/figma/whatsapp.png',
  viber: '/figma/viber.png',
  tiktok: '/figma/tiktok.png'
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

  const loadCard = async () => {
    try {
      const response = await axios.get(`/api/public/card/${slug}`)
      setCard(response.data)
      i18n.changeLanguage(response.data.language_default)
      
      // Отправка события просмотра
      axios.post('/api/public/events', {
        card_id: response.data.id,
        event_type: 'view'
      })
    } catch (error) {
      console.error('Failed to load card:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveContact = () => {
    // Прямой переход на endpoint для скачивания vCard
    window.location.href = `/api/public/card/${slug}/vcard`
    
    // Отправка события
    axios.post('/api/public/events', {
      card_id: card?.id,
      event_type: 'save_vcard'
    })
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
      // Fallback: копирование в буфер
      navigator.clipboard.writeText(url)
      alert('Link copied to clipboard!')
    }
    
    axios.post('/api/public/events', {
      card_id: card?.id,
      event_type: 'share'
    })
  }

  const handleLinkClick = (type: string, url: string) => {
    axios.post('/api/public/events', {
      card_id: card?.id,
      event_type: 'click',
      metadata: { link_type: type }
    })
    window.open(url, '_blank')
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

  const galleryItems = card.media && card.media.length > 0
    ? card.media
    : [
        { file_url: '/figma/gallery-1.png', type: 'image' },
        { file_url: '/figma/gallery-2.png', type: 'image' },
        { file_url: '/figma/gallery-3.png', type: 'image' }
      ]

  return (
    <div className="min-h-screen bg-[#111111] text-white">
      <div className="mx-auto max-w-md px-4 py-6">
        <div className="mb-5 flex justify-end gap-2">
          <button
            onClick={() => i18n.changeLanguage('en')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              i18n.language === 'en' ? 'bg-white text-black' : 'bg-[#2a2a2a] text-white'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => i18n.changeLanguage('ru')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              i18n.language === 'ru' ? 'bg-white text-black' : 'bg-[#2a2a2a] text-white'
            }`}
          >
            RU
          </button>
        </div>

        <section className="rounded-3xl border border-white/10 bg-[#1a1a1a] p-5 shadow-2xl">
          <div className="text-center">
            <img
              src={card.avatar_url || '/figma/gallery-1.png'}
              alt={card.full_name}
              className="mx-auto mb-4 h-28 w-28 rounded-full object-cover"
            />
            <h1 className="text-2xl font-semibold">{card.full_name}</h1>
            <p className="mt-1 text-sm text-gray-300">{card.title}</p>
            {card.company_name && <p className="text-xs text-gray-400">{card.company_name}</p>}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              onClick={handleSaveContact}
              className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-black"
            >
              {t('saveContact')}
            </button>
            <button
              onClick={handleShare}
              className="rounded-full border border-white/30 px-3 py-2 text-sm font-semibold"
            >
              {t('share')}
            </button>
            <button
              onClick={() => setShowQR(!showQR)}
              className="rounded-full border border-white/30 px-3 py-2 text-sm font-semibold"
            >
              {t('showQR')}
            </button>
            <button
              onClick={() => setShowLeadForm(!showLeadForm)}
              className="rounded-full bg-[#2e2e2e] px-3 py-2 text-sm font-semibold"
            >
              {t('bookNow')}
            </button>
          </div>

          {showQR && (
            <div className="mt-4 rounded-2xl bg-white p-4 text-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${window.location.href}`}
                alt="QR Code"
                className="mx-auto"
              />
            </div>
          )}

          <div className="mt-5 space-y-2 text-sm">
            {card.phone && (
              <a href={`tel:${card.phone}`} className="flex items-center gap-3 rounded-xl bg-[#222] px-3 py-3">
                <img src="/figma/call.png" alt="phone" className="h-4 w-4" />
                <span>{card.phone}</span>
              </a>
            )}
            {card.email && (
              <a href={`mailto:${card.email}`} className="flex items-center gap-3 rounded-xl bg-[#222] px-3 py-3">
                <img src="/figma/email.png" alt="email" className="h-4 w-4" />
                <span>{card.email}</span>
              </a>
            )}
            {card.website && (
              <a
                href={card.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl bg-[#222] px-3 py-3"
              >
                <img src="/figma/location.png" alt="website" className="h-4 w-4" />
                <span className="truncate">{card.website}</span>
              </a>
            )}
          </div>

          {card.links && card.links.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {card.links
                .filter((link) => link.is_visible)
                .map((link, index) => {
                  const key = link.type.toLowerCase()
                  const icon = socialIconMap[key]
                  return (
                    <button
                      key={index}
                      onClick={() => handleLinkClick(link.type, link.url)}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-white"
                      aria-label={link.type}
                    >
                      {icon ? (
                        <img src={icon} alt={link.type} className="h-5 w-5" />
                      ) : (
                        <span className="text-xs font-semibold text-black uppercase">{link.type.slice(0, 2)}</span>
                      )}
                    </button>
                  )
                })}
            </div>
          )}
        </section>

        {card.bio && (
          <section className="mt-4 rounded-3xl border border-white/10 bg-[#1a1a1a] p-5">
            <h2 className="mb-2 text-lg font-semibold">{t('aboutMe')}</h2>
            <p className="whitespace-pre-wrap text-sm text-gray-300">{card.bio}</p>
          </section>
        )}

        <section className="mt-4 rounded-3xl border border-white/10 bg-[#1a1a1a] p-5">
          <h2 className="mb-3 text-lg font-semibold">{t('gallery')}</h2>
          <div className="grid grid-cols-2 gap-2">
            {galleryItems.slice(0, 8).map((item, index) => (
              <img
                key={index}
                src={item.file_url}
                alt={`Gallery ${index + 1}`}
                className="h-32 w-full rounded-xl object-cover"
              />
            ))}
          </div>
        </section>

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
    </div>
  )
}
