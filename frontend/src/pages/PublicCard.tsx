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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Языковой переключатель */}
      <div className="fixed top-4 right-4 flex gap-2 z-10">
        <button
          onClick={() => i18n.changeLanguage('en')}
          className={`px-3 py-1 rounded ${
            i18n.language === 'en' ? 'bg-black text-white' : 'bg-white text-black'
          }`}
        >
          EN
        </button>
        <button
          onClick={() => i18n.changeLanguage('ru')}
          className={`px-3 py-1 rounded ${
            i18n.language === 'ru' ? 'bg-black text-white' : 'bg-white text-black'
          }`}
        >
          RU
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Профиль */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="text-center">
            {card.avatar_url && (
              <img
                src={card.avatar_url}
                alt={card.full_name}
                className="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-4 border-gray-100"
              />
            )}
            <h1 className="text-3xl font-bold mb-2">{card.full_name}</h1>
            <p className="text-lg text-gray-600 mb-1">{card.title}</p>
            {card.company_name && (
              <p className="text-md text-gray-500 mb-4">{card.company_name}</p>
            )}
          </div>

          {/* Основные кнопки действий */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={handleSaveContact}
              className="bg-black text-white py-3 px-4 rounded-xl font-semibold hover:bg-gray-800 transition"
            >
              {t('saveContact')}
            </button>
            <button
              onClick={handleShare}
              className="bg-gray-200 text-black py-3 px-4 rounded-xl font-semibold hover:bg-gray-300 transition"
            >
              {t('share')}
            </button>
            <button
              onClick={() => setShowQR(!showQR)}
              className="bg-gray-200 text-black py-3 px-4 rounded-xl font-semibold hover:bg-gray-300 transition"
            >
              {t('showQR')}
            </button>
            <button
              onClick={() => setShowLeadForm(!showLeadForm)}
              className="bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 transition"
            >
              {t('bookNow')}
            </button>
          </div>

          {/* QR код */}
          {showQR && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl text-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${window.location.href}`}
                alt="QR Code"
                className="mx-auto"
              />
            </div>
          )}

          {/* Контактная информация */}
          <div className="mt-6 space-y-3">
            {card.phone && (
              <a
                href={`tel:${card.phone}`}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <span className="text-2xl">📞</span>
                <span>{card.phone}</span>
              </a>
            )}
            {card.email && (
              <a
                href={`mailto:${card.email}`}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <span className="text-2xl">✉️</span>
                <span>{card.email}</span>
              </a>
            )}
            {card.website && (
              <a
                href={card.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <span className="text-2xl">🌐</span>
                <span>{card.website}</span>
              </a>
            )}
          </div>

          {/* Ссылки на соцсети */}
          {card.links && card.links.length > 0 && (
            <div className="mt-6">
              <div className="flex flex-wrap gap-3 justify-center">
                {card.links
                  .filter((link) => link.is_visible)
                  .map((link, index) => (
                    <button
                      key={index}
                      onClick={() => handleLinkClick(link.type, link.url)}
                      className="px-4 py-2 bg-gray-100 rounded-full hover:bg-gray-200 transition capitalize"
                    >
                      {link.type}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* О себе */}
        {card.bio && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-3">{t('aboutMe')}</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{card.bio}</p>
          </div>
        )}

        {/* Галерея */}
        {card.media && card.media.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">{t('gallery')}</h2>
            <div className="grid grid-cols-2 gap-3">
              {card.media.map((item, index) => (
                <img
                  key={index}
                  src={item.file_url}
                  alt={`Gallery ${index + 1}`}
                  className="w-full h-40 object-cover rounded-lg"
                />
              ))}
            </div>
          </div>
        )}

        {/* Форма лидогенерации */}
        {showLeadForm && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">{t('leaveContact')}</h2>
            <form onSubmit={submitLead} className="space-y-4">
              <input
                type="text"
                name="name"
                placeholder={t('name')}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="tel"
                name="phone"
                placeholder={t('phone')}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="email"
                name="email"
                placeholder={t('email')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <label className="flex items-start gap-2">
                <input type="checkbox" name="consent" required className="mt-1" />
                <span className="text-sm text-gray-600">{t('consent')}</span>
              </label>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                {t('submit')}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
