import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'

// Phusion Passenger in o2switch supplies a string (like 'passenger') or random port.
// We fall back to 3000 if running locally or if Passenger allows standard binding.
const port = process.env.PORT || 3000
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  server.listen(port, () => {
    console.log(`> Ready on port ${port}`)
  })
})
