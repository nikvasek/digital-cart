# Новые проекты — инструкция

Каждый клиент получает свою папку здесь, скопированную из шаблона.

## Создать проект для нового клиента

```bash
# Из корня репозитория
cd /Users/Mac/Pyton/digital_cart

# 1. Скопировать шаблон (один раз)
cp -r templates/universal-card-template/ projects/<client-slug>
# Пример: cp -r templates/universal-card-template/ projects/ivan-petrov

# 2. Перейти в папку проекта
cd projects/<client-slug>

# 3. Создать .env из примера
cp backend/.env.example backend/.env

# 4. Заполнить .env
#    Обязательно: DATABASE_URL, JWT_SECRET, ADMIN_PIN, ADMIN_EMAIL
nano backend/.env

# 5. Поменять цвета под бренд клиента
#    Файл: frontend/tailwind.config.js  →  colors.primary
#    Подробнее: HOW_TO_CUSTOMIZE.md

# 6. Установить зависимости и запустить
cd backend && npm install && npm run db:migrate
cd ../frontend && npm install && npm run dev
```

## Структура папки проекта

```
projects/<client-slug>/
├── backend/
│   ├── .env          # ← создать из .env.example, НЕ коммитить
│   ├── .env.example  # ← шаблон переменных, коммитить
│   └── src/
├── frontend/
│   ├── tailwind.config.js   # ← цвета бренда
│   └── src/
├── docker-compose.yml
├── HOW_TO_CUSTOMIZE.md      # ← гид по кастомизации
└── QUICKSTART.md
```

## Коммитить только изменения своего проекта

```bash
cd /Users/Mac/Pyton/digital_cart

# Добавить только файлы конкретного проекта
git add projects/<client-slug>/
git commit -m "<client-slug>: описание изменений"
git push
```

## Уже созданные проекты

| Slug | Клиент | Статус |
|------|--------|--------|
| _(пусто)_ | — | — |

> Добавлять строки в таблицу при создании каждого нового проекта.
