import { FastifyInstance } from 'fastify'
import { db } from '../db/index.js'
import { config } from '../config/index.js'
import QRCode from 'qrcode'
import { v2 as cloudinary } from 'cloudinary'

const normalizeString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const isValidUrl = (value: string) => {
  if (!value) return false
  if (/^[a-z][a-z\d+.-]*:/i.test(value)) return true

  try {
    new URL(`https://${value}`)
    return true
  } catch {
    return false
  }
}

const isCloudinaryUrl = (value: string) => /^https?:\/\/res\.cloudinary\.com\//i.test(value)

const isValidEmail = (value: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

const extractCloudinaryPublicId = (secureUrl: string) => {
  // https://res.cloudinary.com/<cloud>/image/upload/v123/folder/name.jpg -> folder/name
  const marker = '/upload/'
  const idx = secureUrl.indexOf(marker)
  if (idx === -1) return secureUrl

  let tail = secureUrl.slice(idx + marker.length)
  tail = tail.replace(/^v\d+\//, '')
  tail = tail.replace(/\.[^.\/]+$/, '')
  return tail
}


const getCloudinaryEnv = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  const isConfigured = !!cloudName && !!apiKey && !!apiSecret
  return { cloudName, apiKey, apiSecret, isConfigured }
}

const shouldUseCloudinaryStorage = () => {
  const cloudinaryEnv = getCloudinaryEnv()
  return config.storageType === 'cloudinary' || cloudinaryEnv.isConfigured
}

const getCardValidationErrors = (payload: {
  full_name: string
  title: string
  company_name: string
  phone: string
  email: string
  address: string
  website: string
  portfolio_url: string
  avatar_url: string
  is_active: boolean
  links: Array<{ type?: string; url?: string; is_visible?: boolean }>
  services: Array<{ title?: string; description?: string; is_visible?: boolean }>
  media: Array<{ file_url?: string; type?: string }>
}) => {
  const errors: string[] = []

  if (payload.is_active && !normalizeString(payload.full_name)) errors.push('full_name is required')
  if (payload.is_active && !normalizeString(payload.title)) errors.push('title is required')
  if (payload.is_active && !normalizeString(payload.company_name)) errors.push('company_name is required')
  if (payload.is_active && !normalizeString(payload.phone)) errors.push('phone is required')

  const email = normalizeString(payload.email)
  if (payload.is_active && !email) {
    errors.push('email is required')
  } else if (email && !isValidEmail(email)) {
    errors.push('email is invalid')
  }

  const website = normalizeString(payload.website)
  if (payload.is_active && !website) {
    errors.push('website is required')
  } else if (website && !isValidUrl(website)) {
    errors.push('website is invalid')
  }

  const portfolioUrl = normalizeString(payload.portfolio_url)
  if (portfolioUrl && !isValidUrl(portfolioUrl)) {
    errors.push('portfolio_url is invalid')
  }
  const avatar = normalizeString(payload.avatar_url)
  if (payload.is_active && !avatar) {
    errors.push('avatar_url is required')
  } else if (avatar && !isCloudinaryUrl(avatar)) {
    errors.push('avatar_url must be a Cloudinary URL')
  }

  const activeLinks = payload.links.filter((link) => {
    const type = normalizeString(link.type)
    const url = normalizeString(link.url)
    return link.is_visible !== false && !!type && !!url
  })

  for (const link of activeLinks) {
    const url = normalizeString(link.url)
    if (!isValidUrl(url)) {
      errors.push(`link url is invalid: ${url}`)
    }
  }

  if (payload.is_active && activeLinks.length < 2) {
    errors.push('at least 2 visible social links are required for active cards')
  }

  const visibleServices = payload.services.filter(
    (service) => service.is_visible !== false && normalizeString(service.title) && normalizeString(service.description)
  )

  if (payload.is_active && visibleServices.length < 1) {
    errors.push('at least 1 visible service is required for active cards')
  }

  const imageMedia = payload.media.filter((item) => {
    const fileUrl = normalizeString(item.file_url)
    const type = normalizeString(item.type || 'image').toLowerCase()
    return !!fileUrl && type === 'image'
  })

  for (const item of imageMedia) {
    const fileUrl = normalizeString(item.file_url)
    if (!isCloudinaryUrl(fileUrl)) {
      errors.push(`media file_url must be a Cloudinary URL: ${fileUrl}`)
    }
  }

  if (payload.is_active && imageMedia.length < 1) {
    errors.push('at least 1 gallery image is required for active cards')
  }

  return errors
}

export default async function adminRoutes(fastify: FastifyInstance) {
  // Все маршруты требуют авторизации
  const authGuard = (fastify as any).authenticate
  fastify.addHook('onRequest', authGuard)

  const getTimeRange = (query: any) => {
    const period = normalizeString(query?.period).toLowerCase() || 'month'
    const now = new Date()
    let from = new Date(now)
    let to = new Date(now)

    if (period === 'day') {
      from.setDate(now.getDate() - 1)
    } else if (period === 'week') {
      from.setDate(now.getDate() - 7)
    } else if (period === 'month') {
      from.setMonth(now.getMonth() - 1)
    } else if (period === 'custom') {
      const fromRaw = normalizeString(query?.from)
      const toRaw = normalizeString(query?.to)
      const fromDate = fromRaw ? new Date(fromRaw) : new Date(now)
      const toDate = toRaw ? new Date(toRaw) : new Date(now)
      if (!Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime())) {
        from = fromDate
        to = toDate
      } else {
        from.setMonth(now.getMonth() - 1)
      }
    } else {
      from.setMonth(now.getMonth() - 1)
    }

    if (from > to) {
      const tmp = from
      from = to
      to = tmp
    }

    return { from, to, period }
  }

  const getAnalyticsForCards = async (cardIds: string[], from: Date, to: Date) => {
    if (cardIds.length === 0) {
      return {
        totals: {
          views: 0,
          unique_visitors: 0,
          returning_visitors: 0,
          saves: 0,
          save_rate_percent: 0,
          clicks: 0,
          shares: 0,
          leads: 0
        },
        timeseries: [],
        share_breakdown: [],
        geo: [],
        sources: []
      }
    }

    const [totalsResult, visitorsResult, seriesResult, shareResult, geoResult, sourcesResult, leadsResult] = await Promise.all([
      db.query(
        `SELECT
           COALESCE(COUNT(*) FILTER (WHERE event_type = 'view'), 0)::int AS views,
           COALESCE(COUNT(*) FILTER (WHERE event_type = 'click'), 0)::int AS clicks,
           COALESCE(COUNT(*) FILTER (WHERE event_type = 'save_vcard'), 0)::int AS saves,
           COALESCE(COUNT(*) FILTER (WHERE event_type = 'share'), 0)::int AS shares
         FROM events
         WHERE card_id = ANY($1::uuid[])
           AND created_at >= $2
           AND created_at <= $3`,
        [cardIds, from, to]
      ),
      db.query(
        `WITH visitor_views AS (
           SELECT COALESCE(NULLIF(metadata->>'visitor_key', ''), 'event-' || id::text) AS visitor_key,
                  COUNT(*)::int AS views_count
           FROM events
           WHERE card_id = ANY($1::uuid[])
             AND event_type = 'view'
             AND created_at >= $2
             AND created_at <= $3
           GROUP BY 1
         )
         SELECT
           COALESCE(COUNT(*), 0)::int AS unique_visitors,
           COALESCE(COUNT(*) FILTER (WHERE views_count > 1), 0)::int AS returning_visitors
         FROM visitor_views`,
        [cardIds, from, to]
      ),
      db.query(
        `SELECT
           DATE_TRUNC('day', created_at) AS day,
           COALESCE(COUNT(*) FILTER (WHERE event_type = 'view'), 0)::int AS views,
           COALESCE(COUNT(*) FILTER (WHERE event_type = 'save_vcard'), 0)::int AS saves,
           COALESCE(COUNT(DISTINCT COALESCE(NULLIF(metadata->>'visitor_key', ''), 'event-' || id::text)) FILTER (WHERE event_type = 'view'), 0)::int AS unique_visitors
         FROM events
         WHERE card_id = ANY($1::uuid[])
           AND created_at >= $2
           AND created_at <= $3
         GROUP BY 1
         ORDER BY 1`,
        [cardIds, from, to]
      ),
      db.query(
        `SELECT
           COALESCE(NULLIF(metadata->>'share_method', ''), 'unknown') AS share_method,
           COALESCE(NULLIF(metadata->>'platform', ''), 'unknown') AS platform,
           COUNT(*)::int AS count
         FROM events
         WHERE card_id = ANY($1::uuid[])
           AND event_type = 'share'
           AND created_at >= $2
           AND created_at <= $3
         GROUP BY 1, 2
         ORDER BY count DESC`,
        [cardIds, from, to]
      ),
      db.query(
        `SELECT
           COALESCE(NULLIF(country, ''), 'Unknown') AS country,
           COALESCE(NULLIF(metadata->>'region', ''), 'Unknown') AS region,
           COALESCE(NULLIF(metadata->>'city', ''), 'Unknown') AS city,
           COUNT(*)::int AS views
         FROM events
         WHERE card_id = ANY($1::uuid[])
           AND event_type = 'view'
           AND created_at >= $2
           AND created_at <= $3
         GROUP BY 1, 2, 3
         ORDER BY views DESC`,
        [cardIds, from, to]
      ),
      db.query(
        `SELECT
           COALESCE(NULLIF(referrer, ''), 'direct') AS referrer,
           COUNT(*)::int AS views
         FROM events
         WHERE card_id = ANY($1::uuid[])
           AND event_type = 'view'
           AND created_at >= $2
           AND created_at <= $3
         GROUP BY 1
         ORDER BY views DESC`,
        [cardIds, from, to]
      ),
      db.query(
        `SELECT COALESCE(COUNT(*), 0)::int AS leads
         FROM leads
         WHERE card_id = ANY($1::uuid[])
           AND created_at >= $2
           AND created_at <= $3`,
        [cardIds, from, to]
      )
    ])

    const totals = totalsResult.rows[0] || { views: 0, clicks: 0, saves: 0, shares: 0 }
    const visitors = visitorsResult.rows[0] || { unique_visitors: 0, returning_visitors: 0 }
    const leads = leadsResult.rows[0] || { leads: 0 }
    const uniqueVisitors = Number(visitors.unique_visitors) || 0
    const saveRatePercent = uniqueVisitors > 0
      ? Math.round(((Number(totals.saves) || 0) / uniqueVisitors) * 10000) / 100
      : 0

    return {
      totals: {
        views: Number(totals.views) || 0,
        unique_visitors: uniqueVisitors,
        returning_visitors: Number(visitors.returning_visitors) || 0,
        saves: Number(totals.saves) || 0,
        save_rate_percent: saveRatePercent,
        clicks: Number(totals.clicks) || 0,
        shares: Number(totals.shares) || 0,
        leads: Number(leads.leads) || 0
      },
      timeseries: seriesResult.rows.map((row) => ({
        day: row.day,
        views: Number(row.views) || 0,
        saves: Number(row.saves) || 0,
        unique_visitors: Number(row.unique_visitors) || 0
      })),
      share_breakdown: shareResult.rows.map((row) => ({
        share_method: row.share_method,
        platform: row.platform,
        count: Number(row.count) || 0
      })),
      geo: geoResult.rows.map((row) => ({
        country: row.country,
        region: row.region,
        city: row.city,
        views: Number(row.views) || 0
      })),
      sources: sourcesResult.rows.map((row) => ({
        referrer: row.referrer,
        views: Number(row.views) || 0
      }))
    }
  }

  // Upload media (Cloudinary only)
  fastify.post('/media/upload', async (request, reply) => {
    try {
      const part = await (request as any).file({ limits: { fileSize: 15 * 1024 * 1024 } })
      if (!part) {
        return reply.code(400).send({ error: 'File is required' })
      }

      const mimeType = (part.mimetype || '').toLowerCase()
      if (!mimeType.startsWith('image/')) {
        return reply.code(400).send({ error: 'Only image files are allowed' })
      }

      const fileBuffer = await part.toBuffer()
      if (!fileBuffer.length) {
        return reply.code(400).send({ error: 'Uploaded file is empty' })
      }

      const { cloudName, apiKey, apiSecret, isConfigured } = getCloudinaryEnv()
      if (!shouldUseCloudinaryStorage() || !isConfigured || !cloudName || !apiKey || !apiSecret) {
        return reply.code(500).send({ error: 'Cloudinary storage is required and not configured' })
      }

      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret })
      const folder = process.env.CLOUDINARY_FOLDER || 'digital_cart/gallery'

      const uploaded = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
            use_filename: true,
            unique_filename: true,
            overwrite: false,
            quality: 'auto',
            fetch_format: 'auto'
          },
          (error, result) => {
            if (error || !result?.secure_url) {
              reject(error || new Error('Cloudinary upload failed'))
              return
            }
            resolve({ secure_url: result.secure_url })
          }
        )

        stream.end(fileBuffer)
      })

      return { url: uploaded.secure_url, type: 'image', public_id: extractCloudinaryPublicId(uploaded.secure_url) }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Failed to upload media' })
    }
  })

  // Delete media (Cloudinary only)
  fastify.delete('/media', async (request, reply) => {
    try {
      const body = (request.body || {}) as { url?: string; public_id?: string }
      const url = normalizeString(body.url)
      const explicitPublicId = normalizeString(body.public_id)

      if (!url && !explicitPublicId) {
        return reply.code(400).send({ error: 'url or public_id is required' })
      }

      const { cloudName, apiKey, apiSecret, isConfigured } = getCloudinaryEnv()
      if (!shouldUseCloudinaryStorage() || !isConfigured || !cloudName || !apiKey || !apiSecret) {
        return reply.code(500).send({ error: 'Cloudinary storage is required and not configured' })
      }

      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret })

      const publicId = explicitPublicId || (url ? extractCloudinaryPublicId(url) : '')
      if (!publicId) {
        return reply.code(400).send({ error: 'Cannot determine media public_id' })
      }

      await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true
      })

      return { success: true }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Failed to delete media' })
    }
  })

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

      return reply
        .header('Cache-Control', 'no-store')
        .send({
          ...card,
          links: linksResult.rows,
          media: mediaResult.rows,
          services: servicesResult.rows
        })
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

      const currentCardResult = await db.query(`SELECT * FROM cards WHERE id = $1`, [id])
      const currentCard = currentCardResult.rows[0]

      const currentLinksResult = await db.query(
        `SELECT type, url, is_visible FROM card_links WHERE card_id = $1 ORDER BY sort_order`,
        [id]
      )
      const currentServicesResult = await db.query(
        `SELECT title, description, is_visible FROM card_services WHERE card_id = $1 ORDER BY sort_order`,
        [id]
      )
      const currentMediaResult = await db.query(
        `SELECT file_url, type FROM card_media WHERE card_id = $1 ORDER BY sort_order`,
        [id]
      )

      const nextPayload = {
        full_name: updates.full_name ?? currentCard.full_name,
        title: updates.title ?? currentCard.title,
        company_name: updates.company_name ?? currentCard.company_name,
        phone: updates.phone ?? currentCard.phone,
        email: updates.email ?? currentCard.email,
        address: updates.address ?? currentCard.address,
        website: updates.website ?? currentCard.website,
        portfolio_url: updates.portfolio_url ?? currentCard.portfolio_url,
        avatar_url: updates.avatar_url ?? currentCard.avatar_url,
        is_active: updates.is_active ?? currentCard.is_active,
        links: Array.isArray(updates.links) ? updates.links : currentLinksResult.rows,
        services: Array.isArray(updates.services) ? updates.services : currentServicesResult.rows,
        media: Array.isArray(updates.media) ? updates.media : currentMediaResult.rows
      }

      const validationErrors = getCardValidationErrors(nextPayload)
      if (validationErrors.length > 0) {
        return reply.code(400).send({
          error: 'Card validation failed',
          details: validationErrors
        })
      }

      const client = await db.connect()
      try {
        await client.query('BEGIN')

        // Обновляем основные поля
        const allowedFields = [
          'slug', 'full_name', 'title', 'company_name',
          'phone', 'email', 'address', 'website', 'portfolio_url', 'bio',
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
    const query = (request.query || {}) as { period?: string; from?: string; to?: string; card_id?: string }

    try {
      const cardId = normalizeString(query.card_id)
      let cardIds: string[] = []

      if (cardId) {
        const ownerCheck = await db.query(
          `SELECT id FROM cards WHERE id = $1 AND user_id = $2`,
          [cardId, user.id]
        )
        if (ownerCheck.rows.length === 0) {
          return reply.code(404).send({ error: 'Card not found' })
        }
        cardIds = [cardId]
      } else {
        const cardsResult = await db.query(`SELECT id FROM cards WHERE user_id = $1`, [user.id])
        cardIds = cardsResult.rows.map((row) => row.id)
      }

      const { from, to, period } = getTimeRange(query)
      const analytics = await getAnalyticsForCards(cardIds, from, to)

      return {
        period,
        from,
        to,
        card_id: cardId || null,
        ...analytics
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })

  // Экспорт аналитики в CSV
  fastify.get('/analytics/export', async (request, reply) => {
    const user = request.user as any
    const query = (request.query || {}) as { period?: string; from?: string; to?: string; card_id?: string }

    try {
      const cardId = normalizeString(query.card_id)
      let cardIds: string[] = []

      if (cardId) {
        const ownerCheck = await db.query(
          `SELECT id FROM cards WHERE id = $1 AND user_id = $2`,
          [cardId, user.id]
        )
        if (ownerCheck.rows.length === 0) {
          return reply.code(404).send({ error: 'Card not found' })
        }
        cardIds = [cardId]
      } else {
        const cardsResult = await db.query(`SELECT id FROM cards WHERE user_id = $1`, [user.id])
        cardIds = cardsResult.rows.map((row) => row.id)
      }

      const { from, to } = getTimeRange(query)
      const analytics = await getAnalyticsForCards(cardIds, from, to)

      const header = 'date,views,unique_visitors,saves\n'
      const rows = analytics.timeseries
        .map((row) => {
          const day = new Date(row.day).toISOString().slice(0, 10)
          return `${day},${row.views},${row.unique_visitors},${row.saves}`
        })
        .join('\n')

      const csv = `${header}${rows}`

      return reply
        .header('Content-Type', 'text/csv; charset=utf-8')
        .header('Content-Disposition', 'attachment; filename="analytics.csv"')
        .send(csv)
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Failed to export analytics' })
    }
  })

  // Сбросить аналитику (по выбранной карточке или по всем карточкам пользователя)
  fastify.post('/analytics/reset', async (request, reply) => {
    const user = request.user as any
    const body = (request.body || {}) as { card_id?: string }
    const cardId = normalizeString(body.card_id)

    try {
      let targetCardIds: string[] = []

      if (cardId) {
        const ownerCheck = await db.query(
          `SELECT id FROM cards WHERE id = $1 AND user_id = $2`,
          [cardId, user.id]
        )

        if (ownerCheck.rows.length === 0) {
          return reply.code(404).send({ error: 'Card not found' })
        }

        targetCardIds = [cardId]
      } else {
        const cardsResult = await db.query(
          `SELECT id FROM cards WHERE user_id = $1`,
          [user.id]
        )
        targetCardIds = cardsResult.rows.map((row) => row.id)
      }

      if (targetCardIds.length === 0) {
        return { success: true, deleted: 0 }
      }

      const [deletedEventsResult, deletedLeadsResult] = await Promise.all([
        db.query(
          `DELETE FROM events
           WHERE card_id = ANY($1::uuid[])`,
          [targetCardIds]
        ),
        db.query(
          `DELETE FROM leads
           WHERE card_id = ANY($1::uuid[])`,
          [targetCardIds]
        )
      ])

      return {
        success: true,
        deleted_events: deletedEventsResult.rowCount || 0,
        deleted_leads: deletedLeadsResult.rowCount || 0
      }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Failed to reset analytics' })
    }
  })

  // Получить аналитику конкретной визитки
  fastify.get('/card/:id/analytics', async (request, reply) => {
    const user = request.user as any
    const { id } = request.params as { id: string }
    const query = (request.query || {}) as { period?: string; from?: string; to?: string }

    try {
      // Проверяем владение
      const ownerCheck = await db.query(
        `SELECT id FROM cards WHERE id = $1 AND user_id = $2`,
        [id, user.id]
      )

      if (ownerCheck.rows.length === 0) {
        return reply.code(404).send({ error: 'Card not found' })
      }

      const { from, to, period } = getTimeRange(query)
      const analytics = await getAnalyticsForCards([id], from, to)

      return {
        period,
        from,
        to,
        card_id: id,
        ...analytics
      }
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
