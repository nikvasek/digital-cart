import { FastifyInstance } from 'fastify'
import { db } from '../db/index.js'
import { config } from '../config/index.js'
import QRCode from 'qrcode'
import { v2 as cloudinary } from 'cloudinary'
import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

const normalizeString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const isValidUrl = (value: string) => {
  if (!value) return false
  if (value.startsWith('/')) return true
  if (/^[a-z][a-z\d+.-]*:/i.test(value)) return true

  try {
    new URL(`https://${value}`)
    return true
  } catch {
    return false
  }
}

const isValidEmail = (value: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

const getFileExtensionFromMime = (mime: string) => {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return 'bin'
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

const tryExtractUrlPathname = (value: string) => {
  try {
    const parsed = new URL(value)
    return parsed.pathname
  } catch {
    return value
  }
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
  } else if (avatar && !isValidUrl(avatar)) {
    errors.push('avatar_url is invalid')
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
    if (!isValidUrl(fileUrl)) {
      errors.push(`media file_url is invalid: ${fileUrl}`)
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

  // Upload media (Cloudinary or local fallback)
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

      if (shouldUseCloudinaryStorage()) {
        const { cloudName, apiKey, apiSecret, isConfigured } = getCloudinaryEnv()

        if (!isConfigured || !cloudName || !apiKey || !apiSecret) {
          return reply.code(500).send({ error: 'Cloudinary is not configured' })
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
      }

      const uploadsDir = path.resolve(process.cwd(), 'uploads')
      await mkdir(uploadsDir, { recursive: true })
      const ext = getFileExtensionFromMime(mimeType)
      const fileName = `${Date.now()}-${randomUUID()}.${ext}`
      const fullPath = path.join(uploadsDir, fileName)
      await writeFile(fullPath, fileBuffer)

      return { url: `/uploads/${fileName}`, type: 'image' }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Failed to upload media' })
    }
  })

  // Delete media (Cloudinary or local uploads)
  fastify.delete('/media', async (request, reply) => {
    try {
      const body = (request.body || {}) as { url?: string; public_id?: string }
      const url = normalizeString(body.url)
      const explicitPublicId = normalizeString(body.public_id)

      if (!url && !explicitPublicId) {
        return reply.code(400).send({ error: 'url or public_id is required' })
      }

      if (shouldUseCloudinaryStorage()) {
        const { cloudName, apiKey, apiSecret, isConfigured } = getCloudinaryEnv()

        if (!isConfigured || !cloudName || !apiKey || !apiSecret) {
          return reply.code(500).send({ error: 'Cloudinary is not configured' })
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
      }

      const pathname = tryExtractUrlPathname(url)
      if (!pathname.startsWith('/uploads/')) {
        return { success: true }
      }

      const fileName = path.basename(pathname)
      const fullPath = path.resolve(process.cwd(), 'uploads', fileName)

      try {
        await unlink(fullPath)
      } catch (error: any) {
        if (error?.code !== 'ENOENT') {
          throw error
        }
      }

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
