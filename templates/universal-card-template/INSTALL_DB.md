# ⚠️ Требуется установка PostgreSQL

## Для macOS

### Вариант 1: Homebrew (рекомендуется)

```bash
# Установить Homebrew (если еще не установлен)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Установить PostgreSQL
brew install postgresql@15

# Запустить PostgreSQL
brew services start postgresql@15

# Создать базу данных
createdb digital_cards
```

### Вариант 2: Postgres.app (GUI)

1. Скачайте Postgres.app: https://postgresapp.com/
2. Переместите в Applications
3. Запустите приложение
4. Нажмите "Initialize" для создания сервера
5. База данных будет доступна на localhost:5432

### Вариант 3: Docker (если установлен Docker Desktop)

```bash
# Установить Docker Desktop для Mac
# https://www.docker.com/products/docker-desktop/

# После установки запустить:
docker compose up -d
```

---

## Проверка установки

```bash
# Проверить, что PostgreSQL запущен
psql --version

# Подключиться к базе данных
psql -U postgres -d digital_cards
```

---

## После установки PostgreSQL

Вернитесь к [QUICKSTART.md](QUICKSTART.md) и продолжите с шага 3.

Или выполните:

```bash
cd /Users/Mac/Pyton/digital_cart/digital_cart/backend

# Запустить миграции
npm run db:migrate

# Заполнить тестовыми данными
npm run db:seed

# Запустить backend
npm run dev
```

---

## Альтернатива: Использовать облачную БД

### Supabase (бесплатно)

1. Зарегистрируйтесь на https://supabase.com/
2. Создайте новый проект
3. Скопируйте Database URL из Settings → Database
4. Вставьте в `backend/.env`:
   ```
   DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
   ```

### Railway (бесплатно для старта)

1. Зарегистрируйтесь на https://railway.app/
2. Создайте новый проект → Add PostgreSQL
3. Скопируйте DATABASE_URL из вкладки Variables
4. Вставьте в `backend/.env`

Преимущество облачных решений - не нужно устанавливать ничего локально!
