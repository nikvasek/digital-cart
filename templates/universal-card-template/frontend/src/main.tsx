import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.tsx'
import './index.css'
import './i18n/config'

const API_BASE_URL = (
  import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? 'https://backend-production-24242.up.railway.app' : '')
).replace(/\/$/, '')

axios.defaults.baseURL = API_BASE_URL

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
