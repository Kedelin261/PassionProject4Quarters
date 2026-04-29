import { Hono } from 'hono'
import { db } from '../db/schema.js'
import { uuid, now } from '../db/helpers.js'
import { authMiddleware } from '../middleware/auth.js'

const cycles = new Hono()
cycles.use('*', authMiddleware)

cycles.get('/', (c) => {
  const userId = c.get('userId')
  const rows = db.prepare('SELECT * FROM twelve_week_cycles WHERE user_id = ? ORDER BY created_at DESC').all(userId)
  return c.json(rows)
})

cycles.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const id = uuid()
  db.prepare('INSERT INTO twelve_week_cycles (id,user_id,title,start_date,end_date,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, userId, body.title, body.startDate, body.endDate, body.status || 'active', now(), now())
  return c.json(db.prepare('SELECT * FROM twelve_week_cycles WHERE id = ?').get(id), 201)
})

cycles.put('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = await c.req.json()
  const cycle = db.prepare('SELECT id FROM twelve_week_cycles WHERE id = ? AND user_id = ?').get(id, userId)
  if (!cycle) return c.json({ error: 'Not found' }, 404)
  db.prepare('UPDATE twelve_week_cycles SET title=?,start_date=?,end_date=?,status=?,updated_at=? WHERE id=?')
    .run(body.title, body.startDate, body.endDate, body.status, now(), id)
  return c.json(db.prepare('SELECT * FROM twelve_week_cycles WHERE id = ?').get(id))
})

export default cycles
