# Digital Business Card Platform 💼

Современная SaaS-платформа цифровых визиток с поддержкой PWA, vCard, QR-кодов и аналитики.

## 🎯 Возможности MVP

### Публичная визитка
- ✅ Адаптивный дизайн (mobile-first)
- ✅ Фото, контакты, биография
- ✅ Ссылки на соцсети и мессенджеры
- ✅ Галерея изображений
- ✅ Сохранение контакта (vCard)
- ✅ Кнопка "Поделиться"
- ✅ QR-код для быстрого доступа
- ✅ Мультиязычность (RU/EN)
- ✅ PWA (Progressive Web App)

### Админ-панель
- ✅ Авторизация с JWT
- ✅ Редактирование визитки
- ✅ Генерация и скачивание QR-кода
- ✅ Просмотр аналитики (просмотры, клики, сохранения, лиды)
- ✅ Управление лидами

### Лидогенерация
- ✅ Форма захвата контактов
- ✅ GDPR consent checkbox
- ✅ Уведомления владельцу

### Аналитика
- ✅ Отслеживание просмотров
- ✅ Отслеживание кликов по ссылкам
- ✅ Отслеживание сохранений vCard
- ✅ Отслеживание лидов

## 🛠 Технологический стек

### Frontend
- **React 18** - UI библиотека
- **Vite** - Сборщик и dev-сервер
- **TypeScript** - Типизация
- **Tailwind CSS** - Стилизация
- **React Router** - Роутинг
- **i18next** - Интернационализация
- **Axios** - HTTP клиент
- **Vite PWA** - Progressive Web App

### Backend
- **Node.js** (TypeScript) - Runtime
- **Fastify** - Web framework
- **PostgreSQL** - База данных
- **JWT** - Аутентификация
- **bcrypt** - Хеширование паролей
- **QRCode** - Генерация QR-кодов
- **vCard Creator** - Генерация vCard файлов

## 📦 Установка и запуск

### Предварительные требования

- Node.js 18+
- PostgreSQL 14+
- npm или yarn

### 1. Клонирование репозитория

```bash
cd /Users/Mac/Pyton/digital_cart/digital_cart
```

### 2. Запуск PostgreSQL

Вариант А: Docker (рекомендуется)
```bash
docker-compose up -d
```

Вариант Б: Локальная установка PostgreSQL
```bash
createdb digital_cards
```

### 3. Настройка Backend

```bash
cd backend

# Установка зависимостей
npm install

# Копирование .env файла
cp .env.example .env

# Редактирование .env (укажите DATABASE_URL и JWT_SECRET)
nano .env

# Запуск миграций
npm run db:migrate

# Заполнение тестовыми данными
npm run db:seed

# Запуск в режиме разработки
npm run dev
```

Backend будет доступен на `http://localhost:3000`

### 4. Настройка Frontend

```bash
cd frontend

# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev
```

Frontend будет доступен на `http://localhost:5173`

## Figma Site Pull

Если Figma даёт только `site`-ссылку, можно обновить превью-ассеты так:

```bash
FIGMA_SITE_URL="https://embed.figma.com/site/..." \
FIGMA_SITE_NODE_IDS="0:3,1:8" \
npm run figma:pull
```

Что делает команда:
- сохраняет изображения узлов в `frontend/public/figma/site-pull/node-<id>.png`
- обновляет `frontend/public/figma/home-from-pdf.png` первым узлом (по умолчанию)

Опционально:
- `FIGMA_SITE_SYNC_PRIMARY=false` — не трогать `home-from-pdf.png`
- `FIGMA_SITE_PRIMARY_TARGET=frame-home.png` — выбрать другой целевой файл

## 🧪 Тестовые данные

После запуска `npm run db:seed`:

**Админ-панель:**
- Email: `admin@example.com`
- Password: `admin123`

**Тестовая визитка:**
- URL: `http://localhost:5173/paulline-ferreira`

## 📁 Структура проекта

```
digital_cart/
├── frontend/                 # React приложение
│   ├── src/
│   │   ├── pages/           # Страницы
│   │   │   ├── PublicCard.tsx    # Публичная визитка
│   │   │   ├── NotFound.tsx
│   │   │   └── admin/              # Админ-панель
│   │   │       ├── Login.tsx
│   │   │       ├── Dashboard.tsx
│   │   │       └── Editor.tsx
│   │   ├── i18n/            # Интернационализация
│   │   │   ├── config.ts
│   │   │   └── locales/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                  # Node.js API
│   ├── src/
│   │   ├── routes/          # API маршруты
│   │   │   ├── public.ts    # Публичные API
│   │   │   ├── auth.ts      # Авторизация
│   │   │   └── admin.ts     # Админ API
│   │   ├── db/              # База данных
│   │   │   ├── index.ts
│   │   │   ├── schema.sql   # SQL схема
│   │   │   ├── migrate.ts
│   │   │   └── seed.ts
│   │   ├── utils/           # Утилиты
│   │   │   └── vcard.ts     # Генерация vCard
│   │   ├── config/
│   │   │   └── index.ts
│   │   └── index.ts         # Точка входа
│   ├── package.json
│   └── tsconfig.json
│
├── figma/                    # Дизайн-макеты
├── plan                      # Техническая спецификация
└── docker-compose.yml        # Docker для PostgreSQL
```

## 🔑 API Endpoints

### Публичные (без авторизации)

```
GET  /api/public/card/:slug              # Получить визитку
GET  /api/public/card/:slug/vcard        # Скачать vCard
POST /api/public/card/:slug/lead         # Отправить лид
POST /api/public/events                  # Записать событие аналитики
```

### Авторизация

```
POST /api/auth/login                     # Вход
POST /api/auth/register                  # Регистрация
GET  /api/auth/me                        # Текущий пользователь
```

### Админ (требуется авторизация)

```
GET    /api/admin/cards                  # Список визиток
GET    /api/admin/card/:id               # Одна визитка
PATCH  /api/admin/card/:id               # Обновить визитку
GET    /api/admin/card/:id/qr            # Скачать QR-код
GET    /api/admin/analytics              # Общая аналитика
GET    /api/admin/card/:id/analytics     # Аналитика визитки
GET    /api/admin/card/:id/leads         # Список лидов
```

## � База данных

### Основные таблицы

- `users` - Пользователи/владельцы визиток
- `cards` - Визитки
- `card_links` - Ссылки на соцсети/мессенджеры
- `card_media` - Галерея изображений
- `leads` - Контакты от посетителей
- `events` - События для аналитики

Полная схема в файле `backend/src/db/schema.sql`

## 🚀 Деплой

### Frontend (Vercel/Netlify)

```bash
cd frontend
npm run build
# Загрузите папку dist/
```

### Backend (Railway/Render/Heroku)

```bash
cd backend
npm run build
# Настройте DATABASE_URL в переменных окружения
npm start
```

### База данных

Рекомендуется использовать managed PostgreSQL:
- Supabase
- Railway
- Render PostgreSQL
- AWS RDS

## 📋 Roadmap

### Этап 2 (в разработке)
- [ ] Apple Wallet / Google Wallet passes
- [ ] Офлайн-режим (Service Worker + IndexedDB)
- [ ] PWA установка на главный экран
- [ ] Telegram-интеграция для уведомлений
- [ ] Загрузка файлов (S3/Cloudflare R2)

### Этап 3 (планируется)
- [ ] Подписочная модель (Stripe)
- [ ] B2B multi-tenant (компании/сотрудники)
- [ ] Массовый импорт (CSV/XLSX)
- [ ] White-label решение
- [ ] CRM-интеграции

## 📝 Лицензия

MIT

## 👨‍💻 Разработка

Проект следует техническому плану из файла `plan`.

Основные принципы:
- Mobile-first дизайн
- GDPR compliance
- Performance (<1.8s загрузка)
- Безопасность (HTTPS, JWT, rate limiting)
- Масштабируемость (готовность к SaaS)

## 🐛 Баг-репорты и предложения

Создайте issue в репозитории с описанием проблемы или предложения.

## 📞 Контакты

Email: support@digitalcard.example
