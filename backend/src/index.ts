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
    fastify.log.info('Database connection established')

    await fastify.listen({ port: config.port, host: '0.0.0.0' })
    fastify.log.info(`Server listening on port ${config.port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
