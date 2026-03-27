import { db } from './index.js'
import bcrypt from 'bcrypt'

async function seed() {
  try {
    console.log('Seeding database...')

    // Создаем тестового пользователя
    const passwordHash = await bcrypt.hash('admin123', 10)
    const userResult = await db.query(
      `INSERT INTO users (email, password_hash, role) 
       VALUES ($1, $2, $3) 
       RETURNING id`,
      ['admin@example.com', passwordHash, 'owner']
    )
    const userId = userResult.rows[0].id

    // Создаем тестовую визитку (на основе дизайна из Figma)
    const cardResult = await db.query(
      `INSERT INTO cards (
        user_id, slug, full_name, title, company_name,
        phone, email, website, bio, 
        avatar_url, language_default, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
      [
        userId,
        'paulline-ferreira',
        'Paulline Ferreira',
        'Professional Hairstylist',
        'Hair Studio',
        '+375 29 232 73 82',
        'paulline@example.com',
        'https://example.com',
        'Custom men\'s haircuts and beard styling.\nEyes are drawn to uniqueness.',
        'https://via.placeholder.com/150',
        'en',
        true
      ]
    )
    const cardId = cardResult.rows[0].id

    // Добавляем ссылки на соцсети
    const socialLinks = [
      { type: 'instagram', url: 'https://instagram.com/paulline' },
      { type: 'telegram', url: 'https://t.me/paulline' },
      { type: 'whatsapp', url: 'https://wa.me/375292327382' },
      { type: 'viber', url: 'viber://chat?number=375292327382' },
      { type: 'tiktok', url: 'https://tiktok.com/@paulline' }
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

    console.log('✅ Seeding completed successfully')
    console.log('\nTest credentials:')
    console.log('Email: admin@example.com')
    console.log('Password: admin123')
    console.log(`\nTest card URL: http://localhost:5173/paulline-ferreira`)
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seed()
