import dotenv from 'dotenv'

dotenv.config()

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET!,
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
