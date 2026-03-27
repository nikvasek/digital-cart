import { FastifyInstance } from 'fastify'
import { db } from '../db/index.js'
import { generateVCard } from '../utils/vcard.js'

export default async function publicRoutes(fastify: FastifyInstance) {
  // Получить публичную визитку по slug
  fastify.get('/card/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    try {
      // Получаем данные визитки
      const cardResult = await db.query(
        `SELECT * FROM cards WHERE slug = $1 AND is_active = true`,
        [slug]
      )

      if (cardResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Card not found' })
      }

      const card = cardResult.rows[0]

      // Получаем ссылки
      const linksResult = await db.query(
        `SELECT type, url, is_visible FROM card_links 
         WHERE card_id = $1 AND is_visible = true 
         ORDER BY sort_order`,
        [card.id]
      )

      // Получаем медиа
      const mediaResult = await db.query(
        `SELECT file_url, type FROM card_media 
         WHERE card_id = $1 
         ORDER BY sort_order`,
        [card.id]
      )

      return {
        ...card,
        links: linksResult.rows,
        media: mediaResult.rows
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Скачать vCard
  fastify.get('/card/:slug/vcard', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    try {
      const cardResult = await db.query(
        `SELECT * FROM cards WHERE slug = $1 AND is_active = true`,
        [slug]
      )

      if (cardResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Card not found' })
      }

      const card = cardResult.rows[0]
      const vcardContent = generateVCard(card)

      reply
        .header('Content-Type', 'text/vcard; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="${slug}.vcf"`)
        .header('Cache-Control', 'no-store')
        .send(vcardContent)

      // Логируем событие сохранения
      await db.query(
        `INSERT INTO events (card_id, event_type) VALUES ($1, $2)`,
        [card.id, 'save_vcard']
      )
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Отправить лид
  fastify.post('/card/:slug/lead', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const { name, phone, email, consent_marketing } = request.body as {
      name: string
      phone?: string
      email?: string
      consent_marketing: boolean
    }

    try {
      const cardResult = await db.query(
        `SELECT id, user_id FROM cards WHERE slug = $1`,
        [slug]
      )

      if (cardResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Card not found' })
      }

      const card = cardResult.rows[0]

      // Сохраняем лид
      await db.query(
        `INSERT INTO leads (card_id, name, phone, email, consent_marketing, source)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [card.id, name, phone, email, consent_marketing, 'web']
      )

      // Логируем событие
      await db.query(
        `INSERT INTO events (card_id, event_type) VALUES ($1, $2)`,
        [card.id, 'lead_submit']
      )

      // TODO: Отправить уведомление владельцу (email/telegram)

      return { success: true }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Записать событие (аналитика)
  fastify.post('/events', async (request, reply) => {
    const { card_id, event_type, metadata } = request.body as {
      card_id: string
      event_type: string
      metadata?: any
    }

    try {
      await db.query(
        `INSERT INTO events (card_id, event_type, referrer, metadata)
         VALUES ($1, $2, $3, $4)`,
        [card_id, event_type, request.headers.referer || null, metadata || null]
      )

      return { success: true }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })
}
