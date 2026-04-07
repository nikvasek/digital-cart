import { FastifyInstance } from 'fastify'
import { db } from '../db/index.js'
import bcrypt from 'bcrypt'
import { config } from '../config/index.js'

const ensureAppSettingsTable = async () => {
  await db.query(
    `CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )`
  )
}

const readStoredPinHash = async () => {
  await ensureAppSettingsTable()
  const result = await db.query(
    `SELECT value FROM app_settings WHERE key = 'admin_pin_hash' LIMIT 1`
  )
  return result.rows[0]?.value as string | undefined
}

const writeStoredPinHash = async (hash: string) => {
  await ensureAppSettingsTable()
  await db.query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ('admin_pin_hash', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [hash]
  )
}

const verifyAdminPin = async (pin: string) => {
  const storedHash = await readStoredPinHash()
  if (storedHash) {
    return bcrypt.compare(pin, storedHash)
  }
  return pin === config.adminPin
}

export default async function authRoutes(fastify: FastifyInstance) {
  const authGuard = (fastify as any).authenticate

  fastify.post('/pin-login', async (request, reply) => {
    const { pin } = request.body as { pin: string }
    const normalizedPin = typeof pin === 'string' ? pin.trim() : ''

    if (!/^\d{4}$/.test(normalizedPin)) {
      return reply.code(400).send({ error: 'PIN must contain 4 digits' })
    }

    const isPinValid = await verifyAdminPin(normalizedPin)
    if (!isPinValid) {
      return reply.code(401).send({ error: 'Invalid PIN' })
    }

    try {
      const storedHash = await readStoredPinHash()
      if (!storedHash) {
        const migratedHash = await bcrypt.hash(normalizedPin, 10)
        await writeStoredPinHash(migratedHash)
      }

      let userResult = await db.query(
        `SELECT id, email, role FROM users WHERE email = $1 LIMIT 1`,
        [config.adminEmail]
      )

      if (userResult.rows.length === 0) {
        userResult = await db.query(
          `SELECT id, email, role FROM users ORDER BY created_at ASC LIMIT 1`
        )
      }

      if (userResult.rows.length === 0) {
        return reply.code(500).send({ error: 'No admin user configured' })
      }

      const user = userResult.rows[0]
      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role
      }, { expiresIn: '7d' })

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Логин
  fastify.post('/login', async (request, reply) => {
    return reply.code(410).send({ error: 'Email/password login is disabled. Use PIN login.' })
  })

  fastify.post('/pin-change', {
    onRequest: [authGuard]
  }, async (request, reply) => {
    const { currentPin, newPin } = request.body as { currentPin?: string; newPin?: string }
    const normalizedCurrent = (currentPin || '').trim()
    const normalizedNext = (newPin || '').trim()

    if (!/^\d{4}$/.test(normalizedCurrent) || !/^\d{4}$/.test(normalizedNext)) {
      return reply.code(400).send({ error: 'PIN must contain 4 digits' })
    }

    if (normalizedCurrent === normalizedNext) {
      return reply.code(400).send({ error: 'New PIN must be different from current PIN' })
    }

    try {
      const isCurrentValid = await verifyAdminPin(normalizedCurrent)
      if (!isCurrentValid) {
        return reply.code(401).send({ error: 'Current PIN is invalid' })
      }

      const nextHash = await bcrypt.hash(normalizedNext, 10)
      await writeStoredPinHash(nextHash)

      return { success: true }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Регистрация (опционально, можно добавить позже)
  fastify.post('/register', async (request, reply) => {
    const { email, password, full_name } = request.body as {
      email: string
      password: string
      full_name: string
    }

    try {
      // Проверяем, существует ли пользователь
      const existingUser = await db.query(
        `SELECT id FROM users WHERE email = $1`,
        [email]
      )

      if (existingUser.rows.length > 0) {
        return reply.code(400).send({ error: 'Email already registered' })
      }

      // Хешируем пароль
      const passwordHash = await bcrypt.hash(password, 10)

      // Создаем пользователя
      const userResult = await db.query(
        `INSERT INTO users (email, password_hash) 
         VALUES ($1, $2) 
         RETURNING id, email, role`,
        [email, passwordHash]
      )

      const user = userResult.rows[0]

      // Создаем базовую визитку (slug уникален — добавляем суффикс при коллизии)
      let slug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-')
      const slugCheck = await db.query('SELECT id FROM cards WHERE slug = $1', [slug])
      if (slugCheck.rows.length > 0) {
        slug = `${slug}-${Date.now().toString(36)}`
      }
      await db.query(
        `INSERT INTO cards (user_id, slug, full_name, email, language_default)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, slug, full_name, email, 'en']
      )

      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role
      }, { expiresIn: '7d' })

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Получить текущего пользователя
  fastify.get('/me', {
    onRequest: [authGuard]
  }, async (request, reply) => {
    const user = request.user as any
    
    try {
      const result = await db.query(
        `SELECT id, email, role, created_at FROM users WHERE id = $1`,
        [user.id]
      )

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' })
      }

      return result.rows[0]
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })
}
