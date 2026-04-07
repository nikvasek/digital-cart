import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import axios from 'axios'

const PIN_LENGTH = 4
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export default function Login() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  const submitPin = async (pinValue: string) => {
    if (pinValue.length !== PIN_LENGTH || loading) return

    setError('')
    setLoading(true)

    try {
      const response = await axios.post('/api/auth/pin-login', {
        pin: pinValue
      })

      localStorage.setItem('token', response.data.token)
      navigate('/admin/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || t('login.errorInvalidPin'))
      setShake(true)
      setPin('')
      window.setTimeout(() => setShake(false), 360)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (pin.length === PIN_LENGTH) {
      void submitPin(pin)
    }
  }, [pin])

  const pushDigit = (digit: string) => {
    if (loading || pin.length >= PIN_LENGTH) return
    setError('')
    setPin((prev) => `${prev}${digit}`)
  }

  const deleteDigit = () => {
    if (loading || !pin.length) return
    setPin((prev) => prev.slice(0, -1))
  }

  const clearPin = () => {
    if (loading) return
    setPin('')
    setError('')
  }

  const toggleLang = () => {
    void i18n.changeLanguage(i18n.language === 'ru' ? 'en' : 'ru')
  }

  return (
    <div className="admin-pin-page">
      <div className="admin-pin-card">
        <button type="button" className="admin-pin-lang" onClick={toggleLang} aria-label="Switch language">
          {i18n.language === 'ru' ? 'EN' : 'RU'}
        </button>

        <h1 className="admin-pin-title">{t('login.title')}</h1>

        <div className={`admin-pin-display ${shake ? 'pin-shake' : ''}`} aria-live="polite">
          {Array.from({ length: PIN_LENGTH }).map((_, index) => (
            <span key={index} className="admin-pin-mask-char">
              {index < pin.length ? '*' : ''}
            </span>
          ))}
        </div>

        {error && (
          <div className="admin-pin-error">
            {error}
          </div>
        )}

        <div className="admin-pin-keypad">
          {KEYS.map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => pushDigit(digit)}
              disabled={loading}
              className="pin-key"
              aria-label={t('login.digitLabel', { digit })}
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={clearPin}
            disabled={loading}
            className="pin-key pin-key--blank"
            aria-label={t('login.clearPin')}
          />

          <button
            type="button"
            onClick={() => pushDigit('0')}
            disabled={loading}
            className="pin-key"
            aria-label={t('login.digitLabel', { digit: '0' })}
          >
            0
          </button>

          <button
            type="button"
            onClick={deleteDigit}
            disabled={loading}
            className="pin-key pin-key--delete"
            aria-label={t('login.deleteDigit')}
          >
            ⌫
          </button>
        </div>

        <div className="admin-pin-hint">
          {loading ? t('login.checking') : t('login.enterPin')}
        </div>
      </div>
    </div>
  )
}
