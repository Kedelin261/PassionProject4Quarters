import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import auth from './routes/auth'
import cycles from './routes/cycles'
import goals from './routes/goals'
import habits from './routes/habits'
import timeblocks from './routes/timeblocks'
import scores from './routes/scores'
import accountability from './routes/accountability'
import ai from './routes/ai'

type Bindings = {
  DB: D1Database
  AI?: any
  OPENAI_API_KEY?: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Middleware
app.use('*', logger())
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true
}))

// Health check
app.get('/api/health', (c) => c.json({
  status: 'ok',
  app: '4 Quarters',
  timestamp: new Date().toISOString()
}))

// API Routes
app.route('/api/auth', auth)
app.route('/api/cycles', cycles)
app.route('/api/goals', goals)
app.route('/api/habits', habits)
app.route('/api/time-blocks', timeblocks)
app.route('/api/scores', scores)
app.route('/api/accountability', accountability)
app.route('/api/ai', ai)

// All non-API routes: return 404 (Cloudflare Pages serves static files automatically)
// The _worker.js only handles API routes; Pages serves index.html and /static/* directly
app.all('*', (c) => {
  return c.json({ error: 'Not found' }, 404)
})

export default app
