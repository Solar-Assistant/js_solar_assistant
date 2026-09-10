import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import { decodeIdToken } from '@solar-assistant/oauth'

// The server-side client: the code is exchanged here with the application secret, so the token
// never reaches the browser. Contrast ../browser, which runs in the page with no secret at all.
// Registering one application for both is fine; they are two ways to use the same one.
const AUTH_SERVER = process.env.AUTH_SERVER || 'https://solar-assistant.io'
const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const PORT = process.env.PORT || 8000
const REDIRECT_URI = `http://localhost:${PORT}/oauth/callback`
const SCOPES = 'openid sites:read_single'

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set CLIENT_ID and CLIENT_SECRET. The secret belongs in the environment, never in a file.')
  process.exit(1)
}

// One process, one visitor: a real application keys both of these by session.
const pending = new Set()
let granted = null

const escape = value =>
  String(value).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

const page = body => `<!doctype html><meta charset="utf-8">
<title>Connect SolarAssistant: server-side client</title>
<style>body{font:15px/1.55 system-ui,sans-serif;margin:0 auto;padding:2rem 1rem;max-width:46rem}
pre{background:#8881;padding:.75rem;border-radius:.4rem;overflow-x:auto;font-size:13px}
a.button{display:inline-block;padding:.55rem 1.1rem;border-radius:.4rem;border:1px solid #8884;
color:inherit;text-decoration:none}
a.button.primary{background:#1a7f5a;color:#fff;border-color:transparent}
.error{color:#b3261e}</style>
<h1>Connect SolarAssistant</h1>
<p style="opacity:.7">The authorization code flow with a client secret, exchanged on the server.</p>
${body}`

function index() {
  if (!granted) return page('<p><a class="button primary" href="/oauth/solar-assistant">Connect SolarAssistant</a></p>')

  const claims = granted.id_token ? decodeIdToken(granted.id_token) : null

  return page(`<p>Connected. The token stayed on the server; this page never saw it.</p>
    <p>Scope:</p><pre>${escape(JSON.stringify(granted.scope_detail ?? granted.scope, null, 2))}</pre>
    ${claims ? `<p>Signed-in user, from the id_token:</p><pre>${escape(JSON.stringify(claims, null, 2))}</pre>` : ''}
    <p><a class="button" href="/api">Call the API with this token</a>
    <a class="button" href="/keep">Keep the access</a>
    <a href="/forget">Forget</a></p>
    <p style="opacity:.7">"Keep the access" records the consent against your organization, so your
    own API token reads this site once the 24 hour token lapses. It outlives the token: the site
    stays readable by everyone in your organization until the grant is removed, and today it can
    only be removed by us.</p>`)
}

function authorize() {
  const state = randomBytes(32).toString('base64url')
  pending.add(state)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
  })

  return `${AUTH_SERVER}/oauth/authorize?${params}`
}

async function callback(url) {
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) throw new Error(url.searchParams.get('error_description') || error)
  if (!code) throw new Error('No authorization code came back.')
  if (!pending.delete(url.searchParams.get('state'))) throw new Error('State mismatch. The response is not the one we asked for.')

  const response = await fetch(`${AUTH_SERVER}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
    }).toString(),
  })

  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error_description || body?.error || `Token request failed (${response.status})`)

  granted = body
}

// The organization and the application are read from the token, not from what we send, so a token
// can only ever add a site to the organization that owns the application it belongs to.
async function keepAccess() {
  const siteId = granted.scope_detail?.['sites:read_single']?.id
  if (!siteId) throw new Error('This token carries no site to keep.')

  const response = await fetch(`${AUTH_SERVER}/api/v1/organization_sites`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${granted.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ site_id: siteId }),
  })

  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error?.message || body?.error || `Refused (${response.status})`)

  return page(`<p>Site ${escape(siteId)} is now readable by your organization with your own API
    token, and stays so after this one lapses.</p><pre>${escape(JSON.stringify(body, null, 2))}</pre>
    <p><a href="/">Back</a></p>`)
}

async function callApi() {
  const headers = { Authorization: `Bearer ${granted.access_token}` }
  const siteId = granted.scope_detail?.['sites:read_single']?.id

  const answers = { '/user': await fetch(`${AUTH_SERVER}/api/v1/user`, { headers }).then(r => r.json()) }
  if (siteId) answers[`/sites/${siteId}`] = await fetch(`${AUTH_SERVER}/api/v1/sites/${siteId}`, { headers }).then(r => r.json())

  return page(`<pre>${escape(JSON.stringify(answers, null, 2))}</pre><p><a href="/">Back</a></p>`)
}

const redirect = (response, to) => {
  response.writeHead(302, { Location: to })
  response.end()
}

const html = (response, body) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  response.end(body)
}

createServer(async (request, response) => {
  const url = new URL(request.url, `http://localhost:${PORT}`)

  try {
    switch (url.pathname) {
      case '/':
        return html(response, index())
      case '/oauth/solar-assistant':
        return redirect(response, authorize())
      case '/oauth/callback':
        await callback(url)
        return redirect(response, '/')
      case '/api':
        return granted ? html(response, await callApi()) : redirect(response, '/')
      case '/keep':
        return granted ? html(response, await keepAccess()) : redirect(response, '/')
      case '/forget':
        granted = null
        return redirect(response, '/')
      default:
        response.writeHead(404).end('Not found')
    }
  } catch (error) {
    html(response, page(`<p class="error">${escape(error.message)}</p><p><a href="/">Start again</a></p>`))
  }
}).listen(PORT, () => {
  console.log(`Server-side OAuth example running at http://localhost:${PORT}/`)
  console.log(`Register ${REDIRECT_URI} on the application.`)
})
