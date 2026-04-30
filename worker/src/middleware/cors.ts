import { Context, Next } from 'hono'

const ALLOWED_ORIGINS = [
  'https://four-quarters.pages.dev',
  'http://localhost:5173',
  'http://localhost:4173',
]

export async function corsMiddleware(c: Context, next: Next) {
  const requestOrigin = c.req.header('Origin') || ''
  const origin = ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0]
  c.header('Access-Control-Allow-Origin', origin)
  c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  c.header('Access-Control-Allow-Credentials', 'true')
  if (c.req.method === 'OPTIONS') return c.text('', 200)
  await next()
}
