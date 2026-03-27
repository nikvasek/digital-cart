import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import { config } from './config/index.js'
import { db } from './db/index.js'
import publicRoutes from './routes/public.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const fastify = Fastify({
  logger: true
})

const ensureCoreSchema = async () => {
  await db.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`)

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'owner',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS cards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS card_links (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      url VARCHAR(500) NOT NULL,
      sort_order INTEGER DEFAULT 0,
      is_visible BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS card_media (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      file_url VARCHAR(500) NOT NULL,
      type VARCHAR(50) DEFAULT 'image',
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      email VARCHAR(255),
      consent_marketing BOOLEAN DEFAULT false,
      source VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      event_type VARCHAR(50) NOT NULL,
      referrer VARCHAR(500),
      device VARCHAR(100),
      country VARCHAR(10),
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await db.query(`
    CREATE TABLE IF NOT EXISTS card_services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_visible BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_cards_slug ON cards(slug)
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id)
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_card_links_card_id ON card_links(card_id)
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_card_media_card_id ON card_media(card_id)
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_card_services_card_id ON card_services(card_id)
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_leads_card_id ON leads(card_id)
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_events_card_id ON events(card_id)
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type)
  `)

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at)
  `)

  await db.query(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `)

  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at'
      ) THEN
        CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      END IF;
    END
    $$;
  `)

  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_cards_updated_at'
      ) THEN
        CREATE TRIGGER update_cards_updated_at
        BEFORE UPDATE ON cards
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      END IF;
    END
    $$;
  `)

  await db.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_card_services_updated_at'
      ) THEN
        CREATE TRIGGER update_card_services_updated_at
        BEFORE UPDATE ON card_services
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      END IF;
    END
    $$;
  `)
}

// Плагины
await fastify.register(cors, {
  origin: true
})

await fastify.register(jwt, {
  secret: config.jwtSecret
})

await fastify.register(multipart)

await fastify.register(staticFiles, {
  root: path.join(__dirname, '../uploads'),
  prefix: '/uploads/'
})

// Декоратор для проверки авторизации
fastify.decorate('authenticate', async function (request: any, reply: any) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' })
  }
})

// Маршруты
await fastify.register(publicRoutes, { prefix: '/api/public' })
await fastify.register(authRoutes, { prefix: '/api/auth' })
await fastify.register(adminRoutes, { prefix: '/api/admin' })

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Запуск сервера
const start = async () => {
  try {
    // Проверка подключения к БД
    await db.query('SELECT NOW()')
    await ensureCoreSchema()
    fastify.log.info('Database connection established')

    await fastify.listen({ port: config.port, host: '0.0.0.0' })
    fastify.log.info(`Server listening on port ${config.port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
