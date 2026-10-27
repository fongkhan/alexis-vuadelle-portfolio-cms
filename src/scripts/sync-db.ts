import { runSyncAndMigrate } from './migrate-sqlite-to-pg'

runSyncAndMigrate({ requireSqlite: false })
  .then(() => {
    process.exit(0)
  })
  .catch((err) => {
    console.error('❌ Échec de la synchronisation PostgreSQL :', err)
    process.exit(1)
  })
