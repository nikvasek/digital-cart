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

const ensureServicesSchema = async () => {
  const cardsTableCheck = await db.query(`SELECT to_regclass('public.cards') AS cards_table`)
  if (!cardsTableCheck.rows[0]?.cards_table) {
    fastify.log.warn('Table cards not found, skipping card_services bootstrap')
    return
  }

  await db.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`)

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
    CREATE INDEX IF NOT EXISTS idx_card_services_card_id ON card_services(card_id)
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
    await ensureServicesSchema()
    fastify.log.info('Database connection established')

    await fastify.listen({ port: config.port, host: '0.0.0.0' })
    fastify.log.info(`Server listening on port ${config.port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
