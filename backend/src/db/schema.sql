-- Миграция базы данных для платформы цифровых визиток
-- Версия: MVP 1.0

-- Создание расширения для UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Пользователи (владельцы визиток)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'owner',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Визитки
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug VARCHAR(100) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  company_name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(500),
  bio TEXT,
  avatar_url VARCHAR(500),
  logo_url VARCHAR(500),
  language_default VARCHAR(10) DEFAULT 'en',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Ссылки на соцсети/мессенджеры
CREATE TABLE card_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  url VARCHAR(500) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Медиа-файлы (галерея)
CREATE TABLE card_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  file_url VARCHAR(500) NOT NULL,
  type VARCHAR(50) DEFAULT 'image',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Лиды (контакты от посетителей)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  consent_marketing BOOLEAN DEFAULT false,
  source VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. События (аналитика)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  referrer VARCHAR(500),
  device VARCHAR(100),
  country VARCHAR(10),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX idx_cards_slug ON cards(slug);
CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_card_links_card_id ON card_links(card_id);
CREATE INDEX idx_card_media_card_id ON card_media(card_id);
CREATE INDEX idx_leads_card_id ON leads(card_id);
CREATE INDEX idx_events_card_id ON events(card_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_created_at ON events(created_at);

-- Триггер для updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
