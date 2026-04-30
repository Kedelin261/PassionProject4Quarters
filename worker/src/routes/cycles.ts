import { Hono } from 'hono'
import { uuid, now } from '../db/helpers'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types'

const cycles = new Hono<{ Bindings: Env; Variables: { userId: string } }>()
cycles.use('*', authMiddleware)

cycles.get('/', async (c) => {
  const userId = c.get('userId')
  const { results } = await c.env.DB.prepare('SELECT * FROM twelve_week_cycles WHERE user_id = ? ORDER BY created_at DESC').bind(userId).all()
  return c.json(results)
})

cycles.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  if (!body.title || !body.startDate || !body.endDate) return c.json({ error: 'title, startDate, and endDate are required' }, 400)
  const id = uuid()
  await c.env.DB.prepare('INSERT INTO twelve_week_cycles (id,user_id,title,start_date,end_date,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
    .bind(id, userId, body.title, body.startDate, body.endDate, body.status || 'active', now(), now()).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM twelve_week_cycles WHERE id = ?').bind(id).first(), 201)
})

cycles.put('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = await c.req.json()
  const cycle = await c.env.DB.prepare('SELECT id FROM twelve_week_cycles WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!cycle) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare('UPDATE twelve_week_cycles SET title=?,start_date=?,end_date=?,status=?,updated_at=? WHERE id=?')
    .bind(body.title, body.startDate, body.endDate, body.status, now(), id).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM twelve_week_cycles WHERE id = ?').bind(id).first())
})

export default cycles
