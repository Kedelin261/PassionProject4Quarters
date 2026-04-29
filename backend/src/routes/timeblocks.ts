import { Hono } from 'hono'
import { db } from '../db/schema.js'
import { uuid, now } from '../db/helpers.js'
import { authMiddleware } from '../middleware/auth.js'

const timeblocks = new Hono()
timeblocks.use('*', authMiddleware)

timeblocks.get('/', (c) => {
  const userId = c.get('userId')
  const { date, startDate, endDate } = c.req.query()
  let query = 'SELECT * FROM time_blocks WHERE user_id = ?'
  const params: any[] = [userId]
  if (date) { query += ' AND date = ?'; params.push(date) }
  if (startDate) { query += ' AND date >= ?'; params.push(startDate) }
  if (endDate) { query += ' AND date <= ?'; params.push(endDate) }
  query += ' ORDER BY date, start_time'
  return c.json(db.prepare(query).all(...params))
})

timeblocks.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  if (!body.title || !body.date || !body.startTime || !body.endTime) return c.json({ error: 'Missing required fields' }, 400)
  if (body.startTime >= body.endTime) return c.json({ error: 'End time must be after start time' }, 400)
  const id = uuid()
  db.prepare('INSERT INTO time_blocks (id,user_id,title,description,date,start_time,end_time,category,linked_goal_type,linked_goal_id,color,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, userId, body.title, body.description || '', body.date, body.startTime, body.endTime, body.category || 'general', body.linkedGoalType || 'none', body.linkedGoalId || null, body.color || '#6172f3', now(), now())
  return c.json(db.prepare('SELECT * FROM time_blocks WHERE id = ?').get(id), 201)
})

timeblocks.put('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = await c.req.json()
  const tb = db.prepare('SELECT id FROM time_blocks WHERE id = ? AND user_id = ?').get(id, userId)
  if (!tb) return c.json({ error: 'Not found' }, 404)
  if (body.startTime && body.endTime && body.startTime >= body.endTime) return c.json({ error: 'End time must be after start time' }, 400)
  db.prepare('UPDATE time_blocks SET title=?,description=?,date=?,start_time=?,end_time=?,category=?,linked_goal_type=?,linked_goal_id=?,color=?,updated_at=? WHERE id=?')
    .run(body.title, body.description, body.date, body.startTime, body.endTime, body.category, body.linkedGoalType, body.linkedGoalId, body.color, now(), id)
  return c.json(db.prepare('SELECT * FROM time_blocks WHERE id = ?').get(id))
})

timeblocks.delete('/:id', (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const tb = db.prepare('SELECT id FROM time_blocks WHERE id = ? AND user_id = ?').get(id, userId)
  if (!tb) return c.json({ error: 'Not found' }, 404)
  db.prepare('DELETE FROM time_blocks WHERE id = ?').run(id)
  return c.json({ message: 'Deleted' })
})

export default timeblocks
