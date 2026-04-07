import { useTranslation } from 'react-i18next'

export default function NotFound() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">{t('notFound.title')}</p>
        <a
          href="/"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {t('notFound.goHome')}
        </a>
      </div>
    </div>
  )
}
