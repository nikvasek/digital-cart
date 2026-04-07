import { db } from './index.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function migrate() {
  try {
    console.log('Running database migrations...')
    
    const schema = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf-8')
    await db.query(schema)
    
    console.log('✅ Migrations completed successfully')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

migrate()
