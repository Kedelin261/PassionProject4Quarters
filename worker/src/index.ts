import { Hono } from 'hono'
import { corsMiddleware } from './middleware/cors'
import auth from './routes/auth'
import vision from './routes/vision'
import cycles from './routes/cycles'
import goals from './routes/goals'
import habits from './routes/habits'
import timeblocks from './routes/timeblocks'
import scores from './routes/scores'
import accountability from './routes/accountability'
import standups from './routes/standups'
import aiRoutes from './routes/ai'
import reports from './routes/reports'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env; Variables: { userId: string } }>()

app.use('*', corsMiddleware)

app.route('/api/auth', auth)
app.route('/api/vision', vision)
app.route('/api/cycles', cycles)
app.route('/api/goals', goals)
app.route('/api/habits', habits)
app.route('/api/time-blocks', timeblocks)
app.route('/api/scores', scores)
app.route('/api/accountability', accountability)
app.route('/api/standups', standups)
app.route('/api/ai', aiRoutes)
app.route('/api/reports', reports)

app.get('/health', (c) => c.json({ status: 'ok', service: '4 Quarters API', runtime: 'cloudflare-workers', timestamp: new Date().toISOString() }))

export default app
