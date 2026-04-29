import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { initDb } from './db/schema.js'
import { corsMiddleware } from './middleware/cors.js'
import auth from './routes/auth.js'
import vision from './routes/vision.js'
import cycles from './routes/cycles.js'
import goals from './routes/goals.js'
import habits from './routes/habits.js'
import timeblocks from './routes/timeblocks.js'
import scores from './routes/scores.js'
import accountability from './routes/accountability.js'
import standups from './routes/standups.js'
import ai from './routes/ai.js'
import reports from './routes/reports.js'

initDb()

const app = new Hono()

app.use('*', corsMiddleware)

app.route('/api/auth', auth)
app.route('/api/vision', vision)
app.route('/api/cycles', cycles)
app.route('/api/goals', goals)
app.route('/api/habits', habits)
app.route('/api/habit-entries', habits)
app.route('/api/time-blocks', timeblocks)
app.route('/api/scores', scores)
app.route('/api/accountability', accountability)
app.route('/api/standups', standups)
app.route('/api/ai', ai)
app.route('/api/reports', reports)

app.get('/health', (c) => c.json({ status: 'ok', service: '4 Quarters API', timestamp: new Date().toISOString() }))

const PORT = parseInt(process.env.PORT || '3001')
console.log(`4 Quarters API running on port ${PORT}`)
serve({ fetch: app.fetch, port: PORT })

export default app
