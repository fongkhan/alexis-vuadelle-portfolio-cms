import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import config from '../payload.config'

// Force development mode so Payload/Drizzle allows schema push even if .env has NODE_ENV=production
;(process.env as any).NODE_ENV = 'development'
;(process.env as any).PAYLOAD_FORCE_DRIZZLE_PUSH = 'true'
;(process.env as any).PAYLOAD_MIGRATING = 'false'

function maskDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.password) {
      parsed.password = '***'
    }
    return parsed.toString()
  } catch {
    return url.replace(/:([^:@]+)@/, ':***@')
  }
}

function coerceValue(val: unknown, pgDataType: string, colName: string): unknown {
  if (val === undefined || val === null) {
    if (colName === 'created_at' || colName === 'updated_at') {
      return new Date().toISOString()
    }
    return null
  }

  if (pgDataType === 'boolean') {
    if (typeof val === 'boolean') return val
    if (typeof val === 'number') return val !== 0
    if (typeof val === 'string') return val === '1' || val.toLowerCase() === 'true'
    return Boolean(val)
  }

  if (pgDataType === 'json' || pgDataType === 'jsonb') {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val)
      } catch {
        return null
      }
    }
    return val
  }

  return val
}

export async function runSyncAndMigrate(options = { requireSqlite: false }) {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.DATABASE_URI ||
    'postgresql://postgres:postgres@127.0.0.1:5432/portfolio'

  console.log(`🔌 Connexion à PostgreSQL : ${maskDatabaseUrl(dbUrl)}`)

  const payload = await getPayload({ config })
  const dbAdapter = payload.db as any
  const pool = dbAdapter.pool

  if (!pool) {
    throw new Error('Pool PostgreSQL introuvable sur payload.db')
  }

  // Verify if schema was pushed during getPayload; if not, force pushSchema via adapter's drizzle-kit
  const checkClient = await pool.connect()
  try {
    const { rows } = await checkClient.query(
      `SELECT to_regclass('public.users') AS users_table`,
    )
    if (!rows[0]?.users_table && typeof dbAdapter.requireDrizzleKit === 'function') {
      console.log('📦 Tables absentes dans PostgreSQL, création du schéma via Drizzle...')
      const { pushSchema } = dbAdapter.requireDrizzleKit()
      const { apply } = await pushSchema(dbAdapter.schema, dbAdapter.drizzle)
      await apply()
    }
  } finally {
    checkClient.release()
  }

  console.log('✅ Schéma PostgreSQL synchronisé avec succès.')

  const sqlitePath =
    process.env.SQLITE_PATH || path.resolve(process.cwd(), 'payload.db')

  if (!fs.existsSync(sqlitePath)) {
    if (options.requireSqlite) {
      console.warn(`⚠️ Fichier SQLite introuvable à l'emplacement : ${sqlitePath}`)
      console.warn(
        'Le schéma PostgreSQL est bien créé, mais aucune donnée SQLite locale n’a pu être importée (car payload.db n’est pas présent dans ce dossier).',
      )
    }
    if (typeof payload.db?.destroy === 'function') {
      await payload.db.destroy()
    }
    return
  }

  console.log(`📂 Fichier SQLite détecté (${sqlitePath}), démarrage de l'import des données...`)

  let DatabaseSync: any
  try {
    const sqliteMod = await import('node:sqlite')
    DatabaseSync = sqliteMod.DatabaseSync
  } catch (err) {
    console.error(
      '❌ Impossible de charger le module natif node:sqlite (nécessite Node.js >= 22.5) :',
      err,
    )
    if (typeof payload.db?.destroy === 'function') {
      await payload.db.destroy()
    }
    process.exit(1)
  }

  const sqlite = new DatabaseSync(sqlitePath, { open: true })
  const client = await pool.connect()

  // Ordered to respect foreign key constraints (media before projects/globals)
  const tablesToMigrate = [
    'users',
    'media',
    'projects',
    'projects_tech_stack',
    'profile',
    'home_page',
    'about_page',
  ]

  try {
    await client.query('BEGIN')

    const sqliteTables = new Set(
      (
        sqlite
          .prepare("SELECT name FROM sqlite_master WHERE type='table'")
          .all() as Array<{ name: string }>
      ).map((r) => r.name),
    )

    for (const table of tablesToMigrate) {
      if (!sqliteTables.has(table)) {
        console.log(`⏭️ Table "${table}" absente dans SQLite, ignorée.`)
        continue
      }

      // Discover actual columns & types in PostgreSQL for this table
      const { rows: pgCols } = await client.query<{
        column_name: string
        data_type: string
      }>(
        `SELECT column_name, data_type
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1`,
        [table],
      )

      if (pgCols.length === 0) {
        console.log(`⏭️ Table "${table}" absente dans PostgreSQL, ignorée.`)
        continue
      }

      const pgColTypeMap = new Map<string, string>(
        pgCols.map((c) => [c.column_name, c.data_type]),
      )

      const sqliteRows = sqlite.prepare(`SELECT * FROM "${table}"`).all() as Record<
        string,
        unknown
      >[]

      if (sqliteRows.length === 0) {
        console.log(`ℹ️ Table "${table}" : 0 ligne dans SQLite.`)
        continue
      }

      console.log(`📥 Migration de "${table}" (${sqliteRows.length} ligne(s))...`)

      for (const row of sqliteRows) {
        // Intersect columns present in both SQLite row and PostgreSQL table
        const commonCols = Object.keys(row).filter((col) => pgColTypeMap.has(col))
        if (commonCols.length === 0) continue

        const quotedCols = commonCols.map((c) => `"${c}"`).join(', ')
        const placeholders = commonCols.map((_, idx) => `$${idx + 1}`).join(', ')
        const values = commonCols.map((col) =>
          coerceValue(row[col], pgColTypeMap.get(col) || 'text', col),
        )

        const updateCols = commonCols.filter((c) => c !== 'id')
        const conflictClause =
          pgColTypeMap.has('id') && updateCols.length > 0
            ? `ON CONFLICT ("id") DO UPDATE SET ${updateCols
                .map((c) => `"${c}" = EXCLUDED."${c}"`)
                .join(', ')}`
            : 'ON CONFLICT DO NOTHING'

        await client.query(
          `INSERT INTO "${table}" (${quotedCols}) VALUES (${placeholders}) ${conflictClause}`,
          values,
        )
      }

      // Update PostgreSQL serial/identity sequence if table has a numeric id
      if (pgColTypeMap.get('id') === 'integer' || pgColTypeMap.get('id') === 'bigint') {
        await client.query(`
          SELECT setval(
            pg_get_serial_sequence('${table}', 'id'),
            COALESCE((SELECT MAX(id) FROM "${table}"), 1),
            (SELECT COUNT(*) > 0 FROM "${table}")
          )
        `)
      }
    }

    await client.query('COMMIT')
    console.log('🎉 Migration SQLite -> PostgreSQL terminée avec succès !')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
    sqlite.close()
    if (typeof payload.db?.destroy === 'function') {
      await payload.db.destroy()
    }
  }
}

// Run when executed directly
const isDirectRun =
  process.argv[1]?.endsWith('migrate-sqlite-to-pg.ts') ||
  process.argv[1]?.endsWith('sync-db.ts')

if (isDirectRun && process.argv[1]?.endsWith('migrate-sqlite-to-pg.ts')) {
  runSyncAndMigrate({ requireSqlite: true })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Échec de la migration SQLite -> PostgreSQL :', err)
      process.exit(1)
    })
}
