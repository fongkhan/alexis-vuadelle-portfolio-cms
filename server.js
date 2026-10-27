import dotenv from 'dotenv'
import fs from 'fs'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath, parse } from 'url'
import next from 'next'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '.env') })
dotenv.config()

// Default to production under Phusion Passenger unless explicitly running in development
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production'
}

const port = process.env.PORT || 3000
const dev = process.env.NODE_ENV === 'development'
const app = next({ dev, dir: __dirname })
const handle = app.getRequestHandler()

function logServerError(context, err) {
  const timestamp = new Date().toISOString()
  const detail = err?.stack || err?.message || String(err)
  const entry = `[${timestamp}] [${context}] ${detail}\n\n`
  console.error(entry)
  try {
    const tmpDir = path.resolve(__dirname, 'tmp')
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true })
    }
    fs.appendFileSync(path.resolve(tmpDir, 'passenger-error.log'), entry, 'utf8')
  } catch {
    // Ignore file logging errors
  }
}

let initError = null
let isReady = false

app
  .prepare()
  .then(() => {
    isReady = true
    console.log(`> Next.js prepared (dev=${dev})`)
  })
  .catch((err) => {
    initError = err
    logServerError('app.prepare', err)
  })

const server = createServer(async (req, res) => {
  if (initError) {
    res.statusCode = 500
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end(
      `CMS Startup Error:\n${initError?.stack || initError?.message || String(initError)}`,
    )
    return
  }

  if (!isReady) {
    // Wait briefly if request arrives while Next.js is still preparing
    for (let i = 0; i < 50 && !isReady && !initError; i++) {
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  try {
    const parsedUrl = parse(req.url, true)
    await handle(req, res, parsedUrl)
  } catch (err) {
    logServerError(`request ${req.method} ${req.url}`, err)
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end(`Internal Server Error:\n${err?.message || String(err)}`)
    }
  }
})

server.listen(port, () => {
  console.log(`> Server listening on ${port} (NODE_ENV=${process.env.NODE_ENV})`)
})
