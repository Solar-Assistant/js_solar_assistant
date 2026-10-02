import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

// Serves the repository so the example can import the packages straight from source, with no
// build. Unlike the OAuth example there is no redirect to catch, so a path it cannot find is a
// genuine mistake and says so.
const ROOT = fileURLToPath(new URL('../../../..', import.meta.url))
const PAGE = 'packages/api/example/database/index.html'
const PORT = process.env.PORT || 8001

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
}

async function body(path) {
  const relative = normalize(path).replace(/^(\.\.[/\\])+/, '').replace(/^\/+/, '') || PAGE

  try {
    return { content: await readFile(join(ROOT, relative)), type: TYPES[extname(relative)] || 'application/octet-stream' }
  } catch {
    return null
  }
}

createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname

  if (path === '/favicon.ico') {
    response.writeHead(204)
    response.end()
    return
  }

  const found = await body(path)

  if (!found) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not found')
    return
  }

  response.writeHead(200, { 'Content-Type': `${found.type}; charset=utf-8` })
  response.end(found.content)
}).listen(PORT, () => {
  console.log(`Database example running at http://localhost:${PORT}/`)
})
