import { Context, Next } from 'hono'

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false
  // Exact matches for known origins
  if (
    origin === 'https://four-quarters.pages.dev' ||
    origin === 'http://localhost:5173' ||
    origin === 'http://localhost:4173'
  ) return true
  // All Cloudflare Pages preview deployments (e.g. abc123.four-quarters.pages.dev)
  return /^https:\/\/[a-zA-Z0-9-]+\.four-quarters\.pages\.dev$/.test(origin)
}

export async function corsMiddleware(c: Context, next: Next) {
  const requestOrigin = c.req.header('Origin') || ''
  const origin = isAllowedOrigin(requestOrigin) ? requestOrigin : 'https://four-quarters.pages.dev'
  c.header('Access-Control-Allow-Origin', origin)
  c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  c.header('Access-Control-Allow-Credentials', 'true')
  if (c.req.method === 'OPTIONS') return c.text('', 200)
  await next()
}
