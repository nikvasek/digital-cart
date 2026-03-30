import pg from 'pg'

const { Client } = pg
const connectionString = process.env.DATABASE_PUBLIC_URL

if (!connectionString) {
  console.error('DATABASE_PUBLIC_URL is required')
  process.exit(1)
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })

const links = [
  ['instagram', 'https://instagram.com/paulline', true],
  ['telegram', 'https://t.me/paulline', true],
  ['whatsapp', 'https://wa.me/375292327382', true],
  ['viber', 'viber://chat?number=%2B375292327382', true],
  ['tiktok', 'https://www.tiktok.com/@paulline', true],
  ['facebook', 'https://www.facebook.com/paulline', true],
  ['linkedin', 'https://www.linkedin.com/in/paulline', true],
  ['youtube', 'https://www.youtube.com/@paulline', true]
]

const services = [
  ['Classic haircut', 'Scissor and clipper cut with clean outline', true],
  ['Beard styling', 'Shape correction, contour, and grooming', true],
  ['Haircut + Beard combo', 'Full look update in one session', true]
]

const media = [
  ['https://via.placeholder.com/1200x800?text=Gallery+1', 'image'],
  ['https://via.placeholder.com/1200x800?text=Gallery+2', 'image'],
  ['https://via.placeholder.com/1200x800?text=Gallery+3', 'image']
]

await client.connect()
await client.query('BEGIN')

try {
  await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto')

  const userRes = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', ['admin@example.com'])
  let userId = userRes.rows[0]?.id

  if (!userId) {
    const insertUser = await client.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
      ['admin@example.com', '$2b$10$Gf7qD7nN2M4B0a3eS2f3YeQy4Rx8W2m1mQnF1m0vQx8u0M4K3g6pK', 'owner']
    )
    userId = insertUser.rows[0].id
  }

  const cardRes = await client.query(
    `INSERT INTO cards (
      user_id, slug, full_name, title, company_name,
      phone, email, website, bio,
      avatar_url, logo_url, language_default, is_active
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (slug) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      full_name = EXCLUDED.full_name,
      title = EXCLUDED.title,
      company_name = EXCLUDED.company_name,
      phone = EXCLUDED.phone,
      email = EXCLUDED.email,
      website = EXCLUDED.website,
      bio = EXCLUDED.bio,
      avatar_url = EXCLUDED.avatar_url,
      logo_url = EXCLUDED.logo_url,
      language_default = EXCLUDED.language_default,
      is_active = EXCLUDED.is_active,
      updated_at = NOW()
    RETURNING id`,
    [
      userId,
      'paulline-ferreira',
      'Paulline Ferreira',
      "Custom men's haircuts and beard styling",
      'Digital Business Card',
      '+375292327382',
      'paulline@example.com',
      'https://kalvariyskaya42.by',
      'Eyes are drawn to uniqueness.',
      'https://via.placeholder.com/300x300?text=Avatar',
      '',
      'en',
      true
    ]
  )

  const cardId = cardRes.rows[0].id

  await client.query('DELETE FROM card_links WHERE card_id = $1', [cardId])
  for (let i = 0; i < links.length; i++) {
    const [type, url, isVisible] = links[i]
    await client.query(
      'INSERT INTO card_links (card_id, type, url, sort_order, is_visible) VALUES ($1,$2,$3,$4,$5)',
      [cardId, type, url, i, isVisible]
    )
  }

  await client.query('DELETE FROM card_services WHERE card_id = $1', [cardId])
  for (let i = 0; i < services.length; i++) {
    const [title, description, isVisible] = services[i]
    await client.query(
      'INSERT INTO card_services (card_id, title, description, sort_order, is_visible) VALUES ($1,$2,$3,$4,$5)',
      [cardId, title, description, i, isVisible]
    )
  }

  await client.query('DELETE FROM card_media WHERE card_id = $1', [cardId])
  for (let i = 0; i < media.length; i++) {
    const [fileUrl, type] = media[i]
    await client.query(
      'INSERT INTO card_media (card_id, file_url, type, sort_order) VALUES ($1,$2,$3,$4)',
      [cardId, fileUrl, type, i]
    )
  }

  await client.query('COMMIT')
  console.log('✅ Upserted card:', cardId)
} catch (error) {
  await client.query('ROLLBACK')
  console.error('❌ Upsert failed:', error)
  process.exitCode = 1
} finally {
  await client.end()
}
