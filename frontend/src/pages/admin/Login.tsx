import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const PIN_LENGTH = 4
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

export default function Login() {
  const navigate = useNavigate()
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
      setError(err.response?.data?.error || 'Invalid PIN')
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

  return (
    <div className="admin-pin-page">
      <div className="admin-pin-glow admin-pin-glow--left" aria-hidden="true" />
      <div className="admin-pin-glow admin-pin-glow--right" aria-hidden="true" />

      <div className="admin-pin-card">
        <div className="text-center">
          <p className="admin-pin-badge">
            Secure Access
          </p>
          <h1 className="admin-pin-title">Admin Panel</h1>
          <p className="admin-pin-subtitle">Enter your 4-digit PIN code</p>
        </div>

        <div className={`admin-pin-display ${shake ? 'pin-shake' : ''}`}>
          <div className="admin-pin-dots" aria-label="PIN progress">
            {Array.from({ length: PIN_LENGTH }).map((_, index) => {
              const filled = index < pin.length
              return (
                <span
                  key={index}
                  className={`admin-pin-dot ${filled ? 'admin-pin-dot--filled' : ''}`}
                />
              )
            })}
          </div>

          <p className="admin-pin-masked" aria-live="polite">
            {'•'.repeat(pin.length)}
          </p>

          {error && (
            <div className="admin-pin-error">
              {error}
            </div>
          )}
        </div>

        <div className="admin-pin-keypad">
          {KEYS.slice(0, 9).map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => pushDigit(digit)}
              disabled={loading}
              className="pin-key"
              aria-label={`Digit ${digit}`}
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={clearPin}
            disabled={loading}
            className="pin-action-key"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => pushDigit('0')}
            disabled={loading}
            className="pin-key"
            aria-label="Digit 0"
          >
            0
          </button>

          <button
            type="button"
            onClick={deleteDigit}
            disabled={loading}
            className="pin-action-key"
          >
            Delete
          </button>
        </div>

        <div className="admin-pin-hint">
          {loading ? 'Checking PIN...' : 'Tap digits to enter PIN'}
        </div>
      </div>
    </div>
  )
}
