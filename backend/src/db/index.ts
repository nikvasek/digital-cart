import pg from 'pg'
import { config } from '../config/index.js'

const { Pool } = pg

export const db = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.nodeEnv === 'production'
    ? { rejectUnauthorized: false }
    : undefined
})

// Хелперы для работы с БД
export const query = async (text: string, params?: any[]) => {
  const start = Date.now()
  const res = await db.query(text, params)
  const duration = Date.now() - start
  console.log('Executed query:', { text, duration, rows: res.rowCount })
  return res
}
