import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

// Serves the repository so the example can import the packages straight from source, with no
// build. Anything it cannot find falls through to the example page rather than 404ing, because
// the OAuth redirect comes back to /oauth/callback, which is not a file.
const ROOT = fileURLToPath(new URL('../../../..', import.meta.url))
const PAGE = 'packages/oauth/example/browser/index.html'
const PORT = process.env.PORT || 8000

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
}

async function body(path) {
  const relative = normalize(path).replace(/^(\.\.[/\\])+/, '').replace(/^\/+/, '')
  if (!relative) return null

  try {
    return { content: await readFile(join(ROOT, relative)), type: TYPES[extname(relative)] || 'application/octet-stream' }
  } catch {
    return null
  }
}

createServer(async (request, response) => {
  const found = await body(new URL(request.url, 'http://localhost').pathname)
  const { content, type } = found || { content: await readFile(join(ROOT, PAGE)), type: 'text/html' }

  response.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` })
  response.end(content)
}).listen(PORT, () => {
  console.log(`OAuth example running at http://localhost:${PORT}/`)
  console.log('Pass your application id the first time: http://localhost:%d/?client_id=<id>', PORT)
})
