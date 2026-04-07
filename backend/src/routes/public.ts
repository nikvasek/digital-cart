import { FastifyInstance } from 'fastify'
import { db } from '../db/index.js'
import { generateVCard } from '../utils/vcard.js'
import { createHash } from 'node:crypto'
import geoip from 'geoip-lite'

type GeoResult = {
  country: string
  region: string
  city: string
  source: 'header' | 'geoip' | 'unknown'
}

const getClientIp = (request: any) => {
  const xff = (request.headers['x-forwarded-for'] || '').toString()
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }

  return request.ip || request.socket?.remoteAddress || ''
}

const normalizeIp = (ipRaw: string) => {
  const ip = (ipRaw || '').trim()
  if (!ip) return ''
  if (ip === '::1') return ''
  if (ip.startsWith('::ffff:')) return ip.slice(7)
  return ip
}

const isPrivateIp = (ip: string) => {
  if (!ip) return true

  // IPv4 private/link-local/loopback ranges.
  if (/^(10\.|127\.|192\.168\.|169\.254\.)/.test(ip)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true

  // IPv6 local ranges.
  if (ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:')) {
    return true
  }

  return false
}

const getGeoFromIp = (ip: string) => {
  const normalizedIp = normalizeIp(ip)
  if (!normalizedIp || isPrivateIp(normalizedIp)) {
    return { country: '', region: '', city: '', source: 'unknown' as const }
  }

  const lookup = geoip.lookup(normalizedIp)
  if (!lookup) {
    return { country: '', region: '', city: '', source: 'unknown' as const }
  }

  return {
    country: (lookup.country || '').toString().trim().toUpperCase(),
    region: (lookup.region || '').toString().trim(),
    city: (lookup.city || '').toString().trim(),
    source: 'geoip' as const
  }
}

const toDeviceLabel = (userAgent: string) => {
  const ua = userAgent.toLowerCase()
  if (/ipad|tablet/.test(ua)) return 'tablet'
  if (/mobile|iphone|android/.test(ua)) return 'mobile'
  return 'desktop'
}

const getGeoFromHeaders = (request: any): GeoResult => {
  const country =
    (request.headers['cf-ipcountry'] ||
      request.headers['x-vercel-ip-country'] ||
      request.headers['x-country-code'] ||
      '')
      .toString()
      .trim()
      .toUpperCase()

  const region =
    (request.headers['x-vercel-ip-country-region'] ||
      request.headers['x-region-code'] ||
      '')
      .toString()
      .trim()

  const city =
    (request.headers['x-vercel-ip-city'] ||
      request.headers['cf-ipcity'] ||
      '')
      .toString()
      .trim()

  if (country || region || city) {
    return { country, region, city, source: 'header' }
  }

  return getGeoFromIp(getClientIp(request))
}

const buildVisitorKey = (request: any, metadata: any) => {
  const metaVisitorId = (metadata?.visitor_id || metadata?.visitor_key || '').toString().trim()
  if (metaVisitorId) return metaVisitorId

  const ip = getClientIp(request)
  const userAgent = (request.headers['user-agent'] || '').toString()
  const raw = `${ip}|${userAgent}`
  return createHash('sha256').update(raw).digest('hex').slice(0, 24)
}

export default async function publicRoutes(fastify: FastifyInstance) {
  // Получить публичную визитку по slug
  fastify.get('/card/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    try {
      // Получаем данные визитки (только публичные поля)
      const cardResult = await db.query(
        `SELECT id, slug, full_name, title, company_name, phone, email,
          address, website, portfolio_url, bio, avatar_url, logo_url, language_default, is_active
         FROM cards WHERE slug = $1 AND is_active = true`,
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

      // Получаем услуги
      const servicesResult = await db.query(
        `SELECT title, description, is_visible FROM card_services
         WHERE card_id = $1 AND is_visible = true
         ORDER BY sort_order`,
        [card.id]
      )

      return reply
        .header('Cache-Control', 'public, max-age=300, stale-while-revalidate=86400')
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

  // Скачать vCard
  fastify.get('/card/:slug/vcard', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    try {
      const cardResult = await db.query(
        `SELECT id, slug, full_name, title, company_name, phone, email,
          address, website, portfolio_url, bio, avatar_url, logo_url
         FROM cards WHERE slug = $1 AND is_active = true`,
        [slug]
      )

      if (cardResult.rows.length === 0) {
        return reply.code(404).send({ error: 'Card not found' })
      }

      const card = cardResult.rows[0]
      const linksResult = await db.query(
        `SELECT type, url, is_visible FROM card_links
         WHERE card_id = $1 AND is_visible = true
         ORDER BY sort_order`,
        [card.id]
      )

      const vcardContent = await generateVCard({
        ...card,
        links: linksResult.rows
      })

      const userAgent = (request.headers['user-agent'] || '').toLowerCase()
      const isInAppBrowser = /; wv\)|webview|telegram|instagram|fb_iab|line\//i.test(userAgent)
      const disposition = isInAppBrowser
        ? `inline; filename="${slug}.vcf"`
        : `attachment; filename="${slug}.vcf"`

      // Логируем событие сохранения ДО отправки ответа
      const ua = (request.headers['user-agent'] || '').toString()
      const geo = getGeoFromHeaders(request)
      const visitorKey = buildVisitorKey(request, null)
      await db.query(
        `INSERT INTO events (card_id, event_type, referrer, device, country, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          card.id,
          'save_vcard',
          request.headers.referer || null,
          toDeviceLabel(ua),
          geo.country || null,
          {
            visitor_key: visitorKey,
            region: geo.region || null,
            city: geo.city || null,
            geo_source: geo.source,
            user_agent: ua || null
          }
        ]
      ).catch(err => fastify.log.error('Failed to log save_vcard event:', err))

      return reply
        .header('Content-Type', 'text/vcard; charset=utf-8')
        .header('Content-Disposition', disposition)
        .header('Cache-Control', 'no-store')
        .send(vcardContent)
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

    const trimmedName = (typeof name === 'string' ? name : '').trim()
    const trimmedPhone = (typeof phone === 'string' ? phone : '').trim()
    const trimmedEmail = (typeof email === 'string' ? email : '').trim()

    if (!trimmedName || trimmedName.length > 255) {
      return reply.code(400).send({ error: 'Name is required (max 255 chars)' })
    }
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return reply.code(400).send({ error: 'Invalid email format' })
    }
    if (trimmedPhone && !/^[\d\s+()\-]{5,30}$/.test(trimmedPhone)) {
      return reply.code(400).send({ error: 'Invalid phone format' })
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
        [card.id, trimmedName, trimmedPhone || null, trimmedEmail || null, !!consent_marketing, 'web']
      )

      // Логируем событие
      const ua = (request.headers['user-agent'] || '').toString()
      const geo = getGeoFromHeaders(request)
      const visitorKey = buildVisitorKey(request, null)
      await db.query(
        `INSERT INTO events (card_id, event_type, referrer, device, country, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          card.id,
          'lead_submit',
          request.headers.referer || null,
          toDeviceLabel(ua),
          geo.country || null,
          {
            visitor_key: visitorKey,
            region: geo.region || null,
            city: geo.city || null,
            geo_source: geo.source,
            user_agent: ua || null
          }
        ]
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

    // Валидация типа события
    const allowedEvents = ['view', 'click', 'share', 'save_vcard', 'lead_submit']
    if (!event_type || !allowedEvents.includes(event_type)) {
      return reply.code(400).send({ error: 'Invalid event_type' })
    }

    if (!card_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(card_id)) {
      return reply.code(400).send({ error: 'card_id must be a valid UUID' })
    }

    try {
      // Проверяем что карточка существует
      const cardCheck = await db.query('SELECT id FROM cards WHERE id = $1', [card_id])
      if (cardCheck.rows.length === 0) {
        return reply.code(404).send({ error: 'Card not found' })
      }

      const ua = (request.headers['user-agent'] || '').toString()
      const geo = getGeoFromHeaders(request)
      const visitorKey = buildVisitorKey(request, metadata)
      const referrer = request.headers.referer || null
      const eventMetadata = {
        ...(metadata || {}),
        visitor_key: visitorKey,
        region: geo.region || null,
        city: geo.city || null,
        geo_source: geo.source,
        user_agent: ua || null
      }

      // Дедупликация burst-событий: отсекаем одинаковые события посетителя в коротком окне.
      const dedupeCheck = await db.query(
        `SELECT id
         FROM events
         WHERE card_id = $1
           AND event_type = $2
           AND COALESCE(metadata->>'visitor_key', '') = $3
           AND COALESCE(metadata->>'link_type', '') = $4
           AND created_at >= NOW() - INTERVAL '8 seconds'
         LIMIT 1`,
        [card_id, event_type, visitorKey, (metadata?.link_type || '').toString()]
      )

      if (dedupeCheck.rows.length > 0) {
        return { success: true, deduped: true }
      }

      await db.query(
        `INSERT INTO events (card_id, event_type, referrer, device, country, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [card_id, event_type, referrer, toDeviceLabel(ua), geo.country || null, eventMetadata]
      )

      return { success: true }
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })
}
