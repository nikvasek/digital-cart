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
    <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-[0_20px_70px_rgba(14,30,84,0.14)] border border-[#e6ecf8] p-6 sm:p-8">
        <div className="text-center">
          <p className="inline-flex items-center rounded-full bg-[#edf3ff] px-3 py-1 text-xs font-semibold tracking-[0.08em] text-[#2f5fd5] uppercase">
            Secure Access
          </p>
          <h1 className="mt-4 text-2xl sm:text-3xl font-semibold text-[#17223b]">Admin Panel</h1>
          <p className="mt-2 text-sm text-[#6f7c98]">Enter your 4-digit PIN code</p>
        </div>

        <div className={`mt-7 rounded-2xl border border-[#dde6f7] bg-[#f8fbff] p-4 sm:p-5 ${shake ? 'pin-shake' : ''}`}>
          <div className="flex items-center justify-center gap-3" aria-label="PIN progress">
            {Array.from({ length: PIN_LENGTH }).map((_, index) => {
              const filled = index < pin.length
              return (
                <span
                  key={index}
                  className={`h-3.5 w-3.5 rounded-full border transition-all duration-200 ${filled ? 'bg-[#2f5fd5] border-[#2f5fd5] scale-105' : 'bg-white border-[#b8c7e3]'}`}
                />
              )
            })}
          </div>

          <p className="mt-4 text-center text-base tracking-[0.45em] text-[#2b3b61] min-h-[24px]" aria-live="polite">
            {'•'.repeat(pin.length)}
          </p>

          {error && (
            <div className="mt-3 rounded-xl bg-[#fff1f2] border border-[#ffd3d8] px-3 py-2 text-center text-sm text-[#c2354e]">
              {error}
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 sm:gap-4">
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

        <div className="mt-5 text-center text-xs text-[#8b97b0]">
          {loading ? 'Checking PIN...' : 'Tap digits to enter PIN'}
        </div>
      </div>
    </div>
  )
}
