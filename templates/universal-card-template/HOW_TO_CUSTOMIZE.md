# Гид по кастомизации визитки

Скопировав шаблон в `projects/<client>/`, поменяйте только эти файлы:

---

## 1. Цвета бренда

**Файл:** `frontend/tailwind.config.js`

```js
primary: {
  50:  '#f0f9ff',   // очень светлый фон (hover-эффекты)
  100: '#e0f2fe',   // светлый фон (бейджи, теги)
  500: '#0ea5e9',   // основной цвет (кнопки, акценты)
  600: '#0284c7',   // hover-состояние кнопок
  700: '#0369a1',   // активное состояние / тёмный акцент
}
```

Генератор оттенков: https://www.tailwindshades.com/  
Готовые палитры: https://tailwindcss.com/docs/customizing-colors

Примеры для быстрой замены:

| Цвет | 50 | 100 | 500 | 600 | 700 |
|------|----|-----|-----|-----|-----|
| Violet | `#f5f3ff` | `#ede9fe` | `#8b5cf6` | `#7c3aed` | `#6d28d9` |
| Emerald | `#ecfdf5` | `#d1fae5` | `#10b981` | `#059669` | `#047857` |
| Rose | `#fff1f2` | `#ffe4e6` | `#f43f5e` | `#e11d48` | `#be123c` |
| Amber | `#fffbeb` | `#fef3c7` | `#f59e0b` | `#d97706` | `#b45309` |

---

## 2. Шрифты

**Файл:** `frontend/src/index.css`

```css
/* Заменить ссылку на нужный Google Font */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  --font-sans: 'Inter', sans-serif;  /* основной шрифт */
}
```

Популярные пары:
- `Inter` + `Merriweather` (современный + классический)
- `Montserrat` + `Open Sans` (заголовки + текст)
- `Playfair Display` + `Lato` (элегантный)

---

## 3. Переменные окружения

**Файл:** `backend/.env` (создать из `backend/.env.example`)

| Переменная | Обязательно | Описание |
|-----------|-------------|----------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Случайная строка ≥32 символов |
| `ADMIN_PIN` | ✅ | PIN для входа в админку |
| `ADMIN_EMAIL` | ✅ | Email администратора |
| `PORT` | — | По умолчанию 3000 |
| `CLOUDINARY_*` | — | Для хранения фото в облаке |
| `SMTP_*` | — | Для email-уведомлений о лидах |
| `TELEGRAM_BOT_TOKEN` | — | Для Telegram-уведомлений |
| `DEEPL_API_KEY` | — | Для авто-перевода контента (будущая фича) |

Сгенерировать JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 4. Контент визитки (через Админку)

После запуска зайдите на `/admin` и задайте через интерфейс:

- Имя, должность, компания, слоган
- Фото профиля и фото обложки
- Контакты: телефон, email, WhatsApp, Telegram, Instagram, сайт
- Адрес
- Секции услуг
- Изображения галереи

---

## 5. Локализация (RU/EN)

**Файлы:** `frontend/src/i18n/locales/ru.json` и `en.json`

Все тексты интерфейса уже переведены. Если нужно поменять подписи кнопок или разделов — правьте эти JSON-файлы.

---

## 6. Деплой на Railway

1. Создать новый Railway-проект
2. Добавить PostgreSQL-плагин
3. Деплоить `backend/` как Railway-сервис
4. Установить все env-переменные из `.env.example` в Railway → Variables
5. Frontend деплоить на Railway или Vercel: `cd frontend && npm run build`

---

## Чеклист перед запуском

- [ ] Цвета бренда изменены в `tailwind.config.js`
- [ ] `backend/.env` создан и заполнен
- [ ] `DATABASE_URL` указывает на рабочую БД
- [ ] `JWT_SECRET` — уникальная строка (не дефолтная!)
- [ ] `ADMIN_PIN` изменён (не `1111`)
- [ ] Миграции применены: `npm run db:migrate`  
- [ ] Тестовый вход в `/admin` работает
- [ ] Публичная карточка `/` отображает контент
