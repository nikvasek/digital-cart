# digital_cart — Monorepo цифровых визиток

Монорепозиторий для создания и управления цифровыми визитными карточками.  
Один шаблон — множество проектов, каждый в своей папке.

## Структура репозитория

```
digital_cart/
├── templates/
│   └── universal-card-template/   # Базовый шаблон — НЕ изменять напрямую
│       ├── backend/                # Fastify + PostgreSQL + TypeScript
│       ├── frontend/               # React 18 + Vite + TailwindCSS + i18next
│       ├── design/                 # Figma-ассеты
│       ├── HOW_TO_CUSTOMIZE.md    # Гид по кастомизации
│       └── ...
├── projects/
│   ├── README.md                  # Инструкция по созданию нового проекта
│   └── <client-name>/             # Каждый клиент — отдельная папка
└── README.md                      # Этот файл
```

## Быстрый старт нового проекта

```bash
# 1. Скопировать шаблон
cp -r templates/universal-card-template/ projects/my-client

# 2. Настроить (см. HOW_TO_CUSTOMIZE.md внутри папки)
cd projects/my-client
cp backend/.env.example backend/.env
# Отредактировать .env и tailwind.config.js

# 3. Закоммитить только этот проект
cd /Users/Mac/Pyton/digital_cart
git add projects/my-client/
git commit -m "my-client: init project"
git push
```

## Принцип работы

| Папка | Назначение |
|-------|-----------|
| `templates/` | Эталонный шаблон. Обновлять только если улучшения нужны всем. |
| `projects/` | Рабочие проекты. Каждый независим, можно коммитить отдельно. |

## Коммиты по проектам

```bash
# Обновить только один проект
git add projects/my-client/
git commit -m "my-client: update services section"
git push

# Обновить шаблон
git add templates/universal-card-template/
git commit -m "template: add DeepL translation support"
git push
```

## Технологический стек

- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS + i18next (RU/EN)
- **Backend**: Fastify 4 + PostgreSQL + TypeScript
