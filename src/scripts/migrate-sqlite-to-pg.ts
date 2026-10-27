import 'dotenv/config'
import { execFileSync } from 'child_process'
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

/**
 * Reads all tables and rows from a SQLite database file using whichever engine is available on the system:
 * 1. Node built-in `node:sqlite` (if compiled in)
 * 2. Python 3 standard library `sqlite3` (pre-installed on CloudLinux / o2switch / Linux)
 * 3. `sqlite3 -json` CLI
 */
async function readSqliteDatabase(
  sqlitePath: string,
): Promise<Record<string, Record<string, unknown>[]>> {
  // 1. Try node:sqlite
  try {
    const sqliteMod = await import('node:sqlite')
    const db = new sqliteMod.DatabaseSync(sqlitePath, { open: true })
    try {
      const tables = (
        db
          .prepare("SELECT name FROM sqlite_master WHERE type='table'")
          .all() as Array<{ name: string }>
      ).map((r) => r.name)
      const data: Record<string, Record<string, unknown>[]> = {}
      for (const t of tables) {
        data[t] = db.prepare(`SELECT * FROM "${t}"`).all() as Record<string, unknown>[]
      }
      return data
    } finally {
      db.close()
    }
  } catch {
    // Fallback to Python or sqlite3 CLI
  }

  // 2. Try python3 / python (always available on RedHat / CloudLinux / o2switch)
  const pyScript = `
import sqlite3, json, sys
conn = sqlite3.connect(sys.argv[1])
conn.row_factory = sqlite3.Row
cur = conn.cursor()
tables = [r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
data = {}
for t in tables:
    rows = []
    for row in cur.execute('SELECT * FROM "' + t.replace('"', '""') + '"').fetchall():
        d = {}
        for k in row.keys():
            v = row[k]
            if isinstance(v, bytes):
                v = v.decode('utf-8', errors='replace')
            d[k] = v
        rows.append(d)
    data[t] = rows
print(json.dumps(data))
`
  for (const pyBin of ['python3', 'python']) {
    try {
      const stdout = execFileSync(pyBin, ['-c', pyScript, sqlitePath], {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024,
      })
      return JSON.parse(stdout)
    } catch {
      // Try next binary
    }
  }

  // 3. Try sqlite3 CLI
  try {
    const tablesOut = execFileSync(
      'sqlite3',
      [sqlitePath, "SELECT name FROM sqlite_master WHERE type='table';"],
      { encoding: 'utf8' },
    )
    const tables = tablesOut
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    const data: Record<string, Record<string, unknown>[]> = {}
    for (const t of tables) {
      const rowsJson = execFileSync(
        'sqlite3',
        ['-json', sqlitePath, `SELECT * FROM "${t}";`],
        { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 },
      ).trim()
      data[t] = rowsJson ? JSON.parse(rowsJson) : []
    }
    return data
  } catch (err) {
    throw new Error(
      `Impossible de lire ${sqlitePath} (ni node:sqlite, ni python3, ni sqlite3 CLI disponibles): ${err}`,
    )
  }
}

// PostgreSQL error codes for "already exists" (safe to ignore during idempotent schema sync)
const IGNORABLE_PG_CODES = new Set([
  '42710', // duplicate_object (type, constraint, etc.)
  '42P07', // duplicate_table / duplicate_relation (table, index)
  '42701', // duplicate_column
  '42P16', // invalid_table_definition (e.g. primary key already exists)
])

interface PgQueryResult<TRow = Record<string, unknown>> {
  rows: TRow[]
}

interface PgClient {
  query: <TRow = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ) => Promise<PgQueryResult<TRow>>
  release: () => void
}

interface PgPool {
  connect: () => Promise<PgClient>
}

interface DrizzleColumnSnapshot {
  name?: string
  type?: string
  default?: unknown
}

interface DrizzleTableSnapshot {
  name?: string
  columns?: Record<string, DrizzleColumnSnapshot>
}

interface DrizzleSnapshot {
  tables?: Record<string, DrizzleTableSnapshot>
}

interface DrizzleKitApi {
  generateDrizzleJson: (schema: unknown) => Promise<DrizzleSnapshot>
  generateMigration: (before: unknown, after: DrizzleSnapshot) => Promise<string[]>
}

interface PostgresDbAdapter {
  pool?: PgPool
  schema?: unknown
  defaultDrizzleSnapshot?: unknown
  requireDrizzleKit: () => DrizzleKitApi
  destroy?: () => Promise<void>
}

function getPgErrorInfo(err: unknown): { code?: string; message: string } {
  if (typeof err === 'object' && err !== null) {
    const record = err as Record<string, unknown>
    return {
      code: typeof record.code === 'string' ? record.code : undefined,
      message: typeof record.message === 'string' ? record.message : String(err),
    }
  }
  return { message: String(err) }
}

export async function runSyncAndMigrate(options = { requireSqlite: false }) {
  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.DATABASE_URI ||
    'postgresql://postgres:postgres@127.0.0.1:5432/portfolio'

  console.log(`🔌 Connexion à PostgreSQL : ${maskDatabaseUrl(dbUrl)}`)

  const payload = await getPayload({ config })
  const dbAdapter = payload.db as unknown as PostgresDbAdapter
  const pool = dbAdapter.pool

  if (!pool) {
    throw new Error('Pool PostgreSQL introuvable sur payload.db')
  }

  const ddlClient = await pool.connect()
  let pgVersionNum = 100000

  try {
    const verRes = await ddlClient.query<{ ver: string; ver_num: number }>(
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
      } catch (err: unknown) {
        const pgErr = getPgErrorInfo(err)
        if (pgErr.code && IGNORABLE_PG_CODES.has(pgErr.code)) {
          continue
        }
        console.warn(`⚠️ Avertissement DDL (${pgErr.code || 'unknown'}) : ${pgErr.message}`)
      }
    }

    // Also ensure any newly added columns on already-existing tables are created
    if (drizzleJsonAfter?.tables) {
      const tableList: DrizzleTableSnapshot[] = Object.values(drizzleJsonAfter.tables)
      for (const tableObj of tableList) {
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

        const colList: DrizzleColumnSnapshot[] = Object.values(columns)
        for (const colObj of colList) {
          const colName = colObj?.name
          if (!colName || existingSet.has(colName)) continue

          let colType = colObj.type || 'text'
          if (pgVersionNum < 90400 && colType.toLowerCase() === 'jsonb') {
            colType = 'json'
          }
          const defaultClause =
            colObj.default !== undefined ? ` DEFAULT ${String(colObj.default)}` : ''

          try {
            console.log(`➕ Ajout de la colonne manquante "${tableName}"."${colName}"...`)
            await ddlClient.query(
              `ALTER TABLE "${tableName}" ADD COLUMN "${colName}" ${colType}${defaultClause}`,
            )
          } catch (err: unknown) {
            const pgErr = getPgErrorInfo(err)
            if (pgErr.code && IGNORABLE_PG_CODES.has(pgErr.code)) continue
            console.warn(
              `⚠️ Impossible d'ajouter la colonne "${tableName}"."${colName}": ${pgErr.message}`,
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

  const sqliteData = await readSqliteDatabase(sqlitePath)
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

    for (const table of tablesToMigrate) {
      if (!(table in sqliteData)) {
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

      const sqliteRows = sqliteData[table] || []

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
  }

  // Self-test Payload Local API queries against PostgreSQL
  try {
    const usersCheck = await payload.find({ collection: 'users', limit: 1 })
    const projectsCheck = await payload.find({ collection: 'projects', limit: 5 })
    console.log(
      `🔍 Vérification Payload API OK : ${usersCheck.totalDocs} utilisateur(s), ${projectsCheck.totalDocs} projet(s) dans PostgreSQL.`,
    )
  } catch (verifyErr) {
    console.warn('⚠️ Avertissement lors de la vérification Payload API :', verifyErr)
  } finally {
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
