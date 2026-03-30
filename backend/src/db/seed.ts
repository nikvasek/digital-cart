import { db } from './index.js'
import bcrypt from 'bcrypt'

async function seed() {
  try {
    console.log('Seeding database...')

    await db.query('BEGIN')

    // Создаем/переиспользуем тестового пользователя
    const existingUser = await db.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      ['admin@example.com']
    )

    let userId = existingUser.rows[0]?.id

    if (!userId) {
      const passwordHash = await bcrypt.hash('admin123', 10)
      const userResult = await db.query(
        `INSERT INTO users (email, password_hash, role) 
         VALUES ($1, $2, $3) 
         RETURNING id`,
        ['admin@example.com', passwordHash, 'owner']
      )
      userId = userResult.rows[0].id
    }

    // Создаем/обновляем тестовую визитку (на основе дизайна из Figma)
    const cardResult = await db.query(
      `INSERT INTO cards (
        user_id, slug, full_name, title, company_name,
<<<<<<< HEAD
        phone, email, website, bio, 
        avatar_url, language_default, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
=======
        phone, email, address, website, portfolio_url, bio, 
        avatar_url, language_default, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
>>>>>>> 8ebb1a4 (feat: admin panel editing for contacts address and portfolio)
      ON CONFLICT (slug) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        full_name = EXCLUDED.full_name,
        title = EXCLUDED.title,
        company_name = EXCLUDED.company_name,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
<<<<<<< HEAD
        website = EXCLUDED.website,
=======
        address = EXCLUDED.address,
        website = EXCLUDED.website,
        portfolio_url = EXCLUDED.portfolio_url,
>>>>>>> 8ebb1a4 (feat: admin panel editing for contacts address and portfolio)
        bio = EXCLUDED.bio,
        avatar_url = EXCLUDED.avatar_url,
        language_default = EXCLUDED.language_default,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING id`,
      [
        userId,
        'paulline-ferreira',
        'Paulline Ferreira',
        'Professional Hairstylist',
        'Hair Studio',
        '+375 29 232 73 82',
        'paulline@example.com',
<<<<<<< HEAD
        'https://example.com',
=======
        'Kalvariyskaya 42, Minsk',
        'https://example.com',
        'https://example.com/portfolio',
>>>>>>> 8ebb1a4 (feat: admin panel editing for contacts address and portfolio)
        'Custom men\'s haircuts and beard styling.\nEyes are drawn to uniqueness.',
        'https://via.placeholder.com/150',
        'en',
        true
      ]
    )
    const cardId = cardResult.rows[0].id

    await db.query(`DELETE FROM card_links WHERE card_id = $1`, [cardId])
    await db.query(`DELETE FROM card_media WHERE card_id = $1`, [cardId])
    await db.query(`DELETE FROM card_services WHERE card_id = $1`, [cardId])

    // Добавляем ссылки на соцсети
    const socialLinks = [
      { type: 'instagram', url: 'https://instagram.com/paulline' },
      { type: 'telegram', url: 'https://t.me/paulline' },
      { type: 'whatsapp', url: 'https://wa.me/375292327382' },
      { type: 'viber', url: 'viber://chat?number=375292327382' },
      { type: 'tiktok', url: 'https://tiktok.com/@paulline' },
      { type: 'facebook', url: 'https://www.facebook.com/paulline' },
      { type: 'linkedin', url: 'https://www.linkedin.com/in/paulline' },
      { type: 'youtube', url: 'https://www.youtube.com/@paulline' }
    ]

    for (let i = 0; i < socialLinks.length; i++) {
      await db.query(
        `INSERT INTO card_links (card_id, type, url, sort_order, is_visible)
         VALUES ($1, $2, $3, $4, $5)`,
        [cardId, socialLinks[i].type, socialLinks[i].url, i, true]
      )
    }

    // Добавляем фейковые изображения для галереи
    for (let i = 1; i <= 8; i++) {
      await db.query(
        `INSERT INTO card_media (card_id, file_url, type, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [cardId, `https://via.placeholder.com/300x200?text=Gallery+${i}`, 'image', i]
      )
    }

    const services = [
      {
        title: 'Classic haircut',
        description: 'Scissor and clipper cut with clean outline'
      },
      {
        title: 'Beard styling',
        description: 'Shape correction, contour, and grooming'
      },
      {
        title: 'Haircut + Beard combo',
        description: 'Full look update in one session'
      }
    ]

    for (let i = 0; i < services.length; i++) {
      await db.query(
        `INSERT INTO card_services (card_id, title, description, sort_order, is_visible)
         VALUES ($1, $2, $3, $4, $5)`,
        [cardId, services[i].title, services[i].description, i, true]
      )
    }

    await db.query('COMMIT')

    console.log('✅ Seeding completed successfully')
    console.log('\nTest credentials:')
    console.log('Email: admin@example.com')
    console.log('Password: admin123')
    console.log(`\nTest card URL: http://localhost:5173/paulline-ferreira`)
    
    process.exit(0)
  } catch (error) {
    await db.query('ROLLBACK').catch(() => undefined)
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seed()
