import { FastifyInstance } from 'fastify'
import { db } from '../db/index.js'
import QRCode from 'qrcode'

export default async function adminRoutes(fastify: FastifyInstance) {
  // Все маршруты требуют авторизации
  const authGuard = (fastify as any).authenticate
  fastify.addHook('onRequest', authGuard)

  // Получить список визиток пользователя
  fastify.get('/cards', async (request, reply) => {
    const user = request.user as any

    try {
      const result = await db.query(
        `SELECT id, slug, full_name, title, is_active, created_at, updated_at
         FROM cards 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [user.id]
      )

      return result.rows
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Получить одну визитку для редактирования
  fastify.get('/card/:id', async (request, reply) => {
    const user = request.user as any
    const { id } = request.params as { id: string }

    try {
      const cardResult = await db.query(
        `SELECT * FROM cards WHERE id = $1 AND user_id = $2`,
        [id, user.id]
      )

      if (cardResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Card not found' })
      }

      const card = cardResult.rows[0]

      // Получаем ссылки
      const linksResult = await db.query(
        `SELECT id, type, url, is_visible, sort_order FROM card_links 
         WHERE card_id = $1 
         ORDER BY sort_order`,
        [card.id]
      )

      // Получаем медиа
      const mediaResult = await db.query(
        `SELECT id, file_url, type, sort_order FROM card_media 
         WHERE card_id = $1 
         ORDER BY sort_order`,
        [card.id]
      )

      // Получаем услуги
      const servicesResult = await db.query(
        `SELECT id, title, description, is_visible, sort_order FROM card_services
         WHERE card_id = $1
         ORDER BY sort_order`,
        [card.id]
      )

      return {
        ...card,
        links: linksResult.rows,
        media: mediaResult.rows,
        services: servicesResult.rows
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Обновить визитку
  fastify.patch('/card/:id', async (request, reply) => {
    const user = request.user as any
    const { id } = request.params as { id: string }
    const updates = request.body as any

    try {
      // Проверяем владение
      const ownerCheck = await db.query(
        `SELECT id FROM cards WHERE id = $1 AND user_id = $2`,
        [id, user.id]
      )

      if (ownerCheck.rows.length === 0) {
        return reply.code(404).send({ error: 'Card not found' })
      }

      const client = await db.connect()
      try {
        await client.query('BEGIN')

        // Обновляем основные поля
        const allowedFields = [
          'slug', 'full_name', 'title', 'company_name',
          'phone', 'email', 'website', 'bio',
          'avatar_url', 'logo_url', 'language_default', 'is_active'
        ]

        const updateFields: string[] = []
        const updateValues: any[] = []
        let paramCount = 1

        for (const field of allowedFields) {
          if (updates[field] !== undefined) {
            updateFields.push(`${field} = $${paramCount}`)
            updateValues.push(updates[field])
            paramCount++
          }
        }

        if (updateFields.length > 0) {
          updateValues.push(id)
          await client.query(
            `UPDATE cards SET ${updateFields.join(', ')}, updated_at = NOW()
             WHERE id = $${paramCount}`,
            updateValues
          )
        }

        if (Array.isArray(updates.links)) {
          await client.query(`DELETE FROM card_links WHERE card_id = $1`, [id])

          for (let i = 0; i < updates.links.length; i++) {
            const link = updates.links[i]
            if (!link?.type || !link?.url) continue

            await client.query(
              `INSERT INTO card_links (card_id, type, url, sort_order, is_visible)
               VALUES ($1, $2, $3, $4, $5)`,
              [id, link.type, link.url, i, link.is_visible !== false]
            )
          }
        }

        if (Array.isArray(updates.media)) {
          await client.query(`DELETE FROM card_media WHERE card_id = $1`, [id])

          for (let i = 0; i < updates.media.length; i++) {
            const media = updates.media[i]
            if (!media?.file_url) continue

            await client.query(
              `INSERT INTO card_media (card_id, file_url, type, sort_order)
               VALUES ($1, $2, $3, $4)`,
              [id, media.file_url, media.type || 'image', i]
            )
          }
        }

        if (Array.isArray(updates.services)) {
          await client.query(`DELETE FROM card_services WHERE card_id = $1`, [id])

          for (let i = 0; i < updates.services.length; i++) {
            const service = updates.services[i]
            if (!service?.title) continue

            await client.query(
              `INSERT INTO card_services (card_id, title, description, sort_order, is_visible)
               VALUES ($1, $2, $3, $4, $5)`,
              [id, service.title, service.description || null, i, service.is_visible !== false]
            )
          }
        }

        await client.query('COMMIT')
      } catch (txError) {
        await client.query('ROLLBACK')
        throw txError
      } finally {
        client.release()
      }

      return { success: true }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Сгенерировать и скачать QR-код
  fastify.get('/card/:id/qr', async (request, reply) => {
    const user = request.user as any
    const { id } = request.params as { id: string }

    try {
      const result = await db.query(
        `SELECT slug FROM cards WHERE id = $1 AND user_id = $2`,
        [id, user.id]
      )

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Card not found' })
      }

      const card = result.rows[0]
      // Используем frontend URL из окружения, или Origin заголовок, или фоллбэк
      const frontendUrl = process.env.FRONTEND_URL
        || request.headers.origin
        || `${request.protocol}://${request.hostname}`
      const url = `${frontendUrl}/${card.slug}`

      // Генерируем QR-код
      const qrCode = await QRCode.toBuffer(url, {
        width: 512,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })

      reply
        .header('Content-Type', 'image/png')
        .header('Content-Disposition', `attachment; filename="${card.slug}-qr.png"`)
        .send(qrCode)
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Получить аналитику
  fastify.get('/analytics', async (request, reply) => {
    const user = request.user as any

    try {
      // Получаем все визитки пользователя
      const cardsResult = await db.query(
        `SELECT id FROM cards WHERE user_id = $1`,
        [user.id]
      )

      const cardIds = cardsResult.rows.map(row => row.id)

      if (cardIds.length === 0) {
        return {
          views: 0,
          clicks: 0,
          saves: 0,
          leads: 0
        }
      }

      // Подсчитываем события
      const eventsResult = await db.query(
        `SELECT event_type, COUNT(*) as count 
         FROM events 
         WHERE card_id = ANY($1::uuid[])
         GROUP BY event_type`,
        [cardIds]
      )

      const analytics = {
        views: 0,
        clicks: 0,
        saves: 0,
        leads: 0
      }

      for (const row of eventsResult.rows) {
        if (row.event_type === 'view') analytics.views = parseInt(row.count)
        if (row.event_type === 'click') analytics.clicks = parseInt(row.count)
        if (row.event_type === 'save_vcard') analytics.saves = parseInt(row.count)
        if (row.event_type === 'lead_submit') analytics.leads = parseInt(row.count)
      }

      return analytics
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Получить аналитику конкретной визитки
  fastify.get('/card/:id/analytics', async (request, reply) => {
    const user = request.user as any
    const { id } = request.params as { id: string }

    try {
      // Проверяем владение
      const ownerCheck = await db.query(
        `SELECT id FROM cards WHERE id = $1 AND user_id = $2`,
        [id, user.id]
      )

      if (ownerCheck.rows.length === 0) {
        return reply.code(404).send({ error: 'Card not found' })
      }

      // Подсчитываем события
      const eventsResult = await db.query(
        `SELECT event_type, COUNT(*) as count 
         FROM events 
         WHERE card_id = $1
         GROUP BY event_type`,
        [id]
      )

      const analytics = {
        views: 0,
        clicks: 0,
        saves: 0,
        leads: 0
      }

      for (const row of eventsResult.rows) {
        if (row.event_type === 'view') analytics.views = parseInt(row.count)
        if (row.event_type === 'click') analytics.clicks = parseInt(row.count)
        if (row.event_type === 'save_vcard') analytics.saves = parseInt(row.count)
        if (row.event_type === 'lead_submit') analytics.leads = parseInt(row.count)
      }

      return analytics
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Получить список лидов
  fastify.get('/card/:id/leads', async (request, reply) => {
    const user = request.user as any
    const { id } = request.params as { id: string }

    try {
      // Проверяем владение
      const ownerCheck = await db.query(
        `SELECT id FROM cards WHERE id = $1 AND user_id = $2`,
        [id, user.id]
      )

      if (ownerCheck.rows.length === 0) {
        return reply.code(404).send({ error: 'Card not found' })
      }

      const leadsResult = await db.query(
        `SELECT id, name, phone, email, consent_marketing, source, created_at
         FROM leads 
         WHERE card_id = $1 
         ORDER BY created_at DESC`,
        [id]
      )

      return leadsResult.rows
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })
}
