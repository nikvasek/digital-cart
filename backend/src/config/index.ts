import dotenv from 'dotenv'

dotenv.config()

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required')
}
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}
if (!process.env.ADMIN_PIN) {
  throw new Error('ADMIN_PIN environment variable is required')
}

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  adminPin: process.env.ADMIN_PIN,
  adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com',
  storageType: process.env.STORAGE_TYPE || 'local',
  storagePath: process.env.STORAGE_PATH || './uploads',
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID
  }
}
