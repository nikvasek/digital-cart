# 🚀 Быстрый старт

## Минимальная установка (5 минут)

### 1. Установите зависимости

```bash
# Если у вас уже установлены Node.js 18+ и Docker
cd /Users/Mac/Pyton/digital_cart/digital_cart

# Установить все зависимости
npm run install:all
```

### 2. Запустите базу данных

```bash
# Запустить PostgreSQL в Docker
docker-compose up -d
```

### 3. Настройте Backend

```bash
cd backend

# Создайте .env файл
cp .env.example .env

# Отредактируйте .env и укажите:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/digital_cards
# JWT_SECRET=your-secret-key-here-replace-with-random-string

# Запустите миграции и seed
npm run db:migrate
npm run db:seed

# Запустите backend
npm run dev
```

Оставьте терминал открытым, backend работает на порту 3000.

### 4. Запустите Frontend (в новом терминале)

```bash
cd frontend
npm run dev
```

Frontend работает на `http://localhost:5173`

### 5. Откройте в браузере

- **Тестовая визитка:** http://localhost:5173/paulline-ferreira
- **Админ-панель:** http://localhost:5173/admin/login
  - Email: `admin@example.com`
  - Password: `admin123`

---

## Альтернатива: Автоматический запуск

Если вы на Mac/Linux:

```bash
chmod +x start.sh
./start.sh
```

Этот скрипт автоматически:
- Запустит PostgreSQL
- Установит зависимости
- Запустит миграции
- Заполнит тестовыми данными
- Запустит frontend и backend

---

## Что дальше?

1. **Изучите визитку** на основе дизайна из Figma
2. **Зайдите в админку** и отредактируйте визитку
3. **Скачайте QR-код** для визитки
4. **Протестируйте vCard** - кнопка "Сохранить контакт"
5. **Отправьте лид** через форму "Book Now"
6. **Проверьте аналитику** в дашборде

---

## Проблемы?

### База данных не подключается
```bash
# Проверьте, что PostgreSQL запущен
docker ps

# Перезапустите
docker-compose restart
```

### Порт занят
```bash
# Измените порты в:
# - frontend/vite.config.ts (port: 5173)
# - backend/.env (PORT=3000)
```

### Ошибки миграции
```bash
# Удалите и создайте БД заново
docker-compose down -v
docker-compose up -d
sleep 5
cd backend && npm run db:migrate && npm run db:seed
```

---

## Структура проекта

```
digital_cart/
├── frontend/          # React + Vite + Tailwind
├── backend/           # Node.js + Fastify + PostgreSQL
├── figma/             # Дизайн-макеты
├── plan               # Техническая спецификация
├── docker-compose.yml # PostgreSQL
├── start.sh           # Скрипт автозапуска
└── README.md          # Полная документация
```

Подробная документация в [README.md](README.md)
