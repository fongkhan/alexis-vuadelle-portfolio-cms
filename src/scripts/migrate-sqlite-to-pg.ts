import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import config from '../payload.config'

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

// PostgreSQL error codes for "already exists" (safe to ignore during idempotent schema sync)
const IGNORABLE_PG_CODES = new Set([
  '42710', // duplicate_object (type, constraint, etc.)
  '42P07', // duplicate_table / duplicate_relation (table, index)
  '42701', // duplicate_column
  '42P16', // invalid_table_definition (e.g. primary key already exists)
])

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

  const ddlClient = await pool.connect()
  let pgVersionNum = 100000

  try {
    const verRes = await ddlClient.query(
      `SELECT version() AS ver, current_setting('server_version_num')::int AS ver_num`,
    )
    pgVersionNum = Number(verRes.rows[0]?.ver_num) || 100000
    console.log(`🗄️ Serveur détecté : ${verRes.rows[0]?.ver}`)

    console.log('📦 Génération du schéma SQL depuis la configuration Payload...')
    const { generateDrizzleJson, generateMigration } = dbAdapter.requireDrizzleKit()
    const drizzleJsonAfter = await generateDrizzleJson(dbAdapter.schema)
    const drizzleJsonBefore = dbAdapter.defaultDrizzleSnapshot
    const sqlStatementsUp: string[] = await generateMigration(
      drizzleJsonBefore,
      drizzleJsonAfter,
    )

    console.log(`⚙️ Application de ${sqlStatementsUp.length} instruction(s) DDL...`)
    for (let stmt of sqlStatementsUp) {
      stmt = stmt.trim()
      if (!stmt) continue

      // Fallback for PostgreSQL < 9.4 where jsonb did not exist yet
      if (pgVersionNum < 90400) {
        stmt = stmt.replace(/\bjsonb\b/gi, 'json')
      }

      try {
        await ddlClient.query(stmt)
      } catch (err: any) {
        if (err?.code && IGNORABLE_PG_CODES.has(err.code)) {
          // Object/table/constraint already exists -> safe to continue
          continue
        }
        console.warn(`⚠️ Avertissement DDL (${err?.code || 'unknown'}) : ${err?.message}`)
      }
    }

    // Also ensure any newly added columns on already-existing tables are created
    if (drizzleJsonAfter?.tables) {
      for (const tableObj of Object.values<any>(drizzleJsonAfter.tables)) {
        const tableName = tableObj?.name
        const columns = tableObj?.columns
        if (!tableName || !columns) continue

        const { rows: existingCols } = await ddlClient.query<{ column_name: string }>(
          `SELECT column_name
           FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = $1`,
          [tableName],
        )
        const existingSet = new Set(existingCols.map((c) => c.column_name))

        for (const colObj of Object.values<any>(columns)) {
          const colName = colObj?.name
          if (!colName || existingSet.has(colName)) continue

          let colType = colObj.type || 'text'
          if (pgVersionNum < 90400 && colType.toLowerCase() === 'jsonb') {
            colType = 'json'
          }
          const defaultClause =
            colObj.default !== undefined ? ` DEFAULT ${colObj.default}` : ''

          try {
            console.log(`➕ Ajout de la colonne manquante "${tableName}"."${colName}"...`)
            await ddlClient.query(
              `ALTER TABLE "${tableName}" ADD COLUMN "${colName}" ${colType}${defaultClause}`,
            )
          } catch (err: any) {
            if (err?.code && IGNORABLE_PG_CODES.has(err.code)) continue
            console.warn(
              `⚠️ Impossible d'ajouter la colonne "${tableName}"."${colName}": ${err?.message}`,
            )
          }
        }
      }
    }

    // Record dev migration marker in payload_migrations
    try {
      const { rows: migRows } = await ddlClient.query(
        `SELECT id FROM "payload_migrations" WHERE batch = -1 LIMIT 1`,
      )
      if (migRows.length === 0) {
        await ddlClient.query(
          `INSERT INTO "payload_migrations" (name, batch) VALUES ('dev', -1)`,
        )
      }
    } catch {
      // Ignore if payload_migrations table is not used
    }
  } finally {
    ddlClient.release()
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
        const commonCols = Object.keys(row).filter((col) => pgColTypeMap.has(col))
        if (commonCols.length === 0) continue

        const values = commonCols.map((col) =>
          coerceValue(row[col], pgColTypeMap.get(col) || 'text', col),
        )

        // Check if row with same id already exists (compatible with all PostgreSQL versions including < 9.5)
        let exists = false
        if (pgColTypeMap.has('id') && row.id !== undefined && row.id !== null) {
          const checkRes = await client.query(
            `SELECT 1 FROM "${table}" WHERE "id" = $1 LIMIT 1`,
            [row.id],
          )
          exists = checkRes.rows.length > 0
        }

        if (exists) {
          const updateCols = commonCols.filter((c) => c !== 'id')
          if (updateCols.length > 0) {
            const setClause = updateCols
              .map((c, idx) => `"${c}" = $${idx + 1}`)
              .join(', ')
            const updateValues = updateCols.map((col) =>
              coerceValue(row[col], pgColTypeMap.get(col) || 'text', col),
            )
            await client.query(
              `UPDATE "${table}" SET ${setClause} WHERE "id" = $${updateCols.length + 1}`,
              [...updateValues, row.id],
            )
          }
        } else {
          const quotedCols = commonCols.map((c) => `"${c}"`).join(', ')
          const placeholders = commonCols.map((_, idx) => `$${idx + 1}`).join(', ')
          await client.query(
            `INSERT INTO "${table}" (${quotedCols}) VALUES (${placeholders})`,
            values,
          )
        }
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

const isDirectRun = process.argv[1]?.endsWith('migrate-sqlite-to-pg.ts')

if (isDirectRun) {
  runSyncAndMigrate({ requireSqlite: true })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Échec de la migration SQLite -> PostgreSQL :', err)
      process.exit(1)
    })
}
