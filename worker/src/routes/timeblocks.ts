import { Hono } from 'hono'
import { uuid, now } from '../db/helpers'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types'

const timeblocks = new Hono<{ Bindings: Env; Variables: { userId: string } }>()
timeblocks.use('*', authMiddleware)

timeblocks.get('/', async (c) => {
  const userId = c.get('userId')
  const { date, startDate, endDate } = c.req.query()
  let query = 'SELECT * FROM time_blocks WHERE user_id = ?'
  const params: any[] = [userId]
  if (date) { query += ' AND date = ?'; params.push(date) }
  if (startDate) { query += ' AND date >= ?'; params.push(startDate) }
  if (endDate) { query += ' AND date <= ?'; params.push(endDate) }
  query += ' ORDER BY date, start_time'
  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json(results)
})

timeblocks.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  if (!body.title || !body.date || !body.startTime || !body.endTime) return c.json({ error: 'Missing required fields' }, 400)
  if (body.startTime >= body.endTime) return c.json({ error: 'End time must be after start time' }, 400)
  const id = uuid()
  await c.env.DB.prepare('INSERT INTO time_blocks (id,user_id,title,description,date,start_time,end_time,category,linked_goal_type,linked_goal_id,color,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, userId, body.title, body.description || '', body.date, body.startTime, body.endTime, body.category || 'general', body.linkedGoalType || 'none', body.linkedGoalId || null, body.color || '#6172f3', now(), now()).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM time_blocks WHERE id = ?').bind(id).first(), 201)
})

timeblocks.put('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = await c.req.json()
  const tb = await c.env.DB.prepare('SELECT id FROM time_blocks WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!tb) return c.json({ error: 'Not found' }, 404)
  if (body.startTime && body.endTime && body.startTime >= body.endTime) return c.json({ error: 'End time must be after start time' }, 400)
  await c.env.DB.prepare('UPDATE time_blocks SET title=?,description=?,date=?,start_time=?,end_time=?,category=?,linked_goal_type=?,linked_goal_id=?,color=?,updated_at=? WHERE id=?')
    .bind(body.title, body.description, body.date, body.startTime, body.endTime, body.category, body.linkedGoalType, body.linkedGoalId, body.color, now(), id).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM time_blocks WHERE id = ?').bind(id).first())
})

timeblocks.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const tb = await c.env.DB.prepare('SELECT id FROM time_blocks WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!tb) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare('DELETE FROM time_blocks WHERE id = ?').bind(id).run()
  return c.json({ message: 'Deleted' })
})

export default timeblocks
