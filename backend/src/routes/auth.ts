import { FastifyInstance } from 'fastify'
import { db } from '../db/index.js'
import bcrypt from 'bcrypt'
import { config } from '../config/index.js'

export default async function authRoutes(fastify: FastifyInstance) {
  const authGuard = (fastify as any).authenticate

  fastify.post('/pin-login', async (request, reply) => {
    const { pin } = request.body as { pin: string }
    const normalizedPin = typeof pin === 'string' ? pin.trim() : ''

    if (normalizedPin !== config.adminPin) {
      return reply.code(401).send({ error: 'Invalid PIN' })
    }

    try {
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
    const { email, password } = request.body as {
      email: string
      password: string
    }

    try {
      const result = await db.query(
        `SELECT id, email, password_hash, role FROM users WHERE email = $1`,
        [email]
      )

      if (result.rows.length === 0) {
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

      const user = result.rows[0]
      const isValid = await bcrypt.compare(password, user.password_hash)

      if (!isValid) {
        return reply.code(401).send({ error: 'Invalid credentials' })
      }

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
