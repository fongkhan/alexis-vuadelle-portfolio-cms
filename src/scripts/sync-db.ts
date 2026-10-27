import 'dotenv/config'
import { getPayload } from 'payload'
import config from '../payload.config'

async function syncDb() {
  console.log('Synchronizing PostgreSQL database schema...')
  const payload = await getPayload({ config })
  if (typeof payload.db?.destroy === 'function') {
    await payload.db.destroy()
  }
  console.log('Database schema synchronized successfully!')
  process.exit(0)
}

syncDb().catch((err) => {
  console.error('Database sync failed:', err)
  process.exit(1)
})
