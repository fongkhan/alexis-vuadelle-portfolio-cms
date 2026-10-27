import fs from 'fs'
import path from 'path'
import util from 'util'

const globalForLogger = globalThis as unknown as {
  __cmsConsoleErrorHooked?: boolean
}

function appendErrorLog(entry: string): void {
  try {
    fs.appendFileSync(path.resolve(process.cwd(), 'server-error.log'), entry, 'utf8')
  } catch {
    // Ignore fs errors
  }
}

if (!globalForLogger.__cmsConsoleErrorHooked) {
  globalForLogger.__cmsConsoleErrorHooked = true
  const origConsoleError = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    origConsoleError(...args)
    const timestamp = new Date().toISOString()
    const detail = args
      .map((arg) =>
        typeof arg === 'string'
          ? arg
          : util.inspect(arg, { depth: 6, breakLength: 120 }),
      )
      .join(' ')
    appendErrorLog(`[${timestamp}] [console.error]\n${detail}\n\n`)
  }
}

export function isNextRouterError(err: unknown): boolean {
  if (typeof err === 'object' && err !== null && 'digest' in err) {
    const digest = String((err as Record<string, unknown>).digest || '')
    return (
      digest === 'DYNAMIC_SERVER_USAGE' ||
      digest.startsWith('NEXT_REDIRECT') ||
      digest.startsWith('NEXT_NOT_FOUND') ||
      digest.startsWith('NEXT_HTTP_ERROR_FALLBACK') ||
      digest.startsWith('NEXT_')
    )
  }
  return false
}

function getSafeDbDiag(): string {
  const raw = process.env.DATABASE_URL || process.env.DATABASE_URI || ''
  const envFile = process.env.__LOADED_ENV_FILE || 'default'
  if (!raw) return `dbUrl=<empty> (envFile=${envFile})`
  try {
    const u = new URL(raw)
    const decodedPwd = decodeURIComponent(u.password || '')
    return `user=${u.username} host=${u.hostname}:${u.port || '5432'} db=${u.pathname.replace(/^\//, '')} pwdLen=${decodedPwd.length} envFile=${envFile}`
  } catch {
    return `dbUrl=<unparseable len=${raw.length}> (envFile=${envFile})`
  }
}

export function formatServerError(context: string, err: unknown): string {
  const timestamp = new Date().toISOString()
  const detail = util.inspect(err, { depth: 6, breakLength: 120 })
  const entry = `[${timestamp}] [${context}] [${getSafeDbDiag()}]\n${detail}\n\n`

  appendErrorLog(entry)

  return entry
}
