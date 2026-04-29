import { Hono } from 'hono'
import { uuid, now } from '../db/helpers'
import { authMiddleware } from '../middleware/auth'
import type { Env } from '../types'

const standups = new Hono<{ Bindings: Env; Variables: { userId: string } }>()
standups.use('*', authMiddleware)

standups.get('/', async (c) => {
  const userId = c.get('userId')
  const { type, limit } = c.req.query()
  let query = 'SELECT * FROM standups WHERE user_id = ?'
  const params: any[] = [userId]
  if (type) { query += ' AND type = ?'; params.push(type) }
  query += ' ORDER BY date DESC, created_at DESC'
  if (limit) query += ` LIMIT ${parseInt(limit)}`
  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json(results)
})

standups.post('/', async (c) => {
  const userId = c.get('userId')
  const body = await c.req.json()
  const id = uuid()
  await c.env.DB.prepare('INSERT INTO standups (id,user_id,partner_user_id,type,date,previous_progress,next_focus,blockers,reflection,score_summary,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id, userId, body.partnerUserId || null, body.type, body.date, body.previousProgress || '', body.nextFocus || '', body.blockers || '', body.reflection || '', body.scoreSummary || '', now(), now()).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM standups WHERE id = ?').bind(id).first(), 201)
})

standups.get('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const standup = await c.env.DB.prepare('SELECT * FROM standups WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!standup) return c.json({ error: 'Not found' }, 404)
  return c.json(standup)
})

standups.put('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const body = await c.req.json()
  const s = await c.env.DB.prepare('SELECT id FROM standups WHERE id = ? AND user_id = ?').bind(id, userId).first()
  if (!s) return c.json({ error: 'Not found' }, 404)
  await c.env.DB.prepare('UPDATE standups SET previous_progress=?,next_focus=?,blockers=?,reflection=?,score_summary=?,updated_at=? WHERE id=?')
    .bind(body.previousProgress, body.nextFocus, body.blockers, body.reflection, body.scoreSummary, now(), id).run()
  return c.json(await c.env.DB.prepare('SELECT * FROM standups WHERE id = ?').bind(id).first())
})

export default standups
